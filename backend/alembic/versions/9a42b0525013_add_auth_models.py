"""Reconcile authentication tables and user security fields.

Revision ID: 9a42b0525013
Revises: cb128008f970
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "9a42b0525013"
down_revision: Union[str, Sequence[str], None] = "cb128008f970"
branch_labels = None
depends_on = None

AUTH_TABLES = (
    "permissions",
    "roles",
    "role_permissions",
    "email_verification_tokens",
    "login_history",
    "password_reset_tokens",
    "user_roles",
    "user_sessions",
)


def upgrade() -> None:
    bind = op.get_bind()
    for table_name in AUTH_TABLES:
        Base.metadata.tables[table_name].create(bind=bind, checkfirst=True)

    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    additions = {
        "failed_login_attempts": sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=True,
            server_default="0",
        ),
        "is_locked": sa.Column(
            "is_locked",
            sa.Boolean(),
            nullable=True,
            server_default=sa.false(),
        ),
        "locked_until": sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        "is_email_verified": sa.Column(
            "is_email_verified",
            sa.Boolean(),
            nullable=True,
            server_default=sa.false(),
        ),
    }
    for name, column in additions.items():
        if name not in columns:
            op.add_column("users", column)


def downgrade() -> None:
    # Baseline installations already contained these tables. Destructive
    # removal is intentionally reserved for the baseline downgrade.
    pass
