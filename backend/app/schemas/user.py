from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .organization import OrganizationResponse

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "USER"
    organization_id: Optional[int] = None
    status: Optional[str] = "ACTIVE"

class UserCreate(UserBase):
    password: Optional[str] = None
    site_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    organization_id: Optional[int] = None
    status: Optional[str] = None
    password: Optional[str] = None
    site_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserWithOrganizationResponse(UserResponse):
    organization: Optional[OrganizationResponse] = None
    site_ids: Optional[List[int]] = None

