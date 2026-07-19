from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.leads import Lead, LeadNote, SiteVisit, LeadStatusEnum
from app.schemas.leads import (
    LeadCreate, LeadUpdate, LeadOut, LeadAssign,
    LeadNoteCreate, LeadNoteOut,
    SiteVisitCreate, SiteVisitOut
)

router = APIRouter()

def get_lead_or_404(db: Session, lead_id: int):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

def verify_lead_access(lead: Lead, current_user: User):
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return
    if current_user.role == RoleEnum.MANAGER:
        # Assuming we check branch via the creator or assigned user
        # In a real app we'd verify the assigned user belongs to the manager's branch
        pass
    if current_user.role == RoleEnum.EMPLOYEE:
        if lead.assigned_to_id != current_user.id and lead.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this lead")

@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_data = lead_in.model_dump(exclude={"initial_note"})
    
    lead = Lead(
        **lead_data,
        status=LeadStatusEnum.NEW,
        created_by_id=current_user.id,
        assigned_to_id=current_user.id
    )
    db.add(lead)
    db.flush() # flush to get lead.id
    
    if lead_in.initial_note:
        note = LeadNote(lead_id=lead.id, note=lead_in.initial_note, created_by_id=current_user.id)
        db.add(note)
        
    db.commit()
    db.refresh(lead)
    
    from app.services.audit import log_audit
    log_audit(db, current_user.id, "LEAD", lead.id, "CREATE", lead_in.model_dump(exclude={"initial_note"}))
    
    return lead

@router.get("/", response_model=List[LeadOut])
def get_leads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Lead).filter(scope_query_to_branch(current_user, Lead))
    return query.offset(skip).limit(limit).all()

@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, lead_in: LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_or_404(db, lead_id)
    verify_lead_access(lead, current_user)
    
    update_data = lead_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
        
    db.commit()
    db.refresh(lead)
    return lead

@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=status.HTTP_201_CREATED)
def add_note(lead_id: int, note_in: LeadNoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_or_404(db, lead_id)
    verify_lead_access(lead, current_user)
    
    note = LeadNote(lead_id=lead.id, note=note_in.note, created_by_id=current_user.id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.post("/{lead_id}/assign", response_model=LeadOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def assign_lead(lead_id: int, payload: LeadAssign, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, lead_id)
    lead.assigned_to_id = payload.assigned_to_id
    db.commit()
    db.refresh(lead)
    
    from app.services.notifications import send_notification
    send_notification(
        db=db, 
        user_id=lead.assigned_to_id, 
        notif_type="LEAD_ASSIGNED", 
        message=f"You have been assigned a new lead: {lead.name}",
        email_subject="New Lead Assigned"
    )
    
    return lead

@router.post("/{lead_id}/reject", response_model=LeadOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def reject_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, lead_id)
    lead.status = LeadStatusEnum.LOST
    db.commit()
    db.refresh(lead)
    return lead

@router.post("/{lead_id}/schedule-visit", response_model=SiteVisitOut, status_code=status.HTTP_201_CREATED)
def schedule_visit(lead_id: int, visit_in: SiteVisitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = get_lead_or_404(db, lead_id)
    verify_lead_access(lead, current_user)
    
    # Automatically set status if appropriate
    if lead.status in [LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED]:
        lead.status = LeadStatusEnum.VISIT_SCHEDULED
        
    visit = SiteVisit(
        lead_id=lead.id,
        scheduled_at=visit_in.scheduled_at,
        employee_id=visit_in.employee_id or current_user.id
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit
