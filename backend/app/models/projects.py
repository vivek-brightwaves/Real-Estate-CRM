import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DECIMAL,
    Enum,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.base import Base

class UnitStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    HOLD = "HOLD"
    BOOKED = "BOOKED"
    SOLD = "SOLD"

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    status = Column(String(50), nullable=True, index=True)

    towers = relationship("Tower", back_populates="project")

class Tower(Base):
    __tablename__ = "towers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    project = relationship("Project", back_populates="towers")
    blocks = relationship("Block", back_populates="tower")

class Block(Base):
    __tablename__ = "blocks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    tower_id = Column(Integer, ForeignKey("towers.id"), nullable=False, index=True)

    tower = relationship("Tower", back_populates="blocks")
    units = relationship("Unit", back_populates="block")

class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint(
            "block_id",
            "unit_number",
            name="uq_unit_block_number",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False, index=True)
    unit_number = Column(String(50), nullable=False)
    type = Column(String(50), nullable=True)
    area = Column(DECIMAL(12, 2), nullable=True)
    price = Column(DECIMAL(12, 2), nullable=True)
    status = Column(Enum(UnitStatusEnum), default=UnitStatusEnum.AVAILABLE, index=True)
    hold_expires_at = Column(DateTime, nullable=True)

    block = relationship("Block", back_populates="units")
