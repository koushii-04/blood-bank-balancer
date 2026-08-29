from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.facility import Facility
from backend.app.models.user import UserAccount
from backend.app.schemas.triage import TriageQuery, TriageResponse
from backend.app.schemas.transfer import TransferRequestCreate, TransferResponse
from backend.app.services.auth_service import get_current_user
from backend.app.services.triage_service import perform_geospatial_triage
from backend.app.services.transfer_service import create_transfer_request

router = APIRouter(prefix="/triage", tags=["Algorithmic Proximity Triage"])

@router.post("/find-match", response_model=TriageResponse)
def find_nearest_blood_matches(
    query: TriageQuery,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Executes Algorithmic Proximity Triage:
    Uses the Haversine formula to compute great-circle distance from requester to all
    participating facilities holding matching blood surplus, prioritized by closest expiry date.
    """
    target_facility_id = query.requesting_facility_id or current_user.facility_id
    if not target_facility_id:
        raise HTTPException(
            status_code=400,
            detail="Requesting facility ID is required. Please associate your user with a facility or provide facility_id."
        )

    req_facility = db.query(Facility).filter(Facility.facility_id == target_facility_id).first()
    if not req_facility:
        raise HTTPException(status_code=404, detail="Requesting facility not found")

    return perform_geospatial_triage(db, query, req_facility)

@router.post("/request-transfer", response_model=TransferResponse)
async def initiate_triage_transfer(
    transfer_in: TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Triggers an emergency transfer request to the selected supplying facility,
    broadcasting zero-latency WebSocket alerts.
    """
    return await create_transfer_request(db, transfer_in, current_user)
