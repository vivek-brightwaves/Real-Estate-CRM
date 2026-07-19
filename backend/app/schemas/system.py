from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.system import ApprovalTypeEnum, ApprovalStatusEnum, AuditActionEnum

class ApprovalRequestCreate(BaseModel):
    type: ApprovalTypeEnum
    payload: Dict[str, Any]

class ApprovalRequestOut(BaseModel):
    id: int
    type: ApprovalTypeEnum
    status: ApprovalStatusEnum
    requested_by_id: int
    approved_by_id: Optional[int] = None
    payload: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: int
    changes: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True
