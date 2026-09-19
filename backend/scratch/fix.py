import asyncio
from app.database import SessionLocal
from app.models.panel import Panel
from app.services.diagnostic_service import DiagnosticService

async def f():
    db = SessionLocal()
    p = db.query(Panel).filter_by(id=8).first()
    await DiagnosticService.evaluate_panel(p, db)
    db.close()

asyncio.run(f())
print('Diag done!')
