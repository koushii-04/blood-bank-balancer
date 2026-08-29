import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.seed_data import seed_database
from backend.app.services.cron_service import start_cron_scheduler, shutdown_cron_scheduler
from backend.app.routers import auth, facilities, inventory, triage, transfers, alerts, his, ws

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("blood_bank_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist and seed initial database
    logger.info("Initializing Inter-Clinic Blood Bank Balancer Database...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    
    # Start automated expiry cron scheduler
    start_cron_scheduler()
    
    yield
    
    # Shutdown: Clean up background workers
    shutdown_cron_scheduler()
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Real-Time Geospatial Inventory Routing & Concurrency Balancer for Healthcare Facilities (BCSE301P)",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(facilities.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(triage.router, prefix=settings.API_V1_STR)
app.include_router(transfers.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(his.router, prefix=settings.API_V1_STR)

# Mount WebSocket Router
app.include_router(ws.router)

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "system": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "mode": "Active Real-Time B2B Routing Engine",
        "features": [
            "Algorithmic Proximity Triage (Haversine Formula)",
            "Automated Expiry Prioritization (< 72h Background Sweeps)",
            "Atomic State Transactions (Concurrency Row-Level Locking)",
            "Event-Driven WebSocket Alerts",
            "Multi-Tenant Role-Based Access Control (RBAC)",
            "External Hospital Information System (HIS) API Integration"
        ]
    }
