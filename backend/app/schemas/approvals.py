import json
import math
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.system import ApprovalTypeEnum, ApprovalStatusEnum

class ApprovalRequestCreate(BaseModel):
    type: ApprovalTypeEnum
    payload: Dict[str, Any] = Field(min_length=1)
    assigned_approver_id: Optional[int] = None
    remarks: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_payload(self):
        try:
            encoded = json.dumps(self.payload, default=str)
        except (TypeError, ValueError) as exc:
            raise ValueError("payload must be JSON serializable") from exc
        if len(encoded.encode("utf-8")) > 20_000:
            raise ValueError("payload exceeds the 20 KB limit")

        if self.type in {
            ApprovalTypeEnum.DISCOUNT,
            ApprovalTypeEnum.REFUND,
        }:
            try:
                amount = float(self.payload["amount"])
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError("payload.amount must be a valid number") from exc
            if not math.isfinite(amount) or amount <= 0:
                raise ValueError("payload.amount must be greater than zero")
        if self.type == ApprovalTypeEnum.DISCOUNT:
            booking_id = self.payload.get("booking_id")
            if not isinstance(booking_id, int) or booking_id <= 0:
                raise ValueError("payload.booking_id must be a positive integer")
        return self

class ApprovalRequestUpdate(BaseModel):
    status: ApprovalStatusEnum
    remarks: Optional[str] = None
    assigned_approver_id: Optional[int] = None

class ApprovalRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: ApprovalTypeEnum
    status: ApprovalStatusEnum
    requested_by_id: int
    approved_by_id: Optional[int]
    assigned_approver_id: Optional[int]
    level: int
    remarks: Optional[str]
    payload: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]


class ApprovalHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: int
    changes: Optional[Dict[str, Any]]
    timestamp: datetime
