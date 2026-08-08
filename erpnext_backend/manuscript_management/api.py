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

# ── Helpers ────────────────────────────────────────────────────────────────── #

DOCTYPE = "Manuscript Submission"


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

    return {
        "id": doc.name,
        "title": doc.title,
        "author": doc.author,
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
    }


# ── Public API ─────────────────────────────────────────────────────────────── #


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

    total = frappe.db.count(DOCTYPE)
    names = frappe.get_all(
        DOCTYPE,
        fields=["name"],
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
def create_manuscript(data):
    """Create a new manuscript submission.

    Args:
        data: JSON string or dict with manuscript fields.
    """
    if isinstance(data, str):
        data = json.loads(data)

    doc = frappe.new_doc(DOCTYPE)
    doc.title = data.get("title", "Untitled")
    doc.author = data.get("author", frappe.session.user)
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
    doc.state = data.get("state") or "AI Processing"
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

    _add_timeline_event(doc, doc.author, "Manuscript submitted")
    _add_timeline_event(doc, "AI Engine", "AI processing started")

    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return _serialize_manuscript(doc)


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
