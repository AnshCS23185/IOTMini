from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeviceCommandCreate(BaseModel):
    command: str = Field(..., description="The command to send, e.g., RELAY_ON or RELAY_OFF")
    reason: Optional[str] = Field(None, description="Reason for sending the command")

class DeviceCommandResponse(BaseModel):
    id: int
    device_id: int
    panel_id: int
    command: str
    status: str
    requested_by: int
    reason: Optional[str]
    requested_at: datetime
    acknowledged_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True
        from_attributes = True

class DeviceStatusResponse(BaseModel):
    device_uid: str
    last_seen: Optional[datetime]
    is_online: bool
    device_status: str
