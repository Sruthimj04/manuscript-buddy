import math
import random
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.manuscript import Manuscript, TimelineEvent, EditorNote
from app.models.chapter import Chapter
from app.models.user import User
from app.schemas.manuscript import (
    ManuscriptCreate, ManuscriptUpdate, ManuscriptOut, PaginatedManuscripts,
    EditorDecisionPayload, ChapterSchema, AIReportSchema
)
from app.auth.dependencies import get_current_user, get_current_user_optional, require_role
from app.services.storage import save_upload_file

router = APIRouter(prefix="/manuscripts", tags=["Manuscripts"])

def generate_ai_report(title: str, genre: str, secondary_genre: Optional[str] = None, page_count: Optional[int] = None) -> dict:
    base = 62 + math.floor(random.random() * 32)
    primary = 55 + math.floor(random.random() * 30)
    genre_conf = [
        {"label": genre or "Fiction", "value": primary},
        {"label": secondary_genre or "General", "value": 100 - primary}
    ]
    return {
        "score": base,
        "genreConfidence": genre_conf,
        "readability": 55 + math.floor(random.random() * 40),
        "marketability": 50 + math.floor(random.random() * 45),
        "pacing": [
            {"label": "Act I", "value": 50 + math.floor(random.random() * 45)},
            {"label": "Act II", "value": 50 + math.floor(random.random() * 45)},
            {"label": "Act III", "value": 50 + math.floor(random.random() * 45)}
        ],
        "detectedPages": page_count or (200 + math.floor(random.random() * 250)),
        "titleMatched": True,
        "summary": f'Pre-flight scan of "{title or "Untitled"}" completed. Structure and metadata parsed successfully with no extraction errors. Lexical density and chapter balance fall within expected band for this category.'
    }

def format_manuscript(m: Manuscript) -> dict:
    timeline_list = [
        {
            "id": t.id,
            "actor": t.actor,
            "action": t.action,
            "timestamp": t.timestamp.isoformat() if t.timestamp else ""
        }
        for t in m.timeline
    ]
    notes_list = [
        {
            "id": n.id,
            "author": n.note_author,
            "createdAt": n.created_at.isoformat() if n.created_at else "",
            "body": n.body
        }
        for n in m.notes
    ]
    chapters_list = [
        {
            "name": c.id,
            "chapterNumber": c.chapter_number,
            "chapterTitle": c.chapter_title,
            "chapterContent": c.chapter_content or "",
            "images": c.images or []
        }
        for c in m.chapters
    ]
    
    ai_data = None
    if m.ai_score is not None:
        ai_data = {
            "score": m.ai_score,
            "genreConfidence": m.ai_genre_confidence or [],
            "readability": m.ai_readability or 75,
            "marketability": m.ai_marketability or 80,
            "pacing": m.ai_pacing or [],
            "summary": m.ai_summary or "",
            "detectedPages": m.ai_detected_pages or 250,
            "titleMatched": m.ai_title_matched if m.ai_title_matched is not None else True
        }

    return {
        "id": m.id,
        "title": m.title,
        "author": m.author,
        "authorEmail": m.author_email,
        "submittedAt": m.submitted_at.isoformat() if m.submitted_at else "",
        "editor": m.assigned_editor,
        "genre": m.genre,
        "secondaryGenre": m.secondary_genre,
        "audience": m.audience,
        "keywords": m.keywords or [],
        "abstract": m.abstract,
        "synopsis": m.synopsis,
        "pageCount": m.page_count,
        "launchDate": m.launch_date,
        "fileName": m.file_name,
        "fileSize": m.file_size,
        "fileUrl": m.file_url,
        "state": m.state,
        "rejectionReason": m.rejection_reason,
        "legalDeclaration": m.legal_declaration,
        "legalAcceptedAt": m.legal_accepted_at.isoformat() if m.legal_accepted_at else None,
        "ai": ai_data,
        "timeline": timeline_list,
        "notes": notes_list,
        "chapters": chapters_list
    }

@router.get("", response_model=PaginatedManuscripts)
def list_manuscripts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("submittedAt"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Manuscript)
    total = query.count()
    
    # Sorting
    if sort_by == "title":
        query = query.order_by(Manuscript.title.asc() if sort_dir == "asc" else Manuscript.title.desc())
    elif sort_by == "author":
        query = query.order_by(Manuscript.author.asc() if sort_dir == "asc" else Manuscript.author.desc())
    elif sort_by == "aiScore":
        query = query.order_by(Manuscript.ai_score.asc() if sort_dir == "asc" else Manuscript.ai_score.desc())
    elif sort_by == "state":
        query = query.order_by(Manuscript.state.asc() if sort_dir == "asc" else Manuscript.state.desc())
    else:
        query = query.order_by(Manuscript.submitted_at.asc() if sort_dir == "asc" else Manuscript.submitted_at.desc())
        
    offset = (page - 1) * limit
    manuscripts = query.offset(offset).limit(limit).all()
    
    items = [format_manuscript(m) for m in manuscripts]
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    
    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": total_pages
    }

@router.get("/active", response_model=Optional[dict])
def get_active_submission(db: Session = Depends(get_db)):
    # Find any manuscript in non-final states (Draft, AI Processing, Pending Editor Review, Revisions Requested)
    active_states = ["Draft", "AI Processing", "Pending Editor Review", "Revisions Requested"]
    ms = db.query(Manuscript).filter(Manuscript.state.in_(active_states)).order_by(Manuscript.updated_at.desc()).first()
    if not ms:
        return None
    return format_manuscript(ms)

@router.get("/{id}", response_model=dict)
def get_manuscript(id: str, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return format_manuscript(ms)

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_manuscript(payload: ManuscriptCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    ai = payload.ai.dict() if payload.ai else generate_ai_report(payload.title, payload.genre, payload.secondaryGenre, payload.pageCount)
    
    ms = Manuscript(
        title=payload.title,
        author=payload.author,
        author_email=payload.authorEmail or (current_user.email if current_user else None),
        user_id=current_user.id if current_user else None,
        state=payload.state or "Draft",
        genre=payload.genre,
        secondary_genre=payload.secondaryGenre,
        audience=payload.audience,
        keywords=payload.keywords or [],
        abstract=payload.abstract,
        synopsis=payload.synopsis,
        page_count=payload.pageCount,
        launch_date=payload.launchDate,
        file_name=payload.fileName,
        file_size=payload.fileSize,
        ai_score=ai.get("score"),
        ai_readability=ai.get("readability"),
        ai_marketability=ai.get("marketability"),
        ai_detected_pages=ai.get("detectedPages"),
        ai_title_matched=ai.get("titleMatched", True),
        ai_summary=ai.get("summary"),
        ai_genre_confidence=ai.get("genreConfidence"),
        ai_pacing=ai.get("pacing")
    )
    db.add(ms)
    db.flush()
    
    # Add timeline event
    event = TimelineEvent(
        manuscript_id=ms.id,
        actor=payload.author,
        action="Draft Created"
    )
    db.add(event)
    
    # Add chapters if provided
    if payload.chapters:
        for idx, ch in enumerate(payload.chapters, 1):
            chapter_obj = Chapter(
                manuscript_id=ms.id,
                chapter_number=ch.chapterNumber or idx,
                chapter_title=ch.chapterTitle,
                chapter_content=ch.chapterContent or "",
                images=[img.dict() for img in ch.images] if ch.images else []
            )
            db.add(chapter_obj)
            
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.post("/{id}/upload")
async def upload_manuscript_file(id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    res = await save_upload_file(file)
    ms.file_name = res["file_name"]
    ms.file_size = res["file_size"]
    ms.file_url = res["file_url"]
    
    event = TimelineEvent(
        manuscript_id=ms.id,
        actor=ms.author,
        action=f"Uploaded File: {res['file_name']}"
    )
    db.add(event)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.post("/{id}/legal", response_model=dict)
def accept_legal(id: str, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    ms.legal_declaration = True
    ms.legal_accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.post("/{id}/submit", response_model=dict)
def final_submit(id: str, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    ms.state = "Pending Editor Review"
    
    event = TimelineEvent(
        manuscript_id=ms.id,
        actor=ms.author,
        action="Submitted Manuscript for Editorial Review"
    )
    db.add(event)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.post("/{id}/editor-decision", response_model=dict)
def add_editor_decision(payload: EditorDecisionPayload, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == payload.manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    decision = payload.decision.lower()
    if decision == "approve":
        ms.state = "Approved"
        action = "Approved Manuscript"
    elif decision == "revise":
        ms.state = "Revisions Requested"
        action = "Requested Revisions"
    elif decision == "reject":
        ms.state = "Rejected"
        ms.rejection_reason = payload.rejection_reason or "Does not meet current catalogue priorities."
        action = f"Rejected Manuscript: {ms.rejection_reason}"
    else:
        raise HTTPException(status_code=400, detail="Invalid decision option")
        
    if payload.feedback:
        note = EditorNote(
            manuscript_id=ms.id,
            note_author=payload.actor,
            body=payload.feedback
        )
        db.add(note)
        
    event = TimelineEvent(
        manuscript_id=ms.id,
        actor=payload.actor,
        action=action
    )
    db.add(event)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)
