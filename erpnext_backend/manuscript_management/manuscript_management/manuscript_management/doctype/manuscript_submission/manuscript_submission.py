"""Manuscript Submission DocType controller."""

import frappe
from frappe.model.document import Document


class ManuscriptSubmission(Document):
    """Server-side logic for Manuscript Submission."""

    def before_save(self):
        """Auto-populate submitted_at on first save."""
        if not self.submitted_at:
            self.submitted_at = frappe.utils.now_datetime()

    def validate(self):
        """Validate that rejected manuscripts have a rejection reason."""
        if self.state == "Rejected" and not (self.rejection_reason or "").strip():
            frappe.throw("Rejection reason is required when rejecting a manuscript.")
