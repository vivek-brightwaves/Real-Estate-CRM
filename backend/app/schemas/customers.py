from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.models.customers import DocStatusEnum

class VerifiedByOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class CustomerDocumentBase(BaseModel):
    doc_type: str

class CustomerDocumentCreate(CustomerDocumentBase):
    pass

class CustomerDocumentOut(CustomerDocumentBase):
    id: int
    customer_id: int
    file_url: str
    status: DocStatusEnum
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[VerifiedByOut] = None

    class Config:
        from_attributes = True

class CustomerVerifyDocument(BaseModel):
    status: DocStatusEnum

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerCreate(CustomerBase):
    lead_id: int

class CustomerOut(CustomerBase):
    id: int
    lead_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    documents: List[CustomerDocumentOut] = []

    class Config:
        from_attributes = True

