import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Real Estate CRM"
    
    # CORS - stored as comma-separated string, parsed in main.py
    BACKEND_CORS_ORIGINS: str = ""
    
    # Database
    DATABASE_URL: str
    
    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
