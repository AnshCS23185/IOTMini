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
from app.schemas.user import UserCreate, UserUpdate, UserWithOrganizationResponse
from app.services.email_service import send_invitation_email

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserWithOrganizationResponse)
def create_user(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_permission("USER_CREATE"))
):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_in.organization_id:
        if not db.query(Organization).filter(Organization.id == user_in.organization_id).first():
            raise HTTPException(status_code=400, detail="Organization not found")
            
    # Generate 4-digit PIN
    pin = ''.join(random.choices(string.digits, k=4))
    hashed_password = get_password_hash(pin)
    
    user_data = user_in.model_dump(exclude={"password"})
    db_user = User(**user_data, password_hash=hashed_password, must_change_password=True)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send email in background
    background_tasks.add_task(send_invitation_email, db_user.email, db_user.name, pin)
    
    return db_user

@router.get("", response_model=List[UserWithOrganizationResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_VIEW"))):
    return db.query(User).offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=UserWithOrganizationResponse)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_VIEW"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserWithOrganizationResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_UPDATE"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("USER_DELETE"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
