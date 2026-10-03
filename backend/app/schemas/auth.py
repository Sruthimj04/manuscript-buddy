from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "author" # "author", "editor", "admin"

class UserLogin(BaseModel):
    email: str # email or username
    password: str
    role: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class SendOtpRequest(BaseModel):
    mobile: str
    full_name: Optional[str] = ""
    email: Optional[str] = ""

class VerifyOtpRequest(BaseModel):
    mobile: str
    otp: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class OtpResponse(BaseModel):
    success: bool
    message: Optional[str] = None
