from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.permissions import require_permission
from app.models.user import User
from app.models.iot_device import IoTDevice
from app.models.device_panel_mapping import DevicePanelMapping
from app.models.site import Site
from app.models.panel import Panel
from app.schemas.iot_device import IoTDeviceResponse, IoTDeviceUpdate
from app.schemas.device_panel_mapping import DevicePanelMappingCreate, DevicePanelMappingResponse, DevicePanelMappingDetailedResponse
from pydantic import BaseModel

router = APIRouter(tags=["Admin IoT"])

class AssignSiteRequest(BaseModel):
    site_id: int

@router.get("/iot/devices/unassigned", response_model=List[IoTDeviceResponse])
def get_unassigned_devices(db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    return db.query(IoTDevice).filter(IoTDevice.status == "UNASSIGNED").all()

@router.get("/iot/devices/all", response_model=List[IoTDeviceResponse])
def get_all_devices(db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    return db.query(IoTDevice).all()

@router.post("/iot/devices/{device_uid}/assign-site", response_model=IoTDeviceResponse)
def assign_device_to_site(device_uid: str, req: AssignSiteRequest, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    site = db.query(Site).filter(Site.id == req.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    # Enforce ONE active Pico per site rule
    existing_active = db.query(IoTDevice).filter(IoTDevice.site_id == req.site_id, IoTDevice.status == "ACTIVE").first()
    if existing_active and existing_active.id != device.id:
        raise HTTPException(status_code=400, detail="Site already has an active device")
        
    device.site_id = req.site_id
    device.status = "ACTIVE"
    db.commit()
    db.refresh(device)
    return device

@router.get("/iot/devices/{device_uid}/mappings", response_model=List[DevicePanelMappingDetailedResponse])
def get_device_mappings(device_uid: str, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    mappings = db.query(DevicePanelMapping).filter(DevicePanelMapping.device_id == device.id).all()
    
    res = []
    for m in mappings:
        panel_name = m.panel.name if m.panel else "Unknown"
        res_dict = m.__dict__.copy()
        res_dict["panel_name"] = panel_name
        res.append(res_dict)
    return res

@router.post("/iot/devices/{device_uid}/mappings", response_model=DevicePanelMappingResponse)
def create_device_mapping(device_uid: str, mapping_in: DevicePanelMappingCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    panel = db.query(Panel).filter(Panel.id == mapping_in.panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
        
    if device.site_id != panel.site_id:
        raise HTTPException(status_code=400, detail="Cannot map panel from different site")
        
    # Check duplicate
    existing = db.query(DevicePanelMapping).filter(
        DevicePanelMapping.device_id == device.id, 
        DevicePanelMapping.channel_number == mapping_in.channel_number
    ).first()
    
    if existing:
        existing.panel_id = mapping_in.panel_id
        existing.is_active = mapping_in.is_active
        db.commit()
        db.refresh(existing)
        return existing
        
    new_mapping = DevicePanelMapping(
        device_id=device.id,
        panel_id=mapping_in.panel_id,
        channel_number=mapping_in.channel_number,
        is_active=mapping_in.is_active
    )
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return new_mapping
