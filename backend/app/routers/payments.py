import os
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum
from app.schemas.payments import PaymentCreate, PaymentMarkReceived, PaymentOut

# Reportlab imports
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

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
def generate_receipt(payment_id: int, db: Session = Depends(get_db)):
    payment = get_payment_or_404(db, payment_id)
    
    if payment.status != PaymentStatusEnum.RECEIVED:
        raise HTTPException(status_code=400, detail="Receipts can only be generated for RECEIVED payments")
        
    # Generate PDF
    file_name = f"receipt_{payment.id}.pdf"
    file_path = os.path.join("uploads", "receipts", file_name)
    
    c = canvas.Canvas(file_path, pagesize=letter)
    
    # Draw simple receipt
    c.setFont("Helvetica-Bold", 24)
    c.drawString(1 * inch, 10 * inch, "PAYMENT RECEIPT")
    
    c.setFont("Helvetica", 12)
    c.drawString(1 * inch, 9 * inch, f"Receipt No: {payment.receipt_number or 'N/A'}")
    c.drawString(1 * inch, 8.5 * inch, f"Date: {payment.received_date}")
    
    c.drawString(1 * inch, 7.5 * inch, f"Booking ID: {payment.booking_id}")
    c.drawString(1 * inch, 7 * inch, f"Customer ID: {payment.booking.customer_id if payment.booking else 'N/A'}")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1 * inch, 6 * inch, f"Amount Received: Rs. {payment.amount}")
    
    c.setFont("Helvetica", 12)
    c.drawString(1 * inch, 5.5 * inch, f"Payment Mode: {payment.mode.value if payment.mode else 'N/A'}")
    
    c.drawString(1 * inch, 4 * inch, "Thank you for your business.")
    c.save()
    
    return {"receipt_url": f"/uploads/receipts/{file_name}"}

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
