from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.system import ApprovalTypeEnum, ApprovalStatusEnum

class ApprovalRequestCreate(BaseModel):
    type: ApprovalTypeEnum
    payload: Dict[str, Any]

class ApprovalRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: ApprovalTypeEnum
    status: ApprovalStatusEnum
    requested_by_id: int
    approved_by_id: Optional[int] = None
    payload: Dict[str, Any]
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    action: str
    module: Optional[str] = None
    entity_type: str
    entity_id: int
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
