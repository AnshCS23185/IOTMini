from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timezone
import os

from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_panel_access, check_site_access, require_permission
from app.models.user import User
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.device_command import DeviceCommand
from app.schemas.control import DeviceCommandCreate, DeviceCommandResponse, DeviceStatusResponse
from app.services.hardware_control import HardwareControlService

router = APIRouter(tags=["Hardware Control"])

OFFLINE_TIMEOUT_MINUTES = int(os.getenv("OFFLINE_TIMEOUT_MINUTES", "5"))

@router.get("/iot/devices/{device_uid}/status", response_model=DeviceStatusResponse)
def get_device_status(device_uid: str, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Security: Ensure user has access to the site this device belongs to
    check_site_access(current_user, device.site, db)
    
    is_online = False
    if device.last_seen:
        now = datetime.now(timezone.utc)
        time_since_last_seen = (now - device.last_seen.astimezone(timezone.utc)).total_seconds() / 60.0
        if time_since_last_seen <= OFFLINE_TIMEOUT_MINUTES:
            is_online = True
            
    return {
        "device_uid": device.device_uid,
        "last_seen": device.last_seen,
        "is_online": is_online,
        "device_status": device.status
    }

@router.get("/iot/devices/{device_uid}/commands", response_model=List[DeviceCommandResponse])
def poll_device_commands(
    device_uid: str,
    status: Optional[str] = Query("PENDING", description="Filter by status (e.g. PENDING)"),
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_permission("PANEL_VIEW"))
):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Security: Ensure user has access to the site this device belongs to
    check_site_access(current_user, device.site, db)
    
    query = db.query(DeviceCommand).filter(DeviceCommand.device_id == device.id)
    if status:
        query = query.filter(DeviceCommand.status == status)
        
    return query.order_by(DeviceCommand.requested_at.asc()).all()

@router.get("/panels/{panel_id}/control", response_model=List[DeviceCommandResponse])
def get_panel_commands(panel_id: int, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    
    check_panel_access(current_user, panel, db)
    
    commands = db.query(DeviceCommand).filter(
        DeviceCommand.panel_id == panel.id
    ).order_by(desc(DeviceCommand.requested_at)).limit(limit).all()
    
    return commands

@router.post("/panels/{panel_id}/control", response_model=DeviceCommandResponse)
def send_panel_command(panel_id: int, command_in: DeviceCommandCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_CONTROL"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
        
    check_panel_access(current_user, panel, db)
    
    if command_in.command not in ["RELAY_ON", "RELAY_OFF"]:
        raise HTTPException(status_code=400, detail="Invalid command. Supported commands are RELAY_ON, RELAY_OFF.")
        
    # Find the device linked to this panel's site
    device = db.query(IoTDevice).filter(IoTDevice.site_id == panel.site_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="No IoT device associated with this panel's site")
        
    return HardwareControlService.send_command(
        db=db,
        panel=panel,
        device=device,
        user=current_user,
        command=command_in.command,
        reason=command_in.reason
    )
