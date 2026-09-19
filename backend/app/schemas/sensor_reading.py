from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SensorReadingBase(BaseModel):
    device_id: int
    panel_id: int
    voltage: Optional[float] = None
    current: Optional[float] = None
    power: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_intensity: Optional[float] = None
    timestamp: datetime

class SensorReadingCreate(BaseModel):
    # This is what the Pico W sends
    device_id: Optional[str] = None
    channel_number: int
    voltage: float = Field(..., ge=0)
    current: float = Field(..., ge=0)
    power: float = Field(..., ge=0)
    temperature: float
    humidity: float
    light_intensity: float = Field(..., ge=0)
    timestamp: datetime

class SensorReadingResponse(SensorReadingBase):
    id: int

    class Config:
        from_attributes = True
