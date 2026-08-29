from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from backend.app.models.inventory import BloodGroup, ComponentType, InventoryStatus
from backend.app.schemas.facility import FacilityResponse

class InventoryBase(BaseModel):
    blood_group: BloodGroup
    component_type: ComponentType = ComponentType.WHOLE_BLOOD
    units_available: int
    batch_code: str
    collection_date: date
    expiry_date: date
    status: InventoryStatus = InventoryStatus.AVAILABLE

class InventoryCreate(InventoryBase):
    facility_id: Optional[int] = None  # Scoped automatically for facility users

class InventoryUpdate(BaseModel):
    units_available: Optional[int] = None
    status: Optional[InventoryStatus] = None
    expiry_date: Optional[date] = None

class InventoryResponse(InventoryBase):
    inventory_id: int
    facility_id: int
    updated_at: datetime
    facility: Optional[FacilityResponse] = None
    hours_until_expiry: Optional[float] = None
    is_expiring_soon: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class InventorySummary(BaseModel):
    blood_group: BloodGroup
    total_units: int
    expiring_soon_units: int
