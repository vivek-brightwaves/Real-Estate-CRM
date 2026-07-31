"""Add documented business-role profiles.

Revision ID: d13e5f7a9b20
Revises: c82d4e5f6a70
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d13e5f7a9b20"
down_revision: Union[str, Sequence[str], None] = "c82d4e5f6a70"
branch_labels = None
depends_on = None


DOCUMENTED_ROLES = (
    (
        "Organization Administrator",
        "Configures projects, users, workflows, integrations and security.",
        "ADMIN",
    ),
    (
        "Business Owner or Director",
        "Reviews sales, collections, inventory, forecasts and profitability.",
        "SUPER_ADMIN",
    ),
    (
        "Sales Head",
        "Manages sales targets, teams, pipelines, allocation and approvals.",
        "MANAGER",
    ),
    (
        "Branch or Project Manager",
        "Manages project-specific leads, inventory, visits and bookings.",
        "MANAGER",
    ),
    (
        "Inside Sales or Telecalling Executive",
        "Qualifies leads, schedules appointments and performs follow-ups.",
        "EMPLOYEE",
    ),
    (
        "Field Sales Executive",
        "Conducts site visits, presents properties and records feedback.",
        "EMPLOYEE",
    ),
    (
        "CRM Executive",
        "Manages bookings, documents, demand letters and communication.",
        "EMPLOYEE",
    ),
    (
        "Collections Executive",
        "Monitors installments, overdue accounts, reminders and recovery.",
        "EMPLOYEE",
    ),
    (
        "Finance and Accounts User",
        "Verifies payments, reconciliation, receipts, taxes and refunds.",
        "ADMIN",
    ),
    (
        "Channel Partner Manager",
        "Onboards brokers and manages partner performance and commissions.",
        "PARTNER",
    ),
    (
        "Broker or Channel Partner",
        "Registers leads, views authorized inventory and monitors commissions.",
        "BROKER",
    ),
    (
        "Property Manager",
        "Manages tenants, leases, rent collections and maintenance.",
        "MANAGER",
    ),
    (
        "Customer or Buyer",
        "Views bookings, documents, installments, receipts and requests.",
        "CUSTOMER",
    ),
    (
        "Tenant",
        "Views lease details, rent information and maintenance requests.",
        "CUSTOMER",
    ),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "roles" not in inspector.get_table_names():
        raise RuntimeError("The roles table must exist before this migration")

    columns = {column["name"] for column in inspector.get_columns("roles")}
    if "base_role" not in columns:
        op.add_column(
            "roles",
            sa.Column(
                "base_role",
                sa.String(length=50),
                nullable=False,
                server_default="EMPLOYEE",
            ),
        )

    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("roles")}
    if "ix_roles_base_role" not in indexes:
        op.create_index("ix_roles_base_role", "roles", ["base_role"])

    roles = sa.table(
        "roles",
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("base_role", sa.String),
    )
    existing = set(bind.execute(sa.select(roles.c.name)).scalars())
    for name, description, base_role in DOCUMENTED_ROLES:
        if name not in existing:
            bind.execute(
                roles.insert().values(
                    name=name,
                    description=description,
                    base_role=base_role,
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "roles" not in inspector.get_table_names():
        return
    indexes = {index["name"] for index in inspector.get_indexes("roles")}
    if "ix_roles_base_role" in indexes:
        op.drop_index("ix_roles_base_role", table_name="roles")
    columns = {column["name"] for column in inspector.get_columns("roles")}
    if "base_role" in columns:
        op.drop_column("roles", "base_role")
