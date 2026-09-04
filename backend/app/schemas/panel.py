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
    site_name: Optional[str] = None

    class Config:
        from_attributes = True

class PanelStatusUpdate(BaseModel):
    status: str  # "ACTIVE" or "INACTIVE"

class PanelSummaryResponse(BaseModel):
    total_panels: int = 0
    active_panels: int = 0
    inactive_panels: int = 0
    total_rated_power_w: float = 0.0
