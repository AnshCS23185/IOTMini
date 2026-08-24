from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.core.dependencies import get_current_active_user, get_current_admin_user
from app.core.permissions import check_panel_access
from app.models.user import User
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingCreate, SensorReadingResponse
from app.schemas.iot_device import IoTDeviceCreate, IoTDeviceResponse

router = APIRouter(tags=["IoT"])

@router.post("/iot/devices", response_model=IoTDeviceResponse)
def register_device(device_in: IoTDeviceCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    if db.query(IoTDevice).filter(IoTDevice.device_uid == device_in.device_uid).first():
        raise HTTPException(status_code=400, detail="Device already registered")
    
    db_device = IoTDevice(**device_in.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.post("/iot/readings", response_model=SensorReadingResponse)
def submit_reading(reading_in: SensorReadingCreate, db: Session = Depends(get_db)):
    # Validate device exists and is active
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == reading_in.device_id).first()
    if not device or device.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Invalid or inactive device")
    
    # Validate panel exists
    panel = db.query(Panel).filter(Panel.id == reading_in.panel_id).first()
    if not panel:
        raise HTTPException(status_code=400, detail="Panel not found")
        
    # Validate panel belongs to the device's site
    if panel.site_id != device.site_id:
        raise HTTPException(status_code=403, detail="Device and panel site mismatch")
        
    # Derive/Validate power
    calculated_power = reading_in.voltage * reading_in.current
    # For MVP we can just store the calculated power or the provided one if it matches closely.
    # Let's use the provided power, but ensure it's not wildly off or just recalculate it to be safe.
    actual_power = reading_in.power if abs(calculated_power - reading_in.power) < 1.0 else calculated_power

    # Store reading
    db_reading = SensorReading(
        device_id=device.id,
        panel_id=panel.id,
        voltage=reading_in.voltage,
        current=reading_in.current,
        power=actual_power,
        temperature=reading_in.temperature,
        humidity=reading_in.humidity,
        light_intensity=reading_in.light_intensity,
        timestamp=reading_in.timestamp
    )
    db.add(db_reading)
    
    # Update device last_seen
    device.last_seen = datetime.utcnow()
    
    db.commit()
    db.refresh(db_reading)
    return db_reading

@router.post("/iot/heartbeat")
def device_heartbeat(device_uid: str, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.last_seen = datetime.utcnow()
    db.commit()
    return {"message": "Heartbeat received"}

@router.get("/panels/{panel_id}/readings/latest", response_model=SensorReadingResponse)
def get_latest_reading(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)
    
    reading = db.query(SensorReading).filter(SensorReading.panel_id == panel_id).order_by(desc(SensorReading.timestamp)).first()
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found for this panel")
    return reading

@router.get("/panels/{panel_id}/readings", response_model=List[SensorReadingResponse])
def get_historical_readings(
    panel_id: int, 
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)
    
    query = db.query(SensorReading).filter(SensorReading.panel_id == panel_id)
    if start_time:
        query = query.filter(SensorReading.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorReading.timestamp <= end_time)
        
    return query.order_by(desc(SensorReading.timestamp)).limit(limit).all()

@router.get("/panels/{panel_id}/device", response_model=IoTDeviceResponse)
def get_panel_device(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)
    
    device = db.query(IoTDevice).filter(IoTDevice.site_id == panel.site_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="No IoT device associated with this panel's site")
    return device
