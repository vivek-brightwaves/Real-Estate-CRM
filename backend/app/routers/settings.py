import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum, Company
from app.schemas.organization import SettingsUpdate
from app.services.audit import log_audit

router = APIRouter()

@router.get(
    "",
    response_model=dict[str, Any],
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))],
)
def get_settings(db: Session = Depends(get_db)):
    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    raw = company.settings_json
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=500, detail="Company settings are invalid")

@router.patch(
    "",
    response_model=dict[str, Any],
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))],
)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    raw = company.settings_json
    if isinstance(raw, dict):
        current_settings = raw
    elif raw:
        try:
            current_settings = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            current_settings = {}
    else:
        current_settings = {}

    # Merge updates
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            if key not in current_settings:
                current_settings[key] = {}
            current_settings[key].update(val)

    company.settings_json = json.dumps(current_settings)
    db.commit()

    log_audit(
        db,
        current_user.id,
        "ORGANIZATION",
        company.id,
        "SETTINGS_UPDATE",
        new_values={"sections": sorted(update_data)},
    )
    return current_settings
