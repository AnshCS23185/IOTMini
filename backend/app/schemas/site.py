from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SiteBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    timezone: Optional[str] = "UTC"
    address: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    organization_id: int

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    organization_id: Optional[int] = None

class SiteResponse(SiteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
