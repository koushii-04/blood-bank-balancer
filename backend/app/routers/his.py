from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.models.facility import Facility
from backend.app.models.inventory import Inventory, InventoryStatus
from backend.app.schemas.his import HISWebhookPayload, HISSyncResponse
from backend.app.services.websocket_manager import manager

router = APIRouter(prefix="/his", tags=["External Hospital System Integration"])

@router.post("/sync-inventory", response_model=HISSyncResponse)
async def sync_external_hospital_inventory(
    payload: HISWebhookPayload,
    db: Session = Depends(get_db)
):
    """
    External Hospital System Integration (Feature 5):
    Allows external Hospital Information Systems (HIS) to automatically synchronize
    their local blood inventory batches with the regional balancer platform via secure webhook.
    """
    facility = db.query(Facility).filter(Facility.facility_id == payload.facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Target healthcare facility not registered")

    # In production, payload.api_key would be validated against facility API credentials
    synced_count = 0
    for batch_data in payload.batches:
        existing_item = db.query(Inventory).filter(
            Inventory.batch_code == batch_data.batch_code,
            Inventory.facility_id == payload.facility_id
        ).first()

        if existing_item:
            existing_item.units_available = batch_data.units_available
            existing_item.expiry_date = batch_data.expiry_date
            if batch_data.units_available > 0 and existing_item.status == InventoryStatus.RESERVED:
                existing_item.status = InventoryStatus.AVAILABLE
        else:
            new_item = Inventory(
                facility_id=payload.facility_id,
                blood_group=batch_data.blood_group,
                component_type=batch_data.component_type,
                units_available=batch_data.units_available,
                batch_code=batch_data.batch_code,
                collection_date=batch_data.collection_date,
                expiry_date=batch_data.expiry_date,
                status=InventoryStatus.AVAILABLE
            )
            db.add(new_item)
        synced_count += 1

    db.commit()

    # Emit real-time WebSocket update
    await manager.broadcast_to_channel(
        f"facility_{payload.facility_id}",
        {
            "event": "HIS_INVENTORY_SYNCED",
            "facility_id": payload.facility_id,
            "batches_synced": synced_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Successfully synchronized {synced_count} batch(es) from external HIS."
        }
    )

    return HISSyncResponse(
        status="SUCCESS",
        facility_id=payload.facility_id,
        synced_batches_count=synced_count,
        message=f"HIS batch synchronization completed for {facility.name}."
    )
