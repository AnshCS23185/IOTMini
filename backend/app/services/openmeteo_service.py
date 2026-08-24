import httpx
from datetime import datetime
from app.config import settings
from app.models.site import Site

class OpenMeteoService:
    @staticmethod
    async def get_current_weather(site: Site) -> dict:
        params = {
            "latitude": site.latitude,
            "longitude": site.longitude,
            "current": "temperature_2m,relative_humidity_2m,cloud_cover,precipitation",
            "timezone": site.timezone or "UTC"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(settings.OPEN_METEO_URL, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                current = data.get("current", {})
                
                return {
                    "temperature": current.get("temperature_2m"),
                    "humidity": current.get("relative_humidity_2m"),
                    "cloud_cover": current.get("cloud_cover"),
                    "precipitation": current.get("precipitation"),
                    "solar_radiation": current.get("surface_solar_radiation_down", 0.0), # Assuming not always available in basic current
                    "timestamp": datetime.utcnow()
                }
            except Exception as e:
                print(f"Open-Meteo Error: {str(e)}")
                return None
