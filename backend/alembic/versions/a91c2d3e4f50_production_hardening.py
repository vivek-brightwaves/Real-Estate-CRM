"""Add production integrity constraints, indexes, and lifecycle fields.

Revision ID: a91c2d3e4f50
Revises: f7a8b9c0d1e2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a91c2d3e4f50"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> dict[str, dict]:
    return {
        column["name"]: column
        for column in sa.inspect(op.get_bind()).get_columns(table_name)
    }


def _create_index(
    table_name: str,
    index_name: str,
    columns: list[str],
) -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {
        index["name"] for index in inspector.get_indexes(table_name)
    }
    if index_name not in existing:
        op.create_index(index_name, table_name, columns)


def _create_unique(
    table_name: str,
    constraint_name: str,
    columns: list[str],
) -> None:
    inspector = sa.inspect(op.get_bind())
    existing = inspector.get_unique_constraints(table_name)
    expected = set(columns)
    if any(
        constraint["name"] == constraint_name
        or set(constraint.get("column_names") or []) == expected
        for constraint in existing
    ):
        return
    with op.batch_alter_table(table_name) as batch:
        batch.create_unique_constraint(constraint_name, columns)


def upgrade() -> None:
    customer_columns = _columns("customers")
    if "created_at" not in customer_columns:
        op.add_column(
            "customers",
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )

    lead_columns = _columns("leads")
    if "next_follow_up_at" not in lead_columns:
        op.add_column(
            "leads",
            sa.Column(
                "next_follow_up_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )

    unit_area = _columns("units").get("area")
    if unit_area is not None and not isinstance(
        unit_area["type"],
        sa.Numeric,
    ):
        with op.batch_alter_table("units") as batch:
            batch.alter_column(
                "area",
                existing_type=unit_area["type"],
                type_=sa.DECIMAL(12, 2),
                existing_nullable=True,
            )

    indexes = {
        "customers": {
            "ix_customers_created_at": ["created_at"],
        },
        "leads": {
            "ix_leads_next_follow_up_at": ["next_follow_up_at"],
            "ix_leads_created_by_id": ["created_by_id"],
            "ix_leads_updated_by_id": ["updated_by_id"],
            "ix_leads_deleted_by_id": ["deleted_by_id"],
        },
        "lead_notes": {
            "ix_lead_notes_created_by_id": ["created_by_id"],
        },
        "lead_activities": {
            "ix_lead_activities_created_by_id": ["created_by_id"],
        },
        "customer_documents": {
            "ix_customer_documents_verified_by_id": ["verified_by_id"],
        },
        "bookings": {
            "ix_bookings_created_by_id": ["created_by_id"],
            "ix_bookings_approved_by_id": ["approved_by_id"],
        },
        "payments": {
            "ix_payments_recorded_by_id": ["recorded_by_id"],
        },
        "users": {
            "ix_users_manager_id": ["manager_id"],
        },
        "commission_plans": {
            "ix_commission_plans_project_id": ["project_id"],
        },
        "commission_payouts": {
            "ix_commission_payouts_approved_by_id": ["approved_by_id"],
        },
        "handover_checklists": {
            "ix_handover_checklists_created_by_id": ["created_by_id"],
        },
        "service_tickets": {
            "ix_service_tickets_unit_id": ["unit_id"],
            "ix_service_tickets_status": ["status"],
            "ix_service_tickets_priority": ["priority"],
            "ix_service_tickets_assigned_to_id": ["assigned_to_id"],
        },
        "approval_requests": {
            "ix_approval_requests_requested_by_id": ["requested_by_id"],
            "ix_approval_requests_approved_by_id": ["approved_by_id"],
            "ix_approval_requests_assigned_approver_id": [
                "assigned_approver_id"
            ],
        },
    }
    for table_name, table_indexes in indexes.items():
        for index_name, columns in table_indexes.items():
            _create_index(table_name, index_name, columns)

    _create_unique(
        "units",
        "uq_unit_block_number",
        ["block_id", "unit_number"],
    )
    _create_unique(
        "customers",
        "uq_customers_lead_id",
        ["lead_id"],
    )
    _create_unique(
        "handover_checklists",
        "uq_handover_booking",
        ["booking_id"],
    )


def downgrade() -> None:
    # Integrity migrations are intentionally not destructively downgraded.
    # Reverting requires a backup-aware data migration.
    pass
