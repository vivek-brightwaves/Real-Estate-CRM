from datetime import timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import scope_query_to_branch
from app.models.leads import (
    Lead,
    LeadNote,
    LeadAssignment,
    LeadActivity,
    SiteVisit,
    LeadStatusEnum,
    LeadActivityType,
)
from app.models.users import User, RoleEnum
from app.services.audit import log_audit
from app.services.notifications import send_notification
from app.schemas.leads import LeadCreate, LeadUpdate
from app.core.time import utcnow

STATUS_TRANSITIONS = {
    LeadStatusEnum.NEW: [LeadStatusEnum.CONTACTED, LeadStatusEnum.LOST],
    LeadStatusEnum.CONTACTED: [LeadStatusEnum.VISIT_SCHEDULED, LeadStatusEnum.LOST],
    LeadStatusEnum.VISIT_SCHEDULED: [LeadStatusEnum.NEGOTIATION, LeadStatusEnum.LOST],
    LeadStatusEnum.NEGOTIATION: [LeadStatusEnum.CONVERTED, LeadStatusEnum.LOST],
    LeadStatusEnum.CONVERTED: [],
    LeadStatusEnum.LOST: [],
}


def _get_company_id_for_user(user: User) -> Optional[int]:
    if getattr(user, "company_id", None):
        return user.company_id
    if getattr(user, "branch", None) is not None and getattr(user.branch, "company_id", None):
        return user.branch.company_id
    return None


def get_lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.is_deleted.is_(False),
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def list_leads(db: Session, current_user: User, skip: int = 0, limit: int = 100):
    query = db.query(Lead).filter(Lead.is_deleted.is_(False))
    query = query.filter(scope_query_to_branch(current_user, Lead))
    return query.offset(skip).limit(limit).all()


def create_lead(db: Session, current_user: User, lead_in: LeadCreate) -> Lead:
    company_id = lead_in.company_id or _get_company_id_for_user(current_user)
    if company_id is None:
        raise HTTPException(status_code=400, detail="Company id is required")

    if current_user.role != RoleEnum.SUPER_ADMIN and company_id != _get_company_id_for_user(current_user):
        raise HTTPException(status_code=403, detail="Cannot create leads for another company")

    duplicate_conditions = []
    if lead_in.email:
        duplicate_conditions.append(
            func.lower(Lead.email) == str(lead_in.email).lower()
        )
    if lead_in.phone:
        duplicate_conditions.append(Lead.phone == lead_in.phone.strip())
    if duplicate_conditions:
        duplicate = db.query(Lead.id).filter(
            Lead.company_id == company_id,
            Lead.is_deleted.is_(False),
            or_(*duplicate_conditions),
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "A matching lead already exists",
                    "existing_lead_id": duplicate.id,
                },
            )

    lead_data = lead_in.model_dump(exclude={"initial_note", "company_id"})
    if lead_data.get("next_follow_up_at") is None:
        lead_data["next_follow_up_at"] = utcnow() + timedelta(days=1)
    lead = Lead(
        **lead_data,
        company_id=company_id,
        status=LeadStatusEnum.NEW,
        assigned_to_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(lead)
    db.flush()

    if lead_in.initial_note:
        note = LeadNote(lead_id=lead.id, note=lead_in.initial_note, created_by_id=current_user.id)
        db.add(note)

    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=LeadActivityType.CREATED,
        description="Lead created",
        created_by_id=current_user.id,
    )
    db.add(activity)

    db.commit()
    db.refresh(lead)

    log_audit(db, current_user.id, "LEAD", lead.id, "CREATE", lead_in.model_dump(exclude={"initial_note", "company_id"}))
    return lead


def merge_leads(
    db: Session,
    *,
    primary: Lead,
    duplicate: Lead,
    merged_by: User,
) -> Lead:
    if primary.id == duplicate.id:
        raise HTTPException(
            status_code=400,
            detail="A lead cannot be merged into itself",
        )
    if primary.company_id != duplicate.company_id:
        raise HTTPException(
            status_code=403,
            detail="Leads from different companies cannot be merged",
        )
    if duplicate.is_deleted:
        raise HTTPException(status_code=409, detail="Duplicate lead is already merged")

    from app.models.customers import Customer

    primary_customer = db.query(Customer.id).filter(
        Customer.lead_id == primary.id
    ).first()
    duplicate_customer = db.query(Customer).filter(
        Customer.lead_id == duplicate.id
    ).first()
    if primary_customer and duplicate_customer:
        raise HTTPException(
            status_code=409,
            detail="Both leads already have customer records",
        )
    if duplicate_customer:
        duplicate_customer.lead_id = primary.id

    for model in (LeadNote, LeadActivity, LeadAssignment, SiteVisit):
        db.query(model).filter(model.lead_id == duplicate.id).update(
            {"lead_id": primary.id},
            synchronize_session=False,
        )

    for field in (
        "phone",
        "email",
        "source",
        "lead_source_id",
        "campaign_id",
        "priority",
        "remarks",
    ):
        if getattr(primary, field) in (None, "") and getattr(
            duplicate, field
        ) not in (None, ""):
            setattr(primary, field, getattr(duplicate, field))

    existing_tag_ids = {tag.id for tag in primary.tags}
    for tag in duplicate.tags:
        if tag.id not in existing_tag_ids:
            primary.tags.append(tag)

    duplicate.is_deleted = True
    duplicate.deleted_at = utcnow()
    duplicate.deleted_by_id = merged_by.id
    primary.updated_by_id = merged_by.id
    db.commit()
    db.refresh(primary)
    log_audit(
        db,
        merged_by.id,
        "LEAD",
        primary.id,
        "MERGE",
        new_values={"merged_lead_id": duplicate.id},
    )
    return primary


def update_lead(db: Session, lead: Lead, lead_in: LeadUpdate, updated_by: User) -> Lead:
    update_data = lead_in.model_dump(exclude_unset=True)
    current_status = lead.status
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status != current_status and new_status not in STATUS_TRANSITIONS.get(current_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid state transition from {current_status} to {new_status}",
            )

    changes = {}
    for field, value in update_data.items():
        if hasattr(lead, field):
            old_value = getattr(lead, field)
            setattr(lead, field, value)
            if old_value != value:
                changes[field] = {"from": old_value, "to": value}

    lead.updated_by_id = updated_by.id
    db.commit()
    db.refresh(lead)

    if "status" in update_data and current_status != lead.status:
        if lead.assigned_to_id:
            send_notification(
                db=db,
                user_id=lead.assigned_to_id,
                notif_type="LEAD_STATUS_CHANGED",
                message=f"Lead {lead.name} status changed to {lead.status.value}",
                email_subject=f"Lead Status Updated: {lead.name}",
                category="LEADS",
                priority="HIGH"
            )

    if changes:
        log_audit(db, updated_by.id, "LEAD", lead.id, "UPDATE", changes)
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type=LeadActivityType.UPDATED,
            description=f"Lead updated: {', '.join(changes.keys())}",
            created_by_id=updated_by.id,
        )
        db.add(activity)
        db.commit()

    return lead


def add_note_to_lead(db: Session, lead: Lead, note_text: str, user: User) -> LeadNote:
    note = LeadNote(lead_id=lead.id, note=note_text, created_by_id=user.id)
    db.add(note)
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=LeadActivityType.NOTE_ADDED,
        description="Note added to lead",
        created_by_id=user.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(note)
    return note


def assign_lead(db: Session, lead: Lead, assigned_to_id: int, assigned_by: User) -> Lead:
    assignee = db.query(User).filter(
        User.id == assigned_to_id,
        User.is_active.is_(True),
        User.role.in_([RoleEnum.MANAGER, RoleEnum.EMPLOYEE]),
    ).first()
    if assignee is None:
        raise HTTPException(status_code=404, detail="Assignable user not found")
    assignee_company_id = _get_company_id_for_user(assignee)
    if (
        assigned_by.role != RoleEnum.SUPER_ADMIN
        and assignee_company_id != lead.company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot assign a lead outside its company",
        )
    old_assigned_to = lead.assigned_to_id
    lead.assigned_to_id = assigned_to_id
    lead.updated_by_id = assigned_by.id
    db.add(LeadAssignment(
        lead_id=lead.id,
        assigned_to_id=assigned_to_id,
        assigned_by_id=assigned_by.id,
    ))
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=LeadActivityType.ASSIGNED,
        description=f"Lead assigned to user {assigned_to_id}",
        created_by_id=assigned_by.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(lead)

    if assigned_to_id:
        send_notification(
            db=db,
            user_id=assigned_to_id,
            notif_type="LEAD_ASSIGNED",
            message=f"You were assigned a new lead: {lead.name}",
            email_subject="New Lead Assigned",
        )

    log_audit(db, assigned_by.id, "LEAD", lead.id, "ASSIGN", {"from": old_assigned_to, "to": assigned_to_id})
    return lead


def reject_lead(db: Session, lead: Lead, updated_by: User) -> Lead:
    previous_status = lead.status
    lead.status = LeadStatusEnum.LOST
    lead.updated_by_id = updated_by.id
    db.commit()
    db.refresh(lead)

    log_audit(db, updated_by.id, "LEAD", lead.id, "UPDATE", {"status": {"from": previous_status, "to": LeadStatusEnum.LOST}})
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=LeadActivityType.STATUS_CHANGED,
        description="Lead rejected",
        created_by_id=updated_by.id,
    )
    db.add(activity)
    db.commit()
    return lead


def schedule_site_visit(db: Session, lead: Lead, visit_in, current_user: User) -> SiteVisit:
    employee_id = visit_in.employee_id or lead.assigned_to_id or current_user.id
    employee = db.query(User).filter(
        User.id == employee_id,
        User.is_active.is_(True),
        User.role.in_([RoleEnum.MANAGER, RoleEnum.EMPLOYEE]),
    ).first()
    if employee is None:
        raise HTTPException(status_code=404, detail="Visit employee not found")
    if (
        current_user.role != RoleEnum.SUPER_ADMIN
        and _get_company_id_for_user(employee) != lead.company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot schedule a visit outside the lead company",
        )
    if lead.status in [LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED]:
        lead.status = LeadStatusEnum.VISIT_SCHEDULED
        lead.updated_by_id = current_user.id

    visit = SiteVisit(
        lead_id=lead.id,
        scheduled_at=visit_in.scheduled_at,
        employee_id=employee_id,
    )
    db.add(visit)
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=LeadActivityType.UPDATED,
        description="Site visit scheduled",
        created_by_id=current_user.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(visit)

    send_notification(
        db=db,
        user_id=visit.employee_id,
        notif_type="SITE_VISIT_SCHEDULED",
        message=f"A site visit is scheduled for lead {lead.name} at {visit.scheduled_at}",
        email_subject="New Site Visit Scheduled",
        category="VISITS",
        priority="HIGH"
    )

    return visit
