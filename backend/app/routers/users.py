from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.api.query import apply_sort, paginate
from app.db.session import get_db
from app.api.deps import require_roles
from app.models.auth import Role
from app.models.users import Branch, User, RoleEnum
from app.schemas.users import (
    UserActivationUpdate,
    UserCreate,
    UserUpdate,
    UserUpdateRole,
    UserReassignManager,
    UserResetPassword,
    UserOut,
    RoleProfileCreate,
    RoleProfileOut,
    PermissionOut,
    RolePermissionUpdate,
)
from app.core.security import get_password_hash
from app.services.audit import log_audit
from app.api.deps import get_current_user
from app.schemas.common import MessageResponse

router = APIRouter(
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))]
)


@router.get("/roles", response_model=List[RoleProfileOut])
def get_role_profiles(db: Session = Depends(get_db)):
    return db.query(Role).order_by(Role.name.asc(), Role.id.asc()).all()


@router.post(
    "/roles",
    response_model=RoleProfileOut,
    status_code=status.HTTP_201_CREATED,
)
def create_role_profile(
    payload: RoleProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    existing = db.query(Role).filter(func.lower(Role.name) == name.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Role profile already exists")
    profile = Role(
        name=name,
        description=payload.description.strip() if payload.description else None,
        base_role=payload.base_role,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    log_audit(
        db,
        current_user.id,
        "ROLE",
        profile.id,
        "CREATE",
        new_values={
            "name": profile.name,
            "base_role": profile.base_role.value,
        },
    )
    return profile


@router.get("/permissions", response_model=List[PermissionOut])
def get_permissions(db: Session = Depends(get_db)):
    from app.models.auth import Permission
    return db.query(Permission).order_by(Permission.name.asc(), Permission.id.asc()).all()


@router.get("/roles/{role_id}/permissions", response_model=List[int])
def get_role_permissions(role_id: int, db: Session = Depends(get_db)):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return [p.id for p in role.permissions]


@router.post("/roles/{role_id}/permissions", response_model=MessageResponse)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.auth import Permission
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Resolve all permissions
    perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
    if len(perms) != len(payload.permission_ids):
        raise HTTPException(status_code=400, detail="Some permission IDs are invalid")
        
    role.permissions = perms
    db.commit()
    
    log_audit(
        db,
        current_user.id,
        "ROLE",
        role.id,
        "UPDATE_PERMISSIONS",
        new_values={"permission_ids": payload.permission_ids},
    )
    return {"message": "Role permissions updated successfully"}


def validate_user_relations(
    db: Session,
    *,
    branch_id: int | None,
    manager_id: int | None,
    project_id: int | None = None,
) -> None:
    if branch_id is not None and db.get(Branch, branch_id) is None:
        raise HTTPException(status_code=404, detail="Branch not found")
    if project_id is not None:
        from app.models.projects import Project
        if db.get(Project, project_id) is None:
            raise HTTPException(status_code=404, detail="Project not found")
    if manager_id is None:
        return
    manager = db.query(User).filter(
        User.id == manager_id,
        User.role == RoleEnum.MANAGER,
        User.is_active.is_(True),
    ).first()
    if manager is None:
        raise HTTPException(status_code=404, detail="Active manager not found")
    if branch_id is not None and manager.branch_id != branch_id:
        raise HTTPException(
            status_code=409,
            detail="Manager must belong to the user's branch",
        )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized_email = str(user_in.email).lower()
    user_exists = db.query(User).filter(User.email == normalized_email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    validate_user_relations(
        db,
        branch_id=user_in.branch_id,
        manager_id=user_in.manager_id,
        project_id=user_in.project_id,
    )
    hashed_pw = get_password_hash(user_in.password)
    role_profile = None
    if user_in.role_profile_id is not None:
        role_profile = db.get(Role, user_in.role_profile_id)
        if role_profile is None:
            raise HTTPException(status_code=404, detail="Role profile not found")

    user_data = user_in.model_dump(exclude={"password", "role_profile_id"})
    user_data["email"] = normalized_email
    if role_profile is not None:
        user_data["role"] = role_profile.base_role

    new_user = User(**user_data, password_hash=hashed_pw, must_change_password=True)
    if role_profile is not None:
        new_user.role_profiles.append(role_profile)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit(db, current_user.id, "USER", new_user.id, "CREATE", new_values={"name": new_user.name, "email": new_user.email, "role": new_user.role.value})
    return new_user

@router.get("", response_model=List[UserOut])
def get_users(
    response: Response,
    role: Optional[RoleEnum] = None,
    branch_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = Query("created_at"),
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if branch_id is not None:
        query = query.filter(User.branch_id == branch_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(User.name.ilike(term), User.email.ilike(term), User.phone.ilike(term))
        )
    query = apply_sort(
        query,
        model=User,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "email", "role", "created_at"},
        tie_breaker=User.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.put("/{user_id}", response_model=UserOut, include_in_schema=False)
@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check email uniqueness if being changed
    normalized_email = str(payload.email).lower() if payload.email else None
    if normalized_email and normalized_email != user.email:
        existing = db.query(User).filter(User.email == normalized_email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    update_data = payload.model_dump(exclude_unset=True)
    if normalized_email:
        update_data["email"] = normalized_email
    validate_user_relations(
        db,
        branch_id=update_data.get("branch_id", user.branch_id),
        manager_id=update_data.get("manager_id", user.manager_id),
        project_id=update_data.get("project_id", user.project_id),
    )
    old_vals = {k: getattr(user, k) for k in update_data}
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "USER", user.id, "UPDATE", old_values=old_vals, new_values=update_data)
    return user

@router.put(
    "/{user_id}/deactivate",
    response_model=UserOut,
    include_in_schema=False,
)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    old_active = user.is_active
    user.is_active = not user.is_active # Toggle active status
    db.commit()
    db.refresh(user)
    action = "ACTIVATE" if user.is_active else "DEACTIVATE"
    log_audit(db, current_user.id, "USER", user.id, action, old_values={"is_active": old_active}, new_values={"is_active": user.is_active})
    return user


@router.patch("/{user_id}/status", response_model=UserOut)
def set_user_status(
    user_id: int,
    payload: UserActivationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account",
        )
    old_active = user.is_active
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        current_user.id,
        "USER",
        user.id,
        "ACTIVATE" if user.is_active else "DEACTIVATE",
        old_values={"is_active": old_active},
        new_values={"is_active": user.is_active},
    )
    return user

@router.put("/{user_id}/reset-password", response_model=MessageResponse)
def reset_password(
    user_id: int,
    payload: UserResetPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    log_audit(db, current_user.id, "USER", user.id, "PASSWORD_RESET", new_values={"method": "admin_reset"})
    return {"message": "Password reset successfully"}

@router.put(
    "/{user_id}/role",
    response_model=UserOut,
    include_in_schema=False,
)
@router.patch("/{user_id}/role", response_model=UserOut)
def change_role(
    user_id: int,
    payload: UserUpdateRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    old_role = user.role.value
    user.role = payload.role
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "USER", user.id, "ROLE_CHANGE", old_values={"role": old_role}, new_values={"role": user.role.value})
    return user

@router.post(
    "/{user_id}/reassign-manager",
    response_model=UserOut,
    include_in_schema=False,
)
@router.patch("/{user_id}/manager", response_model=UserOut)
def reassign_manager(
    user_id: int,
    payload: UserReassignManager,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    validate_user_relations(
        db,
        branch_id=user.branch_id,
        manager_id=payload.manager_id,
    )
    old_manager_id = user.manager_id
    user.manager_id = payload.manager_id
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        current_user.id,
        "USER",
        user.id,
        "REASSIGN_MANAGER",
        old_values={"manager_id": old_manager_id},
        new_values={"manager_id": user.manager_id},
    )
    return user


@router.post("/{user_id}/unlock", response_model=UserOut)
def unlock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_locked = False
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "USER", user.id, "UNLOCK", new_values={"unlocked_by": current_user.id})
    return user
