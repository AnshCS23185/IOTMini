from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_site_access, check_panel_access, require_permission
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.rbac import UserSite
from app.schemas.panel import PanelCreate, PanelUpdate, PanelResponse, PanelStatusUpdate, PanelSummaryResponse

router = APIRouter(tags=["Panels"])

def _panel_to_response(panel: Panel, db: Session) -> dict:
    """Convert a Panel ORM object to a response dict that includes site_name."""
    site = db.query(Site).filter(Site.id == panel.site_id).first()
    data = {
        "id": panel.id,
        "name": panel.name,
        "rated_power_w": panel.rated_power_w,
        "technology": panel.technology,
        "tilt": panel.tilt,
        "azimuth": panel.azimuth,
        "system_losses": panel.system_losses,
        "status": panel.status,
        "site_id": panel.site_id,
        "created_at": panel.created_at,
        "updated_at": panel.updated_at,
        "site_name": site.name if site else None,
    }
    return data

# ─── Summary stats ────────────────────────────────────────────────
@router.get("/panels/summary", response_model=PanelSummaryResponse)
def get_panels_summary(
    site_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("PANEL_VIEW"))
):
    """Return aggregate panel statistics. Optional site_id filter."""
    query = db.query(Panel)

    if current_user.role_rel and current_user.role_rel.name == "ADMIN":
        if site_id:
            query = query.filter(Panel.site_id == site_id)
    else:
        user_sites = db.query(UserSite.site_id).filter(UserSite.user_id == current_user.id).subquery()
        query = query.filter(Panel.site_id.in_(user_sites))
        if site_id:
            query = query.filter(Panel.site_id == site_id)

    panels = query.all()
    total = len(panels)
    active = sum(1 for p in panels if p.status == "ACTIVE")
    inactive = total - active
    total_rated = sum(p.rated_power_w or 0 for p in panels)

    return PanelSummaryResponse(
        total_panels=total,
        active_panels=active,
        inactive_panels=inactive,
        total_rated_power_w=total_rated,
    )

# ─── CRUD ────────────────────────────────────────────────────────

@router.post("/sites/{site_id}/panels", response_model=PanelResponse)
def create_panel(site_id: int, panel_in: PanelCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_CREATE"))):
    if panel_in.site_id != site_id:
        raise HTTPException(status_code=400, detail="Path site_id and body site_id must match")
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    db_panel = Panel(**panel_in.model_dump())
    db.add(db_panel)
    db.commit()
    db.refresh(db_panel)
    return _panel_to_response(db_panel, db)

@router.get("/sites/{site_id}/panels", response_model=List[PanelResponse])
def get_site_panels(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site, db)
    
    panels = db.query(Panel).filter(Panel.site_id == site_id).all()
    return [_panel_to_response(p, db) for p in panels]

@router.get("/panels", response_model=List[PanelResponse])
def get_all_panels(
    site_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("PANEL_VIEW"))
):
    query = db.query(Panel)

    if current_user.role_rel and current_user.role_rel.name == "ADMIN":
        if site_id:
            query = query.filter(Panel.site_id == site_id)
    else:
        user_sites = db.query(UserSite.site_id).filter(UserSite.user_id == current_user.id).subquery()
        query = query.filter(Panel.site_id.in_(user_sites))
        if site_id:
            query = query.filter(Panel.site_id == site_id)

    panels = query.all()
    return [_panel_to_response(p, db) for p in panels]

@router.get("/panels/{panel_id}", response_model=PanelResponse)
def get_panel(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_VIEW"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    check_panel_access(current_user, panel, db)
    return _panel_to_response(panel, db)

@router.put("/panels/{panel_id}", response_model=PanelResponse)
def update_panel(panel_id: int, panel_in: PanelUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_UPDATE"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    for key, value in panel_in.model_dump(exclude_unset=True).items():
        setattr(panel, key, value)
    db.commit()
    db.refresh(panel)
    return _panel_to_response(panel, db)

@router.patch("/panels/{panel_id}/status", response_model=PanelResponse)
def toggle_panel_status(
    panel_id: int,
    body: PanelStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("PANEL_UPDATE"))
):
    """Activate or deactivate a panel."""
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    
    if body.status not in ("ACTIVE", "INACTIVE"):
        raise HTTPException(status_code=400, detail="Status must be ACTIVE or INACTIVE")

    panel.status = body.status
    db.commit()
    db.refresh(panel)
    return _panel_to_response(panel, db)

@router.delete("/panels/{panel_id}")
def delete_panel(panel_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("PANEL_DELETE"))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    db.delete(panel)
    db.commit()
    return {"message": "Panel deleted successfully"}
