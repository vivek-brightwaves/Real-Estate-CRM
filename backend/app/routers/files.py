import os
import re
import uuid
import mimetypes
from pathlib import Path
from typing import List, Literal, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.files import FileUpload
from app.models.users import User, RoleEnum
from app.schemas.common import MessageResponse
from app.schemas.files import (
    FileListOut,
    FileMutationOut,
    FileUploadOut,
    MultipleFileUploadOut,
)
from app.services.audit import log_audit

# ---------------------------------------------------------------
# Constants
# ---------------------------------------------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
    ".txt", ".zip", ".rar",
}
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".com", ".msi",
    ".vbs", ".js", ".wsf", ".scr", ".pif",
}
MODULE_FOLDERS = {
    "customer": "customer",
    "booking": "booking",
    "payments": "payments",
    "kyc": "kyc",
    "site-visits": "site-visits",
    "tickets": "tickets",
    "rentals": "rentals",
    "receipts": "receipts",
}
BASE_UPLOAD_DIR = "uploads"

router = APIRouter()

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename."""
    name, ext = os.path.splitext(filename)
    name = re.sub(r'[^\w\s\-]', '', name).strip()
    name = re.sub(r'\s+', '_', name)
    if not name:
        name = "file"
    return f"{name}{ext.lower()}"

def validate_file(file: UploadFile):
    """Validate file size, extension, MIME type, and block executables."""
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()

    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Executable file type '{ext}' is not allowed.")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # MIME type check
    guessed_type, _ = mimetypes.guess_type(file.filename or "")
    if guessed_type and guessed_type.startswith("application/x-ms") and ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Executable MIME type detected.")

def get_module_dir(module: str) -> str:
    if module not in MODULE_FOLDERS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown module. Allowed modules: {', '.join(sorted(MODULE_FOLDERS))}",
        )
    folder = MODULE_FOLDERS[module]
    path = os.path.join(BASE_UPLOAD_DIR, folder)
    os.makedirs(path, exist_ok=True)
    return path


def resolve_stored_path(path: str) -> Path:
    upload_root = Path(BASE_UPLOAD_DIR).resolve()
    candidate = Path(path).resolve()
    if candidate != upload_root and upload_root not in candidate.parents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stored file path is outside the upload directory",
        )
    return candidate

# ---------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------

@router.post(
    "/upload",
    response_model=FileUploadOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "",
    response_model=FileUploadOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    module: str = Form(..., description="Module name: customer, booking, payments, kyc, site-visits, tickets, rentals, receipts"),
    entity_id: Optional[int] = Form(None, description="ID of the associated entity"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_file(file)

    # Read into memory to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB.")

    safe_name = sanitize_filename(file.filename or "file")
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    module_dir = get_module_dir(module)
    file_path = os.path.join(module_dir, unique_name)

    with open(file_path, "wb") as f:
        f.write(content)

    guessed_type, _ = mimetypes.guess_type(file.filename or "")

    record = FileUpload(
        original_name=file.filename or safe_name,
        stored_name=unique_name,
        file_path=file_path,
        mime_type=guessed_type or file.content_type,
        size_bytes=len(content),
        module=module,
        entity_id=entity_id,
        uploaded_by_id=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_audit(db, current_user.id, "FILE", record.id, "UPLOAD", new_values={"module": module, "entity_id": entity_id, "filename": record.original_name})

    return {
        "id": record.id,
        "original_name": record.original_name,
        "stored_name": record.stored_name,
        "mime_type": record.mime_type,
        "size_bytes": record.size_bytes,
        "module": record.module,
        "entity_id": record.entity_id,
    }

@router.post(
    "/upload-multiple",
    response_model=MultipleFileUploadOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/batch",
    response_model=MultipleFileUploadOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_multiple_files(
    module: str = Form(...),
    entity_id: Optional[int] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    for file in files:
        validate_file(file)
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            results.append({"filename": file.filename, "error": "File too large"})
            continue

        safe_name = sanitize_filename(file.filename or "file")
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"
        module_dir = get_module_dir(module)
        file_path = os.path.join(module_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(content)

        guessed_type, _ = mimetypes.guess_type(file.filename or "")
        record = FileUpload(
            original_name=file.filename or safe_name,
            stored_name=unique_name,
            file_path=file_path,
            mime_type=guessed_type or file.content_type,
            size_bytes=len(content),
            module=module,
            entity_id=entity_id,
            uploaded_by_id=current_user.id,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        log_audit(db, current_user.id, "FILE", record.id, "UPLOAD", new_values={"module": module, "filename": record.original_name})
        results.append({"id": record.id, "original_name": record.original_name, "stored_name": record.stored_name})

    return {"uploaded": results}

@router.get("/list", response_model=FileListOut, include_in_schema=False)
@router.get("", response_model=FileListOut)
def list_files(
    module: Optional[str] = None,
    entity_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FileUpload)
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        query = query.filter(FileUpload.uploaded_by_id == current_user.id)
    if module:
        if module not in MODULE_FOLDERS:
            raise HTTPException(status_code=422, detail="Unknown file module")
        query = query.filter(FileUpload.module == module)
    if entity_id is not None:
        query = query.filter(FileUpload.entity_id == entity_id)
    if search:
        query = query.filter(
            FileUpload.original_name.ilike(f"%{search.strip()}%")
        )

    total = query.count()
    ordering = (
        FileUpload.created_at.asc()
        if sort_order == "asc"
        else FileUpload.created_at.desc()
    )
    files = (
        query.order_by(ordering, FileUpload.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "size": size,
        "files": [
            {
                "id": f.id,
                "original_name": f.original_name,
                "mime_type": f.mime_type,
                "size_bytes": f.size_bytes,
                "module": f.module,
                "entity_id": f.entity_id,
                "created_at": str(f.created_at),
            }
            for f in files
        ],
    }

@router.get(
    "/download/{file_id}",
    response_class=FileResponse,
    include_in_schema=False,
)
@router.get(
    "/{file_id}",
    response_class=FileResponse,
    responses={
        200: {
            "description": "Requested file.",
            "content": {"application/octet-stream": {}},
        }
    },
)
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(FileUpload).filter(FileUpload.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if (
        record.uploaded_by_id != current_user.id
        and current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]
    ):
        raise HTTPException(status_code=403, detail="Not authorized to download this file")

    stored_path = resolve_stored_path(record.file_path)
    if not stored_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=stored_path,
        media_type=record.mime_type or "application/octet-stream",
        filename=record.original_name,
    )

@router.delete("/{file_id}", response_model=MessageResponse)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(FileUpload).filter(FileUpload.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    # Only uploader or admins can delete
    if record.uploaded_by_id != current_user.id and current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    stored_path = resolve_stored_path(record.file_path)
    if stored_path.is_file():
        stored_path.unlink()

    db.delete(record)
    db.commit()
    log_audit(db, current_user.id, "FILE", file_id, "DELETE", old_values={"filename": record.original_name, "module": record.module})

    return {"message": "File deleted successfully"}

@router.put(
    "/{file_id}/replace",
    response_model=FileMutationOut,
    include_in_schema=False,
)
@router.put("/{file_id}", response_model=FileMutationOut)
async def replace_file(
    file_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(FileUpload).filter(FileUpload.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    if record.uploaded_by_id != current_user.id and current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to replace this file")

    validate_file(file)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB.")

    safe_name = sanitize_filename(file.filename or "file")
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    module_dir = get_module_dir(record.module)
    new_path = os.path.join(module_dir, unique_name)

    with open(new_path, "wb") as f:
        f.write(content)

    old_name = record.original_name
    old_path = resolve_stored_path(record.file_path)
    if old_path.is_file() and old_path != Path(new_path).resolve():
        old_path.unlink()
    guessed_type, _ = mimetypes.guess_type(file.filename or "")
    record.original_name = file.filename or safe_name
    record.stored_name = unique_name
    record.file_path = new_path
    record.mime_type = guessed_type or file.content_type
    record.size_bytes = len(content)

    db.commit()
    db.refresh(record)
    log_audit(db, current_user.id, "FILE", record.id, "REPLACE", old_values={"filename": old_name}, new_values={"filename": record.original_name})

    return {
        "id": record.id,
        "original_name": record.original_name,
        "stored_name": record.stored_name,
        "mime_type": record.mime_type,
        "size_bytes": record.size_bytes,
    }
