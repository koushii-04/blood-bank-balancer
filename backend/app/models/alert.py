from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from backend.app.database import Base

class AlertType(str, enum.Enum):
    SHORTAGE = "SHORTAGE"
    EXPIRATION_WARNING = "EXPIRATION_WARNING"
    TRANSFER_REQUEST = "TRANSFER_REQUEST"
    TRANSFER_STATUS = "TRANSFER_STATUS"

class AlertChannel(str, enum.Enum):
    WEBSOCKET = "WEBSOCKET"
    EMAIL = "EMAIL"
    SMS = "SMS"
    SYSTEM = "SYSTEM"

class AlertLog(Base):
    __tablename__ = "alert_logs"

    alert_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("transfer_requests.request_id", ondelete="CASCADE"), nullable=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=True, index=True)
    
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    channel = Column(Enum(AlertChannel), default=AlertChannel.WEBSOCKET, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)

    # Relationships
    transfer_request = relationship("TransferRequest", back_populates="alerts")
    facility = relationship("Facility")
