import json
import os
from typing import Any, List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class Settings(BaseSettings):
    # Application Info
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Delgone Digital Sales Ledger"
    API_V1_STR: str = "/api"
    APP_TIMEZONE: str = "Africa/Addis_Ababa"
    APP_CURRENCY: str = "ETB"
    LOG_LEVEL: str = "INFO"

    # Database Configuration
    POSTGRES_USER: str = "delgone_user"
    POSTGRES_PASSWORD: str = "delgone_secure_password_replace_in_prod"
    POSTGRES_DB: str = "delgone_ledger"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = (
        "postgresql+psycopg://delgone_user:delgone_secure_password_replace_in_prod@localhost:5432/delgone_ledger"
    )

    # Security & Tokens
    JWT_SECRET_KEY: str = "insecure_dev_secret_key_change_in_production_environment"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_sqlite_url(cls, v: Union[str, Any]) -> str:
        if isinstance(v, str) and v.startswith("sqlite:///") and not v.startswith("sqlite:///:memory:"):
            path_part = v.replace("sqlite:///", "")
            if path_part.startswith("./"):
                path_part = path_part[2:]
            if not os.path.isabs(path_part):
                abs_db = os.path.normpath(os.path.join(BACKEND_DIR, path_part))
                return f"sqlite:///{abs_db.replace(os.sep, '/')}"
        return str(v)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
