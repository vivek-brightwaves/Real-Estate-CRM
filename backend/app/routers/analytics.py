from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum, Branch
from app.models.sales import Payment, Booking, PaymentStatusEnum, BookingStatusEnum
from app.models.leads import Lead, LeadStatusEnum, SiteVisit
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.schemas.analytics import (
    RevenueAnalyticsOut,
    LeadAnalyticsOut,
    BookingAnalyticsOut,
    PaymentAnalyticsOut,
    InventoryAnalyticsOut,
    EmployeeAnalyticsOut,
    TimeSeriesPoint,
    ChartDataPoint,
    TopEntityOut
)

router = APIRouter()

# Helper for date filtering on a query
def apply_date_filter(query, column, start_date: Optional[date], end_date: Optional[date]):
    if start_date:
        query = query.filter(func.date(column) >= start_date)
    if end_date:
        query = query.filter(func.date(column) <= end_date)
    return query


def effective_branch_id(
    current_user: User,
    requested_branch_id: Optional[int],
) -> Optional[int]:
    if current_user.role != RoleEnum.MANAGER:
        return requested_branch_id
    if current_user.branch_id is None:
        raise HTTPException(status_code=403, detail="Manager has no assigned branch")
    if (
        requested_branch_id is not None
        and requested_branch_id != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot access analytics for another branch",
        )
    return current_user.branch_id


def validate_date_range(
    start_date: Optional[date],
    end_date: Optional[date],
) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must be before or equal to end_date",
        )

@router.get("/revenue", response_model=RevenueAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_revenue_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    branch_id = effective_branch_id(current_user, branch_id)
    validate_date_range(start_date, end_date)

    # Base queries
    payments_q = db.query(Payment)
    if branch_id:
        payments_q = payments_q.join(Booking).join(User, Booking.created_by_id == User.id).filter(User.branch_id == branch_id)

    received_q = payments_q.filter(Payment.status == PaymentStatusEnum.RECEIVED)
    received_q = apply_date_filter(received_q, Payment.received_date, start_date, end_date)

    total_collections = received_q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    pending_collections = payments_q.filter(Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])).with_entities(func.sum(Payment.amount)).scalar() or 0.0

    # Timelines
    today_revenue = received_q.filter(func.date(Payment.received_date) == today).with_entities(func.sum(Payment.amount)).scalar() or 0.0
    weekly_revenue = received_q.filter(func.date(Payment.received_date) >= today - timedelta(days=7)).with_entities(func.sum(Payment.amount)).scalar() or 0.0
    monthly_revenue = received_q.filter(func.date(Payment.received_date) >= today.replace(day=1)).with_entities(func.sum(Payment.amount)).scalar() or 0.0
    yearly_revenue = received_q.filter(func.date(Payment.received_date) >= today.replace(month=1, day=1)).with_entities(func.sum(Payment.amount)).scalar() or 0.0

    # Trend (Monthly)
    revenue_year = func.extract("year", Payment.received_date)
    revenue_month = func.extract("month", Payment.received_date)
    trend_query = received_q.with_entities(
        revenue_year.label("year"),
        revenue_month.label("month"),
        func.sum(Payment.amount)
    ).group_by(revenue_year, revenue_month).order_by(
        revenue_year, revenue_month
    ).all()
    trend = [
        TimeSeriesPoint(date=f"{int(y):04d}-{int(m):02d}", amount=float(a))
        for y, m, a in trend_query
        if y and m
    ]

    period_start = start_date or today.replace(day=1)
    period_end = end_date or max(today, period_start)
    period_days = max(1, (period_end - period_start).days + 1)
    previous_end = period_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)
    previous_total = (
        payments_q.filter(
            Payment.status == PaymentStatusEnum.RECEIVED,
            Payment.received_date >= previous_start,
            Payment.received_date <= previous_end,
        )
        .with_entities(func.sum(Payment.amount))
        .scalar()
        or 0.0
    )
    current_period_total = (
        payments_q.filter(
            Payment.status == PaymentStatusEnum.RECEIVED,
            Payment.received_date >= period_start,
            Payment.received_date <= period_end,
        )
        .with_entities(func.sum(Payment.amount))
        .scalar()
        or 0.0
    )
    if previous_total:
        revenue_growth = (
            (float(current_period_total) - float(previous_total))
            / float(previous_total)
            * 100
        )
    else:
        revenue_growth = 100.0 if current_period_total else 0.0

    by_project_query = (
        db.query(
            Project.id,
            Project.name,
            func.sum(Payment.amount).label("revenue"),
        )
        .join(Tower, Tower.project_id == Project.id)
        .join(Block, Block.tower_id == Tower.id)
        .join(Unit, Unit.block_id == Block.id)
        .join(Booking, Booking.unit_id == Unit.id)
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(Payment.status == PaymentStatusEnum.RECEIVED)
    )
    by_project_query = apply_date_filter(
        by_project_query,
        Payment.received_date,
        start_date,
        end_date,
    )
    if branch_id:
        by_project_query = by_project_query.filter(
            Project.branch_id == branch_id
        )
    by_project = [
        TopEntityOut(id=row.id, name=row.name, revenue=float(row.revenue))
        for row in (
            by_project_query.group_by(Project.id, Project.name)
            .order_by(func.sum(Payment.amount).desc())
            .limit(10)
            .all()
        )
    ]

    by_branch_query = (
        db.query(
            Branch.id,
            Branch.name,
            func.sum(Payment.amount).label("revenue"),
        )
        .join(User, User.branch_id == Branch.id)
        .join(Booking, Booking.created_by_id == User.id)
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(Payment.status == PaymentStatusEnum.RECEIVED)
    )
    by_branch_query = apply_date_filter(
        by_branch_query,
        Payment.received_date,
        start_date,
        end_date,
    )
    if branch_id:
        by_branch_query = by_branch_query.filter(Branch.id == branch_id)
    by_branch = [
        TopEntityOut(id=row.id, name=row.name, revenue=float(row.revenue))
        for row in (
            by_branch_query.group_by(Branch.id, Branch.name)
            .order_by(func.sum(Payment.amount).desc())
            .limit(10)
            .all()
        )
    ]

    return RevenueAnalyticsOut(
        today_revenue=float(today_revenue),
        weekly_revenue=float(weekly_revenue),
        monthly_revenue=float(monthly_revenue),
        yearly_revenue=float(yearly_revenue),
        pending_collections=float(pending_collections),
        total_collections=float(total_collections),
        revenue_growth_percent=float(revenue_growth),
        by_project=by_project,
        by_branch=by_branch,
        trend=trend
    )

@router.get("/leads", response_model=LeadAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_lead_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch_id = effective_branch_id(current_user, branch_id)
    validate_date_range(start_date, end_date)
    query = db.query(Lead)
    if branch_id:
        query = query.join(User, Lead.created_by_id == User.id).filter(User.branch_id == branch_id)

    query = apply_date_filter(query, Lead.created_at, start_date, end_date)

    total = query.count()
    new = query.filter(Lead.status == LeadStatusEnum.NEW).count()
    converted = query.filter(Lead.status == LeadStatusEnum.CONVERTED).count()
    lost = query.filter(Lead.status == LeadStatusEnum.LOST).count()

    funnel = query.with_entities(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    lead_funnel = [ChartDataPoint(name=s.value, value=c) for s, c in funnel]

    source = query.with_entities(Lead.source, func.count(Lead.id)).group_by(Lead.source).all()
    source_analysis = [ChartDataPoint(name=s, value=c) for s, c in source if s]

    conversion_rate = (converted / total * 100) if total > 0 else 0.0
    conversion_rows = (
        query.filter(Lead.status == LeadStatusEnum.CONVERTED)
        .with_entities(Lead.created_at, Lead.updated_at)
        .all()
    )
    average_conversion_days = (
        sum(
            max(0.0, (updated - created).total_seconds() / 86400)
            for created, updated in conversion_rows
            if created and updated
        )
        / len(conversion_rows)
        if conversion_rows
        else 0.0
    )

    return LeadAnalyticsOut(
        total_leads=total,
        new_leads=new,
        converted_leads=converted,
        lost_leads=lost,
        conversion_rate=float(conversion_rate),
        average_conversion_days=float(average_conversion_days),
        lead_funnel=lead_funnel,
        source_analysis=source_analysis
    )

@router.get("/bookings", response_model=BookingAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_booking_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch_id = effective_branch_id(current_user, branch_id)
    validate_date_range(start_date, end_date)
    query = db.query(Booking)
    if branch_id:
        query = query.join(User, Booking.created_by_id == User.id).filter(User.branch_id == branch_id)

    query = apply_date_filter(query, Booking.created_at, start_date, end_date)

    total = query.count()
    pending = query.filter(Booking.status == BookingStatusEnum.PENDING).count()
    approved = query.filter(Booking.status.in_([BookingStatusEnum.APPROVED, BookingStatusEnum.CONFIRMED])).count()
    cancelled = query.filter(Booking.status == BookingStatusEnum.CANCELLED).count()

    # Calculate Total Value from related Units
    value_query = query.join(Unit, Booking.unit_id == Unit.id).with_entities(func.sum(Unit.price)).scalar() or 0.0

    # Trend by month
    booking_year = func.extract("year", Booking.created_at)
    booking_month = func.extract("month", Booking.created_at)
    trend_query = query.with_entities(
        booking_year.label("year"),
        booking_month.label("month"),
        func.count(Booking.id)
    ).group_by(booking_year, booking_month).order_by(
        booking_year, booking_month
    ).all()
    trend = [
        TimeSeriesPoint(date=f"{int(y):04d}-{int(m):02d}", amount=float(c))
        for y, m, c in trend_query
        if y and m
    ]

    return BookingAnalyticsOut(
        total_bookings=total,
        pending_bookings=pending,
        approved_bookings=approved,
        cancelled_bookings=cancelled,
        total_booking_value=float(value_query),
        conversion_ratio=(approved / total * 100) if total > 0 else 0.0,
        trend=trend
    )

@router.get("/payments", response_model=PaymentAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_payment_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch_id = effective_branch_id(current_user, branch_id)
    validate_date_range(start_date, end_date)
    query = db.query(Payment)
    if branch_id:
        query = query.join(Booking).join(User, Booking.created_by_id == User.id).filter(User.branch_id == branch_id)

    query = apply_date_filter(query, Payment.due_date, start_date, end_date)

    total = query.count()
    pending = query.filter(Payment.status == PaymentStatusEnum.PENDING).count()
    overdue = query.filter(Payment.status == PaymentStatusEnum.OVERDUE).count()

    collected = query.filter(Payment.status == PaymentStatusEnum.RECEIVED).with_entities(func.sum(Payment.amount)).scalar() or 0.0
    outstanding = query.filter(Payment.status.in_([PaymentStatusEnum.PENDING, PaymentStatusEnum.OVERDUE])).with_entities(func.sum(Payment.amount)).scalar() or 0.0

    # Collection trend
    payment_year = func.extract("year", Payment.received_date)
    payment_month = func.extract("month", Payment.received_date)
    trend_query = query.filter(Payment.status == PaymentStatusEnum.RECEIVED).with_entities(
        payment_year.label("year"),
        payment_month.label("month"),
        func.sum(Payment.amount)
    ).group_by(payment_year, payment_month).order_by(
        payment_year, payment_month
    ).all()
    trend = [
        TimeSeriesPoint(date=f"{int(y):04d}-{int(m):02d}", amount=float(a))
        for y, m, a in trend_query
        if y and m
    ]

    return PaymentAnalyticsOut(
        total_payments_count=total,
        pending_payments_count=pending,
        overdue_payments_count=overdue,
        outstanding_amount=float(outstanding),
        collected_amount=float(collected),
        collection_trend=trend
    )

@router.get("/inventory", response_model=InventoryAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_inventory_analytics(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Unit)
    if current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(Unit.block)
            .join(Block.tower)
            .join(Tower.project)
            .filter(Project.branch_id == current_user.branch_id)
        )
        if project_id:
            query = query.filter(Project.id == project_id)
    elif project_id:
        query = (
            query.join(Unit.block)
            .join(Block.tower)
            .filter(Tower.project_id == project_id)
        )

    avail = query.filter(Unit.status == UnitStatusEnum.AVAILABLE).count()
    booked = query.filter(Unit.status == UnitStatusEnum.BOOKED).count()
    sold = query.filter(Unit.status == UnitStatusEnum.SOLD).count()
    hold = query.filter(Unit.status == UnitStatusEnum.HOLD).count()

    total = avail + booked + sold + hold
    util = ((booked + sold) / total * 100) if total > 0 else 0.0

    fast_selling_query = db.query(Project.name, func.count(Unit.id))\
        .join(Tower, Tower.project_id == Project.id)\
        .join(Block, Block.tower_id == Tower.id)\
        .join(Unit, Unit.block_id == Block.id)\
        .filter(Unit.status == UnitStatusEnum.SOLD)
    if current_user.role == RoleEnum.MANAGER:
        fast_selling_query = fast_selling_query.filter(
            Project.branch_id == current_user.branch_id
        )
    fast_selling = (
        fast_selling_query.group_by(Project.id)
        .order_by(func.count(Unit.id).desc())
        .limit(5)
        .all()
    )

    fast_selling_list = [ChartDataPoint(name=n, value=float(c)) for n, c in fast_selling]

    return InventoryAnalyticsOut(
        available_units=avail,
        booked_units=booked,
        sold_units=sold,
        hold_units=hold,
        inventory_utilization_percent=float(util),
        fast_selling_projects=fast_selling_list
    )

@router.get("/employees", response_model=EmployeeAnalyticsOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_employee_analytics(
    employee_id: int = Query(..., description="The ID of the employee to query"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == RoleEnum.MANAGER:
        employee = db.query(User).filter(
            User.id == employee_id,
            User.branch_id == current_user.branch_id,
        ).first()
        if employee is None:
            raise HTTPException(status_code=404, detail="Employee not found")
    validate_date_range(start_date, end_date)
    leads_q = db.query(Lead).filter(Lead.assigned_to_id == employee_id)
    leads_q = apply_date_filter(leads_q, Lead.created_at, start_date, end_date)

    assigned = leads_q.count()
    converted = leads_q.filter(Lead.status == LeadStatusEnum.CONVERTED).count()

    visits_q = db.query(SiteVisit).filter(SiteVisit.employee_id == employee_id)
    visits_q = apply_date_filter(visits_q, SiteVisit.scheduled_at, start_date, end_date)
    visits = visits_q.count()

    sales_q = db.query(Payment).join(Booking).filter(
        Booking.created_by_id == employee_id,
        Payment.status == PaymentStatusEnum.RECEIVED
    )
    sales_q = apply_date_filter(sales_q, Payment.received_date, start_date, end_date)
    sales_val = sales_q.with_entities(func.sum(Payment.amount)).scalar() or 0.0

    return EmployeeAnalyticsOut(
        assigned_leads=assigned,
        converted_leads=converted,
        conversion_percent=(converted / assigned * 100) if assigned > 0 else 0.0,
        site_visits=visits,
        sales_value=float(sales_val)
    )
