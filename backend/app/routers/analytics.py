from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum, BookingStatusEnum
from app.models.leads import Lead, LeadStatusEnum

router = APIRouter()

@router.get("/summary", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def get_analytics_summary(db: Session = Depends(get_db)):
    # Revenue (Received Payments)
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatusEnum.RECEIVED).scalar() or 0.0
    
    # Outstanding (Pending + Overdue)
    outstanding_collections = db.query(func.sum(Payment.amount)).filter(
        Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])
    ).scalar() or 0.0

    # Leads
    total_leads = db.query(Lead).count()
    converted_leads = db.query(Lead).filter(Lead.status == LeadStatusEnum.CONVERTED).count()
    active_leads = total_leads - converted_leads
    
    # Bookings
    total_bookings = db.query(Booking).count()
    confirmed_bookings = db.query(Booking).filter(Booking.status == BookingStatusEnum.CONFIRMED).count()

    return {
        "revenue": float(total_revenue),
        "outstanding": float(outstanding_collections),
        "leads": {
            "total": total_leads,
            "active": active_leads,
            "converted": converted_leads
        },
        "bookings": {
            "total": total_bookings,
            "confirmed": confirmed_bookings
        }
    }

@router.get("/lead-funnel", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def get_lead_funnel(db: Session = Depends(get_db)):
    # Group leads by status
    results = db.query(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    
    # Format for recharts
    data = []
    for status, count in results:
        data.append({"name": status.value, "count": count})
        
    return data

@router.get("/revenue-trends", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def get_revenue_trends(db: Session = Depends(get_db)):
    # Group received payments by month for the last 6 months (mocked as simple grouping by date for now)
    six_months_ago = date.today() - timedelta(days=180)
    
    results = db.query(
        func.date_format(Payment.received_date, '%Y-%m').label('month'),
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatusEnum.RECEIVED,
        Payment.received_date >= six_months_ago
    ).group_by('month').order_by('month').all()
    
    data = []
    for month, amount in results:
        if month: # Ensure it's not null
            data.append({"month": month, "amount": float(amount)})
            
    # If no data, return some empty months just so chart renders something
    if not data:
        data = [
            {"month": "2024-01", "amount": 0},
            {"month": "2024-02", "amount": 0},
            {"month": "2024-03", "amount": 0}
        ]
        
    return data
