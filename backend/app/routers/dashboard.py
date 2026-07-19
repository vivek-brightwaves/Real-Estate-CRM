from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum, BookingStatusEnum
from app.models.leads import Lead, LeadStatusEnum, SiteVisit
from app.models.projects import Project

router = APIRouter()

@router.get("/super-admin", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def get_super_admin_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatusEnum.RECEIVED).scalar() or 0.0
    pending_collection = db.query(func.sum(Payment.amount)).filter(Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])).scalar() or 0.0
    
    todays_bookings = db.query(Booking).filter(func.date(Booking.created_at) == today).count()
    total_leads = db.query(Lead).count()
    total_projects = db.query(Project).count()
    
    # Top sales employee (by booking count)
    top_employee_row = db.query(
        Booking.created_by_id, 
        func.count(Booking.id).label('sales_count')
    ).group_by(Booking.created_by_id).order_by(func.count(Booking.id).desc()).first()
    
    top_employee = None
    if top_employee_row:
        emp = db.query(User).filter(User.id == top_employee_row.created_by_id).first()
        top_employee = {"name": emp.name if emp else "Unknown", "sales": top_employee_row.sales_count}

    return {
        "revenue": float(total_revenue),
        "pending_collection": float(pending_collection),
        "todays_bookings": todays_bookings,
        "total_leads": total_leads,
        "total_projects": total_projects,
        "top_employee": top_employee
    }

@router.get("/manager", dependencies=[Depends(require_roles([RoleEnum.MANAGER, RoleEnum.SUPER_ADMIN]))])
def get_manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    
    # Branch scope: users in the same branch
    branch_users = db.query(User.id).filter(User.branch_id == current_user.branch_id).all()
    branch_user_ids = [u.id for u in branch_users] if current_user.role == RoleEnum.MANAGER else []
    
    # Leads
    leads_query = db.query(Lead).filter(scope_query_to_branch(current_user, Lead))
    todays_leads = leads_query.filter(func.date(Lead.created_at) == today).count()
    pending_followups = leads_query.filter(Lead.status.in_([LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED])).count()
    
    # Visits
    visits_query = db.query(SiteVisit)
    if current_user.role == RoleEnum.MANAGER:
        visits_query = visits_query.filter(SiteVisit.employee_id.in_(branch_user_ids))
    todays_visits = visits_query.filter(func.date(SiteVisit.scheduled_at) == today).count()
    
    # Bookings & Revenue
    bookings_query = db.query(Booking)
    payments_query = db.query(Payment)
    
    if current_user.role == RoleEnum.MANAGER:
        bookings_query = bookings_query.filter(Booking.created_by_id.in_(branch_user_ids))
        payments_query = payments_query.join(Booking).filter(Booking.created_by_id.in_(branch_user_ids))
        
    todays_bookings = bookings_query.filter(func.date(Booking.created_at) == today).count()
    branch_revenue = payments_query.filter(Payment.status == PaymentStatusEnum.RECEIVED).with_entities(func.sum(Payment.amount)).scalar() or 0.0

    return {
        "todays_leads": todays_leads,
        "todays_visits": todays_visits,
        "todays_bookings": todays_bookings,
        "pending_followups": pending_followups,
        "branch_revenue": float(branch_revenue)
    }

@router.get("/employee", dependencies=[Depends(require_roles([RoleEnum.EMPLOYEE, RoleEnum.MANAGER, RoleEnum.SUPER_ADMIN]))])
def get_employee_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    
    my_leads = db.query(Lead).filter(Lead.assigned_to_id == current_user.id).count()
    my_active_leads = db.query(Lead).filter(
        Lead.assigned_to_id == current_user.id, 
        Lead.status.in_([LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED, LeadStatusEnum.VISIT_SCHEDULED, LeadStatusEnum.NEGOTIATION])
    ).count()
    
    my_todays_visits = db.query(SiteVisit).filter(
        SiteVisit.employee_id == current_user.id,
        func.date(SiteVisit.scheduled_at) == today
    ).count()
    
    my_sales = db.query(Booking).filter(
        Booking.created_by_id == current_user.id,
        Booking.status == BookingStatusEnum.CONFIRMED
    ).count()

    return {
        "my_leads": my_leads,
        "my_active_leads": my_active_leads,
        "my_todays_visits": my_todays_visits,
        "my_sales": my_sales,
        "target_progress": 0 # Placeholder for actual target schema
    }
