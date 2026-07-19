from typing import Optional
from typing import Optional, Dict, Any
from pydantic import BaseModel

# Company Schemas
class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None

class SettingsUpdate(BaseModel):
    general: Optional[Dict[str, Any]] = None
    email: Optional[Dict[str, Any]] = None
    messaging: Optional[Dict[str, Any]] = None
    storage: Optional[Dict[str, Any]] = None
    backup: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    class Config:
        from_attributes = True

# Branch Schemas
class BranchBase(BaseModel):
    name: str
    company_id: int

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    company_id: Optional[int] = None

class BranchOut(BranchBase):
    id: int
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    branch_id: int
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    branch_id: Optional[int] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    class Config:
        from_attributes = True
