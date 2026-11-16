from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database_connected: bool
    timezone: str
    currency: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
