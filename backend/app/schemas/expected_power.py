from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExpectedPowerBase(BaseModel):
    expected_power_w: float
    source: Optional[str] = "PVGIS"
    timestamp: datetime

class ExpectedPowerCreate(ExpectedPowerBase):
    panel_id: int

class ExpectedPowerResponse(ExpectedPowerBase):
    id: int
    panel_id: int

    class Config:
        from_attributes = True
