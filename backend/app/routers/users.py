from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.api.deps import require_roles
from app.models.users import User, RoleEnum
from app.schemas.users import (
    UserCreate, UserUpdate, UserUpdateRole, UserReassignManager, UserResetPassword, UserOut
)
from app.core.security import get_password_hash

router = APIRouter(
    dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN]))]
)

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pw = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    
    new_user = User(**user_data, password_hash=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/", response_model=List[UserOut])
def get_users(role: Optional[RoleEnum] = None, branch_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if branch_id:
        query = query.filter(User.branch_id == branch_id)
    return query.offset(skip).limit(limit).all()

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check email uniqueness if being changed
    if payload.email and payload.email != user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = not user.is_active # Toggle active status
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/reset-password")
def reset_password(user_id: int, payload: UserResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully"}

@router.put("/{user_id}/role", response_model=UserOut)
def change_role(user_id: int, payload: UserUpdateRole, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/reassign-manager", response_model=UserOut)
def reassign_manager(user_id: int, payload: UserReassignManager, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.manager_id = payload.manager_id
    db.commit()
    db.refresh(user)
    return user
