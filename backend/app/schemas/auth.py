from pydantic import BaseModel, Field
from backend.app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)


class LoginResponse(BaseModel):
    user: UserResponse
    message: str = "Login successful"
    # Token returned in payload for clients that choose Bearer header,
    # while HttpOnly cookie is also set simultaneously.
    token: str


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"
