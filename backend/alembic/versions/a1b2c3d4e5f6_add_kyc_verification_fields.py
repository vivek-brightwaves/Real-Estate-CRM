"""Add verified_by_id and verified_at to customer_documents

Revision ID: a1b2c3d4e5f6
Revises: 9ea45d2e112f
Create Date: 2026-07-23 12:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9ea45d2e112f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add KYC verification tracking columns to customer_documents table."""
    op.add_column('customer_documents',
        sa.Column('verified_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True)
    )
    op.add_column('customer_documents',
        sa.Column('verified_at', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    """Remove KYC verification tracking columns."""
    op.drop_column('customer_documents', 'verified_at')
    op.drop_column('customer_documents', 'verified_by_id')
