from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Text, Boolean
from app.models.customers import SiteVisitStatusEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

import enum

class LeadStatusEnum(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    VISIT_SCHEDULED = "VISIT_SCHEDULED"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    source = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    notes = relationship("LeadNote", back_populates="lead")
    site_visits = relationship("SiteVisit", back_populates="lead")

class LeadNote(Base):
    __tablename__ = "lead_notes"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    note = Column(String(2000), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="notes")
    created_by = relationship("User", foreign_keys=[created_by_id])

class SiteVisit(Base):
    __tablename__ = "site_visits"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(SiteVisitStatusEnum), default=SiteVisitStatusEnum.SCHEDULED, index=True)
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    check_in_time = Column(DateTime, nullable=True)
    photo_url = Column(String(255), nullable=True)
    is_approved = Column(Boolean, default=False)

    lead = relationship("Lead", back_populates="site_visits")
    employee = relationship("User", foreign_keys=[employee_id])
