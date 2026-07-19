from typing import Optional
from datetime import date
from pydantic import BaseModel
from app.models.sales import PaymentStatusEnum, PaymentModeEnum

class PaymentCreate(BaseModel):
    booking_id: int
    amount: float
    due_date: Optional[date] = None

class PaymentMarkReceived(BaseModel):
    mode: PaymentModeEnum
    receipt_number: Optional[str] = None

class PaymentOut(BaseModel):
    id: int
    booking_id: int
    amount: float
    due_date: Optional[date] = None
    status: PaymentStatusEnum
    mode: Optional[PaymentModeEnum] = None
    received_date: Optional[date] = None
    receipt_number: Optional[str] = None
    recorded_by_id: Optional[int] = None

    class Config:
        from_attributes = True
