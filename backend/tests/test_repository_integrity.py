"""Database/repository integrity and rollback tests."""

import pytest
from sqlalchemy.dialects import mysql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable

from app.models.customers import Customer
from app.models.leads import Lead
from app.models.possession import HandoverChecklist
from app.models.projects import Block, Project, Tower, Unit, UnitStatusEnum
from app.models.sales import Booking, BookingStatusEnum
from app.models.users import Branch, Company, RoleEnum, User


pytestmark = pytest.mark.repository


def _repository_graph(db):
    company = Company(name="Repository Company")
    db.add(company)
    db.flush()
    branch = Branch(name="Repository Branch", company_id=company.id)
    db.add(branch)
    db.flush()
    user = User(
        name="Repository User",
        email="repository@example.com",
        password_hash="test-only",
        role=RoleEnum.EMPLOYEE,
        branch_id=branch.id,
    )
    db.add(user)
    db.flush()
    project = Project(name="Repository Project", branch_id=branch.id)
    db.add(project)
    db.flush()
    tower = Tower(name="Repository Tower", project_id=project.id)
    db.add(tower)
    db.flush()
    block = Block(name="Repository Block", tower_id=tower.id)
    db.add(block)
    db.flush()
    return company, user, block


def test_unique_unit_constraint_rolls_back_failed_transaction(test_db):
    _, _, block = _repository_graph(test_db)
    first = Unit(
        block_id=block.id,
        unit_number="UNIQUE-101",
        area=1000.25,
        status=UnitStatusEnum.AVAILABLE,
    )
    test_db.add(first)
    test_db.commit()

    duplicate = Unit(
        block_id=block.id,
        unit_number="UNIQUE-101",
        area=1000.25,
        status=UnitStatusEnum.AVAILABLE,
    )
    test_db.add(duplicate)
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()

    units = test_db.query(Unit).filter(
        Unit.block_id == block.id,
        Unit.unit_number == "UNIQUE-101",
    ).all()
    assert [unit.id for unit in units] == [first.id]


def test_customer_and_handover_uniqueness_constraints(test_db):
    company, user, block = _repository_graph(test_db)
    lead = Lead(
        company_id=company.id,
        name="Repository Lead",
        created_by_id=user.id,
        assigned_to_id=user.id,
    )
    unit = Unit(
        block_id=block.id,
        unit_number="HANDOVER-101",
        status=UnitStatusEnum.SOLD,
    )
    test_db.add_all([lead, unit])
    test_db.flush()
    customer = Customer(
        name="Repository Customer",
        lead_id=lead.id,
        assigned_to_id=user.id,
    )
    test_db.add(customer)
    test_db.flush()
    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        created_by_id=user.id,
        status=BookingStatusEnum.CONFIRMED,
    )
    test_db.add(booking)
    test_db.flush()
    handover = HandoverChecklist(
        booking_id=booking.id,
        created_by_id=user.id,
    )
    test_db.add(handover)
    test_db.commit()

    test_db.add(
        Customer(
            name="Duplicate Customer",
            lead_id=lead.id,
            assigned_to_id=user.id,
        )
    )
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()

    test_db.add(
        HandoverChecklist(
            booking_id=booking.id,
            created_by_id=user.id,
        )
    )
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()
    assert test_db.query(HandoverChecklist).filter(
        HandoverChecklist.booking_id == booking.id
    ).count() == 1


def test_models_compile_for_mysql_with_decimal_and_unique_constraints():
    ddl = str(CreateTable(Unit.__table__).compile(dialect=mysql.dialect()))
    normalized = " ".join(ddl.upper().split())
    assert "AREA DECIMAL(12, 2)" in normalized
    assert "CONSTRAINT UQ_UNIT_BLOCK_NUMBER UNIQUE (BLOCK_ID, UNIT_NUMBER)" in normalized
