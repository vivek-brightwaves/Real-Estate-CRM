import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.system import AuditLog

logger = logging.getLogger(__name__)

# Module mapping for cleaner categorization
MODULE_MAP = {
    "AUTH": "Authentication",
    "USER": "Users",
    "ORGANIZATION": "Organization",
    "LEAD": "Leads",
    "CUSTOMER": "Customers",
    "INVENTORY": "Inventory",
    "BOOKING": "Bookings",
    "PAYMENT": "Payments",
    "APPROVAL": "Approvals",
    "RENTAL": "Rentals",
    "POSSESSION": "Possession",
    "TICKET": "Service Tickets",
    "FILE": "File Management",
    "NOTIFICATION": "Notifications",
    "REPORT": "Reports",
    "TASK": "Tasks",
    "MESSAGE": "Messages",
}

def log_audit(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    action: str,
    changes: dict = None,
    old_values: dict = None,
    new_values: dict = None,
    ip_address: str = None,
    user_agent: str = None,
    module: str = None,
):
    """
    Creates an audit log entry for any significant data mutation.

    Args:
        db: Database session
        user_id: ID of user performing action
        entity_type: Type of entity (BOOKING, LEAD, USER, etc.)
        entity_id: ID of the affected entity
        action: The action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
        changes: Legacy field - generic change dict (backward compat)
        old_values: JSON of the old state before change
        new_values: JSON of the new state after change
        ip_address: Client IP address
        user_agent: Client user agent string
        module: Module name override (defaults to entity_type lookup)
    """
    if changes and len(changes) == 0:
        changes = None
    if old_values and len(old_values) == 0:
        old_values = None
    if new_values and len(new_values) == 0:
        new_values = None

    resolved_module = module or MODULE_MAP.get(entity_type, entity_type)

    audit = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        module=resolved_module,
        changes=changes,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit)
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")
        db.rollback()
    return audit
