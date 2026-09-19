import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal, Base, engine
from app.models.diagnostics import Alert
from app.models.notifications import Notification

def check_alerts():
    db = SessionLocal()
    alerts = db.query(Alert).filter(Alert.panel_id.in_([8, 9]), Alert.status == "ACTIVE").all()
    print(f"Total Active Alerts for panels 8, 9: {len(alerts)}")
    for a in alerts:
        print(f"Alert {a.id}: Panel {a.panel_id}, {a.fault_type}, {a.severity}, Count: {a.consecutive_count}, Ack: {a.acknowledged_at}")
        
    # Notifications for user 9 (from baseline script)
    notifs = db.query(Notification).filter(Notification.user_id == 9).order_by(Notification.created_at.desc()).limit(2).all()
    for n in notifs:
        print(f"Notification {n.id}: Alert {n.alert_id}, Read: {n.is_read}")

if __name__ == "__main__":
    check_alerts()
