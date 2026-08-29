from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from backend.app.database import Base

class BloodGroup(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"

class ComponentType(str, enum.Enum):
    WHOLE_BLOOD = "WHOLE_BLOOD"
    RED_CELLS = "RED_CELLS"
    PLATELETS = "PLATELETS"
    PLASMA = "PLASMA"

class InventoryStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    IN_TRANSIT = "IN_TRANSIT"
    EXPIRED = "EXPIRED"

class Inventory(Base):
    __tablename__ = "inventories"

    inventory_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False, index=True)
    blood_group = Column(Enum(BloodGroup), nullable=False, index=True)
    component_type = Column(Enum(ComponentType), default=ComponentType.WHOLE_BLOOD, nullable=False)
    units_available = Column(Integer, default=0, nullable=False)
    batch_code = Column(String(100), nullable=False, unique=True, index=True)
    collection_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(InventoryStatus), default=InventoryStatus.AVAILABLE, nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    facility = relationship("Facility", back_populates="inventories")
    transfers = relationship("TransferRequest", back_populates="inventory")
