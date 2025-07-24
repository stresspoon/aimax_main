from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    environment: str = "development"
    debug: bool = True
    api_host: str = "localhost"
    api_port: int = 8000
    
    # Gemini API 설정
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-pro"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()