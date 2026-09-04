from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.auth import Token, PasswordChangeRequest, LoginRequest
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: LoginRequest, db: Session = Depends(get_db)):
    print(f"DEBUG LOGIN: email={form_data.email}, password={form_data.password}")
    user = db.query(User).filter(User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "requires_password_change": getattr(user, "must_change_password", False)
    }

@router.post("/change-password")
def change_password(request: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not current_user.must_change_password:
        raise HTTPException(status_code=400, detail="Password change not required.")
        
    current_user.password_hash = get_password_hash(request.new_password)
    current_user.must_change_password = False
    db.commit()
    
    return {"message": "Password changed successfully."}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out. Please remove the token from your client."}
