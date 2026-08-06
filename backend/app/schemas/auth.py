from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.schemas.users import UserOut
from app.core.security import validate_password_strength

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "device_info": "Chrome on Windows",
                "remember": False,
            }
        }
    )

    refresh_token: Optional[str] = Field(default=None, min_length=20, max_length=500)
    device_info: Optional[str] = Field(None, max_length=255)
    remember: Optional[bool] = Field(default=False)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(examples=["user@example.com"])

class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=255)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not validate_password_strength(value):
            raise ValueError(
                "Password must contain uppercase, lowercase, number, and special character"
            )
        return value

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not validate_password_strength(value):
            raise ValueError(
                "Password must contain uppercase, lowercase, number, and special character"
            )
        return value

class EmailVerificationRequest(BaseModel):
    token: str = Field(min_length=20, max_length=255)

class LoginHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    status: str
    attempt_time: datetime
