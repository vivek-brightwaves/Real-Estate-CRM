from typing import List
from pydantic import BaseModel

# ---------------------------------------------------------
# Chart & Graph Models
# ---------------------------------------------------------
class ChartDataPoint(BaseModel):
    name: str
    value: float

class TimeSeriesPoint(BaseModel):
    date: str  # YYYY-MM or YYYY-MM-DD
    amount: float

# ---------------------------------------------------------
# Dashboard Models
# ---------------------------------------------------------
class TopEmployeeOut(BaseModel):
    name: str
    sales: int

class TopEntityOut(BaseModel):
    id: int
    name: str
    revenue: float

class SuperAdminDashboardOut(BaseModel):
    organizations_count: int
    branches_count: int
    projects_count: int
    employees_count: int
    total_leads: int
    total_customers: int
    todays_bookings: int
    total_bookings: int
    inventory_available: int
    inventory_booked: int
    revenue: float
    pending_collection: float
    monthly_revenue: List[TimeSeriesPoint]
    top_projects: List[TopEntityOut]
    top_branches: List[TopEntityOut]

class ManagerDashboardOut(BaseModel):
    todays_leads: int
    todays_visits: int
    todays_bookings: int
    pending_followups: int
    pending_bookings: int
    pending_collection: float
    branch_revenue: float
    conversion_rate: float
    lead_funnel: List[ChartDataPoint]
    team_performance: List[TopEmployeeOut]

class EmployeeDashboardOut(BaseModel):
    my_leads: int
    my_active_leads: int
    my_customers: int
    my_todays_visits: int
    my_todays_followups: int
    pending_tasks: int
    my_sales: int
    my_revenue: float
    performance_score: float

class BrokerDashboardOut(BaseModel):
    referred_leads: int
    referred_bookings: int
    commission_earned: float
    pending_commission: float
    commission_history: List[TimeSeriesPoint]

# ---------------------------------------------------------
# Analytics APIs Models
# ---------------------------------------------------------
class RevenueAnalyticsOut(BaseModel):
    today_revenue: float
    weekly_revenue: float
    monthly_revenue: float
    yearly_revenue: float
    pending_collections: float
    total_collections: float
    revenue_growth_percent: float
    by_project: List[TopEntityOut]
    by_branch: List[TopEntityOut]
    trend: List[TimeSeriesPoint]

class LeadAnalyticsOut(BaseModel):
    total_leads: int
    new_leads: int
    converted_leads: int
    lost_leads: int
    conversion_rate: float
    average_conversion_days: float
    lead_funnel: List[ChartDataPoint]
    source_analysis: List[ChartDataPoint]

class BookingAnalyticsOut(BaseModel):
    total_bookings: int
    pending_bookings: int
    approved_bookings: int
    cancelled_bookings: int
    total_booking_value: float
    conversion_ratio: float
    trend: List[TimeSeriesPoint]

class PaymentAnalyticsOut(BaseModel):
    total_payments_count: int
    pending_payments_count: int
    overdue_payments_count: int
    outstanding_amount: float
    collected_amount: float
    collection_trend: List[TimeSeriesPoint]

class InventoryAnalyticsOut(BaseModel):
    available_units: int
    booked_units: int
    sold_units: int
    hold_units: int
    inventory_utilization_percent: float
    fast_selling_projects: List[ChartDataPoint]

class EmployeeAnalyticsOut(BaseModel):
    assigned_leads: int
    converted_leads: int
    conversion_percent: float
    site_visits: int
    sales_value: float
