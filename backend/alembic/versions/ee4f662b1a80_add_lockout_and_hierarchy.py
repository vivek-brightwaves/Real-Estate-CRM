"""Add lockout and hierarchy fields to users.

Revision ID: ee4f662b1a80
Revises: d13e5f7a9b20
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "ee4f662b1a80"
down_revision: Union[str, Sequence[str], None] = "d13e5f7a9b20"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("users", sa.Column("department", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("project_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_project_id", "users", "projects", ["project_id"], ["id"])
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("0")))

def downgrade() -> None:
    op.drop_constraint("fk_users_project_id", "users", type_="foreignkey")
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "project_id")
    op.drop_column("users", "department")
