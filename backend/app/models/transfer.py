from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from backend.app.database import Base
from backend.app.models.inventory import BloodGroup

class TransferPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"

class TransferStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    request_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requesting_facility_id = Column(Integer, ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False, index=True)
    supplying_facility_id = Column(Integer, ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_id = Column(Integer, ForeignKey("inventories.inventory_id", ondelete="SET NULL"), nullable=True, index=True)
    requested_by_user_id = Column(Integer, ForeignKey("user_accounts.user_id", ondelete="SET NULL"), nullable=True)
    
    blood_group = Column(Enum(BloodGroup), nullable=False)
    units_requested = Column(Integer, nullable=False, default=1)
    distance_km = Column(Float, nullable=False, default=0.0)
    priority = Column(Enum(TransferPriority), default=TransferPriority.URGENT, nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.PENDING, nullable=False, index=True)
    
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    requesting_facility = relationship("Facility", foreign_keys=[requesting_facility_id], back_populates="outgoing_requests")
    supplying_facility = relationship("Facility", foreign_keys=[supplying_facility_id], back_populates="incoming_requests")
    inventory = relationship("Inventory", back_populates="transfers")
    requested_by_user = relationship("UserAccount", back_populates="transfers_initiated")
    alerts = relationship("AlertLog", back_populates="transfer_request", cascade="all, delete-orphan")
