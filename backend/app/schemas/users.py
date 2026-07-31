from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.core.security import validate_password_strength
from datetime import datetime
from app.models.users import RoleEnum

class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9][0-9 -]{6,19}$")
    role: RoleEnum
    branch_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    role_profile_id: Optional[int] = Field(None, gt=0)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not validate_password_strength(value):
            raise ValueError(
                "Password must contain uppercase, lowercase, number, and special character"
            )
        return value

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9][0-9 -]{6,19}$",
    )
    branch_id: Optional[int] = Field(None, gt=0)

class UserUpdateRole(BaseModel):
    role: RoleEnum


class UserActivationUpdate(BaseModel):
    is_active: bool

class UserReassignManager(BaseModel):
    manager_id: Optional[int] = Field(None, gt=0)

class UserResetPassword(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not validate_password_strength(value):
            raise ValueError(
                "Password must contain uppercase, lowercase, number, and special character"
            )
        return value


class RoleProfileCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    base_role: RoleEnum = RoleEnum.EMPLOYEE


class RoleProfileOut(RoleProfileCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    role_profiles: list[RoleProfileOut] = Field(default_factory=list)
