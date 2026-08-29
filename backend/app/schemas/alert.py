from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from backend.app.models.alert import AlertType, AlertChannel

class AlertBase(BaseModel):
    alert_type: AlertType
    channel: AlertChannel = AlertChannel.WEBSOCKET
    message: str
    request_id: Optional[int] = None
    facility_id: Optional[int] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    alert_id: int
    sent_at: datetime
    acknowledged: bool

    model_config = ConfigDict(from_attributes=True)
