from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from backend.app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    HOSPITAL_STAFF = "HOSPITAL_STAFF"
    CLINIC_STAFF = "CLINIC_STAFF"

class UserAccount(Base):
    __tablename__ = "user_accounts"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLINIC_STAFF, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    facility = relationship("Facility", back_populates="users")
    transfers_initiated = relationship("TransferRequest", back_populates="requested_by_user")
