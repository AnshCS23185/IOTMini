from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_site_access
from app.models.user import User
from app.models.site import Site
from app.models.weather import WeatherReading
from app.schemas.weather import WeatherResponse
from app.services.openmeteo_service import OpenMeteoService

router = APIRouter(tags=["Weather"])

@router.get("/sites/{site_id}/weather", response_model=WeatherResponse)
async def get_site_weather(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site)
    
    # Check for recent cached weather (e.g. within last 15 minutes)
    recent_limit = datetime.utcnow() - timedelta(minutes=15)
    recent_weather = db.query(WeatherReading).filter(
        WeatherReading.site_id == site_id,
        WeatherReading.timestamp >= recent_limit
    ).order_by(WeatherReading.timestamp.desc()).first()
    
    if recent_weather:
        return recent_weather
        
    # Fetch from Open-Meteo
    weather_data = await OpenMeteoService.get_current_weather(site)
    if not weather_data:
        raise HTTPException(status_code=502, detail="Failed to fetch weather from external service")
        
    db_weather = WeatherReading(
        site_id=site_id,
        temperature=weather_data.get("temperature"),
        humidity=weather_data.get("humidity"),
        cloud_cover=weather_data.get("cloud_cover"),
        precipitation=weather_data.get("precipitation"),
        solar_radiation=weather_data.get("solar_radiation"),
        timestamp=weather_data.get("timestamp")
    )
    
    db.add(db_weather)
    db.commit()
    db.refresh(db_weather)
    return db_weather
