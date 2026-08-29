import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import engine, Base
from backend.app.seed_data import seed_database

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    Base.metadata.create_all(bind=engine)
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
