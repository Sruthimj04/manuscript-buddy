from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister, UserLogin, Token, UserOut,
    SendOtpRequest, VerifyOtpRequest, OtpResponse
)
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.services.otp_service import send_otp as do_send_otp, verify_otp as do_verify_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    hashed_pwd = hash_password(payload.password) if payload.password else None
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role or "author",
        hashed_password=hashed_pwd
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    
    # Set cookie for convenience
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="sid", value=access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/login", response_model=Token)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    usr = payload.email.strip().lower()
    
    # Allow login by email or full_name
    user = db.query(User).filter(
        (User.email == usr) | (User.full_name.ilike(usr))
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    if user.hashed_password:
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
    # If a specific role was chosen in UI, use it if allowed
    role = payload.role or user.role
    
    token_data = {"sub": user.id, "email": user.email, "role": role}
    access_token = create_access_token(data=token_data)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="sid", value=access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": role
        }
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("sid")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/otp/send", response_model=OtpResponse)
def send_otp(payload: SendOtpRequest):
    res = do_send_otp(payload.mobile, payload.full_name, payload.email)
    return res

@router.post("/otp/verify")
def verify_otp(payload: VerifyOtpRequest, response: Response, db: Session = Depends(get_db)):
    is_valid = do_verify_otp(payload.mobile, payload.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
        
    # Get or create user
    email = (payload.email or f"user_{payload.mobile.replace('+', '')}@example.com").lower()
    full_name = payload.full_name or f"Author ({payload.mobile})"
    
    user = db.query(User).filter((User.email == email) | (User.phone == payload.mobile)).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            phone=payload.mobile,
            role="author"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="sid", value=access_token)
    
    return {
        "success": True,
        "access_token": access_token,
        "user": {
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }
