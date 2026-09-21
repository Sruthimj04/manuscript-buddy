import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String, primary_key=True, default=generate_uuid)
    manuscript_id = Column(String, ForeignKey("manuscripts.id"), nullable=False)
    chapter_number = Column(Integer, nullable=False, default=1)
    chapter_title = Column(String, nullable=False)
    chapter_content = Column(Text, nullable=True, default="")
    images = Column(JSON, default=list) # List of image dicts [{ name, imageFile, caption, displayOrder }]

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    manuscript = relationship("Manuscript", back_populates="chapters")
