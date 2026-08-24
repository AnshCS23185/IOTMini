import os
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from app.models.panel import Panel
from app.models.sensor_reading import SensorReading
from app.models.weather import WeatherReading
from app.models.iot_device import IoTDevice
from app.models.diagnostics import DiagnosticRecord, Alert
from app.services.pvgis_service import PVGISService
from app.services.performance_service import PerformanceService
from typing import Optional

OFFLINE_TIMEOUT_MINUTES = int(os.getenv("OFFLINE_TIMEOUT_MINUTES", "5"))
WEATHER_CLOUD_THRESHOLD = float(os.getenv("WEATHER_CLOUD_THRESHOLD", "70.0"))
WEATHER_PRECIP_THRESHOLD = float(os.getenv("WEATHER_PRECIP_THRESHOLD", "0.0"))
LDR_REDUCTION_THRESHOLD = float(os.getenv("LDR_REDUCTION_THRESHOLD", "0.70"))
LDR_BASELINE_SAMPLE_SIZE = int(os.getenv("LDR_BASELINE_SAMPLE_SIZE", "10"))
THERMAL_TEMP_THRESHOLD = float(os.getenv("THERMAL_TEMP_THRESHOLD", "40.0"))
FAULT_CONFIRMATION_COUNT = int(os.getenv("FAULT_CONFIRMATION_COUNT", "3"))

class DiagnosticService:

    @staticmethod
    def _get_ldr_baseline(panel_id: int, db: Session) -> Optional[float]:
        # Simple rolling median/average over last valid daylight readings
        # For simplicity in MVP, we take the average of the last 10 valid daylight readings where power > 0
        readings = db.query(SensorReading).filter(
            SensorReading.panel_id == panel_id,
            SensorReading.power > 0
        ).order_by(desc(SensorReading.timestamp)).limit(LDR_BASELINE_SAMPLE_SIZE).all()
        
        if len(readings) < (LDR_BASELINE_SAMPLE_SIZE // 2):
            return None # Not enough data to establish a reliable baseline
            
        ldr_values = [r.light_intensity for r in readings if r.light_intensity is not None]
        if not ldr_values:
            return None
            
        return sum(ldr_values) / len(ldr_values)

    @staticmethod
    async def evaluate_panel(panel: Panel, db: Session) -> DiagnosticRecord:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # 2. Latest Sensor Reading
        reading = db.query(SensorReading).filter(SensorReading.panel_id == panel.id).order_by(desc(SensorReading.timestamp)).first()
        
        # 1. IoT Device Check
        device = db.query(IoTDevice).filter(IoTDevice.site_id == panel.site_id).first()
        if not device or not device.last_seen:
             status = "DEVICE_OFFLINE"
             reason = "Device has not communicated recently."
             return DiagnosticService._save_diagnostic(db, panel.id, status, None, None, 0.0, None, None, None, None, None, None, reason)
             
        time_since_last_seen = (now - device.last_seen.astimezone(timezone.utc)).total_seconds() / 60.0
        
        time_since_reading = 0.0
        if reading and reading.timestamp:
            time_since_reading = (now - reading.timestamp.astimezone(timezone.utc)).total_seconds() / 60.0

        if time_since_last_seen > OFFLINE_TIMEOUT_MINUTES and (not reading or time_since_reading > OFFLINE_TIMEOUT_MINUTES):
             status = "DEVICE_OFFLINE"
             reason = f"Device heartbeat expired. Last seen {round(time_since_last_seen, 1)} minutes ago."
             return DiagnosticService._save_diagnostic(db, panel.id, status, None, None, 0.0, None, None, None, None, None, None, reason)
             
        if not reading:
             return DiagnosticService._save_diagnostic(db, panel.id, "NO_DATA", None, None, 0.0, None, None, None, None, None, None, "No sensor reading exists for panel.")
             
        # Validation
        if reading.power is not None and reading.power < 0:
             return DiagnosticService._save_diagnostic(db, panel.id, "NO_DATA", None, None, 0.0, None, None, None, None, None, None, "Sensor reading contains invalid negative power.")
             
        # 3. Expected Power
        try:
            expected_power = await PVGISService.get_expected_power(panel, panel.site)
        except Exception:
            expected_power = 0.0
            
        if expected_power <= 0:
             return DiagnosticService._save_diagnostic(db, panel.id, "NO_SOLAR", None, reading.power, 0.0, reading.light_intensity, None, reading.temperature, reading.humidity, None, None, "Expected power is zero (Nighttime / No Solar).")
             
        # 4. Performance Ratio
        percentage = round((reading.power / expected_power) * 100.0, 2)
        
        weather = db.query(WeatherReading).filter(WeatherReading.site_id == panel.site_id).order_by(desc(WeatherReading.timestamp)).first()
        c_cover = weather.cloud_cover if weather else 0.0
        c_precip = weather.precipitation if weather else 0.0
        
        # 5. Diagnostic Tree
        if percentage >= 85.0:
            status = "HEALTHY"
            reason = "Panel is operating normally within expected parameters."
        elif percentage >= 60.0:
            status = "ATTENTION"
            reason = "Panel performance is slightly degraded but not critically faulty."
        else:
            # Fault finding
            ldr_baseline = DiagnosticService._get_ldr_baseline(panel.id, db)
            
            is_bad_weather = c_cover >= WEATHER_CLOUD_THRESHOLD or c_precip > WEATHER_PRECIP_THRESHOLD
            
            if is_bad_weather:
                status = "WEATHER_RELATED"
                reason = "Low performance correlated with poor regional weather conditions."
            else:
                if ldr_baseline and reading.light_intensity is not None and reading.light_intensity <= (ldr_baseline * LDR_REDUCTION_THRESHOLD):
                    status = "LOCAL_SHADING"
                    reason = "Significant drop in local light intensity detected despite clear regional weather."
                elif reading.temperature is not None and reading.temperature >= THERMAL_TEMP_THRESHOLD:
                    status = "THERMAL_PERFORMANCE_LOSS"
                    reason = "High ambient temperature may be degrading panel efficiency."
                else:
                    status = "PANEL_UNDERPERFORMANCE"
                    reason = "Unexplained performance drop. Weather, light, and temperature appear normal."
                    
        return DiagnosticService._save_diagnostic(
            db=db, 
            panel_id=panel.id, 
            status=status, 
            percentage=percentage, 
            actual=reading.power, 
            expected=expected_power, 
            ldr=reading.light_intensity, 
            baseline=ldr_baseline if 'ldr_baseline' in locals() else None, 
            temp=reading.temperature, 
            humidity=reading.humidity, 
            cloud=c_cover, 
            precip=c_precip, 
            reason=reason
        )

    @staticmethod
    def _save_diagnostic(db: Session, panel_id: int, status: str, percentage: Optional[float], 
                         actual: Optional[float], expected: float, ldr: Optional[float], 
                         baseline: Optional[float], temp: Optional[float], humidity: Optional[float], 
                         cloud: Optional[float], precip: Optional[float], reason: str) -> DiagnosticRecord:
                         
        record = DiagnosticRecord(
            panel_id=panel_id,
            status=status,
            performance_percentage=percentage,
            actual_power_w=actual,
            expected_power_w=expected,
            light_intensity=ldr,
            light_baseline=baseline,
            temperature=temp,
            humidity=humidity,
            cloud_cover=cloud,
            precipitation=precip,
            diagnostic_confidence=0.9 if status not in ("HEALTHY", "ATTENTION", "NO_DATA", "NO_SOLAR") else 1.0,
            reason=reason
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        
        # State machine for Alerts
        DiagnosticService._update_alert_state(db, record)
        
        return record
        
    @staticmethod
    def _update_alert_state(db: Session, diag: DiagnosticRecord):
        # We only create active alerts for confirmed faults
        fault_types = ["LOCAL_SHADING", "WEATHER_RELATED", "THERMAL_PERFORMANCE_LOSS", "PANEL_UNDERPERFORMANCE", "DEVICE_OFFLINE"]
        
        active_alert = db.query(Alert).filter(
            Alert.panel_id == diag.panel_id, 
            Alert.status == "ACTIVE"
        ).first()
        
        if diag.status in fault_types:
            # We have a fault
            if active_alert:
                if active_alert.fault_type == diag.status:
                    # Same fault continues
                    if not active_alert.confirmed_at:
                        active_alert.consecutive_count += 1
                        if active_alert.consecutive_count >= FAULT_CONFIRMATION_COUNT:
                            active_alert.confirmed_at = datetime.utcnow()
                            active_alert.severity = "WARNING"
                            # Snapshot metrics
                            active_alert.performance_percentage = diag.performance_percentage
                            active_alert.actual_power_w = diag.actual_power_w
                            active_alert.expected_power_w = diag.expected_power_w
                            active_alert.light_intensity = diag.light_intensity
                            active_alert.temperature = diag.temperature
                            active_alert.cloud_cover = diag.cloud_cover
                            active_alert.precipitation = diag.precipitation
                    db.commit()
                else:
                    # Different fault, resolve old, start new
                    active_alert.status = "RESOLVED"
                    active_alert.resolved_at = datetime.utcnow()
                    
                    new_alert = Alert(
                        panel_id=diag.panel_id,
                        site_id=diag.panel.site_id,
                        fault_type=diag.status,
                        severity="INFO", # Unconfirmed
                        message=diag.reason,
                        status="ACTIVE",
                        consecutive_count=1
                    )
                    db.add(new_alert)
                    db.commit()
            else:
                # No active alert, start one
                new_alert = Alert(
                    panel_id=diag.panel_id,
                    site_id=diag.panel.site_id,
                    fault_type=diag.status,
                    severity="INFO", # Unconfirmed
                    message=diag.reason,
                    status="ACTIVE",
                    consecutive_count=1
                )
                db.add(new_alert)
                db.commit()
        else:
            # Healthy, Attention, No Data, No Solar -> resolve active faults
            if active_alert:
                active_alert.status = "RESOLVED"
                active_alert.resolved_at = datetime.utcnow()
                db.commit()
