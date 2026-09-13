import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Manuscript(Base):
    __tablename__ = "manuscripts"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False)
    author_email = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    state = Column(String, default="Draft", nullable=False) # Draft, AI Processing, Pending Editor Review, Revisions Requested, Approved, Published, Rejected
    submitted_at = Column(DateTime(timezone=True), default=utc_now)
    assigned_editor = Column(String, nullable=True)
    
    genre = Column(String, nullable=False)
    secondary_genre = Column(String, nullable=True)
    audience = Column(String, nullable=True)
    keywords = Column(JSON, default=list) # Store list of keywords as JSON
    abstract = Column(Text, nullable=True)
    synopsis = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    launch_date = Column(String, nullable=True)
    
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_url = Column(String, nullable=True)
    
    rejection_reason = Column(Text, nullable=True)
    legal_declaration = Column(Boolean, default=False)
    legal_accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    # AI Report fields
    ai_score = Column(Integer, nullable=True)
    ai_readability = Column(Integer, nullable=True)
    ai_marketability = Column(Integer, nullable=True)
    ai_detected_pages = Column(Integer, nullable=True)
    ai_title_matched = Column(Boolean, default=True)
    ai_summary = Column(Text, nullable=True)
    ai_genre_confidence = Column(JSON, nullable=True)
    ai_pacing = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user_rel = relationship("User", back_populates="manuscripts")
    chapters = relationship("Chapter", back_populates="manuscript", cascade="all, delete-orphan", order_by="Chapter.chapter_number")
    timeline = relationship("TimelineEvent", back_populates="manuscript", cascade="all, delete-orphan", order_by="TimelineEvent.timestamp")
    notes = relationship("EditorNote", back_populates="manuscript", cascade="all, delete-orphan", order_by="EditorNote.created_at")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    manuscript_id = Column(String, ForeignKey("manuscripts.id"), nullable=False)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    manuscript = relationship("Manuscript", back_populates="timeline")

class EditorNote(Base):
    __tablename__ = "editor_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    manuscript_id = Column(String, ForeignKey("manuscripts.id"), nullable=False)
    note_author = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    manuscript = relationship("Manuscript", back_populates="notes")
