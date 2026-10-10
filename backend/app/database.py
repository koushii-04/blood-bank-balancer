import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Load backend/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        f"DATABASE_URL is not set. Check your .env file at: {env_path}"
    )

# Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Database session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for SQLAlchemy models
Base = declarative_base()

def init_db():
    """Create all tables and perform non-destructive schema migrations."""
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate missing columns if running against existing MySQL/PostgreSQL/SQLite tables
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE user_accounts ADD COLUMN phone_number VARCHAR(50) NULL"))
            conn.commit()
        except Exception:
            pass # Column already exists

# Database dependency used by routers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()