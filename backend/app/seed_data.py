from datetime import date, timedelta, datetime, timezone
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models.facility import Facility, FacilityType
from backend.app.models.user import UserAccount, UserRole
from backend.app.models.inventory import Inventory, BloodGroup, ComponentType, InventoryStatus
from backend.app.models.transfer import TransferRequest, TransferPriority, TransferStatus
from backend.app.models.alert import AlertLog, AlertType, AlertChannel
from backend.app.services.auth_service import get_password_hash
from backend.app.services.triage_service import calculate_haversine_distance

def seed_database(db: Session = None):
    """
    Seeds initial facilities, user accounts, blood inventories, and transfer records.
    """
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(Facility).count() > 0 and db.query(UserAccount).count() > 0:
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding database with medical facilities, staff accounts, and inventory batches...")

        # 1. Facilities (Realistic medical facilities with GPS coordinates in a metro region)
        facilities_data = [
            {
                "name": "Metro Central Hospital",
                "facility_type": FacilityType.HOSPITAL,
                "latitude": 12.9716,
                "longitude": 77.5946,
                "address": "100 MG Road, Central District",
                "contact_phone": "+91 80 2555 1001",
                "contact_email": "emergency@metrohospital.org"
            },
            {
                "name": "Apollo Care Clinic",
                "facility_type": FacilityType.CLINIC,
                "latitude": 12.9352,
                "longitude": 77.6245,
                "address": "45 Koramangala 4th Block",
                "contact_phone": "+91 80 2555 2002",
                "contact_email": "bloodbank@apolloclinic.org"
            },
            {
                "name": "St. Jude Medical Center",
                "facility_type": FacilityType.HOSPITAL,
                "latitude": 12.9900,
                "longitude": 77.5500,
                "address": "12 Rajajinagar Main Road",
                "contact_phone": "+91 80 2555 3003",
                "contact_email": "triage@stjudemed.org"
            },
            {
                "name": "Green Valley Community Clinic",
                "facility_type": FacilityType.CLINIC,
                "latitude": 12.9100,
                "longitude": 77.6000,
                "address": "78 Bannerghatta Road",
                "contact_phone": "+91 80 2555 4004",
                "contact_email": "supplies@greenvalleyclinic.org"
            },
            {
                "name": "Regional Red Cross Blood Center",
                "facility_type": FacilityType.BLOOD_BANK,
                "latitude": 13.0100,
                "longitude": 77.6400,
                "address": "88 Kalyan Nagar Ring Road",
                "contact_phone": "+91 80 2555 5005",
                "contact_email": "regional@redcrossblood.org"
            }
        ]

        created_facilities = []
        for fac in facilities_data:
            f = Facility(**fac)
            db.add(f)
            created_facilities.append(f)
        db.commit()

        for f in created_facilities:
            db.refresh(f)

        f_metro, f_apollo, f_stjude, f_greenvalley, f_redcross = created_facilities

        # 2. User Accounts (Admin, Hospital Staff, Clinic Staff)
        default_pwd_hash = get_password_hash("password123")

        users_data = [
            {
                "full_name": "Dr. Koushitha Senthilkumar (Regional Admin)",
                "email": "admin@bloodbank.org",
                "password_hash": default_pwd_hash,
                "role": UserRole.ADMIN,
                "facility_id": None
            },
            {
                "full_name": "Dr. Rajesh Sharma (Metro Hospital Lead)",
                "email": "rajesh@metrohospital.org",
                "password_hash": default_pwd_hash,
                "role": UserRole.HOSPITAL_STAFF,
                "facility_id": f_metro.facility_id
            },
            {
                "full_name": "Nurse Priya Nair (Apollo Clinic Staff)",
                "email": "priya@apolloclinic.org",
                "password_hash": default_pwd_hash,
                "role": UserRole.CLINIC_STAFF,
                "facility_id": f_apollo.facility_id
            },
            {
                "full_name": "Dr. Arvind Swamy (St. Jude Staff)",
                "email": "arvind@stjudemed.org",
                "password_hash": default_pwd_hash,
                "role": UserRole.HOSPITAL_STAFF,
                "facility_id": f_stjude.facility_id
            },
            {
                "full_name": "Staff Ananya Rao (Green Valley Clinic)",
                "email": "ananya@greenvalleyclinic.org",
                "password_hash": default_pwd_hash,
                "role": UserRole.CLINIC_STAFF,
                "facility_id": f_greenvalley.facility_id
            }
        ]

        for u in users_data:
            db.add(UserAccount(**u))
        db.commit()

        # 3. Blood Inventory Batches
        # Mix of standard batches and batches expiring in <= 72h (urgent for transfer)
        today = date.today()

        inventories_data = [
            # Apollo Care Clinic has O- surplus expiring in 2 days (Urgent Prioritization!)
            {
                "facility_id": f_apollo.facility_id,
                "blood_group": BloodGroup.O_NEG,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 4,
                "batch_code": "BATCH-APO-ONEG-72H",
                "collection_date": today - timedelta(days=33),
                "expiry_date": today + timedelta(days=2),  # Expiring in 48 hours!
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_apollo.facility_id,
                "blood_group": BloodGroup.A_POS,
                "component_type": ComponentType.RED_CELLS,
                "units_available": 8,
                "batch_code": "BATCH-APO-APOS-NORM",
                "collection_date": today - timedelta(days=10),
                "expiry_date": today + timedelta(days=25),
                "status": InventoryStatus.AVAILABLE
            },
            # Green Valley Clinic has O- surplus expiring in 20 days
            {
                "facility_id": f_greenvalley.facility_id,
                "blood_group": BloodGroup.O_NEG,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 6,
                "batch_code": "BATCH-GV-ONEG-20D",
                "collection_date": today - timedelta(days=15),
                "expiry_date": today + timedelta(days=20),
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_greenvalley.facility_id,
                "blood_group": BloodGroup.B_POS,
                "component_type": ComponentType.PLATELETS,
                "units_available": 3,
                "batch_code": "BATCH-GV-BPOS-EXP1D",
                "collection_date": today - timedelta(days=4),
                "expiry_date": today + timedelta(days=1),  # Platelets expire fast (1 day left)
                "status": InventoryStatus.AVAILABLE
            },
            # Regional Red Cross Blood Center
            {
                "facility_id": f_redcross.facility_id,
                "blood_group": BloodGroup.O_NEG,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 15,
                "batch_code": "BATCH-RC-ONEG-FRESH",
                "collection_date": today - timedelta(days=5),
                "expiry_date": today + timedelta(days=30),
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_redcross.facility_id,
                "blood_group": BloodGroup.AB_NEG,
                "component_type": ComponentType.PLASMA,
                "units_available": 5,
                "batch_code": "BATCH-RC-ABNEG-NORM",
                "collection_date": today - timedelta(days=8),
                "expiry_date": today + timedelta(days=27),
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_redcross.facility_id,
                "blood_group": BloodGroup.O_POS,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 20,
                "batch_code": "BATCH-RC-OPOS-NORM",
                "collection_date": today - timedelta(days=12),
                "expiry_date": today + timedelta(days=23),
                "status": InventoryStatus.AVAILABLE
            },
            # Metro Hospital inventory (Low on O- to demonstrate shortage)
            {
                "facility_id": f_metro.facility_id,
                "blood_group": BloodGroup.O_POS,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 5,
                "batch_code": "BATCH-METRO-OPOS",
                "collection_date": today - timedelta(days=14),
                "expiry_date": today + timedelta(days=21),
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_metro.facility_id,
                "blood_group": BloodGroup.A_POS,
                "component_type": ComponentType.RED_CELLS,
                "units_available": 10,
                "batch_code": "BATCH-METRO-APOS",
                "collection_date": today - timedelta(days=7),
                "expiry_date": today + timedelta(days=28),
                "status": InventoryStatus.AVAILABLE
            },
            # St. Jude Medical Center
            {
                "facility_id": f_stjude.facility_id,
                "blood_group": BloodGroup.B_POS,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 12,
                "batch_code": "BATCH-STJUDE-BPOS",
                "collection_date": today - timedelta(days=10),
                "expiry_date": today + timedelta(days=25),
                "status": InventoryStatus.AVAILABLE
            },
            {
                "facility_id": f_stjude.facility_id,
                "blood_group": BloodGroup.AB_POS,
                "component_type": ComponentType.WHOLE_BLOOD,
                "units_available": 4,
                "batch_code": "BATCH-STJUDE-ABPOS-72H",
                "collection_date": today - timedelta(days=32),
                "expiry_date": today + timedelta(days=3),  # Expiring in 72 hours
                "status": InventoryStatus.AVAILABLE
            }
        ]

        for inv in inventories_data:
            db.add(Inventory(**inv))
        db.commit()

        # 4. Sample Historic Transfer
        dist_metro_apollo = calculate_haversine_distance(
            f_metro.latitude, f_metro.longitude,
            f_apollo.latitude, f_apollo.longitude
        )
        sample_transfer = TransferRequest(
            requesting_facility_id=f_metro.facility_id,
            supplying_facility_id=f_apollo.facility_id,
            blood_group=BloodGroup.A_POS,
            units_requested=2,
            distance_km=dist_metro_apollo,
            priority=TransferPriority.CRITICAL,
            status=TransferStatus.COMPLETED,
            requested_at=datetime.now(timezone.utc) - timedelta(hours=5),
            resolved_at=datetime.now(timezone.utc) - timedelta(hours=3)
        )
        db.add(sample_transfer)
        db.commit()

        # Alert Log
        alert = AlertLog(
            request_id=sample_transfer.request_id,
            facility_id=f_apollo.facility_id,
            alert_type=AlertType.TRANSFER_REQUEST,
            channel=AlertChannel.WEBSOCKET,
            message=f"CRITICAL: Metro Central Hospital requested 2 units of A+ blood.",
            acknowledged=True
        )
        db.add(alert)
        db.commit()

        print("Database seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
