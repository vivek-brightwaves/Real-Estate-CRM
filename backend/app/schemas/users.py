from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.users import RoleEnum

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: RoleEnum
    branch_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdateRole(BaseModel):
    role: RoleEnum

class UserReassignManager(BaseModel):
    manager_id: Optional[int] = None

class UserResetPassword(BaseModel):
    new_password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
