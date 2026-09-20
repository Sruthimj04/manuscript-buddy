from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models.user import User
from app.auth.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def extract_token(request: Request, token_header: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    tok = token_header
    if not tok:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            tok = auth_header.split(" ")[1]
    if not tok:
        tok = request.cookies.get("access_token") or request.cookies.get("sid")
    if not tok or tok in ("null", "undefined", "Guest", "none", ""):
        return None
    return tok

def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(extract_token),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub") or payload.get("user_id")
    email = payload.get("email")
    
    if user_id:
        user = db.query(User).filter(User.id == str(user_id)).first()
        if user:
            return user
    if email:
        user = db.query(User).filter(User.email == str(email)).first()
        if user:
            return user
            
    return None

def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

def require_role(roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role}' is not authorized to access this resource"
            )
        return current_user
    return role_checker
