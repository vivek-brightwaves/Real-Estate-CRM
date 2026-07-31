from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash

def test_auto_approval_rule(client: TestClient, db: Session):
    # Create employee
    user = User(
        name="Employee Auto",
        email="employee_auto@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "employee_auto@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    # Request discount < 5000 (should auto-approve based on config in approval_service.py)
    res = client.post("/approvals", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "DISCOUNT",
        "payload": {"amount": 2000, "booking_id": 1}
    })

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "AUTO_APPROVED"
    assert data["remarks"] == "Auto-approved by system rules"

def test_escalated_approval(client: TestClient, db: Session):
    # Admin login for approvals
    admin = User(
        name="Admin Approver",
        email="admin_approver@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()

    emp_login = client.post("/auth/login", data={"username": "employee_auto@example.com", "password": "StrongPass1!"})
    emp_token = emp_login.json()["access_token"]

    admin_login = client.post("/auth/login", data={"username": "admin_approver@example.com", "password": "StrongPass1!"})
    admin_token = admin_login.json()["access_token"]

    # Create high discount req
    req = client.post("/approvals", headers={"Authorization": f"Bearer {emp_token}"}, json={
        "type": "DISCOUNT",
        "payload": {"amount": 60000, "booking_id": 1} # Over 50k requires L2
    })
    req_id = req.json()["id"]

    # L1 Approve -> should escalate to L2
    res = client.patch(f"/approvals/{req_id}/approve?remarks=looks good", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "UNDER_REVIEW"
    assert res.json()["level"] == 2

    # L2 Approve -> Final
    res2 = client.patch(f"/approvals/{req_id}/approve?remarks=fine by me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 200
    assert res2.json()["status"] == "APPROVED"

def test_cancel_approval(client: TestClient, db: Session):
    emp_login = client.post("/auth/login", data={"username": "employee_auto@example.com", "password": "StrongPass1!"})
    emp_token = emp_login.json()["access_token"]

    req = client.post("/approvals", headers={"Authorization": f"Bearer {emp_token}"}, json={
        "type": "REFUND",
        "payload": {"amount": 1000}
    })
    req_id = req.json()["id"]

    res = client.patch(f"/approvals/{req_id}/cancel", headers={"Authorization": f"Bearer {emp_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"
