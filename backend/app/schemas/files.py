from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class FileMutationOut(BaseModel):
    id: int
    original_name: str
    stored_name: str
    mime_type: str | None = None
    size_bytes: int


class FileUploadOut(FileMutationOut):
    module: str
    entity_id: int | None = None


class FileUploadResult(BaseModel):
    id: int | None = None
    original_name: str | None = None
    stored_name: str | None = None
    filename: str | None = None
    error: str | None = None


class MultipleFileUploadOut(BaseModel):
    uploaded: list[FileUploadResult]


class FileListItem(BaseModel):
    id: int
    original_name: str
    mime_type: str | None = None
    size_bytes: int
    module: str
    entity_id: int | None = None
    created_at: datetime


class FileListOut(BaseModel):
    total: int
    page: int
    size: int
    files: list[FileListItem]
