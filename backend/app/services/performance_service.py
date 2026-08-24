from typing import Optional, Tuple
from app.models.panel import Panel

class PerformanceService:
    @staticmethod
    def calculate_performance(actual_power: Optional[float], expected_power: float) -> Tuple[Optional[float], str]:
        if expected_power <= 0:
            return None, "NO_SOLAR"
            
        if actual_power is None:
            return None, "NO_DATA"
            
        percentage = (actual_power / expected_power) * 100.0
        percentage = round(percentage, 2)
        
        if percentage >= 85.0:
            status = "HEALTHY"
        elif percentage >= 60.0:
            status = "ATTENTION"
        else:
            status = "UNDERPERFORMING"
            
        return percentage, status
        
    @staticmethod
    def calculate_site_performance(total_actual: float, total_expected: float) -> Optional[float]:
        if total_expected <= 0:
            return None
        return round((total_actual / total_expected) * 100.0, 2)
