from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date

from app.db.session import get_db
from app.api.deps import require_roles
from app.models.users import RoleEnum
from app.models.system import AuditLog
from app.schemas.system import AuditLogOut

router = APIRouter()

@router.get("", response_model=List[AuditLogOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]))])
def list_audit_logs(
    response: Response,
    module: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    sort_by: Literal["timestamp", "action", "module", "entity_type"] = "timestamp",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)

    if module:
        query = query.filter(AuditLog.module == module)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        from datetime import datetime, timedelta
        query = query.filter(AuditLog.timestamp < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(search_term),
                AuditLog.module.ilike(search_term),
                AuditLog.entity_type.ilike(search_term),
            )
        )

    # Sorting
    sort_col = getattr(AuditLog, sort_by, AuditLog.timestamp)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total = query.order_by(None).count()
    results = query.offset((page - 1) * size).limit(size).all()
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)

    return results

@router.get("/{audit_id}", response_model=AuditLogOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]))])
def get_audit_log(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(AuditLog).filter(AuditLog.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return audit
