from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.panel import Panel
from app.models.iot_device import IoTDevice
from app.models.user import User
from app.models.device_command import DeviceCommand

class HardwareControlService:
    @staticmethod
    def send_command(db: Session, panel: Panel, device: IoTDevice, user: User, command: str, reason: str = None) -> DeviceCommand:
        # Create a new command with PENDING status
        new_command = DeviceCommand(
            device_id=device.id,
            panel_id=panel.id,
            command=command,
            status="PENDING",
            requested_by=user.id,
            reason=reason,
            requested_at=datetime.now(timezone.utc)
        )
        
        db.add(new_command)
        db.commit()
        db.refresh(new_command)
        
        # In a real implementation with immediate HTTP/MQTT push, 
        # we would attempt to send the command here.
        # Since the Pico W is not fully ready for incoming commands,
        # we rely on the device polling GET /api/v1/iot/devices/{device_uid}/commands.
        # So we just return the PENDING command.
        
        return new_command
