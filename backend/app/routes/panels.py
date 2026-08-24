from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_active_user, get_current_admin_user
from app.core.permissions import check_site_access, check_panel_access
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.schemas.panel import PanelCreate, PanelUpdate, PanelResponse

# router will have /panels and sites_router will have /sites/{site_id}/panels
router = APIRouter(tags=["Panels"])

@router.post("/sites/{site_id}/panels", response_model=PanelResponse)
def create_panel(site_id: int, panel_in: PanelCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    if panel_in.site_id != site_id:
        raise HTTPException(status_code=400, detail="Path site_id and body site_id must match")
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    db_panel = Panel(**panel_in.model_dump())
    db.add(db_panel)
    db.commit()
    db.refresh(db_panel)
    return db_panel

@router.get("/sites/{site_id}/panels", response_model=List[PanelResponse])
def get_site_panels(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site)
    
    return db.query(Panel).filter(Panel.site_id == site_id).all()

@router.get("/panels", response_model=List[PanelResponse])
def get_all_panels(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role == "ADMIN":
        return db.query(Panel).all()
    
    user_sites = db.query(Site).filter(Site.organization_id == current_user.organization_id).all()
    site_ids = [site.id for site in user_sites]
    return db.query(Panel).filter(Panel.site_id.in_(site_ids)).all()

@router.get("/panels/{panel_id}", response_model=PanelResponse)
def get_panel(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel)
    return panel

@router.put("/panels/{panel_id}", response_model=PanelResponse)
def update_panel(panel_id: int, panel_in: PanelUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    for key, value in panel_in.model_dump(exclude_unset=True).items():
        setattr(panel, key, value)
    db.commit()
    db.refresh(panel)
    return panel

@router.delete("/panels/{panel_id}")
def delete_panel(panel_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    db.delete(panel)
    db.commit()
    return {"message": "Panel deleted successfully"}
