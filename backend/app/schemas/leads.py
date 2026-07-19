from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.customers import SiteVisitStatusEnum
from app.models.leads import LeadStatusEnum

# --- Notes ---
class LeadNoteBase(BaseModel):
    note: str

class LeadNoteCreate(LeadNoteBase):
    pass

class LeadNoteOut(LeadNoteBase):
    id: int
    created_at: datetime
    created_by_id: Optional[int] = None
    class Config:
        from_attributes = True

# --- Site Visits ---
class SiteVisitBase(BaseModel):
    scheduled_at: datetime
    employee_id: Optional[int] = None

class SiteVisitCreate(SiteVisitBase):
    pass

class SiteVisitOut(SiteVisitBase):
    id: int
    status: SiteVisitStatusEnum
    feedback: Optional[str] = None
    check_in_time: Optional[datetime] = None
    photo_url: Optional[str] = None
    class Config:
        from_attributes = True

# --- Leads ---
class LeadBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    source: Optional[str] = None

class LeadCreate(LeadBase):
    initial_note: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    source: Optional[str] = None
    status: Optional[LeadStatusEnum] = None

class LeadAssign(BaseModel):
    assigned_to_id: int

class LeadOut(LeadBase):
    id: int
    status: LeadStatusEnum
    created_at: datetime
    assigned_to_id: Optional[int] = None
    created_by_id: Optional[int] = None
    notes: List[LeadNoteOut] = []
    site_visits: List[SiteVisitOut] = []
    
    class Config:
        from_attributes = True
