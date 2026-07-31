import os
from typing import List, Literal, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum
from app.schemas.payments import (
    PaymentCreate,
    PaymentMarkReceived,
    PaymentOut,
    PaymentReminderOut,
)
from app.services.audit import log_audit
from app.api.query import apply_sort, paginate

# Reportlab imports
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors

CRM_STAFF_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.EMPLOYEE,
]
router = APIRouter(
    dependencies=[Depends(require_roles(CRM_STAFF_ROLES))]
)

def get_payment_or_404(db: Session, payment_id: int):
    payment = (
        db.query(Payment)
        .options(
            joinedload(Payment.booking).joinedload(Booking.created_by),
            joinedload(Payment.booking).joinedload(Booking.customer),
            joinedload(Payment.booking).joinedload(Booking.unit),
        )
        .filter(Payment.id == payment_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


def verify_payment_access(payment: Payment, current_user: User) -> None:
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    booking = payment.booking
    if booking is None:
        raise HTTPException(status_code=403, detail="Payment has no accessible booking")
    if current_user.role == RoleEnum.MANAGER:
        if booking.created_by and booking.created_by.branch_id == current_user.branch_id:
            return
    elif booking.created_by_id == current_user.id:
        return
    raise HTTPException(status_code=403, detail="Not authorized to access this payment")

@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.created_by))
        .filter(Booking.id == payload.booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if (
        current_user.role == RoleEnum.EMPLOYEE
        and booking.created_by_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to record a payment for this booking",
        )
    if (
        current_user.role == RoleEnum.MANAGER
        and (
            booking.created_by is None
            or booking.created_by.branch_id != current_user.branch_id
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to record a payment for this booking",
        )

    payment = Payment(
        booking_id=booking.id,
        amount=payload.amount,
        due_date=payload.due_date,
        status=PaymentStatusEnum.PENDING,
        recorded_by_id=current_user.id
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)
    log_audit(db, current_user.id, "PAYMENT", payment.id, "CREATE", new_values={"booking_id": booking.id, "amount": float(payment.amount)})
    return payment

@router.patch("/{payment_id}/mark-received", response_model=PaymentOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def mark_payment_received(
    payment_id: int,
    payload: PaymentMarkReceived,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = get_payment_or_404(db, payment_id)
    verify_payment_access(payment, current_user)

    if payment.status == PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Payment is already marked as received")

    old_status = payment.status.value
    payment.status = PaymentStatusEnum.RECEIVED
    payment.mode = payload.mode
    payment.receipt_number = payload.receipt_number
    payment.received_date = date.today()

    db.commit()
    db.refresh(payment)
    log_audit(db, current_user.id, "PAYMENT", payment.id, "RECEIVED", old_values={"status": old_status}, new_values={"status": "RECEIVED", "amount": float(payment.amount)})

    from app.services.notifications import send_notification
    send_notification(
        db=db,
        user_id=payment.booking.created_by_id,
        notif_type="PAYMENT_RECEIVED",
        message=f"Payment #{payment.id} has been marked as RECEIVED.",
        email_subject="Payment Received",
        category="PAYMENTS",
        priority="NORMAL"
    )

    return payment

@router.get("", response_model=List[PaymentOut])
def get_payments(
    response: Response,
    status_filter: Optional[PaymentStatusEnum] = Query(None, alias="status"),
    booking_id: Optional[int] = None,
    due_from: Optional[date] = None,
    due_to: Optional[date] = None,
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "due_date",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if due_from and due_to and due_from > due_to:
        raise HTTPException(
            status_code=422,
            detail="due_from must be on or before due_to",
        )
    if (
        min_amount is not None
        and max_amount is not None
        and min_amount > max_amount
    ):
        raise HTTPException(
            status_code=422,
            detail="min_amount must be less than or equal to max_amount",
        )
    query = db.query(Payment)

    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.join(Payment.booking).filter(
            Booking.created_by_id == current_user.id
        )
    elif current_user.role == RoleEnum.MANAGER:
        query = query.join(Payment.booking).join(Booking.created_by).filter(
            User.branch_id == current_user.branch_id
        )
    if booking_id is not None:
        query = query.filter(Payment.booking_id == booking_id)
    if due_from:
        query = query.filter(Payment.due_date >= due_from)
    if due_to:
        query = query.filter(Payment.due_date <= due_to)
    if min_amount is not None:
        query = query.filter(Payment.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Payment.amount <= max_amount)
    if search:
        query = query.filter(Payment.receipt_number.ilike(f"%{search.strip()}%"))

    today = date.today()
    if status_filter == PaymentStatusEnum.OVERDUE:
        query = query.filter(
            or_(
                Payment.status == PaymentStatusEnum.OVERDUE,
                and_(
                    Payment.status == PaymentStatusEnum.PENDING,
                    Payment.due_date < today,
                ),
            )
        )
    elif status_filter == PaymentStatusEnum.PENDING:
        query = query.filter(
            Payment.status == PaymentStatusEnum.PENDING,
            or_(Payment.due_date.is_(None), Payment.due_date >= today),
        )
    elif status_filter:
        query = query.filter(Payment.status == status_filter)

    query = apply_sort(
        query,
        model=Payment,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "amount", "due_date", "status", "received_date"},
        tie_breaker=Payment.id,
    )
    payments, _ = paginate(query, page=page, size=size, response=response)
    output = []
    for payment in payments:
        item = PaymentOut.model_validate(payment)
        if (
            item.status == PaymentStatusEnum.PENDING
            and item.due_date
            and item.due_date < today
        ):
            item.status = PaymentStatusEnum.OVERDUE
        output.append(item)
    return output

@router.post(
    "/{payment_id}/generate-receipt",
    response_class=FileResponse,
    responses={
        200: {
            "description": "Generated payment receipt.",
            "content": {"application/pdf": {}},
        }
    },
)
def generate_receipt(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Eagerly load booking -> customer and booking -> unit
    payment = (
        db.query(Payment)
        .options(
            joinedload(Payment.booking).joinedload(Booking.customer),
            joinedload(Payment.booking).joinedload(Booking.unit),
        )
        .filter(Payment.id == payment_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    verify_payment_access(payment, current_user)

    if payment.status != PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Receipts can only be generated for RECEIVED payments")

    # Ensure receipts directory exists
    receipts_dir = os.path.join("uploads", "receipts")
    os.makedirs(receipts_dir, exist_ok=True)

    file_name = f"receipt_{payment.id}.pdf"
    file_path = os.path.join(receipts_dir, file_name)

    # Collect enriched data
    booking = payment.booking
    customer = booking.customer if booking else None
    unit = booking.unit if booking else None

    customer_name = customer.name if customer else "N/A"
    customer_phone = customer.phone if customer else "N/A"
    unit_number = unit.unit_number if unit else "N/A"
    unit_type = unit.type if unit else "N/A"

    # Generate PDF with A4 page
    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    # Header background
    c.setFillColor(colors.HexColor("#1e3a5f"))
    c.rect(0, height - 100, width, 100, fill=1, stroke=0)

    # Title
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(1 * inch, height - 55, "PAYMENT RECEIPT")

    c.setFont("Helvetica", 11)
    c.drawRightString(width - 1 * inch, height - 40, f"Receipt No: {payment.receipt_number or f'PMT-{payment.id:05d}'}")
    c.drawRightString(width - 1 * inch, height - 58, f"Date: {payment.received_date or date.today()}")

    # Customer Details section
    y = height - 130
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(1 * inch, y, "Customer Details")
    c.setStrokeColor(colors.HexColor("#1e3a5f"))
    c.line(1 * inch, y - 4, width - 1 * inch, y - 4)

    c.setFont("Helvetica", 11)
    y -= 24
    c.drawString(1 * inch, y, f"Name:  {customer_name}")
    y -= 18
    c.drawString(1 * inch, y, f"Phone: {customer_phone}")

    # Booking / Unit Details
    y -= 36
    c.setFont("Helvetica-Bold", 13)
    c.drawString(1 * inch, y, "Booking & Unit Details")
    c.line(1 * inch, y - 4, width - 1 * inch, y - 4)

    c.setFont("Helvetica", 11)
    y -= 24
    c.drawString(1 * inch, y, f"Booking ID:  #{booking.id if booking else 'N/A'}")
    y -= 18
    c.drawString(1 * inch, y, f"Unit:        {unit_number} ({unit_type})")

    # Payment Details
    y -= 36
    c.setFont("Helvetica-Bold", 13)
    c.drawString(1 * inch, y, "Payment Details")
    c.line(1 * inch, y - 4, width - 1 * inch, y - 4)

    c.setFont("Helvetica", 11)
    y -= 24
    c.drawString(1 * inch, y, f"Payment ID:  #{payment.id}")
    y -= 18
    c.drawString(1 * inch, y, f"Mode:        {payment.mode.value if payment.mode else 'N/A'}")
    y -= 18
    c.drawString(1 * inch, y, "Status:      RECEIVED")

    # Amount box
    y -= 44
    c.setFillColor(colors.HexColor("#f0f4ff"))
    c.roundRect(1 * inch, y - 10, width - 2 * inch, 44, 8, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e3a5f"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1.3 * inch, y + 12, f"Amount Received: INR {payment.amount:,.2f}")

    # Footer
    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 0.5 * inch, "This is a computer-generated receipt. No signature required.")

    c.save()
    log_audit(
        db,
        current_user.id,
        "PAYMENT",
        payment.id,
        "RECEIPT_GENERATED",
        new_values={
            "receipt_number": payment.receipt_number or f"PMT-{payment.id:05d}"
        },
    )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_name,
        headers={"Content-Disposition": f"inline; filename={file_name}"}
    )

@router.post("/{payment_id}/reminder", response_model=PaymentReminderOut)
def send_reminder(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = get_payment_or_404(db, payment_id)
    verify_payment_access(payment, current_user)

    if payment.status == PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Cannot send reminder for received payment")

    from app.services.notifications import send_notification
    booking = payment.booking
    customer = booking.customer if booking else None
    if customer is None:
        raise HTTPException(
            status_code=409,
            detail="Payment booking has no customer for reminder delivery",
        )
    assigned_user_id = customer.assigned_to_id or booking.created_by_id
    customer_contact = customer.email or customer.phone
    notification = send_notification(
        db=db,
        user_id=assigned_user_id,
        notif_type="PAYMENT_REMINDER",
        message=(
            f"Payment reminder for {customer.name}: Payment #{payment.id}, "
            f"Booking #{payment.booking_id}, amount INR {payment.amount:,.2f}, "
            f"due {payment.due_date or 'date not set'}. "
            f"Customer contact: {customer_contact or 'not available'}."
        ),
        email_subject=f"Payment reminder action - Booking #{payment.booking_id}",
        category="PAYMENTS",
        priority="HIGH" if payment.due_date and payment.due_date < date.today() else "NORMAL",
    )
    log_audit(
        db,
        current_user.id,
        "PAYMENT",
        payment.id,
        "REMINDER_CREATED",
        new_values={
            "customer_id": customer.id,
            "customer_contact": customer_contact,
            "assigned_user_id": assigned_user_id,
            "notification_id": notification.id,
            "delivery_status": notification.delivery_status,
        },
    )
    return {
        "message": (
            f"Reminder recorded for {customer.name} and assigned to the "
            "responsible CRM user."
        ),
        "delivery_status": notification.delivery_status,
        "customer_name": customer.name,
        "customer_contact": customer_contact,
        "assigned_user_id": assigned_user_id,
    }
