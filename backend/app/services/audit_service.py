import uuid
from typing import Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from backend.app.core.logging import logger


def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: Optional[uuid.UUID] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    reason: Optional[str] = None,
) -> AuditLog:
    """
    Creates an immutable audit log entry.
    Ensures sensitive fields like passwords and tokens are never persisted in values.
    """
    # Sanitize dictionary values if present
    def sanitize(val: Any) -> Any:
        if isinstance(val, dict):
            sanitized = {}
            for k, v in val.items():
                if any(secret in k.lower() for secret in ["password", "token", "secret", "hash"]):
                    sanitized[k] = "[REDACTED]"
                else:
                    sanitized[k] = v
            return sanitized
        return val

    try:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=sanitize(old_value),
            new_value=sanitize(new_value),
            reason=reason,
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry
    except Exception as e:
        logger.error("Failed to write audit log entry (%s on %s): %s", action, entity_type, str(e))
        # Non-blocking for primary transaction unless required
        return None  # type: ignore
