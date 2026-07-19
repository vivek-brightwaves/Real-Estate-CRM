from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum, Company
from app.schemas.organization import SettingsUpdate, CompanyOut

router = APIRouter()

@router.get("/", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def get_settings(db: Session = Depends(get_db)):
    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return company.settings_json or {}

@router.patch("/", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    current_settings = company.settings_json or {}
    
    # Merge updates
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            if key not in current_settings:
                current_settings[key] = {}
            current_settings[key].update(val)
            
    company.settings_json = current_settings
    db.commit()
    
    return current_settings
