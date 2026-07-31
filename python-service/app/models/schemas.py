from pydantic import BaseModel
from typing import Optional


class TextParseRequest(BaseModel):
    text: str
    business_id: str


class VoiceParseRequest(BaseModel):
    audio_url: str
    business_id: str
    message_id: str


class ParsedTransaction(BaseModel):
    amount: float
    direction: str  # 'in' or 'out'
    counterparty: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    confidence: float
    transcript: str
    raw_text: str
