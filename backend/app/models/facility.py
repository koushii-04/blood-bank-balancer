from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from backend.app.database import Base

class FacilityType(str, enum.Enum):
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    BLOOD_BANK = "BLOOD_BANK"

class Facility(Base):
    __tablename__ = "facilities"

    facility_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    facility_type = Column(Enum(FacilityType), default=FacilityType.HOSPITAL, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    users = relationship("UserAccount", back_populates="facility", cascade="all, delete-orphan")
    inventories = relationship("Inventory", back_populates="facility", cascade="all, delete-orphan")
    outgoing_requests = relationship("TransferRequest", foreign_keys="TransferRequest.requesting_facility_id", back_populates="requesting_facility")
    incoming_requests = relationship("TransferRequest", foreign_keys="TransferRequest.supplying_facility_id", back_populates="supplying_facility")
