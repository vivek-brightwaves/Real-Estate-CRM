import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Date, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class ApprovalTypeEnum(str, enum.Enum):
    DISCOUNT = "DISCOUNT"
    REFUND = "REFUND"
    CANCELLATION = "CANCELLATION"
    UNIT_TRANSFER = "UNIT_TRANSFER"
    PRICE_REVISION = "PRICE_REVISION"

class ApprovalStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AuditActionEnum(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    due_date = Column(Date, nullable=True)

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False) # Keep as string for compatibility, or change to enum
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=False)
    changes = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ApprovalTypeEnum), index=True, nullable=False)
    status = Column(Enum(ApprovalStatusEnum), default=ApprovalStatusEnum.PENDING, index=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payload = Column(JSON, nullable=False) # Store dynamic data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    message = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
