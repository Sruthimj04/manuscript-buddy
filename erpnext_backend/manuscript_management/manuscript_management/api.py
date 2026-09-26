"""
Whitelisted API endpoints for the Manuscript Management app.

Every function here is accessible at:
  POST /api/method/manuscript_management.api.<function_name>

The React frontend calls these via the erpnextClient helper.
"""

import json
import math
import random

import frappe
from frappe import _

from manuscript_management.otp_service import (
    normalize_phone,
    resend_otp as _resend_otp,
    send_otp as _send_otp,
    validate_phone,
    verify_otp as _verify_otp,
)

# ── Helpers ────────────────────────────────────────────────────────────────── #

def __init_role():
    if not frappe.db.exists("Role", "Manuscript Author"):
        frappe.get_doc({"doctype": "Role", "role_name": "Manuscript Author"}).insert(ignore_permissions=True)
        frappe.db.commit()
        
    doctype = "Manuscript Submission"
    role = "Manuscript Author"
    if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
        perm = frappe.new_doc("Custom DocPerm")
        perm.parent = doctype
        perm.parenttype = "DocType"
        perm.parentfield = "permissions"
        perm.role = role
        perm.read = 1
        perm.write = 1
        perm.create = 1
        perm.if_owner = 1 # Only own manuscripts
        perm.insert(ignore_permissions=True)
        frappe.db.commit()

DOCTYPE = "Manuscript Submission"

# States considered "active" (not completed or terminal)
ACTIVE_STATES = ["Draft", "AI Processing", "Pending Editor Review", "Revisions Requested", "Approved"]


def _add_timeline_event(doc, actor, action):
    """Append a timeline row and return the doc (unsaved)."""
    doc.append("timeline_events", {
        "actor": actor,
        "action": action,
        "timestamp": frappe.utils.now_datetime(),
    })
    return doc


def _parse_json_field(value):
    """Safely parse a JSON string field, returning [] on failure."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []


def _serialize_chapter(row):
    """Convert a chapter child row into frontend JSON."""
    images = []
    if hasattr(row, "images") and row.images:
        for img in row.images:
            images.append({
                "name": img.name,
                "imageFile": img.image_file or "",
                "caption": img.caption or "",
                "displayOrder": img.display_order or 0,
            })
    return {
        "name": row.name,
        "chapterNumber": row.chapter_number or 0,
        "chapterTitle": row.chapter_title or "",
        "chapterContent": row.chapter_content or "",
        "images": images,
    }


def _serialize_manuscript(doc):
    """Convert a Frappe doc into the JSON shape the React frontend expects."""
    ai = None
    if doc.ai_score:
        ai = {
            "score": doc.ai_score or 0,
            "genreConfidence": _parse_json_field(doc.ai_genre_confidence),
            "readability": doc.ai_readability or 0,
            "marketability": doc.ai_marketability or 0,
            "pacing": _parse_json_field(doc.ai_pacing),
            "summary": doc.ai_summary or "",
            "detectedPages": doc.ai_detected_pages or 0,
            "titleMatched": bool(doc.ai_title_matched),
        }

    timeline = []
    for row in doc.timeline_events:
        timeline.append({
            "id": row.name,
            "actor": row.actor,
            "action": row.action,
            "timestamp": str(row.timestamp),
        })

    notes = []
    for row in doc.editor_notes:
        notes.append({
            "id": row.name,
            "author": row.note_author,
            "createdAt": str(row.created_at),
            "body": row.body,
        })

    keywords = []
    if doc.keywords:
        keywords = [k.strip() for k in doc.keywords.split(",") if k.strip()]

    chapters = []
    if hasattr(doc, "chapters") and doc.chapters:
        for ch in doc.chapters:
            chapters.append(_serialize_chapter(ch))

    return {
        "id": doc.name,
        "title": doc.title,
        "author": doc.author,
        "authorEmail": doc.author_email or None,
        "submittedAt": str(doc.submitted_at) if doc.submitted_at else "",
        "state": doc.state,
        "editor": doc.assigned_editor or None,
        "genre": doc.genre,
        "secondaryGenre": doc.secondary_genre or None,
        "audience": doc.audience or None,
        "keywords": keywords,
        "abstract": doc.abstract or None,
        "synopsis": doc.synopsis or None,
        "pageCount": doc.page_count or None,
        "launchDate": doc.launch_date or None,
        "fileName": doc.file_name or None,
        "fileSize": doc.file_size or None,
        "rejectionReason": doc.rejection_reason or None,
        "ai": ai,
        "timeline": timeline,
        "notes": notes,
        "chapters": chapters,
        "legalDeclaration": bool(doc.legal_declaration) if hasattr(doc, "legal_declaration") else False,
        "legalAcceptedAt": str(doc.legal_accepted_at) if hasattr(doc, "legal_accepted_at") and doc.legal_accepted_at else None,
    }


# ── OTP / Signup API ──────────────────────────────────────────────────────── #


@frappe.whitelist(allow_guest=True)
def author_send_otp(mobile, full_name=None, email=None):
    """Send OTP to author's mobile for signup verification.

    Args:
        mobile: Phone number (with country code)
        full_name: Author's full name (stored temporarily for account creation)
        email: Author's email address
    """
    # Bypass CSRF for unauthenticated signup requests
    frappe.flags.ignore_csrf = True

    if not mobile:
        frappe.throw(_("Phone number is required"))

    mobile = validate_phone(mobile)

    # Store signup details temporarily in cache for use after verification
    if full_name and email:
        # Validate email format
        if not frappe.utils.validate_email_address(email):
            frappe.throw(_("Please enter a valid email address"))

        # Check if email already exists as a user
        if frappe.db.exists("User", email):
            existing_user = frappe.get_doc("User", email)
            if existing_user.enabled:
                frappe.throw(_("An account with this email already exists. Please log in instead."))

        cache_key = f"signup_data:{mobile}"
        frappe.cache().set(cache_key, json.dumps({
            "full_name": full_name,
            "email": email,
            "mobile": mobile,
        }), ex=600)  # 10 minutes

    result = _send_otp(mobile)
    return {"success": True, "message": "OTP sent to your phone number"}


@frappe.whitelist(allow_guest=True)
def author_verify_otp(mobile, otp):
    """Verify OTP and create/login author account.

    Args:
        mobile: Phone number used for OTP
        otp: The OTP entered by the user

    Returns:
        User info on success (name, email, role)
    """
    # Bypass CSRF for unauthenticated signup requests
    frappe.flags.ignore_csrf = True

    if not mobile or not otp:
        frappe.throw(_("Phone number and OTP are required"))

    mobile = validate_phone(mobile)

    # Verify OTP with MSG91 (server-side only)
    result = _verify_otp(mobile, otp)

    if not result.get("success"):
        frappe.throw(_("OTP verification failed"))

    # Retrieve signup data from cache
    cache_key = f"signup_data:{mobile}"
    signup_data_raw = frappe.cache().get(cache_key)

    if not signup_data_raw:
        frappe.throw(_("Signup session expired. Please start over."))

    if isinstance(signup_data_raw, bytes):
        signup_data_raw = signup_data_raw.decode("utf-8")

    signup_data = json.loads(signup_data_raw)
    email = signup_data.get("email")
    full_name = signup_data.get("full_name")

    if not email:
        frappe.throw(_("Email not found in signup session"))

    # Create or update the Frappe User
    if frappe.db.exists("User", email):
        user_doc = frappe.get_doc("User", email)
        user_doc.enabled = 1
        user_doc.full_name = full_name or user_doc.full_name
        user_doc.mobile_no = mobile
        # Add phone_verified custom field if not set
        if hasattr(user_doc, "phone_verified"):
            user_doc.phone_verified = 1
        # Ensure the user has the Manuscript Author role
        if not any(r.role == "Manuscript Author" for r in user_doc.roles):
            user_doc.append("roles", {"role": "Manuscript Author"})
        user_doc.save(ignore_permissions=True)
    else:
        # Clear this mobile number from any old user to avoid unique-constraint errors
        old_users = frappe.get_all("User", filters={"mobile_no": mobile}, pluck="name")
        for old_email in old_users:
            frappe.db.set_value("User", old_email, "mobile_no", "", update_modified=False)

        user_doc = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": full_name.split()[0] if full_name else "Author",
            "last_name": " ".join(full_name.split()[1:]) if full_name and len(full_name.split()) > 1 else "",
            "full_name": full_name or "Author",
            "mobile_no": mobile,
            "enabled": 1,
            "new_password": frappe.generate_hash(length=12),  # Random password (OTP-verified users)
            "send_welcome_email": 0,
        })
        # Add role BEFORE insert so Frappe doesn't warn about "no roles enabled"
        user_doc.append("roles", {"role": "Manuscript Author"})
        user_doc.insert(ignore_permissions=True)

    frappe.db.commit()

    # Clean up cache
    frappe.cache().delete(cache_key)

    # Log the user in (establish Frappe session)
    from frappe.auth import LoginManager
    frappe.local.login_manager = LoginManager()
    frappe.local.login_manager.login_as(email)

    # Determine role
    roles = [r.role for r in user_doc.roles]
    if "Manuscript Admin" in roles or "System Manager" in roles:
        role = "admin"
    elif "Manuscript Editor" in roles:
        role = "editor"
    else:
        role = "author"

    return {
        "success": True,
        "user": {
            "name": user_doc.full_name,
            "email": user_doc.email,
            "role": role,
        },
    }


@frappe.whitelist(allow_guest=True)
def author_resend_otp(mobile):
    """Resend OTP to author's mobile.

    Args:
        mobile: Phone number (with country code)
    """
    # Bypass CSRF for unauthenticated signup requests
    frappe.flags.ignore_csrf = True

    if not mobile:
        frappe.throw(_("Phone number is required"))

    mobile = validate_phone(mobile)
    result = _resend_otp(mobile)
    return {"success": True, "message": "OTP resent to your phone number"}


# ── Manuscript CRUD ────────────────────────────────────────────────────────── #


@frappe.whitelist()
def list_manuscripts(page=1, limit=10, sort_by="submitted_at", sort_dir="desc"):
    """Return a paginated, sorted list of manuscripts."""
    page = int(page)
    limit = int(limit)
    offset = (page - 1) * limit

    # Map frontend sort keys to DocType field names
    sort_map = {
        "title": "title",
        "author": "author",
        "submittedAt": "submitted_at",
        "aiScore": "ai_score",
        "state": "state",
    }
    order_field = sort_map.get(sort_by, "submitted_at")
    order_dir = "ASC" if sort_dir == "asc" else "DESC"

    # Build filters — authors only see their own submissions
    filters = {}
    user_roles = frappe.get_roles(frappe.session.user)
    if "System Manager" not in user_roles and "Manuscript Admin" not in user_roles and "Manuscript Editor" not in user_roles:
        filters["author_email"] = frappe.session.user

    total = frappe.db.count(DOCTYPE, filters=filters)
    names = frappe.get_all(
        DOCTYPE,
        fields=["name"],
        filters=filters,
        order_by=f"{order_field} {order_dir}",
        start=offset,
        page_length=limit,
    )

    items = []
    for row in names:
        doc = frappe.get_doc(DOCTYPE, row.name)
        items.append(_serialize_manuscript(doc))

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": max(1, math.ceil(total / limit)),
    }


@frappe.whitelist()
def get_manuscript(manuscript_id):
    """Return a single manuscript by its ID (name)."""
    if not frappe.db.exists(DOCTYPE, manuscript_id):
        frappe.throw(_("Manuscript {0} not found").format(manuscript_id), frappe.DoesNotExistError)

    doc = frappe.get_doc(DOCTYPE, manuscript_id)
    return _serialize_manuscript(doc)


@frappe.whitelist()
def get_active_submission():
    """Return the current user's active (non-terminal) manuscript submission, or None."""
    user_email = frappe.session.user

    active = frappe.get_all(
        DOCTYPE,
        filters={
            "author_email": user_email,
            "state": ["in", ACTIVE_STATES],
        },
        fields=["name"],
        order_by="submitted_at DESC",
        page_length=1,
    )

    if active:
        doc = frappe.get_doc(DOCTYPE, active[0].name)
        return _serialize_manuscript(doc)

    return None


@frappe.whitelist()
def create_manuscript(data):
    try:
        return _create_manuscript(data)
    except Exception as e:
        import traceback
        frappe.throw(traceback.format_exc())

def _create_manuscript(data):
    """Create a new manuscript submission.

    Args:
        data: JSON string or dict with manuscript fields.
    """
    if isinstance(data, str):
        data = json.loads(data)

    user_email = frappe.session.user

    # ── One-active-submission enforcement ──────────────────────────────── #
    existing_active = frappe.get_all(
        DOCTYPE,
        filters={
            "author_email": user_email,
            "state": ["in", ACTIVE_STATES],
        },
        fields=["name"],
        page_length=1,
    )
    if existing_active:
        frappe.throw(
            _("You already have an active submission ({0}). Complete or withdraw it before starting a new one.").format(
                existing_active[0].name
            )
        )

    doc = frappe.new_doc(DOCTYPE)
    doc.title = data.get("title", "Untitled")
    doc.author = data.get("author", frappe.session.user)
    doc.author_email = user_email
    doc.genre = data.get("genre", "Fiction")
    doc.secondary_genre = data.get("secondaryGenre") or ""
    doc.audience = data.get("audience") or "General"
    doc.keywords = ", ".join(data.get("keywords", []))
    doc.abstract = data.get("abstract") or ""
    doc.synopsis = data.get("synopsis") or ""
    doc.page_count = data.get("pageCount") or 0
    doc.launch_date = data.get("launchDate") or None
    doc.file_name = data.get("fileName") or ""
    doc.file_size = data.get("fileSize") or 0
    doc.state = data.get("state") or "Draft"
    doc.submitted_at = frappe.utils.now_datetime()

    # Set AI report if provided
    ai = data.get("ai")
    if ai:
        doc.ai_score = ai.get("score", 0)
        doc.ai_readability = ai.get("readability", 0)
        doc.ai_marketability = ai.get("marketability", 0)
        doc.ai_detected_pages = ai.get("detectedPages", 0)
        doc.ai_title_matched = 1 if ai.get("titleMatched") else 0
        doc.ai_summary = ai.get("summary", "")
        doc.ai_genre_confidence = json.dumps(ai.get("genreConfidence", []))
        doc.ai_pacing = json.dumps(ai.get("pacing", []))

    # Add chapters if provided
    chapters = data.get("chapters", [])
    for ch in chapters:
        chapter_row = doc.append("chapters", {
            "chapter_number": ch.get("chapterNumber", 1),
            "chapter_title": ch.get("chapterTitle", ""),
            "chapter_content": ch.get("chapterContent", ""),
        })
        # Add images if provided
        for img in ch.get("images", []):
            chapter_row.append("images", {
                "image_file": img.get("imageFile", ""),
                "caption": img.get("caption", ""),
                "display_order": img.get("displayOrder", 0),
            })

    _add_timeline_event(doc, doc.author, "Manuscript created as draft")

    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def save_draft(manuscript_id, data):
    """Save/update a draft manuscript.

    Args:
        manuscript_id: The manuscript ID
        data: JSON string or dict with updated fields
    """
    if isinstance(data, str):
        data = json.loads(data)

    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    # Verify ownership
    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only edit your own manuscripts"), frappe.PermissionError)

    # Only allow editing drafts
    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("This manuscript cannot be edited in its current state ({0})").format(doc.state))

    # Update fields
    if "title" in data:
        doc.title = data["title"]
    if "genre" in data:
        doc.genre = data["genre"]
    if "secondaryGenre" in data:
        doc.secondary_genre = data["secondaryGenre"] or ""
    if "audience" in data:
        doc.audience = data["audience"]
    if "keywords" in data:
        doc.keywords = ", ".join(data.get("keywords", []))
    if "abstract" in data:
        doc.abstract = data["abstract"]
    if "synopsis" in data:
        doc.synopsis = data["synopsis"]
    if "pageCount" in data:
        doc.page_count = data["pageCount"] or 0
    if "launchDate" in data:
        doc.launch_date = data["launchDate"] or None
    if "fileName" in data:
        doc.file_name = data["fileName"] or ""
    if "fileSize" in data:
        doc.file_size = data["fileSize"] or 0

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


# ── Chapter CRUD ───────────────────────────────────────────────────────────── #


@frappe.whitelist()
def create_chapter(manuscript_id, chapter_data):
    """Add a new chapter to a manuscript.

    Args:
        manuscript_id: The manuscript ID
        chapter_data: JSON string or dict with chapter fields
    """
    if isinstance(chapter_data, str):
        chapter_data = json.loads(chapter_data)

    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    # Verify ownership
    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only edit your own manuscripts"), frappe.PermissionError)

    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("Chapters cannot be added in state: {0}").format(doc.state))

    # Determine next chapter number
    max_num = max([ch.chapter_number for ch in doc.chapters], default=0)

    chapter_row = doc.append("chapters", {
        "chapter_number": chapter_data.get("chapterNumber", max_num + 1),
        "chapter_title": chapter_data.get("chapterTitle", f"Chapter {max_num + 1}"),
        "chapter_content": chapter_data.get("chapterContent", ""),
    })

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def update_chapter(manuscript_id, chapter_name, chapter_data):
    """Update an existing chapter.

    Args:
        manuscript_id: The manuscript ID
        chapter_name: The child table row name (Frappe auto-generated ID)
        chapter_data: JSON string or dict with updated chapter fields
    """
    if isinstance(chapter_data, str):
        chapter_data = json.loads(chapter_data)

    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only edit your own manuscripts"), frappe.PermissionError)

    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("Chapters cannot be edited in state: {0}").format(doc.state))

    # Find the chapter row
    chapter = None
    for ch in doc.chapters:
        if ch.name == chapter_name:
            chapter = ch
            break

    if not chapter:
        frappe.throw(_("Chapter not found"))

    if "chapterTitle" in chapter_data:
        chapter.chapter_title = chapter_data["chapterTitle"]
    if "chapterContent" in chapter_data:
        chapter.chapter_content = chapter_data["chapterContent"]
    if "chapterNumber" in chapter_data:
        chapter.chapter_number = chapter_data["chapterNumber"]

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def delete_chapter(manuscript_id, chapter_name):
    """Remove a chapter from a manuscript.

    Args:
        manuscript_id: The manuscript ID
        chapter_name: The child table row name
    """
    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only edit your own manuscripts"), frappe.PermissionError)

    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("Chapters cannot be deleted in state: {0}").format(doc.state))

    # Find and remove the chapter
    found = False
    for i, ch in enumerate(doc.chapters):
        if ch.name == chapter_name:
            doc.chapters.pop(i)
            found = True
            break

    if not found:
        frappe.throw(_("Chapter not found"))

    # Renumber remaining chapters
    for idx, ch in enumerate(doc.chapters):
        ch.chapter_number = idx + 1

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def upload_chapter_image(manuscript_id, chapter_name, image_url, caption=""):
    """Associate an uploaded image with a chapter.

    The image should already be uploaded via Frappe's file upload API.
    This endpoint links it to the correct chapter.

    Args:
        manuscript_id: The manuscript ID
        chapter_name: The chapter child table row name
        image_url: The Frappe file URL of the uploaded image
        caption: Optional image caption
    """
    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only edit your own manuscripts"), frappe.PermissionError)

    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("Cannot add images in state: {0}").format(doc.state))

    # Find the chapter
    chapter = None
    for ch in doc.chapters:
        if ch.name == chapter_name:
            chapter = ch
            break

    if not chapter:
        frappe.throw(_("Chapter not found"))

    # Add the image
    max_order = max([img.display_order for img in chapter.images], default=0) if chapter.images else 0
    chapter.append("images", {
        "image_file": image_url,
        "caption": caption or "",
        "display_order": max_order + 1,
    })

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


# ── Final Submission ───────────────────────────────────────────────────────── #


@frappe.whitelist()
def final_submit(manuscript_id):
    """Validate and finalize a manuscript submission.

    Performs comprehensive server-side validation before transitioning
    the manuscript from Draft to AI Processing.

    Args:
        manuscript_id: The manuscript ID
    """
    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    # 1. Authentication & ownership
    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only submit your own manuscripts"), frappe.PermissionError)

    # 2. State check
    if doc.state not in ("Draft", "Revisions Requested"):
        frappe.throw(_("This manuscript cannot be submitted in its current state ({0})").format(doc.state))

    # 3. Required fields
    if not (doc.title or "").strip():
        frappe.throw(_("Manuscript title is required"))

    if not doc.genre:
        frappe.throw(_("Genre is required"))

    # 4. Chapter validation
    if not doc.chapters or len(doc.chapters) == 0:
        frappe.throw(_("At least one chapter is required"))

    for ch in doc.chapters:
        if not (ch.chapter_title or "").strip():
            frappe.throw(_("Chapter {0} requires a title").format(ch.chapter_number))

    # 5. Legal declaration (server-side — never trust frontend checkbox alone)
    if not doc.legal_declaration:
        frappe.throw(_("You must accept the original work declaration before submitting"))

    # 6. One-active-submission (double-check for race conditions)
    other_active = frappe.get_all(
        DOCTYPE,
        filters={
            "author_email": frappe.session.user,
            "state": ["in", ["AI Processing", "Pending Editor Review"]],
            "name": ["!=", manuscript_id],
        },
        fields=["name"],
        page_length=1,
    )
    if other_active:
        frappe.throw(_("You already have another active submission ({0})").format(other_active[0].name))

    # ── All validations passed — submit ────────────────────────────────── #
    doc.state = "AI Processing"
    doc.submitted_at = frappe.utils.now_datetime()

    _add_timeline_event(doc, doc.author, "Manuscript submitted for review")
    _add_timeline_event(doc, "AI Engine", "AI processing started")

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def accept_legal_declaration(manuscript_id):
    """Record the author's legal declaration acceptance.

    This must be called from the frontend as an explicit action.
    The backend records who accepted and when.

    Args:
        manuscript_id: The manuscript ID
    """
    doc = frappe.get_doc(DOCTYPE, manuscript_id)

    if doc.author_email and doc.author_email != frappe.session.user:
        frappe.throw(_("You can only accept declarations for your own manuscripts"), frappe.PermissionError)

    doc.legal_declaration = 1
    doc.legal_accepted_at = frappe.utils.now_datetime()
    doc.legal_accepted_by = frappe.session.user

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


# ── Existing Workflow API (preserved) ──────────────────────────────────────── #


@frappe.whitelist()
def update_state(manuscript_id, state, actor, action=None):
    """Update the workflow state of a manuscript."""
    doc = frappe.get_doc(DOCTYPE, manuscript_id)
    doc.state = state
    _add_timeline_event(doc, actor, action or f"Status changed to {state}")
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def assign_editor(manuscript_id, editor, actor):
    """Assign or change the editor on a manuscript."""
    doc = frappe.get_doc(DOCTYPE, manuscript_id)
    doc.assigned_editor = "" if editor == "Unassigned" else editor
    _add_timeline_event(doc, actor, f"Editor set to {editor}")
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def add_editor_decision(manuscript_id, decision, actor, feedback=None, rejection_reason=None):
    """Record an editor's decision: approve, revise, or reject.

    Args:
        manuscript_id: Document name
        decision: "approve" | "revise" | "reject"
        actor: Name of the editor
        feedback: Optional feedback text
        rejection_reason: Required when decision is "reject"
    """
    if decision == "reject" and not (rejection_reason or "").strip():
        frappe.throw(_("Rejection reason is required"), frappe.ValidationError)

    state_map = {
        "approve": "Approved",
        "revise": "Revisions Requested",
        "reject": "Rejected",
    }
    label_map = {
        "approve": "Approved manuscript",
        "revise": "Requested revisions",
        "reject": "Rejected manuscript",
    }

    if decision not in state_map:
        frappe.throw(_("Invalid decision: {0}").format(decision))

    doc = frappe.get_doc(DOCTYPE, manuscript_id)
    doc.state = state_map[decision]

    if decision == "reject":
        doc.rejection_reason = rejection_reason

    if not doc.assigned_editor:
        doc.assigned_editor = actor

    if feedback:
        doc.append("editor_notes", {
            "note_author": actor,
            "created_at": frappe.utils.now_datetime(),
            "body": feedback,
        })

    _add_timeline_event(doc, actor, label_map[decision])
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def upload_revision(manuscript_id, file_name, actor):
    """Record a new revision upload — updates file name and resets to Pending Editor Review."""
    doc = frappe.get_doc(DOCTYPE, manuscript_id)
    doc.file_name = file_name
    doc.state = "Pending Editor Review"
    _add_timeline_event(doc, actor, f"Uploaded revised draft ({file_name})")
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


@frappe.whitelist()
def generate_ai_report(title="Untitled", genre="Fiction", secondary_genre="", page_count=0):
    """Generate a mock AI analysis report (same logic as the frontend mock).

    In production, replace this with a real AI/ML pipeline call.
    """
    page_count = int(page_count) if page_count else 0
    base_score = 62 + random.randint(0, 31)
    primary = 55 + random.randint(0, 29)

    genre_confidence = [
        {"label": genre or "Fiction", "value": primary},
        {"label": secondary_genre or "General", "value": 100 - primary},
    ]

    return {
        "score": base_score,
        "genreConfidence": genre_confidence,
        "readability": 55 + random.randint(0, 39),
        "marketability": 50 + random.randint(0, 44),
        "pacing": [
            {"label": "Act I", "value": 50 + random.randint(0, 44)},
            {"label": "Act II", "value": 50 + random.randint(0, 44)},
            {"label": "Act III", "value": 50 + random.randint(0, 44)},
        ],
        "detectedPages": page_count if page_count else 200 + random.randint(0, 249),
        "titleMatched": True,
        "summary": (
            f'Pre-flight scan of "{title}" completed. '
            "Structure and metadata parsed successfully with no extraction errors. "
            "Lexical density and chapter balance fall within the expected band for this category."
        ),
    }


@frappe.whitelist()
def get_editors():
    """Return a list of users who have the Manuscript Editor or System Manager role."""
    users = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["Manuscript Editor", "System Manager"]], "parenttype": "User"},
        fields=["parent"]
    )
    user_emails = list(set([u.parent for u in users]))
    if not user_emails:
        return []
        
    user_docs = frappe.get_all(
        "User",
        filters={"name": ["in", user_emails], "enabled": 1, "name": ["!=", "Administrator"]},
        fields=["name", "full_name"]
    )
    
    editors = []
    for u in user_docs:
        # For Administrator, we can exclude or keep it. I excluded it above just for realism,
        # but let's include it if there's no full_name since we want test users to appear!
        name = u.full_name or u.name
        if name not in editors:
            editors.append(name)
            
    editors.sort()
    return editors

