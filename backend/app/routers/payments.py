import os
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum
from app.schemas.payments import PaymentCreate, PaymentMarkReceived, PaymentOut

# Reportlab imports
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors

router = APIRouter()

def get_payment_or_404(db: Session, payment_id: int):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
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
    return payment

@router.patch("/{payment_id}/mark-received", response_model=PaymentOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def mark_payment_received(payment_id: int, payload: PaymentMarkReceived, db: Session = Depends(get_db)):
    payment = get_payment_or_404(db, payment_id)
    
    if payment.status == PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Payment is already marked as received")
        
    payment.status = PaymentStatusEnum.RECEIVED
    payment.mode = payload.mode
    payment.receipt_number = payload.receipt_number
    payment.received_date = date.today()
    
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/", response_model=List[PaymentOut])
def get_payments(
    status_filter: Optional[PaymentStatusEnum] = None, 
    booking_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Payment)
    
    if booking_id:
        query = query.filter(Payment.booking_id == booking_id)
        
    payments = query.all()
    
    # Dynamically compute overdue status for pending payments
    today = date.today()
    for p in payments:
        if p.status == PaymentStatusEnum.PENDING and p.due_date and p.due_date < today:
            p.status = PaymentStatusEnum.OVERDUE
            # Optionally persist this, but we'll just return it dynamically to avoid DB churn
            
    if status_filter:
        payments = [p for p in payments if p.status == status_filter]
        
    return payments

@router.post("/{payment_id}/generate-receipt")
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
    c.drawString(1 * inch, y, f"Status:      RECEIVED")
    
    # Amount box
    y -= 44
    c.setFillColor(colors.HexColor("#f0f4ff"))
    c.roundRect(1 * inch, y - 10, width - 2 * inch, 44, 8, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e3a5f"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1.3 * inch, y + 12, f"Amount Received: ₹ {payment.amount:,.2f}")
    
    # Footer
    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 0.5 * inch, "This is a computer-generated receipt. No signature required.")
    
    c.save()
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_name,
        headers={"Content-Disposition": f"inline; filename={file_name}"}
    )

@router.post("/{payment_id}/reminder")
def send_reminder(payment_id: int, db: Session = Depends(get_db)):
    payment = get_payment_or_404(db, payment_id)
    
    if payment.status == PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Cannot send reminder for received payment")
        
    # Mocking the notification service
    # In reality this would create a Notification record and trigger AWS SNS/Twilio etc.
    customer_name = payment.booking.customer.name if payment.booking and payment.booking.customer else "Customer"
    
    message = f"Reminder sent to {customer_name} for Payment ID #{payment.id} (Amount: Rs. {payment.amount}). Please pay via offline channels."
    
    
    from app.services.notifications import send_notification
    send_notification(
        db=db, 
        user_id=payment.booking.created_by_id, 
        notif_type="PAYMENT_REMINDER", 
        message=f"Reminder: Payment #{payment.id} for Booking #{payment.booking_id} is pending/overdue.",
        email_subject="Payment Reminder"
    )
    
    return {"message": "Reminder sent successfully"}
