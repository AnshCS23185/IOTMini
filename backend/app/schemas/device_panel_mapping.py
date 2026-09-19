from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DevicePanelMappingBase(BaseModel):
    panel_id: int
    channel_number: int
    is_active: Optional[bool] = True

class DevicePanelMappingCreate(DevicePanelMappingBase):
    pass

class DevicePanelMappingUpdate(BaseModel):
    panel_id: Optional[int] = None
    is_active: Optional[bool] = None

class DevicePanelMappingResponse(DevicePanelMappingBase):
    id: int
    device_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DevicePanelMappingDetailedResponse(DevicePanelMappingResponse):
    panel_name: str
