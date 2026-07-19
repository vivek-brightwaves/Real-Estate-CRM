from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.customers import SiteVisitStatusEnum

class SiteVisitFeedback(BaseModel):
    feedback: str
    rating: int

class SiteVisitUpdate(BaseModel):
    status: Optional[SiteVisitStatusEnum] = None
    is_approved: Optional[bool] = None

class SiteVisitOut(BaseModel):
    id: int
    lead_id: int
    employee_id: int
    scheduled_at: datetime
    status: SiteVisitStatusEnum
    feedback: Optional[str] = None
    rating: Optional[int] = None
    check_in_time: Optional[datetime] = None
    photo_url: Optional[str] = None
    is_approved: bool
    
    class Config:
        from_attributes = True
