from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date
from backend.app.models.inventory import BloodGroup, ComponentType
from backend.app.models.facility import FacilityType

class TriageQuery(BaseModel):
    blood_group: BloodGroup
    component_type: Optional[ComponentType] = ComponentType.WHOLE_BLOOD
    units_requested: int = 1
    max_radius_km: Optional[float] = 100.0  # Max distance radius
    requesting_facility_id: Optional[int] = None  # Inferred from user if not provided

class FacilityMatch(BaseModel):
    facility_id: int
    name: str
    facility_type: FacilityType
    latitude: float
    longitude: float
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    distance_km: float
    estimated_transit_minutes: int
    
    # Matching inventory info
    inventory_id: int
    batch_code: str
    units_available: int
    expiry_date: date
    days_until_expiry: int
    is_expiring_soon: bool  # Expiring <= 72h
    priority_score: float   # Algorithmic ranking score combining distance & expiry urgency

    model_config = ConfigDict(from_attributes=True)

class TriageResponse(BaseModel):
    query_blood_group: BloodGroup
    units_requested: int
    total_matching_facilities: int
    recommended_matches: List[FacilityMatch]
    notes: str
