from app.models.projects import Unit, UnitStatusEnum
from app.models.sales import Booking, BookingStatusEnum

def setup_booking_for_discount(test_db, emp_id):
    unit = Unit(block_id=1, unit_number="101", type="3BHK", area=1800.0, price=10000000.0, status=UnitStatusEnum.AVAILABLE)
    test_db.add(unit)
    test_db.commit()
    test_db.refresh(unit)
    
    booking = Booking(unit_id=unit.id, customer_id=1, created_by_id=emp_id, status=BookingStatusEnum.APPROVED)
    test_db.add(booking)
    test_db.commit()
    test_db.refresh(booking)
    return booking

def test_discount_auto_approve(client, test_db, employee_token_headers):
    from app.models.users import User, RoleEnum
    emp = test_db.query(User).filter(User.role == RoleEnum.EMPLOYEE).first()
    emp_id = emp.id
    
    booking = setup_booking_for_discount(test_db, emp_id)
    
    # Request 2% discount (threshold is 5% logic in bookings.py)
    # Unit price = 10000000, 2% = 200000
    app_resp = client.post(f"/bookings/{booking.id}/request-approval", json={
        "type": "DISCOUNT",
        "payload": {"amount": 200000}
    }, headers=employee_token_headers)
    
    assert app_resp.status_code == 200
    data = app_resp.json()
    assert data["status"] == "APPROVED"  # Auto approved because < 5%

def test_discount_requires_admin(client, test_db, employee_token_headers):
    from app.models.users import User, RoleEnum
    emp = test_db.query(User).filter(User.role == RoleEnum.EMPLOYEE).first()
    emp_id = emp.id
    
    booking = setup_booking_for_discount(test_db, emp_id)
    
    # Request 10% discount 
    # Unit price = 10000000, 10% = 1000000
    app_resp = client.post(f"/bookings/{booking.id}/request-approval", json={
        "type": "DISCOUNT",
        "payload": {"amount": 1000000}
    }, headers=employee_token_headers)
    
    assert app_resp.status_code == 200
    data = app_resp.json()
    assert data["status"] == "PENDING"  # Requires super admin approval
