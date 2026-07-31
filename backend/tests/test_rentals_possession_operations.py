"""Rental, possession, partner, settings, and service-ticket coverage."""

from datetime import date, timedelta

from app.models.customers import Customer
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.rentals import InvoiceStatusEnum, RentalInvoice
from app.models.sales import (
    Booking,
    BookingStatusEnum,
    Payment,
    PaymentStatusEnum,
)
from app.models.users import Company


def _property_graph(db, user_id: int):
    company = Company(name="Operations Company")
    db.add(company)
    db.flush()
    from app.models.users import Branch

    branch = Branch(name="Operations Branch", company_id=company.id)
    db.add(branch)
    db.flush()
    project = Project(
        name="Operations Project",
        branch_id=branch.id,
        status="ACTIVE",
    )
    db.add(project)
    db.flush()
    tower = Tower(name="Operations Tower", project_id=project.id)
    db.add(tower)
    db.flush()
    block = Block(name="Operations Block", tower_id=tower.id)
    db.add(block)
    db.flush()
    unit = Unit(
        block_id=block.id,
        unit_number="OPS-101",
        type="Apartment",
        area=900,
        price=4_000_000,
        status=UnitStatusEnum.AVAILABLE,
    )
    other_unit = Unit(
        block_id=block.id,
        unit_number="OPS-102",
        type="Apartment",
        area=950,
        price=4_200_000,
        status=UnitStatusEnum.AVAILABLE,
    )
    db.add_all([unit, other_unit])
    db.flush()
    customer = Customer(
        name="Operations Customer",
        phone="9876543233",
        assigned_to_id=user_id,
    )
    db.add(customer)
    db.flush()
    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        created_by_id=user_id,
        status=BookingStatusEnum.APPROVED,
    )
    db.add(booking)
    db.flush()
    payment = Payment(
        booking_id=booking.id,
        amount=100000,
        status=PaymentStatusEnum.PENDING,
        recorded_by_id=user_id,
    )
    db.add(payment)
    db.commit()
    return company, unit, other_unit, customer, booking, payment


def test_rental_lease_invoice_and_transition_controls(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    user_id = client.get("/auth/me", headers=headers).json()["id"]
    _, unit, _, _, _, _ = _property_graph(test_db, user_id)
    start = date.today()
    end = start + timedelta(days=365)

    invalid_dates = client.post(
        "/rentals/leases",
        json={
            "tenant_name": "Bad Dates",
            "tenant_phone": "9876543234",
            "unit_id": unit.id,
            "start_date": end.isoformat(),
            "end_date": start.isoformat(),
            "rent_amount": 25000,
            "security_deposit": 50000,
        },
        headers=headers,
    )
    assert invalid_dates.status_code == 422
    missing_unit = client.post(
        "/rentals/leases",
        json={
            "tenant_name": "Missing Unit",
            "tenant_phone": "9876543234",
            "unit_id": 99999,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "rent_amount": 25000,
            "security_deposit": 50000,
        },
        headers=headers,
    )
    assert missing_unit.status_code == 404

    created = client.post(
        "/rentals/leases",
        json={
            "tenant_name": "Rental Tenant",
            "tenant_email": "tenant@example.com",
            "tenant_phone": "9876543234",
            "unit_id": unit.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "rent_amount": 25000,
            "security_deposit": 50000,
        },
        headers=headers,
    )
    assert created.status_code == 201
    lease_id = created.json()["lease"]["id"]
    assert client.post(
        "/rentals/leases",
        json={
            "tenant_name": "Overlapping Tenant",
            "tenant_phone": "9876543235",
            "unit_id": unit.id,
            "start_date": (start + timedelta(days=1)).isoformat(),
            "end_date": end.isoformat(),
            "rent_amount": 26000,
            "security_deposit": 50000,
        },
        headers=headers,
    ).status_code == 409

    detail = client.get(f"/rentals/leases/{lease_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["lease"]["status"] == "ACTIVE"
    leases = client.get(
        f"/rentals/leases?status=ACTIVE&unit_id={unit.id}"
        "&search=tenant&sort_by=rent_amount&sort_order=asc&size=1",
        headers=headers,
    )
    assert leases.status_code == 200
    assert leases.headers["x-total-count"] == "1"
    assert client.get("/rentals/leases/99999", headers=headers).status_code == 404

    invoice = RentalInvoice(
        lease_id=lease_id,
        amount=25000,
        due_date=start,
        status=InvoiceStatusEnum.OVERDUE,
    )
    test_db.add(invoice)
    test_db.commit()
    invoices = client.get(
        f"/rentals/invoices?status=OVERDUE&lease_id={lease_id}"
        f"&due_from={start.isoformat()}&due_to={start.isoformat()}"
        "&sort_order=desc&size=1",
        headers=headers,
    )
    assert invoices.status_code == 200
    assert invoices.headers["x-total-count"] == "1"
    paid = client.patch(
        f"/rentals/invoices/{invoice.id}/mark-paid",
        json={},
        headers=headers,
    )
    assert paid.status_code == 200
    assert paid.json()["status"] == "PAID"
    assert client.patch(
        f"/rentals/invoices/{invoice.id}/mark-paid",
        json={},
        headers=headers,
    ).status_code == 409
    assert client.patch(
        "/rentals/invoices/99999/mark-paid",
        json={},
        headers=headers,
    ).status_code == 404

    terminated = client.patch(
        f"/rentals/leases/{lease_id}/status",
        json={"status": "TERMINATED"},
        headers=headers,
    )
    assert terminated.status_code == 200
    assert terminated.json()["status"] == "TERMINATED"
    assert client.patch(
        f"/rentals/leases/{lease_id}/status",
        json={"status": "ACTIVE"},
        headers=headers,
    ).status_code == 409
    assert client.patch(
        "/rentals/leases/99999/status",
        json={"status": "ACTIVE"},
        headers=headers,
    ).status_code == 404


def test_handover_and_service_ticket_business_rules(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    user_id = client.get("/auth/me", headers=headers).json()["id"]
    _, unit, other_unit, customer, booking, payment = _property_graph(
        test_db, user_id
    )

    assert client.post(
        "/possession/handovers",
        json={"booking_id": 99999},
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/possession/handovers",
        json={"booking_id": booking.id},
        headers=headers,
    ).status_code == 409

    booking.status = BookingStatusEnum.CONFIRMED
    test_db.commit()
    assert client.post(
        "/possession/handovers",
        json={"booking_id": booking.id},
        headers=headers,
    ).status_code == 409

    payment.status = PaymentStatusEnum.RECEIVED
    test_db.commit()
    handover = client.post(
        "/possession/handovers",
        json={
            "booking_id": booking.id,
            "is_snagging_completed": True,
            "keys_handed_over": True,
            "welcome_kit_provided": True,
            "notes": "Handover completed",
        },
        headers=headers,
    )
    assert handover.status_code == 201
    assert client.post(
        "/possession/handovers",
        json={"booking_id": booking.id},
        headers=headers,
    ).status_code == 409
    handovers = client.get(
        f"/possession/handovers?booking_id={booking.id}&sort_order=asc&size=1",
        headers=headers,
    )
    assert handovers.status_code == 200
    assert handovers.headers["x-total-count"] == "1"

    assert client.post(
        "/possession/tickets",
        json={
            "customer_id": 99999,
            "subject": "Missing customer",
            "description": "Cannot create this ticket",
        },
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/possession/tickets",
        json={
            "customer_id": customer.id,
            "unit_id": 99999,
            "subject": "Missing unit",
            "description": "Cannot create this ticket",
        },
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/possession/tickets",
        json={
            "customer_id": customer.id,
            "unit_id": other_unit.id,
            "subject": "Wrong unit",
            "description": "Customer does not own this unit",
        },
        headers=headers,
    ).status_code == 409

    ticket = client.post(
        "/possession/tickets",
        json={
            "customer_id": customer.id,
            "unit_id": unit.id,
            "subject": "Water leakage",
            "description": "Leakage observed in the kitchen",
            "priority": "HIGH",
        },
        headers=headers,
    )
    assert ticket.status_code == 201
    ticket_id = ticket.json()["ticket_id"]
    assert client.get(
        f"/possession/tickets/{ticket_id}", headers=headers
    ).status_code == 200
    assert client.get(
        "/possession/tickets/99999", headers=headers
    ).status_code == 404
    assert client.patch(
        f"/possession/tickets/{ticket_id}",
        json={"status": "RESOLVED"},
        headers=headers,
    ).status_code == 409
    assert client.patch(
        f"/possession/tickets/{ticket_id}",
        json={"assigned_to_id": 99999},
        headers=headers,
    ).status_code == 404

    assigned = client.patch(
        f"/possession/tickets/{ticket_id}",
        json={
            "assigned_to_id": user_id,
            "status": "IN_PROGRESS",
            "priority": "CRITICAL",
        },
        headers=headers,
    )
    assert assigned.status_code == 200
    assert assigned.json()["status"] == "IN_PROGRESS"
    resolved = client.patch(
        f"/possession/tickets/{ticket_id}",
        json={"status": "RESOLVED"},
        headers=headers,
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolved_at"] is not None
    tickets = client.get(
        f"/possession/tickets?status=RESOLVED&priority=CRITICAL"
        f"&assigned_to_id={user_id}&search=leakage"
        "&sort_by=priority&sort_order=asc&size=1",
        headers=headers,
    )
    assert tickets.status_code == 200
    assert tickets.headers["x-total-count"] == "1"


def test_partner_settings_and_audit_side_effects(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    company = Company(name="Configuration Company")
    test_db.add(company)
    test_db.commit()

    assert client.get("/settings", headers=headers).json() == {}
    settings = client.patch(
        "/settings",
        json={
            "general": {"currency": "INR", "timezone": "Asia/Kolkata"},
            "security": {"mfa_required": True},
        },
        headers=headers,
    )
    assert settings.status_code == 200
    assert settings.json()["general"]["currency"] == "INR"
    assert client.get("/settings", headers=headers).json()["security"][
        "mfa_required"
    ] is True

    broker = client.post(
        "/partners",
        json={
            "name": "Trusted Broker",
            "company_name": "Trusted Realty",
            "rera_registration": "RERA-123",
            "phone": "9876543244",
            "email": "broker@example.com",
            "bank_account": "1234567890",
            "bank_ifsc": "IFSC0001",
        },
        headers=headers,
    )
    assert broker.status_code == 201
    brokers = client.get(
        "/partners?search=trusted&is_active=true&sort_order=desc&size=1",
        headers=headers,
    )
    assert brokers.status_code == 200
    assert brokers.json()["total"] == 1
    assert brokers.json()["brokers"][0]["name"] == "Trusted Broker"

    audit = client.get(
        "/audit?module=PARTNER&action=CREATE&search=PARTNER",
        headers=headers,
    )
    assert audit.status_code == 200
    assert audit.headers["x-total-count"] == "1"
