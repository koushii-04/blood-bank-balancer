import pytest
import asyncio
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from backend.app.database import Base
from backend.app.models.facility import Facility, FacilityType
from backend.app.models.user import UserAccount, UserRole
from backend.app.models.inventory import Inventory, BloodGroup, ComponentType, InventoryStatus
from backend.app.models.transfer import TransferRequest, TransferPriority, TransferStatus
from backend.app.services.transfer_service import approve_transfer_atomic

# In-memory test DB
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    
    # Create 2 facilities
    f1 = Facility(name="Hospital Alpha", facility_type=FacilityType.HOSPITAL, latitude=12.97, longitude=77.59)
    f2 = Facility(name="Clinic Beta", facility_type=FacilityType.CLINIC, latitude=12.93, longitude=77.62)
    session.add_all([f1, f2])
    session.commit()
    session.refresh(f1)
    session.refresh(f2)

    # Create users
    u_admin = UserAccount(user_id=1, email="admin@test.org", full_name="Admin", password_hash="x", role=UserRole.ADMIN)
    u_f2 = UserAccount(user_id=2, facility_id=f2.facility_id, email="staff@beta.org", full_name="Staff", password_hash="x", role=UserRole.CLINIC_STAFF)
    session.add_all([u_admin, u_f2])
    session.commit()

    # Create an inventory item with ONLY 1 unit
    inv = Inventory(
        facility_id=f2.facility_id,
        blood_group=BloodGroup.O_NEG,
        component_type=ComponentType.WHOLE_BLOOD,
        units_available=1,
        batch_code="CONCURRENCY-TEST-1",
        collection_date=date.today() - timedelta(days=5),
        expiry_date=date.today() + timedelta(days=15),
        status=InventoryStatus.AVAILABLE
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)

    yield session, f1, f2, u_f2, inv

    session.close()
    Base.metadata.drop_all(bind=test_engine)

@pytest.mark.asyncio
async def test_atomic_approval_reserves_stock(db_session):
    session, f1, f2, u_f2, inv = db_session

    req = TransferRequest(
        requesting_facility_id=f1.facility_id,
        supplying_facility_id=f2.facility_id,
        blood_group=BloodGroup.O_NEG,
        units_requested=1,
        distance_km=5.0,
        status=TransferStatus.PENDING
    )
    session.add(req)
    session.commit()
    session.refresh(req)

    approved = await approve_transfer_atomic(session, req.request_id, u_f2)
    assert approved.status == TransferStatus.APPROVED
    
    # Inventory units should be 0 and marked RESERVED
    session.refresh(inv)
    assert inv.units_available == 0
    assert inv.status == InventoryStatus.RESERVED

@pytest.mark.asyncio
async def test_atomic_conflict_when_stock_exhausted(db_session):
    session, f1, f2, u_f2, inv = db_session

    # Create two competing transfer requests for the single available unit
    req1 = TransferRequest(
        requesting_facility_id=f1.facility_id,
        supplying_facility_id=f2.facility_id,
        blood_group=BloodGroup.O_NEG,
        units_requested=1,
        distance_km=5.0,
        status=TransferStatus.PENDING
    )
    req2 = TransferRequest(
        requesting_facility_id=f1.facility_id,
        supplying_facility_id=f2.facility_id,
        blood_group=BloodGroup.O_NEG,
        units_requested=1,
        distance_km=5.0,
        status=TransferStatus.PENDING
    )
    session.add_all([req1, req2])
    session.commit()
    session.refresh(req1)
    session.refresh(req2)

    # First approval succeeds
    approved1 = await approve_transfer_atomic(session, req1.request_id, u_f2)
    assert approved1.status == TransferStatus.APPROVED

    # Second approval must fail with 409 Conflict because unit is no longer available
    with pytest.raises(HTTPException) as exc_info:
        await approve_transfer_atomic(session, req2.request_id, u_f2)
    
    assert exc_info.value.status_code == 409
    assert "Race condition / Insufficient stock" in exc_info.value.detail
