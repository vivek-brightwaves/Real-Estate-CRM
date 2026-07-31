import enum
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Index,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class ApprovalTypeEnum(str, enum.Enum):
    DISCOUNT = "DISCOUNT"
    REFUND = "REFUND"
    CANCELLATION = "CANCELLATION"
    UNIT_TRANSFER = "UNIT_TRANSFER"
    PRICE_REVISION = "PRICE_REVISION"
    BOOKING_APPROVAL = "BOOKING_APPROVAL"
    KYC_APPROVAL = "KYC_APPROVAL"
    DOCUMENT_APPROVAL = "DOCUMENT_APPROVAL"
    POSSESSION_APPROVAL = "POSSESSION_APPROVAL"
    RENTAL_AGREEMENT_APPROVAL = "RENTAL_AGREEMENT_APPROVAL"
    BROKER_COMMISSION_APPROVAL = "BROKER_COMMISSION_APPROVAL"

class ApprovalStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    AUTO_APPROVED = "AUTO_APPROVED"

class AuditActionEnum(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_task_assignee_status_due", "assigned_to_id", "status", "due_date"),
    )
    id = Column(Integer, primary_key=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    priority = Column(String(20), nullable=False, default="MEDIUM", index=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_message_recipient_read_created", "recipient_id", "is_read", "created_at"),
        Index("ix_message_sender_created", "sender_id", "created_at"),
    )
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    sender_deleted = Column(Boolean, nullable=False, default=False)
    recipient_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])

    @property
    def sender_name(self):
        return self.sender.name

    @property
    def recipient_name(self):
        return self.recipient.name

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    module = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changes = Column(JSON, nullable=True) # Kept for backward compat
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", foreign_keys=[user_id])

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    __table_args__ = (
        Index("ix_approval_status_created_at", "status", "created_at"),
    )
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ApprovalTypeEnum), index=True, nullable=False)
    status = Column(Enum(ApprovalStatusEnum), default=ApprovalStatusEnum.PENDING, index=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    level = Column(Integer, default=1, nullable=False)
    remarks = Column(String(1000), nullable=True)
    payload = Column(JSON, nullable=False) # Store dynamic data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    assigned_approver = relationship("User", foreign_keys=[assigned_approver_id])

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index(
            "ix_notification_user_read_created",
            "user_id",
            "is_read",
            "created_at",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False, default="GENERAL")
    priority = Column(String(20), nullable=False, default="NORMAL")
    message = Column(String(1000), nullable=False)
    email_subject = Column(String(255), nullable=True)
    delivery_status = Column(String(20), nullable=False, default="DELIVERED", index=True)
    delivery_attempts = Column(Integer, nullable=False, default=0)
    last_delivery_error = Column(String(1000), nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", foreign_keys=[user_id])

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    whatsapp_enabled = Column(Boolean, default=False)
    in_app_enabled = Column(Boolean, default=True)

    user = relationship("User", foreign_keys=[user_id])

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    subject = Column(String(255), nullable=True)
    body = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class SchedulerJob(Base):
    """Persistent operational state for a code-defined scheduler job."""

    __tablename__ = "scheduler_jobs"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=False)
    trigger = Column(String(500), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True, index=True)
    paused = Column(Boolean, nullable=False, default=False)
    running_since = Column(DateTime(timezone=True), nullable=True, index=True)
    execution_count = Column(Integer, nullable=False, default=0)
    consecutive_failures = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_failure_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SchedulerExecution(Base):
    __tablename__ = "scheduler_executions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), ForeignKey("scheduler_jobs.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    triggered_by = Column(String(20), nullable=False, default="scheduled", index=True)
    attempt = Column(Integer, nullable=False, default=1)
    started_at = Column(DateTime(timezone=True), nullable=False, index=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)

    job = relationship("SchedulerJob")


class NotificationArchive(Base):
    __tablename__ = "notification_archives"

    id = Column(Integer, primary_key=True, index=True)
    original_notification_id = Column(Integer, nullable=False, unique=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    message = Column(String(1000), nullable=False)
    email_subject = Column(String(255), nullable=True)
    delivery_status = Column(String(20), nullable=False)
    delivery_attempts = Column(Integer, nullable=False, default=0)
    last_delivery_error = Column(String(1000), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    original_created_at = Column(DateTime(timezone=True), nullable=False, index=True)
    archived_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    __table_args__ = (
        UniqueConstraint("period", "period_start", "period_end", name="uq_report_period_range"),
    )

    id = Column(Integer, primary_key=True, index=True)
    period = Column(String(20), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    data = Column(JSON, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
