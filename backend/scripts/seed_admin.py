import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.users import User, RoleEnum, Company, Branch
from app.core.security import get_password_hash

def seed():
    db = SessionLocal()
    try:
        # Check if users exist
        user = db.query(User).first()
        if user:
            print("Database already seeded.")
            return

        print("Seeding database...")
        
        # Create a default company
        company = Company(
            name="Default Company",
            settings_json="{}"
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        # Create a default branch
        branch = Branch(
            name="Main Branch",
            company_id=company.id
        )
        db.add(branch)
        db.commit()
        db.refresh(branch)

        # Create a Super Admin user (credentials from owner.md)
        admin = User(
            name="Super Admin",
            email="admin@gmail.com",
            phone="1234567890",
            password_hash=get_password_hash("admin123"),
            role=RoleEnum.SUPER_ADMIN,
            branch_id=branch.id,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Super Admin created: admin@gmail.com / admin123")

        # Create a Manager user
        manager = User(
            name="Manager",
            email="manager@example.com",
            phone="1234567891",
            password_hash=get_password_hash("manager123"),
            role=RoleEnum.MANAGER,
            branch_id=branch.id,
            is_active=True
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)
        print("Manager created:       manager@example.com / manager123")

        # Create an Employee user
        employee = User(
            name="Employee",
            email="employee@example.com",
            phone="1234567892",
            password_hash=get_password_hash("employee123"),
            role=RoleEnum.EMPLOYEE,
            branch_id=branch.id,
            manager_id=manager.id,
            is_active=True
        )
        db.add(employee)
        db.commit()
        print("Employee created:     employee@example.com / employee123")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
