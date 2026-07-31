from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Date, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class LeaseStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    TERMINATED = "TERMINATED"
    EXPIRED = "EXPIRED"

class InvoiceStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    OVERDUE = "OVERDUE"

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=False)
    identity_document_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeaseAgreement(Base):
    __tablename__ = "lease_agreements"
    __table_args__ = (
        Index("ix_lease_status_dates", "status", "start_date", "end_date"),
    )
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount = Column(DECIMAL(12, 2), nullable=False)
    security_deposit = Column(DECIMAL(12, 2), nullable=False)
    status = Column(Enum(LeaseStatusEnum), default=LeaseStatusEnum.DRAFT, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    unit = relationship("Unit")
    tenant = relationship("Tenant")

class RentalInvoice(Base):
    __tablename__ = "rental_invoices"
    __table_args__ = (
        UniqueConstraint("lease_id", "due_date", name="uq_rental_invoice_lease_due_date"),
        Index("ix_rental_invoice_status_due_date", "status", "due_date"),
    )
    id = Column(Integer, primary_key=True, index=True)
    lease_id = Column(Integer, ForeignKey("lease_agreements.id"), nullable=False, index=True)
    amount = Column(DECIMAL(12, 2), nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(InvoiceStatusEnum), default=InvoiceStatusEnum.PENDING, index=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lease = relationship("LeaseAgreement")
