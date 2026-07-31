from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from app.models.customers import SiteVisitStatusEnum

class SiteVisitFeedback(BaseModel):
    feedback: str = Field(min_length=1, max_length=5000)
    rating: int = Field(ge=1, le=5)

class SiteVisitUpdate(BaseModel):
    status: Optional[SiteVisitStatusEnum] = None
    is_approved: Optional[bool] = None

class SiteVisitResultUpdate(BaseModel):
    status: SiteVisitStatusEnum
    scheduled_at: Optional[datetime] = None
    feedback: Optional[str] = Field(None, max_length=5000)
    sales_notes: Optional[str] = Field(None, max_length=10000)
    remarks: Optional[str] = Field(None, max_length=10000)
    next_follow_up_date: Optional[datetime] = None

class LeadMinimal(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: Optional[str] = None

class SiteVisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    employee_id: int
    scheduled_at: datetime
    status: SiteVisitStatusEnum
    feedback: Optional[str] = None
    sales_notes: Optional[str] = None
    remarks: Optional[str] = None
    rating: Optional[int] = None
    check_in_time: Optional[datetime] = None
    photo_url: Optional[str] = None
    is_approved: bool

    lead: Optional[LeadMinimal] = None
