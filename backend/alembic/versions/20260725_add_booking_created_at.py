"""Add Booking.created_at column

Revision ID: 20260725_add_booking_created_at
Revises: 9ea45d2e112f
Create Date: 2026-07-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20260725_add_booking_created_at"
down_revision = "9ea45d2e112f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("bookings", "created_at")
