from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import get_settings


def _get_engine():
    settings = get_settings()
    url = settings.DATABASE_URL
    kwargs = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(url, **kwargs)


engine = _get_engine()

# Enable WAL mode for SQLite (better concurrent read performance)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    if engine.dialect.name == "sqlite":
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
