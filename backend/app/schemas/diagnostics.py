from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DiagnosticResponse(BaseModel):
    id: int
    panel_id: int
    status: str
    performance_percentage: Optional[float]
    actual_power_w: Optional[float]
    expected_power_w: float
    light_intensity: Optional[float]
    light_baseline: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    cloud_cover: Optional[float]
    precipitation: Optional[float]
    diagnostic_confidence: Optional[float]
    reason: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    panel_id: int
    site_id: int
    fault_type: str
    severity: str
    message: Optional[str]
    performance_percentage: Optional[float]
    actual_power_w: Optional[float]
    expected_power_w: Optional[float]
    light_intensity: Optional[float]
    temperature: Optional[float]
    cloud_cover: Optional[float]
    precipitation: Optional[float]
    status: str
    consecutive_count: int
    first_detected_at: datetime
    confirmed_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    acknowledged_by_id: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class FaultFrequency(BaseModel):
    fault_type: str
    count: int

class PanelAlertSummary(BaseModel):
    panel_id: int
    total_alerts: int
    active_alerts: int
    resolved_alerts: int

class SiteAlertSummary(BaseModel):
    site_id: int
    total_alerts: int
    active_alerts: int
    resolved_alerts: int
    critical: int
    warning: int
    info: int

class AnalyticsResponse(BaseModel):
    total_alerts: int
    active_alerts: int
    resolved_alerts: int
    critical_alerts: int
    warning_alerts: int
    info_alerts: int
    avg_resolution_time_minutes: Optional[float]
    fastest_recovery_minutes: Optional[float]
    longest_active_minutes: Optional[float]
    fault_distribution: List[FaultFrequency]
    panel_summaries: List[PanelAlertSummary]
    site_summaries: List[SiteAlertSummary]

class TrendDataPoint(BaseModel):
    date: str
    total: int
    critical: int
    warning: int
    info: int

class TrendResponse(BaseModel):
    trends: List[TrendDataPoint]
