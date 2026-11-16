import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, Union
import bcrypt
from jose import jwt, JWTError
from backend.app.core.config import settings

# Cookie Configuration
AUTH_COOKIE_NAME = "delgone_token"


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(
    subject: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


class LoginRateLimiter:
    """
    In-memory rate limiter to protect against brute-force password guessing.
    Tracks failed attempts per IP or username within a sliding window.
    """

    def __init__(self, max_attempts: int = 5, lockout_seconds: int = 900):
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_seconds
        # key -> list of timestamp failures
        self._failures: Dict[str, list[float]] = defaultdict(list)
        # key -> lockout expiration timestamp
        self._lockouts: Dict[str, float] = {}

    def is_locked(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        # Check if currently locked
        lockout_until = self._lockouts.get(key, 0)
        if now < lockout_until:
            remaining = int(lockout_until - now)
            return True, remaining

        # Clean expired timestamps
        cutoff = now - self.lockout_seconds
        self._failures[key] = [t for t in self._failures[key] if t > cutoff]

        if len(self._failures[key]) >= self.max_attempts:
            # Trigger lockout
            self._lockouts[key] = now + self.lockout_seconds
            return True, self.lockout_seconds

        return False, 0

    def record_failure(self, key: str):
        now = time.time()
        self._failures[key].append(now)
        if len(self._failures[key]) >= self.max_attempts:
            self._lockouts[key] = now + self.lockout_seconds

    def reset(self, key: str):
        self._failures.pop(key, None)
        self._lockouts.pop(key, None)


login_rate_limiter = LoginRateLimiter(max_attempts=5, lockout_seconds=900)
