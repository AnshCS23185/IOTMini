from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.routes import api_router
from app.models.user import User
from app.models.diagnostics import DiagnosticRecord, Alert
from app.core.security import get_password_hash

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def create_initial_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@paneliq.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            hashed_password = get_password_hash("1234")
            new_admin = User(
                name="System Admin",
                email=admin_email,
                password_hash=hashed_password,
                role="ADMIN",
                status="ACTIVE"
            )
            db.add(new_admin)
            db.commit()
            print("Initial admin created: admin@paneliq.com / 1234")
    finally:
        db.close()

# Create initial admin on startup
create_initial_admin()

app = FastAPI(
    title="PanelIQ API",
    description="IoT-based solar panel performance and fault monitoring platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
