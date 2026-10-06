"""Database connection and session handling supporting SQLAlchemy 2.0 Async and Sync engines."""
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import DATABASE_URL, ASYNC_DATABASE_URL

# Base class for ORM models
Base = declarative_base()

# ==========================================
# 1. Synchronous Engine (for migrations, seeders, sync test fixtures)
# ==========================================
sync_connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=sync_connect_args,
    echo=False,
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Yields synchronous SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables for synchronous connections."""
    import sqlalchemy as sa
    from app import models  # Ensure models are imported
    Base.metadata.create_all(bind=engine)

    # Auto-add embedding column to existing SQLite database if missing
    if "sqlite" in DATABASE_URL:
        with engine.connect() as conn:
            try:
                cols = conn.execute(sa.text("PRAGMA table_info(products)")).fetchall()
                col_names = [c[1] for c in cols]
                if col_names and "embedding" not in col_names:
                    conn.execute(sa.text("ALTER TABLE products ADD COLUMN embedding TEXT"))
                    conn.commit()
            except Exception:
                pass

# ==========================================
# 2. Asynchronous Engine (SQLAlchemy 2.0 + asyncpg for high-scale I/O)
# ==========================================
async_connect_args = {"check_same_thread": False} if "sqlite" in ASYNC_DATABASE_URL else {}

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    connect_args=async_connect_args,
    echo=False,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding SQLAlchemy 2.0 AsyncSession."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
