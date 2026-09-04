from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import random
import string
from app.database import get_db
from app.core.permissions import require_permission
from app.core.security import get_password_hash
from app.models.user import User
from app.models.organization import Organization
from app.models.rbac import Role, UserSite
from app.schemas.user import UserCreate, UserUpdate, UserWithOrganizationResponse
from app.services.email_service import send_invitation_email

router = APIRouter(prefix="/users", tags=["Users"])

def _attach_site_ids(user: User, db: Session):
    site_ids = [us.site_id for us in db.query(UserSite.site_id).filter(UserSite.user_id == user.id).all()]
    user.site_ids = site_ids
    return user

@router.post("", response_model=UserWithOrganizationResponse)
def create_user(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_permission("USER_CREATE"))
):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        if user_in.organization_id:
            existing_user.organization_id = user_in.organization_id
        if user_in.name:
            existing_user.name = user_in.name
        
        site_id = user_in.site_id
        if site_id:
            exists = db.query(UserSite).filter(UserSite.user_id == existing_user.id, UserSite.site_id == site_id).first()
            if not exists:
                db.add(UserSite(user_id=existing_user.id, site_id=site_id))
        
        pin = ''.join(random.choices(string.digits, k=4))
        existing_user.password_hash = get_password_hash(pin)
        existing_user.must_change_password = True
        existing_user.status = "ACTIVE"
        db.commit()
        db.refresh(existing_user)
        background_tasks.add_task(send_invitation_email, existing_user.email, existing_user.name, pin)
        return _attach_site_ids(existing_user, db)

    if user_in.organization_id:
        if not db.query(Organization).filter(Organization.id == user_in.organization_id).first():
            raise HTTPException(status_code=400, detail="Organization not found")

            
    # Generate 4-digit PIN
    pin = ''.join(random.choices(string.digits, k=4))
    hashed_password = get_password_hash(pin)
    
    user_data = user_in.model_dump(exclude={"password"})
    site_id = user_data.pop("site_id", None)

    # Automatically set role_id if not present
    role_name = user_data.get("role") or "USER"
    role_row = db.query(Role).filter(Role.name == role_name).first()
    if role_row:
        user_data["role_id"] = role_row.id

    db_user = User(**user_data, password_hash=hashed_password, must_change_password=True)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Associate with site if provided
    if site_id:
        db.add(UserSite(user_id=db_user.id, site_id=site_id))
        db.commit()
    
    # Send email in background
    background_tasks.add_task(send_invitation_email, db_user.email, db_user.name, pin)
    
    return _attach_site_ids(db_user, db)

@router.get("", response_model=List[UserWithOrganizationResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_VIEW"))):
    users = db.query(User).offset(skip).limit(limit).all()
    for u in users:
        _attach_site_ids(u, db)
    return users

@router.get("/{user_id}", response_model=UserWithOrganizationResponse)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_VIEW"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _attach_site_ids(user, db)

@router.put("/{user_id}", response_model=UserWithOrganizationResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_UPDATE"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    site_id = update_data.pop("site_id", None)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)

    if site_id:
        exists = db.query(UserSite).filter(UserSite.user_id == user.id, UserSite.site_id == site_id).first()
        if not exists:
            db.add(UserSite(user_id=user.id, site_id=site_id))
            db.commit()

    return _attach_site_ids(user, db)

@router.post("/{user_id}/resend-invitation")
def resend_invitation(
    user_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_permission("USER_UPDATE"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    pin = ''.join(random.choices(string.digits, k=4))
    user.password_hash = get_password_hash(pin)
    user.must_change_password = True
    db.commit()
    db.refresh(user)

    background_tasks.add_task(send_invitation_email, user.email, user.name, pin)
    return {"message": "Invitation email resent successfully"}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_DELETE"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(UserSite).filter(UserSite.user_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

