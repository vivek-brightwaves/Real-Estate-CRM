"""Authentication security, token lifecycle, and recovery tests."""

from datetime import timedelta

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.core.time import utcnow
from app.models.auth import (
    EmailVerificationToken,
    LoginHistory,
    PasswordResetToken,
    UserSession,
)
from app.models.system import TokenBlacklist
from app.models.users import RoleEnum, User


def _user(db, *, email: str, role=RoleEnum.EMPLOYEE, **overrides):
    values = {
        "name": "Authentication User",
        "email": email,
        "password_hash": get_password_hash("StrongPass1!"),
        "role": role,
        "is_active": True,
    }
    values.update(overrides)
    user = User(**values)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, email: str, password: str = "StrongPass1!"):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"user-agent": "pytest-browser"},
    )


def test_login_failures_inactive_and_expired_lock_recovery(client, test_db):
    assert _login(client, "unknown@example.com").status_code == 401
    assert client.post(
        "/auth/login",
        data={"username": "x" * 255, "password": "StrongPass1!"},
    ).status_code == 401

    inactive = _user(
        test_db,
        email="inactive@example.com",
        is_active=False,
    )
    assert _login(client, inactive.email).status_code == 403

    recovered = _user(
        test_db,
        email="recovered@example.com",
        is_locked=True,
        failed_login_attempts=5,
        locked_until=utcnow() - timedelta(minutes=1),
    )
    response = _login(client, recovered.email)
    assert response.status_code == 200
    test_db.refresh(recovered)
    assert recovered.is_locked is False
    assert recovered.failed_login_attempts == 0

    history = client.get(
        "/auth/history?status=SUCCESS&page=1&size=1",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    )
    assert history.status_code == 200
    assert history.headers["x-total-count"] == "1"
    assert history.json()[0]["status"] == "SUCCESS"


def test_refresh_logout_and_logout_all_session_lifecycle(client, test_db):
    user = _user(test_db, email="sessions@example.com")
    login = _login(client, user.email)
    tokens = login.json()
    access_headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    assert client.post(
        "/auth/refresh",
        json={"refresh_token": "x" * 20},
    ).status_code == 401

    refreshed = client.post(
        "/auth/refresh",
        json={
            "refresh_token": tokens["refresh_token"],
            "device_info": "pytest-device",
        },
    )
    assert refreshed.status_code == 200
    rotated = refreshed.json()

    assert client.post(
        "/auth/logout",
        json={"refresh_token": "y" * 20},
        headers=access_headers,
    ).status_code == 400
    logout = client.post(
        "/auth/logout",
        json={"refresh_token": rotated["refresh_token"]},
        headers={"Authorization": f"Bearer {rotated['access_token']}"},
    )
    assert logout.status_code == 200
    assert test_db.query(UserSession).filter(
        UserSession.refresh_token == rotated["refresh_token"],
        UserSession.is_active.is_(False),
    ).count() == 1
    assert test_db.query(LoginHistory).filter(
        LoginHistory.user_id == user.id,
        LoginHistory.status == "LOGOUT",
    ).count() == 1
    assert client.post(
        "/auth/refresh",
        json={"refresh_token": rotated["refresh_token"]},
    ).status_code == 401

    second = _login(client, user.email).json()
    third = _login(client, user.email).json()
    logout_all = client.post(
        "/auth/logout-all",
        headers={"Authorization": f"Bearer {third['access_token']}"},
    )
    assert logout_all.status_code == 200
    assert test_db.query(LoginHistory).filter(
        LoginHistory.user_id == user.id,
        LoginHistory.status == "LOGOUT",
    ).count() == 2
    assert test_db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active.is_(True),
    ).count() == 0
    assert client.post(
        "/auth/refresh",
        json={"refresh_token": second["refresh_token"]},
    ).status_code == 401


def test_password_reset_change_and_email_verification(client, test_db):
    user = _user(test_db, email="recovery@example.com")
    assert client.post(
        "/auth/forgot-password",
        json={"email": "missing@example.com"},
    ).status_code == 200
    forgot = client.post(
        "/auth/forgot-password",
        json={"email": user.email},
    )
    assert forgot.status_code == 200
    reset = test_db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).one()

    assert client.post(
        "/auth/reset-password",
        json={"token": "z" * 20, "new_password": "ChangedPass2!"},
    ).status_code == 400
    assert client.post(
        "/auth/reset-password",
        json={"token": reset.token, "new_password": "StrongPass1!"},
    ).status_code == 400
    changed = client.post(
        "/auth/reset-password",
        json={"token": reset.token, "new_password": "ChangedPass2!"},
    )
    assert changed.status_code == 200
    assert _login(client, user.email, "ChangedPass2!").status_code == 200
    assert client.post(
        "/auth/reset-password",
        json={"token": reset.token, "new_password": "AnotherPass3!"},
    ).status_code == 400

    login = _login(client, user.email, "ChangedPass2!").json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.post(
        "/auth/change-password",
        json={"old_password": "WrongPass1!", "new_password": "NextPass3!"},
        headers=headers,
    ).status_code == 400
    assert client.post(
        "/auth/change-password",
        json={"old_password": "ChangedPass2!", "new_password": "ChangedPass2!"},
        headers=headers,
    ).status_code == 400
    password_change = client.post(
        "/auth/change-password",
        json={"old_password": "ChangedPass2!", "new_password": "NextPass3!"},
        headers=headers,
    )
    assert password_change.status_code == 200
    assert client.post(
        "/auth/refresh",
        json={"refresh_token": login["refresh_token"]},
    ).status_code == 401

    assert client.post(
        "/auth/verify-email",
        json={"token": "v" * 20},
    ).status_code == 400
    verify_record = EmailVerificationToken(
        user_id=user.id,
        token="verify-token-" + "v" * 20,
        expires_at=utcnow() + timedelta(hours=1),
    )
    test_db.add(verify_record)
    test_db.commit()
    verified = client.post(
        "/auth/verify-email",
        json={"token": verify_record.token},
    )
    assert verified.status_code == 200
    test_db.refresh(user)
    assert user.is_email_verified is True

    fresh_login = _login(client, user.email, "NextPass3!").json()
    fresh_headers = {
        "Authorization": f"Bearer {fresh_login['access_token']}"
    }
    already = client.post(
        "/auth/resend-verification",
        headers=fresh_headers,
    )
    assert already.status_code == 200
    assert "already" in already.json()["message"].lower()


def test_email_resend_unlock_and_bearer_rejection(
    client, test_db, admin_token_headers
):
    user = _user(
        test_db,
        email="locked-user@example.com",
        is_locked=True,
        failed_login_attempts=5,
        locked_until=utcnow() + timedelta(minutes=20),
    )
    unlocked = client.post(
        f"/auth/unlock-account/{user.id}",
        headers=admin_token_headers,
    )
    assert unlocked.status_code == 200
    assert client.post(
        "/auth/unlock-account/99999",
        headers=admin_token_headers,
    ).status_code == 404

    login = _login(client, user.email).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    resend = client.post("/auth/resend-verification", headers=headers)
    assert resend.status_code == 200
    assert test_db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id
    ).count() == 1

    refresh_as_bearer = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {login['refresh_token']}"},
    )
    assert refresh_as_bearer.status_code == 401
    test_db.add(TokenBlacklist(token=login["access_token"]))
    test_db.commit()
    assert client.get("/auth/me", headers=headers).status_code == 401
    assert client.get(
        "/auth/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    ).status_code == 401


def test_security_helpers_reject_oversized_and_protect_claims():
    assert validate_password_strength("StrongPass1!") is True
    for weak in (
        "short",
        "alllowercase1!",
        "ALLUPPERCASE1!",
        "NoNumber!",
        "NoSpecial1",
        "é" * 80 + "Aa1!",
    ):
        assert validate_password_strength(weak) is False

    oversized = "a" * 73
    assert verify_password(oversized, get_password_hash("StrongPass1!")) is False
    try:
        get_password_hash(oversized)
    except ValueError as exc:
        assert "72 UTF-8 bytes" in str(exc)
    else:
        raise AssertionError("oversized bcrypt password was accepted")

    access = create_access_token(
        "42",
        additional_claims={"sub": "999", "type": "refresh", "scope": "crm"},
    )
    refresh = create_refresh_token(
        "42",
        additional_claims={"sub": "999", "type": "access", "scope": "crm"},
    )
    import jwt
    from app.core.config import settings
    from app.core.security import ALGORITHM

    access_payload = jwt.decode(access, settings.SECRET_KEY, algorithms=[ALGORITHM])
    refresh_payload = jwt.decode(
        refresh, settings.SECRET_KEY, algorithms=[ALGORITHM]
    )
    assert access_payload["sub"] == "42"
    assert access_payload["type"] == "access"
    assert refresh_payload["sub"] == "42"
    assert refresh_payload["type"] == "refresh"
    assert access_payload["scope"] == refresh_payload["scope"] == "crm"
