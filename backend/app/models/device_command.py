from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class DeviceCommand(Base):
    __tablename__ = "device_commands"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("iot_devices.id"), nullable=False)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    command = Column(String, nullable=False) # e.g. RELAY_ON, RELAY_OFF
    status = Column(String, default="PENDING") # PENDING, ACKNOWLEDGED, FAILED
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=True)
    
    requested_at = Column(DateTime(timezone=True), default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    device = relationship("IoTDevice", backref="commands")
    panel = relationship("Panel", backref="device_commands")
    requester = relationship("User", backref="commands_requested")
