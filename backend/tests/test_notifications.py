from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.models.system import Notification
from app.core.security import get_password_hash

def test_get_preferences(client: TestClient, db: Session):
    user = User(
        name="Notif User",
        email="notif@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "notif@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/notifications/preferences", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email_enabled"] is True

def test_update_preferences(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "notif@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    payload = {
        "email_enabled": False,
        "sms_enabled": False,
        "whatsapp_enabled": True,
        "in_app_enabled": True
    }
    res = client.put("/notifications/preferences", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email_enabled"] is False
    assert res.json()["whatsapp_enabled"] is True

def test_get_notifications(client: TestClient, db: Session):
    user = db.query(User).filter(User.email == "notif@example.com").first()

    # Add a mock notification
    notif = Notification(user_id=user.id, type="TEST", message="Test message", category="GENERAL", priority="NORMAL")
    db.add(notif)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "notif@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/notifications", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["total"] >= 1
    assert res.json()["unread_count"] >= 1

def test_mark_all_read(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "notif@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.patch("/notifications/read-all", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    unread_res = client.get("/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert unread_res.json()["unread_count"] == 0
