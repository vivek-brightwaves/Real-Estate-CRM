"""Reconcile the enterprise audit-log schema.

Revision ID: ee4f662b1a7f
Revises: 9b081664dc7c
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "ee4f662b1a7f"
down_revision: Union[str, Sequence[str], None] = "9b081664dc7c"
branch_labels = None
depends_on = None


def _create_index_if_missing(
    table_name: str,
    index_name: str,
    columns: list[str],
) -> None:
    bind = op.get_bind()
    indexes = {
        index["name"] for index in sa.inspect(bind).get_indexes(table_name)
    }
    if index_name not in indexes:
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.tables["audit_logs"].create(bind=bind, checkfirst=True)
    existing = {
        column["name"] for column in sa.inspect(bind).get_columns("audit_logs")
    }
    additions = {
        "module": sa.Column(
            "module",
            sa.String(100),
            nullable=False,
            server_default="SYSTEM",
        ),
        "old_values": sa.Column("old_values", sa.JSON(), nullable=True),
        "new_values": sa.Column("new_values", sa.JSON(), nullable=True),
        "ip_address": sa.Column("ip_address", sa.String(45), nullable=True),
        "user_agent": sa.Column("user_agent", sa.String(500), nullable=True),
    }
    for name, column in additions.items():
        if name not in existing:
            op.add_column("audit_logs", column)

    for name, columns in {
        "ix_audit_logs_action": ["action"],
        "ix_audit_logs_entity_type": ["entity_type"],
        "ix_audit_logs_module": ["module"],
        "ix_audit_logs_timestamp": ["timestamp"],
    }.items():
        _create_index_if_missing("audit_logs", name, columns)


def downgrade() -> None:
    pass
