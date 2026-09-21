import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Book Submission & AI Publishing API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "super-secret-jwt-key-for-book-submission-change-in-production-12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Security / OTP
    MSG91_DEV_MODE: bool = True
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_TEMPLATE_ID: Optional[str] = None
    
    # ERPNext Integration (Optional)
    ERPNEXT_URL: Optional[str] = None
    ERPNEXT_API_KEY: Optional[str] = None
    ERPNEXT_API_SECRET: Optional[str] = None
    
    # Storage
    STORAGE_DIR: str = "./uploads"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
