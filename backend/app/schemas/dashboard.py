from pydantic import BaseModel
from typing import List, Optional
from .weather import WeatherResponse

class PanelSummary(BaseModel):
    id: int
    name: str
    rated_power_w: float
    actual_power_w: Optional[float]
    expected_power_w: float
    performance_percentage: Optional[float]
    status: str

class DashboardResponse(BaseModel):
    site_id: int
    current_power_w: float
    expected_power_w: float
    performance_percentage: Optional[float]
    total_panels: int
    healthy_panels: int
    attention_panels: int
    underperforming_panels: int
    no_data_panels: int
    no_solar_panels: int
    weather: Optional[WeatherResponse] = None
    panels: List[PanelSummary]
