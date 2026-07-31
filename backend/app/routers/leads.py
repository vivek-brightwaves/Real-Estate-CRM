from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.api.query import apply_sort, paginate
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.leads import Lead, LeadStatusEnum
from app.schemas.leads import (
    LeadCreate, LeadUpdate, LeadOut, LeadAssign,
    LeadMerge,
    LeadNoteCreate, LeadNoteOut,
    SiteVisitCreate, SiteVisitOut
)
from app.services.lead_service import (
    create_lead as create_lead_service,
    get_lead_or_404 as get_lead_service,
    update_lead as update_lead_service,
    add_note_to_lead,
    assign_lead as assign_lead_service,
    reject_lead as reject_lead_service,
    schedule_site_visit,
    merge_leads,
)

CRM_STAFF_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.EMPLOYEE,
]
router = APIRouter(
    dependencies=[Depends(require_roles(CRM_STAFF_ROLES))]
)

def verify_lead_access(lead: Lead, current_user: User):
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return
    if hasattr(lead, 'company_id') and current_user.branch is not None:
        if lead.company_id != current_user.branch.company_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this lead")

    if current_user.role == RoleEnum.MANAGER:
        return
    if current_user.role == RoleEnum.EMPLOYEE:
        if lead.assigned_to_id != current_user.id and lead.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this lead")

@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_lead_service(db=db, current_user=current_user, lead_in=lead_in)

@router.get("", response_model=List[LeadOut])
def get_leads(
    response: Response,
    status_filter: Optional[LeadStatusEnum] = Query(None, alias="status"),
    assigned_to_id: Optional[int] = None,
    source: Optional[str] = Query(None, max_length=100),
    priority: Optional[str] = Query(None, max_length=50),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Lead)
        .filter(
            Lead.is_deleted.is_(False),
            scope_query_to_branch(current_user, Lead),
        )
        .options(
            selectinload(Lead.notes),
            selectinload(Lead.activities),
            selectinload(Lead.site_visits),
        )
    )
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    if assigned_to_id is not None:
        query = query.filter(Lead.assigned_to_id == assigned_to_id)
    if source:
        query = query.filter(Lead.source == source)
    if priority:
        query = query.filter(Lead.priority == priority)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.name.ilike(term),
                Lead.email.ilike(term),
                Lead.phone.ilike(term),
                Lead.source.ilike(term),
            )
        )
    query = apply_sort(
        query,
        model=Lead,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "status", "priority", "created_at", "updated_at"},
        tie_breaker=Lead.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return lead

@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, lead_in: LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return update_lead_service(db=db, lead=lead, lead_in=lead_in, updated_by=current_user)

@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=status.HTTP_201_CREATED)
def add_note(lead_id: int, note_in: LeadNoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return add_note_to_lead(db=db, lead=lead, note_text=note_in.note, user=current_user)

@router.post("/{lead_id}/assign", response_model=LeadOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def assign_lead(lead_id: int, payload: LeadAssign, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return assign_lead_service(db=db, lead=lead, assigned_to_id=payload.assigned_to_id, assigned_by=current_user)

@router.post("/{lead_id}/reject", response_model=LeadOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def reject_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return reject_lead_service(db=db, lead=lead, updated_by=current_user)


@router.post(
    "/{lead_id}/merge",
    response_model=LeadOut,
    dependencies=[
        Depends(
            require_roles(
                [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]
            )
        )
    ],
)
def merge_duplicate_lead(
    lead_id: int,
    payload: LeadMerge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    primary = get_lead_service(db, lead_id)
    duplicate = get_lead_service(db, payload.duplicate_lead_id)
    verify_lead_access(primary, current_user)
    verify_lead_access(duplicate, current_user)
    return merge_leads(
        db,
        primary=primary,
        duplicate=duplicate,
        merged_by=current_user,
    )

@router.post("/{lead_id}/schedule-visit", response_model=SiteVisitOut, status_code=status.HTTP_201_CREATED)
def schedule_visit(lead_id: int, visit_in: SiteVisitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_service(db, lead_id)
    verify_lead_access(lead, current_user)
    return schedule_site_visit(db=db, lead=lead, visit_in=visit_in, current_user=current_user)
