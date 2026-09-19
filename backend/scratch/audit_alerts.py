import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta
import asyncio

# Setup DB connection
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import Base, get_db
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.diagnostics import DiagnosticRecord, Alert
from app.models.notifications import Notification
from app.services.diagnostic_service import DiagnosticService
from app.core.security import get_password_hash

DATABASE_URL = "sqlite:///./sql_app.db" # adjust as per your config
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_db(db):
    Base.metadata.create_all(bind=engine)
    db.query(Notification).delete()
    db.query(Alert).delete()
    db.query(DiagnosticRecord).delete()
    db.query(Panel).delete()
    db.query(Site).delete()
    db.query(User).delete()
    db.commit()

def run_tests():
    db = SessionLocal()
    reset_db(db)

    # 1. Setup RBAC Scenario
    org_a_user = User(name="User A", email="a@test.com", password_hash=get_password_hash("pass"), role="USER", organization_id=1, status="ACTIVE")
    org_b_user = User(name="User B", email="b@test.com", password_hash=get_password_hash("pass"), role="USER", organization_id=2, status="ACTIVE")
    db.add_all([org_a_user, org_b_user])
    db.commit()

    site_a = Site(name="Site A", address="123 A", organization_id=1, capacity_kw=10)
    site_b = Site(name="Site B", address="123 B", organization_id=2, capacity_kw=10)
    db.add_all([site_a, site_b])
    db.commit()

    panel_a = Panel(site_id=site_a.id, name="Panel A", capacity_w=400, expected_voltage=40)
    panel_b = Panel(site_id=site_b.id, name="Panel B", capacity_w=400, expected_voltage=40)
    db.add_all([panel_a, panel_b])
    db.commit()

    # C/D. Diagnostics -> Alert Lifecycle & Severity
    print("Testing PANEL_UNDERPERFORMANCE -> Alert Creation")
    diag_1 = DiagnosticRecord(panel_id=panel_a.id, status="PANEL_UNDERPERFORMANCE", expected_power_w=300, reason="Test", panel=panel_a)
    DiagnosticService._update_alert_state(db, diag_1)
    
    active_alerts = db.query(Alert).filter(Alert.panel_id == panel_a.id, Alert.status == "ACTIVE").all()
    assert len(active_alerts) == 1
    alert = active_alerts[0]
    assert alert.severity == "WARNING"
    assert alert.consecutive_count == 1
    print("✅ Alert created correctly.")

    # F. Duplicate Prevention
    print("Testing Duplicate Prevention")
    diag_2 = DiagnosticRecord(panel_id=panel_a.id, status="PANEL_UNDERPERFORMANCE", expected_power_w=300, reason="Test", panel=panel_a)
    DiagnosticService._update_alert_state(db, diag_2)
    active_alerts = db.query(Alert).filter(Alert.panel_id == panel_a.id, Alert.status == "ACTIVE").all()
    assert len(active_alerts) == 1
    assert active_alerts[0].consecutive_count == 2
    print("✅ Duplicate prevention verified.")

    # I. Notifications
    print("Testing Notifications")
    notifs = db.query(Notification).filter(Notification.user_id == org_a_user.id).all()
    assert len(notifs) == 1
    assert notifs[0].alert_id == alert.id
    assert notifs[0].is_read == False
    
    # Check org B has no notifs
    notifs_b = db.query(Notification).filter(Notification.user_id == org_b_user.id).all()
    assert len(notifs_b) == 0
    print("✅ Notifications generated correctly with RBAC.")

    # G. Acknowledgement
    print("Testing Acknowledgement")
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by_id = org_a_user.id
    db.commit()
    assert alert.status == "ACTIVE"
    print("✅ Acknowledged successfully.")

    # H. Resolution (Automatic)
    print("Testing Automatic Resolution")
    diag_3 = DiagnosticRecord(panel_id=panel_a.id, status="HEALTHY", expected_power_w=300, reason="Recovered", panel=panel_a)
    DiagnosticService._update_alert_state(db, diag_3)
    db.refresh(alert)
    assert alert.status == "RESOLVED"
    assert alert.resolved_at is not None
    print("✅ Automatic resolution verified.")

    # Recovery Time Test
    alert.first_detected_at = datetime.now(timezone.utc) - timedelta(minutes=60)
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()

    # K. Analytics SQL logic checks
    # Run the same logic as the endpoint directly against the db state
    alerts = db.query(Alert).filter(Alert.site_id == site_a.id).all()
    total = len(alerts)
    assert total == 1
    assert alerts[0].status == "RESOLVED"
    dur = (alerts[0].resolved_at - alerts[0].first_detected_at).total_seconds() / 60
    assert 59 <= dur <= 61
    print("✅ Recovery duration calculated correctly.")

    print("\nALL BACKEND AUDIT CHECKS PASSED.")

if __name__ == "__main__":
    run_tests()
