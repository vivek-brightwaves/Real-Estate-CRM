"""seed_permissions_and_rbac

Revision ID: e5a2333a9eec
Revises: ee4f662b1a80
Create Date: 2026-08-04 09:30:42.416562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a2333a9eec'
down_revision: Union[str, Sequence[str], None] = 'ee4f662b1a80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    
    # 1. Core Modules and Actions defined in the specifications
    modules = [
        "users", "roles", "projects", "inventory", "leads", "site_visits",
        "customers", "bookings", "payments", "rentals", "possession",
        "tasks", "messages", "audit", "scheduler", "files"
    ]
    actions = [
        "view", "create", "edit", "delete", "approve", "assign", "export",
        "import", "print", "download", "upload", "status", "restore", "archive"
    ]

    # Create Permission combinations
    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )

    # Fetch existing permissions to avoid duplicates
    existing_perms = set(bind.execute(sa.select(permissions_table.c.name)).scalars())
    
    # Generate and insert all 224 combinations
    for module in modules:
        for action in actions:
            perm_name = f"{module}:{action}"
            if perm_name not in existing_perms:
                desc = f"Allows {action} operation on {module} module."
                bind.execute(
                    permissions_table.insert().values(
                        name=perm_name,
                        description=desc
                    )
                )

    # 2. Map default permissions to seeded role profiles
    roles_table = sa.table(
        "roles",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
    )
    
    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("role_id", sa.Integer),
        sa.column("permission_id", sa.Integer),
    )

    # Fetch all roles and permissions with IDs
    db_roles = bind.execute(sa.select(roles_table.c.id, roles_table.c.name)).all()
    db_permissions = bind.execute(sa.select(permissions_table.c.id, permissions_table.c.name)).all()

    role_dict = {name: r_id for r_id, name in db_roles}
    perm_dict = {name: p_id for p_id, name in db_permissions}

    ROLE_PERMISSIONS_MAPPING = {
        "Business Owner or Director": "*",  # All permissions
        "Organization Administrator": "*",  # All permissions
        "Sales Head": [
            ("leads", ["view", "create", "edit", "approve", "assign", "export", "status"]),
            ("site_visits", ["view", "create", "edit", "approve", "assign", "export", "status"]),
            ("customers", ["view", "create", "edit", "export"]),
            ("bookings", ["view", "create", "edit", "approve", "export", "status"]),
            ("tasks", ["view", "create", "edit", "assign", "status"]),
            ("messages", ["view", "create", "edit"]),
        ],
        "Branch or Project Manager": [
            ("inventory", ["view", "create", "edit", "status"]),
            ("leads", ["view", "create", "edit", "assign", "status"]),
            ("site_visits", ["view", "create", "edit", "assign", "status"]),
            ("bookings", ["view", "create", "edit", "approve", "status"]),
            ("rentals", ["view", "create", "edit", "status"]),
            ("tasks", ["view", "create", "edit", "assign", "status"]),
        ],
        "Inside Sales or Telecalling Executive": [
            ("leads", ["view", "create", "edit", "status"]),
            ("site_visits", ["view", "create", "edit", "status"]),
            ("customers", ["view", "create", "edit"]),
            ("tasks", ["view", "create", "edit", "status"]),
            ("messages", ["view", "create", "edit"]),
        ],
        "Field Sales Executive": [
            ("leads", ["view", "status"]),
            ("site_visits", ["view", "create", "edit", "status"]),
            ("tasks", ["view", "create", "edit", "status"]),
        ],
        "CRM Executive": [
            ("bookings", ["view", "create", "edit", "status"]),
            ("customers", ["view", "create", "edit"]),
            ("tasks", ["view", "create", "edit", "status"]),
            ("messages", ["view", "create", "edit"]),
            ("files", ["view", "create", "edit", "upload", "download"]),
        ],
        "Collections Executive": [
            ("payments", ["view", "create", "edit", "status"]),
            ("customers", ["view", "status"]),
            ("tasks", ["view", "create", "edit", "status"]),
        ],
        "Finance and Accounts User": [
            ("payments", ["view", "create", "edit", "approve", "export", "status"]),
            ("bookings", ["view", "status"]),
            ("customers", ["view", "status"]),
            ("audit", ["view", "export"]),
        ],
        "Channel Partner Manager": [
            ("leads", ["view", "create", "edit", "status"]),
            ("site_visits", ["view", "create", "status"]),
            ("tasks", ["view", "create", "edit", "status"]),
        ],
        "Broker or Channel Partner": [
            ("inventory", ["view"]),
            ("leads", ["view", "create", "edit", "status"]),
            ("site_visits", ["view", "create", "status"]),
        ],
        "Property Manager": [
            ("rentals", ["view", "create", "edit", "approve", "status"]),
            ("possession", ["view", "create", "edit", "approve", "status"]),
            ("tasks", ["view", "create", "edit", "status"]),
        ],
        "Customer or Buyer": [
            ("bookings", ["view"]),
            ("payments", ["view"]),
            ("messages", ["view", "create"]),
        ],
        "Tenant": [
            ("rentals", ["view"]),
            ("messages", ["view", "create"]),
        ],
    }

    # Clean existing role permission associations
    bind.execute(role_permissions_table.delete())

    # Map permissions
    for r_name, rules in ROLE_PERMISSIONS_MAPPING.items():
        if r_name not in role_dict:
            continue
        role_id = role_dict[r_name]
        
        target_perm_ids = []
        if rules == "*":
            target_perm_ids = list(perm_dict.values())
        else:
            for module, actions_list in rules:
                for act in actions_list:
                    perm_name = f"{module}:{act}"
                    if perm_name in perm_dict:
                        target_perm_ids.append(perm_dict[perm_name])
        
        for p_id in target_perm_ids:
            bind.execute(
                role_permissions_table.insert().values(
                    role_id=role_id,
                    permission_id=p_id
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("role_id", sa.Integer),
        sa.column("permission_id", sa.Integer),
    )
    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
    )
    bind.execute(role_permissions_table.delete())
    bind.execute(permissions_table.delete())
