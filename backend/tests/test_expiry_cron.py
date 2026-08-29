import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models.facility import Facility, FacilityType
from backend.app.models.inventory import Inventory, BloodGroup, ComponentType, InventoryStatus
from backend.app.models.alert import AlertLog, AlertType
from backend.app.services.cron_service import run_expiry_sweep

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.mark.asyncio
async def test_expiry_sweep_marks_expired_and_flags_near_expiry(monkeypatch):
    Base.metadata.create_all(bind=test_engine)
    
    # Monkeypatch SessionLocal in cron_service to use test_engine
    monkeypatch.setattr("backend.app.services.cron_service.SessionLocal", TestSessionLocal)

    session = TestSessionLocal()

    f = Facility(name="Test Clinic", facility_type=FacilityType.CLINIC, latitude=12.9, longitude=77.6)
    session.add(f)
    session.commit()
    session.refresh(f)

    today = date.today()

    # Batch 1: Expired yesterday
    inv_expired = Inventory(
        facility_id=f.facility_id,
        blood_group=BloodGroup.A_POS,
        component_type=ComponentType.WHOLE_BLOOD,
        units_available=5,
        batch_code="EXP-YESTERDAY",
        collection_date=today - timedelta(days=40),
        expiry_date=today - timedelta(days=1),
        status=InventoryStatus.AVAILABLE
    )
    # Batch 2: Expiring in 2 days (<= 72h)
    inv_urgent = Inventory(
        facility_id=f.facility_id,
        blood_group=BloodGroup.O_NEG,
        component_type=ComponentType.WHOLE_BLOOD,
        units_available=3,
        batch_code="EXP-48H",
        collection_date=today - timedelta(days=33),
        expiry_date=today + timedelta(days=2),
        status=InventoryStatus.AVAILABLE
    )
    # Batch 3: Fresh batch expiring in 25 days
    inv_fresh = Inventory(
        facility_id=f.facility_id,
        blood_group=BloodGroup.B_POS,
        component_type=ComponentType.WHOLE_BLOOD,
        units_available=10,
        batch_code="EXP-25D",
        collection_date=today - timedelta(days=5),
        expiry_date=today + timedelta(days=25),
        status=InventoryStatus.AVAILABLE
    )

    fac_id = f.facility_id
    session.add_all([inv_expired, inv_urgent, inv_fresh])
    session.commit()
    session.close()

    # Run background sweep
    await run_expiry_sweep()

    # Verify results in fresh session
    verify_session = TestSessionLocal()
    
    item_expired = verify_session.query(Inventory).filter(Inventory.batch_code == "EXP-YESTERDAY").first()
    item_urgent = verify_session.query(Inventory).filter(Inventory.batch_code == "EXP-48H").first()
    item_fresh = verify_session.query(Inventory).filter(Inventory.batch_code == "EXP-25D").first()

    # 1. Past-due unit must now have status EXPIRED
    assert item_expired.status == InventoryStatus.EXPIRED

    # 2. Batch expiring in 2 days remains AVAILABLE but triggers EXPIRATION_WARNING alert log
    assert item_urgent.status == InventoryStatus.AVAILABLE
    alert = verify_session.query(AlertLog).filter(
        AlertLog.facility_id == fac_id,
        AlertLog.alert_type == AlertType.EXPIRATION_WARNING
    ).first()
    assert alert is not None
    assert "EXP-48H" in alert.message

    # 3. Fresh batch untouched
    assert item_fresh.status == InventoryStatus.AVAILABLE

    verify_session.close()
    Base.metadata.drop_all(bind=test_engine)
