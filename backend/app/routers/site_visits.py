import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.leads import SiteVisit, LeadNote
from app.models.customers import SiteVisitStatusEnum
from app.schemas.site_visits import SiteVisitOut, SiteVisitFeedback, SiteVisitResultUpdate

router = APIRouter()

def get_visit_or_404(db: Session, visit_id: int):
    visit = db.query(SiteVisit).filter(SiteVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site Visit not found")
    return visit

@router.get("/", response_model=List[SiteVisitOut])
def get_site_visits(date: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(SiteVisit)
    
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(SiteVisit.employee_id == current_user.id)
    # Manager visibility would typically be scoped by branch. For now, we return all for Managers.

    if date == "today":
        today = datetime.utcnow().date()
        # Filter for visits scheduled today
        from sqlalchemy import cast, Date
        query = query.filter(cast(SiteVisit.scheduled_at, Date) == today)
        
    from sqlalchemy.orm import joinedload
    query = query.options(joinedload(SiteVisit.lead))
        
    return query.offset(skip).limit(limit).all()

@router.post("/{visit_id}/check-in", response_model=SiteVisitOut)
async def check_in(visit_id: int, photo: Optional[UploadFile] = File(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    
    if current_user.role == RoleEnum.EMPLOYEE and visit.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to check-in for this visit")
    
    visit.check_in_time = datetime.utcnow()
    
    if photo:
        file_location = f"uploads/{visit_id}_{photo.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(photo.file, file_object)
        visit.photo_url = f"/{file_location}"
        
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/feedback", response_model=SiteVisitOut)
def submit_feedback(visit_id: int, feedback_in: SiteVisitFeedback, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    
    if current_user.role == RoleEnum.EMPLOYEE and visit.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    visit.feedback = feedback_in.feedback
    visit.rating = feedback_in.rating
    visit.status = SiteVisitStatusEnum.COMPLETED
    
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/approve", response_model=SiteVisitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def approve_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = get_visit_or_404(db, visit_id)
    visit.is_approved = True
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/{visit_id}/result", response_model=SiteVisitOut)
def update_visit_result(visit_id: int, result_in: SiteVisitResultUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = get_visit_or_404(db, visit_id)
    
    if current_user.role == RoleEnum.EMPLOYEE and visit.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
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
