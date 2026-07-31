from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import Integer, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from datetime import timedelta

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.customers import Customer, DocStatusEnum
from app.models.sales import Booking, BookingStatusEnum, PaymentStatusEnum
from app.models.system import ApprovalRequest, ApprovalTypeEnum, ApprovalStatusEnum, AuditActionEnum
from app.schemas.bookings import BookingCreate, BookingOut, DiscountOut, DiscountRequest
from app.schemas.system import ApprovalRequestCreate, ApprovalRequestOut
from app.services.audit import log_audit
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

def get_booking_or_404(db: Session, booking_id: int):
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.customer).selectinload(Customer.documents),
            joinedload(Booking.unit),
            joinedload(Booking.created_by),
            selectinload(Booking.payments),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def verify_booking_access(booking: Booking, current_user: User) -> None:
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    if current_user.role == RoleEnum.MANAGER:
        if (
            booking.created_by
            and booking.created_by.branch_id != current_user.branch_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this booking",
            )
        return
    if booking.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this booking",
        )

def _enrich_booking(
    booking: Booking,
    db: Session,
    discount_records: Optional[list[ApprovalRequest]] = None,
) -> BookingOut:
    """Build a BookingOut response with discount ApprovalRequests and KYC status attached."""
    if discount_records is None:
        discount_records = db.query(ApprovalRequest).filter(
            ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
            func.json_extract(
                ApprovalRequest.payload,
                "$.booking_id",
            ).cast(Integer)
            == booking.id,
        ).all()
    # Filter those whose payload contains this booking_id
    discounts = [
        DiscountOut(
            id=d.id,
            status=d.status,
            requested_by_id=d.requested_by_id,
            approved_by_id=d.approved_by_id,
            payload=d.payload
        )
        for d in discount_records
        if isinstance(d.payload, dict) and d.payload.get("booking_id") == booking.id
    ]

    # Check KYC status
    has_verified_kyc = False
    if booking.customer and booking.customer.documents:
        has_verified_kyc = any(doc.status == DocStatusEnum.VERIFIED for doc in booking.customer.documents)

    out = BookingOut.model_validate(booking)
    out.discounts = discounts
    out.has_verified_kyc = has_verified_kyc
    return out

@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(booking_in: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unit_query = (
        db.query(Unit)
        .join(Unit.block)
        .join(Block.tower)
        .join(Tower.project)
        .filter(Unit.id == booking_in.unit_id)
    )
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        unit_query = unit_query.filter(Project.branch_id == current_user.branch_id)
    unit = unit_query.with_for_update().first()
    if not unit or unit.status != UnitStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Unit is not available for booking")

    customer = (
        db.query(Customer)
        .options(joinedload(Customer.assigned_to), selectinload(Customer.documents))
        .filter(Customer.id == booking_in.customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if (
        current_user.role == RoleEnum.EMPLOYEE
        and customer.assigned_to_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create a booking for this customer",
        )
    if (
        current_user.role == RoleEnum.MANAGER
        and customer.assigned_to
        and customer.assigned_to.branch_id != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create a booking for this customer",
        )

    has_verified_kyc = any(doc.status == DocStatusEnum.VERIFIED for doc in customer.documents)
    if not has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot create booking: Customer KYC documents are missing or unverified.")

    unit.status = UnitStatusEnum.HOLD
    unit.hold_expires_at = utcnow() + timedelta(hours=24)

    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        created_by_id=current_user.id,
        status=BookingStatusEnum.PENDING
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Audit Logging
    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.CREATE.value, {"unit_id": unit.id, "customer_id": customer.id})

    from app.services.notifications import send_notification
    send_notification(
        db=db,
        user_id=booking.created_by_id,
        notif_type="BOOKING_CREATED",
        message=f"Booking #{booking.id} created successfully.",
        email_subject="New Booking Created",
        category="BOOKINGS",
        priority="NORMAL"
    )

    return _enrich_booking(booking, db)

@router.get("", response_model=List[BookingOut])
def get_bookings(
    response: Response,
    booking_status: Optional[BookingStatusEnum] = Query(None, alias="status"),
    customer_id: Optional[int] = None,
    unit_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Booking).options(
        joinedload(Booking.customer).selectinload(Customer.documents),
        joinedload(Booking.unit),
        joinedload(Booking.created_by),
        selectinload(Booking.payments),
    )
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(Booking.created_by_id == current_user.id)
    elif current_user.role == RoleEnum.MANAGER:
        query = query.join(Booking.created_by).filter(
            User.branch_id == current_user.branch_id
        )
    if booking_status:
        query = query.filter(Booking.status == booking_status)
    if customer_id is not None:
        query = query.filter(Booking.customer_id == customer_id)
    if unit_id is not None:
        query = query.filter(Booking.unit_id == unit_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.join(Booking.customer).filter(
            or_(Customer.name.ilike(term), Customer.email.ilike(term))
        )
    query = apply_sort(
        query,
        model=Booking,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "created_at", "status", "customer_id", "unit_id"},
        tie_breaker=Booking.id,
    )
    bookings, _ = paginate(query, page=page, size=size, response=response)
    booking_ids = [booking.id for booking in bookings]
    discounts = (
        db.query(ApprovalRequest)
        .filter(
            ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
            func.json_extract(
                ApprovalRequest.payload,
                "$.booking_id",
            )
            .cast(Integer)
            .in_(booking_ids),
        )
        .all()
        if booking_ids
        else []
    )
    return [_enrich_booking(booking, db, discounts) for booking in bookings]

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)
    return _enrich_booking(booking, db)

@router.patch("/{booking_id}/verify-documents", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def verify_documents(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)
    if booking.status != BookingStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot verify documents: booking is already '{booking.status}'. Only PENDING bookings can be verified.")

    enriched = _enrich_booking(booking, db)
    if not enriched.has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot proceed: Customer KYC documents are missing or unverified.")

    booking.status = BookingStatusEnum.DOCS_VERIFIED
    db.commit()
    db.refresh(booking)

    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.UPDATE.value, {"status": "DOCS_VERIFIED"})
    return _enrich_booking(booking, db)

@router.patch("/{booking_id}/approve", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def approve_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)
    if booking.status != BookingStatusEnum.DOCS_VERIFIED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve: booking status is '{booking.status}'. Expected 'DOCS_VERIFIED'. Please verify documents first."
        )

    enriched = _enrich_booking(booking, db)
    if not enriched.has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot proceed: Customer KYC documents are missing or unverified.")

    pending_discount = db.query(ApprovalRequest.id).filter(
        ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
        ApprovalRequest.status.in_(
            [ApprovalStatusEnum.PENDING, ApprovalStatusEnum.UNDER_REVIEW]
        ),
        func.json_extract(
            ApprovalRequest.payload,
            "$.booking_id",
        ).cast(Integer)
        == booking.id,
    ).first()
    if pending_discount:
        raise HTTPException(
            status_code=409,
            detail="Pending discount approval must be resolved before booking approval",
        )

    booking.status = BookingStatusEnum.APPROVED
    booking.approved_by_id = current_user.id

    if booking.unit:
        booking.unit.status = UnitStatusEnum.BOOKED
        booking.unit.hold_expires_at = None

    db.commit()
    db.refresh(booking)

    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.UPDATE.value, {"status": "APPROVED"})

    from app.services.notifications import send_notification
    send_notification(
        db=db,
        user_id=booking.created_by_id,
        notif_type="BOOKING_APPROVED",
        message=f"Your booking request #{booking.id} has been approved.",
        email_subject="Booking Approved"
    )

    return _enrich_booking(booking, db)

def _handle_discount_request(booking_id: int, payload: dict, db: Session, current_user: User) -> ApprovalRequestOut:
    """Shared logic for requesting a discount. Guards against duplicate pending requests."""
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)

    # Guard: prevent duplicate pending discount requests for the same booking
    existing = db.query(ApprovalRequest.id).filter(
        ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
        ApprovalRequest.status == ApprovalStatusEnum.PENDING,
        func.json_extract(
            ApprovalRequest.payload,
            "$.booking_id",
        ).cast(Integer)
        == booking.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A discount request is already pending for this booking.")

    approval = ApprovalRequest(
        type=ApprovalTypeEnum.DISCOUNT,
        requested_by_id=current_user.id,
        payload={"booking_id": booking.id, **payload},
        status=ApprovalStatusEnum.PENDING
    )

    # Auto-approve if discount < 5% of unit price
    if booking.unit and booking.unit.price:
        threshold = float(booking.unit.price) * 0.05
        discount_amount = float(payload.get("amount", 0))
        if discount_amount <= threshold:
            approval.status = ApprovalStatusEnum.APPROVED
            approval.approved_by_id = current_user.id

    db.add(approval)
    db.commit()
    db.refresh(approval)

    log_audit(db, current_user.id, "APPROVAL", approval.id, AuditActionEnum.CREATE.value, {"type": ApprovalTypeEnum.DISCOUNT, "payload": approval.payload})
    return approval

@router.post(
    "/{booking_id}/request-approval",
    response_model=ApprovalRequestOut,
    status_code=status.HTTP_201_CREATED,
)
def request_approval(booking_id: int, payload: ApprovalRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)

    if payload.type == ApprovalTypeEnum.DISCOUNT:
        return _handle_discount_request(booking_id, payload.payload, db, current_user)

    # Non-discount approval requests
    approval = ApprovalRequest(
        type=payload.type,
        requested_by_id=current_user.id,
        payload={"booking_id": booking.id, **payload.payload},
        status=ApprovalStatusEnum.PENDING
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)

    log_audit(db, current_user.id, "APPROVAL", approval.id, AuditActionEnum.CREATE.value, {"type": payload.type, "payload": approval.payload})
    return approval

@router.post(
    "/{booking_id}/request-discount",
    response_model=ApprovalRequestOut,
    status_code=status.HTTP_201_CREATED,
)
def request_discount(booking_id: int, payload: DiscountRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias route matching the frontend's /request-discount call."""
    return _handle_discount_request(
        booking_id,
        payload.model_dump(exclude_none=True),
        db,
        current_user,
    )

@router.patch("/{booking_id}/confirm", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def confirm_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)

    if booking.status != BookingStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail=f"Cannot confirm: booking status is '{booking.status}'. Booking must be APPROVED first.")

    enriched = _enrich_booking(booking, db)
    if not enriched.has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot proceed: Customer KYC documents are missing or unverified.")

    pending_discount = db.query(ApprovalRequest.id).filter(
        ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
        ApprovalRequest.status.in_(
            [ApprovalStatusEnum.PENDING, ApprovalStatusEnum.UNDER_REVIEW]
        ),
        func.json_extract(
            ApprovalRequest.payload,
            "$.booking_id",
        ).cast(Integer)
        == booking.id,
    ).first()
    if pending_discount:
        raise HTTPException(
            status_code=409,
            detail="Pending discount approval must be resolved before booking approval",
        )

    if not any(
        payment.status == PaymentStatusEnum.RECEIVED
        for payment in booking.payments
    ):
        raise HTTPException(
            status_code=409,
            detail="At least one verified payment is required before confirmation",
        )

    booking.status = BookingStatusEnum.CONFIRMED
    if booking.unit:
        booking.unit.status = UnitStatusEnum.SOLD

    db.commit()
    db.refresh(booking)

    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.UPDATE.value, {"status": "CONFIRMED"})
    return _enrich_booking(booking, db)

@router.patch("/{booking_id}/cancel", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    verify_booking_access(booking, current_user)
    if booking.status == BookingStatusEnum.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = BookingStatusEnum.CANCELLED
    if booking.unit:
        booking.unit.status = UnitStatusEnum.AVAILABLE
        booking.unit.hold_expires_at = None

    db.commit()
    db.refresh(booking)

    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.UPDATE.value, {"status": "CANCELLED"})

    from app.services.notifications import send_notification
    send_notification(
        db=db,
        user_id=booking.created_by_id,
        notif_type="BOOKING_CANCELLED",
        message=f"Booking #{booking.id} has been cancelled.",
        email_subject="Booking Cancelled",
        category="BOOKINGS",
        priority="HIGH"
    )

    return _enrich_booking(booking, db)

