from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_roles
from app.models.users import RoleEnum
from app.models.system import AuditLog
from app.schemas.system import AuditLogOut

router = APIRouter()

# Approvals moved to routers/approvals.py


# Audit Logs

@router.get("/audit-logs", response_model=List[AuditLogOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def get_audit_logs(
    response: Response,
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if module:
        query = query.filter(AuditLog.module == module)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            AuditLog.action.ilike(term) | AuditLog.entity_type.ilike(term)
        )
    total = query.order_by(None).count()
    ordering = (
        AuditLog.timestamp.asc()
        if sort_order == "asc"
        else AuditLog.timestamp.desc()
    )
    items = (
        query.order_by(ordering, AuditLog.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)
    return items
