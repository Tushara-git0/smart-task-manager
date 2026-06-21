from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# Fall back to SQLite if PostgreSQL is not reachable
if DATABASE_URL.startswith("postgresql"):
    try:
        _probe = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with _probe.connect():
            pass
    except Exception:
        DATABASE_URL = "sqlite:///./taskdb.sqlite3"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Auto-create all tables (safe for SQLite; Alembic handles PostgreSQL)
if DATABASE_URL.startswith("sqlite"):
    from app.models.base import Base
    from app.models import User, Team, TeamMember, Task, TaskAssignment, Comment, Attachment, ActivityLog, Notification  # noqa
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
