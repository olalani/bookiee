import os
import re
import logging
from typing import Optional
from openai import AsyncOpenAI
from app.models.schemas import ParsedTransaction

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = """You are a transaction parser for a Nigerian bookkeeping app called Bookiee.
Given a text (transcribed from voice or typed), extract the following:

1. **amount** (float): The monetary amount. Convert words to numbers (e.g., "50k" = 50000, "50 thousand" = 50000, "1.5 million" = 1500000). Handle Nigerian currency (Naira).
2. **direction** (string): "in" for income/money received, "out" for expense/money spent.
3. **counterparty** (string|null): The name of the person or business involved (e.g., "Chioma", "NEPA").
4. **category** (string|null): Suggest a category from: Sales, Expenses, Salary, Utilities, Transport, Food & Drinks, Rent, Miscellaneous.
5. **confidence** (float): 0.0-1.0 confidence in the parse. High if amount and direction are clear. Low if ambiguous.
6. **transcript** (string): The original text as-is.

Nigerian English/Pidgin patterns to understand:
- "chop" / "spent" / "paid" / "bought" = expense (out)
- "receive" / "got" / "collect" / "sold" / "earn" = income (in)
- "50k" = 50000
- "1.5m" or "1.5 million" = 1500000
- "for" can mean "from" or "for the purpose of"
- "NEPA" / "light" / "power" = Utilities category
- "staff" / "worker" / "salary" = Salary category
- "food" / "lunch" / "rice" = Food & Drinks category

Return ONLY a JSON object with these fields. No markdown, no explanation."""

FALLBACK_CATEGORIES = {
    "salary": "Salary",
    "wages": "Salary",
    "pay": "Salary",
    "rent": "Rent",
    "shop": "Rent",
    "light": "Utilities",
    "electricity": "Utilities",
    "neka": "Utilities",
    "water": "Utilities",
    "transport": "Transport",
    "fuel": "Transport",
    "petrol": "Transport",
    "uber": "Transport",
    "taxi": "Transport",
    "food": "Food & Drinks",
    "lunch": "Food & Drinks",
    "dinner": "Food & Drinks",
    "breakfast": "Food & Drinks",
    "rice": "Food & Drinks",
    "shopping": "Expenses",
    "buy": "Expenses",
    "bought": "Expenses",
    "sold": "Sales",
    "sale": "Sales",
    "customer": "Sales",
}


class NLPService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

    async def parse_text(self, text: str, business_id: str) -> ParsedTransaction:
        if self.client:
            return await self._parse_with_llm(text, business_id)
        return self._fallback_parse(text)

    async def parse_voice(self, audio_url: str, business_id: str, message_id: str) -> ParsedTransaction:
        transcript = await self._transcribe_audio(audio_url)
        return await self.parse_text(transcript, business_id)

    async def _transcribe_audio(self, audio_url: str) -> str:
        if not self.client:
            return ""

        try:
            import httpx
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(audio_url)
                audio_data = response.content

            temp_path = f"/tmp/audio_{hash(audio_url)}.ogg"
            with open(temp_path, "wb") as f:
                f.write(audio_data)

            with open(temp_path, "rb") as audio_file:
                result = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en",
                )

            os.remove(temp_path)
            return result.text

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return ""

    async def _parse_with_llm(self, text: str, business_id: str) -> ParsedTransaction:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0.1,
                max_tokens=500,
            )

            result_text = response.choices[0].message.content.strip()

            import json
            result = json.loads(result_text)

            return ParsedTransaction(
                amount=float(result.get("amount", 0)),
                direction=result.get("direction", "out"),
                counterparty=result.get("counterparty"),
                category=result.get("category"),
                category_id=None,
                confidence=float(result.get("confidence", 0.5)),
                transcript=text,
                raw_text=text,
            )

        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return self._fallback_parse(text)

    def _fallback_parse(self, text: str) -> ParsedTransaction:
        text_lower = text.lower()

        amount = self._extract_amount(text_lower)

        income_keywords = ["received", "got", "collect", "sold", "earned", "from", "income", "in"]
        expense_keywords = ["spent", "paid", "bought", "chop", "expense", "out", "cost", "bought"]

        direction = "in" if any(kw in text_lower for kw in income_keywords) else "out"

        party = self._extract_party(text)

        category = None
        for keyword, cat in FALLBACK_CATEGORIES.items():
            if keyword in text_lower:
                category = cat
                break

        confidence = 0.7 if amount > 0 else 0.3
        if direction and amount > 0:
            confidence = min(confidence + 0.1, 0.9)

        return ParsedTransaction(
            amount=amount,
            direction=direction,
            counterparty=party,
            category=category,
            category_id=None,
            confidence=confidence,
            transcript=text,
            raw_text=text,
        )

    def _extract_amount(self, text: str) -> float:
        patterns = [
            r"(\d[\d,]*\.?\d*)\s*m(?:illion|n)?(?:illion)?",
            r"(\d[\d,]*\.?\d*)\s*k",
            r"(\d[\d,]*\.?\d*)\s*thousand",
            r"(\d[\d,]*\.?\d*)",
            r"([\d,]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                amount_str = match.group(1).replace(",", "")
                amount = float(amount_str)

                if "million" in text[match.start():match.end() + 20] or "mn" in text[match.start():match.end() + 20]:
                    amount *= 1_000_000
                elif "k" in text[match.start():match.end() + 5]:
                    amount *= 1_000
                elif "thousand" in text[match.start():match.end() + 20]:
                    amount *= 1_000

                return amount

        return 0.0

    def _extract_party(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:from|to|paid|received from|sold to|collect from|give)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            r"(?:from|to|paid|received from|sold to)\s+(\w+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None
