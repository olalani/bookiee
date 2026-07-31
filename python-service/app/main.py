from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import parse
from app.services.nlp_service import NLPService

app = FastAPI(
    title="Bookiee NLP Service",
    description="Voice transcription and transaction parsing microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router, prefix="/api/v1", tags=["parse"])


@app.get("/health")
async def health():
    return {"status": "ok"}
