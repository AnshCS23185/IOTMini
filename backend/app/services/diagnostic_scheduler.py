import logging
import traceback
import redis
import asyncio
from datetime import datetime
from app.config import settings
from app.database import SessionLocal
from app.models.panel import Panel
from app.services.diagnostic_service import DiagnosticService

logger = logging.getLogger(__name__)

# Basic Redis connection
try:
    redis_client = redis.from_url(settings.REDIS_URL)
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

def run_diagnostics_job():
    logger.info("DIAGNOSTICS JOB STARTED")
    
    if not redis_client:
        logger.error("Redis client not available, skipping job to prevent duplicate execution.")
        return

    # Use a Redis lock that expires after 4 minutes to prevent multiple workers 
    # from executing the same 5-minute cycle simultaneously.
    lock_name = "diagnostic_scheduler_lock"
    # Acquire lock (expires in 240 seconds to ensure it's cleared before the next 5-min cycle)
    lock = redis_client.lock(lock_name, timeout=240, blocking_timeout=1)
    
    acquired = False
    try:
        acquired = lock.acquire()
        if not acquired:
            logger.info("Another worker is already running the diagnostics job. Skipping.")
            return

        db = SessionLocal()
        try:
            active_panels = db.query(Panel).filter(Panel.status == "ACTIVE").all()
            total_panels = len(active_panels)
            logger.info(f"Active panels found: {total_panels}")

            success_count = 0
            failed_count = 0

            for panel in active_panels:
                logger.info(f"Evaluating diagnostics for panel {panel.id}")
                try:
                    # evaluate_panel is an async function and expects a Panel object
                    result = asyncio.run(DiagnosticService.evaluate_panel(panel, db))
                    logger.info(f"Panel {panel.id} -> {result.status}")
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Diagnostic evaluation failed for panel {panel.id}: {e}")
                    # Ensure any failed transaction is rolled back so the session is clean for the next panel
                    db.rollback()

            logger.info(f"DIAGNOSTICS JOB COMPLETED\nPanels evaluated: {total_panels}\nSuccessful: {success_count}\nFailed: {failed_count}")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in diagnostics job: {e}")
    finally:
        if acquired:
            try:
                lock.release()
            except redis.exceptions.LockError:
                pass
