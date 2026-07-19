import json
from sqlalchemy.orm import Session
from app.models.system import AuditLog

def log_audit(db: Session, user_id: int, entity_type: str, entity_id: int, action: str, changes: dict = None):
    """
    Creates an audit log entry for any significant data mutation.
    """
    # Filter out empty dicts
    if changes and len(changes) == 0:
        changes = None
        
    audit = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changes=changes
    )
    db.add(audit)
    db.commit()
    return audit
