"""Reconcile file-upload persistence.

Revision ID: 10109f9b55e3
Revises: ee4f662b1a7f
"""

from typing import Sequence, Union

from alembic import op

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "10109f9b55e3"
down_revision: Union[str, Sequence[str], None] = "ee4f662b1a7f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.tables["file_uploads"].create(
        bind=op.get_bind(),
        checkfirst=True,
    )


def downgrade() -> None:
    pass
