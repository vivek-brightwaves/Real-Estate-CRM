"""Coverage and reconciliation checks for every report source."""

from datetime import date, timedelta

from app.core.time import utcnow
from app.models.customers import Customer, SiteVisitStatusEnum
from app.models.leads import Lead, SiteVisit
from app.models.partners import Broker
from app.models.possession import (
    ServiceTicket,
    TicketPriorityEnum,
    TicketStatusEnum,
)
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.rentals import LeaseAgreement, LeaseStatusEnum, Tenant
from app.models.sales import (
    Booking,
    BookingStatusEnum,
    Payment,
    PaymentModeEnum,
    PaymentStatusEnum,
)
from app.models.system import AuditLog


def _seed_report_rows(db, employee_id: int):
    project = Project(
        name="Report Project",
        branch_id=1,
        location="Mumbai",
        status="ACTIVE",
    )
    db.add(project)
    db.flush()
    tower = Tower(name="Report Tower", project_id=project.id)
    db.add(tower)
    db.flush()
    block = Block(name="Report Block", tower_id=tower.id)
    db.add(block)
    db.flush()
    unit = Unit(
        block_id=block.id,
        unit_number="REP-101",
        type="3BHK",
        area=1400,
        price=8_000_000,
        status=UnitStatusEnum.SOLD,
    )
    db.add(unit)
    db.flush()
    lead = Lead(
        company_id=1,
        name="=FORMULA()",
        phone="9876543255",
        email="report-buyer@example.com",
        source="Portal",
        created_by_id=employee_id,
        assigned_to_id=employee_id,
    )
    db.add(lead)
    db.flush()
    customer = Customer(
        name="Report Customer",
        phone=lead.phone,
        email=lead.email,
        lead_id=lead.id,
        assigned_to_id=employee_id,
    )
    db.add(customer)
    db.flush()
    visit = SiteVisit(
        lead_id=lead.id,
        employee_id=employee_id,
        scheduled_at=utcnow(),
        status=SiteVisitStatusEnum.COMPLETED,
    )
    db.add(visit)
    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        created_by_id=employee_id,
        status=BookingStatusEnum.CONFIRMED,
    )
    db.add(booking)
    db.flush()
    payment = Payment(
        booking_id=booking.id,
        amount=250000,
        status=PaymentStatusEnum.RECEIVED,
        mode=PaymentModeEnum.BANK_TRANSFER,
        due_date=date.today(),
        received_date=date.today(),
        receipt_number="REPORT-1",
        recorded_by_id=employee_id,
    )
    db.add(payment)
    broker = Broker(
        name="Report Broker",
        company_name="Broker Company",
        phone="9876543256",
        email="report-broker@example.com",
    )
    db.add(broker)
    tenant = Tenant(
        name="Report Tenant",
        phone="9876543257",
        email="report-tenant@example.com",
    )
    db.add(tenant)
    db.flush()
    lease = LeaseAgreement(
        unit_id=unit.id,
        tenant_id=tenant.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        rent_amount=30000,
        security_deposit=60000,
        status=LeaseStatusEnum.ACTIVE,
    )
    db.add(lease)
    ticket = ServiceTicket(
        customer_id=customer.id,
        unit_id=unit.id,
        subject="@Formula-safe ticket",
        description="Reportable service request",
        status=TicketStatusEnum.OPEN,
        priority=TicketPriorityEnum.HIGH,
        assigned_to_id=employee_id,
    )
    db.add(ticket)
    db.add(
        AuditLog(
            user_id=employee_id,
            action="CREATE",
            module="Reports",
            entity_type="TEST",
            entity_id=1,
        )
    )
    db.commit()
    return project


def test_all_report_sources_export_and_reconcile(
    client,
    test_db,
    employee_token_headers,
    admin_token_headers,
):
    employee_id = client.get(
        "/auth/me", headers=employee_token_headers
    ).json()["id"]
    project = _seed_report_rows(test_db, employee_id)
    headers = admin_token_headers
    today = date.today().isoformat()

    expected_headers = {
        "leads": "Lead ID",
        "customers": "Customer ID",
        "bookings": "Booking ID",
        "payments": "Payment ID",
        "finance": "Payment ID",
        "collections": "Payment ID",
        "inventory": "Unit ID",
        "projects": "Project ID",
        "site_visits": "Visit ID",
        "employees": "Employee ID",
        "brokers": "Broker ID",
        "rentals": "Lease ID",
        "service_tickets": "Ticket ID",
        "audit_logs": "Log ID",
    }
    branch_scoped = {
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
        "rentals",
        "service_tickets",
        "audit_logs",
    }
    for report_type, first_column in expected_headers.items():
        query = f"start_date={today}&end_date={today}"
        if report_type in branch_scoped:
            query += "&branch_id=1"
        if report_type == "inventory":
            query += f"&project_id={project.id}"
        response = client.get(
            f"/reports/{report_type}/export?format=csv&{query}",
            headers=headers,
        )
        assert response.status_code == 200, report_type
        assert response.headers["content-type"].startswith("text/csv")
        assert first_column in response.text
        assert len(response.text.splitlines()) >= 2, report_type

    leads = client.get(
        "/reports/leads/export?format=csv&branch_id=1",
        headers=headers,
    )
    assert "'=FORMULA()" in leads.text
    tickets = client.get(
        "/reports/service_tickets/export?format=csv&branch_id=1",
        headers=headers,
    )
    assert "'@Formula-safe ticket" in tickets.text

    assert test_db.query(AuditLog).filter(
        AuditLog.entity_type == "REPORT",
        AuditLog.action == "EXPORT",
    ).count() >= len(expected_headers)


def test_pdf_excel_validation_and_report_rbac(
    client,
    test_db,
    employee_token_headers,
    manager_token_headers,
    admin_token_headers,
):
    employee_id = client.get(
        "/auth/me", headers=employee_token_headers
    ).json()["id"]
    _seed_report_rows(test_db, employee_id)

    excel = client.get(
        "/reports/customers/export?format=excel",
        headers=admin_token_headers,
    )
    assert excel.status_code == 200
    assert "spreadsheetml.sheet" in excel.headers["content-type"]
    assert excel.content.startswith(b"PK")

    pdf = client.get(
        "/reports/projects/export?format=pdf",
        headers=admin_token_headers,
    )
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF")

    assert client.get(
        "/reports/leads/export?start_date=2026-02-02&end_date=2026-01-01",
        headers=admin_token_headers,
    ).status_code == 422
    assert client.get(
        "/reports/leads/export?format=json",
        headers=admin_token_headers,
    ).status_code == 422
    assert client.get(
        "/reports/leads/export?branch_id=999",
        headers=manager_token_headers,
    ).status_code == 403
    assert client.get(
        "/reports/leads/export",
        headers=employee_token_headers,
    ).status_code == 403
