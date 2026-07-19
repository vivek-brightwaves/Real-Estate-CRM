from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.api.deps import require_roles, get_current_user, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.projects import Project, Tower, Block, Unit, UnitStatusEnum
from app.schemas.inventory import (
    TowerCreate, TowerUpdate, TowerOut,
    BlockCreate, BlockUpdate, BlockOut,
    UnitCreate, UnitUpdate, UnitPriceUpdate, UnitOut
)

router = APIRouter()

# --- Towers ---
@router.post("/towers", response_model=TowerOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def create_tower(tower_in: TowerCreate, db: Session = Depends(get_db)):
    tower = Tower(**tower_in.model_dump())
    db.add(tower)
    db.commit()
    db.refresh(tower)
    return tower

@router.get("/towers", response_model=List[TowerOut])
def get_towers(project_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Note: A real app would apply branch scoping via the linked Project's branch_id
    query = db.query(Tower)
    if project_id:
        query = query.filter(Tower.project_id == project_id)
    return query.offset(skip).limit(limit).all()

# --- Blocks ---
@router.post("/blocks", response_model=BlockOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def create_block(block_in: BlockCreate, db: Session = Depends(get_db)):
    block = Block(**block_in.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block

@router.get("/blocks", response_model=List[BlockOut])
def get_blocks(tower_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Block)
    if tower_id:
        query = query.filter(Block.tower_id == tower_id)
    return query.offset(skip).limit(limit).all()

# --- Units ---
@router.post("/units", response_model=UnitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def create_unit(unit_in: UnitCreate, db: Session = Depends(get_db)):
    unit = Unit(**unit_in.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

@router.get("/units", response_model=List[UnitOut])
def get_units(
    block_id: Optional[int] = None,
    status: Optional[UnitStatusEnum] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Unit)
    if block_id:
        query = query.filter(Unit.block_id == block_id)
    if status:
        query = query.filter(Unit.status == status)
    if type:
        query = query.filter(Unit.type == type)
    if min_price is not None:
        query = query.filter(Unit.price >= min_price)
    if max_price is not None:
        query = query.filter(Unit.price <= max_price)
        
    return query.offset(skip).limit(limit).all()

# --- Strict RBAC Actions ---
@router.post("/units/{unit_id}/hold", response_model=UnitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def hold_unit(unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.status != UnitStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Cannot hold unit with status {unit.status.name}")
    
    unit.status = UnitStatusEnum.HOLD
    unit.hold_expires_at = datetime.utcnow() + timedelta(hours=24)
    db.commit()
    db.refresh(unit)
    return unit

@router.post("/units/{unit_id}/release-hold", response_model=UnitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def release_unit_hold(unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.status != UnitStatusEnum.HOLD:
        raise HTTPException(status_code=400, detail="Unit is not on hold")
    
    unit.status = UnitStatusEnum.AVAILABLE
    unit.hold_expires_at = None
    db.commit()
    db.refresh(unit)
    return unit

@router.patch("/units/{unit_id}/price", response_model=UnitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def update_unit_price(unit_id: int, payload: UnitPriceUpdate, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    unit.price = payload.price
    db.commit()
    db.refresh(unit)
    return unit
