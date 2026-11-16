from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.app.core.security import hash_password, login_rate_limiter
from backend.app.models.user import User


def test_login_successful(client: TestClient, db_session: Session):
    # Setup user
    login_rate_limiter.reset("testclient:test_admin")
    user = User(
        username="test_admin",
        full_name="Test Administrator",
        password_hash=hash_password("ValidPassword123!"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "test_admin", "password": "ValidPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Login successful"
    assert data["user"]["username"] == "test_admin"
    assert data["user"]["role"] == "admin"
    assert "token" in data
    # Check that cookie is set
    assert "delgone_token" in response.cookies


def test_login_incorrect_password(client: TestClient, db_session: Session):
    login_rate_limiter.reset("testclient:test_wrong_pw")
    user = User(
        username="test_wrong_pw",
        full_name="User Wrong Password",
        password_hash=hash_password("RealPassword123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "test_wrong_pw", "password": "IncorrectPassword1!"},
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={"username": "nonexistent_user", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_inactive_account(client: TestClient, db_session: Session):
    login_rate_limiter.reset("testclient:inactive_user")
    user = User(
        username="inactive_user",
        full_name="Inactive Employee",
        password_hash=hash_password("Password123!"),
        role="sales_employee",
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "inactive_user", "password": "Password123!"},
    )
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


def test_get_current_user_me(client: TestClient, db_session: Session):
    user = User(
        username="me_user",
        full_name="Me User",
        password_hash=hash_password("Password123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Login to get session
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "me_user", "password": "Password123!"},
    )
    token = login_resp.json()["token"]

    # Test via Cookie
    resp_cookie = client.get("/api/auth/me")
    assert resp_cookie.status_code == 200
    assert resp_cookie.json()["username"] == "me_user"

    # Test via Bearer header
    client.cookies.clear()
    resp_header = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_header.status_code == 200
    assert resp_header.json()["username"] == "me_user"


def test_logout(client: TestClient, db_session: Session):
    user = User(
        username="logout_user",
        full_name="Logout User",
        password_hash=hash_password("Password123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    client.post(
        "/api/auth/login",
        json={"username": "logout_user", "password": "Password123!"},
    )

    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Logged out successfully"
