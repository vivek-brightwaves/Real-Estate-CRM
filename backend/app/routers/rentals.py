from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.rentals import (
    InvoiceStatusEnum,
    RentalInvoice,
    Tenant,
    LeaseAgreement,
    LeaseStatusEnum,
)
from app.models.users import User, RoleEnum
from app.models.projects import Block, Project, Tower, Unit
from app.services.audit import log_audit
from app.schemas.rentals import (
    LeaseCreate,
    LeaseCreateOut,
    LeaseDetailOut,
    LeaseOut,
    LeaseStatusUpdate,
    RentalInvoiceOut,
    RentalInvoicePayment,
)
from app.api.query import apply_sort, paginate
from app.core.time import utcnow

ALLOWED_RENTAL_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
]
router = APIRouter(
    dependencies=[Depends(deps.require_roles(ALLOWED_RENTAL_ROLES))]
)


def scope_lease_query(query, current_user: User):
    if current_user.role != RoleEnum.MANAGER:
        return query
    return (
        query.join(LeaseAgreement.unit)
        .join(Unit.block)
        .join(Block.tower)
        .join(Tower.project)
        .filter(Project.branch_id == current_user.branch_id)
    )


@router.post(
    "/lease",
    response_model=LeaseCreateOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/leases",
    response_model=LeaseCreateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_lease(
    lease_in: LeaseCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    unit_query = (
        db.query(Unit)
        .join(Unit.block)
        .join(Block.tower)
        .join(Tower.project)
        .filter(Unit.id == lease_in.unit_id)
    )
    if current_user.role == RoleEnum.MANAGER:
        unit_query = unit_query.filter(Project.branch_id == current_user.branch_id)
    if unit_query.with_for_update().first() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    overlap = db.query(LeaseAgreement.id).filter(
        LeaseAgreement.unit_id == lease_in.unit_id,
        LeaseAgreement.status == LeaseStatusEnum.ACTIVE,
        LeaseAgreement.start_date <= lease_in.end_date,
        LeaseAgreement.end_date >= lease_in.start_date,
    ).first()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active lease already covers the requested date range",
        )

    tenant = Tenant(
        name=lease_in.tenant_name,
        email=str(lease_in.tenant_email) if lease_in.tenant_email else None,
        phone=lease_in.tenant_phone,
    )
    db.add(tenant)
    db.flush()

    lease = LeaseAgreement(
        unit_id=lease_in.unit_id,
        tenant_id=tenant.id,
        start_date=lease_in.start_date,
        end_date=lease_in.end_date,
        rent_amount=lease_in.rent_amount,
        security_deposit=lease_in.security_deposit,
        status=LeaseStatusEnum.ACTIVE
    )
    db.add(lease)
    db.commit()
    db.refresh(lease)
    log_audit(db, current_user.id, "RENTAL", lease.id, "LEASE_CREATED", new_values={"unit_id": lease.unit_id, "tenant_id": tenant.id})

    return {"status": "success", "lease": {"id": lease.id, "tenant_id": tenant.id}}

@router.get(
    "/lease/{lease_id}",
    response_model=LeaseDetailOut,
    include_in_schema=False,
)
@router.get("/leases/{lease_id}", response_model=LeaseDetailOut)
def get_lease(
    lease_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    lease = scope_lease_query(
        db.query(LeaseAgreement).filter(LeaseAgreement.id == lease_id),
        current_user,
    ).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    return {"status": "success", "lease": {"id": lease.id, "unit_id": lease.unit_id, "status": lease.status}}


@router.get("/leases", response_model=list[LeaseOut])
def list_leases(
    response: Response,
    lease_status: Optional[LeaseStatusEnum] = Query(None, alias="status"),
    unit_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = scope_lease_query(
        db.query(LeaseAgreement).join(LeaseAgreement.tenant),
        current_user,
    )
    if lease_status:
        query = query.filter(LeaseAgreement.status == lease_status)
    if unit_id is not None:
        query = query.filter(LeaseAgreement.unit_id == unit_id)
    if search:
        query = query.filter(Tenant.name.ilike(f"%{search.strip()}%"))
    query = apply_sort(
        query,
        model=LeaseAgreement,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "start_date", "end_date", "rent_amount", "status", "created_at"},
        tie_breaker=LeaseAgreement.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items


@router.get("/invoices", response_model=list[RentalInvoiceOut])
def list_invoices(
    response: Response,
    invoice_status: Optional[InvoiceStatusEnum] = Query(None, alias="status"),
    lease_id: Optional[int] = None,
    due_from: Optional[date] = None,
    due_to: Optional[date] = None,
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(RentalInvoice)
    if current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(RentalInvoice.lease)
            .join(LeaseAgreement.unit)
            .join(Unit.block)
            .join(Block.tower)
            .join(Tower.project)
            .filter(Project.branch_id == current_user.branch_id)
        )
    if invoice_status:
        query = query.filter(RentalInvoice.status == invoice_status)
    if lease_id is not None:
        query = query.filter(RentalInvoice.lease_id == lease_id)
    if due_from:
        query = query.filter(RentalInvoice.due_date >= due_from)
    if due_to:
        query = query.filter(RentalInvoice.due_date <= due_to)
    ordering = (
        RentalInvoice.due_date.asc()
        if sort_order == "asc"
        else RentalInvoice.due_date.desc()
    )
    query = query.order_by(ordering, RentalInvoice.id.desc())
    items, _ = paginate(query, page=page, size=size, response=response)
    return items


@router.patch("/leases/{lease_id}/status", response_model=LeaseOut)
def update_lease_status(
    lease_id: int,
    payload: LeaseStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    lease = scope_lease_query(
        db.query(LeaseAgreement).filter(LeaseAgreement.id == lease_id),
        current_user,
    ).first()
    if lease is None:
        raise HTTPException(status_code=404, detail="Lease not found")
    transitions = {
        LeaseStatusEnum.DRAFT: {
            LeaseStatusEnum.ACTIVE,
            LeaseStatusEnum.TERMINATED,
        },
        LeaseStatusEnum.ACTIVE: {
            LeaseStatusEnum.TERMINATED,
            LeaseStatusEnum.EXPIRED,
        },
        LeaseStatusEnum.TERMINATED: set(),
        LeaseStatusEnum.EXPIRED: set(),
    }
    if payload.status not in transitions[lease.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot change lease status from {lease.status.value} to {payload.status.value}",
        )
    old_status = lease.status.value
    lease.status = payload.status
    db.commit()
    db.refresh(lease)
    log_audit(
        db,
        current_user.id,
        "RENTAL",
        lease.id,
        "LEASE_STATUS_CHANGED",
        old_values={"status": old_status},
        new_values={"status": lease.status.value},
    )
    return lease


@router.patch("/invoices/{invoice_id}/mark-paid", response_model=RentalInvoiceOut)
def mark_rental_invoice_paid(
    invoice_id: int,
    payload: RentalInvoicePayment,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(RentalInvoice).filter(RentalInvoice.id == invoice_id)
    if current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(RentalInvoice.lease)
            .join(LeaseAgreement.unit)
            .join(Unit.block)
            .join(Block.tower)
            .join(Tower.project)
            .filter(Project.branch_id == current_user.branch_id)
        )
    invoice = query.first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Rental invoice not found")
    if invoice.status == InvoiceStatusEnum.PAID:
        raise HTTPException(status_code=409, detail="Rental invoice is already paid")
    old_status = invoice.status.value
    invoice.status = InvoiceStatusEnum.PAID
    invoice.paid_at = payload.paid_at or utcnow()
    db.commit()
    db.refresh(invoice)
    log_audit(
        db,
        current_user.id,
        "RENTAL",
        invoice.id,
        "INVOICE_PAID",
        old_values={"status": old_status},
        new_values={"status": invoice.status.value},
    )
    return invoice
