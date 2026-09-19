from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.notifications import Notification
from app.schemas.notifications import NotificationResponse
from pydantic import BaseModel

router = APIRouter(tags=["Notifications"])

class UnreadCountResponse(BaseModel):
    unread_count: int

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Users can only fetch their own notifications (implicit RBAC / targeting)
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(limit).all()
    
    return notifications

@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}

@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
        
    return notification

@router.patch("/notifications/read-all")
async def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).all()
    
    now = datetime.now(timezone.utc)
    for n in notifications:
        n.is_read = True
        n.read_at = now
        
    db.commit()
    return {"status": "success", "marked_read": len(notifications)}
