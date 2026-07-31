from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.api.query import apply_sort, paginate
from app.db.session import get_db
from app.models.system import Message, Task
from app.models.users import RoleEnum, User
from app.schemas.common import MessageResponse
from app.schemas.work import (
    MessageCreate,
    MessageOut,
    MessageUnreadCount,
    StaffOptionOut,
    TaskCreate,
    TaskOut,
    TaskPriority,
    TaskStatus,
    TaskUpdate,
)
from app.services.audit import log_audit
from app.services.notifications import send_notification


STAFF_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.EMPLOYEE,
]
router = APIRouter(dependencies=[Depends(require_roles(STAFF_ROLES))])


def _visible_user_ids(db: Session, current_user: User) -> list[int] | None:
    if current_user.role in {RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN}:
        return None
    if current_user.role == RoleEnum.MANAGER:
        return [
            user_id
            for (user_id,) in db.query(User.id)
            .filter(User.branch_id == current_user.branch_id)
            .all()
        ]
    return [current_user.id]


def _get_staff_user(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.is_active.is_(True),
            User.role.in_(STAFF_ROLES),
        )
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Staff user not found")
    return user


def _verify_assignee(
    db: Session,
    current_user: User,
    assigned_to_id: int,
) -> User:
    assignee = _get_staff_user(db, assigned_to_id)
    visible_ids = _visible_user_ids(db, current_user)
    if visible_ids is not None and assignee.id not in visible_ids:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to assign work to this user",
        )
    return assignee


def _verify_recipient(
    db: Session,
    current_user: User,
    recipient_id: int,
) -> User:
    recipient = _get_staff_user(db, recipient_id)
    if current_user.role in {RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN}:
        return recipient
    if (
        current_user.branch_id is None
        or recipient.branch_id != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Messages can only be sent to staff in your branch",
        )
    return recipient


def _task_query(db: Session, current_user: User):
    query = db.query(Task)
    visible_ids = _visible_user_ids(db, current_user)
    if visible_ids is not None:
        query = query.filter(
            or_(
                Task.assigned_to_id.in_(visible_ids),
                Task.created_by_id == current_user.id,
            )
        )
    return query


def _get_task(db: Session, task_id: int, current_user: User) -> Task:
    task = _task_query(db, current_user).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/work/staff", response_model=list[StaffOptionOut])
def list_visible_staff(
    purpose: Literal["assignment", "message"] = "message",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(
        User.is_active.is_(True),
        User.role.in_(STAFF_ROLES),
    )
    if purpose == "assignment":
        visible_ids = _visible_user_ids(db, current_user)
        if visible_ids is not None:
            query = query.filter(User.id.in_(visible_ids))
    elif current_user.role not in {RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN}:
        query = query.filter(User.branch_id == current_user.branch_id)
    return query.order_by(User.name.asc(), User.id.asc()).all()


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(
    response: Response,
    task_status: TaskStatus | None = Query(None, alias="status"),
    priority: TaskPriority | None = None,
    assigned_to_id: int | None = Query(None, gt=0),
    search: str | None = Query(None, min_length=1, max_length=100),
    sort_by: str = "due_date",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _task_query(db, current_user)
    if task_status:
        query = query.filter(Task.status == task_status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(pattern),
                Task.description.ilike(pattern),
            )
        )
    query = apply_sort(
        query,
        model=Task,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={
            "id",
            "title",
            "status",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
        },
        tie_breaker=Task.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items


@router.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assigned_to_id = payload.assigned_to_id or current_user.id
    _verify_assignee(db, current_user, assigned_to_id)
    task = Task(
        **payload.model_dump(exclude={"assigned_to_id"}),
        assigned_to_id=assigned_to_id,
        created_by_id=current_user.id,
    )
    if task.status == "COMPLETED":
        task.completed_at = datetime.now(timezone.utc)
    db.add(task)
    db.commit()
    db.refresh(task)
    log_audit(
        db,
        current_user.id,
        "TASK",
        task.id,
        "CREATE",
        new_values={"title": task.title, "assigned_to_id": assigned_to_id},
    )
    if assigned_to_id != current_user.id:
        send_notification(
            db,
            assigned_to_id,
            "TASK_ASSIGNED",
            f'New task assigned: "{task.title}"',
            category="TASKS",
        )
    return task


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_task(db, task_id, current_user)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task(db, task_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "assigned_to_id" in updates and updates["assigned_to_id"] is not None:
        _verify_assignee(db, current_user, updates["assigned_to_id"])
    old_values = {
        key: (
            getattr(task, key).isoformat()
            if hasattr(getattr(task, key), "isoformat")
            else getattr(task, key)
        )
        for key in updates
    }
    for key, value in updates.items():
        setattr(task, key, value)
    if "status" in updates:
        task.completed_at = (
            datetime.now(timezone.utc)
            if task.status == "COMPLETED"
            else None
        )
    db.commit()
    db.refresh(task)
    log_audit(
        db,
        current_user.id,
        "TASK",
        task.id,
        "UPDATE",
        old_values=old_values,
        new_values={
            key: value.isoformat() if hasattr(value, "isoformat") else value
            for key, value in updates.items()
        },
    )
    return task


@router.delete("/tasks/{task_id}", response_model=MessageResponse)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task(db, task_id, current_user)
    if (
        current_user.role not in {RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER}
        and task.created_by_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Only the task creator can delete it")
    title = task.title
    db.delete(task)
    db.commit()
    log_audit(
        db,
        current_user.id,
        "TASK",
        task_id,
        "DELETE",
        old_values={"title": title},
    )
    return {"message": "Task deleted successfully"}


def _message_query(
    db: Session,
    current_user: User,
    folder: Literal["inbox", "sent"],
):
    query = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.recipient),
    )
    if folder == "sent":
        return query.filter(
            Message.sender_id == current_user.id,
            Message.sender_deleted.is_(False),
        )
    return query.filter(
        Message.recipient_id == current_user.id,
        Message.recipient_deleted.is_(False),
    )


def _get_message(db: Session, message_id: int, current_user: User) -> Message:
    message = (
        db.query(Message)
        .options(joinedload(Message.sender), joinedload(Message.recipient))
        .filter(
            Message.id == message_id,
            or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id,
            ),
        )
        .first()
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if (
        message.sender_id == current_user.id
        and message.sender_deleted
    ) or (
        message.recipient_id == current_user.id
        and message.recipient_deleted
    ):
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.get("/messages", response_model=list[MessageOut])
def list_messages(
    response: Response,
    folder: Literal["inbox", "sent"] = "inbox",
    unread_only: bool = False,
    search: str | None = Query(None, min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _message_query(db, current_user, folder)
    if unread_only and folder == "inbox":
        query = query.filter(Message.is_read.is_(False))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Message.subject.ilike(pattern),
                Message.body.ilike(pattern),
            )
        )
    query = query.order_by(Message.created_at.desc(), Message.id.desc())
    items, _ = paginate(query, page=page, size=size, response=response)
    return items


@router.get("/messages/unread-count", response_model=MessageUnreadCount)
def unread_message_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Message)
        .filter(
            Message.recipient_id == current_user.id,
            Message.is_read.is_(False),
            Message.recipient_deleted.is_(False),
        )
        .count()
    )
    return {"count": count}


@router.post(
    "/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send a message to yourself")
    recipient = _verify_recipient(db, current_user, payload.recipient_id)
    message = Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    message.sender = current_user
    message.recipient = recipient
    log_audit(
        db,
        current_user.id,
        "MESSAGE",
        message.id,
        "CREATE",
        new_values={"recipient_id": recipient.id, "subject": message.subject},
    )
    send_notification(
        db,
        recipient.id,
        "MESSAGE_RECEIVED",
        f"New message from {current_user.name}: {message.subject}",
        category="MESSAGES",
    )
    return message


@router.get("/messages/{message_id}", response_model=MessageOut)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_message(db, message_id, current_user)


@router.patch("/messages/{message_id}/read", response_model=MessageOut)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = _get_message(db, message_id, current_user)
    if message.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can mark it read")
    if not message.is_read:
        message.is_read = True
        message.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(message)
    return message


@router.delete("/messages/{message_id}", response_model=MessageResponse)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = _get_message(db, message_id, current_user)
    if message.sender_id == current_user.id:
        message.sender_deleted = True
    if message.recipient_id == current_user.id:
        message.recipient_deleted = True
    db.commit()
    log_audit(db, current_user.id, "MESSAGE", message.id, "DELETE")
    return {"message": "Message deleted successfully"}
