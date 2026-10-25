from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.transfer import TransferRequest, TransferStatus, TransferPriority
from backend.app.models.inventory import Inventory, InventoryStatus
from backend.app.models.facility import Facility
from backend.app.models.user import UserAccount
from backend.app.models.alert import AlertLog, AlertType, AlertChannel
from backend.app.schemas.transfer import TransferRequestCreate
from backend.app.services.websocket_manager import manager
from backend.app.services.triage_service import calculate_haversine_distance

async def create_transfer_request(
    db: Session,
    request_in: TransferRequestCreate,
    current_user: UserAccount
) -> TransferRequest:
    """
    Creates a new blood transfer request from current user's facility to a supplying facility.
    """
    if not current_user.facility_id:
        raise HTTPException(status_code=400, detail="User must be associated with a facility to request transfers")
    
    if current_user.facility_id == request_in.supplying_facility_id:
        raise HTTPException(status_code=400, detail="Requesting facility and supplying facility cannot be the same")

    req_fac = db.query(Facility).filter(Facility.facility_id == current_user.facility_id).first()
    sup_fac = db.query(Facility).filter(Facility.facility_id == request_in.supplying_facility_id).first()

    if not req_fac or not sup_fac:
        raise HTTPException(status_code=404, detail="Facility not found")

    dist_km = calculate_haversine_distance(
        req_fac.latitude, req_fac.longitude,
        sup_fac.latitude, sup_fac.longitude
    )

    # If inventory batch specified, verify it exists and is available
    if request_in.inventory_id:
        inv = db.query(Inventory).filter(
            Inventory.inventory_id == request_in.inventory_id,
            Inventory.facility_id == request_in.supplying_facility_id
        ).first()
        if not inv or inv.status != InventoryStatus.AVAILABLE or inv.units_available < request_in.units_requested:
            raise HTTPException(status_code=400, detail="Requested inventory batch is not currently available in sufficient quantity")

    transfer = TransferRequest(
        requesting_facility_id=current_user.facility_id,
        supplying_facility_id=request_in.supplying_facility_id,
        inventory_id=request_in.inventory_id,
        requested_by_user_id=current_user.user_id,
        blood_group=request_in.blood_group,
        units_requested=request_in.units_requested,
        distance_km=dist_km,
        priority=request_in.priority,
        status=TransferStatus.PENDING,
        requested_at=datetime.now(timezone.utc)
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    # Generate Alert Log
    alert_msg = f"URGENT: {req_fac.name} has requested {transfer.units_requested} unit(s) of {transfer.blood_group.value} blood."
    alert = AlertLog(
        request_id=transfer.request_id,
        facility_id=transfer.supplying_facility_id,
        alert_type=AlertType.TRANSFER_REQUEST,
        channel=AlertChannel.WEBSOCKET,
        message=alert_msg
    )
    db.add(alert)
    db.commit()

    # Dispatch Real-Time Event-Driven WebSocket Alert
    await manager.broadcast_to_channel(
        f"facility_{transfer.supplying_facility_id}",
        {
            "event": "NEW_TRANSFER_REQUEST",
            "request_id": transfer.request_id,
            "requesting_facility": req_fac.name,
            "blood_group": transfer.blood_group.value,
            "units_requested": transfer.units_requested,
            "priority": transfer.priority.value,
            "distance_km": transfer.distance_km,
            "message": alert_msg,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

    # Also notify global channel for central admin dashboard
    await manager.broadcast_to_channel(
        "global",
        {
            "event": "GLOBAL_TRANSFER_UPDATE",
            "request_id": transfer.request_id,
            "type": "NEW_REQUEST",
            "message": f"New transfer request #{transfer.request_id} created by {req_fac.name} -> {sup_fac.name}"
        }
    )

    return transfer

async def approve_transfer_atomic(
    db: Session,
    request_id: int,
    current_user: UserAccount
) -> TransferRequest:
    """
    Executes Atomic State Transaction with row-level locking (SELECT ... FOR UPDATE).
    Locks the inventory row to prevent concurrent claims, verifies available units, 
    reserves/deducts the stock, and shifts status to APPROVED.
    """
    transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")

    # Authorization check: only supplying facility staff or superadmin can approve
    if current_user.role != "ADMIN" and current_user.facility_id != transfer.supplying_facility_id:
        raise HTTPException(status_code=403, detail="Only staff from the supplying facility can approve this transfer")

    if transfer.status != TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve transfer with status '{transfer.status.value}'")

    # CONCURRENCY CONTROL: Atomic Row-Level Locking
    # In MySQL/Postgres: with_for_update() emits SELECT ... FOR UPDATE
    # In SQLite: transaction lock ensures isolation
    try:
        inv_query = db.query(Inventory).filter(
            Inventory.facility_id == transfer.supplying_facility_id,
            Inventory.blood_group == transfer.blood_group,
            Inventory.status == InventoryStatus.AVAILABLE,
            Inventory.units_available >= transfer.units_requested
        )
        
        # If specific batch was linked, lock that specific batch
        if transfer.inventory_id:
            inv_query = inv_query.filter(Inventory.inventory_id == transfer.inventory_id)

        # Apply row-level lock
        locked_inventory = inv_query.with_for_update().first()

        if not locked_inventory:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Race condition / Insufficient stock: The requested blood unit has already been claimed or is unavailable."
            )

        # Deduct or reserve the units atomically
        locked_inventory.units_available -= transfer.units_requested
        if locked_inventory.units_available == 0:
            locked_inventory.status = InventoryStatus.RESERVED
        
        # Bind the locked batch to the transfer
        transfer.inventory_id = locked_inventory.inventory_id
        transfer.status = TransferStatus.APPROVED
        
        db.commit()
        db.refresh(transfer)
        db.refresh(locked_inventory)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Atomic lock transaction failed: {str(e)}")

    # Real-Time WebSocket Notification to Requesting Facility
    req_fac = db.query(Facility).filter(Facility.facility_id == transfer.requesting_facility_id).first()
    sup_fac = db.query(Facility).filter(Facility.facility_id == transfer.supplying_facility_id).first()

    msg = f"APPROVED: {sup_fac.name} approved {transfer.units_requested} unit(s) of {transfer.blood_group.value}."
    alert = AlertLog(
        request_id=transfer.request_id,
        facility_id=transfer.requesting_facility_id,
        alert_type=AlertType.TRANSFER_STATUS,
        channel=AlertChannel.WEBSOCKET,
        message=msg
    )
    db.add(alert)
    db.commit()

    await manager.broadcast_to_channel(
        f"facility_{transfer.requesting_facility_id}",
        {
            "event": "TRANSFER_APPROVED",
            "request_id": transfer.request_id,
            "supplying_facility": sup_fac.name,
            "status": "APPROVED",
            "message": msg
        }
    )

    return transfer

# async def transition_transfer_status(
#     db: Session,
#     request_id: int,
#     new_status: TransferStatus,
#     current_user: UserAccount
# ) -> TransferRequest:
#     """
#     Transitions transfer status (e.g. APPROVED -> IN_TRANSIT -> COMPLETED or REJECTED / CANCELLED).
#     Handles inventory restoration if cancelled/rejected.
#     """
#     transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
#     if not transfer:
#         raise HTTPException(status_code=404, detail="Transfer request not found")

#     prev_status = transfer.status
#     transfer.status = new_status
#     if new_status in [TransferStatus.COMPLETED, TransferStatus.CANCELLED, TransferStatus.REJECTED]:
#         transfer.resolved_at = datetime.now(timezone.utc)

#     # If rejected/cancelled after approval, restore inventory units
#     if new_status in [TransferStatus.CANCELLED, TransferStatus.REJECTED] and prev_status in [TransferStatus.APPROVED, TransferStatus.IN_TRANSIT]:
#         if transfer.inventory_id:
#             inv = db.query(Inventory).filter(Inventory.inventory_id == transfer.inventory_id).with_for_update().first()
#             if inv:
#                 inv.units_available += transfer.units_requested
#                 if inv.status == InventoryStatus.RESERVED and inv.units_available > 0:
#                     inv.status = InventoryStatus.AVAILABLE

#     db.commit()
#     db.refresh(transfer)

#     # Broadcast notification
#     await manager.broadcast_to_channel(
#         f"facility_{transfer.requesting_facility_id}",
#         {
#             "event": "TRANSFER_STATUS_CHANGED",
#             "request_id": transfer.request_id,
#             "status": new_status.value,
#             "message": f"Transfer #{transfer.request_id} is now {new_status.value}"
#         }
#     )
#     await manager.broadcast_to_channel(
#         f"facility_{transfer.supplying_facility_id}",
#         {
#             "event": "TRANSFER_STATUS_CHANGED",
#             "request_id": transfer.request_id,
#             "status": new_status.value,
#             "message": f"Transfer #{transfer.request_id} is now {new_status.value}"
#         }
#     )

#     return transfer

async def transition_transfer_status(
    db: Session,
    request_id: int,
    new_status: TransferStatus,
    current_user: UserAccount
) -> TransferRequest:
    """
    Transitions transfer status (e.g. APPROVED -> IN_TRANSIT -> COMPLETED or REJECTED / CANCELLED).
    Handles inventory restoration if cancelled/rejected, and creates new inventory if completed.
    """
    transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")

    prev_status = transfer.status
    transfer.status = new_status
    if new_status in [TransferStatus.COMPLETED, TransferStatus.CANCELLED, TransferStatus.REJECTED]:
        transfer.resolved_at = datetime.now(timezone.utc)

    # 1. If rejected/cancelled after approval, restore inventory units to the sender
    if new_status in [TransferStatus.CANCELLED, TransferStatus.REJECTED] and prev_status in [TransferStatus.APPROVED, TransferStatus.IN_TRANSIT]:
        if transfer.inventory_id:
            inv = db.query(Inventory).filter(Inventory.inventory_id == transfer.inventory_id).with_for_update().first()
            if inv:
                inv.units_available += transfer.units_requested
                if inv.status == InventoryStatus.RESERVED and inv.units_available > 0:
                    inv.status = InventoryStatus.AVAILABLE

    # 2. THE FIX: If completed, create the new blood units for the receiving hospital
    if new_status == TransferStatus.COMPLETED and transfer.inventory_id:
        original_batch = db.query(Inventory).filter(Inventory.inventory_id == transfer.inventory_id).first()
        if original_batch:
            received_batch = Inventory(
                facility_id=transfer.requesting_facility_id,
                blood_group=original_batch.blood_group,
                component_type=original_batch.component_type,
                units_available=transfer.units_requested,
                batch_code=f"{original_batch.batch_code}-RCVD",
                collection_date=original_batch.collection_date,
                expiry_date=original_batch.expiry_date,
                status=InventoryStatus.AVAILABLE
            )
            db.add(received_batch)

    db.commit()
    db.refresh(transfer)

    # Broadcast notification
    await manager.broadcast_to_channel(
        f"facility_{transfer.requesting_facility_id}",
        {
            "event": "TRANSFER_STATUS_CHANGED",
            "request_id": transfer.request_id,
            "status": new_status.value,
            "message": f"Transfer #{transfer.request_id} is now {new_status.value}"
        }
    )
    await manager.broadcast_to_channel(
        f"facility_{transfer.supplying_facility_id}",
        {
            "event": "TRANSFER_STATUS_CHANGED",
            "request_id": transfer.request_id,
            "status": new_status.value,
            "message": f"Transfer #{transfer.request_id} is now {new_status.value}"
        }
    )

    return transfer
