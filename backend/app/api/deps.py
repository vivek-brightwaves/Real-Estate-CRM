from typing import Generator, List, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import BooleanClauseList

from app.core.config import settings
from app.core import security
from app.db.session import get_db
from app.models.users import User, RoleEnum
from app.models.system import TokenBlacklist

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/auth/login")

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def require_roles(allowed_roles: List[RoleEnum]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return role_checker

def scope_query_to_branch(current_user: User, model: Any) -> Any:
    """
    Returns a filter condition based on the user's role.
    Apply this to queries: db.query(Model).filter(scope_query_to_branch(user, Model))
    """
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return True # No filter
    elif current_user.role == RoleEnum.MANAGER:
        # Assuming the model has a branch_id column
        if hasattr(model, 'branch_id'):
            return model.branch_id == current_user.branch_id
        return True # Fallback if model isn't branch-scoped
    elif current_user.role == RoleEnum.EMPLOYEE:
        # Assuming the model has assigned_to_id or created_by_id
        conditions = []
        if hasattr(model, 'assigned_to_id'):
            conditions.append(model.assigned_to_id == current_user.id)
        if hasattr(model, 'created_by_id'):
            conditions.append(model.created_by_id == current_user.id)
        
        if conditions:
            # If both exist, return OR condition (e.g. Leads)
            from sqlalchemy import or_
            return or_(*conditions)
            
        return False # Fallback to deny access if not scoped correctly
    return False
