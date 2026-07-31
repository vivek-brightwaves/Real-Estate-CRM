from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash

# Create a fixture or use the client directly
# Assuming 'client' and 'db' fixtures are available in conftest.py

def test_login_success(client: TestClient, db: Session):
    # Setup user
    user = User(
        name="Test User",
        email="testlogin@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    response = client.post("/auth/login", data={"username": "testlogin@example.com", "password": "StrongPass1!"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

def test_login_failure_lockout(client: TestClient, db: Session):
    # Setup user
    user = User(
        name="Lockout User",
        email="lockout@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
        failed_login_attempts=4
    )
    db.add(user)
    db.commit()

    # 5th failed attempt -> locks account
    res1 = client.post("/auth/login", data={"username": "lockout@example.com", "password": "wrongpassword"})
    assert res1.status_code == 401

    db.refresh(user)
    assert user.is_locked is True
    assert user.locked_until is not None

    # Next attempt should return 403 Forbidden because of lock
    res2 = client.post("/auth/login", data={"username": "lockout@example.com", "password": "StrongPass1!"})
    assert res2.status_code == 403

def test_refresh_token(client: TestClient, db: Session):
    user = User(
        name="Refresh User",
        email="refresh@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "refresh@example.com", "password": "StrongPass1!"})
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
    new_refresh = refresh_res.json()["refresh_token"]
    assert new_refresh != refresh_token

    # Old token should be blacklisted
    refresh_res2 = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res2.status_code == 401

def test_forgot_password(client: TestClient, db: Session):
    user = User(
        name="Forgot User",
        email="forgot@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    res = client.post("/auth/forgot-password", json={"email": "forgot@example.com"})
    assert res.status_code == 200
    assert "password reset link" in res.json()["message"]

def test_get_me(client: TestClient, db: Session):
    user = User(
        name="Me User",
        email="me@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "me@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "me@example.com"
