import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import Base, get_db, SessionLocal, engine
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.sensor_reading import SensorReading
from app.models.diagnostics import DiagnosticRecord, Alert
from app.models.notifications import Notification
from app.services.diagnostic_service import DiagnosticService

def print_baseline():
    db = SessionLocal()
    site = db.query(Site).filter(Site.id == 9).first()
    if not site:
        print("SITE 9 NOT FOUND")
        site = db.query(Site).filter(Site.name.ilike("%Manish%")).first()
        if not site:
            print("No Manish Nagar site found.")
            return
        
    print(f"SITE: {site.name} (ID: {site.id})")
    
    panels = db.query(Panel).filter(Panel.site_id == site.id).all()
    for p in panels:
        print(f"\n--- Panel {p.id} ({p.name}) ---")
        print(f"Rated Power: {p.rated_power_w} W, Tech: {p.technology}")
        
        reading = db.query(SensorReading).filter(SensorReading.panel_id == p.id).order_by(SensorReading.timestamp.desc()).first()
        if reading:
            print(f"Latest Reading: {reading.timestamp}")
            print(f"Voltage: {reading.voltage} V, Current: {reading.current} A, Power: {reading.power} W, Temp: {reading.temperature} C, LDR: {reading.ldr_value}")
        else:
            print("Latest Reading: NONE")
            
        diag = db.query(DiagnosticRecord).filter(DiagnosticRecord.panel_id == p.id).order_by(DiagnosticRecord.timestamp.desc()).first()
        if diag:
            print(f"Latest Diagnostic: {diag.timestamp}, Status: {diag.status}")
            print(f"Expected Power: {diag.expected_power_w}, Performance: {diag.performance_percentage}")
        else:
            print("Latest Diagnostic: NONE")
            
        alert = db.query(Alert).filter(Alert.panel_id == p.id, Alert.status == "ACTIVE").first()
        if alert:
            print(f"Active Alert: {alert.fault_type}, Severity: {alert.severity}, Ack: {alert.acknowledged_at is not None}")
        else:
            print("Active Alert: NONE")

    print("\n--- Users & Notifications ---")
    users = db.query(User).filter(User.organization_id == site.organization_id).all()
    for u in users:
        notifs = db.query(Notification).filter(Notification.user_id == u.id).all()
        print(f"User {u.id} ({u.email}): {len(notifs)} total notifications.")

if __name__ == "__main__":
    print_baseline()
