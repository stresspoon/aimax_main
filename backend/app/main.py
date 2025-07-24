from fastapi import FastAPI
from .config import settings

app = FastAPI(
    title="AIMAX API",
    description="AIMAX: 나만의 AI 비지니스 파트너",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Hello World", "environment": settings.environment}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}