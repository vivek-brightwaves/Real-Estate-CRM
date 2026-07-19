from typing import Optional, List
from pydantic import BaseModel
from app.models.sales import BookingStatusEnum

class BookingCreate(BaseModel):
    unit_id: int
    customer_id: int

class BookingOut(BaseModel):
    id: int
    unit_id: int
    customer_id: int
    created_by_id: int
    status: BookingStatusEnum
    approved_by_id: Optional[int] = None

    class Config:
        from_attributes = True
