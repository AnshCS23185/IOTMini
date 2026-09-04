from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime

class SiteBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    timezone: Optional[str] = "UTC"
    address: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    organization_id: int

    @model_validator(mode="before")
    @classmethod
    def harmonize_location(cls, data):
        if isinstance(data, dict):
            loc = data.get("location")
            addr = data.get("address")
            if loc and not addr:
                data["address"] = loc
            elif addr and not loc:
                data["location"] = addr
        return data

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    organization_id: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def harmonize_location(cls, data):
        if isinstance(data, dict):
            loc = data.get("location")
            addr = data.get("address")
            if loc and not addr:
                data["address"] = loc
            elif addr and not loc:
                data["location"] = addr
        return data

class SiteResponse(SiteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def set_location_from_orm(cls, data):
        if hasattr(data, "address"):
            addr = getattr(data, "address")
            loc = getattr(data, "location", None)
            if not loc and addr:
                try:
                    setattr(data, "location", addr)
                except Exception:
                    pass
        elif isinstance(data, dict):
            addr = data.get("address")
            loc = data.get("location")
            if not loc and addr:
                data["location"] = addr
        return data

    class Config:
        from_attributes = True

