from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_panel_access, check_site_access
from app.models.user import User
from app.models.panel import Panel
from app.models.site import Site
from app.models.diagnostics import DiagnosticRecord, Alert
from app.schemas.diagnostics import DiagnosticResponse, AlertResponse
from app.services.diagnostic_service import DiagnosticService

router = APIRouter(tags=["Diagnostics & Alerts"])

@router.get("/panels/{panel_id}/diagnostics", response_model=DiagnosticResponse)
async def get_latest_diagnostic(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)

    record = db.query(DiagnosticRecord).filter(
        DiagnosticRecord.panel_id == panel_id
    ).order_by(desc(DiagnosticRecord.timestamp)).first()

    if not record:
        raise HTTPException(status_code=404, detail="No diagnostics found for this panel")
    return record

@router.get("/panels/{panel_id}/diagnostics/history", response_model=List[DiagnosticResponse])
async def get_diagnostic_history(panel_id: int, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)

    records = db.query(DiagnosticRecord).filter(
        DiagnosticRecord.panel_id == panel_id
    ).order_by(desc(DiagnosticRecord.timestamp)).limit(limit).all()

    return records

@router.get("/sites/{site_id}/alerts", response_model=List[AlertResponse])
async def get_site_alerts(site_id: int, active_only: bool = True, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site)

    query = db.query(Alert).filter(Alert.site_id == site_id)
    if active_only:
        query = query.filter(Alert.status == "ACTIVE")
    
    return query.order_by(desc(Alert.updated_at)).all()

@router.get("/panels/{panel_id}/alerts", response_model=List[AlertResponse])
async def get_panel_alerts(panel_id: int, active_only: bool = True, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)

    query = db.query(Alert).filter(Alert.panel_id == panel_id)
    if active_only:
        query = query.filter(Alert.status == "ACTIVE")
    
    return query.order_by(desc(Alert.updated_at)).all()

@router.post("/panels/{panel_id}/diagnostics/run", response_model=DiagnosticResponse)
async def run_diagnostic(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)

    return await DiagnosticService.evaluate_panel(panel, db)
