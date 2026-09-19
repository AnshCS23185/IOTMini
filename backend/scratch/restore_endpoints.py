import os

filepath = r"D:\Project\PanelIQ\IOTMini\backend\app\routes\diagnostics.py"
with open(filepath, "r") as f:
    content = f.read()

# Add missing imports
if "AnalyticsResponse" not in content:
    content = content.replace(
        "from app.schemas.diagnostics import DiagnosticResponse, AlertResponse",
        "from app.schemas.diagnostics import DiagnosticResponse, AlertResponse, AnalyticsResponse, TrendResponse, TrendDataPoint, FaultFrequency, PanelAlertSummary, SiteAlertSummary\nfrom datetime import datetime, timezone, timedelta\nfrom sqlalchemy import func"
    )

new_endpoints = """
@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("DIAGNOSTICS_RUN"))):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    check_site_access(current_user, alert.site, db)
    
    if alert.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Only ACTIVE alerts can be acknowledged")
    if not alert.acknowledged_at:
        alert.acknowledged_at = datetime.now(timezone.utc)
        alert.acknowledged_by_id = current_user.id
        db.commit()
        db.refresh(alert)
        
    return alert

@router.patch("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("DIAGNOSTICS_RUN"))):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    check_site_access(current_user, alert.site, db)
    
    if alert.status == "ACTIVE":
        alert.status = "RESOLVED"
        alert.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        
    return alert

@router.get("/alerts/history", response_model=List[AlertResponse])
async def get_alert_history(
    site_id: Optional[int] = None,
    panel_id: Optional[int] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    ack_state: Optional[str] = None,
    fault_type: Optional[str] = None,
    days: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("DIAGNOSTICS_VIEW"))
):
    query = db.query(Alert)
    
    if current_user.role != "ADMIN":
        query = query.join(Site).filter(Site.organization_id == current_user.organization_id)
        
    if site_id:
        query = query.filter(Alert.site_id == site_id)
    if panel_id:
        query = query.filter(Alert.panel_id == panel_id)
    if status and status != 'ALL':
        query = query.filter(Alert.status == status)
    if severity and severity != 'ALL':
        query = query.filter(Alert.severity == severity)
    if ack_state == 'ACKNOWLEDGED':
        query = query.filter(Alert.acknowledged_at.isnot(None))
    elif ack_state == 'UNACKNOWLEDGED':
        query = query.filter(Alert.acknowledged_at.is_(None))
    if fault_type and fault_type != 'ALL':
        query = query.filter(Alert.fault_type == fault_type)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Alert.first_detected_at >= cutoff)
        
    return query.order_by(desc(Alert.updated_at)).limit(limit).all()

@router.get("/alerts/analytics", response_model=AnalyticsResponse)
async def get_alert_analytics(
    days: Optional[int] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("DIAGNOSTICS_VIEW"))
):
    base_query = db.query(Alert)
    if current_user.role != "ADMIN":
        base_query = base_query.join(Site).filter(Site.organization_id == current_user.organization_id)
        
    if site_id:
        base_query = base_query.filter(Alert.site_id == site_id)
        
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        base_query = base_query.filter(Alert.first_detected_at >= cutoff)
        
    alerts = base_query.all()
    
    total = len(alerts)
    active = sum(1 for a in alerts if a.status == 'ACTIVE')
    resolved = sum(1 for a in alerts if a.status == 'RESOLVED')
    critical = sum(1 for a in alerts if a.severity == 'CRITICAL')
    warning = sum(1 for a in alerts if a.severity == 'WARNING')
    info = sum(1 for a in alerts if a.severity == 'INFO')
    
    resolved_times = [
        (a.resolved_at - a.first_detected_at).total_seconds() / 60
        for a in alerts if a.status == 'RESOLVED' and a.resolved_at and a.first_detected_at
    ]
    avg_res = sum(resolved_times) / len(resolved_times) if resolved_times else None
    fastest = min(resolved_times) if resolved_times else None
    
    active_times = [
        (datetime.now(timezone.utc) - a.first_detected_at).total_seconds() / 60
        for a in alerts if a.status == 'ACTIVE' and a.first_detected_at
    ]
    longest = max(active_times) if active_times else None
    
    from collections import Counter
    fault_counts = Counter(a.fault_type for a in alerts)
    fault_dist = [FaultFrequency(fault_type=k, count=v) for k, v in sorted(fault_counts.items(), key=lambda x: x[1], reverse=True)]
    
    panel_alerts = {}
    for a in alerts:
        if a.panel_id not in panel_alerts:
            panel_alerts[a.panel_id] = {"active": 0, "resolved": 0}
        if a.status == 'ACTIVE':
            panel_alerts[a.panel_id]["active"] += 1
        else:
            panel_alerts[a.panel_id]["resolved"] += 1
            
    panel_summaries = [
        PanelAlertSummary(panel_id=pid, active_alerts=v["active"], resolved_alerts=v["resolved"])
        for pid, v in panel_alerts.items()
    ]
    panel_summaries.sort(key=lambda x: x.active_alerts, reverse=True)
    panel_summaries = panel_summaries[:10]
    
    return AnalyticsResponse(
        total_alerts=total,
        active_alerts=active,
        resolved_alerts=resolved,
        critical_alerts=critical,
        warning_alerts=warning,
        info_alerts=info,
        avg_resolution_time_minutes=avg_res,
        fastest_recovery_minutes=fastest,
        longest_active_minutes=longest,
        fault_distribution=fault_dist,
        panel_summaries=panel_summaries,
        site_summaries=[]
    )

@router.get("/alerts/analytics/trend", response_model=TrendResponse)
async def get_alert_trend(
    days: int = 7,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("DIAGNOSTICS_VIEW"))
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    alerts_query = db.query(Alert)
    if current_user.role != "ADMIN":
        alerts_query = alerts_query.join(Site).filter(Site.organization_id == current_user.organization_id)
        
    alerts_query = alerts_query.filter(Alert.first_detected_at >= cutoff)
    if site_id:
        alerts_query = alerts_query.filter(Alert.site_id == site_id)
        
    alerts = alerts_query.all()
    
    trend_dict = {}
    for i in range(days):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime('%Y-%m-%d')
        trend_dict[d] = {"critical": 0, "warning": 0, "info": 0}
        
    for a in alerts:
        d = a.first_detected_at.strftime('%Y-%m-%d')
        if d in trend_dict:
            if a.severity == "CRITICAL":
                trend_dict[d]["critical"] += 1
            elif a.severity == "WARNING":
                trend_dict[d]["warning"] += 1
            elif a.severity == "INFO":
                trend_dict[d]["info"] += 1
                
    trends = [
        TrendDataPoint(date=k, critical=v["critical"], warning=v["warning"], info=v["info"])
        for k, v in sorted(trend_dict.items())
    ]
    return TrendResponse(trends=trends, days=days)
"""

if "@router.patch(\"/alerts/{alert_id}/acknowledge\"" not in content:
    content += "\n" + new_endpoints

with open(filepath, "w") as f:
    f.write(content)
print("Endpoints restored!")
