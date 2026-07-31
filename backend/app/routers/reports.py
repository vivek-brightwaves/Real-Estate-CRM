from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from io import BytesIO, StringIO
import openpyxl
import csv
from datetime import date
from typing import Optional, Iterator, Any, List, Literal

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum
from app.models.leads import Lead, SiteVisit
from app.models.customers import Customer
from app.models.projects import Block, Tower, Unit, Project
from app.models.rentals import LeaseAgreement
from app.models.possession import ServiceTicket
from app.models.system import AuditLog
from app.models.partners import Broker
from app.services.audit import log_audit

router = APIRouter()
VALID_REPORT_TYPES = {
    "leads",
    "customers",
    "bookings",
    "payments",
    "finance",
    "collections",
    "inventory",
    "projects",
    "site_visits",
    "employees",
    "brokers",
    "rentals",
    "service_tickets",
    "audit_logs",
}


def _safe_export_row(row: List[Any]) -> List[Any]:
    """Prevent spreadsheet formula execution from user-controlled values."""
    safe = []
    for value in row:
        if isinstance(value, str) and value.startswith(("=", "+", "-", "@")):
            safe.append(f"'{value}")
        else:
            safe.append(value)
    return safe

def apply_filters(query, model, date_column, kwargs: dict):
    # Date Range
    if date_column is not None and kwargs.get("start_date"):
        query = query.filter(func.date(date_column) >= kwargs["start_date"])
    if date_column is not None and kwargs.get("end_date"):
        query = query.filter(func.date(date_column) <= kwargs["end_date"])

    # Other Generic Filters (assuming attributes exist on the model)
    for key, val in kwargs.items():
        if val is not None and key not in ["start_date", "end_date", "report_type", "format"]:
            if hasattr(model, key):
                query = query.filter(getattr(model, key) == val)

    return query

def get_report_iterator(report_type: str, db: Session, kwargs: dict) -> Iterator[List[Any]]:
    # Define handlers mapping
    if report_type == "leads":
        query = db.query(Lead)
        if kwargs.get("branch_id"):
            query = query.join(
                User,
                Lead.created_by_id == User.id,
            ).filter(User.branch_id == kwargs["branch_id"])
        query = apply_filters(query, Lead, Lead.created_at, kwargs)
        yield ["Lead ID", "Name", "Email", "Phone", "Source", "Status", "Assigned To ID", "Created At"]
        for lead in query.yield_per(1000):
            yield [lead.id, lead.name, lead.email, lead.phone, getattr(lead, 'source', ''), getattr(lead, 'status', '').value, lead.assigned_to_id, str(lead.created_at)]

    elif report_type == "customers":
        query = db.query(Customer)
        if kwargs.get("branch_id"):
            query = query.join(
                User,
                Customer.assigned_to_id == User.id,
            ).filter(User.branch_id == kwargs["branch_id"])
        query = apply_filters(query, Customer, Customer.created_at, kwargs)
        yield ["Customer ID", "Name", "Email", "Phone", "KYC Status", "Created At"]
        for cust in query.yield_per(1000):
            yield [cust.id, cust.name, cust.email, cust.phone, getattr(cust, 'kyc_status', ''), str(cust.created_at)]

    elif report_type == "bookings":
        query = db.query(Booking)
        if kwargs.get("branch_id"):
            query = query.join(
                User,
                Booking.created_by_id == User.id,
            ).filter(User.branch_id == kwargs["branch_id"])
        query = apply_filters(query, Booking, Booking.created_at, kwargs)
        yield ["Booking ID", "Unit ID", "Customer ID", "Status", "Created By ID", "Created At"]
        for b in query.yield_per(1000):
            yield [b.id, b.unit_id, b.customer_id, getattr(b, 'status', '').value, b.created_by_id, str(b.created_at)]

    elif report_type in {"payments", "finance"}:
        query = db.query(Payment)
        if kwargs.get("branch_id"):
            query = (
                query.join(Payment.booking)
                .join(Booking.created_by)
                .filter(User.branch_id == kwargs["branch_id"])
            )
        query = apply_filters(query, Payment, Payment.received_date, kwargs)
        yield ["Payment ID", "Booking ID", "Amount", "Status", "Received Date", "Due Date", "Mode"]
        for p in query.yield_per(1000):
            yield [p.id, p.booking_id, float(p.amount), getattr(p, 'status', '').value, str(p.received_date or ""), str(p.due_date or ""), getattr(p, 'mode', '').value if getattr(p, 'mode', None) else ""]

    elif report_type == "collections":
        # Similar to payments but only received
        query = db.query(Payment).filter(
            Payment.status == PaymentStatusEnum.RECEIVED
        )
        if kwargs.get("branch_id"):
            query = (
                query.join(Payment.booking)
                .join(Booking.created_by)
                .filter(User.branch_id == kwargs["branch_id"])
            )
        query = apply_filters(query, Payment, Payment.received_date, kwargs)
        yield ["Payment ID", "Booking ID", "Amount", "Received Date", "Mode"]
        for p in query.yield_per(1000):
            yield [p.id, p.booking_id, float(p.amount), str(p.received_date or ""), getattr(p, 'mode', '').value if getattr(p, 'mode', None) else ""]

    elif report_type == "inventory":
        query = db.query(Unit).options(
            joinedload(Unit.block).joinedload(Block.tower)
        )
        if kwargs.get("project_id") or kwargs.get("branch_id"):
            query = (
                query.join(Unit.block)
                .join(Block.tower)
                .join(Tower.project)
            )
        if kwargs.get("project_id"):
            query = query.filter(Project.id == kwargs["project_id"])
        if kwargs.get("branch_id"):
            query = query.filter(Project.branch_id == kwargs["branch_id"])
        query = apply_filters(query, Unit, None, kwargs)
        yield ["Unit ID", "Block ID", "Project ID", "Type", "Area", "Price", "Status"]
        for u in query.yield_per(1000):
            project_id = (
                u.block.tower.project_id
                if u.block and u.block.tower
                else ""
            )
            yield [u.id, u.block_id, project_id, getattr(u, 'type', ''), float(u.area) if u.area else "", float(u.price) if u.price else "", getattr(u, 'status', '').value]

    elif report_type == "projects":
        query = apply_filters(db.query(Project), Project, None, kwargs)
        yield ["Project ID", "Name", "Branch ID", "Location", "Status"]
        for p in query.yield_per(1000):
            yield [p.id, p.name, getattr(p, 'branch_id', ''), getattr(p, 'location', ''), getattr(p, 'status', '')]

    elif report_type == "site_visits":
        query = db.query(SiteVisit)
        if kwargs.get("branch_id"):
            query = query.join(
                User,
                SiteVisit.employee_id == User.id,
            ).filter(User.branch_id == kwargs["branch_id"])
        query = apply_filters(query, SiteVisit, SiteVisit.scheduled_at, kwargs)
        yield ["Visit ID", "Lead ID", "Employee ID", "Scheduled At", "Status"]
        for sv in query.yield_per(1000):
            yield [sv.id, sv.lead_id, sv.employee_id, str(sv.scheduled_at), getattr(sv, 'status', '').value if getattr(sv, 'status', None) else ""]

    elif report_type == "employees":
        query = apply_filters(db.query(User).filter(User.role == RoleEnum.EMPLOYEE), User, User.created_at, kwargs)
        yield ["Employee ID", "Name", "Email", "Branch ID", "Active"]
        for u in query.yield_per(1000):
            yield [u.id, u.name, u.email, getattr(u, 'branch_id', ''), u.is_active]

    elif report_type == "brokers":
        query = apply_filters(
            db.query(Broker),
            Broker,
            Broker.created_at,
            kwargs,
        )
        yield ["Broker ID", "Name", "Email", "Company", "Active"]
        for broker in query.yield_per(1000):
            yield [
                broker.id,
                broker.name,
                broker.email,
                broker.company_name,
                broker.is_active,
            ]

    elif report_type == "rentals":
        query = db.query(LeaseAgreement)
        if kwargs.get("branch_id"):
            query = (
                query.join(LeaseAgreement.unit)
                .join(Unit.block)
                .join(Block.tower)
                .join(Tower.project)
                .filter(Project.branch_id == kwargs["branch_id"])
            )
        query = apply_filters(
            query,
            LeaseAgreement,
            LeaseAgreement.created_at,
            kwargs,
        )
        yield [
            "Lease ID",
            "Unit ID",
            "Tenant ID",
            "Start Date",
            "End Date",
            "Rent Amount",
            "Status",
        ]
        for lease in query.yield_per(1000):
            yield [
                lease.id,
                lease.unit_id,
                lease.tenant_id,
                str(lease.start_date),
                str(lease.end_date),
                float(lease.rent_amount),
                lease.status.value,
            ]

    elif report_type == "service_tickets":
        query = db.query(ServiceTicket)
        if kwargs.get("branch_id"):
            query = (
                query.join(ServiceTicket.customer)
                .join(Customer.assigned_to)
                .filter(User.branch_id == kwargs["branch_id"])
            )
        query = apply_filters(
            query,
            ServiceTicket,
            ServiceTicket.created_at,
            kwargs,
        )
        yield [
            "Ticket ID",
            "Customer ID",
            "Unit ID",
            "Subject",
            "Status",
            "Priority",
            "Created At",
        ]
        for ticket in query.yield_per(1000):
            yield [
                ticket.id,
                ticket.customer_id,
                ticket.unit_id or "",
                ticket.subject,
                ticket.status.value,
                ticket.priority.value,
                str(ticket.created_at),
            ]

    elif report_type == "audit_logs":
        query = db.query(AuditLog)
        if kwargs.get("branch_id"):
            query = query.join(AuditLog.user).filter(
                User.branch_id == kwargs["branch_id"]
            )
        query = apply_filters(query, AuditLog, AuditLog.timestamp, kwargs)
        yield ["Log ID", "User ID", "Action", "Entity Type", "Entity ID", "Timestamp"]
        for a in query.yield_per(1000):
            yield [a.id, getattr(a, 'user_id', ''), a.action, a.entity_type, a.entity_id, str(a.timestamp)]

    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

@router.get(
    "/{report_type}/export",
    response_class=StreamingResponse,
    responses={
        200: {
            "description": "Generated report file.",
            "content": {
                "text/csv": {},
                "application/pdf": {},
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
            },
        }
    },
    dependencies=[
        Depends(
            require_roles(
                [RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER, RoleEnum.ADMIN]
            )
        )
    ],
)
def export_report(
    report_type: str,
    format: Literal["excel", "csv", "pdf"] = "csv",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    project_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    broker_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid report type")
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must be before or equal to end_date",
        )
    if current_user.role == RoleEnum.MANAGER:
        if current_user.branch_id is None:
            raise HTTPException(
                status_code=403,
                detail="Manager has no assigned branch",
            )
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot export reports for another branch",
            )
        branch_id = current_user.branch_id
    kwargs = {
        "start_date": start_date,
        "end_date": end_date,
        "branch_id": branch_id,
        "project_id": project_id,
        "assigned_to_id": employee_id, # Maps employee to assigned_to generally
        "created_by_id": broker_id
    }
    log_audit(
        db,
        current_user.id,
        "REPORT",
        0,
        "EXPORT",
        new_values={
            "report_type": report_type,
            "format": format,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "branch_id": branch_id,
            "project_id": project_id,
        },
    )

    if format == "csv":
        def iter_csv():
            si = StringIO()
            cw = csv.writer(si)
            for row in get_report_iterator(report_type, db, kwargs):
                cw.writerow(_safe_export_row(row))
                yield si.getvalue()
                si.seek(0)
                si.truncate(0)

        return StreamingResponse(
            iter_csv(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"}
        )

    # For Excel and PDF, we must load into memory. To prevent crashing, we limit to 5000 rows.
    # We will build the full data matrix from the iterator up to the limit.
    iterator = get_report_iterator(report_type, db, kwargs)
    data = []
    try:
        data.append(_safe_export_row(next(iterator))) # Headers
        count = 0
        for row in iterator:
            data.append(_safe_export_row(row))
            count += 1
            if count >= 5000:
                break
    except StopIteration:
        pass

    if format == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{report_type.capitalize()} Report"

        for row in data:
            ws.append(row)

        file_stream = BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)

        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"}
        )

    elif format == "pdf":
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors

        file_stream = BytesIO()
        pdf = SimpleDocTemplate(file_stream, pagesize=letter)

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        pdf.build([table])
        file_stream.seek(0)

        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
        )


@router.get(
    "/{report_type}",
    dependencies=[
        Depends(
            require_roles(
                [RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER, RoleEnum.ADMIN]
            )
        )
    ],
)
def preview_report(
    report_type: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a bounded table preview using the same data source as exports."""

    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid report type")
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must be before or equal to end_date",
        )
    if current_user.role == RoleEnum.MANAGER:
        if current_user.branch_id is None:
            raise HTTPException(
                status_code=403,
                detail="Manager has no assigned branch",
            )
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot preview reports for another branch",
            )
        branch_id = current_user.branch_id

    iterator = get_report_iterator(
        report_type,
        db,
        {
            "start_date": start_date,
            "end_date": end_date,
            "branch_id": branch_id,
            "project_id": project_id,
        },
    )
    try:
        headers = _safe_export_row(next(iterator))
    except StopIteration:
        return {"headers": [], "rows": [], "total_rows": 0}

    rows = []
    total_rows = 0
    for row in iterator:
        if len(rows) < 50:
            rows.append(_safe_export_row(row))
        total_rows += 1

    return {
        "headers": headers,
        "rows": rows,
        "total_rows": total_rows,
    }
