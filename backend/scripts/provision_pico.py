import os
import sys

# Add parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.organization import Organization
from app.models.site import Site
from app.models.panel import Panel
from app.models.iot_device import IoTDevice

def provision(device_uid="PICO-W-01", device_token="pico_secret_token_123"):
    db = SessionLocal()
    try:
        # 1. Organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Demo Solar Org")
            db.add(org)
            db.flush()
            print(f"Created organization: {org.name} (ID: {org.id})")

        # 2. Site
        site = db.query(Site).filter(Site.name == "Demo Solar Site").first()
        if not site:
            site = Site(
                name="Demo Solar Site",
                organization_id=org.id,
                latitude=12.9716,
                longitude=77.5946,
                timezone="Asia/Kolkata",
                address="Demo Facility, Site 1",
                status="ACTIVE"
            )
            db.add(site)
            db.flush()
            print(f"Created site: {site.name} (ID: {site.id})")
        else:
            print(f"Using existing site: {site.name} (ID: {site.id})")

        # 3. Panel 1 (Relay 1 - NC1, hardware locked)
        panel1 = db.query(Panel).filter(Panel.site_id == site.id, Panel.name == "Panel 1").first()
        if not panel1:
            panel1 = Panel(
                site_id=site.id,
                name="Panel 1",
                rated_power_w=50.0,
                technology="Monocrystalline",
                tilt=15.0,
                azimuth=180.0,
                status="ACTIVE"
            )
            db.add(panel1)
            db.flush()
            print(f"Created Panel 1: ID {panel1.id} (Relay 1 - NC Hardwired)")
        else:
            print(f"Using existing Panel 1: ID {panel1.id}")

        # 4. Panel 2 (Relay 2 - GP15, remote controlled)
        panel2 = db.query(Panel).filter(Panel.site_id == site.id, Panel.name == "Panel 2").first()
        if not panel2:
            panel2 = Panel(
                site_id=site.id,
                name="Panel 2",
                rated_power_w=50.0,
                technology="Monocrystalline",
                tilt=15.0,
                azimuth=180.0,
                status="ACTIVE"
            )
            db.add(panel2)
            db.flush()
            print(f"Created Panel 2: ID {panel2.id} (Relay 2 - Remotely Controllable)")
        else:
            print(f"Using existing Panel 2: ID {panel2.id}")

        # 5. IoT Device
        device = db.query(IoTDevice).filter(IoTDevice.device_uid == device_uid).first()
        if not device:
            device = IoTDevice(
                site_id=site.id,
                device_uid=device_uid,
                device_type="PICO_W",
                firmware_version="v1.0.0",
                status="ACTIVE",
                device_token=device_token
            )
            db.add(device)
            db.commit()
            print(f"Created IoT Device: {device.device_uid} (ID: {device.id}) with token: {device_token}")
        else:
            device.device_token = device_token
            device.status = "ACTIVE"
            device.site_id = site.id
            db.commit()
            print(f"Updated existing IoT Device: {device.device_uid} (ID: {device.id}) with token: {device_token}")

        print("\nProvisioning completed successfully!")
        print(f"Site ID:    {site.id}")
        print(f"Panel 1 ID: {panel1.id} (NC1 hardwired, Relay 1)")
        print(f"Panel 2 ID: {panel2.id} (Controlled, Relay 2 on GP15)")
        print(f"Device UID: {device_uid}")
        print(f"Token:      {device_token}")
    except Exception as e:
        db.rollback()
        print(f"Error provisioning device: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else "pico_secret_token_123"
    provision("PICO-W-01", token)
