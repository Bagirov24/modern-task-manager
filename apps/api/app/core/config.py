from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional

_WEAK_KEYS = {
    "your-secret-key-change-in-production",
    "change-me-to-random-secret-in-production",
    "change-me",
    "secret",
    "",
}


class Settings(BaseSettings):
    APP_NAME: str = "Modern Task Manager"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/taskmanager"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth — no default: app refuses to start without a real key
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Internal health endpoint token.
    # Set to a random secret in production; leave empty to disable internal
    # health endpoints (they will return 404).
    INTERNAL_HEALTH_TOKEN: Optional[str] = None

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v.lower() in _WEAK_KEYS:
            raise ValueError(
                "SECRET_KEY is set to a known weak placeholder. "
                "Generate a strong key: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
