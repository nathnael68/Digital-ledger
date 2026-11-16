from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.db.session import check_db_health
from backend.app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health() -> HealthResponse:
    """
    Returns the current health status of the API and its connection
    to the underlying PostgreSQL database.
    """
    db_ok = check_db_health()
    status_label = "healthy" if db_ok else "degraded"

    return HealthResponse(
        status=status_label,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        timezone=settings.APP_TIMEZONE,
        currency=settings.APP_CURRENCY,
        timestamp=datetime.now(timezone.utc),
    )
