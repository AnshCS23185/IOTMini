from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_active_user, get_current_admin_user
from app.core.permissions import check_site_access
from app.models.user import User
from app.models.site import Site
from app.models.organization import Organization
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse
from app.schemas.organization import OrganizationCreate, OrganizationResponse

router = APIRouter(prefix="/sites", tags=["Sites"])
org_router = APIRouter(prefix="/organizations", tags=["Organizations"])

# Organizations (Admin only for MVP)
@org_router.post("", response_model=OrganizationResponse)
def create_organization(org_in: OrganizationCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    db_org = Organization(**org_in.model_dump())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@org_router.get("", response_model=List[OrganizationResponse])
def get_organizations(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    return db.query(Organization).all()

# Sites
@router.post("", response_model=SiteResponse)
def create_site(site_in: SiteCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    if not db.query(Organization).filter(Organization.id == site_in.organization_id).first():
        raise HTTPException(status_code=400, detail="Organization not found")
    db_site = Site(**site_in.model_dump())
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site

@router.get("", response_model=List[SiteResponse])
def get_sites(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role == "ADMIN":
        return db.query(Site).all()
    return db.query(Site).filter(Site.organization_id == current_user.organization_id).all()

@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    check_site_access(current_user, site)
    return site

@router.put("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, site_in: SiteUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    for key, value in site_in.model_dump(exclude_unset=True).items():
        setattr(site, key, value)
    db.commit()
    db.refresh(site)
    return site

@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()
    return {"message": "Site deleted successfully"}
