from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.site import Site
from app.models.panel import Panel
from app.models.rbac import UserSite
from app.core.dependencies import get_current_active_user

class RequirePermission:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
        # Check if user has permission
        if not current_user.role_rel:
            raise HTTPException(status_code=403, detail="User has no role assigned")
            
        has_perm = any(p.name == self.required_permission for p in current_user.role_rel.permissions)
        if not has_perm:
            raise HTTPException(status_code=403, detail=f"Missing permission: {self.required_permission}")
            
        return current_user

def require_permission(required_permission: str):
    return RequirePermission(required_permission)

def check_site_access(user: User, site: Site, db: Session):
    if user.role_rel and user.role_rel.name == "ADMIN":
        return True
        
    mapping = db.query(UserSite).filter(UserSite.user_id == user.id, UserSite.site_id == site.id).first()
    if not mapping:
        raise HTTPException(status_code=403, detail="Not authorized to access this site")
    return True

def check_panel_access(user: User, panel: Panel, db: Session):
    if user.role_rel and user.role_rel.name == "ADMIN":
        return True
    if not panel.site:
        raise HTTPException(status_code=403, detail="Panel is not assigned to a site")
        
    mapping = db.query(UserSite).filter(UserSite.user_id == user.id, UserSite.site_id == panel.site_id).first()
    if not mapping:
        raise HTTPException(status_code=403, detail="Not authorized to access this panel")
    return True
