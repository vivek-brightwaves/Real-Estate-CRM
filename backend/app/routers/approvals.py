from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.users import User, RoleEnum
from app.models.system import (
    ApprovalRequest,
    ApprovalStatusEnum,
    ApprovalTypeEnum,
    AuditLog,
)
from app.schemas.approvals import ApprovalRequestCreate, ApprovalRequestOut, ApprovalHistoryOut
from app.services.approval_service import create_approval_request, process_approval
from app.api.query import apply_sort, paginate

router = APIRouter()

def get_approval_or_404(db: Session, approval_id: int) -> ApprovalRequest:
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return approval

def check_permission(approval: ApprovalRequest, current_user: User, action: str):
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return True
    if action in ["APPROVE", "REJECT"] and approval.assigned_approver_id == current_user.id:
        return True
    if action == "CANCEL" and approval.requested_by_id == current_user.id:
        return True
    if action == "VIEW" and (
        approval.requested_by_id == current_user.id
        or approval.assigned_approver_id == current_user.id
        or current_user.role == RoleEnum.ADMIN
    ):
        return True
    raise HTTPException(status_code=403, detail="Not authorized to perform this action on this request.")

@router.post("", response_model=ApprovalRequestOut, status_code=201)
def create_request(payload: ApprovalRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_approval_request(db, payload.type, payload.payload, current_user)

@router.get("", response_model=List[ApprovalRequestOut])
def list_requests(
    response: Response,
    approval_status: Optional[ApprovalStatusEnum] = Query(None, alias="status"),
    approval_type: Optional[ApprovalTypeEnum] = Query(None, alias="type"),
    as_approver: bool = False,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ApprovalRequest)

    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        if as_approver:
            query = query.filter(ApprovalRequest.assigned_approver_id == current_user.id)
        else:
            query = query.filter(ApprovalRequest.requested_by_id == current_user.id)

    if approval_status:
        query = query.filter(ApprovalRequest.status == approval_status)
    if approval_type:
        query = query.filter(ApprovalRequest.type == approval_type)
    if search:
        query = query.filter(
            ApprovalRequest.remarks.ilike(f"%{search.strip()}%")
        )
    query = apply_sort(
        query,
        model=ApprovalRequest,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "created_at", "updated_at", "status", "type", "level"},
        tie_breaker=ApprovalRequest.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.get("/{approval_id}", response_model=ApprovalRequestOut)
def get_request(approval_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    approval = get_approval_or_404(db, approval_id)
    check_permission(approval, current_user, "VIEW")
    return approval

@router.patch("/{approval_id}/approve", response_model=ApprovalRequestOut)
def approve_request(approval_id: int, remarks: str = Query(..., description="Remarks for approval"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    approval = get_approval_or_404(db, approval_id)
    check_permission(approval, current_user, "APPROVE")
    if approval.status not in [
        ApprovalStatusEnum.PENDING,
        ApprovalStatusEnum.UNDER_REVIEW,
    ]:
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status {approval.status.value}")
    return process_approval(db, approval, "APPROVE", remarks, current_user)

@router.patch("/{approval_id}/reject", response_model=ApprovalRequestOut)
def reject_request(approval_id: int, remarks: str = Query(..., description="Reason for rejection"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    approval = get_approval_or_404(db, approval_id)
    check_permission(approval, current_user, "REJECT")
    if approval.status not in [
        ApprovalStatusEnum.PENDING,
        ApprovalStatusEnum.UNDER_REVIEW,
    ]:
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status {approval.status.value}")
    return process_approval(db, approval, "REJECT", remarks, current_user)

@router.patch("/{approval_id}/cancel", response_model=ApprovalRequestOut)
def cancel_request(approval_id: int, remarks: str = Query("Cancelled by user"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    approval = get_approval_or_404(db, approval_id)
    check_permission(approval, current_user, "CANCEL")
    if approval.status not in [
        ApprovalStatusEnum.PENDING,
        ApprovalStatusEnum.UNDER_REVIEW,
    ]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel request with status {approval.status.value}")
    return process_approval(db, approval, "CANCEL", remarks, current_user)

@router.get("/{approval_id}/history", response_model=List[ApprovalHistoryOut])
def get_request_history(
    approval_id: int,
    response: Response,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    approval = get_approval_or_404(db, approval_id)
    check_permission(approval, current_user, "VIEW")

    query = db.query(AuditLog).filter(
        AuditLog.entity_type == "APPROVAL",
        AuditLog.entity_id == approval_id
    )
    total = query.count()
    logs = (
        query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)
    return logs
