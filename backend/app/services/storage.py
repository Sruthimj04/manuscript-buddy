import os
import uuid
from fastapi import UploadFile
from app.config import settings

os.makedirs(settings.STORAGE_DIR, exist_ok=True)

async def save_upload_file(file: UploadFile) -> dict:
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    saved_filename = f"{file_id}{ext}"
    filepath = os.path.join(settings.STORAGE_DIR, saved_filename)
    
    contents = await file.read()
    size = len(contents)
    
    with open(filepath, "wb") as f:
        f.write(contents)
        
    return {
        "file_name": file.filename,
        "file_size": size,
        "file_path": filepath,
        "file_url": f"/uploads/{saved_filename}"
    }
