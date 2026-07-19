from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.projects import UnitStatusEnum

# Tower Schemas
class TowerBase(BaseModel):
    name: str
    project_id: int

class TowerCreate(TowerBase):
    pass

class TowerUpdate(BaseModel):
    name: Optional[str] = None
    project_id: Optional[int] = None

class TowerOut(TowerBase):
    id: int
    class Config:
        from_attributes = True

# Block Schemas
class BlockBase(BaseModel):
    name: str
    tower_id: int

class BlockCreate(BlockBase):
    pass

class BlockUpdate(BaseModel):
    name: Optional[str] = None
    tower_id: Optional[int] = None

class BlockOut(BlockBase):
    id: int
    class Config:
        from_attributes = True

# Unit Schemas
class UnitBase(BaseModel):
    unit_number: str
    block_id: int
    type: Optional[str] = None
    area: Optional[float] = None
    price: Optional[float] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    block_id: Optional[int] = None
    type: Optional[str] = None
    area: Optional[float] = None

class UnitPriceUpdate(BaseModel):
    price: float
    # Future enhancement: add discount rules, tax fields here

class UnitOut(UnitBase):
    id: int
    status: UnitStatusEnum
    hold_expires_at: Optional[datetime] = None
    class Config:
        from_attributes = True
