from app.models.projects import Unit, UnitStatusEnum
from app.models.customers import Customer

def test_full_lead_to_booking_workflow(client, test_db, employee_token_headers, manager_token_headers):
    # 1. Create a Unit
    unit = Unit(block_id=1, unit_number="101", type="2BHK", area=1200.0, price=5000000.0, status=UnitStatusEnum.AVAILABLE)
    test_db.add(unit)
    test_db.commit()
    test_db.refresh(unit)

    # 2. Employee Creates a Lead
    lead_resp = client.post("/leads/", json={
        "name": "John Doe",
        "phone": "9876543210",
        "source": "Website",
        "initial_note": "Interested in 2BHK"
    }, headers=employee_token_headers)
    assert lead_resp.status_code == 201
    lead_id = lead_resp.json()["id"]

    # 3. Employee Schedules a Visit
    visit_resp = client.post(f"/leads/{lead_id}/schedule-visit", json={
        "scheduled_at": "2026-12-01T10:00:00Z"
    }, headers=employee_token_headers)
    assert visit_resp.status_code == 201

    # 4. Employee Converts Lead to Customer
    # Wait, the POST /customers converts lead.
    customer_resp = client.post("/customers/", json={
        "name": "John Doe",
        "phone": "9876543210",
        "lead_id": lead_id
    }, headers=employee_token_headers)
    assert customer_resp.status_code == 201
    customer_id = customer_resp.json()["id"]

    # 5. Employee Books Unit
    booking_resp = client.post("/bookings/", json={
        "unit_id": unit.id,
        "customer_id": customer_id
    }, headers=employee_token_headers)
    assert booking_resp.status_code == 201
    booking_id = booking_resp.json()["id"]

    # 6. Manager Approves Booking
    # First docs verification
    docs_resp = client.patch(f"/bookings/{booking_id}/verify-documents", headers=manager_token_headers)
    assert docs_resp.status_code == 200
    
    app_resp = client.patch(f"/bookings/{booking_id}/approve", headers=manager_token_headers)
    assert app_resp.status_code == 200
    
    # 7. Employee adds Payment manually
    pay_resp = client.post("/payments/", json={
        "booking_id": booking_id,
        "amount": 50000.0,
        "mode": "CASH"
    }, headers=employee_token_headers)
    assert pay_resp.status_code == 201
    pay_id = pay_resp.json()["id"]
    
    # 8. Manager Marks Payment Received
    rcv_resp = client.patch(f"/payments/{pay_id}/mark-received", json={"mode": "CASH"}, headers=manager_token_headers)
    assert rcv_resp.status_code == 200
    
    # 9. Manager Confirms Booking
    conf_resp = client.patch(f"/bookings/{booking_id}/confirm", headers=manager_token_headers)
    assert conf_resp.status_code == 200
    
    # Verify Unit is SOLD
    test_db.refresh(unit)
    assert unit.status == UnitStatusEnum.SOLD
