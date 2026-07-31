from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.possession import TicketPriorityEnum, TicketStatusEnum


class HandoverCreate(BaseModel):
    booking_id: int = Field(gt=0)
    is_snagging_completed: bool = False
    keys_handed_over: bool = False
    welcome_kit_provided: bool = False
    notes: str | None = Field(None, max_length=5000)


class ServiceTicketCreate(BaseModel):
    customer_id: int = Field(gt=0)
    unit_id: int | None = Field(None, gt=0)
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3, max_length=10000)
    priority: TicketPriorityEnum = TicketPriorityEnum.MEDIUM


class ServiceTicketUpdate(BaseModel):
    status: TicketStatusEnum | None = None
    priority: TicketPriorityEnum | None = None
    assigned_to_id: int | None = Field(None, gt=0)

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("At least one ticket field must be provided")
        return self


class HandoverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    is_snagging_completed: int
    keys_handed_over: int
    welcome_kit_provided: int
    handover_date: datetime | None = None
    notes: str | None = None
    created_by_id: int
    created_at: datetime


class ServiceTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    unit_id: int | None = None
    subject: str
    description: str
    status: TicketStatusEnum
    priority: TicketPriorityEnum
    assigned_to_id: int | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class HandoverCreatedOut(BaseModel):
    status: str
    handover_id: int


class ServiceTicketCreatedOut(BaseModel):
    status: str
    ticket_id: int
