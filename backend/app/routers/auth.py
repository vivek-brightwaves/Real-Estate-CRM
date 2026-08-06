import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.db.session import get_db
from app.core import security
from app.core.time import utcnow
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.auth import LoginHistory, UserSession, PasswordResetToken, EmailVerificationToken
from app.models.system import TokenBlacklist
from app.services.audit import log_audit

from app.schemas.auth import (
    Token, RefreshTokenRequest, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest,
    EmailVerificationRequest, LoginHistoryOut
)
from app.schemas.users import UserOut
from app.schemas.common import MessageResponse

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
DUMMY_PASSWORD_HASH = security.get_password_hash("InvalidAccount1!")


def _utcnow() -> datetime:
    return utcnow()

def record_login_attempt(db: Session, user_id: int, request: Request, status_str: str):
    history = LoginHistory(
        user_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=status_str
    )
    db.add(history)
    db.commit()

@router.post("/login", response_model=Token)
def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember: bool = Query(False)
):
    normalized_email = form_data.username.strip().lower()
    if len(normalized_email) > 254:
        security.verify_password(form_data.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        security.verify_password(form_data.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_locked:
        if user.locked_until and user.locked_until > _utcnow():
            record_login_attempt(db, user.id, request, "LOCKED")
            raise HTTPException(status_code=403, detail="Account is locked. Try again later.")
        else:
            user.is_locked = False
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()

    if not security.verify_password(form_data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.is_locked = True
            user.locked_until = _utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        db.commit()
        record_login_attempt(db, user.id, request, "FAILED")
        log_audit(db, user.id, "AUTH", user.id, "FAILED_LOGIN", new_values={"reason": "incorrect_password"}, ip_address=request.client.host if request.client else None, user_agent=request.headers.get("user-agent"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        record_login_attempt(db, user.id, request, "FAILED_INACTIVE")
        raise HTTPException(status_code=403, detail="Inactive user")

    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    db.commit()

    record_login_attempt(db, user.id, request, "SUCCESS")

    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)

    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=_utcnow() + timedelta(days=7)
    )
    db.add(session)
    db.commit()

    log_audit(db, user.id, "AUTH", user.id, "LOGIN", new_values={"session_id": session.id}, ip_address=request.client.host if request.client else None, user_agent=request.headers.get("user-agent"))

    # Set access token and refresh token in secure HttpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=3600 if remember else None,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 3600 if remember else None,
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}

@router.post("/refresh", response_model=Token)
def refresh_token(
    request: RefreshTokenRequest,
    req: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    refresh_token = request.refresh_token or req.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    is_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == refresh_token).first()
    if is_blacklisted:
        raise HTTPException(status_code=401, detail="Token blacklisted")

    db_session = db.query(UserSession).filter(
        UserSession.refresh_token == refresh_token,
        UserSession.is_active.is_(True),
        UserSession.expires_at > _utcnow()
    ).first()

    if not db_session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    try:
        payload = security.jwt.decode(refresh_token, security.settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active or user.is_locked:
            raise HTTPException(status_code=401, detail="User not available")

        # Invalidate old session and token
        db_session.is_active = False
        db.add(TokenBlacklist(token=refresh_token))

        access_token = security.create_access_token(subject=user.id)
        new_refresh_token = security.create_refresh_token(subject=user.id)

        new_session = UserSession(
            user_id=user.id,
            refresh_token=new_refresh_token,
            device_info=request.device_info or req.headers.get("user-agent"),
            ip_address=req.client.host if req.client else None,
            expires_at=_utcnow() + timedelta(days=7)
        )
        db.add(new_session)
        db.commit()

        # Set new cookies on response
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
            max_age=3600 if request.remember else None,
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
            max_age=7 * 24 * 3600 if request.remember else None,
        )

        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer", "user": user}
    except (security.JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: RefreshTokenRequest,
    http_request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    refresh_token = request.refresh_token or http_request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Invalid session")

    db_session = db.query(UserSession).filter(
        UserSession.refresh_token == refresh_token,
        UserSession.user_id == current_user.id
    ).first()
    if db_session is None:
        raise HTTPException(status_code=400, detail="Invalid session")

    db_session.is_active = False

    is_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == refresh_token).first()
    if not is_blacklisted:
        db.add(TokenBlacklist(token=refresh_token))
    db.commit()
    record_login_attempt(db, current_user.id, http_request, "LOGOUT")
    log_audit(db, current_user.id, "AUTH", current_user.id, "LOGOUT")

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Successfully logged out"}

@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active.is_(True),
    ).all()
    for s in sessions:
        s.is_active = False
        if not db.query(TokenBlacklist.id).filter(
            TokenBlacklist.token == s.refresh_token
        ).first():
            db.add(TokenBlacklist(token=s.refresh_token))
    db.commit()
    record_login_attempt(db, current_user.id, request, "LOGOUT")
    log_audit(db, current_user.id, "AUTH", current_user.id, "LOGOUT_ALL")

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Successfully logged out of all devices"}

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        return {"message": "If the email is registered, a password reset link has been sent."}

    token = str(uuid.uuid4())
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=_utcnow() + timedelta(hours=1)
    )
    db.add(reset_token)
    db.commit()
    logger.info("Password reset notification queued", extra={"user_id": user.id})
    return {"message": "If the email is registered, a password reset link has been sent."}

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token,
        PasswordResetToken.is_used.is_(False),
        PasswordResetToken.expires_at > _utcnow()
    ).first()
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not security.validate_password_strength(request.new_password):
        raise HTTPException(status_code=400, detail="Password does not meet strength requirements")

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if security.verify_password(request.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password cannot be the same as old password")

    user.password_hash = security.get_password_hash(request.new_password)
    reset_record.is_used = True

    # Invalidate sessions
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active.is_(True),
    ).all()
    for s in sessions:
        s.is_active = False
        db.add(TokenBlacklist(token=s.refresh_token))

    db.commit()
    log_audit(db, user.id, "AUTH", user.id, "PASSWORD_RESET", new_values={"method": "token"})
    return {"message": "Password reset successfully"}

@router.post("/change-password", response_model=MessageResponse)
def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not security.verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    if not security.validate_password_strength(request.new_password):
        raise HTTPException(status_code=400, detail="Password does not meet strength requirements")

    if request.old_password == request.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as old password")

    current_user.password_hash = security.get_password_hash(request.new_password)
    current_user.must_change_password = False

    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active.is_(True),
    ).all()
    for session in sessions:
        session.is_active = False
        if not db.query(TokenBlacklist.id).filter(
            TokenBlacklist.token == session.refresh_token
        ).first():
            db.add(TokenBlacklist(token=session.refresh_token))
    db.commit()
    log_audit(db, current_user.id, "AUTH", current_user.id, "PASSWORD_CHANGE")
    return {"message": "Password changed successfully"}

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(request: EmailVerificationRequest, db: Session = Depends(get_db)):
    verify_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == request.token,
        EmailVerificationToken.is_used.is_(False),
        EmailVerificationToken.expires_at > _utcnow()
    ).first()
    if not verify_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user = db.query(User).filter(User.id == verify_record.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token",
        )
    user.is_email_verified = True
    verify_record.is_used = True
    db.commit()
    log_audit(db, user.id, "AUTH", user.id, "EMAIL_VERIFIED")
    return {"message": "Email verified successfully"}

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_email_verified:
        return {"message": "Email is already verified"}

    token = str(uuid.uuid4())
    verify_token = EmailVerificationToken(
        user_id=current_user.id,
        token=token,
        expires_at=_utcnow() + timedelta(hours=24)
    )
    db.add(verify_token)
    db.commit()
    logger.info(
        "Email verification notification queued",
        extra={"user_id": current_user.id},
    )
    return {"message": "Verification email sent"}

@router.post(
    "/unlock-account/{user_id}",
    response_model=MessageResponse,
    dependencies=[
        Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]))
    ],
)
def unlock_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if (
        user.role == RoleEnum.SUPER_ADMIN
        and current_user.role != RoleEnum.SUPER_ADMIN
    ):
        raise HTTPException(
            status_code=403,
            detail="Only a super administrator can unlock this account",
        )

    user.is_locked = False
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    log_audit(
        db,
        current_user.id,
        "AUTH",
        user.id,
        "ACCOUNT_UNLOCKED",
    )
    return {"message": "Account unlocked successfully"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/history", response_model=list[LoginHistoryOut])
def get_login_history(
    response: Response,
    login_status: str | None = Query(None, alias="status", max_length=50),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LoginHistory).filter(
        LoginHistory.user_id == current_user.id
    )
    if login_status:
        query = query.filter(LoginHistory.status == login_status)
    total = query.count()
    history = (
        query.order_by(LoginHistory.attempt_time.desc(), LoginHistory.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)
    return history
