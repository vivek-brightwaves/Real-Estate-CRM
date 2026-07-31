import math
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.users import User
from app.models.system import Notification
from app.schemas.notifications import (
    NotificationOut,
    NotificationPaginated,
    NotificationPreferenceOut,
    NotificationPreferenceUpdate
)
from app.services.notifications import get_user_preferences
from app.core.time import utcnow
from app.schemas.common import CountResponse, MessageResponse
from app.services.audit import log_audit

router = APIRouter()

@router.get("", response_model=NotificationPaginated)
def get_notifications(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if category:
        query = query.filter(Notification.category == category)
    if priority:
        query = query.filter(Notification.priority == priority)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if search:
        query = query.filter(Notification.message.ilike(f"%{search}%"))

    # Sorting
    if sort_by in {"id", "created_at", "priority", "category", "is_read"}:
        sort_column = getattr(Notification, sort_by)
        if order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(Notification.created_at))

    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    ).count()

    items = query.offset((page - 1) * size).limit(size).all()

    return NotificationPaginated(
        items=items,
        total=total,
        page=page,
        size=size,
        unread_count=unread_count,
        pages=math.ceil(total / size) if total else 0,
    )

@router.get("/unread-count", response_model=CountResponse)
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False)
    ).count()
    return {"unread_count": count}

@router.patch("/read-all", response_model=MessageResponse)
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False)
    ).all()

    now = utcnow()
    for n in notifications:
        n.is_read = True
        n.read_at = now

    db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read."}

@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = utcnow()
        db.commit()
        db.refresh(notification)

    return notification

@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    log_audit(
        db,
        current_user.id,
        "NOTIFICATION",
        notification_id,
        "DELETE",
    )
    return {"message": "Notification deleted successfully"}

@router.get("/preferences", response_model=NotificationPreferenceOut)
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_preferences(db, current_user.id)

@router.put("/preferences", response_model=NotificationPreferenceOut)
def update_preferences(prefs: NotificationPreferenceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = get_user_preferences(db, current_user.id)

    existing.email_enabled = prefs.email_enabled
    existing.sms_enabled = prefs.sms_enabled
    existing.whatsapp_enabled = prefs.whatsapp_enabled
    existing.in_app_enabled = prefs.in_app_enabled

    db.commit()
    db.refresh(existing)
    log_audit(
        db,
        current_user.id,
        "NOTIFICATION",
        existing.id,
        "PREFERENCES_UPDATE",
        new_values=prefs.model_dump(),
    )
    return existing
