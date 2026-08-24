from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PanelBase(BaseModel):
    name: str
    rated_power_w: float
    technology: Optional[str] = None
    tilt: Optional[float] = None
    azimuth: Optional[float] = None
    system_losses: Optional[float] = 14.0
    status: Optional[str] = "ACTIVE"
    site_id: int

class PanelCreate(PanelBase):
    pass

class PanelUpdate(BaseModel):
    name: Optional[str] = None
    rated_power_w: Optional[float] = None
    technology: Optional[str] = None
    tilt: Optional[float] = None
    azimuth: Optional[float] = None
    system_losses: Optional[float] = None
    status: Optional[str] = None
    site_id: Optional[int] = None

class PanelResponse(PanelBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
