from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Panel(Base):
    __tablename__ = "solar_panels"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("solar_sites.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    rated_power_w = Column(Float, nullable=False)
    technology = Column(String)
    tilt = Column(Float)
    azimuth = Column(Float)
    system_losses = Column(Float, default=14.0)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    site = relationship("Site", backref="solar_panels")
