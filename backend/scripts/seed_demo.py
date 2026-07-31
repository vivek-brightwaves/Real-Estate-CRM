import os
import sys
import json
from datetime import date, timedelta
from decimal import Decimal
from passlib.context import CryptContext

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.users import User, RoleEnum, Company, Branch
from app.models.leads import Lead, LeadStatusEnum
from app.models.customers import Customer, CustomerDocument, DocStatusEnum
from app.models.projects import Project, Tower, Block, Unit, UnitStatusEnum
from app.models.sales import Booking, BookingStatusEnum, Payment, PaymentStatusEnum, PaymentModeEnum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating all tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        print("Seeding Company & Branches...")
        company = Company(name="Empire Real Estate CRM", settings_json=json.dumps({"email": {"enabled": False}}))
        db.add(company)
        db.commit()

        branch1 = Branch(name="Downtown HQ", company_id=company.id)
        branch2 = Branch(name="Uptown Office", company_id=company.id)
        db.add_all([branch1, branch2])
        db.commit()

        print("Seeding Users (1 Super Admin, 2 Managers, 6 Employees)...")
        super_admin = User(name="Super Admin", email="admin@gmail.com", phone="1234567890", role=RoleEnum.SUPER_ADMIN, branch_id=branch1.id, password_hash=get_password_hash("admin123"))
        mgr1 = User(name="Bob Manager (DT)", email="mgr1@example.com", phone="1234567891", role=RoleEnum.MANAGER, branch_id=branch1.id, password_hash=get_password_hash("mgr123"))
        mgr2 = User(name="Charlie Manager (UT)", email="mgr2@example.com", phone="1234567892", role=RoleEnum.MANAGER, branch_id=branch2.id, password_hash=get_password_hash("mgr123"))

        db.add_all([super_admin, mgr1, mgr2])
        db.commit()

        employees = []
        for i in range(1, 7):
            b_id = branch1.id if i <= 3 else branch2.id
            emp = User(name=f"Emp {i}", email=f"emp{i}@example.com", phone=f"555000{i}", role=RoleEnum.EMPLOYEE, branch_id=b_id, manager_id=mgr1.id if i <=3 else mgr2.id, password_hash=get_password_hash("emp123"))
            employees.append(emp)
            db.add(emp)
        db.commit()

        print("Seeding Projects & Inventory...")
        for p in range(1, 4):
            proj = Project(name=f"Project {p}", location="City Center", branch_id=branch1.id if p < 3 else branch2.id)
            db.add(proj)
            db.commit()

            tower = Tower(name="Tower A", project_id=proj.id)
            db.add(tower)
            db.commit()

            block = Block(name="Block 1", tower_id=tower.id)
            db.add(block)
            db.commit()

            for u in range(1, 11):
                unit = Unit(
                    block_id=block.id,
                    unit_number=f"{block.name}-{u}",
                    type="2BHK" if u <= 5 else "3BHK",
                    area=1200 if u <= 5 else 1800,
                    price=5000000 if u <= 5 else 8000000,
                    status=UnitStatusEnum.AVAILABLE
                )
                db.add(unit)
            db.commit()

        print("Seeding Leads & Customers...")
        leads = []
        statuses = [LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED, LeadStatusEnum.VISIT_SCHEDULED, LeadStatusEnum.NEGOTIATION, LeadStatusEnum.CONVERTED, LeadStatusEnum.LOST]
        for lead_number in range(1, 21):
            lead = Lead(
                company_id=company.id,
                name=f"Lead {lead_number}",
                phone=f"999000{lead_number}",
                email=f"lead{lead_number}@test.com",
                source="Website" if lead_number % 2 == 0 else "Referral",
                status=statuses[lead_number % len(statuses)],
                assigned_to_id=employees[lead_number % 6].id,
                created_by_id=employees[lead_number % 6].id
            )
            db.add(lead)
            leads.append(lead)
        db.commit()

        # Convert some WON leads to Customers
        customers = []
        for lead in leads:
            if lead.status == LeadStatusEnum.CONVERTED:
                cust = Customer(
                    name=lead.name, phone=lead.phone, email=lead.email,
                    lead_id=lead.id, assigned_to_id=lead.created_by_id
                )
                db.add(cust)
                db.flush() # flush to get cust.id

                # Create verified KYC docs for demo customers to comply with business rules
                doc = CustomerDocument(
                    customer_id=cust.id,
                    doc_type="ID_PROOF",
                    file_url="https://example.com/dummy_id.pdf",
                    status=DocStatusEnum.VERIFIED,
                    verified_by_id=super_admin.id,
                    verified_at=date.today()
                )
                db.add(doc)

                customers.append(cust)
        db.commit()

        print("Seeding Bookings & Payments...")
        available_units = db.query(Unit).filter(Unit.status == UnitStatusEnum.AVAILABLE).limit(5).all()
        for i, cust in enumerate(customers):
            if i >= 5:
                break
            unit = available_units[i]
            booking = Booking(
                unit_id=unit.id, customer_id=cust.id,
                created_by_id=cust.assigned_to_id,
                status=BookingStatusEnum.CONFIRMED if i % 2 == 0 else BookingStatusEnum.APPROVED,
                approved_by_id=mgr1.id
            )
            unit.status = UnitStatusEnum.SOLD if booking.status == BookingStatusEnum.CONFIRMED else UnitStatusEnum.BOOKED
            db.add(booking)
            db.commit()

            # Add Payments
            price_decimal = unit.price if isinstance(unit.price, Decimal) else Decimal(str(unit.price))
            payment1 = Payment(
                booking_id=booking.id, amount=price_decimal * Decimal('0.1'),
                due_date=date.today(), status=PaymentStatusEnum.RECEIVED,
                mode=PaymentModeEnum.BANK_TRANSFER, received_date=date.today(),
                recorded_by_id=cust.assigned_to_id
            )
            payment2 = Payment(
                booking_id=booking.id, amount=price_decimal * Decimal('0.9'),
                due_date=date.today() + timedelta(days=30), status=PaymentStatusEnum.PENDING,
                mode=None, received_date=None,
                recorded_by_id=cust.assigned_to_id
            )
            db.add_all([payment1, payment2])
        db.commit()

        print("Database successfully seeded for demo!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
