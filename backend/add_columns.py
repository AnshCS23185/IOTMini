from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE"))
        print("Added acknowledged_at column")
    except Exception as e:
        print("acknowledged_at:", e)
        
    try:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN acknowledged_by_id INTEGER REFERENCES users(id)"))
        print("Added acknowledged_by_id column")
    except Exception as e:
        print("acknowledged_by_id:", e)
