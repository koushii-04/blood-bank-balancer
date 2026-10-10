from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.models.facility import Facility
from backend.app.models.inventory import Inventory, InventoryStatus
from backend.app.schemas.facility import FacilityResponse, FacilityCreate, FacilityUpdate
from backend.app.services.auth_service import get_current_user, require_roles
from backend.app.models.user import UserAccount, UserRole

router = APIRouter(prefix="/facilities", tags=["Facilities"])

@router.get("", response_model=List[FacilityResponse])
def list_facilities(
    db: Session = Depends(get_db)
):
    """List all registered medical facilities (publicly accessible for registration & network lookup)."""
    return db.query(Facility).filter(Facility.is_active == True).all()

@router.get("/{facility_id}", response_model=FacilityResponse)
def get_facility(
    facility_id: int,
    db: Session = Depends(get_db)
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

@router.patch("/{facility_id}", response_model=FacilityResponse)
def update_facility(
    facility_id: int,
    fac_update: FacilityUpdate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Updates the details (name, address, phone, email, GPS coordinates) of a facility."""
    facility = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # Authorization check: ADMIN or staff belonging to this facility
    if current_user.role != UserRole.ADMIN and current_user.facility_id != facility_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify another facility's details"
        )

    if fac_update.name is not None:
        facility.name = fac_update.name.strip()
    if fac_update.facility_type is not None:
        facility.facility_type = fac_update.facility_type
    if fac_update.latitude is not None:
        if not -90 <= fac_update.latitude <= 90:
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
        facility.latitude = fac_update.latitude
    if fac_update.longitude is not None:
        if not -180 <= fac_update.longitude <= 180:
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
        facility.longitude = fac_update.longitude
    if fac_update.address is not None:
        facility.address = fac_update.address.strip()
    if fac_update.contact_phone is not None:
        facility.contact_phone = fac_update.contact_phone.strip()
    if fac_update.contact_email is not None:
        facility.contact_email = fac_update.contact_email.strip()
    if fac_update.is_active is not None:
        facility.is_active = fac_update.is_active

    facility.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(facility)
    return facility
