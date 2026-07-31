from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash


def test_list_audit_logs(client: TestClient, db: Session):
    """SUPER_ADMIN can list audit logs."""
    admin = User(
        name="Admin Audit",
        email="admin_audit@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()

    login = client.post("/auth/login", data={"username": "admin_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # The login itself should have created an audit log
    res = client.get("/audit", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    # There should be at least the LOGIN audit
    assert any(log["action"] == "LOGIN" for log in data)


def test_audit_log_by_id(client: TestClient, db: Session):
    """Retrieve a specific audit log by ID."""
    login = client.post("/auth/login", data={"username": "admin_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    logs = client.get("/audit?limit=1", headers={"Authorization": f"Bearer {token}"})
    assert logs.status_code == 200
    if logs.json():
        log_id = logs.json()[0]["id"]
        res = client.get(f"/audit/{log_id}", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["id"] == log_id


def test_audit_log_filters(client: TestClient, db: Session):
    """Test filtering by module and action."""
    login = client.post("/auth/login", data={"username": "admin_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Filter by module
    res = client.get("/audit?module=Authentication", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    for log in res.json():
        assert log["module"] == "Authentication"

    # Filter by action
    res = client.get("/audit?action=LOGIN", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    for log in res.json():
        assert log["action"] == "LOGIN"


def test_audit_log_search(client: TestClient, db: Session):
    """Test keyword search."""
    login = client.post("/auth/login", data={"username": "admin_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.get("/audit?search=LOGIN", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


def test_unauthorized_audit_access(client: TestClient, db: Session):
    """Non-admin users cannot access audit logs."""
    emp = User(
        name="Employee Audit",
        email="emp_audit@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(emp)
    db.commit()

    login = client.post("/auth/login", data={"username": "emp_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.get("/audit", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_password_change_creates_audit(client: TestClient, db: Session):
    """Changing password should create an audit log."""
    login = client.post("/auth/login", data={"username": "admin_audit@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    client.post("/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "old_password": "StrongPass1!",
        "new_password": "NewStrong2@"
    })

    res = client.get("/audit?action=PASSWORD_CHANGE", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
