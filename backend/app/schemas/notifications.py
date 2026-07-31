from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationPreferenceBase(BaseModel):
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    in_app_enabled: bool

class NotificationPreferenceOut(NotificationPreferenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class NotificationPreferenceUpdate(NotificationPreferenceBase):
    pass

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    category: str
    priority: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationPaginated(BaseModel):
    items: List[NotificationOut]
    total: int
    page: int
    size: int
    unread_count: int
    pages: int = 0
