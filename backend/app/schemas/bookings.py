from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.sales import BookingStatusEnum

class BookingCreate(BaseModel):
    unit_id: int = Field(gt=0)
    customer_id: int = Field(gt=0)


class DiscountRequest(BaseModel):
    amount: float = Field(gt=0, le=1_000_000_000)
    reason: Optional[str] = Field(None, max_length=2000)

class DiscountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    requested_by_id: int
    approved_by_id: Optional[int] = None
    payload: Any = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int
    customer_id: int
    created_by_id: int
    status: BookingStatusEnum
    approved_by_id: Optional[int] = None
    discounts: List[DiscountOut] = Field(default_factory=list)
    has_verified_kyc: bool = False
