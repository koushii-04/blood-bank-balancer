from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.facility import Facility
from backend.app.models.inventory import Inventory, InventoryStatus
from backend.app.schemas.facility import FacilityResponse, FacilityCreate
from backend.app.services.auth_service import get_current_user, require_roles
from backend.app.models.user import UserAccount, UserRole

router = APIRouter(prefix="/facilities", tags=["Facilities"])

@router.get("", response_model=List[FacilityResponse])
def list_facilities(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """List all registered medical facilities."""
    return db.query(Facility).filter(Facility.is_active == True).all()

@router.get("/{facility_id}", response_model=FacilityResponse)
def get_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    facility = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility

@router.get("/{facility_id}/stats")
def get_facility_stats(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Returns blood inventory counts and metrics for a specific facility."""
    facility = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    inventories = db.query(Inventory).filter(
        Inventory.facility_id == facility_id,
        Inventory.status == InventoryStatus.AVAILABLE
    ).all()

    total_units = sum(i.units_available for i in inventories)
    by_blood_group = {}
    for i in inventories:
        bg = i.blood_group.value
        by_blood_group[bg] = by_blood_group.get(bg, 0) + i.units_available

    return {
        "facility_id": facility.facility_id,
        "name": facility.name,
        "total_units_available": total_units,
        "stock_by_group": by_blood_group
    }

@router.post("", response_model=FacilityResponse)
def create_facility(
    fac_in: FacilityCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles([UserRole.ADMIN]))
):
    """Admin-only endpoint to register a new hospital or clinic."""
    facility = Facility(**fac_in.model_dump())
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility
