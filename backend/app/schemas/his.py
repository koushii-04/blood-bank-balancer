from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from backend.app.models.inventory import BloodGroup, ComponentType

class HISBatchSyncItem(BaseModel):
    batch_code: str
    blood_group: BloodGroup
    component_type: ComponentType = ComponentType.WHOLE_BLOOD
    units_available: int
    collection_date: date
    expiry_date: date

class HISWebhookPayload(BaseModel):
    hospital_system_id: str
    facility_id: int
    api_key: str
    sync_timestamp: str
    batches: List[HISBatchSyncItem]

class HISSyncResponse(BaseModel):
    status: str
    facility_id: int
    synced_batches_count: int
    message: str
