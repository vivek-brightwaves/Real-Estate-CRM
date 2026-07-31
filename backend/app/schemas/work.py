from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


TaskStatus = Literal["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    assigned_to_id: int | None = Field(None, gt=0)
    status: TaskStatus = "PENDING"
    priority: TaskPriority = "MEDIUM"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    assigned_to_id: int | None = Field(None, gt=0)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_to_id: int | None
    created_by_id: int | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None


class MessageCreate(BaseModel):
    recipient_id: int = Field(gt=0)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=10000)

    @model_validator(mode="after")
    def normalize_content(self):
        self.subject = self.subject.strip()
        self.body = self.body.strip()
        if not self.subject or not self.body:
            raise ValueError("subject and body cannot contain only whitespace")
        return self


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    recipient_id: int
    subject: str
    body: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    sender_name: str
    recipient_name: str


class MessageUnreadCount(BaseModel):
    count: int


class StaffOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
