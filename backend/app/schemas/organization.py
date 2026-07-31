from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
import json

# Company Schemas
class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=255)
    settings_json: Optional[Dict[str, Any]] = None

    @field_validator("settings_json", mode="before")
    @classmethod
    def parse_settings_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

class SettingsUpdate(BaseModel):
    general: Optional[Dict[str, Any]] = None
    email: Optional[Dict[str, Any]] = None
    messaging: Optional[Dict[str, Any]] = None
    storage: Optional[Dict[str, Any]] = None
    backup: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=255)
    settings_json: Optional[Dict[str, Any]] = None

class CompanyOut(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

# Branch Schemas
class BranchBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    company_id: int = Field(gt=0)

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    company_id: Optional[int] = Field(None, gt=0)

class BranchOut(BranchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

# Project Schemas
class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    branch_id: int = Field(gt=0)
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, max_length=50)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    branch_id: Optional[int] = Field(None, gt=0)
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, max_length=50)

class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
