from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.permissions import check_site_access, require_permission
from app.models.user import User
from app.models.site import Site
from app.models.organization import Organization
from app.models.rbac import UserSite
from app.models.panel import Panel
from app.models.sensor_reading import SensorReading
from app.models.expected_power import ExpectedPower
from app.models.performance import PanelPerformance
from app.models.diagnostics import DiagnosticRecord, Alert
from app.models.weather import WeatherReading
from app.models.iot_device import IoTDevice
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse

router = APIRouter(prefix="/sites", tags=["Sites"])
org_router = APIRouter(prefix="/organizations", tags=["Organizations"])

# Organizations (Admin only)
@org_router.post("", response_model=OrganizationResponse)
def create_organization(org_in: OrganizationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SETTINGS_UPDATE"))):
    db_org = Organization(**org_in.model_dump())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@org_router.get("", response_model=List[OrganizationResponse])
def get_organizations(db: Session = Depends(get_db), current_user: User = Depends(require_permission("SETTINGS_VIEW"))):
    return db.query(Organization).all()

@org_router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(org_id: int, org_in: OrganizationUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SETTINGS_UPDATE"))):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for key, value in org_in.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org

# Sites
@router.post("", response_model=SiteResponse)
def create_site(site_in: SiteCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_CREATE"))):
    if not db.query(Organization).filter(Organization.id == site_in.organization_id).first():
        raise HTTPException(status_code=400, detail="Organization not found")
    data = site_in.model_dump()
    if not data.get("address") and data.get("location"):
        data["address"] = data["location"]
    data.pop("location", None)
    db_site = Site(**data)
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site

@router.get("", response_model=List[SiteResponse])
def get_sites(db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_VIEW"))):
    if current_user.role_rel and current_user.role_rel.name == "ADMIN":
        return db.query(Site).all()
    user_sites = db.query(UserSite.site_id).filter(UserSite.user_id == current_user.id).subquery()
    return db.query(Site).filter(Site.id.in_(user_sites)).all()

@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_VIEW"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site, db)
    return site

@router.put("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, site_in: SiteUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_UPDATE"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    data = site_in.model_dump(exclude_unset=True)
    if "location" in data:
        loc = data.pop("location")
        if "address" not in data:
            data["address"] = loc
    for key, value in data.items():
        setattr(site, key, value)
    db.commit()
    db.refresh(site)
    return site

@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("SITE_DELETE"))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    try:
        # 1. Clean up panels and their associated readings/calculations
        panels = db.query(Panel).filter(Panel.site_id == site_id).all()
        panel_ids = [p.id for p in panels]
        if panel_ids:
            db.query(SensorReading).filter(SensorReading.panel_id.in_(panel_ids)).delete(synchronize_session=False)
            db.query(ExpectedPower).filter(ExpectedPower.panel_id.in_(panel_ids)).delete(synchronize_session=False)
            db.query(PanelPerformance).filter(PanelPerformance.panel_id.in_(panel_ids)).delete(synchronize_session=False)
            db.query(DiagnosticRecord).filter(DiagnosticRecord.panel_id.in_(panel_ids)).delete(synchronize_session=False)
            db.query(Alert).filter(Alert.panel_id.in_(panel_ids)).delete(synchronize_session=False)
            db.query(Panel).filter(Panel.site_id == site_id).delete(synchronize_session=False)

        # 2. Delete site-level alerts, weather readings, and IoT devices
        db.query(Alert).filter(Alert.site_id == site_id).delete(synchronize_session=False)
        db.query(WeatherReading).filter(WeatherReading.site_id == site_id).delete(synchronize_session=False)
        db.query(IoTDevice).filter(IoTDevice.site_id == site_id).delete(synchronize_session=False)
        
        # 3. Clean up user-site associations
        db.query(UserSite).filter(UserSite.site_id == site_id).delete(synchronize_session=False)

        # 4. Delete the site
        db.delete(site)
        db.commit()
        return {"message": "Site deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete site: {str(e)}")

