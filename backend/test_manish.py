import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Panel, SensorReading
from app.services.diagnostic_service import DiagnosticService

def generate_telemetry(db: Session, panel_id: int):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        print(f"Panel {panel_id} not found!")
        return

    # Delete existing data for this panel to clear the chart
    db.query(SensorReading).filter(SensorReading.panel_id == panel_id).delete()
    db.commit()

    now = datetime.now(timezone.utc)
    readings = []
    
    # Generate data for the last 4 hours, every 5 minutes
    # We want it to go UP and DOWN
    for i in range(48, -1, -1):
        dt = now - timedelta(minutes=i*5)
        
        # Base power around 50W
        power = 50.0
        
        # Up and down pattern
        if 20 < i <= 40:
            power = 15.0  # Big drop (Underperforming / Attention)
        elif 5 < i <= 10:
            power = 8.0   # Another big drop
        
        reading = SensorReading(
            panel_id=panel_id,
            device_id=1,  # Mock device ID
            voltage=12.0,
            current=power/12.0,
            power=power,
            temperature=30.0,
            humidity=50.0,
            light_intensity=1000.0 if power > 20 else 500.0,
            timestamp=dt
        )
        readings.append(reading)
    
    db.bulk_save_objects(readings)
    db.commit()
    print(f"Inserted {len(readings)} readings for Panel {panel_id} (Manish Nagar)")

async def evaluate():
    db = SessionLocal()
    generate_telemetry(db, 8)  # Manish Nagar Panel 1
    generate_telemetry(db, 9)  # Manish Nagar Panel 2
    
    print("Evaluating diagnostics...")
    panel8 = db.query(Panel).filter(Panel.id == 8).first()
    panel9 = db.query(Panel).filter(Panel.id == 9).first()
    if panel8: await DiagnosticService.evaluate_panel(panel8, db)
    if panel9: await DiagnosticService.evaluate_panel(panel9, db)
    
    db.close()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(evaluate())
