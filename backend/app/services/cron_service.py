import logging
from datetime import date, timedelta, datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.inventory import Inventory, InventoryStatus
from backend.app.models.facility import Facility
from backend.app.models.alert import AlertLog, AlertType, AlertChannel
from backend.app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def run_expiry_sweep():
    """
    Automated Expiry Prioritization Sweeper:
    1. Scans database for batches where expiry_date < today and marks them as EXPIRED.
    2. Scans for batches expiring within 72 hours (3 days) and dispatches urgent warning alerts.
    3. Pushes real-time WebSocket notifications to the affected facility dashboards.
    """
    logger.info("Executing Automated Expiry Prioritization background sweep...")
    db: Session = SessionLocal()
    try:
        today = date.today()
        warning_threshold_date = today + timedelta(days=3)  # 72 hours

        # Step 1: Mark past-due units as EXPIRED
        expired_batches = db.query(Inventory).filter(
            Inventory.expiry_date < today,
            Inventory.status != InventoryStatus.EXPIRED
        ).all()

        expired_count = len(expired_batches)
        for batch in expired_batches:
            batch.status = InventoryStatus.EXPIRED

        # Step 2: Identify batches expiring within 72 hours
        expiring_batches = db.query(Inventory, Facility).join(
            Facility, Inventory.facility_id == Facility.facility_id
        ).filter(
            Inventory.expiry_date >= today,
            Inventory.expiry_date <= warning_threshold_date,
            Inventory.status == InventoryStatus.AVAILABLE,
            Inventory.units_available > 0
        ).all()

        for batch, facility in expiring_batches:
            days_left = (batch.expiry_date - today).days
            hours_left = max(days_left * 24, 0)
            
            warning_msg = (
                f"EXPIRY WARNING: Batch {batch.batch_code} ({batch.units_available} units of {batch.blood_group.value}) "
                f"at {facility.name} expires in {days_left} day(s) / ~{hours_left}h. Prioritizing for urgent transfer."
            )

            # Record in Alert Log
            alert = AlertLog(
                facility_id=facility.facility_id,
                alert_type=AlertType.EXPIRATION_WARNING,
                channel=AlertChannel.WEBSOCKET,
                message=warning_msg
            )
            db.add(alert)

            # Push real-time alert to facility room
            await manager.broadcast_to_channel(
                f"facility_{facility.facility_id}",
                {
                    "event": "EXPIRY_WARNING",
                    "inventory_id": batch.inventory_id,
                    "batch_code": batch.batch_code,
                    "blood_group": batch.blood_group.value,
                    "units_available": batch.units_available,
                    "expiry_date": batch.expiry_date.isoformat(),
                    "hours_left": hours_left,
                    "message": warning_msg,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

        db.commit()
        logger.info(f"Sweep complete: {expired_count} batches marked expired, {len(expiring_batches)} batches flagged for urgent transfer prioritization.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error running automated expiry sweep: {e}")
    finally:
        db.close()

def start_cron_scheduler():
    """Starts the background cron scheduler."""
    # Runs sweep every 12 hours, plus an initial sweep
    scheduler.add_job(run_expiry_sweep, "interval", hours=12, id="expiry_sweep_job", replace_existing=True)
    scheduler.start()
    logger.info("Automated Expiry Prioritization Cron Scheduler initialized.")

def shutdown_cron_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Automated Expiry Prioritization Cron Scheduler stopped.")
