from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_panel_access, require_permission
from app.models.user import User
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingCreate, SensorReadingResponse
from app.schemas.iot_device import IoTDeviceCreate, IoTDeviceResponse, IoTDeviceCreateResponse

router = APIRouter(tags=["IoT"])

@router.post("/iot/devices", response_model=IoTDeviceCreateResponse)
def register_device(device_in: IoTDeviceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    if db.query(IoTDevice).filter(IoTDevice.device_uid == device_in.device_uid).first():
        raise HTTPException(status_code=400, detail="Device already registered")
    
    device_data = device_in.model_dump()
    if not device_data.get("device_token"):
        import secrets
        device_data["device_token"] = secrets.token_urlsafe(32)

    db_device = IoTDevice(**device_data)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

from app.models.performance import PanelPerformance
from app.models.expected_power import ExpectedPower
from app.services.performance_service import PerformanceService

@router.post("/iot/readings", response_model=SensorReadingResponse)
def submit_reading(reading_in: SensorReadingCreate, db: Session = Depends(get_db)):
    # Validate device exists and is active
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == reading_in.device_id).first()
    if not device or device.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Invalid or inactive device")
    
    # Resolve panel on device's site:
    # 1. Direct match by panel ID on this site
    panel = db.query(Panel).filter(Panel.id == reading_in.panel_id, Panel.site_id == device.site_id).first()
    
    # 2. 1-based channel mapping (e.g. channel 1 -> 1st panel, channel 2 -> 2nd panel of the site)
    if not panel:
        site_panels = db.query(Panel).filter(Panel.site_id == device.site_id).order_by(Panel.id.asc()).all()
        if 1 <= reading_in.panel_id <= len(site_panels):
            panel = site_panels[reading_in.panel_id - 1]
            
    # 3. Fallback to direct ID query
    if not panel:
        panel = db.query(Panel).filter(Panel.id == reading_in.panel_id).first()
        if not panel:
            raise HTTPException(status_code=400, detail="Panel not found")
        if panel.site_id != device.site_id:
            raise HTTPException(status_code=403, detail="Device and panel site mismatch")
        
    # Derive/Validate power
    calculated_power = reading_in.voltage * reading_in.current
    actual_power = reading_in.power if abs(calculated_power - reading_in.power) < 1.0 else calculated_power

    # Fallback to server UTC now if hardware RTC is unsynchronized (e.g. 2021 default RTC)
    now_utc = datetime.now(timezone.utc)
    reading_ts = reading_in.timestamp
    if not reading_ts or reading_ts.year < 2024 or reading_ts.year > 2030:
        reading_ts = now_utc
    elif not reading_ts.tzinfo:
        reading_ts = reading_ts.replace(tzinfo=timezone.utc)

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
        timestamp=reading_ts
    )
    db.add(db_reading)
    
    # Update device last_seen with timezone-aware UTC timestamp
    device.last_seen = now_utc

    # Also record performance snapshot for live dashboard & historical graphing
    exp_val = 0.5
    cached_exp = db.query(ExpectedPower).filter(ExpectedPower.panel_id == panel.id).order_by(desc(ExpectedPower.timestamp)).first()
    if cached_exp and cached_exp.expected_power_w > 0:
        exp_val = cached_exp.expected_power_w
    pct, perf_status = PerformanceService.calculate_performance(actual_power, exp_val)
    perf_snapshot = PanelPerformance(
        panel_id=panel.id,
        actual_power_w=actual_power,
        expected_power_w=exp_val,
        performance_percentage=pct,
        status=perf_status,
        timestamp=reading_ts
    )
    db.add(perf_snapshot)
    
    db.commit()
    db.refresh(db_reading)
    return db_reading

@router.post("/iot/heartbeat")
def device_heartbeat(device_uid: str, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Heartbeat received"}

@router.get("/panels/{panel_id}/readings/latest", response_model=SensorReadingResponse)
def get_latest_reading(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    reading = db.query(SensorReading).filter(SensorReading.panel_id == panel_id).order_by(desc(SensorReading.id)).first()
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
    current_user: User = Depends(require_permission("PANEL_VIEW"))
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    query = db.query(SensorReading).filter(SensorReading.panel_id == panel_id)
    if start_time:
        query = query.filter(SensorReading.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorReading.timestamp <= end_time)
        
    return query.order_by(desc(SensorReading.timestamp)).limit(limit).all()

@router.get("/panels/{panel_id}/device", response_model=IoTDeviceResponse)
def get_panel_device(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    device = db.query(IoTDevice).filter(IoTDevice.site_id == panel.site_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="No IoT device associated with this panel's site")
    return device
