from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash

def test_reports_streaming_csv(client: TestClient, db: Session):
    admin = User(
        name="Admin Reports",
        email="admin_reports@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()

    login = client.post("/auth/login", data={"username": "admin_reports@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Test CSV Export (Streaming)
    res = client.get("/reports/leads/export?format=csv", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Lead ID" in res.text

def test_reports_excel_export(client: TestClient, db: Session):
    login = client.post("/auth/login", data={"username": "admin_reports@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Test Excel Export (Loaded in memory)
    res = client.get("/reports/inventory/export?format=excel", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "spreadsheetml.sheet" in res.headers["content-type"]

    preview = client.get(
        "/reports/inventory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert preview.status_code == 200
    assert preview.json()["headers"][0] == "Unit ID"
    assert preview.json()["total_rows"] >= len(preview.json()["rows"])

def test_reports_invalid_type(client: TestClient, db: Session):
    login = client.post("/auth/login", data={"username": "admin_reports@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.get("/reports/invalid_report_type/export?format=csv", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
