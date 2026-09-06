from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from app.database import get_db
from app.core.permissions import check_site_access, require_permission
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.sensor_reading import SensorReading
from app.services.openmeteo_service import OpenMeteoService
from app.services.pvgis_service import PVGISService
from app.services.performance_service import PerformanceService

router = APIRouter(tags=["Solar Insights"])

@router.get("/sites/{site_id}/solar-insights")
async def get_solar_insights(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("DASHBOARD_VIEW"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site, db)

    panels = db.query(Panel).filter(Panel.site_id == site_id).all()
    
    # Weather & Forecast
    weather_data = None
    try:
        weather_data = await OpenMeteoService.get_current_weather(site)
    except Exception:
        pass

    # Site Daily Profile (PVGIS)
    today_curve = []
    expected_energy_today_wh = 0.0
    try:
        today_curve, expected_energy_today_wh = await PVGISService.get_site_daily_profile(panels, site)
    except Exception:
        pass
        
    total_capacity_w = sum(p.rated_power_w for p in panels)
    
    current_expected_power_w = 0.0
    total_actual = 0.0
    panel_details = []
    has_telemetry = False

    for p in panels:
        reading = db.query(SensorReading).filter(SensorReading.panel_id == p.id).order_by(desc(SensorReading.timestamp)).first()
        actual = reading.power if reading else None
        
        try:
            expected = await PVGISService.get_expected_power(p, site)
        except Exception:
            expected = 0.0
            
        if actual is not None:
            has_telemetry = True
            total_actual += actual
            
        current_expected_power_w += expected
        
        _, status = PerformanceService.calculate_performance(actual, expected)
        
        panel_details.append({
            "id": p.id,
            "name": p.name,
            "rated_power_w": p.rated_power_w,
            "technology": "Mono-Si",
            "tilt": p.tilt,
            "azimuth": p.azimuth,
            "expected_power_w": expected,
            "actual_power_w": actual,
            "status": status
        })
        
    insights = []
    if weather_data:
        cloud_cover = weather_data.get("cloud_cover", 0)
        if cloud_cover > 70:
            insights.append("High cloud cover may reduce expected generation.")
        elif cloud_cover < 20 and weather_data.get("solar_radiation", 0) > 400:
            insights.append("Strong solar conditions are currently available.")
            
        forecast = weather_data.get("forecast", [])
        if forecast and len(forecast) > 0:
            today_f = forecast[0]
            sunrise = today_f.get("sunrise")
            sunset = today_f.get("sunset")
            
            # Use naive string comparison for ISO times
            current_iso = datetime.utcnow().isoformat()
            if sunrise and current_iso < sunrise:
                insights.append("Sunrise has not occurred yet.")
            elif sunset and current_iso > sunset:
                insights.append("Sunset has occurred. Solar potential is near zero.")

    if not has_telemetry:
        insights.append("Site telemetry is currently unavailable.")
    else:
        perf_pct = PerformanceService.calculate_site_performance(total_actual, current_expected_power_w)
        if perf_pct is not None and perf_pct < 70:
            insights.append("Site is underperforming expected values.")

    return {
        "site_id": site.id,
        "site_name": site.name,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "weather": weather_data,
        "solar_potential": {
            "total_capacity_w": total_capacity_w,
            "current_expected_power_w": current_expected_power_w,
            "expected_energy_today_wh": expected_energy_today_wh,
            "today_curve": today_curve,
            "has_telemetry": has_telemetry
        },
        "panels": panel_details,
        "insights": insights
    }
