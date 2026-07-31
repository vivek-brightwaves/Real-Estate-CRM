"""Create the first production administrator without default credentials."""

import os
import sys
from pathlib import Path

from pydantic import EmailStr, TypeAdapter, ValidationError

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.security import get_password_hash, validate_password_strength
from app.db.session import SessionLocal
from app.models.users import Branch, Company, RoleEnum, User


def required_environment(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} must be set for the one-time admin bootstrap")
    return value


def seed() -> None:
    admin_name = os.getenv("INITIAL_ADMIN_NAME", "CRM Administrator").strip()
    admin_email = required_environment("INITIAL_ADMIN_EMAIL").lower()
    admin_password = required_environment("INITIAL_ADMIN_PASSWORD")
    company_name = os.getenv("INITIAL_COMPANY_NAME", "Default Company").strip()
    branch_name = os.getenv("INITIAL_BRANCH_NAME", "Main Branch").strip()

    try:
        TypeAdapter(EmailStr).validate_python(admin_email)
    except ValidationError as exc:
        raise RuntimeError("INITIAL_ADMIN_EMAIL must be a valid email address") from exc

    if not validate_password_strength(admin_password):
        raise RuntimeError(
            "INITIAL_ADMIN_PASSWORD must contain at least 8 characters, "
            "uppercase, lowercase, number, and special character"
        )

    db = SessionLocal()
    try:
        if db.query(User).count():
            print("Admin bootstrap skipped: the database already has users.")
            return

        company = db.query(Company).order_by(Company.id).first()
        if company is None:
            company = Company(name=company_name, settings_json="{}")
            db.add(company)
            db.flush()

        branch = (
            db.query(Branch)
            .filter(Branch.company_id == company.id)
            .order_by(Branch.id)
            .first()
        )
        if branch is None:
            branch = Branch(name=branch_name, company_id=company.id)
            db.add(branch)
            db.flush()

        db.add(
            User(
                name=admin_name,
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role=RoleEnum.SUPER_ADMIN,
                branch_id=branch.id,
                is_active=True,
                is_email_verified=True,
            )
        )
        db.commit()
        print(f"Initial administrator created for {admin_email}.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
