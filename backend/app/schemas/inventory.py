from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from app.models.projects import UnitStatusEnum

# Tower Schemas
class TowerBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    project_id: int = Field(gt=0)

class TowerCreate(TowerBase):
    pass

class TowerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    project_id: Optional[int] = Field(None, gt=0)

class TowerOut(TowerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

# Block Schemas
class BlockBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    tower_id: int = Field(gt=0)

class BlockCreate(BlockBase):
    pass

class BlockUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    tower_id: Optional[int] = Field(None, gt=0)

class BlockOut(BlockBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

# Unit Schemas
class UnitBase(BaseModel):
    unit_number: str = Field(min_length=1, max_length=50)
    block_id: int = Field(gt=0)
    type: Optional[str] = Field(None, max_length=50)
    area: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, ge=0)

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = Field(None, min_length=1, max_length=50)
    block_id: Optional[int] = Field(None, gt=0)
    type: Optional[str] = Field(None, max_length=50)
    area: Optional[float] = Field(None, gt=0)

class UnitPriceUpdate(BaseModel):
    price: float = Field(ge=0)
    # Future enhancement: add discount rules, tax fields here

class UnitOut(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: UnitStatusEnum
    hold_expires_at: Optional[datetime] = None
