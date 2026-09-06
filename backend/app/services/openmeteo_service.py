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
            "current": "temperature_2m,relative_humidity_2m,cloud_cover,precipitation,apparent_temperature,wind_speed_10m,weather_code,is_day",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
            "timezone": site.timezone or "UTC"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(settings.OPEN_METEO_URL, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                current = data.get("current", {})
                daily = data.get("daily", {})
                
                forecast = []
                if daily and "time" in daily:
                    for i in range(len(daily["time"])):
                        forecast.append({
                            "date": daily["time"][i],
                            "weathercode": daily.get("weather_code", [])[i] if daily.get("weather_code") else None,
                            "temp_max": daily.get("temperature_2m_max", [])[i] if daily.get("temperature_2m_max") else None,
                            "temp_min": daily.get("temperature_2m_min", [])[i] if daily.get("temperature_2m_min") else None,
                            "sunrise": daily.get("sunrise", [])[i] if daily.get("sunrise") else None,
                            "sunset": daily.get("sunset", [])[i] if daily.get("sunset") else None,
                        })
                
                return {
                    "temperature": current.get("temperature_2m"),
                    "feels_like": current.get("apparent_temperature"),
                    "weathercode": current.get("weather_code"),
                    "is_day": current.get("is_day"),
                    "humidity": current.get("relative_humidity_2m"),
                    "wind_speed": current.get("wind_speed_10m"),
                    "cloud_cover": current.get("cloud_cover"),
                    "precipitation": current.get("precipitation"),
                    "solar_radiation": current.get("surface_solar_radiation_down", 0.0),
                    "timestamp": datetime.utcnow(),
                    "forecast": forecast
                }
            except Exception as e:
                print(f"Open-Meteo Error: {str(e)}")
                return None
