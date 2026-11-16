from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.app.core.security import hash_password
from backend.app.models.user import User


def setup_admin_and_employee(db_session: Session):
    admin = User(
        username="admin_user_mgmt",
        full_name="Managing Director",
        password_hash=hash_password("AdminPass123!"),
        role="admin",
        is_active=True,
    )
    employee = User(
        username="sales_user_mgmt",
        full_name="Sales Rep Almaz",
        password_hash=hash_password("SalesPass123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add_all([admin, employee])
    db_session.commit()
    return admin, employee


def test_admin_can_manage_employees(client: TestClient, db_session: Session):
    admin, _ = setup_admin_and_employee(db_session)

    # Login as admin
    client.post(
        "/api/auth/login",
        json={"username": "admin_user_mgmt", "password": "AdminPass123!"},
    )

    # 1. List users
    list_resp = client.get("/api/users")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] >= 2

    # 2. Create new employee
    create_resp = client.post(
        "/api/users",
        json={
            "username": "dawit_t",
            "full_name": "Dawit Tadesse",
            "password": "DawitPassword123!",
            "role": "sales_employee",
        },
    )
    assert create_resp.status_code == 201
    created_user = create_resp.json()
    assert created_user["username"] == "dawit_t"
    new_user_id = created_user["id"]

    # 3. Get single employee
    get_resp = client.get(f"/api/users/{new_user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["full_name"] == "Dawit Tadesse"

    # 4. Update employee
    put_resp = client.put(
        f"/api/users/{new_user_id}",
        json={"full_name": "Dawit Tadesse Senior", "role": "sales_employee"},
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["full_name"] == "Dawit Tadesse Senior"

    # 5. Toggle status (Deactivate)
    status_resp = client.patch(
        f"/api/users/{new_user_id}/status",
        json={"is_active": False},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["is_active"] is False

    # 6. Reset password
    reset_resp = client.post(
        f"/api/users/{new_user_id}/reset-password",
        json={"new_password": "NewDawitPass456!"},
    )
    assert reset_resp.status_code == 200


def test_sales_employee_denied_admin_endpoints(client: TestClient, db_session: Session):
    _, employee = setup_admin_and_employee(db_session)

    # Login as sales employee
    client.post(
        "/api/auth/login",
        json={"username": "sales_user_mgmt", "password": "SalesPass123!"},
    )

    # Attempt to list employees -> 403 Forbidden
    resp = client.get("/api/users")
    assert resp.status_code == 403
    assert "Administrative privileges required" in resp.json()["detail"]

    # Attempt to create employee -> 403 Forbidden
    create_resp = client.post(
        "/api/users",
        json={
            "username": "hacker_user",
            "full_name": "Hacker User",
            "password": "Password123!",
            "role": "sales_employee",
        },
    )
    assert create_resp.status_code == 403


def test_unauthenticated_user_denied(client: TestClient):
    client.cookies.clear()
    resp = client.get("/api/users")
    assert resp.status_code == 401


def test_admin_cannot_deactivate_self(client: TestClient, db_session: Session):
    admin, _ = setup_admin_and_employee(db_session)

    client.post(
        "/api/auth/login",
        json={"username": "admin_user_mgmt", "password": "AdminPass123!"},
    )

    resp = client.patch(
        f"/api/users/{admin.id}/status",
        json={"is_active": False},
    )
    assert resp.status_code == 400
    assert "cannot deactivate your own administrator account" in resp.json()["detail"]
