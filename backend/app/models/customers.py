import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base

class DocStatusEnum(str, enum.Enum):
    UPLOADED = "UPLOADED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class SiteVisitStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    lead = relationship("Lead")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    documents = relationship("CustomerDocument", back_populates="customer")

class CustomerDocument(Base):
    __tablename__ = "customer_documents"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)
    file_url = Column(String(255), nullable=False)
    status = Column(Enum(DocStatusEnum), default=DocStatusEnum.UPLOADED, index=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="documents")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
