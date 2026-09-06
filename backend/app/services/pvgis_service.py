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
                    diff = min(diff, 1440 - diff)
                    
                    if diff < min_diff:
                        min_diff = diff
                        closest_record = record
                        
                if not closest_record:
                    return 0.0
                
                g_i = closest_record.get("G(i)", 0.0)
                if g_i <= 0:
                    return 0.0
                
                system_losses = panel.system_losses or 14.0
                expected_power_w = (g_i / 1000.0) * panel.rated_power_w * (1.0 - system_losses / 100.0)
                
                if expected_power_w < 0.01:
                    return 0.0
                    
                return round(expected_power_w, 2)
                
            except Exception as e:
                print(f"PVGIS DRcalc Error: {str(e)}")
                raise ValueError(f"Failed to fetch or parse PVGIS DRcalc: {str(e)}")

    @staticmethod
    async def get_site_daily_profile(panels: list[Panel], site: Site) -> tuple[list, float]:
        endpoint = "https://re.jrc.ec.europa.eu/api/v5_2/DRcalc"
        site_tz = ZoneInfo(site.timezone or "UTC")
        local_time = datetime.now(site_tz)
        current_month = local_time.month
        
        # We will aggregate expected power across all panels for each time interval
        aggregated_curve = {}
        total_energy_wh = 0.0

        async with httpx.AsyncClient() as client:
            for panel in panels:
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
                    
                try:
                    response = await client.get(endpoint, params=params, timeout=10.0)
                    response.raise_for_status()
                    data = response.json()
                    
                    daily_profile = data.get("outputs", {}).get("daily_profile", [])
                    
                    for record in daily_profile:
                        time_str = record.get("time") # "HH:MM" in UTC
                        if not time_str:
                            continue
                            
                        # Convert UTC time string to Site Local Time string for the frontend graph
                        r_hour, r_minute = map(int, time_str.split(":"))
                        record_utc_dt = local_time.replace(hour=r_hour, minute=r_minute, second=0, microsecond=0, tzinfo=ZoneInfo("UTC"))
                        record_local_dt = record_utc_dt.astimezone(site_tz)
                        local_time_str = record_local_dt.strftime("%H:%M")
                        
                        g_i = record.get("G(i)", 0.0)
                        
                        system_losses = panel.system_losses or 14.0
                        power_w = 0.0
                        if g_i > 0:
                            power_w = (g_i / 1000.0) * panel.rated_power_w * (1.0 - system_losses / 100.0)
                            if power_w < 0.01:
                                power_w = 0.0
                                
                        if local_time_str not in aggregated_curve:
                            aggregated_curve[local_time_str] = 0.0
                        aggregated_curve[local_time_str] += power_w
                        
                        # Integrate energy (power * time_interval in hours). Assuming 15min intervals for DRcalc
                        total_energy_wh += power_w * (15.0 / 60.0)
                        
                except Exception as e:
                    print(f"PVGIS DRcalc Profile Error for panel {panel.id}: {str(e)}")
                    continue
                    
        # Format the aggregated curve into a sorted list
        sorted_times = sorted(aggregated_curve.keys())
        today_curve = [{"time": t, "expected_power_w": round(aggregated_curve[t], 2)} for t in sorted_times]
        
        return today_curve, round(total_energy_wh, 2)

