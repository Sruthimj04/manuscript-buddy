import re
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL

# Auto-fix unescaped @ symbol in database password if present
if "://" in db_url and "@" in db_url:
    try:
        user_pass, host_part = db_url.rsplit("@", 1)
        if "://" in user_pass and ":" in user_pass.split("://", 1)[1]:
            scheme, creds = user_pass.split("://", 1)
            user, password = creds.split(":", 1)
            # URL encode password if it contains special characters like @
            encoded_password = urllib.parse.quote(urllib.parse.unquote(password), safe="")
            db_url = f"{scheme}://{user}:{encoded_password}@{host_part}"
    except Exception:
        pass

# Ensure postgresql+psycopg2 dialect is used for PostgreSQL URLs
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
