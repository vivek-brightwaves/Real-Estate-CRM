from typing import List, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError as JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core import security
from app.db.session import get_db
from app.models.users import User, RoleEnum
from app.models.system import TokenBlacklist

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _credentials_error(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_user(
    db: Session = Depends(get_db),
    token: str | None = Depends(oauth2_scheme),
    request: Request = None,
) -> User:
    if not token and request:
        token = request.cookies.get("access_token")
    if not token:
        raise _credentials_error()
    if db.query(TokenBlacklist.id).filter(TokenBlacklist.token == token).first():
        raise _credentials_error("Token has been revoked")
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_type = payload.get("type")
        if token_type != "access":
            raise _credentials_error("Invalid token type")
        user_id: str = payload.get("sub")
        if user_id is None:
            raise _credentials_error()
        parsed_user_id = int(user_id)
    except (JWTError, TypeError, ValueError):
        raise _credentials_error()

    user = db.query(User).filter(User.id == parsed_user_id).first()
    if not user:
        raise _credentials_error()
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    if user.is_locked:
        raise HTTPException(status_code=403, detail="Account is locked")

    return user

def require_roles(allowed_roles: List[RoleEnum]):
    allowed = frozenset(allowed_roles)

    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return role_checker

def require_permissions(required_permissions: List[str]):
    def permission_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        if current_user.role == RoleEnum.SUPER_ADMIN:
            return current_user

        from app.models.auth import Permission, role_permissions, user_roles

        has_perms = db.query(Permission.name).join(
            role_permissions, Permission.id == role_permissions.c.permission_id
        ).join(
            user_roles, role_permissions.c.role_id == user_roles.c.role_id
        ).filter(
            user_roles.c.user_id == current_user.id,
            Permission.name.in_(required_permissions)
        ).all()

        found_perms = [p[0] for p in has_perms]
        if not all(rp in found_perms for rp in required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return permission_checker

def scope_query_to_branch(current_user: User, model: Any) -> Any:
    """
    Returns a filter condition based on the user's role.
    Apply this to queries: db.query(Model).filter(scope_query_to_branch(user, Model))
    """
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return True

    company_id = None
    if hasattr(current_user, "branch") and current_user.branch is not None:
        company_id = current_user.branch.company_id

    if current_user.role == RoleEnum.MANAGER:
        if hasattr(model, 'branch_id'):
            return model.branch_id == current_user.branch_id
        if hasattr(model, 'company_id') and company_id is not None:
            return model.company_id == company_id
        return True

    if current_user.role == RoleEnum.EMPLOYEE:
        conditions = []
        if hasattr(model, 'assigned_to_id'):
            conditions.append(model.assigned_to_id == current_user.id)
        if hasattr(model, 'created_by_id'):
            conditions.append(model.created_by_id == current_user.id)

        from sqlalchemy import and_, or_
        if conditions:
            expr = or_(*conditions)
            if hasattr(model, 'company_id') and company_id is not None:
                return and_(expr, model.company_id == company_id)
            return expr

        if hasattr(model, 'company_id') and company_id is not None:
            return model.company_id == company_id

        return False

    return False
