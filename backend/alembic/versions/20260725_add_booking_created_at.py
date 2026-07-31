"""Legacy revision bridge for installations created before the schema reset.

Revision ID: 20260725_add_booking_created_at
Revises:
Create Date: 2026-07-31
"""

from typing import Sequence, Union


revision: str = "20260725_add_booking_created_at"
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep the legacy revision reachable; its schema change already exists."""


def downgrade() -> None:
    """No-op: this revision only bridges historical Alembic state."""

