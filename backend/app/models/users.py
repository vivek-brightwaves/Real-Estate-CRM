import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"
    PARTNER = "PARTNER"
    CUSTOMER = "CUSTOMER"
    BROKER = "BROKER"

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    logo_url = Column(String(255), nullable=True)
    settings_json = Column(String(1000), nullable=True) # or JSON for mysql

    branches = relationship("Branch", back_populates="company")

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)

    company = relationship("Company", back_populates="branches")
    users = relationship("User", back_populates="branch")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    is_email_verified = Column(Boolean, default=False)
    department = Column(String(100), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    branch = relationship("Branch", back_populates="users")
    manager = relationship("User", remote_side=[id], backref="subordinates")
    project = relationship("Project", foreign_keys=[project_id])
    role_profiles = relationship(
        "Role",
        secondary="user_roles",
        backref="users",
    )

    @property
    def permissions(self) -> list[str]:
        from sqlalchemy.orm import object_session
        from app.models.auth import Permission
        from app.models.users import RoleEnum
        
        session = object_session(self)
        if session is not None and (self.role == RoleEnum.SUPER_ADMIN or getattr(self.role, "value", None) == "SUPER_ADMIN"):
            return [p.name for p in session.query(Permission).all()]
            
        perms = set()
        for rp in self.role_profiles:
            for p in rp.permissions:
                perms.add(p.name)
        return sorted(list(perms))
