from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.rentals import InvoiceStatusEnum, LeaseStatusEnum


class LeaseCreate(BaseModel):
    tenant_name: str = Field(min_length=1, max_length=150)
    tenant_email: EmailStr | None = None
    tenant_phone: str = Field(pattern=r"^\+?[0-9][0-9 -]{6,19}$")
    unit_id: int = Field(gt=0)
    start_date: date
    end_date: date
    rent_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    security_deposit: Decimal = Field(ge=0, max_digits=12, decimal_places=2)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class LeaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int
    tenant_id: int
    start_date: date
    end_date: date
    rent_amount: Decimal
    security_deposit: Decimal
    status: LeaseStatusEnum
    created_at: datetime


class RentalInvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lease_id: int
    amount: Decimal
    due_date: date
    status: InvoiceStatusEnum
    paid_at: datetime | None = None
    created_at: datetime


class LeaseCreated(BaseModel):
    id: int
    tenant_id: int


class LeaseCreateOut(BaseModel):
    status: str
    lease: LeaseCreated


class LeaseDetail(BaseModel):
    id: int
    unit_id: int
    status: LeaseStatusEnum


class LeaseDetailOut(BaseModel):
    status: str
    lease: LeaseDetail


class LeaseStatusUpdate(BaseModel):
    status: LeaseStatusEnum


class RentalInvoicePayment(BaseModel):
    paid_at: datetime | None = None
