import os
import sys
import httpx
import asyncio
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal
from app.models.site import Site
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.device_panel_mapping import DevicePanelMapping
from app.models.device_command import DeviceCommand
from app.models.user import User

async def run_tests():
    db = SessionLocal()
    
    # 2. REAL MANISH NAGAR DEVICE DISCOVERY
    print("\n--- 2. REAL MANISH NAGAR DEVICE DISCOVERY ---")
    site = db.query(Site).filter(Site.id == 9).first()
    if not site:
        print("Site 9 not found")
        return
        
    panels = db.query(Panel).filter(Panel.site_id == site.id).all()
    print(f"Site: {site.name} (ID: {site.id})")
    
    for p in panels:
        mapping = db.query(DevicePanelMapping).filter(DevicePanelMapping.panel_id == p.id).first()
        if mapping:
            device = db.query(IoTDevice).filter(IoTDevice.id == mapping.device_id).first()
            print(f"Panel: {p.id} ({p.name}) | Device UID: {device.device_uid} | Channel: {mapping.channel_number} | Last Seen: {device.last_seen} | Status: {'ONLINE' if device.is_online else 'OFFLINE'}")
        else:
            print(f"Panel: {p.id} ({p.name}) | NO DEVICE MAPPING")
            
    # 4. RBAC TEST (API check)
    print("\n--- 4. RBAC TEST ---")
    admin = db.query(User).filter(User.role == "ADMIN").first()
    viewer = db.query(User).filter(User.role == "VIEWER").first()
    
    print(f"Admin found: {admin.email if admin else 'No'}")
    print(f"Viewer found: {viewer.email if viewer else 'No'}")
    
    # Let's check existing commands
    print("\n--- 7. COMMAND HISTORY BASELINE ---")
    cmds = db.query(DeviceCommand).join(DevicePanelMapping, DeviceCommand.device_id == DevicePanelMapping.device_id)\
            .filter(DevicePanelMapping.panel_id.in_([p.id for p in panels])).all()
            
    print(f"Total historical commands: {len(cmds)}")
    for c in cmds[-5:]:
        print(f"Cmd {c.id}: {c.command} on Device {c.device_id} Ch {c.channel_number} -> {c.status} (by {c.requested_by_id})")

    db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
