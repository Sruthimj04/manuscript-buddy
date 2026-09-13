from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class GenreConfidence(BaseModel):
    label: str
    value: float

class PacingItem(BaseModel):
    label: str
    value: float

class AIReportSchema(BaseModel):
    score: int
    genreConfidence: List[GenreConfidence]
    readability: int
    marketability: int
    pacing: List[PacingItem]
    summary: str
    detectedPages: int
    titleMatched: bool

class ChapterImageSchema(BaseModel):
    name: str
    imageFile: str
    caption: str
    displayOrder: int

class ChapterSchema(BaseModel):
    name: Optional[str] = None
    chapterNumber: int
    chapterTitle: str
    chapterContent: Optional[str] = ""
    images: Optional[List[ChapterImageSchema]] = []

class TimelineEventSchema(BaseModel):
    id: str
    actor: str
    action: str
    timestamp: str

class EditorNoteSchema(BaseModel):
    id: str
    author: str
    createdAt: str
    body: str

class ManuscriptCreate(BaseModel):
    title: str
    author: str
    authorEmail: Optional[str] = None
    genre: str
    secondaryGenre: Optional[str] = None
    audience: Optional[str] = None
    keywords: Optional[List[str]] = []
    abstract: Optional[str] = None
    synopsis: Optional[str] = None
    pageCount: Optional[int] = None
    launchDate: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    state: Optional[str] = "Draft"
    ai: Optional[AIReportSchema] = None
    chapters: Optional[List[ChapterSchema]] = []

class ManuscriptUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    secondaryGenre: Optional[str] = None
    audience: Optional[str] = None
    keywords: Optional[List[str]] = None
    abstract: Optional[str] = None
    synopsis: Optional[str] = None
    pageCount: Optional[int] = None
    launchDate: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    state: Optional[str] = None
    ai: Optional[AIReportSchema] = None
    legalDeclaration: Optional[bool] = None

class ManuscriptOut(BaseModel):
    id: str
    title: str
    author: str
    authorEmail: Optional[str] = None
    submittedAt: str
    editor: Optional[str] = None
    genre: str
    secondaryGenre: Optional[str] = None
    audience: Optional[str] = None
    keywords: List[str] = []
    abstract: Optional[str] = None
    synopsis: Optional[str] = None
    pageCount: Optional[int] = None
    launchDate: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    state: str
    rejectionReason: Optional[str] = None
    legalDeclaration: bool = False
    legalAcceptedAt: Optional[str] = None
    ai: Optional[AIReportSchema] = None
    timeline: List[TimelineEventSchema] = []
    notes: List[EditorNoteSchema] = []
    chapters: List[ChapterSchema] = []

    class Config:
        from_attributes = True

class PaginatedManuscripts(BaseModel):
    items: List[ManuscriptOut]
    page: int
    limit: int
    total: int
    totalPages: int

class EditorDecisionPayload(BaseModel):
    manuscript_id: str
    decision: str # "approve", "revise", "reject"
    actor: str
    feedback: Optional[str] = None
    rejection_reason: Optional[str] = None
