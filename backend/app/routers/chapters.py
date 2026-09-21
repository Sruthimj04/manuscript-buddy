from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.manuscript import Manuscript
from app.models.chapter import Chapter
from app.schemas.manuscript import ChapterSchema
from app.routers.manuscripts import format_manuscript
from app.services.storage import save_upload_file

router = APIRouter(prefix="/manuscripts/{manuscript_id}/chapters", tags=["Chapters"])

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_chapter(manuscript_id: str, payload: ChapterSchema, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    next_num = len(ms.chapters) + 1 if not payload.chapterNumber else payload.chapterNumber
    
    chapter = Chapter(
        manuscript_id=ms.id,
        chapter_number=next_num,
        chapter_title=payload.chapterTitle,
        chapter_content=payload.chapterContent or "",
        images=[img.dict() for img in payload.images] if payload.images else []
    )
    db.add(chapter)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.put("/{chapter_name}", response_model=dict)
def update_chapter(manuscript_id: str, chapter_name: str, payload: ChapterSchema, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    chapter = db.query(Chapter).filter((Chapter.id == chapter_name) | (Chapter.chapter_title == chapter_name)).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    if payload.chapterTitle:
        chapter.chapter_title = payload.chapterTitle
    if payload.chapterContent is not None:
        chapter.chapter_content = payload.chapterContent
    if payload.chapterNumber:
        chapter.chapter_number = payload.chapterNumber
    if payload.images is not None:
        chapter.images = [img.dict() for img in payload.images]
        
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.delete("/{chapter_name}", response_model=dict)
def delete_chapter(manuscript_id: str, chapter_name: str, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    chapter = db.query(Chapter).filter((Chapter.id == chapter_name) | (Chapter.chapter_title == chapter_name)).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    db.delete(chapter)
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)

@router.post("/{chapter_name}/image", response_model=dict)
async def upload_chapter_image(
    manuscript_id: str,
    chapter_name: str,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    caption: Optional[str] = Form(""),
    db: Session = Depends(get_db)
):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    chapter = db.query(Chapter).filter((Chapter.id == chapter_name) | (Chapter.chapter_title == chapter_name)).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    url = image_url
    if file:
        res = await save_upload_file(file)
        url = res["file_url"]
        
    if not url:
        raise HTTPException(status_code=400, detail="No image file or URL provided")
        
    current_images = chapter.images or []
    new_image = {
        "name": f"img_{len(current_images)+1}",
        "imageFile": url,
        "caption": caption or "",
        "displayOrder": len(current_images) + 1
    }
    current_images.append(new_image)
    chapter.images = current_images
    
    db.commit()
    db.refresh(ms)
    return format_manuscript(ms)
