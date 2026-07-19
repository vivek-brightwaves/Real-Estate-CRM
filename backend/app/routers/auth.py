from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core import security
from app.api.deps import get_current_user
from app.models.users import User
from app.models.system import TokenBlacklist
from pydantic import BaseModel

from app.schemas.users import UserOut

router = APIRouter()

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    # Check blacklist
    is_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == request.refresh_token).first()
    if is_blacklisted:
        raise HTTPException(status_code=401, detail="Token blacklisted")

    try:
        payload = security.jwt.decode(
            request.refresh_token, security.settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        # Invalidate old refresh token
        db.add(TokenBlacklist(token=request.refresh_token))
        db.commit()

        # Issue new tokens
        access_token = security.create_access_token(subject=user.id)
        new_refresh_token = security.create_refresh_token(subject=user.id)
        
        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer", "user": user}

    except security.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/logout")
def logout(request: RefreshTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == request.refresh_token).first()
    if not is_blacklisted:
        db.add(TokenBlacklist(token=request.refresh_token))
        db.commit()
    return {"message": "Successfully logged out"}
