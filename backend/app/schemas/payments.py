from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict, Field
from app.models.sales import PaymentStatusEnum, PaymentModeEnum

class PaymentCreate(BaseModel):
    booking_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    due_date: Optional[date] = None

class PaymentMarkReceived(BaseModel):
    mode: PaymentModeEnum
    receipt_number: Optional[str] = Field(None, max_length=100)

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    amount: float
    due_date: Optional[date] = None
    status: PaymentStatusEnum
    mode: Optional[PaymentModeEnum] = None
    received_date: Optional[date] = None
    receipt_number: Optional[str] = None
    recorded_by_id: Optional[int] = None


class PaymentReminderOut(BaseModel):
    message: str
    delivery_status: str
    customer_name: str
    customer_contact: Optional[str] = None
    assigned_user_id: int
