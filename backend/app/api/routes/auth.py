from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.core.security import (
    AUTH_COOKIE_NAME,
    create_access_token,
    login_rate_limiter,
    verify_password,
)
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, LoginResponse, LogoutResponse
from backend.app.schemas.user import UserResponse
from backend.app.services.audit_service import log_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Authenticates an employee or administrator with username and password.
    Sets a secure, HttpOnly SameSite cookie and returns the user profile with token.
    Enforces rate limiting to prevent brute-force credential stuffing.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{login_data.username.lower()}"

    is_locked, remaining_seconds = login_rate_limiter.is_locked(rate_key)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {remaining_seconds // 60 + 1} minutes.",
        )

    # Lookup user
    user = db.scalar(
        select(User).where(User.username == login_data.username.strip().lower())
    )

    if not user or not verify_password(login_data.password, user.password_hash):
        login_rate_limiter.record_failure(rate_key)
        log_audit(
            db=db,
            action="LOGIN_FAILED",
            entity_type="User",
            entity_id=login_data.username.strip().lower(),
            reason="Invalid credentials attempt",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        log_audit(
            db=db,
            action="LOGIN_FAILED",
            entity_type="User",
            entity_id=str(user.id),
            user_id=user.id,
            reason="Attempted login on deactivated account",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact an administrator.",
        )

    # Success: reset rate limit tracking
    login_rate_limiter.reset(rate_key)

    # Update last login timestamp
    now = datetime.now(timezone.utc)
    user.last_login_at = now

    log_audit(
        db=db,
        action="LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        user_id=user.id,
        reason="Successful authentication",
    )
    db.commit()
    db.refresh(user)

    # Create token
    token = create_access_token(subject=user.id, role=user.role)

    # Set secure HttpOnly cookie
    max_age_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    is_prod = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=max_age_seconds,
        expires=max_age_seconds,
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_prod,
    )

    return LoginResponse(
        user=UserResponse.model_validate(user),
        message="Login successful",
        token=token,
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """
    Clears the authentication cookie and records a logout audit event.
    """
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )

    log_audit(
        db=db,
        action="LOGOUT",
        entity_type="User",
        entity_id=str(current_user.id),
        user_id=current_user.id,
        reason="User requested session termination",
    )
    db.commit()

    return LogoutResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Returns the authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)
