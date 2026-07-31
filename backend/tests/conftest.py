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
from app.models.users import Branch, Company, User, RoleEnum
from passlib.context import CryptContext
from app.core.config import settings
from app.core.middleware import RateLimitMiddleware

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


@pytest.fixture(scope="module")
def db():
    """Module-isolated DB for workflow-style tests that share setup data."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def isolate_api_runtime(tmp_path_factory, monkeypatch):
    """Keep middleware and generated files isolated between tests."""
    original_rate_limit = settings.RATE_LIMIT_ENABLED
    original_scheduler = settings.SCHEDULER_ENABLED
    runtime_dir = tmp_path_factory.getbasetemp() / "runtime"
    runtime_dir.mkdir(exist_ok=True)
    monkeypatch.chdir(runtime_dir)
    settings.RATE_LIMIT_ENABLED = False
    settings.SCHEDULER_ENABLED = False
    RateLimitMiddleware._buckets.clear()
    yield
    RateLimitMiddleware._buckets.clear()
    settings.RATE_LIMIT_ENABLED = original_rate_limit
    settings.SCHEDULER_ENABLED = original_scheduler

@pytest.fixture(scope="function")
def client():
    return TestClient(app)


def ensure_test_organization(db):
    company = db.query(Company).filter(Company.id == 1).first()
    if company is None:
        company = Company(id=1, name="Test Company")
        db.add(company)
        db.flush()
    branch = db.query(Branch).filter(Branch.id == 1).first()
    if branch is None:
        branch = Branch(id=1, name="Test Branch", company_id=company.id)
        db.add(branch)
    db.commit()
    return branch

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
    ensure_test_organization(test_db)
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
    ensure_test_organization(test_db)
    user = User(
        name="Employee", email="employee@test.com", role=RoleEnum.EMPLOYEE,
        password_hash=pwd_context.hash("pass123"), branch_id=1
    )
    test_db.add(user)
    test_db.commit()
    response = client.post("/auth/login", data={"username": "employee@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
