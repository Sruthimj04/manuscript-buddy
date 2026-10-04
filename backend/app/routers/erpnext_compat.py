import json
from typing import Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.manuscript import Manuscript, TimelineEvent, EditorNote
from app.models.chapter import Chapter
from app.auth.security import verify_password, create_access_token, hash_password
from app.auth.dependencies import get_current_user_optional
from app.services.otp_service import send_otp as do_send_otp, verify_otp as do_verify_otp
from app.routers.manuscripts import format_manuscript, generate_ai_report

router = APIRouter(prefix="/api/method", tags=["ERPNext Compatibility Layer"])

async def get_request_data(request: Request) -> dict:
    data = {}
    if request.method in ["POST", "PUT"]:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                data = await request.json()
            except Exception:
                data = {}
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form_data = await request.form()
            data = dict(form_data)
    # Include query params
    for k, v in request.query_params.items():
        data[k] = v
    return data

@router.post("/login")
@router.get("/login")
async def compat_login(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await get_request_data(request)
    usr = str(data.get("usr") or data.get("email") or "").strip().lower()
    pwd = str(data.get("pwd") or data.get("password") or "").strip()
    
    if not usr or not pwd:
        raise HTTPException(status_code=400, detail="Missing username/email or password")
        
    user = db.query(User).filter((User.email == usr) | (User.full_name.ilike(usr))).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid login credentials")

    if user.hashed_password:
        if not verify_password(pwd, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid login credentials")
        
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="sid", value=access_token)
    response.set_cookie(key="csrf_token", value="valid_csrf_token")
    
    return {
        "message": "Logged In",
        "access_token": access_token,
        "token": access_token,
        "token_type": "bearer",
        "full_name": user.full_name,
        "home_page": "/dashboard"
    }

@router.post("/logout")
@router.get("/logout")
async def compat_logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("sid")
    return {"message": "Logged Out"}

@router.api_route("/frappe.auth.get_logged_user", methods=["GET", "POST"])
async def get_logged_user(current_user: Optional[User] = Depends(get_current_user_optional)):
    if current_user:
        return {"message": current_user.email}
    return {"message": "Guest"}

@router.api_route("/frappe.client.get", methods=["GET", "POST"])
async def frappe_client_get(request: Request, db: Session = Depends(get_db)):
    data = await get_request_data(request)
    name = data.get("name")
    
    if not name or name == "Guest":
        raise HTTPException(status_code=404, detail="User not found")

    user = db.query(User).filter((User.email == name) | (User.id == name) | (User.full_name == name)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    role_mapping = {
        "admin": "Manuscript Admin",
        "editor": "Manuscript Editor",
        "author": "Manuscript Author"
    }
    role_name = role_mapping.get(user.role, "Manuscript Author")
    
    return {
        "message": {
            "name": user.email,
            "email": user.email,
            "full_name": user.full_name,
            "roles": [{"role": role_name}]
        }
    }

@router.api_route("/manuscript_management.api.author_send_otp", methods=["GET", "POST"])
async def author_send_otp(request: Request):
    data = await get_request_data(request)
    res = do_send_otp(str(data.get("mobile", "")), str(data.get("full_name", "")), str(data.get("email", "")))
    return {"message": res}

@router.api_route("/manuscript_management.api.author_verify_otp", methods=["GET", "POST"])
async def author_verify_otp(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await get_request_data(request)
    mobile = str(data.get("mobile", ""))
    otp = str(data.get("otp", ""))
    full_name = str(data.get("full_name", data.get("fullName", "Author")))
    email = str(data.get("email", f"user_{mobile.replace('+', '').replace(' ', '')}@example.com")).lower()
    password = str(data.get("password", data.get("pwd", "")))
    
    is_valid = do_verify_otp(mobile, otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    hashed_pwd = hash_password(password) if password else None

    try:
        user = db.query(User).filter((User.email == email) | (User.phone == mobile)).first()
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                phone=mobile,
                role="author",
                hashed_password=hashed_pwd
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if full_name and user.full_name in ("Author", "Guest"):
                user.full_name = full_name
            if email and "example.com" in user.email and "@" in email:
                user.email = email
            if hashed_pwd:
                user.hashed_password = hashed_pwd
            db.commit()
            db.refresh(user)
    except Exception:
        db.rollback()
        user = db.query(User).filter((User.email == email) | (User.phone == mobile)).first()
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                phone=mobile,
                role="author",
                hashed_password=hashed_pwd
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="sid", value=access_token)
    response.set_cookie(key="csrf_token", value="valid_csrf_token")
    
    return {
        "message": {
            "success": True,
            "access_token": access_token,
            "token": access_token,
            "token_type": "bearer",
            "user": {
                "name": user.full_name,
                "email": user.email,
                "role": user.role
            }
        }
    }

@router.api_route("/manuscript_management.api.author_resend_otp", methods=["GET", "POST"])
async def author_resend_otp(request: Request):
    data = await get_request_data(request)
    res = do_send_otp(str(data.get("mobile", "")), "Author", "")
    return {"message": res}

@router.api_route("/manuscript_management.api.list_manuscripts", methods=["GET", "POST"])
async def compat_list_manuscripts(request: Request, db: Session = Depends(get_db)):
    data = await get_request_data(request)
    page = int(data.get("page", 1))
    limit = int(data.get("limit", 100))
    sort_by = str(data.get("sort_by", "submittedAt"))
    sort_dir = str(data.get("sort_dir", "desc"))
    
    query = db.query(Manuscript)
    total = query.count()
    
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
    ms_list = query.offset(offset).limit(limit).all()
    
    items = [format_manuscript(m) for m in ms_list]
    import math
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    
    return {
        "message": {
            "items": items,
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages
        }
    }

@router.api_route("/manuscript_management.api.get_manuscript", methods=["GET", "POST"])
async def compat_get_manuscript(request: Request, db: Session = Depends(get_db)):
    data = await get_request_data(request)
    ms_id = data.get("manuscript_id") or data.get("id")
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.get_active_submission", methods=["GET", "POST"])
async def compat_get_active(db: Session = Depends(get_db)):
    active_states = ["Draft", "AI Processing", "Pending Editor Review", "Revisions Requested"]
    ms = db.query(Manuscript).filter(Manuscript.state.in_(active_states)).order_by(Manuscript.updated_at.desc()).first()
    if not ms:
        return {"message": None}
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.create_manuscript", methods=["GET", "POST"])
async def compat_create_manuscript(request: Request, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    req_data = await get_request_data(request)
    raw_data = req_data.get("data")
    if isinstance(raw_data, str):
        payload = json.loads(raw_data)
    elif isinstance(raw_data, dict):
        payload = raw_data
    else:
        payload = req_data
        
    title = payload.get("title", "Untitled Manuscript")
    author = payload.get("author", "Author")
    genre = payload.get("genre", "Fiction")
    
    ai = payload.get("ai") or generate_ai_report(title, genre, payload.get("secondaryGenre"), payload.get("pageCount"))
    
    ms = Manuscript(
        title=title,
        author=author,
        author_email=payload.get("authorEmail") or (current_user.email if current_user else None),
        user_id=current_user.id if current_user else None,
        state=payload.get("state") or "Draft",
        genre=genre,
        secondary_genre=payload.get("secondaryGenre"),
        audience=payload.get("audience"),
        keywords=payload.get("keywords") or [],
        abstract=payload.get("abstract"),
        synopsis=payload.get("synopsis"),
        page_count=payload.get("pageCount"),
        launch_date=payload.get("launchDate"),
        file_name=payload.get("fileName"),
        file_size=payload.get("fileSize"),
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
    
    event = TimelineEvent(
        manuscript_id=ms.id,
        actor=author,
        action="Draft Created"
    )
    db.add(event)
    
    chapters = payload.get("chapters")
    if chapters and isinstance(chapters, list):
        for idx, ch in enumerate(chapters, 1):
            ch_obj = Chapter(
                manuscript_id=ms.id,
                chapter_number=ch.get("chapterNumber", idx),
                chapter_title=ch.get("chapterTitle", f"Chapter {idx}"),
                chapter_content=ch.get("chapterContent", ""),
                images=ch.get("images") or []
            )
            db.add(ch_obj)
            
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.save_draft", methods=["GET", "POST"])
async def compat_save_draft(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    raw_data = req_data.get("data")
    data = json.loads(raw_data) if isinstance(raw_data, str) else (raw_data or {})
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    for field in ["title", "author", "genre", "secondaryGenre", "audience", "abstract", "synopsis"]:
        if field in data:
            db_field = "secondary_genre" if field == "secondaryGenre" else field
            setattr(ms, db_field, data[field])
            
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.create_chapter", methods=["GET", "POST"])
async def compat_create_chapter(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    raw_ch = req_data.get("chapter_data")
    ch_data = json.loads(raw_ch) if isinstance(raw_ch, str) else (raw_ch or {})
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    next_num = len(ms.chapters) + 1 if not ch_data.get("chapterNumber") else ch_data.get("chapterNumber")
    
    ch = Chapter(
        manuscript_id=ms.id,
        chapter_number=next_num,
        chapter_title=ch_data.get("chapterTitle", f"Chapter {next_num}"),
        chapter_content=ch_data.get("chapterContent", ""),
        images=ch_data.get("images") or []
    )
    db.add(ch)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.update_chapter", methods=["GET", "POST"])
async def compat_update_chapter(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    ch_name = req_data.get("chapter_name")
    raw_ch = req_data.get("chapter_data")
    ch_data = json.loads(raw_ch) if isinstance(raw_ch, str) else (raw_ch or {})
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ch = db.query(Chapter).filter((Chapter.id == ch_name) | (Chapter.chapter_title == ch_name)).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    if ch_data.get("chapterTitle"):
        ch.chapter_title = ch_data["chapterTitle"]
    if ch_data.get("chapterContent") is not None:
        ch.chapter_content = ch_data["chapterContent"]
    if ch_data.get("chapterNumber"):
        ch.chapter_number = ch_data["chapterNumber"]
        
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.delete_chapter", methods=["GET", "POST"])
async def compat_delete_chapter(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    ch_name = req_data.get("chapter_name")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ch = db.query(Chapter).filter((Chapter.id == ch_name) | (Chapter.chapter_title == ch_name)).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    db.delete(ch)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.upload_chapter_image", methods=["GET", "POST"])
async def compat_upload_chapter_image(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    ch_name = req_data.get("chapter_name")
    img_url = req_data.get("image_url") or "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800"
    caption = req_data.get("caption", "")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ch = db.query(Chapter).filter((Chapter.id == ch_name) | (Chapter.chapter_title == ch_name)).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    imgs = ch.images or []
    imgs.append({
        "name": f"img_{len(imgs)+1}",
        "imageFile": img_url,
        "caption": caption,
        "displayOrder": len(imgs) + 1
    })
    ch.images = imgs
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.accept_legal_declaration", methods=["GET", "POST"])
async def compat_accept_legal(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ms.legal_declaration = True
    from datetime import datetime, timezone
    ms.legal_accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.final_submit", methods=["GET", "POST"])
async def compat_final_submit(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
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
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.update_state", methods=["GET", "POST"])
async def compat_update_state(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    state = req_data.get("state")
    actor = req_data.get("actor", "System")
    action = req_data.get("action", f"State updated to {state}")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    if state:
        ms.state = state
    event = TimelineEvent(manuscript_id=ms.id, actor=actor, action=action)
    db.add(event)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.assign_editor", methods=["GET", "POST"])
async def compat_assign_editor(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    editor = req_data.get("editor")
    actor = req_data.get("actor", "Admin")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ms.assigned_editor = editor
    event = TimelineEvent(manuscript_id=ms.id, actor=actor, action=f"Assigned Editor: {editor}")
    db.add(event)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.add_editor_decision", methods=["GET", "POST"])
async def compat_add_editor_decision(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    decision = str(req_data.get("decision", "")).lower()
    actor = req_data.get("actor", "Editor")
    feedback = req_data.get("feedback")
    rejection_reason = req_data.get("rejection_reason")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    if decision == "approve":
        ms.state = "Approved"
        action = "Approved Manuscript"
    elif decision == "revise":
        ms.state = "Revisions Requested"
        action = "Requested Revisions"
    elif decision == "reject":
        ms.state = "Rejected"
        ms.rejection_reason = rejection_reason or "Does not meet current publishing criteria."
        action = f"Rejected Manuscript: {ms.rejection_reason}"
    else:
        raise HTTPException(status_code=400, detail="Invalid decision option")
        
    if feedback:
        note = EditorNote(manuscript_id=ms.id, note_author=actor, body=feedback)
        db.add(note)
        
    event = TimelineEvent(manuscript_id=ms.id, actor=actor, action=action)
    db.add(event)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}

@router.api_route("/manuscript_management.api.upload_revision", methods=["GET", "POST"])
async def compat_upload_revision(request: Request, db: Session = Depends(get_db)):
    req_data = await get_request_data(request)
    ms_id = req_data.get("manuscript_id")
    file_name = req_data.get("file_name", "Revised_Manuscript.pdf")
    actor = req_data.get("actor", "Author")
    
    ms = db.query(Manuscript).filter(Manuscript.id == ms_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
        
    ms.file_name = file_name
    ms.state = "Pending Editor Review"
    event = TimelineEvent(manuscript_id=ms.id, actor=actor, action=f"Uploaded Revision: {file_name}")
    db.add(event)
    db.commit()
    db.refresh(ms)
    return {"message": format_manuscript(ms)}
