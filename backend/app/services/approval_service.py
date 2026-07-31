import logging
from sqlalchemy.orm import Session
from app.models.system import ApprovalRequest, ApprovalTypeEnum, ApprovalStatusEnum
from app.models.users import User, RoleEnum
from app.services.audit import log_audit
from app.services.notifications import send_notification

logger = logging.getLogger(__name__)

# Configurable auto-approve thresholds
AUTO_APPROVE_RULES = {
    ApprovalTypeEnum.DISCOUNT: {"max_amount": 5000},
    ApprovalTypeEnum.PRICE_REVISION: {"max_percentage": 2.0}
}

# Multi-level escalation thresholds
ESCALATION_RULES = {
    ApprovalTypeEnum.DISCOUNT: {"requires_l2_above": 50000}
}

def get_manager_for_user(db: Session, user: User) -> User:
    """Finds the manager for a given user's branch."""
    if user.role in [RoleEnum.MANAGER, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
        # If they are already high level, assign to SUPER_ADMIN
        return db.query(User).filter(
            User.role == RoleEnum.SUPER_ADMIN,
            User.is_active.is_(True),
        ).first()

    manager = db.query(User).filter(
        User.branch_id == user.branch_id,
        User.role == RoleEnum.MANAGER,
        User.is_active.is_(True),
    ).first()
    if not manager:
        manager = db.query(User).filter(
            User.role == RoleEnum.SUPER_ADMIN,
            User.is_active.is_(True),
        ).first()
    return manager

def get_super_admin(db: Session) -> User:
    return db.query(User).filter(
        User.role == RoleEnum.SUPER_ADMIN,
        User.is_active.is_(True),
    ).first()

def create_approval_request(db: Session, req_type: ApprovalTypeEnum, payload: dict, requested_by: User) -> ApprovalRequest:
    # 1. Check Auto-Approve Rules
    auto_approve = False
    if req_type == ApprovalTypeEnum.DISCOUNT:
        amount = float(payload.get("amount", 0))
        if amount <= AUTO_APPROVE_RULES[req_type]["max_amount"]:
            auto_approve = True

    if auto_approve:
        approval = ApprovalRequest(
            type=req_type,
            status=ApprovalStatusEnum.AUTO_APPROVED,
            requested_by_id=requested_by.id,
            payload=payload,
            remarks="Auto-approved by system rules"
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)
        log_audit(db, requested_by.id, "APPROVAL", approval.id, "CREATE", {"status": "AUTO_APPROVED"})

        send_notification(db, requested_by.id, "APPROVAL_AUTO_APPROVED", f"Your {req_type.value} request was automatically approved.", category="APPROVALS")
        return approval

    # 2. Assign Approver (Level 1)
    assignee = get_manager_for_user(db, requested_by)

    approval = ApprovalRequest(
        type=req_type,
        status=ApprovalStatusEnum.PENDING,
        requested_by_id=requested_by.id,
        assigned_approver_id=assignee.id if assignee else None,
        level=1,
        payload=payload
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)

    log_audit(db, requested_by.id, "APPROVAL", approval.id, "CREATE", {"status": "PENDING", "assigned_to": assignee.id if assignee else None})

    if assignee:
        send_notification(db, assignee.id, "APPROVAL_PENDING", f"New {req_type.value} request requires your approval.", category="APPROVALS", priority="HIGH")

    return approval

def process_approval(db: Session, approval: ApprovalRequest, action: str, remarks: str, processed_by: User) -> ApprovalRequest:
    old_status = approval.status

    if action == "APPROVE":
        # Check escalation rules
        escalate = False
        if approval.type == ApprovalTypeEnum.DISCOUNT:
            amount = float(approval.payload.get("amount", 0))
            if amount > ESCALATION_RULES[approval.type]["requires_l2_above"] and approval.level == 1:
                escalate = True

        if escalate:
            # Escalate to Level 2
            next_approver = get_super_admin(db)
            approval.level = 2
            approval.status = ApprovalStatusEnum.UNDER_REVIEW
            approval.assigned_approver_id = next_approver.id if next_approver else None
            approval.remarks = f"L1 Approved by {processed_by.name}. Escalated to L2. Remarks: {remarks}"

            if next_approver:
                send_notification(db, next_approver.id, "APPROVAL_ESCALATED", f"{approval.type.value} request escalated to Level 2.", category="APPROVALS", priority="HIGH")
        else:
            # Final Approval
            approval.status = ApprovalStatusEnum.APPROVED
            approval.approved_by_id = processed_by.id
            approval.assigned_approver_id = None
            approval.remarks = remarks

            send_notification(db, approval.requested_by_id, "APPROVAL_APPROVED", f"Your {approval.type.value} request #{approval.id} has been APPROVED.", category="APPROVALS", priority="HIGH")

    elif action == "REJECT":
        approval.status = ApprovalStatusEnum.REJECTED
        approval.remarks = remarks
        approval.assigned_approver_id = None
        send_notification(db, approval.requested_by_id, "APPROVAL_REJECTED", f"Your {approval.type.value} request #{approval.id} has been REJECTED. Reason: {remarks}", category="APPROVALS")

    elif action == "CANCEL":
        previous_approver_id = approval.assigned_approver_id
        approval.status = ApprovalStatusEnum.CANCELLED
        approval.remarks = remarks
        approval.assigned_approver_id = None
        # Notify the assigned approver that it was cancelled
        if previous_approver_id:
            send_notification(db, previous_approver_id, "APPROVAL_CANCELLED", f"Request #{approval.id} was cancelled by the requester.", category="APPROVALS")

    else:
        raise ValueError("Invalid action")

    db.commit()
    db.refresh(approval)

    log_audit(db, processed_by.id, "APPROVAL", approval.id, "UPDATE", {
        "status": {"from": old_status.value, "to": approval.status.value},
        "remarks": remarks
    })

    return approval
