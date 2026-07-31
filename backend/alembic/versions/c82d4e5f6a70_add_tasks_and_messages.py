"""Add task lifecycle fields and internal messages.

Revision ID: c82d4e5f6a70
Revises: a91c2d3e4f50
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.models.system import Message


revision: str = "c82d4e5f6a70"
down_revision: Union[str, Sequence[str], None] = "a91c2d3e4f50"
branch_labels = None
depends_on = None


def _column_names(table_name: str) -> set[str]:
    return {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns(table_name)
    }


def _index_names(table_name: str) -> set[str]:
    return {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes(table_name)
    }


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "tasks" not in tables:
        raise RuntimeError("The tasks table must exist before this migration")

    columns = _column_names("tasks")
    additions = {
        "created_by_id": sa.Column(
            "created_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        "description": sa.Column("description", sa.Text(), nullable=True),
        "priority": sa.Column(
            "priority",
            sa.String(length=20),
            nullable=False,
            server_default="MEDIUM",
        ),
        "completed_at": sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        "created_at": sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        "updated_at": sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    }
    with op.batch_alter_table("tasks") as batch_op:
        for name, column in additions.items():
            if name not in columns:
                batch_op.add_column(column)

    indexes = _index_names("tasks")
    for name, fields in {
        "ix_tasks_created_by_id": ["created_by_id"],
        "ix_tasks_priority": ["priority"],
        "ix_tasks_created_at": ["created_at"],
        "ix_task_assignee_status_due": [
            "assigned_to_id",
            "status",
            "due_date",
        ],
    }.items():
        if name not in indexes:
            op.create_index(name, "tasks", fields)

    if "messages" not in tables:
        Message.__table__.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "messages" in tables:
        Message.__table__.drop(bind=bind, checkfirst=True)

    if "tasks" not in tables:
        return
    indexes = _index_names("tasks")
    with op.batch_alter_table("tasks") as batch_op:
        for name in (
            "ix_task_assignee_status_due",
            "ix_tasks_created_at",
            "ix_tasks_priority",
            "ix_tasks_created_by_id",
        ):
            if name in indexes:
                batch_op.drop_index(name)
        columns = _column_names("tasks")
        for name in (
            "updated_at",
            "created_at",
            "completed_at",
            "priority",
            "description",
            "created_by_id",
        ):
            if name in columns:
                batch_op.drop_column(name)
