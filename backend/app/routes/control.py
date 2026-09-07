from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timezone
import os

from app.database import get_db
from app.core.dependencies import get_current_active_user, get_authenticated_device
from app.core.permissions import check_panel_access, check_site_access, require_permission
from app.models.user import User
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.device_command import DeviceCommand
from app.schemas.control import (
    DeviceCommandCreate,
    DeviceCommandResponse,
    DeviceStatusResponse,
    CommandAckRequest,
    CommandAckResponse,
)
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
        last_seen_aware = device.last_seen if device.last_seen.tzinfo else device.last_seen.replace(tzinfo=timezone.utc)
        time_since_last_seen = (now - last_seen_aware.astimezone(timezone.utc)).total_seconds() / 60.0
        if abs(time_since_last_seen) <= OFFLINE_TIMEOUT_MINUTES:
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
    device: IoTDevice = Depends(get_authenticated_device)
):
    query = db.query(DeviceCommand).filter(DeviceCommand.device_id == device.id)
    if status:
        query = query.filter(DeviceCommand.status == status)
        
    # Safety: In the current demo, Relay 1 (GP14) is never controlled.
    # Exclude any commands for Panel 1 if they exist.
    panel_1 = db.query(Panel).filter(
        Panel.site_id == device.site_id,
        (Panel.name.ilike("%panel 1%") | Panel.name.ilike("p01") | Panel.name.ilike("p1") | Panel.name.ilike("%solar 1%"))
    ).first()
    if not panel_1:
        panel_1 = db.query(Panel).filter(Panel.site_id == device.site_id).order_by(Panel.id.asc()).first()
    if panel_1:
        query = query.filter(DeviceCommand.panel_id != panel_1.id)
        
    commands = query.order_by(DeviceCommand.created_at.asc()).all()
    
    device.last_seen = datetime.now(timezone.utc)
    db.commit()
    
    return commands

@router.post("/iot/devices/{device_uid}/commands/{command_id}/ack", response_model=CommandAckResponse)
def acknowledge_device_command(
    device_uid: str,
    command_id: int,
    ack_in: CommandAckRequest,
    db: Session = Depends(get_db),
    device: IoTDevice = Depends(get_authenticated_device)
):
    command = db.query(DeviceCommand).filter(DeviceCommand.id == command_id).first()
    if not command:
        raise HTTPException(status_code=404, detail=f"Command {command_id} not found")
        
    # Verify command belongs to authenticated device
    if command.device_id != device.id:
        raise HTTPException(status_code=403, detail="Command does not belong to this device")
        
    # Verify command is currently PENDING
    if command.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail=f"Command is already {command.status}, cannot acknowledge"
        )
        
    if ack_in.status not in ["ACKNOWLEDGED", "FAILED"]:
        raise HTTPException(status_code=400, detail="Status must be ACKNOWLEDGED or FAILED")
        
    now = datetime.now(timezone.utc)
    command.status = ack_in.status
    command.acknowledged_at = now
    if ack_in.status == "FAILED":
        command.error_message = ack_in.error_message
        
    device.last_seen = now
    db.commit()
    db.refresh(command)
    return command

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
        
    # Safety lock: In the physical demo, Relay 1 (Panel 1) is hardwired through NC
    # and must never be remotely switched. Remote control is strictly reserved for Relay 2 (Panel 2 on GP15).
    is_panel_1 = ("panel 1" in panel.name.lower()) or (panel.name.lower() in ["p01", "panel-1", "p1"])
    if not is_panel_1:
        site_panels = db.query(Panel).filter(Panel.site_id == panel.site_id).order_by(Panel.id.asc()).all()
        if len(site_panels) >= 2 and site_panels[0].id == panel.id:
            is_panel_1 = True

    if is_panel_1:
        raise HTTPException(
            status_code=400,
            detail="Safety lock: Relay 1 (Panel 1) is hardwired through NC and cannot be remotely controlled. Only Panel 2 (Relay 2) supports remote control."
        )

    # Find the device linked to this panel's site
    device = db.query(IoTDevice).filter(IoTDevice.site_id == panel.site_id, IoTDevice.status == "ACTIVE").order_by(IoTDevice.id.asc()).first()
    if not device:
        raise HTTPException(status_code=404, detail="No active IoT device associated with this panel's site")
        
    return HardwareControlService.send_command(
        db=db,
        panel=panel,
        device=device,
        user=current_user,
        command=command_in.command,
        reason=command_in.reason
    )
