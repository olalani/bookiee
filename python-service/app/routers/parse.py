from fastapi import APIRouter
from app.models.schemas import TextParseRequest, VoiceParseRequest, ParsedTransaction
from app.services.nlp_service import NLPService

router = APIRouter()
nlp = NLPService()


@router.post("/parse-text", response_model=ParsedTransaction)
async def parse_text(request: TextParseRequest):
    result = await nlp.parse_text(request.text, request.business_id)
    return result


@router.post("/parse-voice", response_model=ParsedTransaction)
async def parse_voice(request: VoiceParseRequest):
    result = await nlp.parse_voice(request.audio_url, request.business_id, request.message_id)
    return result
