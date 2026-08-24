from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PanelPerformance(Base):
    __tablename__ = "panel_performance"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("solar_panels.id"), nullable=False)
    actual_power_w = Column(Float, nullable=True)
    expected_power_w = Column(Float, nullable=False)
    performance_percentage = Column(Float, nullable=True)
    status = Column(String, nullable=False) # HEALTHY, ATTENTION, UNDERPERFORMING, NO_SOLAR, NO_DATA
    timestamp = Column(DateTime(timezone=True), nullable=False)

    panel = relationship("Panel", backref="performance_records")
