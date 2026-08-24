import httpx
from datetime import datetime
from zoneinfo import ZoneInfo
from app.config import settings
from app.models.panel import Panel
from app.models.site import Site

class PVGISService:
    @staticmethod
    async def get_expected_power(panel: Panel, site: Site) -> float:
        # PVGIS DRcalc Endpoint
        endpoint = "https://re.jrc.ec.europa.eu/api/v5_2/DRcalc"
        
        # 1. Determine Local Time and Month
        site_tz = ZoneInfo(site.timezone or "UTC")
        local_time = datetime.now(site_tz)
        current_month = local_time.month
        
        params = {
            "lat": site.latitude,
            "lon": site.longitude,
            "month": current_month,
            "global": 1,
            "outputformat": "json"
        }
        
        if panel.tilt is not None:
            params["angle"] = panel.tilt
        if panel.azimuth is not None:
            params["aspect"] = panel.azimuth
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(endpoint, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                # DRcalc time is returned in UTC. 
                # We convert our local_time strictly back to UTC to find the closest match.
                utc_now = local_time.astimezone(ZoneInfo("UTC"))
                current_minutes = utc_now.hour * 60 + utc_now.minute
                
                daily_profile = data.get("outputs", {}).get("daily_profile", [])
                if not daily_profile:
                    return 0.0
                
                closest_record = None
                min_diff = float("inf")
                
                for record in daily_profile:
                    time_str = record.get("time") # "HH:MM"
                    if not time_str:
                        continue
                    r_hour, r_minute = map(int, time_str.split(":"))
                    r_minutes = r_hour * 60 + r_minute
                    
                    diff = abs(current_minutes - r_minutes)
                    # Handle midnight wrap-around
                    diff = min(diff, 1440 - diff)
                    
                    if diff < min_diff:
                        min_diff = diff
                        closest_record = record
                        
                if not closest_record:
                    return 0.0
                
                g_i = closest_record.get("G(i)", 0.0)
                
                # If Irradiance is 0 (night time), return 0
                if g_i <= 0:
                    return 0.0
                
                # Calculate expected instantaneous power (W)
                # Power (W) = (G_i / 1000) * rated_power_w * (1 - losses/100)
                system_losses = panel.system_losses or 14.0
                expected_power_w = (g_i / 1000.0) * panel.rated_power_w * (1.0 - system_losses / 100.0)
                
                # Handle effectively zero
                if expected_power_w < 0.01:
                    return 0.0
                    
                return round(expected_power_w, 2)
                
            except Exception as e:
                print(f"PVGIS DRcalc Error: {str(e)}")
                # We do NOT return 0.0 silently, we re-raise so the route throws 502
                raise ValueError(f"Failed to fetch or parse PVGIS DRcalc: {str(e)}")
