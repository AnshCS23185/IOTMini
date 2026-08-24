from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PanelPerformanceBase(BaseModel):
    actual_power_w: Optional[float]
    expected_power_w: float
    performance_percentage: Optional[float]
    status: str
    timestamp: datetime

class PanelPerformanceCreate(PanelPerformanceBase):
    panel_id: int

class PanelPerformanceResponse(PanelPerformanceBase):
    id: int
    panel_id: int

    class Config:
        from_attributes = True
