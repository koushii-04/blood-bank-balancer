# Inter-Clinic Blood Bank Balancer: A Real-Time Geospatial Inventory Routing System

**Course:** Software Engineering Lab (`BCSE301P`)  
**Student Name:** Koushitha Senthilkumar  
**Registration Number:** 24BPS1020  

---

## 🩸 Project Vision & Overview
The **Inter-Clinic Blood Bank Balancer** bridges the gap between isolated healthcare facilities (hospitals, outpatient clinics, and blood centers) by providing a centralized, real-time blood sharing and transfer platform. It solves two critical healthcare challenges:
1. **Critical Shortages (High Latency):** Eliminates slow manual communication by automatically routing emergency demand to the nearest matching surplus.
2. **Resource Waste (High Expiration):** Continuously prioritizes blood units approaching expiration ($\le 72\text{ hours}$) for outgoing transfers to save lives before batches spoil.

---

## 🚀 6 Core Architectural Features

1. **Distance-Based Blood Allocation (Haversine Triage)**:
   - Utilizes great-circle geospatial mathematics ($R=6,371\text{ km}$) to calculate the exact distance between requesting hospitals and supplier clinics:
     $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   - Evaluates emergency transit time estimates and ranks supplier recommendations.

2. **Automated Expiry Prioritization (Background Sweeper)**:
   - Autonomous background cron scheduler (`APScheduler`) scanning batches expiring within 72 hours.
   - Boosts the ranking score of near-expiring units in triage to eliminate medical waste and automatically marks past-due batches as `EXPIRED`.

3. **Atomic State Transactions (Concurrency Control)**:
   - Uses strict SQL database row-level locking (`SELECT ... FOR UPDATE` via SQLAlchemy).
   - Guarantees ACID compliance: If two hospitals attempt to claim the exact same blood batch concurrently, the first commits atomically while the second receives an explicit `409 Conflict` error without stock corruption.

4. **Event-Driven WebSocket Alerts**:
   - Zero-latency persistent WebSockets pushing real-time emergency demand alerts, transfer status changes, and expiry warnings directly to clinic dashboards without manual page reloads.

5. **Multi-Tenant Role-Based Access Control (RBAC)**:
   - JWT-based authentication scoping clinic/hospital staff to their registered facility while providing central administrators regional visibility.

6. **External Hospital System (HIS) API Integration**:
   - Secure REST API webhook (`POST /api/his/sync-inventory`) allowing third-party hospital information systems to push real-time batch records automatically.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, APScheduler, python-jose (JWT), Passlib / Native Bcrypt, WebSockets
- **Database:** Relational SQLite with WAL mode (Zero-setup) / MySQL compatible
- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Leaflet & React-Leaflet
- **Testing:** Pytest, pytest-asyncio, HTTPX

---

## 🏃 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Running the Backend API Engine
From the repository root:
```bash
# Install Python dependencies (if not already installed)
python -m pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
python run_backend.py
```
- API Health Check: `http://127.0.0.1:8000/`
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`

### 3. Running the React Frontend
In a new terminal:
```bash
cd blood-bank-balancer
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Test Suite

Run the full backend test suite covering Haversine distance, concurrency row-locking, automated expiry cron sweeps, and REST API flows:
```bash
python -m pytest backend/tests/ -v
```

---

## 🔑 Pre-Configured Demo Credentials

All test accounts use the password: `password123`

| Role | Name | Email | Associated Facility |
| :--- | :--- | :--- | :--- |
| **Regional Admin** | Dr. Koushitha Senthilkumar | `admin@bloodbank.org` | Central Command (All Facilities) |
| **Hospital Staff** | Dr. Rajesh Sharma | `rajesh@metrohospital.org` | Metro Central Hospital |
| **Clinic Staff** | Nurse Priya Nair | `priya@apolloclinic.org` | Apollo Care Clinic |
| **Hospital Staff** | Dr. Arvind Swamy | `arvind@stjudemed.org` | St. Jude Medical Center |
| **Clinic Staff** | Staff Ananya Rao | `ananya@greenvalleyclinic.org` | Green Valley Community Clinic |
