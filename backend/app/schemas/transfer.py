from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from backend.app.models.inventory import BloodGroup
from backend.app.models.transfer import TransferPriority, TransferStatus
from backend.app.schemas.facility import FacilityResponse

class TransferRequestCreate(BaseModel):
    supplying_facility_id: int
    blood_group: BloodGroup
    units_requested: int = 1
    priority: TransferPriority = TransferPriority.URGENT
    inventory_id: Optional[int] = None

class TransferAction(BaseModel):
    action: str  # "APPROVE", "REJECT", "TRANSIT", "COMPLETE", "CANCEL"
    notes: Optional[str] = None

class TransferResponse(BaseModel):
    request_id: int
    requesting_facility_id: int
    supplying_facility_id: int
    inventory_id: Optional[int] = None
    requested_by_user_id: Optional[int] = None
    blood_group: BloodGroup
    units_requested: int
    distance_km: float
    priority: TransferPriority
    status: TransferStatus
    requested_at: datetime
    resolved_at: Optional[datetime] = None
    
    requesting_facility: Optional[FacilityResponse] = None
    supplying_facility: Optional[FacilityResponse] = None

    model_config = ConfigDict(from_attributes=True)
