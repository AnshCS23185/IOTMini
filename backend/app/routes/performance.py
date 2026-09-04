from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_panel_access, check_site_access, require_permission
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.sensor_reading import SensorReading
from app.models.expected_power import ExpectedPower
from app.models.performance import PanelPerformance
from app.schemas.expected_power import ExpectedPowerResponse
from app.schemas.performance import PanelPerformanceResponse
from app.schemas.dashboard import DashboardResponse, PanelSummary
from app.services.pvgis_service import PVGISService
from app.services.performance_service import PerformanceService

router = APIRouter(tags=["Performance"])

@router.get("/panels/{panel_id}/expected-power", response_model=ExpectedPowerResponse)
async def get_expected_power(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("REPORT_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    # Check for recent cached expected power
    # PVGIS DRcalc profile is hourly, so cache for 30 minutes to stay fresh
    cache_start = datetime.utcnow() - timedelta(minutes=30)
    cached_expected = db.query(ExpectedPower).filter(
        ExpectedPower.panel_id == panel_id,
        ExpectedPower.source == "PVGIS_DRcalc",
        ExpectedPower.timestamp >= cache_start
    ).order_by(desc(ExpectedPower.timestamp)).first()
    
    if cached_expected:
        return cached_expected
        
    try:
        expected_power_w = await PVGISService.get_expected_power(panel, panel.site)
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Failed to fetch expected power from PVGIS")
         
    new_expected = ExpectedPower(
        panel_id=panel_id,
        expected_power_w=expected_power_w,
        source="PVGIS_DRcalc",
        timestamp=datetime.utcnow()
    )
    db.add(new_expected)
    db.commit()
    db.refresh(new_expected)
    return new_expected

@router.get("/panels/{panel_id}/performance", response_model=PanelPerformanceResponse)
async def get_panel_performance(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("REPORT_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    # 1. Get Actual Power (Latest Reading)
    latest_reading = db.query(SensorReading).filter(SensorReading.panel_id == panel_id).order_by(desc(SensorReading.timestamp)).first()
    actual_power = latest_reading.power if latest_reading else None
    
    # 2. Get Expected Power
    expected_power_res = await get_expected_power(panel_id, db, current_user)
    expected_power = expected_power_res.expected_power_w
    
    # 3. Calculate Performance
    percentage, status = PerformanceService.calculate_performance(actual_power, expected_power)
    
    perf = PanelPerformance(
        panel_id=panel_id,
        actual_power_w=actual_power,
        expected_power_w=expected_power,
        performance_percentage=percentage,
        status=status,
        timestamp=datetime.utcnow()
    )
    db.add(perf)
    db.commit()
    db.refresh(perf)
    return perf

@router.get("/sites/{site_id}/performance")
async def get_site_performance(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("REPORT_VIEW"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site, db)
    
    panels = db.query(Panel).filter(Panel.site_id == site_id).all()
    
    total_actual = 0.0
    total_expected = 0.0
    
    for p in panels:
        # Latest reading
        reading = db.query(SensorReading).filter(SensorReading.panel_id == p.id).order_by(desc(SensorReading.timestamp)).first()
        actual = reading.power if reading else None
        
        # Latest expected
        expected_res = await get_expected_power(p.id, db, current_user)
        expected = expected_res.expected_power_w
        
        if actual is not None:
            total_actual += actual
        if expected is not None and expected > 0:
            total_expected += expected
        
    site_perf = PerformanceService.calculate_site_performance(total_actual, total_expected)
    return {
        "site_id": site_id,
        "total_actual_power_w": total_actual,
        "total_expected_power_w": total_expected,
        "site_performance_percentage": site_perf
    }

@router.get("/panels/{panel_id}/performance/history", response_model=List[PanelPerformanceResponse])
def get_performance_history(
    panel_id: int, 
    start_time: Optional[datetime] = Query(None, alias="from"),
    end_time: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_permission("REPORT_VIEW"))
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    
    query = db.query(PanelPerformance).filter(PanelPerformance.panel_id == panel_id)
    if start_time:
        query = query.filter(PanelPerformance.timestamp >= start_time)
    if end_time:
        query = query.filter(PanelPerformance.timestamp <= end_time)
        
    return query.order_by(desc(PanelPerformance.timestamp)).limit(limit).all()

@router.get("/sites/{site_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("DASHBOARD_VIEW"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site, db)
    
    panels = db.query(Panel).filter(Panel.site_id == site_id).all()
    
    total_actual = 0.0
    total_expected = 0.0
    healthy = 0
    attention = 0
    underperforming = 0
    no_data = 0
    no_solar = 0
    
    panel_summaries = []
    
    for p in panels:
        # Try to calculate performance directly using our endpoint logic
        try:
            perf = await get_panel_performance(p.id, db, current_user)
            actual = perf.actual_power_w
            expected = perf.expected_power_w
            status = perf.status
            pct = perf.performance_percentage
        except Exception:
            actual = None
            expected = 0.0
            status = "NO_DATA"
            pct = None
            
        if actual is not None:
            total_actual += actual
        if expected is not None and expected > 0:
            total_expected += expected
        
        if status == "HEALTHY":
            healthy += 1
        elif status == "ATTENTION":
            attention += 1
        elif status == "UNDERPERFORMING":
            underperforming += 1
        elif status == "NO_DATA":
            no_data += 1
        elif status == "NO_SOLAR":
            no_solar += 1
            
        panel_summaries.append(PanelSummary(
            id=p.id,
            name=p.name,
            rated_power_w=p.rated_power_w,
            actual_power_w=actual,
            expected_power_w=expected,
            performance_percentage=pct,
            status=status
        ))
        
    site_perf = PerformanceService.calculate_site_performance(total_actual, total_expected)
    
    # Import and call weather route logic
    from app.routes.weather import get_site_weather
    try:
        weather = await get_site_weather(site_id, db, current_user)
    except Exception:
        weather = None

    return DashboardResponse(
        site_id=site_id,
        current_power_w=total_actual,
        expected_power_w=total_expected,
        performance_percentage=site_perf,
        total_panels=len(panels),
        healthy_panels=healthy,
        attention_panels=attention,
        underperforming_panels=underperforming,
        no_data_panels=no_data,
        no_solar_panels=no_solar,
        weather=weather,
        panels=panel_summaries
    )
