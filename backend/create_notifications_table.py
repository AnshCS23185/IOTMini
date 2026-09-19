from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
                title VARCHAR NOT NULL,
                message VARCHAR NOT NULL,
                severity VARCHAR NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                read_at TIMESTAMP WITH TIME ZONE
            )
        """))
        print("Created notifications table")
    except Exception as e:
        print("notifications table error:", e)
