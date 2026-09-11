# ERPNext DocType Schemas — Reference

This document describes the DocTypes to create in your Frappe app.
The JSON files are already in the `erpnext_backend/` directory.

## Manuscript Submission (Main DocType)

| Field | Type | Notes |
|---|---|---|
| title | Data | Required, searchable |
| author | Data | Required |
| state | Select | Draft / AI Processing / Pending Editor Review / Revisions Requested / Approved / Published / Rejected |
| submitted_at | Datetime | Auto-set on creation |
| assigned_editor | Data | Nullable |
| genre | Select | 8 options (Fiction, Non-Fiction, etc.) |
| secondary_genre | Select | Same options, optional |
| audience | Select | General / Young Adult / Academic / Professional / Children |
| keywords | Small Text | Comma-separated |
| abstract | Text | |
| synopsis | Text | |
| page_count | Int | |
| launch_date | Date | |
| manuscript_file | Attach | PDF upload |
| file_name | Data | Read-only |
| file_size | Int | Read-only |
| rejection_reason | Small Text | Visible only when state = Rejected |
| ai_score | Int | |
| ai_readability | Int | |
| ai_marketability | Int | |
| ai_detected_pages | Int | |
| ai_title_matched | Check | |
| ai_summary | Text | |
| ai_genre_confidence | Small Text | JSON array |
| ai_pacing | Small Text | JSON array |
| timeline_events | Table → Manuscript Timeline Event | |
| editor_notes | Table → Manuscript Editor Note | |

## Manuscript Timeline Event (Child Table)

| Field | Type |
|---|---|
| actor | Data |
| action | Data |
| timestamp | Datetime |

## Manuscript Editor Note (Child Table)

| Field | Type |
|---|---|
| note_author | Data |
| created_at | Datetime |
| body | Text |

## Custom Roles

Create these roles in ERPNext (Setup > Role):
- **Manuscript Author** — can read/write/create manuscripts
- **Manuscript Editor** — can read/write manuscripts
- **Manuscript Admin** — full access
