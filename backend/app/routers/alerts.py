from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.alert import AlertLog
from backend.app.schemas.alert import AlertResponse
from backend.app.services.auth_service import get_current_user
from backend.app.models.user import UserAccount, UserRole

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    unacknowledged_only: bool = False,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Returns alert logs. Scoped to current user's facility (or all if admin).
    """
    query = db.query(AlertLog)
    if current_user.role != UserRole.ADMIN:
        if current_user.facility_id:
            query = query.filter(
                (AlertLog.facility_id == current_user.facility_id) | (AlertLog.facility_id == None)
            )

    if unacknowledged_only:
        query = query.filter(AlertLog.acknowledged == False)

    return query.order_by(AlertLog.sent_at.desc()).limit(50).all()

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    alert = db.query(AlertLog).filter(AlertLog.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return alert
