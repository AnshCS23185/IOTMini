from pydantic import BaseModel
from .user import UserResponse

class Token(BaseModel):
    access_token: str
    token_type: str
    requires_password_change: bool = False

class TokenData(BaseModel):
    email: str | None = None

class PasswordChangeRequest(BaseModel):
    new_password: str

class LoginRequest(BaseModel):
    email: str
    password: str
