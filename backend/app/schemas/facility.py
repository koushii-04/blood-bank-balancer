from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
from backend.app.models.facility import FacilityType

class FacilityBase(BaseModel):
    name: str
    facility_type: FacilityType = FacilityType.HOSPITAL
    latitude: float
    longitude: float
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool = True

class FacilityCreate(FacilityBase):
    pass

class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    facility_type: Optional[FacilityType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None

class FacilityResponse(FacilityBase):
    facility_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
