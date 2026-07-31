"""Notification API, preferences, delivery adapters, and retry-state tests."""

import json

from app.core.security import get_password_hash
from app.models.system import Notification, NotificationPreference
from app.models.users import Company, RoleEnum, User
from app.services.notifications import (
    _company_settings,
    dispatch_existing_notification,
    get_user_preferences,
    send_notification,
)


def _notification_user(db):
    user = User(
        name="Notification Owner",
        email="notification-owner@example.com",
        phone="9876543266",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


def _headers(client, user):
    login = client.post(
        "/auth/login",
        data={"username": user.email, "password": "StrongPass1!"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_notification_filters_read_delete_and_preferences(client, test_db):
    user = _notification_user(test_db)
    headers = _headers(client, user)
    test_db.add_all(
        [
            Notification(
                user_id=user.id,
                type="PAYMENT_DUE",
                category="PAYMENTS",
                priority="HIGH",
                message="Payment is due",
            ),
            Notification(
                user_id=user.id,
                type="GENERAL",
                category="GENERAL",
                priority="NORMAL",
                message="General update",
                is_read=True,
            ),
        ]
    )
    test_db.commit()

    listed = client.get(
        "/notifications?category=PAYMENTS&priority=HIGH&is_read=false"
        "&search=due&sort_by=priority&order=asc&page=1&size=1",
        headers=headers,
    )
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["unread_count"] == 1
    notification_id = listed.json()["items"][0]["id"]
    fallback_sort = client.get(
        "/notifications?sort_by=not_allowed", headers=headers
    )
    assert fallback_sort.status_code == 200

    assert client.get(
        "/notifications/unread-count", headers=headers
    ).json()["unread_count"] == 1
    read = client.patch(
        f"/notifications/{notification_id}/read", headers=headers
    )
    assert read.status_code == 200
    assert read.json()["is_read"] is True
    assert client.patch(
        f"/notifications/{notification_id}/read", headers=headers
    ).status_code == 200
    assert client.patch(
        "/notifications/99999/read", headers=headers
    ).status_code == 404

    all_read = client.patch("/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
    assert "Marked 0" in all_read.json()["message"]

    preferences = client.get("/notifications/preferences", headers=headers)
    assert preferences.status_code == 200
    updated = client.put(
        "/notifications/preferences",
        json={
            "email_enabled": False,
            "sms_enabled": False,
            "whatsapp_enabled": True,
            "in_app_enabled": True,
        },
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["whatsapp_enabled"] is True

    deleted = client.delete(
        f"/notifications/{notification_id}", headers=headers
    )
    assert deleted.status_code == 200
    assert client.delete(
        f"/notifications/{notification_id}", headers=headers
    ).status_code == 404


def test_notification_delivery_success_failure_and_missing_recipient(
    test_db, monkeypatch
):
    user = _notification_user(test_db)
    company = Company(
        name="Delivery Company",
        settings_json=json.dumps(
            {
                "email": {
                    "enabled": True,
                    "host": "smtp.example.com",
                    "port": 587,
                    "timeout_seconds": 2,
                    "sender_email": "crm@example.com",
                    "use_tls": True,
                    "username": "mailer",
                    "password": "secret",
                },
                "messaging": {
                    "enabled": True,
                    "provider": "test-provider",
                    "whatsapp_enabled": True,
                },
            }
        ),
    )
    test_db.add(company)
    prefs = get_user_preferences(test_db, user.id)
    prefs.whatsapp_enabled = True
    test_db.commit()

    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port, timeout))

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self):
            calls.append(("tls",))

        def login(self, username, password):
            calls.append(("login", username, password))

        def send_message(self, message):
            calls.append(("send", message["To"], message["Subject"]))

    monkeypatch.setattr("app.services.notifications.smtplib.SMTP", FakeSMTP)
    delivered = send_notification(
        test_db,
        user.id,
        "PAYMENT_DUE",
        "A payment is due",
        email_subject="Payment reminder",
        category="PAYMENTS",
        priority="HIGH",
    )
    assert delivered.delivery_status == "DELIVERED"
    assert delivered.delivery_attempts == 1
    assert ("tls",) in calls
    assert any(call[0] == "send" for call in calls)

    class FailingSMTP(FakeSMTP):
        def send_message(self, message):
            raise OSError("SMTP unavailable")

    monkeypatch.setattr("app.services.notifications.smtplib.SMTP", FailingSMTP)
    failed = Notification(
        user_id=user.id,
        type="FAILURE",
        category="GENERAL",
        priority="NORMAL",
        message="Delivery should fail",
        email_subject="Failure",
        delivery_status="PENDING",
    )
    test_db.add(failed)
    test_db.commit()
    dispatch_existing_notification(test_db, failed, retry_delay_seconds=10)
    assert failed.delivery_status == "FAILED"
    assert failed.delivery_attempts == 1
    assert failed.next_retry_at is not None
    assert "SMTP unavailable" in failed.last_delivery_error

    missing = Notification(
        user_id=99999,
        type="MISSING",
        category="GENERAL",
        priority="NORMAL",
        message="No recipient",
        delivery_status="PENDING",
    )
    # SQLite foreign-key checks are disabled in the in-memory test engine.
    test_db.add(missing)
    test_db.commit()
    dispatch_existing_notification(test_db, missing, retry_delay_seconds=10)
    assert missing.delivery_status == "FAILED"
    assert "no longer exists" in missing.last_delivery_error


def test_company_settings_parsing_and_existing_preferences(test_db):
    assert _company_settings(None) == {}
    company = Company(name="Settings Parser", settings_json='{"email": {}}')
    assert _company_settings(company) == {"email": {}}
    company.settings_json = "{invalid"
    assert _company_settings(company) == {}
    company.settings_json = "[]"
    assert _company_settings(company) == {}
    company.settings_json = {"messaging": {"enabled": False}}
    assert _company_settings(company)["messaging"]["enabled"] is False

    user = _notification_user(test_db)
    prefs = NotificationPreference(user_id=user.id, email_enabled=False)
    test_db.add(prefs)
    test_db.commit()
    assert get_user_preferences(test_db, user.id).id == prefs.id
