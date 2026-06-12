from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    user_id: str
    username: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(..., min_length=6)
    code: str = Field(..., min_length=6, max_length=6)


class SendRegisterCodeRequest(BaseModel):
    email: EmailStr


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    username: str
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    username: str
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)


class MessageResponse(BaseModel):
    success: bool
    message: str = ""
