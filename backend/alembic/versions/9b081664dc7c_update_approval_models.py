"""Reconcile approval workflow fields.

Revision ID: 9b081664dc7c
Revises: 2d689324a5d4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "9b081664dc7c"
down_revision: Union[str, Sequence[str], None] = "2d689324a5d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.tables["approval_requests"].create(bind=bind, checkfirst=True)
    existing = {
        column["name"]
        for column in sa.inspect(bind).get_columns("approval_requests")
    }
    additions = {
        "assigned_approver_id": sa.Column(
            "assigned_approver_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        "level": sa.Column(
            "level",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        "remarks": sa.Column("remarks", sa.String(1000), nullable=True),
        "updated_at": sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    }
    for name, column in additions.items():
        if name not in existing:
            op.add_column("approval_requests", column)


def downgrade() -> None:
    pass
