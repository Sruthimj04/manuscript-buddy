"""Frappe hooks for manuscript_management app."""

app_name = "manuscript_management"
app_title = "Manuscript Management"
app_publisher = "Manuscript Buddy"
app_description = "Book Submission & AI-Assisted Publishing System"
app_email = "admin@manuscriptbuddy.com"
app_license = "MIT"

# --------------------------------------------------------------------------- #
# Website                                                                      #
# --------------------------------------------------------------------------- #
website_route_rules = [
    {"from_route": "/manuscripts/<path:app_path>", "to_route": "manuscripts"},
]

# --------------------------------------------------------------------------- #
# Document Events                                                              #
# --------------------------------------------------------------------------- #
# doc_events = {
#     "Manuscript Submission": {
#         "on_update": "manuscript_management.events.on_manuscript_update"
#     }
# }

# --------------------------------------------------------------------------- #
# Fixtures — export these DocTypes when running bench export-fixtures          #
# --------------------------------------------------------------------------- #
fixtures = []

# --------------------------------------------------------------------------- #
# CORS — allow the Vite dev server origin (also set in site_config.json)      #
# --------------------------------------------------------------------------- #
# allow_cors = ["http://localhost:5173"]
