import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import engine, Base, init_db
from backend.app.seed_data import seed_database

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    init_db()
    seed_database()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "Algorithmic Proximity Triage (Haversine Formula)" in data["features"]

@pytest.mark.asyncio
async def test_demo_users_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/demo-users")
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 4
    emails = [u["email"] for u in users]
    assert "admin@bloodbank.org" in emails
    assert "rajesh@metrohospital.org" in emails

@pytest.mark.asyncio
async def test_login_and_me_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post("/api/auth/json-login", json={
            "email": "admin@bloodbank.org",
            "password": "password123"
        })
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        token = token_data["access_token"]

        me_resp = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "admin@bloodbank.org"

@pytest.mark.asyncio
async def test_register_user_flow():
    import uuid
    unique_email = f"sarah_{uuid.uuid4().hex[:6]}@metrohospital.org"
    new_user_payload = {
        "full_name": "Dr. Sarah Connor",
        "email": unique_email,
        "password": "strongpassword123",
        "role": "HOSPITAL_STAFF",
        "facility_id": 1
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg_resp = await ac.post("/api/auth/register", json=new_user_payload)
        assert reg_resp.status_code == 201
        data = reg_resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["full_name"] == "Dr. Sarah Connor"

        # Duplicate register with same email should fail with 400
        dup_resp = await ac.post("/api/auth/register", json=new_user_payload)
        assert dup_resp.status_code == 400

@pytest.mark.asyncio
async def test_update_profile_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login
        login_resp = await ac.post("/api/auth/json-login", json={
            "email": "admin@bloodbank.org",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]

        # Update profile with phone number
        update_resp = await ac.patch(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Dr. Koushitha Senthilkumar (Updated)",
                "phone_number": "+91 99440 12345"
            }
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["full_name"] == "Dr. Koushitha Senthilkumar (Updated)"
        assert updated["phone_number"] == "+91 99440 12345"

@pytest.mark.asyncio
async def test_update_facility_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as admin
        login_resp = await ac.post("/api/auth/json-login", json={
            "email": "admin@bloodbank.org",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]

        # Update facility #1 address, phone, and GPS coordinates
        fac_update_resp = await ac.patch(
            "/api/facilities/1",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "address": "99 MG Road Central, Bangalore North",
                "contact_phone": "+91 80 2555 9999",
                "contact_email": "metro.updated@metrohospital.org",
                "latitude": 12.9750,
                "longitude": 77.5990
            }
        )
        assert fac_update_resp.status_code == 200
        fac_data = fac_update_resp.json()
        assert fac_data["address"] == "99 MG Road Central, Bangalore North"
        assert fac_data["contact_phone"] == "+91 80 2555 9999"
        assert fac_data["latitude"] == 12.9750
        assert fac_data["longitude"] == 77.5990

@pytest.mark.asyncio
async def test_his_webhook_integration():
    payload = {
        "hospital_system_id": "HIS-APOLLO-NODE-1",
        "facility_id": 2,
        "api_key": "sec_test_his_key",
        "sync_timestamp": "2026-08-28T12:00:00Z",
        "batches": [
            {
                "batch_code": "BATCH-HIS-AUTO-01",
                "blood_group": "AB-",
                "component_type": "RED_CELLS",
                "units_available": 6,
                "collection_date": "2026-08-20",
                "expiry_date": "2026-09-25"
            }
        ]
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/his/sync-inventory", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUCCESS"
    assert resp.json()["synced_batches_count"] == 1
