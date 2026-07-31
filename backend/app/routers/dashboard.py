from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum, Company, Branch
from app.models.sales import Payment, Booking, PaymentStatusEnum, BookingStatusEnum
from app.models.leads import Lead, LeadStatusEnum, SiteVisit
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.customers import Customer
from app.models.customers import SiteVisitStatusEnum
from app.schemas.analytics import (
    SuperAdminDashboardOut,
    ManagerDashboardOut,
    EmployeeDashboardOut,
    BrokerDashboardOut
)
from app.core.config import settings

router = APIRouter()

@router.get("/super-admin", response_model=SuperAdminDashboardOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]))])
def get_super_admin_dashboard(db: Session = Depends(get_db)):
    today = date.today()

    orgs = db.query(Company).count()
    branches = db.query(Branch).count()
    projects = db.query(Project).count()
    employees = db.query(User).filter(User.role.in_([RoleEnum.EMPLOYEE, RoleEnum.MANAGER, RoleEnum.ADMIN])).count()
    leads = db.query(Lead).count()
    customers = db.query(Customer).count()

    todays_bookings = db.query(Booking).filter(func.date(Booking.created_at) == today).count()
    total_bookings = db.query(Booking).count()

    inv_avail = db.query(Unit).filter(Unit.status == UnitStatusEnum.AVAILABLE).count()
    inv_booked = db.query(Unit).filter(Unit.status == UnitStatusEnum.BOOKED).count()

    revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatusEnum.RECEIVED).scalar() or 0.0
    pending_col = db.query(func.sum(Payment.amount)).filter(Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])).scalar() or 0.0

    # Monthly Revenue (Last 6 Months)
    six_months_ago = today - timedelta(days=180)
    revenue_year = func.extract("year", Payment.received_date)
    revenue_month = func.extract("month", Payment.received_date)
    monthly_rev_query = db.query(
        revenue_year.label("year"),
        revenue_month.label("month"),
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatusEnum.RECEIVED,
        Payment.received_date >= six_months_ago
    ).group_by(revenue_year, revenue_month).order_by(
        revenue_year, revenue_month
    ).all()

    monthly_revenue = [
        {"date": f"{int(y):04d}-{int(m):02d}", "amount": float(a)}
        for y, m, a in monthly_rev_query
        if y and m
    ]

    # Top Projects (By Bookings)
    top_proj_query = db.query(
        Project.id, Project.name, func.count(Booking.id).label('b_count')
    ).join(Tower, Tower.project_id == Project.id)\
     .join(Block, Block.tower_id == Tower.id)\
     .join(Unit, Unit.block_id == Block.id)\
     .join(Booking, Booking.unit_id == Unit.id)\
     .group_by(Project.id).order_by(func.count(Booking.id).desc()).limit(5).all()

    top_projects = [{"id": p.id, "name": p.name, "revenue": float(p.b_count)} for p in top_proj_query]

    # Top Branches (By User creation bookings)
    top_branch_query = db.query(
        Branch.id, Branch.name, func.count(Booking.id).label('b_count')
    ).join(User, User.branch_id == Branch.id)\
     .join(Booking, Booking.created_by_id == User.id)\
     .group_by(Branch.id).order_by(func.count(Booking.id).desc()).limit(5).all()

    top_branches = [{"id": b.id, "name": b.name, "revenue": float(b.b_count)} for b in top_branch_query]

    return SuperAdminDashboardOut(
        organizations_count=orgs,
        branches_count=branches,
        projects_count=projects,
        employees_count=employees,
        total_leads=leads,
        total_customers=customers,
        todays_bookings=todays_bookings,
        total_bookings=total_bookings,
        inventory_available=inv_avail,
        inventory_booked=inv_booked,
        revenue=float(revenue),
        pending_collection=float(pending_col),
        monthly_revenue=monthly_revenue,
        top_projects=top_projects,
        top_branches=top_branches
    )

@router.get("/admin", response_model=SuperAdminDashboardOut, dependencies=[Depends(require_roles([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]))])
def get_admin_dashboard(db: Session = Depends(get_db)):
    return get_super_admin_dashboard(db)

@router.get("/manager", response_model=ManagerDashboardOut, dependencies=[Depends(require_roles([RoleEnum.MANAGER, RoleEnum.SUPER_ADMIN]))])
def get_manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    if current_user.role == RoleEnum.MANAGER:
        if current_user.branch_id is None:
            branch_user_ids = [current_user.id]
            leads_query = db.query(Lead).filter(
                (Lead.assigned_to_id == current_user.id)
                | (Lead.created_by_id == current_user.id)
            )
        else:
            branch_users = db.query(User.id).filter(
                User.branch_id == current_user.branch_id
            ).all()
            branch_user_ids = [user.id for user in branch_users]
            leads_query = db.query(Lead).filter(
                scope_query_to_branch(current_user, Lead)
            )
    else:
        branch_user_ids = []
        leads_query = db.query(Lead)
    todays_leads = leads_query.filter(func.date(Lead.created_at) == today).count()
    pending_followups = leads_query.filter(Lead.status.in_([LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED])).count()

    total_leads = leads_query.count()
    converted_leads = leads_query.filter(Lead.status == LeadStatusEnum.CONVERTED).count()
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0.0

    visits_query = db.query(SiteVisit)
    bookings_query = db.query(Booking)
    payments_query = db.query(Payment)

    if current_user.role == RoleEnum.MANAGER:
        visits_query = visits_query.filter(SiteVisit.employee_id.in_(branch_user_ids))
        bookings_query = bookings_query.filter(Booking.created_by_id.in_(branch_user_ids))
        payments_query = payments_query.join(Booking).filter(Booking.created_by_id.in_(branch_user_ids))

    todays_visits = visits_query.filter(func.date(SiteVisit.scheduled_at) == today).count()
    todays_bookings = bookings_query.filter(func.date(Booking.created_at) == today).count()
    pending_bookings = bookings_query.filter(Booking.status == BookingStatusEnum.PENDING).count()

    branch_revenue = payments_query.filter(Payment.status == PaymentStatusEnum.RECEIVED).with_entities(func.sum(Payment.amount)).scalar() or 0.0
    pending_collection = payments_query.filter(Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])).with_entities(func.sum(Payment.amount)).scalar() or 0.0

    # Lead Funnel
    funnel_query = (
        leads_query.with_entities(Lead.status, func.count(Lead.id))
        .group_by(Lead.status)
        .all()
    )
    lead_funnel = [{"name": s.value, "value": c} for s, c in funnel_query]

    # Team Performance
    if current_user.role == RoleEnum.MANAGER:
        team_perf_query = db.query(User.name, func.count(Booking.id)).join(Booking, Booking.created_by_id == User.id)\
            .filter(User.id.in_(branch_user_ids)).group_by(User.id).order_by(func.count(Booking.id).desc()).limit(5).all()
    else:
        team_perf_query = db.query(User.name, func.count(Booking.id)).join(Booking, Booking.created_by_id == User.id)\
            .group_by(User.id).order_by(func.count(Booking.id).desc()).limit(5).all()

    team_performance = [{"name": n, "sales": c} for n, c in team_perf_query]

    return ManagerDashboardOut(
        todays_leads=todays_leads,
        todays_visits=todays_visits,
        todays_bookings=todays_bookings,
        pending_followups=pending_followups,
        pending_bookings=pending_bookings,
        pending_collection=float(pending_collection),
        branch_revenue=float(branch_revenue),
        conversion_rate=float(conversion_rate),
        lead_funnel=lead_funnel,
        team_performance=team_performance
    )

@router.get("/employee", response_model=EmployeeDashboardOut, dependencies=[Depends(require_roles([RoleEnum.EMPLOYEE, RoleEnum.MANAGER, RoleEnum.SUPER_ADMIN]))])
def get_employee_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()

    my_leads = db.query(Lead).filter(Lead.assigned_to_id == current_user.id).count()
    my_active_leads = db.query(Lead).filter(
        Lead.assigned_to_id == current_user.id,
        Lead.status.in_([LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED, LeadStatusEnum.VISIT_SCHEDULED, LeadStatusEnum.NEGOTIATION])
    ).count()

    my_customers = db.query(Customer.id).join(Booking).filter(Booking.created_by_id == current_user.id).distinct().count()

    my_todays_visits = db.query(SiteVisit).filter(
        SiteVisit.employee_id == current_user.id,
        func.date(SiteVisit.scheduled_at) == today
    ).count()

    # The current model has no separate follow-up entity; active assigned leads
    # are the actionable follow-up queue.
    my_todays_followups = my_active_leads
    pending_tasks = my_todays_visits + my_todays_followups

    my_sales = db.query(Booking).filter(
        Booking.created_by_id == current_user.id,
        Booking.status == BookingStatusEnum.CONFIRMED
    ).count()

    my_revenue = db.query(func.sum(Payment.amount)).join(Booking).filter(
        Booking.created_by_id == current_user.id,
        Payment.status == PaymentStatusEnum.RECEIVED
    ).scalar() or 0.0

    converted_leads = db.query(Lead).filter(
        Lead.assigned_to_id == current_user.id,
        Lead.status == LeadStatusEnum.CONVERTED,
    ).count()
    completed_visits = db.query(SiteVisit).filter(
        SiteVisit.employee_id == current_user.id,
        SiteVisit.status == SiteVisitStatusEnum.COMPLETED,
    ).count()
    total_visits = db.query(SiteVisit).filter(
        SiteVisit.employee_id == current_user.id
    ).count()
    conversion_component = (
        converted_leads / my_leads * 70 if my_leads else 0.0
    )
    visit_component = (
        completed_visits / total_visits * 30 if total_visits else 0.0
    )
    performance_score = min(100.0, conversion_component + visit_component)

    return EmployeeDashboardOut(
        my_leads=my_leads,
        my_active_leads=my_active_leads,
        my_customers=my_customers,
        my_todays_visits=my_todays_visits,
        my_todays_followups=my_todays_followups,
        pending_tasks=pending_tasks,
        my_sales=my_sales,
        my_revenue=float(my_revenue),
        performance_score=float(performance_score),
    )

@router.get(
    "/broker",
    response_model=BrokerDashboardOut,
    dependencies=[Depends(require_roles([RoleEnum.BROKER, RoleEnum.PARTNER]))],
)
def get_broker_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Assuming leads have a source_id or created_by_id linking to broker
    referred_leads = db.query(Lead).filter(Lead.created_by_id == current_user.id).count()
    referred_bookings = db.query(Booking).filter(Booking.created_by_id == current_user.id).count()

    my_revenue = db.query(func.sum(Payment.amount)).join(Booking).filter(
        Booking.created_by_id == current_user.id,
        Payment.status == PaymentStatusEnum.RECEIVED
    ).scalar() or 0.0

    my_pending_revenue = db.query(func.sum(Payment.amount)).join(Booking).filter(
        Booking.created_by_id == current_user.id,
        Payment.status == PaymentStatusEnum.PENDING
    ).scalar() or 0.0

    commission_rate = settings.DEFAULT_BROKER_COMMISSION_PERCENT / 100
    commission_earned = float(my_revenue) * commission_rate
    pending_commission = float(my_pending_revenue) * commission_rate

    history_start = date.today().replace(day=1) - timedelta(days=92)
    payment_year = func.extract("year", Payment.received_date)
    payment_month = func.extract("month", Payment.received_date)
    monthly_commission = (
        db.query(
            payment_year.label("year"),
            payment_month.label("month"),
            func.sum(Payment.amount).label("revenue"),
        )
        .join(Booking)
        .filter(
            Booking.created_by_id == current_user.id,
            Payment.status == PaymentStatusEnum.RECEIVED,
            Payment.received_date >= history_start,
        )
        .group_by(payment_year, payment_month)
        .order_by(payment_year, payment_month)
        .all()
    )
    commission_history = [
        {
            "date": f"{int(year):04d}-{int(month):02d}",
            "amount": float(revenue) * commission_rate,
        }
        for year, month, revenue in monthly_commission
        if year and month
    ]

    return BrokerDashboardOut(
        referred_leads=referred_leads,
        referred_bookings=referred_bookings,
        commission_earned=commission_earned,
        pending_commission=pending_commission,
        commission_history=commission_history
    )
