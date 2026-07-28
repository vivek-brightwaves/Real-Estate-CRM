from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.projects import Unit, UnitStatusEnum
from app.models.customers import Customer, DocStatusEnum
from app.models.sales import Booking, Payment, BookingStatusEnum, PaymentStatusEnum
from app.models.system import ApprovalRequest, ApprovalTypeEnum, ApprovalStatusEnum, AuditActionEnum
from app.schemas.bookings import BookingCreate, BookingOut, DiscountOut
from app.schemas.system import ApprovalRequestCreate, ApprovalRequestOut
from app.services.audit import log_audit

router = APIRouter()

def get_booking_or_404(db: Session, booking_id: int):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

def _enrich_booking(booking: Booking, db: Session) -> BookingOut:
    """Build a BookingOut response with discount ApprovalRequests and KYC status attached."""
    discount_records = db.query(ApprovalRequest).filter(
        ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT
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

@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(booking_in: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unit = db.query(Unit).filter(Unit.id == booking_in.unit_id).first()
    if not unit or unit.status != UnitStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Unit is not available for booking")
        
    customer = db.query(Customer).filter(Customer.id == booking_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    has_verified_kyc = any(doc.status == DocStatusEnum.VERIFIED for doc in customer.documents)
    if not has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot create booking: Customer KYC documents are missing or unverified.")

    unit.status = UnitStatusEnum.HOLD
    unit.hold_expires_at = datetime.utcnow() + timedelta(hours=24) 
    
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
    
    return _enrich_booking(booking, db)

@router.get("/", response_model=List[BookingOut])
def get_bookings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bookings = db.query(Booking).offset(skip).limit(limit).all()
    return [_enrich_booking(b, db) for b in bookings]

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    return _enrich_booking(booking, db)

@router.patch("/{booking_id}/verify-documents", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def verify_documents(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
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

@router.patch("/{booking_id}/approve", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def approve_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    if booking.status != BookingStatusEnum.DOCS_VERIFIED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve: booking status is '{booking.status}'. Expected 'DOCS_VERIFIED'. Please verify documents first."
        )
    
    enriched = _enrich_booking(booking, db)
    if not enriched.has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot proceed: Customer KYC documents are missing or unverified.")
    
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
    
    # Guard: prevent duplicate pending discount requests for the same booking
    existing = db.query(ApprovalRequest).filter(
        ApprovalRequest.type == ApprovalTypeEnum.DISCOUNT,
        ApprovalRequest.status == ApprovalStatusEnum.PENDING
    ).all()
    duplicate = any(
        isinstance(r.payload, dict) and r.payload.get("booking_id") == booking.id
        for r in existing
    )
    if duplicate:
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

@router.post("/{booking_id}/request-approval", response_model=ApprovalRequestOut)
def request_approval(booking_id: int, payload: ApprovalRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    
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

@router.post("/{booking_id}/request-discount", response_model=ApprovalRequestOut)
def request_discount(booking_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias route matching the frontend's /request-discount call."""
    return _handle_discount_request(booking_id, payload, db, current_user)

@router.patch("/{booking_id}/confirm", response_model=BookingOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def confirm_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = get_booking_or_404(db, booking_id)
    
    if booking.status != BookingStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail=f"Cannot confirm: booking status is '{booking.status}'. Booking must be APPROVED first.")
        
    enriched = _enrich_booking(booking, db)
    if not enriched.has_verified_kyc:
        raise HTTPException(status_code=400, detail="Cannot proceed: Customer KYC documents are missing or unverified.")
        
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
    
    booking.status = BookingStatusEnum.CANCELLED
    if booking.unit:
        booking.unit.status = UnitStatusEnum.AVAILABLE
        booking.unit.hold_expires_at = None
        
    db.commit()
    db.refresh(booking)
    
    log_audit(db, current_user.id, "BOOKING", booking.id, AuditActionEnum.UPDATE.value, {"status": "CANCELLED"})
    return _enrich_booking(booking, db)

