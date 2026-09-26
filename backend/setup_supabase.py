import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models.user import User
from app.models.manuscript import Manuscript, TimelineEvent, EditorNote
from app.models.chapter import Chapter
from app.seed import seed_database

def main():
    print("Initializing Supabase / PostgreSQL database tables...")
    print(f"Connecting to database: {engine.url.render_as_string(hide_password=True)}")
    
    # Create all tables defined in SQLAlchemy models
    Base.metadata.create_all(bind=engine)
    print("✅ All database tables created successfully!")
    
    # Run seed script to insert test accounts & sample manuscripts if empty
    print("Seeding initial data if needed...")
    seed_database()
    print("✅ Database setup & seeding complete!")

if __name__ == "__main__":
    main()
