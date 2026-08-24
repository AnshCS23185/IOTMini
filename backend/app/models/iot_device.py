from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class IoTDevice(Base):
    __tablename__ = "iot_devices"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("solar_sites.id"), nullable=False)
    device_uid = Column(String, unique=True, index=True, nullable=False)
    device_type = Column(String, default="PICO_W")
    firmware_version = Column(String)
    status = Column(String, default="ACTIVE")
    last_seen = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    site = relationship("Site", backref="iot_devices")
