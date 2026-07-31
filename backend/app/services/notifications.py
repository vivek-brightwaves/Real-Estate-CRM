"""Notification persistence and delivery.

External channels are intentionally adapter-friendly. Email uses the configured
SMTP server; SMS and WhatsApp remain provider hooks until credentials are
configured. Delivery failures are persisted for the scheduler retry job.
"""

from __future__ import annotations

import json
import logging
import smtplib
from datetime import timedelta
from email.mime.text import MIMEText
from typing import Any

from sqlalchemy.orm import Session

from app.models.system import Notification, NotificationPreference
from app.models.users import Company, User
from app.core.time import utcnow

logger = logging.getLogger(__name__)


def get_user_preferences(db: Session, user_id: int) -> NotificationPreference:
    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )
    if prefs:
        return prefs

    prefs = NotificationPreference(
        user_id=user_id,
        email_enabled=True,
        sms_enabled=True,
        whatsapp_enabled=False,
        in_app_enabled=True,
    )
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return prefs


def _company_settings(company: Company | None) -> dict[str, Any]:
    if company is None:
        return {}
    raw = company.settings_json
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            logger.warning("Company notification settings contain invalid JSON")
    return {}


def _dispatch_external(
    *,
    user: User,
    prefs: NotificationPreference,
    settings: dict[str, Any],
    subject: str | None,
    message: str,
) -> None:
    """Dispatch enabled external channels, raising when a real adapter fails."""

    email_settings = settings.get("email", {})
    if (
        prefs.email_enabled
        and email_settings.get("enabled")
        and user.email
        and subject
    ):
        msg = MIMEText(message)
        msg["Subject"] = subject
        msg["From"] = email_settings.get("sender_email", "noreply@crm.local")
        msg["To"] = user.email
        timeout = float(email_settings.get("timeout_seconds", 10))
        with smtplib.SMTP(
            email_settings.get("host", "localhost"),
            int(email_settings.get("port", 25)),
            timeout=timeout,
        ) as server:
            if email_settings.get("use_tls"):
                server.starttls()
            if email_settings.get("username"):
                server.login(
                    email_settings["username"],
                    email_settings.get("password", ""),
                )
            server.send_message(msg)

    messaging = settings.get("messaging", {})
    if prefs.sms_enabled and messaging.get("enabled") and user.phone:
        # Provider integration boundary. A configured provider can replace this
        # function without changing persistence or retry semantics.
        logger.info(
            "SMS delivery accepted",
            extra={"user_id": user.id, "provider": messaging.get("provider", "mock")},
        )

    if prefs.whatsapp_enabled and messaging.get("whatsapp_enabled") and user.phone:
        logger.info("WhatsApp delivery accepted", extra={"user_id": user.id})


def dispatch_existing_notification(
    db: Session,
    notification: Notification,
    *,
    retry_delay_seconds: int = 300,
) -> Notification:
    """Attempt external delivery and persist retry-safe delivery state."""

    prefs = get_user_preferences(db, notification.user_id)
    user = db.query(User).filter(User.id == notification.user_id).first()
    company = db.query(Company).first()

    notification.delivery_attempts = (notification.delivery_attempts or 0) + 1
    if user is None:
        notification.delivery_status = "FAILED"
        notification.last_delivery_error = "Notification recipient no longer exists"
        notification.next_retry_at = utcnow() + timedelta(
            seconds=retry_delay_seconds
        )
        db.commit()
        return notification

    try:
        _dispatch_external(
            user=user,
            prefs=prefs,
            settings=_company_settings(company),
            subject=notification.email_subject,
            message=notification.message,
        )
        notification.delivery_status = "DELIVERED"
        notification.last_delivery_error = None
        notification.next_retry_at = None
    except Exception as exc:
        notification.delivery_status = "FAILED"
        notification.last_delivery_error = str(exc)[:1000]
        notification.next_retry_at = utcnow() + timedelta(
            seconds=retry_delay_seconds
        )
        logger.exception(
            "Notification delivery failed",
            extra={"notification_id": notification.id, "user_id": notification.user_id},
        )

    db.commit()
    db.refresh(notification)
    return notification


def send_notification(
    db: Session,
    user_id: int,
    notif_type: str,
    message: str,
    email_subject: str | None = None,
    category: str = "GENERAL",
    priority: str = "NORMAL",
) -> Notification:
    """Persist a notification once, then dispatch it with retry tracking."""

    # Preference creation also validates that a recipient preference row exists.
    get_user_preferences(db, user_id)
    notification = Notification(
        user_id=user_id,
        type=notif_type,
        category=category,
        priority=priority,
        message=message,
        email_subject=email_subject,
        delivery_status="PENDING",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return dispatch_existing_notification(db, notification)
