from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WeatherBase(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    cloud_cover: Optional[float] = None
    precipitation: Optional[float] = None
    solar_radiation: Optional[float] = None
    timestamp: datetime

class WeatherCreate(WeatherBase):
    site_id: int

class WeatherResponse(WeatherBase):
    id: int
    site_id: int

    class Config:
        from_attributes = True
