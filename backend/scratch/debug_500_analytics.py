import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)

def test_500():
    db = SessionLocal()
    # Find Admin user to simulate the same request
    admin = db.query(User).filter(User.role == "ADMIN").first()
    if not admin:
        print("No admin user found")
        return
        
    print(f"Testing as user: {admin.email} (Role: {admin.role})")
    
    # We can bypass dependencies if we want, but it's easier to just use the actual auth token.
    # Actually, we can just run the function directly.
    import asyncio
    from app.routes.diagnostics import get_alert_analytics, get_alert_trend
    
    try:
        res = asyncio.run(get_alert_analytics(days=7, db=db, current_user=admin))
        print("Analytics OK:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
        
    try:
        res = asyncio.run(get_alert_trend(days=7, db=db, current_user=admin))
        print("Trend OK:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_500()
