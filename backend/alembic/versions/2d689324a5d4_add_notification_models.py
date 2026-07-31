"""Reconcile notification models.

Revision ID: 2d689324a5d4
Revises: 9a42b0525013
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "2d689324a5d4"
down_revision: Union[str, Sequence[str], None] = "9a42b0525013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    for table_name in ("notifications", "notification_templates", "notification_preferences"):
        Base.metadata.tables[table_name].create(bind=bind, checkfirst=True)

    existing = {
        column["name"] for column in sa.inspect(bind).get_columns("notifications")
    }
    additions = {
        "category": sa.Column(
            "category",
            sa.String(50),
            nullable=False,
            server_default="GENERAL",
        ),
        "priority": sa.Column(
            "priority",
            sa.String(20),
            nullable=False,
            server_default="NORMAL",
        ),
        "read_at": sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    }
    for name, column in additions.items():
        if name not in existing:
            op.add_column("notifications", column)


def downgrade() -> None:
    pass
