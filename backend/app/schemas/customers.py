from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.customers import DocStatusEnum

class VerifiedByOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str

class CustomerDocumentBase(BaseModel):
    doc_type: str = Field(
        min_length=1,
        max_length=50,
        pattern=r"^[A-Za-z0-9_-]+$",
    )

class CustomerDocumentCreate(CustomerDocumentBase):
    pass

class CustomerDocumentOut(CustomerDocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    file_url: str
    status: DocStatusEnum
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[VerifiedByOut] = None


class CustomerVerifyDocument(BaseModel):
    status: DocStatusEnum

class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9][0-9 -]{6,19}$",
    )
    email: Optional[EmailStr] = None

class CustomerCreate(CustomerBase):
    lead_id: int = Field(gt=0)


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9][0-9 -]{6,19}$",
    )
    email: Optional[EmailStr] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    documents: List[CustomerDocumentOut] = Field(default_factory=list)


class CustomerTimelineItem(BaseModel):
    type: str
    date: datetime
    title: str
    description: str


class CustomerTimelineOut(BaseModel):
    timeline: List[CustomerTimelineItem]
