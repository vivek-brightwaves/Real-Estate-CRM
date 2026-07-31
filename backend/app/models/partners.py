from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class CommissionTypeEnum(str, enum.Enum):
    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"

class PayoutStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"

class Broker(Base):
    __tablename__ = "brokers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    company_name = Column(String(150), nullable=True)
    rera_registration = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=False)
    email = Column(String(150), nullable=True)
    bank_account = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CommissionPlan(Base):
    __tablename__ = "commission_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    plan_type = Column(Enum(CommissionTypeEnum), nullable=False)
    value = Column(DECIMAL(12, 2), nullable=False)  # either a flat amount or percentage (e.g. 2.00 for 2%)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)

class CommissionPayout(Base):
    __tablename__ = "commission_payouts"
    id = Column(Integer, primary_key=True, index=True)
    broker_id = Column(Integer, ForeignKey("brokers.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    amount = Column(DECIMAL(12, 2), nullable=False)
    status = Column(Enum(PayoutStatusEnum), default=PayoutStatusEnum.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    broker = relationship("Broker")
    booking = relationship("Booking")
    approved_by = relationship("User")
