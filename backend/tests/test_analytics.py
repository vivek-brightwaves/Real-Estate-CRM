from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash

# ---------------------------------------------------------
# Test Dashboard APIs
# ---------------------------------------------------------
def test_super_admin_dashboard(client: TestClient, db: Session):
    # Setup Super Admin
    user = User(
        name="Admin Analytics",
        email="admin_analytics@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "admin_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/dashboard/super-admin", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "revenue" in data
    assert "top_projects" in data
    assert "monthly_revenue" in data

def test_manager_dashboard(client: TestClient, db: Session):
    # Setup Manager
    user = User(
        name="Manager Analytics",
        email="manager_analytics@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.MANAGER,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "manager_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/dashboard/manager", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "branch_revenue" in data
    assert "team_performance" in data
    assert "lead_funnel" in data

def test_employee_dashboard(client: TestClient, db: Session):
    # Setup Employee
    user = User(
        name="Employee Analytics",
        email="employee_analytics@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "employee_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/dashboard/employee", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "my_leads" in data
    assert "my_revenue" in data
    assert "pending_tasks" in data

def test_broker_dashboard(client: TestClient, db: Session):
    # Setup Broker
    user = User(
        name="Broker Analytics",
        email="broker_analytics@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.BROKER,
        is_active=True
    )
    db.add(user)
    db.commit()

    login_res = client.post("/auth/login", data={"username": "broker_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/dashboard/broker", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "commission_earned" in data
    assert "referred_leads" in data

# ---------------------------------------------------------
# Test Analytics APIs (Role: SUPER_ADMIN)
# ---------------------------------------------------------
def test_analytics_revenue(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "admin_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/analytics/revenue", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "today_revenue" in data
    assert "trend" in data

def test_analytics_leads(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "admin_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/analytics/leads", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_leads" in data
    assert "lead_funnel" in data

def test_analytics_employees(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "admin_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    # Needs employee_id query param
    emp = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).first()
    if emp:
        res = client.get(f"/analytics/employees?employee_id={emp.id}", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "conversion_percent" in data

# ---------------------------------------------------------
# Test Reports APIs
# ---------------------------------------------------------
def test_reports_csv_export(client: TestClient, db: Session):
    login_res = client.post("/auth/login", data={"username": "admin_analytics@example.com", "password": "StrongPass1!"})
    token = login_res.json()["access_token"]

    res = client.get("/reports/finance/export?format=csv&timeline=monthly", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
