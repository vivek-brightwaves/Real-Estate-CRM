from typing import Optional, List, Any
from pydantic import BaseModel
from app.models.sales import BookingStatusEnum

class BookingCreate(BaseModel):
    unit_id: int
    customer_id: int

class DiscountOut(BaseModel):
    id: int
    status: str
    requested_by_id: int
    approved_by_id: Optional[int] = None
    payload: Any = None

    class Config:
        from_attributes = True

class BookingOut(BaseModel):
    id: int
    unit_id: int
    customer_id: int
    created_by_id: int
    status: BookingStatusEnum
    approved_by_id: Optional[int] = None
    discounts: List[DiscountOut] = []
    has_verified_kyc: bool = False

    class Config:
        from_attributes = True
