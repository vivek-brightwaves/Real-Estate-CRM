import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db
from app.db.base import Base
from app.models.users import User, RoleEnum
from passlib.context import CryptContext

# In-memory SQLite for extremely fast, isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def test_db():
    """Provides a fresh, blank DB for each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="function")
def client(test_db):
    return TestClient(app)

@pytest.fixture(scope="function")
def admin_token_headers(client, test_db):
    user = User(
        name="Admin", email="admin@test.com", role=RoleEnum.SUPER_ADMIN, 
        password_hash=pwd_context.hash("pass123")
    )
    test_db.add(user)
    test_db.commit()
    response = client.post("/auth/login", data={"username": "admin@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def manager_token_headers(client, test_db):
    user = User(
        name="Manager", email="manager@test.com", role=RoleEnum.MANAGER, 
        password_hash=pwd_context.hash("pass123"), branch_id=1
    )
    test_db.add(user)
    test_db.commit()
    response = client.post("/auth/login", data={"username": "manager@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def employee_token_headers(client, test_db):
    user = User(
        name="Employee", email="employee@test.com", role=RoleEnum.EMPLOYEE, 
        password_hash=pwd_context.hash("pass123"), branch_id=1
    )
    test_db.add(user)
    test_db.commit()
    response = client.post("/auth/login", data={"username": "employee@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
