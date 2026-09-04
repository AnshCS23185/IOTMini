import os
import sys

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
# Import all models to ensure they are registered with Base
from app.models.user import User
from app.models.site import Site
from app.models.rbac import Role, Permission, RolePermission, UserSite, AuditLog
from app.models.organization import Organization # Assuming this exists based on relationships

def run_migration():
    print("Starting RBAC migration...")
    
    # 1. Create tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Add role_id to users if it doesn't exist
        print("Checking if role_id exists on users...")
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)"))
            db.commit()
            print("Added role_id to users table.")
        except Exception as e:
            db.rollback()
            print("role_id already exists or could not be added.")
        # 2. Seed Roles
        print("Seeding roles...")
        roles_data = [
            {"name": "ADMIN", "description": "Solar Product Seller / PanelIQ Administrator"},
            {"name": "USER", "description": "Solar Product Buyer / Customer"}
        ]
        roles = {}
        for rd in roles_data:
            role = db.query(Role).filter(Role.name == rd["name"]).first()
            if not role:
                role = Role(name=rd["name"], description=rd["description"])
                db.add(role)
                db.flush()
            roles[role.name] = role

        # 3. Seed Permissions
        print("Seeding permissions...")
        admin_perms = [
            "DASHBOARD_VIEW", "USER_VIEW", "USER_CREATE", "USER_UPDATE", "USER_DELETE",
            "SITE_VIEW", "SITE_CREATE", "SITE_UPDATE", "SITE_DELETE",
            "PANEL_VIEW", "PANEL_CREATE", "PANEL_UPDATE", "PANEL_DELETE", "PANEL_CONTROL",
            "DIAGNOSTICS_VIEW", "DIAGNOSTICS_RUN",
            "REPORT_VIEW", "REPORT_EXPORT",
            "SETTINGS_VIEW", "SETTINGS_UPDATE"
        ]
        
        # User permissions as approved by user
        user_perms = [
            "DASHBOARD_VIEW", "SITE_VIEW", "PANEL_VIEW", "REPORT_VIEW",
            "PANEL_CONTROL", "DIAGNOSTICS_VIEW", "DIAGNOSTICS_RUN"
        ]

        all_perms = set(admin_perms + user_perms)
        permissions = {}
        for p_name in all_perms:
            perm = db.query(Permission).filter(Permission.name == p_name).first()
            if not perm:
                perm = Permission(name=p_name, description=f"Allows {p_name}")
                db.add(perm)
                db.flush()
            permissions[perm.name] = perm
            
        # 4. Map Permissions to Roles
        print("Mapping permissions to roles...")
        for role_name, perm_list in [("ADMIN", admin_perms), ("USER", user_perms)]:
            role = roles[role_name]
            role.permissions.clear() # clear existing
            for p_name in perm_list:
                role.permissions.append(permissions[p_name])
                
        # 5. Migrate Existing Users
        print("Migrating existing users to new roles and creating UserSite mappings...")
        users = db.query(User).all()
        for user in users:
            # Set role_id based on string role
            role_str = user.role if user.role in ["ADMIN", "USER"] else "USER"
            user.role_id = roles[role_str].id
            
            # Map user to their organization's sites if they are a USER
            if role_str == "USER" and user.organization_id:
                sites = db.query(Site).filter(Site.organization_id == user.organization_id).all()
                for site in sites:
                    # Check if mapping exists
                    mapping = db.query(UserSite).filter(UserSite.user_id == user.id, UserSite.site_id == site.id).first()
                    if not mapping:
                        new_mapping = UserSite(user_id=user.id, site_id=site.id)
                        db.add(new_mapping)
        
        db.commit()
        print("RBAC Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
