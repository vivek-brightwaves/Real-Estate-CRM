"""Booking, discount, payment, receipt, and cancellation integration tests."""

from datetime import date, timedelta

from app.models.customers import Customer, CustomerDocument, DocStatusEnum
from app.models.leads import Lead
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.sales import Booking, PaymentStatusEnum


def _sales_graph(db, employee_id: int):
    project = Project(name="Revenue Project", branch_id=1, status="ACTIVE")
    db.add(project)
    db.flush()
    tower = Tower(name="Revenue Tower", project_id=project.id)
    db.add(tower)
    db.flush()
    block = Block(name="Revenue Block", tower_id=tower.id)
    db.add(block)
    db.flush()
    unit = Unit(
        block_id=block.id,
        unit_number="R-101",
        type="2BHK",
        area=1000,
        price=5_000_000,
        status=UnitStatusEnum.AVAILABLE,
    )
    unverified_unit = Unit(
        block_id=block.id,
        unit_number="R-102",
        type="2BHK",
        area=1100,
        price=5_500_000,
        status=UnitStatusEnum.AVAILABLE,
    )
    db.add_all([unit, unverified_unit])
    db.flush()
    lead = Lead(
        company_id=1,
        name="Revenue Buyer",
        phone="9876543222",
        email="revenue@example.com",
        created_by_id=employee_id,
        assigned_to_id=employee_id,
    )
    db.add(lead)
    db.flush()
    customer = Customer(
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        lead_id=lead.id,
        assigned_to_id=employee_id,
    )
    db.add(customer)
    db.flush()
    db.add(
        CustomerDocument(
            customer_id=customer.id,
            doc_type="IDENTITY",
            file_url="/uploads/identity.pdf",
            status=DocStatusEnum.VERIFIED,
        )
    )
    unverified_lead = Lead(
        company_id=1,
        name="Unverified Buyer",
        phone="9876543223",
        created_by_id=employee_id,
        assigned_to_id=employee_id,
    )
    db.add(unverified_lead)
    db.flush()
    unverified_customer = Customer(
        name=unverified_lead.name,
        phone=unverified_lead.phone,
        lead_id=unverified_lead.id,
        assigned_to_id=employee_id,
    )
    db.add(unverified_customer)
    db.commit()
    return unit, unverified_unit, customer, unverified_customer


def test_booking_discount_payment_receipt_and_cancellation_flow(
    client,
    test_db,
    employee_token_headers,
    manager_token_headers,
    admin_token_headers,
):
    employee_headers = employee_token_headers
    manager_headers = manager_token_headers
    super_headers = admin_token_headers
    employee_id = client.get("/auth/me", headers=employee_headers).json()["id"]
    unit, unverified_unit, customer, unverified_customer = _sales_graph(
        test_db, employee_id
    )

    assert client.post(
        "/bookings",
        json={"unit_id": 99999, "customer_id": customer.id},
        headers=employee_headers,
    ).status_code == 400
    assert client.post(
        "/bookings",
        json={"unit_id": unverified_unit.id, "customer_id": 99999},
        headers=employee_headers,
    ).status_code == 404
    assert client.post(
        "/bookings",
        json={
            "unit_id": unverified_unit.id,
            "customer_id": unverified_customer.id,
        },
        headers=employee_headers,
    ).status_code == 400

    created = client.post(
        "/bookings",
        json={"unit_id": unit.id, "customer_id": customer.id},
        headers=employee_headers,
    )
    assert created.status_code == 201
    booking_id = created.json()["id"]
    assert created.json()["has_verified_kyc"] is True

    assert client.post(
        "/bookings",
        json={"unit_id": unit.id, "customer_id": customer.id},
        headers=employee_headers,
    ).status_code == 400
    bookings = client.get(
        f"/bookings?status=PENDING&customer_id={customer.id}&unit_id={unit.id}"
        "&search=revenue&sort_by=customer_id&sort_order=asc&size=1",
        headers=employee_headers,
    )
    assert bookings.status_code == 200
    assert bookings.headers["x-total-count"] == "1"
    assert client.get(
        f"/bookings/{booking_id}", headers=employee_headers
    ).status_code == 200
    assert client.get(
        "/bookings/99999", headers=employee_headers
    ).status_code == 404

    assert client.patch(
        f"/bookings/{booking_id}/approve", headers=manager_headers
    ).status_code == 400
    documents = client.patch(
        f"/bookings/{booking_id}/verify-documents",
        headers=manager_headers,
    )
    assert documents.status_code == 200
    assert documents.json()["status"] == "DOCS_VERIFIED"
    assert client.patch(
        f"/bookings/{booking_id}/verify-documents",
        headers=manager_headers,
    ).status_code == 400

    invalid_discount = client.post(
        f"/bookings/{booking_id}/request-discount",
        json={"amount": -1},
        headers=employee_headers,
    )
    assert invalid_discount.status_code == 422
    discount = client.post(
        f"/bookings/{booking_id}/request-discount",
        json={"amount": 300000, "reason": "Launch offer"},
        headers=employee_headers,
    )
    assert discount.status_code == 201
    discount_id = discount.json()["id"]
    assert discount.json()["status"] == "PENDING"
    assert client.post(
        f"/bookings/{booking_id}/request-discount",
        json={"amount": 300001},
        headers=employee_headers,
    ).status_code == 400
    assert client.patch(
        f"/bookings/{booking_id}/approve", headers=manager_headers
    ).status_code == 409

    level_two = client.patch(
        f"/approvals/{discount_id}/approve?remarks=manager-approved",
        headers=super_headers,
    )
    assert level_two.status_code == 200
    assert level_two.json()["status"] == "UNDER_REVIEW"
    final_discount = client.patch(
        f"/approvals/{discount_id}/approve?remarks=director-approved",
        headers=super_headers,
    )
    assert final_discount.status_code == 200
    assert final_discount.json()["status"] == "APPROVED"

    generic_approval = client.post(
        f"/bookings/{booking_id}/request-approval",
        json={"type": "BOOKING_APPROVAL", "payload": {"reason": "exception"}},
        headers=employee_headers,
    )
    assert generic_approval.status_code == 201
    assert generic_approval.json()["payload"]["booking_id"] == booking_id

    approved = client.patch(
        f"/bookings/{booking_id}/approve", headers=manager_headers
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"
    assert client.patch(
        f"/bookings/{booking_id}/confirm", headers=manager_headers
    ).status_code == 409

    yesterday = date.today() - timedelta(days=1)
    payment = client.post(
        "/payments",
        json={
            "booking_id": booking_id,
            "amount": 100000,
            "due_date": yesterday.isoformat(),
        },
        headers=employee_headers,
    )
    assert payment.status_code == 201
    payment_id = payment.json()["id"]
    assert client.post(
        "/payments",
        json={"booking_id": 99999, "amount": 1},
        headers=employee_headers,
    ).status_code == 404

    overdue = client.get(
        f"/payments?status=OVERDUE&booking_id={booking_id}"
        f"&due_from={yesterday.isoformat()}&due_to={date.today().isoformat()}"
        "&min_amount=50000&max_amount=150000&sort_by=amount&sort_order=desc"
        "&size=1",
        headers=employee_headers,
    )
    assert overdue.status_code == 200
    assert overdue.headers["x-total-count"] == "1"
    assert overdue.json()[0]["status"] == "OVERDUE"
    assert client.get(
        "/payments?due_from=2026-02-02&due_to=2026-01-01",
        headers=employee_headers,
    ).status_code == 422
    assert client.get(
        "/payments?min_amount=10&max_amount=1",
        headers=employee_headers,
    ).status_code == 422

    reminder = client.post(
        f"/payments/{payment_id}/reminder", headers=employee_headers
    )
    assert reminder.status_code == 200
    assert reminder.json()["customer_name"]
    assert reminder.json()["assigned_user_id"]
    assert reminder.json()["delivery_status"]
    assert client.post(
        f"/payments/{payment_id}/generate-receipt",
        headers=employee_headers,
    ).status_code == 400

    received = client.patch(
        f"/payments/{payment_id}/mark-received",
        json={"mode": "BANK_TRANSFER", "receipt_number": "RCPT-1001"},
        headers=manager_headers,
    )
    assert received.status_code == 200
    assert received.json()["status"] == "RECEIVED"
    assert client.patch(
        f"/payments/{payment_id}/mark-received",
        json={"mode": "BANK_TRANSFER"},
        headers=manager_headers,
    ).status_code == 400

    receipt = client.post(
        f"/payments/{payment_id}/generate-receipt",
        headers=employee_headers,
    )
    assert receipt.status_code == 200
    assert receipt.headers["content-type"] == "application/pdf"
    assert receipt.content.startswith(b"%PDF")
    assert client.post(
        f"/payments/{payment_id}/reminder", headers=employee_headers
    ).status_code == 400

    confirmed = client.patch(
        f"/bookings/{booking_id}/confirm", headers=manager_headers
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "CONFIRMED"
    cancelled = client.patch(
        f"/bookings/{booking_id}/cancel", headers=super_headers
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"
    assert client.patch(
        f"/bookings/{booking_id}/cancel", headers=super_headers
    ).status_code == 400

    test_db.refresh(unit)
    assert unit.status == UnitStatusEnum.AVAILABLE
    assert test_db.query(Booking).filter(Booking.id == booking_id).one().payments[
        0
    ].status == PaymentStatusEnum.RECEIVED


def test_payment_missing_paths(client, test_db, admin_token_headers):
    headers = admin_token_headers
    assert client.patch(
        "/payments/99999/mark-received",
        json={"mode": "CASH"},
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/payments/99999/reminder", headers=headers
    ).status_code == 404
    assert client.post(
        "/payments/99999/generate-receipt", headers=headers
    ).status_code == 404
