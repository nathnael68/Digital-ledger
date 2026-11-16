import math
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_active_admin
from backend.app.core.security import hash_password
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserPasswordReset,
    UserResponse,
    UserStatusUpdate,
    UserUpdate,
)
from backend.app.services.audit_service import log_audit

router = APIRouter(prefix="/users", tags=["Employee Management"])


@router.get("", response_model=UserListResponse)
def list_employees(
    search: Optional[str] = Query(None, description="Search by full name or username"),
    role: Optional[str] = Query(None, description="Filter by role ('admin', 'sales_employee')"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserListResponse:
    """
    Returns a paginated list of employee accounts.
    Accessible only by Administrators.
    """
    query = select(User)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.full_name).like(search_pattern),
                func.lower(User.username).like(search_pattern),
            )
        )

    if role:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    # Paginate and order
    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = db.scalars(query).all()

    total_pages = max(1, math.ceil(total / page_size))

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserResponse:
    """
    Creates a new employee account with hashed credentials.
    Enforces username uniqueness and logs an administrative audit entry.
    """
    # Check username collision
    existing = db.scalar(select(User).where(User.username == user_in.username))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' is already in use",
        )

    hashed_pw = hash_password(user_in.password)

    new_user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        password_hash=hashed_pw,
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    log_audit(
        db=db,
        action="USER_CREATE",
        entity_type="User",
        entity_id=str(new_user.id),
        user_id=current_admin.id,
        new_value={
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role,
        },
        reason=f"Account created by administrator {current_admin.username}",
    )

    db.commit()
    db.refresh(new_user)

    return UserResponse.model_validate(new_user)


@router.get("/{user_id}", response_model=UserResponse)
def get_employee(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserResponse:
    """
    Retrieves full details for a specific employee.
    """
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: uuid.UUID,
    update_in: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserResponse:
    """
    Updates an employee's name or role.
    Prevents self-demotion if the current administrator is the last remaining administrator.
    """
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    # Protect against removing the last active administrator
    if user.id == current_admin.id and update_in.role != "admin":
        admin_count = db.scalar(
            select(func.count(User.id)).where(User.role == "admin", User.is_active == True)
        )
        if admin_count and admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only active administrator on the system",
            )

    old_state = {
        "full_name": user.full_name,
        "role": user.role,
    }

    user.full_name = update_in.full_name
    user.role = update_in.role

    log_audit(
        db=db,
        action="USER_UPDATE",
        entity_type="User",
        entity_id=str(user.id),
        user_id=current_admin.id,
        old_value=old_state,
        new_value={"full_name": user.full_name, "role": user.role},
        reason=f"Account updated by administrator {current_admin.username}",
    )

    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.patch("/{user_id}/status", response_model=UserResponse)
def toggle_employee_status(
    user_id: uuid.UUID,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserResponse:
    """
    Activates or deactivates an employee account.
    Administrators are strictly prohibited from deactivating their own account.
    """
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    if user.id == current_admin.id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrator account",
        )

    old_active = user.is_active
    user.is_active = status_in.is_active

    log_audit(
        db=db,
        action="USER_STATUS_CHANGE",
        entity_type="User",
        entity_id=str(user.id),
        user_id=current_admin.id,
        old_value={"is_active": old_active},
        new_value={"is_active": user.is_active},
        reason=f"Status set to {'active' if user.is_active else 'deactivated'} by {current_admin.username}",
    )

    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password")
def reset_employee_password(
    user_id: uuid.UUID,
    reset_in: UserPasswordReset,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
):
    """
    Resets an employee's password. Hashes the new password and updates password_changed_at.
    """
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    user.password_hash = hash_password(reset_in.new_password)
    user.password_changed_at = datetime.now(timezone.utc)

    log_audit(
        db=db,
        action="PASSWORD_RESET",
        entity_type="User",
        entity_id=str(user.id),
        user_id=current_admin.id,
        reason=f"Password reset initiated by administrator {current_admin.username}",
    )

    db.commit()

    return {"message": f"Password for {user.username} has been reset successfully"}
