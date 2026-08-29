from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone, timedelta
from backend.app.database import get_db
from backend.app.models.inventory import Inventory, BloodGroup, ComponentType, InventoryStatus
from backend.app.models.facility import Facility
from backend.app.schemas.inventory import (
    InventoryResponse, InventoryCreate, InventoryUpdate, InventorySummary
)
from backend.app.services.auth_service import get_current_user
from backend.app.models.user import UserAccount, UserRole

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def enrich_inventory_item(item: Inventory) -> InventoryResponse:
    today = date.today()
    days_left = (item.expiry_date - today).days
    hours_left = max(days_left * 24.0, 0.0)
    is_expiring = (0 <= days_left <= 3) and (item.status == InventoryStatus.AVAILABLE)
    
    resp = InventoryResponse.model_validate(item)
    resp.hours_until_expiry = hours_left
    resp.is_expiring_soon = is_expiring
    return resp

@router.get("", response_model=List[InventoryResponse])
def get_inventory_list(
    facility_id: Optional[int] = None,
    blood_group: Optional[BloodGroup] = None,
    status: Optional[InventoryStatus] = None,
    expiring_soon_only: bool = False,
    all_facilities: bool = False,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Returns inventory list.
    If regular staff and not requesting all facilities, scopes to current user's facility.
    """
    query = db.query(Inventory).join(Facility, Inventory.facility_id == Facility.facility_id)

    # Multi-tenant scoping
    if current_user.role != UserRole.ADMIN and not all_facilities:
        if current_user.facility_id:
            query = query.filter(Inventory.facility_id == current_user.facility_id)
    elif facility_id:
        query = query.filter(Inventory.facility_id == facility_id)

    if blood_group:
        query = query.filter(Inventory.blood_group == blood_group)

    if status:
        query = query.filter(Inventory.status == status)

    today = date.today()
    if expiring_soon_only:
        threshold = today + timedelta(days=3)
        query = query.filter(
            Inventory.expiry_date >= today,
            Inventory.expiry_date <= threshold,
            Inventory.status == InventoryStatus.AVAILABLE
        )

    items = query.order_by(Inventory.expiry_date.asc()).all()
    return [enrich_inventory_item(item) for item in items]

@router.get("/summary")
def get_inventory_summary(
    scope_facility_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Returns high-level blood supply summary by blood group, total units, and expiring counts.
    """
    query = db.query(Inventory).filter(Inventory.status == InventoryStatus.AVAILABLE)
    
    if current_user.role != UserRole.ADMIN and not scope_facility_id:
        if current_user.facility_id:
            query = query.filter(Inventory.facility_id == current_user.facility_id)
    elif scope_facility_id:
        query = query.filter(Inventory.facility_id == scope_facility_id)

    items = query.all()
    today = date.today()
    threshold = today + timedelta(days=3)

    summary_by_group = {bg.value: {"blood_group": bg.value, "total_units": 0, "expiring_soon_units": 0} for bg in BloodGroup}
    total_regional_units = 0
    total_expiring_soon = 0

    for item in items:
        bg = item.blood_group.value
        summary_by_group[bg]["total_units"] += item.units_available
        total_regional_units += item.units_available
        if today <= item.expiry_date <= threshold:
            summary_by_group[bg]["expiring_soon_units"] += item.units_available
            total_expiring_soon += item.units_available

    return {
        "total_available_units": total_regional_units,
        "total_expiring_soon_units": total_expiring_soon,
        "groups": list(summary_by_group.values())
    }

@router.post("", response_model=InventoryResponse)
def add_inventory_batch(
    inv_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Adds a new blood batch to inventory."""
    target_facility_id = inv_in.facility_id or current_user.facility_id
    if not target_facility_id:
        raise HTTPException(status_code=400, detail="Facility ID is required")

    # Staff can only add to their own facility
    if current_user.role != UserRole.ADMIN and target_facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Cannot add inventory to other facilities")

    # Check batch code uniqueness
    existing = db.query(Inventory).filter(Inventory.batch_code == inv_in.batch_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Batch code '{inv_in.batch_code}' already exists")

    item = Inventory(
        facility_id=target_facility_id,
        blood_group=inv_in.blood_group,
        component_type=inv_in.component_type,
        units_available=inv_in.units_available,
        batch_code=inv_in.batch_code,
        collection_date=inv_in.collection_date,
        expiry_date=inv_in.expiry_date,
        status=inv_in.status
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return enrich_inventory_item(item)

@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_batch(
    inventory_id: int,
    inv_update: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    item = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if current_user.role != UserRole.ADMIN and item.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Cannot edit inventory from other facilities")

    if inv_update.units_available is not None:
        item.units_available = inv_update.units_available
    if inv_update.status is not None:
        item.status = inv_update.status
    if inv_update.expiry_date is not None:
        item.expiry_date = inv_update.expiry_date

    db.commit()
    db.refresh(item)
    return enrich_inventory_item(item)
