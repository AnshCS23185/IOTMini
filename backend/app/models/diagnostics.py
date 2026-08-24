from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class DiagnosticRecord(Base):
    __tablename__ = "diagnostic_records"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    status = Column(String, nullable=False)  # HEALTHY, ATTENTION, LOCAL_SHADING, etc.
    performance_percentage = Column(Float, nullable=True)
    actual_power_w = Column(Float, nullable=True)
    expected_power_w = Column(Float, nullable=False)
    light_intensity = Column(Float, nullable=True)
    light_baseline = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    cloud_cover = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    diagnostic_confidence = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    panel = relationship("Panel")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("solar_sites.id"), nullable=False)
    fault_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # INFO, WARNING, CRITICAL
    message = Column(String, nullable=True)
    
    # Store snapshot of when confirmed
    performance_percentage = Column(Float, nullable=True)
    actual_power_w = Column(Float, nullable=True)
    expected_power_w = Column(Float, nullable=True)
    light_intensity = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    cloud_cover = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    
    status = Column(String, default="ACTIVE")  # ACTIVE, RESOLVED
    consecutive_count = Column(Integer, default=1)
    
    first_detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    panel = relationship("Panel", backref="alerts")
    site = relationship("Site", backref="alerts")
