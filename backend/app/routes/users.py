from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_admin_user
from app.core.security import get_password_hash
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserCreate, UserUpdate, UserWithOrganizationResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserWithOrganizationResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_in.organization_id:
        if not db.query(Organization).filter(Organization.id == user_in.organization_id).first():
            raise HTTPException(status_code=400, detail="Organization not found")
            
    hashed_password = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    db_user = User(**user_data, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("", response_model=List[UserWithOrganizationResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    return db.query(User).offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=UserWithOrganizationResponse)
def read_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserWithOrganizationResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
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
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
