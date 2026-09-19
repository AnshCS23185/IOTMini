import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal
from app.models.panel import Panel
from app.services.diagnostic_service import DiagnosticService

import asyncio

async def run_diagnostics():
    db = SessionLocal()
    for panel_id in [8, 9]:
        panel = db.query(Panel).filter(Panel.id == panel_id).first()
        if panel:
            print(f"Running diagnostics for Panel {panel_id}...")
            result = await DiagnosticService.evaluate_panel(panel, db)
            print(f"Result: {result.status}, Expected: {result.expected_power_w}, Perf: {result.performance_percentage}")
            db.commit()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
