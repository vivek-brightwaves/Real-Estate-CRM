from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Literal, Optional
from datetime import timedelta

from app.db.session import get_db
from app.api.deps import require_roles, get_current_user
from app.models.users import User, RoleEnum
from app.models.projects import Project, Tower, Block, Unit, UnitStatusEnum
from app.schemas.inventory import (
    TowerCreate, TowerOut,
    BlockCreate, BlockOut,
    UnitCreate, UnitPriceUpdate, UnitOut
)
from app.services.audit import log_audit
from app.api.query import apply_sort, paginate
from app.core.time import utcnow

router = APIRouter()
INVENTORY_MANAGERS = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
]


def _project_query_for_user(db: Session, current_user: User):
    query = db.query(Project)
    if current_user.role == RoleEnum.MANAGER:
        query = query.filter(Project.branch_id == current_user.branch_id)
    return query


def _tower_query_for_user(db: Session, current_user: User):
    query = db.query(Tower).join(Tower.project)
    if current_user.role == RoleEnum.MANAGER:
        query = query.filter(Project.branch_id == current_user.branch_id)
    return query


def _block_query_for_user(db: Session, current_user: User):
    query = db.query(Block).join(Block.tower).join(Tower.project)
    if current_user.role == RoleEnum.MANAGER:
        query = query.filter(Project.branch_id == current_user.branch_id)
    return query


def _unit_query_for_user(db: Session, current_user: User):
    query = (
        db.query(Unit)
        .join(Unit.block)
        .join(Block.tower)
        .join(Tower.project)
    )
    if current_user.role == RoleEnum.MANAGER:
        query = query.filter(Project.branch_id == current_user.branch_id)
    return query

# --- Towers ---
@router.post(
    "/towers",
    response_model=TowerOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(INVENTORY_MANAGERS))],
)
def create_tower(
    tower_in: TowerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _project_query_for_user(db, current_user).filter(
        Project.id == tower_in.project_id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    tower = Tower(**tower_in.model_dump())
    db.add(tower)
    db.commit()
    db.refresh(tower)
    log_audit(
        db,
        current_user.id,
        "INVENTORY",
        tower.id,
        "CREATE",
        new_values={"entity": "TOWER", "project_id": tower.project_id},
    )
    return tower

@router.get("/towers", response_model=List[TowerOut])
def get_towers(
    response: Response,
    project_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Tower)
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        query = query.join(Tower.project).filter(
            Project.branch_id == current_user.branch_id
        )
    if project_id is not None:
        query = query.filter(Tower.project_id == project_id)
    if search:
        query = query.filter(Tower.name.ilike(f"%{search.strip()}%"))
    query = apply_sort(
        query,
        model=Tower,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "project_id"},
        tie_breaker=Tower.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

# --- Blocks ---
@router.post(
    "/blocks",
    response_model=BlockOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(INVENTORY_MANAGERS))],
)
def create_block(
    block_in: BlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tower = _tower_query_for_user(db, current_user).filter(
        Tower.id == block_in.tower_id
    ).first()
    if tower is None:
        raise HTTPException(status_code=404, detail="Tower not found")
    block = Block(**block_in.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    log_audit(
        db,
        current_user.id,
        "INVENTORY",
        block.id,
        "CREATE",
        new_values={"entity": "BLOCK", "tower_id": block.tower_id},
    )
    return block

@router.get("/blocks", response_model=List[BlockOut])
def get_blocks(
    response: Response,
    tower_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Block)
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        query = query.join(Block.tower).join(Tower.project).filter(
            Project.branch_id == current_user.branch_id
        )
    if tower_id is not None:
        query = query.filter(Block.tower_id == tower_id)
    if search:
        query = query.filter(Block.name.ilike(f"%{search.strip()}%"))
    query = apply_sort(
        query,
        model=Block,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "tower_id"},
        tie_breaker=Block.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

# --- Units ---
@router.post(
    "/units",
    response_model=UnitOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(INVENTORY_MANAGERS))],
)
def create_unit(
    unit_in: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = _block_query_for_user(db, current_user).filter(
        Block.id == unit_in.block_id
    ).first()
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")
    duplicate = db.query(Unit.id).filter(
        Unit.block_id == unit_in.block_id,
        Unit.unit_number == unit_in.unit_number,
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit number already exists in this block",
        )
    unit = Unit(**unit_in.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    log_audit(db, current_user.id, "INVENTORY", unit.id, "CREATE", new_values={"block_id": unit.block_id, "type": unit.type, "price": float(unit.price) if unit.price else None})
    return unit


@router.post(
    "/units/bulk",
    response_model=List[UnitOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(INVENTORY_MANAGERS))],
)
def bulk_create_units(
    units_in: List[UnitCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not units_in:
        raise HTTPException(status_code=422, detail="At least one unit is required")
    if len(units_in) > 500:
        raise HTTPException(status_code=422, detail="A maximum of 500 units can be uploaded")

    block_ids = {unit.block_id for unit in units_in}
    accessible_blocks = {
        block_id
        for (block_id,) in _block_query_for_user(db, current_user)
        .filter(Block.id.in_(block_ids))
        .with_entities(Block.id)
        .all()
    }
    if accessible_blocks != block_ids:
        raise HTTPException(status_code=404, detail="One or more blocks were not found")

    keys = [(unit.block_id, unit.unit_number.strip()) for unit in units_in]
    if len(keys) != len(set(keys)):
        raise HTTPException(status_code=409, detail="Duplicate unit numbers in upload")

    for block_id in block_ids:
        numbers = [number for candidate, number in keys if candidate == block_id]
        existing = db.query(Unit.unit_number).filter(
            Unit.block_id == block_id,
            Unit.unit_number.in_(numbers),
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Unit {existing[0]} already exists in block {block_id}",
            )

    units = [
        Unit(
            **unit.model_dump(exclude={"unit_number"}),
            unit_number=unit.unit_number.strip(),
        )
        for unit in units_in
    ]
    db.add_all(units)
    db.commit()
    for unit in units:
        db.refresh(unit)
    log_audit(
        db,
        current_user.id,
        "INVENTORY",
        units[0].id,
        "BULK_CREATE",
        new_values={"count": len(units), "block_ids": sorted(block_ids)},
    )
    return units

@router.get("/units", response_model=List[UnitOut])
def get_units(
    response: Response,
    block_id: Optional[int] = None,
    status: Optional[UnitStatusEnum] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    type: Optional[str] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Unit)
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        query = (
            query.join(Unit.block)
            .join(Block.tower)
            .join(Tower.project)
            .filter(Project.branch_id == current_user.branch_id)
        )
    if block_id is not None:
        query = query.filter(Unit.block_id == block_id)
    if status:
        query = query.filter(Unit.status == status)
    if type:
        query = query.filter(Unit.type == type)
    if min_price is not None:
        query = query.filter(Unit.price >= min_price)
    if max_price is not None:
        query = query.filter(Unit.price <= max_price)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Unit.unit_number.ilike(term) | Unit.type.ilike(term)
        )
    query = apply_sort(
        query,
        model=Unit,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "unit_number", "type", "area", "price", "status"},
        tie_breaker=Unit.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

# --- Strict RBAC Actions ---
@router.post("/units/{unit_id}/hold", response_model=UnitOut, dependencies=[Depends(require_roles(INVENTORY_MANAGERS))])
def hold_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = (
        _unit_query_for_user(db, current_user)
        .filter(Unit.id == unit_id)
        .with_for_update()
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.status != UnitStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Cannot hold unit with status {unit.status.name}")

    unit.status = UnitStatusEnum.HOLD
    unit.hold_expires_at = utcnow() + timedelta(hours=24)
    db.commit()
    db.refresh(unit)
    log_audit(db, current_user.id, "INVENTORY", unit.id, "HOLD", old_values={"status": "AVAILABLE"}, new_values={"status": "HOLD"})
    return unit

@router.post("/units/{unit_id}/release-hold", response_model=UnitOut, dependencies=[Depends(require_roles(INVENTORY_MANAGERS))])
def release_unit_hold(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = (
        _unit_query_for_user(db, current_user)
        .filter(Unit.id == unit_id)
        .with_for_update()
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.status != UnitStatusEnum.HOLD:
        raise HTTPException(status_code=400, detail="Unit is not on hold")

    unit.status = UnitStatusEnum.AVAILABLE
    unit.hold_expires_at = None
    db.commit()
    db.refresh(unit)
    log_audit(db, current_user.id, "INVENTORY", unit.id, "RELEASE", old_values={"status": "HOLD"}, new_values={"status": "AVAILABLE"})
    return unit

@router.patch("/units/{unit_id}/price", response_model=UnitOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))])
def update_unit_price(
    unit_id: int,
    payload: UnitPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    old_price = float(unit.price) if unit.price else None
    unit.price = payload.price
    db.commit()
    db.refresh(unit)
    log_audit(db, current_user.id, "INVENTORY", unit.id, "PRICE_UPDATE", old_values={"price": old_price}, new_values={"price": float(payload.price)})
    return unit
