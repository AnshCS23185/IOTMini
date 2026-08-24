from pydantic import BaseModel
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
    device_id: str # The Pico W will likely send its device_uid or ID, we map it. 
    # Wait, the prompt shows device_id as string "PICO-001".
    panel_id: int
    voltage: float
    current: float
    power: float
    temperature: float
    humidity: float
    light_intensity: float
    timestamp: datetime

class SensorReadingResponse(SensorReadingBase):
    id: int

    class Config:
        from_attributes = True
