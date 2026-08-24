from fastapi import HTTPException
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel

def check_site_access(user: User, site: Site):
    if user.role == "ADMIN":
        return True
    if user.organization_id != site.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this site")
    return True

def check_panel_access(user: User, panel: Panel):
    if user.role == "ADMIN":
        return True
    if not panel.site or user.organization_id != panel.site.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this panel")
    return True
