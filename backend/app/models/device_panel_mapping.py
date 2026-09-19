from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref
from app.database import Base

class DevicePanelMapping(Base):
    __tablename__ = "device_panel_mappings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("iot_devices.id"), nullable=False)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    channel_number = Column(Integer, nullable=False) # e.g. 1 for CH1, 2 for CH2
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    device = relationship("IoTDevice", backref=backref("panel_mappings", cascade="all, delete-orphan"))
    panel = relationship("Panel", backref=backref("device_mappings", cascade="all, delete-orphan"))

    __table_args__ = (
        UniqueConstraint('device_id', 'channel_number', name='uix_device_channel'),
    )
