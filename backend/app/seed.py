import os
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, SessionLocal, Base
from app.models.user import User
from app.models.manuscript import Manuscript, TimelineEvent, EditorNote
from app.models.chapter import Chapter
from app.auth.security import hash_password
from app.config import settings

def seed_database():
    if settings.ENVIRONMENT == "production":
        print("Skipping seed in production environment.")
        return

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Create Default Users if not existing
        users_data = [
            {"email": "author@example.com", "full_name": "Amara Vance", "role": "author", "password": "password123"},
            {"email": "editor@example.com", "full_name": "Marcus Vance", "role": "editor", "password": "password123"},
            {"email": "admin@example.com", "full_name": "System Administrator", "role": "admin", "password": "password123"},
        ]

        for u_data in users_data:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    hashed_password=hash_password(u_data["password"])
                )
                db.add(user)
        db.commit()

        author_user = db.query(User).filter(User.email == "author@example.com").first()

        # 2. Sample Manuscript 1: "The Quantum Paradigm"
        m1 = db.query(Manuscript).filter(Manuscript.title == "The Quantum Paradigm").first()
        if not m1:
            m1 = Manuscript(
                title="The Quantum Paradigm",
                author="Amara Vance",
                author_email="author@example.com",
                user_id=author_user.id if author_user else None,
                state="Pending Editor Review",
                genre="Science Fiction",
                secondary_genre="Cyberpunk",
                audience="Young Adult",
                keywords=["quantum", "sci-fi", "future", "physics"],
                abstract="A groundbreaking exploration of quantum consciousness and virtual realities in the 22nd century.",
                synopsis="When physicist Dr. Elena Vance discovers a rift in quantum spacetime, she must navigate a world of shifting realities to save mankind.",
                page_count=320,
                launch_date="2026-11-15",
                file_name="Quantum_Paradigm_Final.pdf",
                file_size=4500000,
                legal_declaration=True,
                legal_accepted_at=datetime.now(timezone.utc),
                ai_score=88,
                ai_readability=82,
                ai_marketability=91,
                ai_detected_pages=320,
                ai_title_matched=True,
                ai_summary="High-concept narrative structure with excellent lexical balance. Character arcs show strong emotional pacing across 3 acts.",
                ai_genre_confidence=[
                    {"label": "Science Fiction", "value": 85},
                    {"label": "Cyberpunk", "value": 15}
                ],
                ai_pacing=[
                    {"label": "Act I", "value": 75},
                    {"label": "Act II", "value": 88},
                    {"label": "Act III", "value": 94}
                ]
            )
            db.add(m1)
            db.flush()

            # Timeline
            db.add(TimelineEvent(manuscript_id=m1.id, actor="Amara Vance", action="Submitted Manuscript"))
            db.add(TimelineEvent(manuscript_id=m1.id, actor="AI System", action="Completed AI Pre-flight Scan (Score: 88%)"))

            # Chapters
            db.add(Chapter(
                manuscript_id=m1.id,
                chapter_number=1,
                chapter_title="The Rift",
                chapter_content="The particle accelerator hummed with a low, ominous vibration that set Elena's teeth on edge."
            ))
            db.add(Chapter(
                manuscript_id=m1.id,
                chapter_number=2,
                chapter_title="Entanglement",
                chapter_content="Everything they knew about locality vanished in a single microsecond."
            ))

        # 3. Sample Manuscript 2: "Echoes of Tomorrow"
        m2 = db.query(Manuscript).filter(Manuscript.title == "Echoes of Tomorrow").first()
        if not m2:
            m2 = Manuscript(
                title="Echoes of Tomorrow",
                author="Amara Vance",
                author_email="author@example.com",
                user_id=author_user.id if author_user else None,
                state="Revisions Requested",
                genre="Dystopian",
                secondary_genre="Thriller",
                audience="General",
                keywords=["dystopia", "rebellion", "memory"],
                abstract="In a city where memories are taxed, one archivist risks everything to preserve the truth.",
                synopsis="Kael guards the forbidden memory vaults. When he discovers an erased year, the city's rulers mark him for termination.",
                page_count=280,
                launch_date="2026-12-01",
                file_name="Echoes_v1.pdf",
                file_size=3800000,
                legal_declaration=True,
                legal_accepted_at=datetime.now(timezone.utc),
                ai_score=76,
                ai_readability=78,
                ai_marketability=74,
                ai_detected_pages=280,
                ai_title_matched=True,
                ai_summary="Strong narrative hook in Chapter 1. Mid-section requires tighter pacing and dialogue trimming.",
                ai_genre_confidence=[
                    {"label": "Dystopian", "value": 78},
                    {"label": "Thriller", "value": 22}
                ],
                ai_pacing=[
                    {"label": "Act I", "value": 82},
                    {"label": "Act II", "value": 65},
                    {"label": "Act III", "value": 80}
                ]
            )
            db.add(m2)
            db.flush()

            # Timeline
            db.add(TimelineEvent(manuscript_id=m2.id, actor="Amara Vance", action="Submitted Manuscript"))
            db.add(TimelineEvent(manuscript_id=m2.id, actor="Marcus Vance", action="Requested Revisions"))

            # Editor note
            db.add(EditorNote(
                manuscript_id=m2.id,
                note_author="Marcus Vance",
                body="Please expand on Kael's backstory in Chapter 2 and tighten the pacing in Act II before resubmitting."
            ))

        db.commit()
        print("Database seeded successfully with test accounts & sample manuscripts!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
