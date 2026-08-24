from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ExpectedPower(Base):
    __tablename__ = "expected_power"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    expected_power_w = Column(Float, nullable=False)
    source = Column(String, default="PVGIS")
    timestamp = Column(DateTime(timezone=True), nullable=False)

    panel = relationship("Panel", backref="expected_power_readings")
