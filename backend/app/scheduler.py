"""Production scheduler, job implementations, and runtime management."""

from __future__ import annotations

import calendar
import logging
import threading
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Callable

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.time import today_in_timezone, utcnow
from app.db.session import SessionLocal
from app.models.auth import (
    EmailVerificationToken,
    PasswordResetToken,
    UserSession,
)
from app.models.leads import Lead, SiteVisit
from app.models.projects import Unit, UnitStatusEnum
from app.models.rentals import (
    InvoiceStatusEnum,
    LeaseAgreement,
    LeaseStatusEnum,
    RentalInvoice,
)
from app.models.sales import (
    Booking,
    BookingStatusEnum,
    Payment,
    PaymentStatusEnum,
)
from app.models.system import (
    ApprovalRequest,
    ApprovalStatusEnum,
    AuditLog,
    Notification,
    NotificationArchive,
    ScheduledReport,
    SchedulerExecution,
    SchedulerJob,
    TokenBlacklist,
)
from app.models.users import RoleEnum, User
from app.services.notifications import (
    dispatch_existing_notification,
    send_notification,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JobDefinition:
    id: str
    name: str
    description: str
    trigger: CronTrigger
    handler: Callable[[Session], dict[str, Any]]


def _cron(**kwargs: Any) -> CronTrigger:
    return CronTrigger(timezone=settings.SCHEDULER_TIMEZONE, **kwargs)


def _today() -> date:
    return today_in_timezone(settings.SCHEDULER_TIMEZONE)


def _utcnow() -> datetime:
    # Existing project columns use a mix of naive and timezone-aware values.
    # UTC-naive values remain portable across MySQL and SQLite.
    return utcnow()


def _notification_exists_since(
    db: Session,
    *,
    user_id: int,
    notif_type: str,
    message: str,
    since: datetime,
) -> bool:
    return (
        db.query(Notification.id)
        .filter(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.message == message,
            Notification.created_at >= since,
        )
        .first()
        is not None
    )


def release_expired_unit_holds(db: Session) -> dict[str, Any]:
    now = _utcnow()
    expired_unit_ids = [
        unit_id
        for (unit_id,) in (
            db.query(Unit.id)
            .filter(
                Unit.status == UnitStatusEnum.HOLD,
                Unit.hold_expires_at.isnot(None),
                Unit.hold_expires_at <= now,
            )
            .all()
        )
    ]
    if not expired_unit_ids:
        return {"released_holds": 0, "cancelled_bookings": 0}
    cancelled_bookings = (
        db.query(Booking)
        .filter(
            Booking.unit_id.in_(expired_unit_ids),
            Booking.status.in_(
                [
                    BookingStatusEnum.PENDING,
                    BookingStatusEnum.DOCS_VERIFIED,
                ]
            ),
        )
        .update(
            {Booking.status: BookingStatusEnum.CANCELLED},
            synchronize_session=False,
        )
    )
    released = (
        db.query(Unit)
        .filter(
            Unit.id.in_(expired_unit_ids),
            Unit.status == UnitStatusEnum.HOLD,
        )
        .update(
            {
                Unit.status: UnitStatusEnum.AVAILABLE,
                Unit.hold_expires_at: None,
            },
            synchronize_session=False,
        )
    )
    db.commit()
    return {
        "released_holds": released,
        "cancelled_bookings": cancelled_bookings,
    }


def send_payment_reminders(db: Session) -> dict[str, Any]:
    today = _today()
    day_start = datetime.combine(today, time.min)
    marked_overdue = (
        db.query(Payment)
        .filter(
            Payment.status == PaymentStatusEnum.PENDING,
            Payment.due_date.isnot(None),
            Payment.due_date < today,
        )
        .update(
            {Payment.status: PaymentStatusEnum.OVERDUE},
            synchronize_session=False,
        )
    )
    db.commit()
    payments = (
        db.query(Payment)
        .options(joinedload(Payment.booking))
        .filter(
            Payment.status.in_(
                [PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE]
            ),
            Payment.due_date.isnot(None),
            Payment.due_date <= today,
        )
        .all()
    )
    sent = 0
    for payment in payments:
        if payment.booking is None:
            continue
        overdue = payment.due_date < today
        notif_type = "PAYMENT_OVERDUE" if overdue else "PAYMENT_REMINDER"
        state = "overdue" if overdue else "due today"
        message = f"Payment #{payment.id} for Rs. {payment.amount} is {state}."
        if _notification_exists_since(
            db,
            user_id=payment.booking.created_by_id,
            notif_type=notif_type,
            message=message,
            since=day_start,
        ):
            continue
        send_notification(
            db,
            payment.booking.created_by_id,
            notif_type,
            message,
            email_subject="Payment due reminder",
            category="PAYMENTS",
            priority="HIGH",
        )
        sent += 1
    return {
        "payments_scanned": len(payments),
        "marked_overdue": marked_overdue,
        "reminders_sent": sent,
    }


def _month_due_date(lease: LeaseAgreement, year: int, month: int) -> date:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(lease.start_date.day, last_day))


def generate_monthly_rent_invoices(db: Session) -> dict[str, Any]:
    today = _today()
    leases = (
        db.query(LeaseAgreement)
        .filter(
            LeaseAgreement.status == LeaseStatusEnum.ACTIVE,
            LeaseAgreement.start_date <= today,
            LeaseAgreement.end_date >= today,
        )
        .all()
    )
    created = 0
    for lease in leases:
        due_date = _month_due_date(lease, today.year, today.month)
        exists = (
            db.query(RentalInvoice.id)
            .filter(
                RentalInvoice.lease_id == lease.id,
                RentalInvoice.due_date == due_date,
            )
            .first()
        )
        if exists:
            continue
        db.add(
            RentalInvoice(
                lease_id=lease.id,
                amount=lease.rent_amount,
                due_date=due_date,
                status=InvoiceStatusEnum.PENDING,
            )
        )
        try:
            db.commit()
            created += 1
        except IntegrityError:
            # The database constraint is the final idempotency guard when two
            # processes race to create the same invoice.
            db.rollback()
    return {"active_leases": len(leases), "invoices_created": created}


def _active_staff(db: Session) -> list[User]:
    return (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.role.in_(
                [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]
            ),
        )
        .all()
    )


def send_due_date_notifications(db: Session) -> dict[str, Any]:
    today = _today()
    horizon = today + timedelta(days=3)
    day_start = datetime.combine(today, time.min)
    marked_overdue = (
        db.query(RentalInvoice)
        .filter(
            RentalInvoice.status == InvoiceStatusEnum.PENDING,
            RentalInvoice.due_date < today,
        )
        .update(
            {RentalInvoice.status: InvoiceStatusEnum.OVERDUE},
            synchronize_session=False,
        )
    )
    db.commit()
    invoices = (
        db.query(RentalInvoice)
        .filter(
            RentalInvoice.status.in_(
                [InvoiceStatusEnum.PENDING, InvoiceStatusEnum.OVERDUE]
            ),
            RentalInvoice.due_date.between(today, horizon),
        )
        .all()
    )
    if not invoices:
        return {
            "due_invoices": 0,
            "marked_overdue": marked_overdue,
            "notifications_sent": 0,
        }

    staff = _active_staff(db)
    sent = 0
    for invoice in invoices:
        message = (
            f"Rental invoice #{invoice.id} for Rs. {invoice.amount} "
            f"is due on {invoice.due_date.isoformat()}."
        )
        for user in staff:
            if _notification_exists_since(
                db,
                user_id=user.id,
                notif_type="RENT_DUE_DATE",
                message=message,
                since=day_start,
            ):
                continue
            send_notification(
                db,
                user.id,
                "RENT_DUE_DATE",
                message,
                email_subject="Upcoming rent due date",
                category="RENTALS",
                priority="HIGH",
            )
            sent += 1
    return {
        "due_invoices": len(invoices),
        "marked_overdue": marked_overdue,
        "notifications_sent": sent,
    }


def escalate_pending_approvals(db: Session) -> dict[str, Any]:
    cutoff = _utcnow() - timedelta(hours=settings.APPROVAL_ESCALATION_HOURS)
    approvals = (
        db.query(ApprovalRequest)
        .filter(
            ApprovalRequest.status.in_(
                [ApprovalStatusEnum.PENDING, ApprovalStatusEnum.UNDER_REVIEW]
            ),
            ApprovalRequest.created_at <= cutoff,
        )
        .all()
    )
    super_admin = (
        db.query(User)
        .filter(User.role == RoleEnum.SUPER_ADMIN, User.is_active.is_(True))
        .first()
    )
    escalated = 0
    reminded = 0
    for approval in approvals:
        payload = dict(approval.payload or {})
        last_escalation = payload.get("_scheduler_escalated_at")
        if last_escalation:
            try:
                if datetime.fromisoformat(last_escalation) >= cutoff:
                    continue
            except (TypeError, ValueError):
                pass

        if approval.level < 2 and super_admin:
            approval.level = 2
            approval.status = ApprovalStatusEnum.UNDER_REVIEW
            approval.assigned_approver_id = super_admin.id
            recipient_id = super_admin.id
            escalated += 1
        else:
            recipient_id = approval.assigned_approver_id
            reminded += 1
        payload["_scheduler_escalated_at"] = _utcnow().isoformat()
        approval.payload = payload

        if recipient_id:
            send_notification(
                db,
                recipient_id,
                "APPROVAL_ESCALATED",
                f"Approval request #{approval.id} has exceeded its SLA.",
                email_subject="Approval SLA escalation",
                category="APPROVALS",
                priority="HIGH",
            )
    db.commit()
    return {
        "pending_scanned": len(approvals),
        "escalated": escalated,
        "reminders_sent": reminded,
    }


def retry_failed_notifications(db: Session) -> dict[str, Any]:
    now = _utcnow()
    notifications = (
        db.query(Notification)
        .filter(
            Notification.delivery_status == "FAILED",
            Notification.delivery_attempts < settings.NOTIFICATION_MAX_RETRIES,
            or_(
                Notification.next_retry_at.is_(None),
                Notification.next_retry_at <= now,
            ),
        )
        .order_by(Notification.created_at.asc())
        .limit(settings.NOTIFICATION_RETRY_BATCH_SIZE)
        .all()
    )
    delivered = 0
    failed = 0
    for notification in notifications:
        dispatch_existing_notification(
            db,
            notification,
            retry_delay_seconds=(
                settings.SCHEDULER_RETRY_DELAY_SECONDS
                * (2 ** min(notification.delivery_attempts or 0, 6))
            ),
        )
        if notification.delivery_status == "DELIVERED":
            delivered += 1
        else:
            failed += 1
    exhausted = (
        db.query(Notification)
        .filter(
            Notification.delivery_status == "FAILED",
            Notification.delivery_attempts >= settings.NOTIFICATION_MAX_RETRIES,
        )
        .update(
            {
                Notification.delivery_status: "DEAD",
                Notification.next_retry_at: None,
            },
            synchronize_session=False,
        )
    )
    db.commit()
    return {
        "retried": len(notifications),
        "delivered": delivered,
        "still_failed": failed,
        "exhausted": exhausted,
    }


def cleanup_expired_tokens(db: Session) -> dict[str, Any]:
    now = _utcnow()
    blacklist_cutoff = now - timedelta(days=settings.TOKEN_RETENTION_DAYS)
    counts = {
        "password_reset_tokens": db.query(PasswordResetToken)
        .filter(
            or_(
                PasswordResetToken.expires_at < now,
                PasswordResetToken.is_used.is_(True),
            )
        )
        .delete(synchronize_session=False),
        "email_verification_tokens": db.query(EmailVerificationToken)
        .filter(
            or_(
                EmailVerificationToken.expires_at < now,
                EmailVerificationToken.is_used.is_(True),
            )
        )
        .delete(synchronize_session=False),
        "sessions": db.query(UserSession)
        .filter(
            or_(UserSession.expires_at < now, UserSession.is_active.is_(False))
        )
        .delete(synchronize_session=False),
        "blacklisted_tokens": db.query(TokenBlacklist)
        .filter(TokenBlacklist.blacklisted_at < blacklist_cutoff)
        .delete(synchronize_session=False),
    }
    db.commit()
    return counts


def delete_old_logs(db: Session) -> dict[str, Any]:
    cutoff = _utcnow() - timedelta(days=settings.LOG_RETENTION_DAYS)
    audit_deleted = (
        db.query(AuditLog)
        .filter(AuditLog.timestamp < cutoff)
        .delete(synchronize_session=False)
    )
    execution_deleted = (
        db.query(SchedulerExecution)
        .filter(SchedulerExecution.started_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "audit_logs_deleted": audit_deleted,
        "scheduler_executions_deleted": execution_deleted,
        "cutoff": cutoff.isoformat(),
    }


def archive_old_notifications(db: Session) -> dict[str, Any]:
    cutoff = _utcnow() - timedelta(days=settings.NOTIFICATION_ARCHIVE_DAYS)
    old = (
        db.query(Notification)
        .filter(
            Notification.created_at < cutoff,
            Notification.is_read.is_(True),
            Notification.delivery_status != "FAILED",
        )
        .order_by(Notification.id.asc())
        .limit(1000)
        .all()
    )
    archived = 0
    for notification in old:
        db.add(
            NotificationArchive(
                original_notification_id=notification.id,
                user_id=notification.user_id,
                type=notification.type,
                category=notification.category,
                priority=notification.priority,
                message=notification.message,
                email_subject=notification.email_subject,
                delivery_status=notification.delivery_status,
                delivery_attempts=notification.delivery_attempts,
                last_delivery_error=notification.last_delivery_error,
                is_read=notification.is_read,
                read_at=notification.read_at,
                original_created_at=notification.created_at,
            )
        )
        db.delete(notification)
        archived += 1
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    return {"notifications_archived": archived, "cutoff": cutoff.isoformat()}


def _report_range(period: str, today: date) -> tuple[date, date]:
    if period == "daily":
        report_day = today - timedelta(days=1)
        return report_day, report_day
    if period == "weekly":
        this_monday = today - timedelta(days=today.weekday())
        return this_monday - timedelta(days=7), this_monday - timedelta(days=1)
    if period == "monthly":
        first_this_month = today.replace(day=1)
        end = first_this_month - timedelta(days=1)
        return end.replace(day=1), end
    raise ValueError(f"Unsupported report period: {period}")


def _generate_report(db: Session, period: str) -> dict[str, Any]:
    start, end = _report_range(period, _today())
    existing = (
        db.query(ScheduledReport)
        .filter(
            ScheduledReport.period == period,
            ScheduledReport.period_start == start,
            ScheduledReport.period_end == end,
        )
        .first()
    )
    if existing:
        return {"report_id": existing.id, "created": False, "period": period}

    start_dt = datetime.combine(start, time.min)
    end_dt = datetime.combine(end + timedelta(days=1), time.min)
    received_amount = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.status == PaymentStatusEnum.RECEIVED,
            Payment.received_date.between(start, end),
        )
        .scalar()
    )
    data = {
        "leads_created": db.query(func.count(Lead.id))
        .filter(Lead.created_at >= start_dt, Lead.created_at < end_dt)
        .scalar(),
        "bookings_created": db.query(func.count(Booking.id))
        .filter(Booking.created_at >= start_dt, Booking.created_at < end_dt)
        .scalar(),
        "site_visits": db.query(func.count(SiteVisit.id))
        .filter(SiteVisit.scheduled_at >= start_dt, SiteVisit.scheduled_at < end_dt)
        .scalar(),
        "payments_received": db.query(func.count(Payment.id))
        .filter(
            Payment.status == PaymentStatusEnum.RECEIVED,
            Payment.received_date.between(start, end),
        )
        .scalar(),
        "received_amount": float(received_amount or Decimal("0")),
        "pending_approvals": db.query(func.count(ApprovalRequest.id))
        .filter(
            ApprovalRequest.status.in_(
                [ApprovalStatusEnum.PENDING, ApprovalStatusEnum.UNDER_REVIEW]
            )
        )
        .scalar(),
        "available_units": db.query(func.count(Unit.id))
        .filter(Unit.status == UnitStatusEnum.AVAILABLE)
        .scalar(),
    }
    report = ScheduledReport(
        period=period,
        period_start=start,
        period_end=end,
        data=data,
    )
    db.add(report)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        report = (
            db.query(ScheduledReport)
            .filter(
                ScheduledReport.period == period,
                ScheduledReport.period_start == start,
                ScheduledReport.period_end == end,
            )
            .one()
        )
        return {"report_id": report.id, "created": False, "period": period}
    db.refresh(report)
    return {"report_id": report.id, "created": True, "period": period}


def generate_daily_report(db: Session) -> dict[str, Any]:
    return _generate_report(db, "daily")


def generate_weekly_report(db: Session) -> dict[str, Any]:
    return _generate_report(db, "weekly")


def generate_monthly_report(db: Session) -> dict[str, Any]:
    return _generate_report(db, "monthly")


JOB_DEFINITIONS: dict[str, JobDefinition] = {
    definition.id: definition
    for definition in (
        JobDefinition(
            "release_expired_unit_holds",
            "Release Expired Unit Holds",
            "Returns expired held inventory to AVAILABLE.",
            _cron(minute="*"),
            release_expired_unit_holds,
        ),
        JobDefinition(
            "send_payment_reminders",
            "Send Payment Reminders",
            "Sends idempotent reminders for due and overdue payments.",
            _cron(hour=9, minute=0),
            send_payment_reminders,
        ),
        JobDefinition(
            "generate_monthly_rent_invoices",
            "Generate Monthly Rent Invoices",
            "Creates one invoice per active lease and billing month.",
            # Runs daily so a deployment that was offline on day one catches
            # up; the unique lease/month constraint keeps generation monthly.
            _cron(hour=1, minute=0),
            generate_monthly_rent_invoices,
        ),
        JobDefinition(
            "send_due_date_notifications",
            "Send Due Date Notifications",
            "Notifies responsible staff about rent due within three days.",
            _cron(hour=8, minute=0),
            send_due_date_notifications,
        ),
        JobDefinition(
            "escalate_pending_approvals",
            "Escalate Pending Approvals",
            "Escalates approvals that exceed the configured SLA.",
            _cron(minute=15),
            escalate_pending_approvals,
        ),
        JobDefinition(
            "retry_failed_notifications",
            "Retry Failed Notifications",
            "Retries failed external notification delivery in bounded batches.",
            _cron(minute="*/15"),
            retry_failed_notifications,
        ),
        JobDefinition(
            "cleanup_expired_tokens",
            "Cleanup Expired Tokens",
            "Deletes expired, used, and inactive authentication artifacts.",
            _cron(hour=2, minute=0),
            cleanup_expired_tokens,
        ),
        JobDefinition(
            "delete_old_logs",
            "Delete Old Logs",
            "Deletes audit logs beyond the configured retention period.",
            _cron(day_of_week="sun", hour=3, minute=0),
            delete_old_logs,
        ),
        JobDefinition(
            "archive_old_notifications",
            "Archive Old Notifications",
            "Moves old read notifications to archive storage.",
            _cron(hour=2, minute=30),
            archive_old_notifications,
        ),
        JobDefinition(
            "generate_daily_report",
            "Generate Daily Reports",
            "Persists the previous day's operational summary.",
            _cron(hour=0, minute=15),
            generate_daily_report,
        ),
        JobDefinition(
            "generate_weekly_report",
            "Generate Weekly Reports",
            "Persists the previous calendar week's operational summary.",
            _cron(day_of_week="mon", hour=0, minute=30),
            generate_weekly_report,
        ),
        JobDefinition(
            "generate_monthly_report",
            "Generate Monthly Reports",
            "Persists the previous calendar month's operational summary.",
            _cron(day=1, hour=0, minute=45),
            generate_monthly_report,
        ),
    )
}


def _build_scheduler() -> BackgroundScheduler:
    return BackgroundScheduler(
        timezone=settings.SCHEDULER_TIMEZONE,
        executors={
            "default": ThreadPoolExecutor(max_workers=settings.SCHEDULER_MAX_WORKERS)
        },
        job_defaults={
            "coalesce": True,
            "max_instances": 1,
            "misfire_grace_time": settings.SCHEDULER_MISFIRE_GRACE_SECONDS,
        },
    )


scheduler = _build_scheduler()
_lifecycle_lock = threading.RLock()


def _ensure_job_rows(db: Session) -> None:
    for definition in JOB_DEFINITIONS.values():
        row = db.get(SchedulerJob, definition.id)
        if row is None:
            row = SchedulerJob(
                id=definition.id,
                name=definition.name,
                description=definition.description,
                trigger=str(definition.trigger),
                enabled=True,
                paused=False,
                max_retries=settings.SCHEDULER_JOB_MAX_RETRIES,
            )
            db.add(row)
        else:
            row.name = definition.name
            row.description = definition.description
            row.trigger = str(definition.trigger)
    db.commit()


def _add_scheduled_job(definition: JobDefinition) -> None:
    scheduler.add_job(
        _execute_job,
        trigger=definition.trigger,
        id=definition.id,
        name=definition.name,
        args=[definition.id, "scheduled", 1],
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=settings.SCHEDULER_MISFIRE_GRACE_SECONDS,
    )


def _record_skipped(
    db: Session,
    job_id: str,
    triggered_by: str,
    reason: str,
    *,
    attempt: int,
) -> None:
    now = _utcnow()
    db.add(
        SchedulerExecution(
            job_id=job_id,
            status="SKIPPED",
            triggered_by=triggered_by,
            attempt=attempt,
            started_at=now,
            finished_at=now,
            duration_seconds=0,
            error=reason,
        )
    )
    db.commit()


def _notify_job_failure(job_id: str, error: str, exhausted: bool) -> None:
    failure_db = SessionLocal()
    try:
        staff = (
            failure_db.query(User)
            .filter(
                User.is_active.is_(True),
                User.role.in_([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]),
            )
            .all()
        )
        label = "failed after all retries" if exhausted else "failed and will retry"
        for user in staff:
            send_notification(
                failure_db,
                user.id,
                "SCHEDULER_JOB_FAILED",
                f"Scheduler job '{job_id}' {label}: {error[:500]}",
                email_subject=f"Scheduler failure: {job_id}",
                category="SYSTEM",
                priority="HIGH",
            )
    except Exception:
        failure_db.rollback()
        logger.exception("Unable to send scheduler failure notification")
    finally:
        failure_db.close()


def _schedule_retry(job_id: str, attempt: int) -> None:
    delay = settings.SCHEDULER_RETRY_DELAY_SECONDS * (2 ** max(0, attempt - 2))
    retry_id = f"retry:{job_id}:{attempt}"
    scheduler.add_job(
        _execute_job,
        "date",
        id=retry_id,
        name=f"Retry {job_id} (attempt {attempt})",
        run_date=datetime.now(scheduler.timezone) + timedelta(seconds=delay),
        args=[job_id, "retry", attempt],
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=settings.SCHEDULER_MISFIRE_GRACE_SECONDS,
    )


def _execute_job(
    job_id: str,
    triggered_by: str = "scheduled",
    attempt: int = 1,
) -> dict[str, Any] | None:
    """Execute a registered job with a DB lease, history, retry, and alerts."""

    definition = JOB_DEFINITIONS.get(job_id)
    if definition is None:
        logger.error("Unknown scheduler job requested", extra={"job_id": job_id})
        return None

    db = SessionLocal()
    state: SchedulerJob | None = None
    execution_id: int | None = None
    started_at = _utcnow()
    try:
        state = db.get(SchedulerJob, job_id)
        if state is None:
            _ensure_job_rows(db)
            state = db.get(SchedulerJob, job_id)
        if state is None:
            raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")

        if not state.enabled and triggered_by != "manual":
            _record_skipped(
                db,
                job_id,
                triggered_by,
                "Job is disabled",
                attempt=attempt,
            )
            return None
        if state.paused and triggered_by == "scheduled":
            _record_skipped(
                db,
                job_id,
                triggered_by,
                "Job is paused",
                attempt=attempt,
            )
            return None

        if triggered_by == "scheduled":
            duplicate_cutoff = started_at - timedelta(
                seconds=settings.SCHEDULER_DEDUPLICATION_SECONDS
            )
            recent = (
                db.query(SchedulerExecution.id)
                .filter(
                    SchedulerExecution.job_id == job_id,
                    SchedulerExecution.triggered_by == "scheduled",
                    SchedulerExecution.status.in_(["RUNNING", "SUCCESS"]),
                    SchedulerExecution.started_at >= duplicate_cutoff,
                )
                .first()
            )
            if recent:
                _record_skipped(
                    db,
                    job_id,
                    triggered_by,
                    "Duplicate scheduled fire suppressed",
                    attempt=attempt,
                )
                return None

        stale_before = started_at - timedelta(
            minutes=settings.SCHEDULER_LOCK_TIMEOUT_MINUTES
        )
        acquired = (
            db.query(SchedulerJob)
            .filter(
                SchedulerJob.id == job_id,
                or_(
                    SchedulerJob.running_since.is_(None),
                    SchedulerJob.running_since < stale_before,
                ),
            )
            .update(
                {SchedulerJob.running_since: started_at},
                synchronize_session=False,
            )
        )
        db.commit()
        if acquired != 1:
            _record_skipped(
                db,
                job_id,
                triggered_by,
                "A previous execution is still running",
                attempt=attempt,
            )
            logger.warning(
                "Skipped overlapping scheduler execution",
                extra={"job_id": job_id, "triggered_by": triggered_by},
            )
            return None

        execution = SchedulerExecution(
            job_id=job_id,
            status="RUNNING",
            triggered_by=triggered_by,
            attempt=attempt,
            started_at=started_at,
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)
        execution_id = execution.id

        logger.info(
            "Scheduler job started",
            extra={"job_id": job_id, "execution_id": execution_id, "attempt": attempt},
        )
        result = definition.handler(db)
        finished_at = _utcnow()
        execution = db.get(SchedulerExecution, execution_id)
        state = db.get(SchedulerJob, job_id)
        if execution is None or state is None:
            raise RuntimeError(f"Scheduler execution state was lost for {job_id}")
        execution.status = "SUCCESS"
        execution.finished_at = finished_at
        execution.duration_seconds = (finished_at - started_at).total_seconds()
        execution.result = result
        state.running_since = None
        state.execution_count = (state.execution_count or 0) + 1
        state.consecutive_failures = 0
        state.last_run_at = finished_at
        state.last_success_at = finished_at
        state.last_error = None
        db.commit()
        logger.info(
            "Scheduler job completed",
            extra={
                "job_id": job_id,
                "execution_id": execution_id,
                "duration_seconds": execution.duration_seconds,
            },
        )
        return result
    except Exception as exc:
        db.rollback()
        finished_at = _utcnow()
        error = f"{type(exc).__name__}: {exc}"
        logger.exception(
            "Scheduler job failed",
            extra={"job_id": job_id, "execution_id": execution_id, "attempt": attempt},
        )
        try:
            state = db.get(SchedulerJob, job_id)
            if state is not None:
                state.running_since = None
                state.execution_count = (state.execution_count or 0) + 1
                state.consecutive_failures = (state.consecutive_failures or 0) + 1
                state.last_run_at = finished_at
                state.last_failure_at = finished_at
                state.last_error = error
            if execution_id is not None:
                execution = db.get(SchedulerExecution, execution_id)
                if execution is not None:
                    execution.status = "FAILED"
                    execution.finished_at = finished_at
                    execution.duration_seconds = (
                        finished_at - started_at
                    ).total_seconds()
                    execution.error = error
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Unable to persist scheduler failure state")

        max_retries = state.max_retries if state is not None else 0
        should_retry = attempt <= max_retries and scheduler.running
        if should_retry:
            _schedule_retry(job_id, attempt + 1)
        _notify_job_failure(job_id, error, exhausted=not should_retry)
        return None
    finally:
        db.close()


def start_scheduler() -> None:
    global scheduler
    if not settings.SCHEDULER_ENABLED:
        logger.info("Scheduler is disabled by configuration")
        return
    with _lifecycle_lock:
        if scheduler.running:
            return
        # APScheduler executors cannot be reused reliably after shutdown.
        scheduler = _build_scheduler()
        db = SessionLocal()
        try:
            _ensure_job_rows(db)
            states = {row.id: row for row in db.query(SchedulerJob).all()}
            for job_id, definition in JOB_DEFINITIONS.items():
                state = states[job_id]
                if state.enabled:
                    _add_scheduled_job(definition)
                    if state.paused:
                        scheduler.pause_job(job_id)
            scheduler.start()
            logger.info(
                "APScheduler started",
                extra={"jobs": len(scheduler.get_jobs())},
            )
        except Exception:
            logger.exception(
                "APScheduler could not start; verify migrations and database connectivity"
            )
            raise
        finally:
            db.close()


def stop_scheduler() -> None:
    with _lifecycle_lock:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("APScheduler stopped")


def list_job_statuses(db: Session) -> list[dict[str, Any]]:
    _ensure_job_rows(db)
    return [get_job_status(db, job_id) for job_id in JOB_DEFINITIONS]


def get_job_status(db: Session, job_id: str) -> dict[str, Any]:
    if job_id not in JOB_DEFINITIONS:
        raise KeyError(job_id)
    state = db.get(SchedulerJob, job_id)
    if state is None:
        _ensure_job_rows(db)
        state = db.get(SchedulerJob, job_id)
    if state is None:
        raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")
    runtime_job = scheduler.get_job(job_id) if scheduler.running else None
    if not state.enabled:
        runtime_status = "DISABLED"
    elif state.running_since is not None:
        runtime_status = "RUNNING"
    elif state.paused:
        runtime_status = "PAUSED"
    elif runtime_job is not None:
        runtime_status = "SCHEDULED"
    else:
        runtime_status = "UNAVAILABLE"
    return {
        "id": state.id,
        "name": state.name,
        "description": state.description,
        "trigger": state.trigger,
        "enabled": state.enabled,
        "paused": state.paused,
        "status": runtime_status,
        "next_run_at": runtime_job.next_run_time if runtime_job else None,
        "running_since": state.running_since,
        "execution_count": state.execution_count,
        "consecutive_failures": state.consecutive_failures,
        "max_retries": state.max_retries,
        "last_run_at": state.last_run_at,
        "last_success_at": state.last_success_at,
        "last_failure_at": state.last_failure_at,
        "last_error": state.last_error,
    }


def enable_job(db: Session, job_id: str) -> dict[str, Any]:
    definition = JOB_DEFINITIONS.get(job_id)
    if definition is None:
        raise KeyError(job_id)
    state = db.get(SchedulerJob, job_id)
    if state is None:
        _ensure_job_rows(db)
        state = db.get(SchedulerJob, job_id)
    if state is None:
        raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")
    state.enabled = True
    state.paused = False
    db.commit()
    if scheduler.running:
        _add_scheduled_job(definition)
    return get_job_status(db, job_id)


def disable_job(db: Session, job_id: str) -> dict[str, Any]:
    if job_id not in JOB_DEFINITIONS:
        raise KeyError(job_id)
    state = db.get(SchedulerJob, job_id)
    if state is None:
        _ensure_job_rows(db)
        state = db.get(SchedulerJob, job_id)
    if state is None:
        raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")
    state.enabled = False
    state.paused = False
    db.commit()
    if scheduler.running and scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    return get_job_status(db, job_id)


def pause_job(db: Session, job_id: str) -> dict[str, Any]:
    if job_id not in JOB_DEFINITIONS:
        raise KeyError(job_id)
    state = db.get(SchedulerJob, job_id)
    if state is None:
        _ensure_job_rows(db)
        state = db.get(SchedulerJob, job_id)
    if state is None:
        raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")
    if not state.enabled:
        raise ValueError("Disabled jobs cannot be paused")
    state.paused = True
    db.commit()
    if scheduler.running and scheduler.get_job(job_id):
        scheduler.pause_job(job_id)
    return get_job_status(db, job_id)


def resume_job(db: Session, job_id: str) -> dict[str, Any]:
    if job_id not in JOB_DEFINITIONS:
        raise KeyError(job_id)
    state = db.get(SchedulerJob, job_id)
    if state is None:
        _ensure_job_rows(db)
        state = db.get(SchedulerJob, job_id)
    if state is None:
        raise RuntimeError(f"Scheduler state could not be initialized for {job_id}")
    if not state.enabled:
        raise ValueError("Disabled jobs cannot be resumed")
    state.paused = False
    db.commit()
    if scheduler.running:
        if scheduler.get_job(job_id):
            scheduler.resume_job(job_id)
        else:
            _add_scheduled_job(JOB_DEFINITIONS[job_id])
    return get_job_status(db, job_id)


def queue_job_now(job_id: str, *, triggered_by: str = "manual", attempt: int = 1) -> str:
    if job_id not in JOB_DEFINITIONS:
        raise KeyError(job_id)
    if not scheduler.running:
        raise RuntimeError("Scheduler is not running")
    run_id = f"run-now:{job_id}:{uuid.uuid4().hex}"
    scheduler.add_job(
        _execute_job,
        "date",
        id=run_id,
        name=f"Run now: {JOB_DEFINITIONS[job_id].name}",
        run_date=datetime.now(scheduler.timezone),
        args=[job_id, triggered_by, attempt],
        max_instances=1,
        misfire_grace_time=settings.SCHEDULER_MISFIRE_GRACE_SECONDS,
    )
    return run_id


# Backwards-compatible names used by earlier integrations.
def release_expired_holds() -> dict[str, Any]:
    db = SessionLocal()
    try:
        return release_expired_unit_holds(db)
    finally:
        db.close()


def payment_reminders_job() -> dict[str, Any]:
    db = SessionLocal()
    try:
        return send_payment_reminders(db)
    finally:
        db.close()
