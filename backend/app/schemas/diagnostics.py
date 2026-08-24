from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DiagnosticResponse(BaseModel):
    id: int
    panel_id: int
    status: str
    performance_percentage: Optional[float]
    actual_power_w: Optional[float]
    expected_power_w: float
    light_intensity: Optional[float]
    light_baseline: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    cloud_cover: Optional[float]
    precipitation: Optional[float]
    diagnostic_confidence: Optional[float]
    reason: Optional[str]
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    panel_id: int
    site_id: int
    fault_type: str
    severity: str
    message: Optional[str]
    performance_percentage: Optional[float]
    actual_power_w: Optional[float]
    expected_power_w: Optional[float]
    light_intensity: Optional[float]
    temperature: Optional[float]
    cloud_cover: Optional[float]
    precipitation: Optional[float]
    status: str
    consecutive_count: int
    first_detected_at: datetime
    confirmed_at: Optional[datetime]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True
        from_attributes = True
