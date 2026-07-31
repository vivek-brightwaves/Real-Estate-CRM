from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class BrokerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    company_name: str | None = Field(None, max_length=150)
    rera_registration: str | None = Field(None, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9][0-9 -]{6,19}$")
    email: EmailStr | None = None
    bank_account: str | None = Field(None, max_length=50)
    bank_ifsc: str | None = Field(None, pattern=r"^[A-Za-z0-9]{4,20}$")


class BrokerSummary(BaseModel):
    id: int
    name: str
    company: str | None = None


class BrokerCreated(BaseModel):
    id: int
    name: str


class BrokerCreateOut(BaseModel):
    status: str
    broker: BrokerCreated


class BrokerListOut(BaseModel):
    status: str
    total: int
    page: int
    size: int
    brokers: list[BrokerSummary]
