"""Create the application baseline schema.

Revision ID: cb128008f970
Revises:
Create Date: 2026-07-29
"""

from typing import Sequence, Union

from alembic import op

from app.db.base import Base
import app.models  # noqa: F401 - registers every model with Base.metadata


revision: str = "cb128008f970"
# Existing Docker volumes were stamped with this legacy revision before the
# migration history was rebuilt.  Keeping it as the predecessor lets those
# databases upgrade to the new baseline without manual alembic_version edits.
down_revision: Union[str, Sequence[str], None] = "20260725_add_booking_created_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # checkfirst makes this safe for installations that historically used
    # Base.metadata.create_all before adopting Alembic.
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)
