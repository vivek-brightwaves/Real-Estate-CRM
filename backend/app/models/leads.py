import enum
from datetime import datetime, timedelta, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Enum,
    DateTime,
    Text,
    Boolean,
    Table,
)
from app.models.customers import SiteVisitStatusEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class LeadStatusEnum(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    VISIT_SCHEDULED = "VISIT_SCHEDULED"
    NEGOTIATION = "NEGOTIATION"
    CONVERTED = "CONVERTED"
    LOST = "LOST"

class LeadActivityType(str, enum.Enum):
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    ASSIGNED = "ASSIGNED"
    STATUS_CHANGED = "STATUS_CHANGED"
    NOTE_ADDED = "NOTE_ADDED"
    CONVERTED = "CONVERTED"

lead_tag_associations = Table(
    "lead_tag_associations",
    Base.metadata,
    Column("lead_id", Integer, ForeignKey("leads.id"), primary_key=True, index=True),
    Column("tag_id", Integer, ForeignKey("lead_tags.id"), primary_key=True, index=True),
)

class LeadSource(Base):
    __tablename__ = "lead_sources"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", back_populates="lead_source")

class LeadStatus(Base):
    __tablename__ = "lead_statuses"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", back_populates="custom_status")

class LeadTag(Base):
    __tablename__ = "lead_tags"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", secondary=lead_tag_associations, back_populates="tags")

class LeadCampaign(Base):
    __tablename__ = "lead_campaigns"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    source = Column(String(150), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", back_populates="campaign")

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    source = Column(String(100), nullable=True)
    lead_source_id = Column(Integer, ForeignKey("lead_sources.id"), nullable=True, index=True)
    lead_status_id = Column(Integer, ForeignKey("lead_statuses.id"), nullable=True, index=True)
    campaign_id = Column(Integer, ForeignKey("lead_campaigns.id"), nullable=True, index=True)
    status = Column(Enum(LeadStatusEnum), nullable=False, index=True, default=LeadStatusEnum.NEW)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    priority = Column(String(50), nullable=True, index=True)
    remarks = Column(Text, nullable=True)
    next_follow_up_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        default=lambda: datetime.now(timezone.utc) + timedelta(days=1),
    )
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    deleted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship("Company")
    lead_source = relationship("LeadSource", back_populates="leads")
    custom_status = relationship("LeadStatus", back_populates="leads")
    campaign = relationship("LeadCampaign", back_populates="leads")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    deleted_by = relationship("User", foreign_keys=[deleted_by_id])
    notes = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan")
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan")
    assignments = relationship("LeadAssignment", back_populates="lead", cascade="all, delete-orphan")
    tags = relationship("LeadTag", secondary=lead_tag_associations, back_populates="leads")
    site_visits = relationship("SiteVisit", back_populates="lead")

class LeadNote(Base):
    __tablename__ = "lead_notes"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    note = Column(String(2000), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lead = relationship("Lead", back_populates="notes")
    created_by = relationship("User", foreign_keys=[created_by_id])

class LeadAssignment(Base):
    __tablename__ = "lead_assignments"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lead = relationship("Lead", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

class LeadActivity(Base):
    __tablename__ = "lead_activities"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    activity_type = Column(Enum(LeadActivityType), nullable=False, index=True)
    description = Column(String(1000), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lead = relationship("Lead", back_populates="activities")
    created_by = relationship("User", foreign_keys=[created_by_id])

class SiteVisit(Base):
    __tablename__ = "site_visits"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(SiteVisitStatusEnum), default=SiteVisitStatusEnum.SCHEDULED, index=True)
    feedback = Column(Text, nullable=True)
    sales_notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    check_in_time = Column(DateTime, nullable=True)
    photo_url = Column(String(255), nullable=True)
    is_approved = Column(Boolean, default=False)

    lead = relationship("Lead", back_populates="site_visits")
    employee = relationship("User", foreign_keys=[employee_id])
