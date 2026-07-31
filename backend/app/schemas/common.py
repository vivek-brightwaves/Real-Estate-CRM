from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class ErrorBody(BaseModel):
    code: str = Field(examples=["RESOURCE_NOT_FOUND"])
    message: str = Field(examples=["The requested resource was not found."])
    details: Any | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "details": [{"field": "body.email", "message": "Invalid email"}],
                },
                "request_id": "b8d2fae985ef44a9a83fd5ed19a4bd68",
            }
        }
    )

    success: bool = False
    error: ErrorBody
    request_id: str


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    request_id: str | None = None


class PaginationMeta(BaseModel):
    page: int
    size: int
    total: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: PaginationMeta
    request_id: str | None = None


class MessageResponse(BaseModel):
    message: str


class CountResponse(BaseModel):
    unread_count: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
