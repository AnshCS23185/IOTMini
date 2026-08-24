from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("iot_devices.id"), nullable=False)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    voltage = Column(Float)
    current = Column(Float)
    power = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    light_intensity = Column(Float)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    device = relationship("IoTDevice", backref="sensor_readings")
    panel = relationship("Panel", backref="sensor_readings")
