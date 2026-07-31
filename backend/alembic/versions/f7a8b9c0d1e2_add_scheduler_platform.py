"""Reconcile scheduler, retention, and notification-delivery storage.

Revision ID: f7a8b9c0d1e2
Revises: 10109f9b55e3
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.base import Base
import app.models  # noqa: F401


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "10109f9b55e3"
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

    # Creates scheduler/report/archive tables and safely fills any domain table
    # that an older create_all based installation did not contain.
    Base.metadata.create_all(bind=bind, checkfirst=True)

    notification_columns = {
        column["name"]
        for column in sa.inspect(bind).get_columns("notifications")
    }
    notification_additions = {
        "email_subject": sa.Column(
            "email_subject",
            sa.String(255),
            nullable=True,
        ),
        "delivery_status": sa.Column(
            "delivery_status",
            sa.String(20),
            nullable=False,
            server_default="DELIVERED",
        ),
        "delivery_attempts": sa.Column(
            "delivery_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        "last_delivery_error": sa.Column(
            "last_delivery_error",
            sa.String(1000),
            nullable=True,
        ),
        "next_retry_at": sa.Column(
            "next_retry_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    }
    for name, column in notification_additions.items():
        if name not in notification_columns:
            op.add_column("notifications", column)

    archive_columns = {
        column["name"]
        for column in sa.inspect(bind).get_columns("notification_archives")
    }
    archive_additions = {
        "email_subject": sa.Column(
            "email_subject",
            sa.String(255),
            nullable=True,
        ),
        "delivery_status": sa.Column(
            "delivery_status",
            sa.String(20),
            nullable=False,
            server_default="DELIVERED",
        ),
        "delivery_attempts": sa.Column(
            "delivery_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        "last_delivery_error": sa.Column(
            "last_delivery_error",
            sa.String(1000),
            nullable=True,
        ),
    }
    for name, column in archive_additions.items():
        if name not in archive_columns:
            op.add_column("notification_archives", column)

    indexes = {
        "notifications": {
            "ix_notifications_delivery_status": ["delivery_status"],
            "ix_notifications_next_retry_at": ["next_retry_at"],
            "ix_notifications_created_at": ["created_at"],
            "ix_notification_user_read_created": [
                "user_id",
                "is_read",
                "created_at",
            ],
        },
        "approval_requests": {
            "ix_approval_status_created_at": ["status", "created_at"],
            "ix_approval_requests_created_at": ["created_at"],
        },
        "lease_agreements": {
            "ix_lease_agreements_status": ["status"],
            "ix_lease_status_dates": ["status", "start_date", "end_date"],
        },
        "rental_invoices": {
            "ix_rental_invoices_due_date": ["due_date"],
            "ix_rental_invoices_status": ["status"],
            "ix_rental_invoice_status_due_date": ["status", "due_date"],
        },
        "user_sessions": {
            "ix_user_sessions_expires_at": ["expires_at"],
            "ix_user_sessions_is_active": ["is_active"],
        },
        "password_reset_tokens": {
            "ix_password_reset_tokens_expires_at": ["expires_at"],
            "ix_password_reset_tokens_is_used": ["is_used"],
        },
        "email_verification_tokens": {
            "ix_email_verification_tokens_expires_at": ["expires_at"],
            "ix_email_verification_tokens_is_used": ["is_used"],
        },
    }
    for table_name, table_indexes in indexes.items():
        for index_name, columns in table_indexes.items():
            _create_index_if_missing(table_name, index_name, columns)

    unique_names = {
        constraint["name"]
        for constraint in sa.inspect(bind).get_unique_constraints(
            "rental_invoices"
        )
    }
    if "uq_rental_invoice_lease_due_date" not in unique_names:
        op.create_unique_constraint(
            "uq_rental_invoice_lease_due_date",
            "rental_invoices",
            ["lease_id", "due_date"],
        )


def downgrade() -> None:
    # This is a reconciliation migration shared by both Alembic-native and
    # historical create_all installations. Automatic destructive downgrade is
    # intentionally avoided; use a backup-aware data migration if rollback is
    # required.
    pass
