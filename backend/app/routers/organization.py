from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import require_roles
from app.models.users import RoleEnum, Company, Branch
from app.models.projects import Project
from app.schemas.organization import (
    CompanyCreate, CompanyUpdate, CompanyOut,
    BranchCreate, BranchUpdate, BranchOut,
    ProjectCreate, ProjectUpdate, ProjectOut
)

router = APIRouter(
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))]
)

# --- Companies ---
@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(company_in: CompanyCreate, db: Session = Depends(get_db)):
    company = Company(**company_in.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.get("/companies", response_model=List[CompanyOut])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Company).offset(skip).limit(limit).all()

@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(company_id: int, company_in: CompanyUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    update_data = company_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company

# --- Branches ---
@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(branch_in: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(**branch_in.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch

@router.get("/branches", response_model=List[BranchOut])
def get_branches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Branch).offset(skip).limit(limit).all()

@router.put("/branches/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: int, branch_in: BranchUpdate, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    update_data = branch_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch

# --- Projects ---
@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(**project_in.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/projects", response_model=List[ProjectOut])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Project).offset(skip).limit(limit).all()

@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project
