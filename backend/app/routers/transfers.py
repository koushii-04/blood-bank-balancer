from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.transfer import TransferRequest, TransferStatus
from backend.app.schemas.transfer import TransferRequestCreate, TransferResponse, TransferAction
from backend.app.services.auth_service import get_current_user
from backend.app.models.user import UserAccount, UserRole
from backend.app.services.transfer_service import (
    create_transfer_request, approve_transfer_atomic, transition_transfer_status
)

router = APIRouter(prefix="/transfers", tags=["Transfer Tracking & Concurrency"])

@router.get("", response_model=List[TransferResponse])
def get_transfers(
    transfer_type: Optional[str] = Query(None, description="'incoming', 'outgoing', or 'all'"),
    status: Optional[TransferStatus] = None,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Returns transfer requests. Regular facility staff see incoming requests from other clinics
    and outgoing requests requested by their facility.
    """
    query = db.query(TransferRequest)

    if current_user.role != UserRole.ADMIN:
        if transfer_type == "incoming":
            query = query.filter(TransferRequest.supplying_facility_id == current_user.facility_id)
        elif transfer_type == "outgoing":
            query = query.filter(TransferRequest.requesting_facility_id == current_user.facility_id)
        else:
            # Default to both incoming and outgoing for this facility
            query = query.filter(
                (TransferRequest.requesting_facility_id == current_user.facility_id) |
                (TransferRequest.supplying_facility_id == current_user.facility_id)
            )
    else:
        if transfer_type == "incoming" and current_user.facility_id:
            query = query.filter(TransferRequest.supplying_facility_id == current_user.facility_id)
        elif transfer_type == "outgoing" and current_user.facility_id:
            query = query.filter(TransferRequest.requesting_facility_id == current_user.facility_id)

    if status:
        query = query.filter(TransferRequest.status == status)

    return query.order_by(TransferRequest.requested_at.desc()).all()

@router.get("/{request_id}", response_model=TransferResponse)
def get_transfer_by_id(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    return transfer

@router.post("", response_model=TransferResponse)
async def create_transfer(
    transfer_in: TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Creates a new transfer request."""
    return await create_transfer_request(db, transfer_in, current_user)

@router.post("/{request_id}/approve", response_model=TransferResponse)
async def approve_transfer(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """
    Approves transfer request using Atomic State Transaction & Row-level locking.
    """
    return await approve_transfer_atomic(db, request_id, current_user)

@router.post("/{request_id}/transit", response_model=TransferResponse)
async def mark_in_transit(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Shifts approved transfer status to IN_TRANSIT."""
    transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
    if not transfer or transfer.status != TransferStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved transfers can transition to IN_TRANSIT")
    return await transition_transfer_status(db, request_id, TransferStatus.IN_TRANSIT, current_user)

@router.post("/{request_id}/complete", response_model=TransferResponse)
async def mark_completed(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Marks blood units as received and delivered (COMPLETED)."""
    transfer = db.query(TransferRequest).filter(TransferRequest.request_id == request_id).first()
    if not transfer or transfer.status != TransferStatus.IN_TRANSIT:
        raise HTTPException(status_code=400, detail="Only in-transit transfers can transition to COMPLETED")
    return await transition_transfer_status(db, request_id, TransferStatus.COMPLETED, current_user)

@router.post("/{request_id}/reject", response_model=TransferResponse)
async def reject_transfer(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Rejects pending transfer request."""
    return await transition_transfer_status(db, request_id, TransferStatus.REJECTED, current_user)

@router.post("/{request_id}/cancel", response_model=TransferResponse)
async def cancel_transfer(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Cancels transfer request."""
    return await transition_transfer_status(db, request_id, TransferStatus.CANCELLED, current_user)
