from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class WeatherReading(Base):
    __tablename__ = "weather_readings"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("solar_sites.id"), nullable=False)
    temperature = Column(Float)
    humidity = Column(Float)
    cloud_cover = Column(Float)
    precipitation = Column(Float)
    solar_radiation = Column(Float)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    site = relationship("Site", backref="weather_readings")
