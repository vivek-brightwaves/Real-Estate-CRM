import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.leads import SiteVisit, LeadNote
from app.models.customers import SiteVisitStatusEnum
from app.schemas.site_visits import SiteVisitOut, SiteVisitFeedback, SiteVisitResultUpdate
from app.api.query import apply_sort, paginate
from app.core.time import utcnow

CRM_STAFF_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.EMPLOYEE,
]
router = APIRouter(
    dependencies=[Depends(require_roles(CRM_STAFF_ROLES))]
)

def get_visit_or_404(db: Session, visit_id: int):
    visit = (
        db.query(SiteVisit)
        .options(joinedload(SiteVisit.employee), joinedload(SiteVisit.lead))
        .filter(SiteVisit.id == visit_id)
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Site Visit not found")
    return visit


def verify_visit_access(visit: SiteVisit, current_user: User) -> None:
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    if current_user.role == RoleEnum.MANAGER:
        if (
            visit.employee is not None
            and visit.employee.branch_id == current_user.branch_id
        ):
            return
    elif (
        current_user.role == RoleEnum.EMPLOYEE
        and visit.employee_id == current_user.id
    ):
        return
    raise HTTPException(status_code=403, detail="Not authorized for this visit")

@router.get("", response_model=List[SiteVisitOut])
def get_site_visits(
    response: Response,
    date_filter: Optional[str] = Query(None, alias="date", max_length=20),
    visit_status: Optional[SiteVisitStatusEnum] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    sort_by: str = "scheduled_at",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SiteVisit).options(joinedload(SiteVisit.lead))

    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(SiteVisit.employee_id == current_user.id)
    elif current_user.role == RoleEnum.MANAGER:
        query = query.join(SiteVisit.employee).filter(
            User.branch_id == current_user.branch_id
        )

    if employee_id is not None:
        query = query.filter(SiteVisit.employee_id == employee_id)
    if visit_status:
        query = query.filter(SiteVisit.status == visit_status)
    if date_filter:
        if date_filter == "today":
            target_date = utcnow().date()
        else:
            try:
                target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=422,
                    detail="date must be 'today' or use YYYY-MM-DD",
                )
        day_start = datetime.combine(target_date, datetime.min.time())
        query = query.filter(
            SiteVisit.scheduled_at >= day_start,
            SiteVisit.scheduled_at < day_start + timedelta(days=1),
        )
    query = apply_sort(
        query,
        model=SiteVisit,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "scheduled_at", "status", "employee_id"},
        tie_breaker=SiteVisit.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.post("/{visit_id}/check-in", response_model=SiteVisitOut)
async def check_in(visit_id: int, photo: Optional[UploadFile] = File(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    verify_visit_access(visit, current_user)

    visit.check_in_time = utcnow()

    if photo:
        from app.routers.files import MAX_FILE_SIZE, sanitize_filename, validate_file

        validate_file(photo)
        extension = os.path.splitext(photo.filename or "")[1].lower()
        if extension not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            raise HTTPException(
                status_code=400,
                detail="Check-in photo must be an image",
            )
        content = await photo.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Check-in photo exceeds maximum file size",
            )
        safe_name = sanitize_filename(photo.filename or "check-in.jpg")
        file_location = os.path.join(
            "uploads",
            f"visit_{visit_id}_{uuid.uuid4().hex}_{safe_name}",
        )
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        with open(file_location, "wb") as file_object:
            file_object.write(content)
        visit.photo_url = f"/{Path(file_location).as_posix()}"

    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/feedback", response_model=SiteVisitOut)
def submit_feedback(visit_id: int, feedback_in: SiteVisitFeedback, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    verify_visit_access(visit, current_user)

    visit.feedback = feedback_in.feedback
    visit.rating = feedback_in.rating
    visit.status = SiteVisitStatusEnum.COMPLETED

    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/approve", response_model=SiteVisitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def approve_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = get_visit_or_404(db, visit_id)
    verify_visit_access(visit, current_user)
    visit.is_approved = True
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/result", response_model=SiteVisitOut)
def update_visit_result(visit_id: int, result_in: SiteVisitResultUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    verify_visit_access(visit, current_user)

    visit.status = result_in.status
    if result_in.feedback:
        visit.feedback = result_in.feedback
    if result_in.sales_notes:
        visit.sales_notes = result_in.sales_notes
    if result_in.remarks:
        visit.remarks = result_in.remarks

    if result_in.status == SiteVisitStatusEnum.RESCHEDULED and result_in.scheduled_at:
        visit.scheduled_at = result_in.scheduled_at

    # Add timeline note
    note_content = f"Visit marked as {result_in.status.value}."
    if result_in.feedback:
        note_content += f"\nCustomer Feedback: {result_in.feedback}"
    if result_in.sales_notes:
        note_content += f"\nSales Notes: {result_in.sales_notes}"
    if result_in.next_follow_up_date:
        note_content += f"\nNext Follow Up: {result_in.next_follow_up_date.strftime('%Y-%m-%d %H:%M')}"

    note = LeadNote(lead_id=visit.lead_id, note=note_content, created_by_id=current_user.id)
    db.add(note)

    db.commit()
    db.refresh(visit)
    return visit
