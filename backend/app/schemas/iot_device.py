from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IoTDeviceBase(BaseModel):
    device_uid: str
    device_type: Optional[str] = "PICO_W"
    firmware_version: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    site_id: int

class IoTDeviceCreate(IoTDeviceBase):
    pass

class IoTDeviceUpdate(BaseModel):
    device_uid: Optional[str] = None
    device_type: Optional[str] = None
    firmware_version: Optional[str] = None
    status: Optional[str] = None
    site_id: Optional[int] = None

class IoTDeviceResponse(IoTDeviceBase):
    id: int
    last_seen: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
