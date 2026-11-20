from backend.app.core.config import Settings


def test_cors_parsing_json_array():
    settings = Settings(CORS_ORIGINS='["http://localhost:5173", "https://delgone.com"]')
    assert len(settings.CORS_ORIGINS) == 2
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "https://delgone.com" in settings.CORS_ORIGINS


def test_cors_parsing_comma_separated():
    settings = Settings(CORS_ORIGINS="http://localhost:5173, https://counter.delgone.com")
    assert len(settings.CORS_ORIGINS) == 2
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "https://counter.delgone.com" in settings.CORS_ORIGINS


def test_default_settings():
    settings = Settings()
    assert settings.APP_TIMEZONE == "Africa/Addis_Ababa"
    assert settings.APP_CURRENCY == "ETB"
    assert settings.API_V1_STR == "/api"


def test_database_url_normalization():
    s1 = Settings(DATABASE_URL="postgres://user:pass@host:5432/db")
    assert s1.DATABASE_URL == "postgresql+psycopg://user:pass@host:5432/db"

    s2 = Settings(DATABASE_URL="postgresql://user:pass@host:5432/db")
    assert s2.DATABASE_URL == "postgresql+psycopg://user:pass@host:5432/db"
