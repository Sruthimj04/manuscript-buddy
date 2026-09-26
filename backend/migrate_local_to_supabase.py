"""
Local SQLite to Supabase PostgreSQL Migration Script
---------------------------------------------------
This script reads all records from your local SQLite database (`sql_app.db`)
and inserts/migrates them into your Supabase PostgreSQL database.

Usage:
    python migrate_local_to_supabase.py [SUPABASE_DATABASE_URL]

If SUPABASE_DATABASE_URL is not provided on CLI, it will read DATABASE_URL from .env
"""

import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import Base
from app.models.user import User
from app.models.manuscript import Manuscript, TimelineEvent, EditorNote
from app.models.chapter import Chapter

SQLITE_URL = "sqlite:///./sql_app.db"

def get_supabase_url():
    if len(sys.argv) > 1:
        return sys.argv[1].strip()
    
    # Try dotenv from root directory
    from dotenv import load_dotenv
    root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(root_env):
        load_dotenv(root_env)
        
    env_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL") or settings.DATABASE_URL
    if not env_url or env_url.startswith("sqlite"):
        print("❌ Error: No Supabase PostgreSQL URL found!")
        print("Please provide your Supabase database URL either:")
        print("  1) As a command line argument:")
        print("     python migrate_local_to_supabase.py postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres")
        print("  2) Or set DATABASE_URL in your .env file to your Supabase PostgreSQL connection string.")
        sys.exit(1)
    
    if env_url.startswith("postgres://"):
        env_url = env_url.replace("postgres://", "postgresql://", 1)
        
    return env_url

def migrate():
    supabase_url = get_supabase_url()
    
    print("==================================================")
    print("🚀 STARTING MIGRATION: Local SQLite -> Supabase")
    print("==================================================")
    print(f"Source DB:      {SQLITE_URL}")
    print(f"Destination DB: {supabase_url.split('@')[-1] if '@' in supabase_url else 'Supabase PostgreSQL'}")
    print("--------------------------------------------------")

    # Connect to SQLite (Source)
    sqlite_engine = create_engine(SQLITE_URL)
    SqliteSession = sessionmaker(bind=sqlite_engine)
    source_db = SqliteSession()

    # Connect to Supabase (Destination)
    try:
        supabase_engine = create_engine(supabase_url, pool_pre_ping=True)
        # Ensure tables exist in destination
        Base.metadata.create_all(bind=supabase_engine)
        SupabaseSession = sessionmaker(bind=supabase_engine)
        dest_db = SupabaseSession()
        print("✅ Successfully connected to Supabase PostgreSQL!")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase database: {e}")
        sys.exit(1)

    try:
        # 1. Migrate Users
        users = source_db.query(User).all()
        print(f"\n📦 Migrating {len(users)} Users...")
        user_count = 0
        for u in users:
            existing = dest_db.query(User).filter((User.id == u.id) | (User.email == u.email)).first()
            if not existing:
                new_u = User(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    phone=u.phone,
                    role=u.role,
                    hashed_password=u.hashed_password,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    updated_at=u.updated_at
                )
                dest_db.add(new_u)
                user_count += 1
        dest_db.commit()
        print(f"   -> Inserted {user_count} new users.")

        # 2. Migrate Manuscripts
        manuscripts = source_db.query(Manuscript).all()
        print(f"\n📦 Migrating {len(manuscripts)} Manuscripts...")
        ms_count = 0
        for m in manuscripts:
            existing = dest_db.query(Manuscript).filter(Manuscript.id == m.id).first()
            if not existing:
                new_m = Manuscript(
                    id=m.id,
                    title=m.title,
                    author=m.author,
                    author_email=m.author_email,
                    user_id=m.user_id,
                    state=m.state,
                    submitted_at=m.submitted_at,
                    assigned_editor=m.assigned_editor,
                    genre=m.genre,
                    secondary_genre=m.secondary_genre,
                    audience=m.audience,
                    keywords=m.keywords,
                    abstract=m.abstract,
                    synopsis=m.synopsis,
                    page_count=m.page_count,
                    launch_date=m.launch_date,
                    file_name=m.file_name,
                    file_size=m.file_size,
                    file_url=m.file_url,
                    rejection_reason=m.rejection_reason,
                    legal_declaration=m.legal_declaration,
                    legal_accepted_at=m.legal_accepted_at,
                    ai_score=m.ai_score,
                    ai_readability=m.ai_readability,
                    ai_marketability=m.ai_marketability,
                    ai_detected_pages=m.ai_detected_pages,
                    ai_title_matched=m.ai_title_matched,
                    ai_summary=m.ai_summary,
                    ai_genre_confidence=m.ai_genre_confidence,
                    ai_pacing=m.ai_pacing,
                    created_at=m.created_at,
                    updated_at=m.updated_at
                )
                dest_db.add(new_m)
                ms_count += 1
        dest_db.commit()
        print(f"   -> Inserted {ms_count} new manuscripts.")

        # 3. Migrate Chapters
        chapters = source_db.query(Chapter).all()
        print(f"\n📦 Migrating {len(chapters)} Chapters...")
        ch_count = 0
        for c in chapters:
            existing = dest_db.query(Chapter).filter(Chapter.id == c.id).first()
            if not existing:
                new_c = Chapter(
                    id=c.id,
                    manuscript_id=c.manuscript_id,
                    chapter_number=c.chapter_number,
                    chapter_title=c.chapter_title,
                    chapter_content=c.chapter_content,
                    images=c.images,
                    created_at=c.created_at,
                    updated_at=c.updated_at
                )
                dest_db.add(new_c)
                ch_count += 1
        dest_db.commit()
        print(f"   -> Inserted {ch_count} new chapters.")

        # 4. Migrate Timeline Events
        events = source_db.query(TimelineEvent).all()
        print(f"\n📦 Migrating {len(events)} Timeline Events...")
        ev_count = 0
        for ev in events:
            existing = dest_db.query(TimelineEvent).filter(TimelineEvent.id == ev.id).first()
            if not existing:
                new_ev = TimelineEvent(
                    id=ev.id,
                    manuscript_id=ev.manuscript_id,
                    actor=ev.actor,
                    action=ev.action,
                    timestamp=ev.timestamp
                )
                dest_db.add(new_ev)
                ev_count += 1
        dest_db.commit()
        print(f"   -> Inserted {ev_count} new timeline events.")

        # 5. Migrate Editor Notes
        notes = source_db.query(EditorNote).all()
        print(f"\n📦 Migrating {len(notes)} Editor Notes...")
        note_count = 0
        for n in notes:
            existing = dest_db.query(EditorNote).filter(EditorNote.id == n.id).first()
            if not existing:
                new_n = EditorNote(
                    id=n.id,
                    manuscript_id=n.manuscript_id,
                    note_author=n.note_author,
                    body=n.body,
                    created_at=n.created_at
                )
                dest_db.add(new_n)
                note_count += 1
        dest_db.commit()
        print(f"   -> Inserted {note_count} new editor notes.")

        print("\n==================================================")
        print("🎉 MIGRATION FINISHED SUCCESSFULLY!")
        print("All local data has been copied into Supabase.")
        print("==================================================")

    except Exception as e:
        dest_db.rollback()
        print(f"\n❌ Migration failed: {e}")
    finally:
        source_db.close()
        dest_db.close()

if __name__ == "__main__":
    migrate()
