#!/usr/bin/env python3
"""
Delgone Digital Sales Ledger — First Administrator Bootstrap Script
Safely provisions an initial administrative account without hardcoding credentials in source code.
Usage:
    python backend/scripts/bootstrap_admin.py --username admin --full-name "Managing Director" --password "SecurePass123!"
Or interactively:
    python backend/scripts/bootstrap_admin.py
Or via environment variables:
    INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_FULL_NAME, INITIAL_ADMIN_PASSWORD
"""

import argparse
import getpass
import os
import sys

# Ensure project root is in path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import select
from backend.app.core.security import hash_password
from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.services.audit_service import log_audit


def validate_password(password: str) -> bool:
    if len(password) < 8:
        print("Error: Password must be at least 8 characters long.")
        return False
    if not (any(c.isalpha() for c in password) and any(c.isdigit() for c in password)):
        print("Error: Password must contain at least one letter and one number.")
        return False
    return True


def bootstrap_admin(username: str, full_name: str, password: str):
    if not validate_password(password):
        sys.exit(1)

    db = SessionLocal()
    try:
        clean_username = username.strip().lower()
        existing = db.scalar(select(User).where(User.username == clean_username))

        if existing:
            if existing.role == "admin":
                print(f"Notice: Administrator account '{clean_username}' already exists. No action taken.")
                return
            else:
                print(f"Updating user '{clean_username}' to role 'admin'...")
                existing.role = "admin"
                existing.is_active = True
                existing.password_hash = hash_password(password)
                db.commit()
                print(f"Success: User '{clean_username}' elevated to Administrator.")
                return

        hashed_pw = hash_password(password)
        admin_user = User(
            username=clean_username,
            full_name=full_name.strip(),
            password_hash=hashed_pw,
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        log_audit(
            db=db,
            action="USER_CREATE",
            entity_type="User",
            entity_id=str(admin_user.id),
            user_id=admin_user.id,
            new_value={
                "username": admin_user.username,
                "full_name": admin_user.full_name,
                "role": "admin",
            },
            reason="Initial administrator bootstrap via CLI",
        )
        db.commit()
        print("\n============================================================")
        print("  DELGONE DIGITAL SALES LEDGER — INITIAL ADMIN CREATED")
        print("============================================================")
        print(f"  Username  : {clean_username}")
        print(f"  Full Name : {full_name}")
        print(f"  Role      : Administrator")
        print("  Status    : Active")
        print("============================================================\n")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Bootstrap initial administrator account")
    parser.add_argument("--username", help="Administrator username", default=os.getenv("INITIAL_ADMIN_USERNAME"))
    parser.add_argument("--full-name", help="Administrator full name", default=os.getenv("INITIAL_ADMIN_FULL_NAME"))
    parser.add_argument("--password", help="Administrator password", default=os.getenv("INITIAL_ADMIN_PASSWORD"))

    args = parser.parse_args()

    username = args.username
    full_name = args.full_name
    password = args.password

    # Prompt interactively if not provided
    if not username:
        username = input("Enter Administrator Username: ").strip()
    if not full_name:
        full_name = input("Enter Full Legal Name: ").strip()
    if not password:
        password = getpass.getpass("Enter Secure Password (min 8 chars, alphanumeric): ")
        confirm_pw = getpass.getpass("Confirm Secure Password: ")
        if password != confirm_pw:
            print("Error: Passwords do not match.")
            sys.exit(1)

    if not username or not full_name or not password:
        print("Error: All fields are required.")
        sys.exit(1)

    bootstrap_admin(username=username, full_name=full_name, password=password)


if __name__ == "__main__":
    main()
