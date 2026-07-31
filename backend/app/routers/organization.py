import json
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.api.query import apply_sort, paginate
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import RoleEnum, Company, Branch, User
from app.models.projects import Project, Tower
from app.schemas.organization import (
    CompanyCreate, CompanyUpdate, CompanyOut,
    BranchCreate, BranchUpdate, BranchOut,
    ProjectCreate, ProjectUpdate, ProjectOut
)
from app.services.audit import log_audit

router = APIRouter(
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))]
)

# --- Companies ---
@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    company_in: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = company_in.model_dump()
    if data.get("settings_json") is not None:
        data["settings_json"] = json.dumps(data["settings_json"])
    company = Company(**data)
    db.add(company)
    db.commit()
    db.refresh(company)
    log_audit(db, current_user.id, "ORGANIZATION", company.id, "CREATE", new_values={"type": "COMPANY", "name": company.name})
    return company

@router.get("/companies", response_model=List[CompanyOut])
def get_companies(
    response: Response,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if search:
        query = query.filter(Company.name.ilike(f"%{search.strip()}%"))
    query = apply_sort(
        query,
        model=Company,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name"},
        tie_breaker=Company.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.put(
    "/companies/{company_id}",
    response_model=CompanyOut,
    include_in_schema=False,
)
@router.patch("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    company_in: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    update_data = company_in.model_dump(exclude_unset=True)
    if update_data.get("settings_json") is not None:
        update_data["settings_json"] = json.dumps(update_data["settings_json"])
    for field, value in update_data.items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    log_audit(db, current_user.id, "ORGANIZATION", company.id, "UPDATE", new_values={"type": "COMPANY", **update_data})
    return company


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    if db.query(Branch.id).filter(Branch.company_id == company_id).first():
        raise HTTPException(
            status_code=409,
            detail="Company cannot be deleted while it has branches",
        )
    old_values = {"type": "COMPANY", "name": company.name}
    db.delete(company)
    db.commit()
    log_audit(
        db,
        current_user.id,
        "ORGANIZATION",
        company_id,
        "DELETE",
        old_values=old_values,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Branches ---
@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(
    branch_in: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Company, branch_in.company_id) is None:
        raise HTTPException(status_code=404, detail="Company not found")
    branch = Branch(**branch_in.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    log_audit(db, current_user.id, "ORGANIZATION", branch.id, "CREATE", new_values={"type": "BRANCH", "name": branch.name})
    return branch

@router.get("/branches", response_model=List[BranchOut])
def get_branches(
    response: Response,
    company_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Branch)
    if company_id is not None:
        query = query.filter(Branch.company_id == company_id)
    if search:
        query = query.filter(Branch.name.ilike(f"%{search.strip()}%"))
    query = apply_sort(
        query,
        model=Branch,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "company_id"},
        tie_breaker=Branch.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.put(
    "/branches/{branch_id}",
    response_model=BranchOut,
    include_in_schema=False,
)
@router.patch("/branches/{branch_id}", response_model=BranchOut)
def update_branch(
    branch_id: int,
    branch_in: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    update_data = branch_in.model_dump(exclude_unset=True)
    if (
        "company_id" in update_data
        and db.get(Company, update_data["company_id"]) is None
    ):
        raise HTTPException(status_code=404, detail="Company not found")
    for field, value in update_data.items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    log_audit(db, current_user.id, "ORGANIZATION", branch.id, "UPDATE", new_values={"type": "BRANCH", **update_data})
    return branch


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch = db.get(Branch, branch_id)
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")
    if db.query(User.id).filter(User.branch_id == branch_id).first():
        raise HTTPException(
            status_code=409,
            detail="Branch cannot be deleted while it has users",
        )
    if db.query(Project.id).filter(Project.branch_id == branch_id).first():
        raise HTTPException(
            status_code=409,
            detail="Branch cannot be deleted while it has projects",
        )
    old_values = {"type": "BRANCH", "name": branch.name}
    db.delete(branch)
    db.commit()
    log_audit(
        db,
        current_user.id,
        "ORGANIZATION",
        branch_id,
        "DELETE",
        old_values=old_values,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Projects ---
@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Branch, project_in.branch_id) is None:
        raise HTTPException(status_code=404, detail="Branch not found")
    project = Project(**project_in.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user.id, "ORGANIZATION", project.id, "CREATE", new_values={"type": "PROJECT", "name": project.name})
    return project

@router.get("/projects", response_model=List[ProjectOut])
def get_projects(
    response: Response,
    branch_id: Optional[int] = None,
    project_status: Optional[str] = Query(None, alias="status", max_length=50),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if branch_id is not None:
        query = query.filter(Project.branch_id == branch_id)
    if project_status:
        query = query.filter(Project.status == project_status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Project.name.ilike(term) | Project.location.ilike(term)
        )
    query = apply_sort(
        query,
        model=Project,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "location", "status", "branch_id"},
        tie_breaker=Project.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.put(
    "/projects/{project_id}",
    response_model=ProjectOut,
    include_in_schema=False,
)
@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = project_in.model_dump(exclude_unset=True)
    if (
        "branch_id" in update_data
        and db.get(Branch, update_data["branch_id"]) is None
    ):
        raise HTTPException(status_code=404, detail="Branch not found")
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user.id, "ORGANIZATION", project.id, "UPDATE", new_values={"type": "PROJECT", **update_data})
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if db.query(Tower.id).filter(Tower.project_id == project_id).first():
        raise HTTPException(
            status_code=409,
            detail="Project cannot be deleted while it has towers",
        )
    old_values = {"type": "PROJECT", "name": project.name}
    db.delete(project)
    db.commit()
    log_audit(
        db,
        current_user.id,
        "ORGANIZATION",
        project_id,
        "DELETE",
        old_values=old_values,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
