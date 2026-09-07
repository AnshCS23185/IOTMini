import os
import sys

# Add parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, SessionLocal

def run_migration():
    print("Starting IoT device authentication and command acknowledgement migration...")
    db = SessionLocal()
    try:
        print("Adding device_token to iot_devices...")
        db.execute(text("ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS device_token VARCHAR"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_iot_devices_device_token ON iot_devices (device_token)"))
        db.commit()
        print("device_token column and index verified on iot_devices.")

        print("Adding error_message to device_commands...")
        db.execute(text("ALTER TABLE device_commands ADD COLUMN IF NOT EXISTS error_message VARCHAR"))
        db.commit()
        print("error_message column verified on device_commands.")

        print("IoT migration completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
