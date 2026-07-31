from datetime import date, timedelta, timezone
from types import SimpleNamespace

from app.core.time import utcnow
from app.core.security import get_password_hash
from app.models.auth import (
    EmailVerificationToken,
    PasswordResetToken,
    UserSession,
)
from app.models.customers import Customer
from app.models.projects import Unit, UnitStatusEnum
from app.models.rentals import (
    LeaseAgreement,
    LeaseStatusEnum,
    RentalInvoice,
    Tenant,
)
from app.models.sales import Booking, Payment, PaymentStatusEnum
from app.models.system import (
    ApprovalRequest,
    ApprovalStatusEnum,
    ApprovalTypeEnum,
    AuditLog,
    Notification,
    NotificationArchive,
    ScheduledReport,
    SchedulerExecution,
    SchedulerJob,
    TokenBlacklist,
)
from app.models.users import RoleEnum, User
from app.scheduler import (
    JOB_DEFINITIONS,
    JobDefinition,
    _execute_job,
    archive_old_notifications,
    cleanup_expired_tokens,
    delete_old_logs,
    disable_job,
    escalate_pending_approvals,
    enable_job,
    generate_daily_report,
    generate_monthly_rent_invoices,
    generate_monthly_report,
    generate_weekly_report,
    get_job_status,
    list_job_statuses,
    pause_job,
    queue_job_now,
    release_expired_unit_holds,
    retry_failed_notifications,
    resume_job,
    send_due_date_notifications,
    send_payment_reminders,
)
from sqlalchemy.orm import sessionmaker
import app.scheduler as scheduler_module


EXPECTED_JOB_IDS = {
    "release_expired_unit_holds",
    "send_payment_reminders",
    "generate_monthly_rent_invoices",
    "send_due_date_notifications",
    "escalate_pending_approvals",
    "retry_failed_notifications",
    "cleanup_expired_tokens",
    "delete_old_logs",
    "archive_old_notifications",
    "generate_daily_report",
    "generate_weekly_report",
    "generate_monthly_report",
}


def test_all_required_jobs_are_registered(db):
    statuses = list_job_statuses(db)
    assert set(JOB_DEFINITIONS) == EXPECTED_JOB_IDS
    assert {job["id"] for job in statuses} == EXPECTED_JOB_IDS
    assert all(job["max_retries"] >= 1 for job in statuses)


def test_release_expired_holds_is_idempotent(db):
    expired = Unit(
        block_id=1,
        unit_number="A-101",
        status=UnitStatusEnum.HOLD,
        hold_expires_at=utcnow() - timedelta(minutes=1),
    )
    active = Unit(
        block_id=1,
        unit_number="A-102",
        status=UnitStatusEnum.HOLD,
        hold_expires_at=utcnow() + timedelta(hours=1),
    )
    db.add_all([expired, active])
    db.commit()

    first = release_expired_unit_holds(db)
    second = release_expired_unit_holds(db)
    db.refresh(expired)
    db.refresh(active)

    assert first["released_holds"] == 1
    assert second["released_holds"] == 0
    assert expired.status == UnitStatusEnum.AVAILABLE
    assert active.status == UnitStatusEnum.HOLD


def test_monthly_invoice_generation_prevents_duplicates(db):
    tenant = Tenant(name="Tenant", phone="9999999999")
    db.add(tenant)
    db.flush()
    lease = LeaseAgreement(
        unit_id=1,
        tenant_id=tenant.id,
        start_date=date.today().replace(day=1),
        end_date=date.today() + timedelta(days=365),
        rent_amount=25000,
        security_deposit=50000,
        status=LeaseStatusEnum.ACTIVE,
    )
    db.add(lease)
    db.commit()

    first = generate_monthly_rent_invoices(db)
    second = generate_monthly_rent_invoices(db)

    assert first["invoices_created"] == 1
    assert second["invoices_created"] == 0
    assert db.query(RentalInvoice).filter_by(lease_id=lease.id).count() == 1


def test_payment_reminders_mark_overdue_and_do_not_duplicate(db):
    user = User(
        name="Payment Reminder Owner",
        email="scheduler-payment@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    unit = Unit(
        block_id=1,
        unit_number="PAY-101",
        status=UnitStatusEnum.BOOKED,
    )
    db.add_all([user, unit])
    db.flush()
    customer = Customer(
        name="Payment Reminder Customer",
        assigned_to_id=user.id,
    )
    db.add(customer)
    db.flush()
    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        created_by_id=user.id,
    )
    db.add(booking)
    db.flush()
    payment = Payment(
        booking_id=booking.id,
        amount=12000,
        due_date=scheduler_module._today() - timedelta(days=1),
        status=PaymentStatusEnum.PENDING,
    )
    db.add(payment)
    db.commit()

    first = send_payment_reminders(db)
    second = send_payment_reminders(db)
    db.refresh(payment)

    notifications = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.type == "PAYMENT_OVERDUE",
    ).count()
    assert first["marked_overdue"] == 1
    assert first["reminders_sent"] == 1
    assert second["reminders_sent"] == 0
    assert payment.status == PaymentStatusEnum.OVERDUE
    assert notifications == 1


def test_due_date_notifications_mark_old_invoices_and_notify(db):
    admin = User(
        name="Rental Scheduler Admin",
        email="scheduler-rent@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True,
    )
    tenant = Tenant(name="Rental Scheduler Tenant", phone="8888888888")
    db.add_all([admin, tenant])
    db.flush()
    lease = LeaseAgreement(
        unit_id=1,
        tenant_id=tenant.id,
        start_date=scheduler_module._today() - timedelta(days=30),
        end_date=scheduler_module._today() + timedelta(days=365),
        rent_amount=18000,
        security_deposit=36000,
        status=LeaseStatusEnum.ACTIVE,
    )
    db.add(lease)
    db.flush()
    overdue_invoice = RentalInvoice(
        lease_id=lease.id,
        amount=18000,
        due_date=scheduler_module._today() - timedelta(days=1),
    )
    upcoming_invoice = RentalInvoice(
        lease_id=lease.id,
        amount=18000,
        due_date=scheduler_module._today() + timedelta(days=1),
    )
    db.add_all([overdue_invoice, upcoming_invoice])
    db.commit()

    result = send_due_date_notifications(db)
    db.refresh(overdue_invoice)

    assert result["marked_overdue"] >= 1
    assert result["due_invoices"] == 1
    assert result["notifications_sent"] >= 1
    assert overdue_invoice.status.value == "OVERDUE"
    assert db.query(Notification).filter(
        Notification.user_id == admin.id,
        Notification.type == "RENT_DUE_DATE",
    ).count() == 1


def test_pending_approval_escalation_is_idempotent(db):
    requester = User(
        name="Escalation Requester",
        email="scheduler-requester@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    super_admin = User(
        name="Escalation Admin",
        email="scheduler-escalation@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True,
    )
    db.add_all([requester, super_admin])
    db.flush()
    approval = ApprovalRequest(
        type=ApprovalTypeEnum.REFUND,
        status=ApprovalStatusEnum.PENDING,
        requested_by_id=requester.id,
        level=1,
        payload={"amount": 1000},
        created_at=utcnow() - timedelta(days=2),
    )
    db.add(approval)
    db.commit()

    first = escalate_pending_approvals(db)
    second = escalate_pending_approvals(db)
    db.refresh(approval)

    assert first["escalated"] == 1
    assert second["escalated"] == 0
    assert approval.level == 2
    assigned = db.get(User, approval.assigned_approver_id)
    assert assigned is not None
    assert assigned.role == RoleEnum.SUPER_ADMIN


def test_retry_failed_notifications_uses_delivery_state(db, monkeypatch):
    user = User(
        name="Retry Recipient",
        email="scheduler-retry@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.flush()
    notification = Notification(
        user_id=user.id,
        type="RETRY_TEST",
        category="SYSTEM",
        priority="HIGH",
        message="Retry me",
        delivery_status="FAILED",
        delivery_attempts=1,
        next_retry_at=utcnow() - timedelta(minutes=1),
    )
    db.add(notification)
    db.commit()

    def deliver(_db, target, **_kwargs):
        target.delivery_attempts += 1
        target.delivery_status = "DELIVERED"
        target.next_retry_at = None
        return target

    monkeypatch.setattr(
        scheduler_module,
        "dispatch_existing_notification",
        deliver,
    )
    result = retry_failed_notifications(db)
    db.refresh(notification)

    assert result["retried"] == 1
    assert result["delivered"] == 1
    assert notification.delivery_status == "DELIVERED"


def test_cleanup_expired_auth_artifacts(db):
    user = User(
        name="Expired Token User",
        email="scheduler-tokens@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add_all(
        [
            PasswordResetToken(
                user_id=user.id,
                token="expired-reset-token",
                expires_at=utcnow() - timedelta(days=1),
            ),
            EmailVerificationToken(
                user_id=user.id,
                token="used-verification-token",
                expires_at=utcnow() + timedelta(days=1),
                is_used=True,
            ),
            UserSession(
                user_id=user.id,
                refresh_token="inactive-refresh-token",
                expires_at=utcnow() + timedelta(days=1),
                is_active=False,
            ),
            TokenBlacklist(
                token="old-blacklisted-token",
                blacklisted_at=utcnow() - timedelta(days=30),
            ),
        ]
    )
    db.commit()

    result = cleanup_expired_tokens(db)

    assert result == {
        "password_reset_tokens": 1,
        "email_verification_tokens": 1,
        "sessions": 1,
        "blacklisted_tokens": 1,
    }


def test_old_notifications_are_archived_with_delivery_history(db):
    user = User(
        name="Archive User",
        email="scheduler-archive@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.flush()
    notification = Notification(
        user_id=user.id,
        type="ARCHIVE_TEST",
        category="SYSTEM",
        priority="NORMAL",
        message="Archive me",
        email_subject="Archive subject",
        delivery_status="DELIVERED",
        delivery_attempts=2,
        is_read=True,
        read_at=utcnow() - timedelta(days=100),
        created_at=utcnow() - timedelta(days=100),
    )
    db.add(notification)
    db.commit()
    notification_id = notification.id

    result = archive_old_notifications(db)
    archived = db.query(NotificationArchive).filter(
        NotificationArchive.original_notification_id == notification_id
    ).one()

    assert result["notifications_archived"] == 1
    assert db.get(Notification, notification_id) is None
    assert archived.email_subject == "Archive subject"
    assert archived.delivery_attempts == 2


def test_report_jobs_are_idempotent(db):
    first = [
        generate_daily_report(db),
        generate_weekly_report(db),
        generate_monthly_report(db),
    ]
    second = [
        generate_daily_report(db),
        generate_weekly_report(db),
        generate_monthly_report(db),
    ]

    assert all(result["created"] for result in first)
    assert all(not result["created"] for result in second)
    assert db.query(ScheduledReport).count() == 3


def test_old_audit_and_execution_logs_are_deleted(db):
    list_job_statuses(db)
    audit = AuditLog(
        action="TEST",
        module="SCHEDULER_TEST",
        entity_type="TEST",
        entity_id=1,
        timestamp=utcnow() - timedelta(days=500),
    )
    execution = SchedulerExecution(
        job_id="delete_old_logs",
        status="SUCCESS",
        triggered_by="manual",
        attempt=1,
        started_at=utcnow() - timedelta(days=500),
        finished_at=utcnow() - timedelta(days=500),
    )
    db.add_all([audit, execution])
    db.commit()
    audit_id = audit.id
    execution_id = execution.id

    result = delete_old_logs(db)

    assert result["audit_logs_deleted"] >= 1
    assert result["scheduler_executions_deleted"] >= 1
    assert db.get(AuditLog, audit_id) is None
    assert db.get(SchedulerExecution, execution_id) is None


def test_job_management_state_transitions(db):
    list_job_statuses(db)
    job_id = "delete_old_logs"

    disabled = disable_job(db, job_id)
    assert disabled["enabled"] is False
    assert disabled["status"] == "DISABLED"

    enabled = enable_job(db, job_id)
    assert enabled["enabled"] is True

    paused = pause_job(db, job_id)
    assert paused["paused"] is True
    assert paused["status"] == "PAUSED"

    resumed = resume_job(db, job_id)
    assert resumed["paused"] is False


def test_run_now_queues_unique_one_shot_job(monkeypatch):
    queued = []

    class FakeScheduler:
        running = True
        timezone = timezone.utc

        def add_job(self, *args, **kwargs):
            queued.append((args, kwargs))

    monkeypatch.setattr(scheduler_module, "scheduler", FakeScheduler())

    first = queue_job_now("generate_daily_report")
    second = queue_job_now("generate_daily_report")

    assert first.startswith("run-now:generate_daily_report:")
    assert second.startswith("run-now:generate_daily_report:")
    assert first != second
    assert len(queued) == 2


def test_overlap_lease_is_visible_in_job_status(db):
    list_job_statuses(db)
    state = db.get(SchedulerJob, "generate_daily_report")
    state.running_since = utcnow()
    db.commit()

    status = get_job_status(db, state.id)
    assert status["status"] == "RUNNING"
    assert status["running_since"] is not None


def test_scheduler_admin_api_is_rbac_protected(client, admin_token_headers):
    unauthorized = client.get("/scheduler/jobs")
    assert unauthorized.status_code == 401

    response = client.get("/scheduler/jobs", headers=admin_token_headers)
    assert response.status_code == 200
    assert len(response.json()) == len(EXPECTED_JOB_IDS)


def test_execution_history_and_duplicate_suppression(db, monkeypatch):
    session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=db.get_bind(),
    )
    monkeypatch.setattr(scheduler_module, "SessionLocal", session_factory)
    list_job_statuses(db)
    job_id = "release_expired_unit_holds"
    original = JOB_DEFINITIONS[job_id]
    monkeypatch.setitem(
        JOB_DEFINITIONS,
        job_id,
        JobDefinition(
            original.id,
            original.name,
            original.description,
            original.trigger,
            lambda session: {"processed": 1},
        ),
    )

    assert _execute_job(job_id, "scheduled", 1) == {"processed": 1}
    assert _execute_job(job_id, "scheduled", 1) is None

    executions = (
        db.query(SchedulerExecution)
        .filter(SchedulerExecution.job_id == job_id)
        .order_by(SchedulerExecution.id)
        .all()
    )
    assert [execution.status for execution in executions[-2:]] == [
        "SUCCESS",
        "SKIPPED",
    ]


def test_failed_execution_is_persisted(db, monkeypatch):
    session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=db.get_bind(),
    )
    monkeypatch.setattr(scheduler_module, "SessionLocal", session_factory)
    list_job_statuses(db)
    job_id = "cleanup_expired_tokens"
    original = JOB_DEFINITIONS[job_id]

    def fail(_session):
        raise RuntimeError("expected job failure")

    monkeypatch.setitem(
        JOB_DEFINITIONS,
        job_id,
        JobDefinition(
            original.id,
            original.name,
            original.description,
            original.trigger,
            fail,
        ),
    )

    assert _execute_job(job_id, "manual", 1) is None
    execution = (
        db.query(SchedulerExecution)
        .filter(SchedulerExecution.job_id == job_id)
        .order_by(SchedulerExecution.id.desc())
        .first()
    )
    state = db.get(SchedulerJob, job_id)
    assert execution.status == "FAILED"
    assert "expected job failure" in execution.error
    assert state.consecutive_failures == 1
    assert state.running_since is None


def test_failed_execution_schedules_retry_when_runtime_is_active(
    db,
    monkeypatch,
):
    session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=db.get_bind(),
    )
    monkeypatch.setattr(scheduler_module, "SessionLocal", session_factory)
    list_job_statuses(db)
    job_id = "cleanup_expired_tokens"
    original = JOB_DEFINITIONS[job_id]
    monkeypatch.setitem(
        JOB_DEFINITIONS,
        job_id,
        JobDefinition(
            original.id,
            original.name,
            original.description,
            original.trigger,
            lambda _session: (_ for _ in ()).throw(RuntimeError("retry me")),
        ),
    )
    monkeypatch.setattr(
        scheduler_module,
        "scheduler",
        SimpleNamespace(running=True),
    )
    scheduled = []
    monkeypatch.setattr(
        scheduler_module,
        "_schedule_retry",
        lambda queued_job_id, attempt: scheduled.append(
            (queued_job_id, attempt)
        ),
    )
    monkeypatch.setattr(
        scheduler_module,
        "_notify_job_failure",
        lambda *_args, **_kwargs: None,
    )

    assert _execute_job(job_id, "manual", 1) is None
    assert scheduled == [(job_id, 2)]
