from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.system import ApprovalRequest, ApprovalStatusEnum, AuditLog
from app.schemas.system import ApprovalRequestOut, AuditLogOut
from app.services.audit import log_audit

router = APIRouter()

# Approvals

@router.get("/approvals", response_model=List[ApprovalRequestOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def get_approvals(db: Session = Depends(get_db)):
    return db.query(ApprovalRequest).order_by(ApprovalRequest.created_at.desc()).all()

@router.patch("/approvals/{approval_id}/action", response_model=ApprovalRequestOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def action_approval(approval_id: int, action: str = Query(..., description="APPROVE or REJECT"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    if approval.status != ApprovalStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Only pending requests can be actioned")
        
    if action == "APPROVE":
        approval.status = ApprovalStatusEnum.APPROVED
    elif action == "REJECT":
        approval.status = ApprovalStatusEnum.REJECTED
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    approval.approved_by_id = current_user.id
    db.commit()
    db.refresh(approval)
    
    log_audit(db, current_user.id, "APPROVAL", approval.id, "UPDATE", {"status": approval.status.value})
    
    return approval

@router.patch("/approvals/{approval_id}/approve", response_model=ApprovalRequestOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def approve_approval(approval_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias: PATCH /system/approvals/{id}/approve — approves a pending discount/approval request."""
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != ApprovalStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve: request is already '{approval.status}'.")

    approval.status = ApprovalStatusEnum.APPROVED
    approval.approved_by_id = current_user.id
    db.commit()
    db.refresh(approval)

    log_audit(db, current_user.id, "APPROVAL", approval.id, "UPDATE", {"status": "APPROVED"})
    return approval

@router.patch("/approvals/{approval_id}/reject", response_model=ApprovalRequestOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def reject_approval(approval_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias: PATCH /system/approvals/{id}/reject — rejects a pending discount/approval request."""
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != ApprovalStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot reject: request is already '{approval.status}'.")

    approval.status = ApprovalStatusEnum.REJECTED
    approval.approved_by_id = current_user.id
    db.commit()
    db.refresh(approval)

    log_audit(db, current_user.id, "APPROVAL", approval.id, "UPDATE", {"status": "REJECTED"})
    return approval


# Audit Logs

@router.get("/audit-logs", response_model=List[AuditLogOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def get_audit_logs(
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
        
    return query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
