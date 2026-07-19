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

        # Create a Super Admin user
        admin = User(
            name="Super Admin",
            email="admin@example.com",
            phone="1234567890",
            password_hash=get_password_hash("admin123"),
            role=RoleEnum.SUPER_ADMIN,
            branch_id=branch.id,
            is_active=True
        )
        db.add(admin)
        db.commit()
        
        print("Super Admin user created: admin@example.com / admin123")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
