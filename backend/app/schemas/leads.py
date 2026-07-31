from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from app.models.customers import SiteVisitStatusEnum
from app.models.leads import LeadStatusEnum

# --- Notes ---
class LeadNoteBase(BaseModel):
    note: str = Field(min_length=1, max_length=2000)

class LeadNoteCreate(LeadNoteBase):
    pass

class LeadNoteOut(LeadNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    created_by_id: Optional[int] = None


# --- Site Visits ---
class SiteVisitBase(BaseModel):
    scheduled_at: datetime
    employee_id: Optional[int] = Field(None, gt=0)

class SiteVisitCreate(SiteVisitBase):
    pass

class SiteVisitOut(SiteVisitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    status: SiteVisitStatusEnum
    feedback: Optional[str] = None
    sales_notes: Optional[str] = None
    remarks: Optional[str] = None
    rating: Optional[int] = None
    check_in_time: Optional[datetime] = None
    photo_url: Optional[str] = None
    is_approved: bool


# --- Leads ---
class LeadBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9][0-9 -]{6,19}$",
    )
    email: Optional[EmailStr] = None
    source: Optional[str] = Field(None, max_length=100)
    lead_source_id: Optional[int] = Field(None, gt=0)
    campaign_id: Optional[int] = Field(None, gt=0)
    priority: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = Field(None, max_length=10000)

class LeadCreate(LeadBase):
    initial_note: Optional[str] = Field(None, max_length=2000)
    company_id: Optional[int] = Field(None, gt=0)
    next_follow_up_at: Optional[datetime] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9][0-9 -]{6,19}$",
    )
    email: Optional[EmailStr] = None
    source: Optional[str] = Field(None, max_length=100)
    lead_source_id: Optional[int] = Field(None, gt=0)
    campaign_id: Optional[int] = Field(None, gt=0)
    priority: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = Field(None, max_length=10000)
    status: Optional[LeadStatusEnum] = None
    next_follow_up_at: Optional[datetime] = None


class LeadMerge(BaseModel):
    duplicate_lead_id: int = Field(gt=0)

class LeadAssign(BaseModel):
    assigned_to_id: int = Field(gt=0)

class LeadActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type: str
    description: str
    created_by_id: int
    created_at: datetime


class LeadOut(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: Optional[str] = None
    company_id: int
    status: LeadStatusEnum
    assigned_to_id: Optional[int] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    next_follow_up_at: datetime
    notes: List[LeadNoteOut] = Field(default_factory=list)
    activities: List[LeadActivityOut] = Field(default_factory=list)
    site_visits: List[SiteVisitOut] = Field(default_factory=list)
