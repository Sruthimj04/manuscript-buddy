import frappe
def execute():
    doc = frappe.new_doc("Manuscript Submission")
    doc.title = "Direct Debug"
    doc.state = "Draft"
    doc.author = "Debug"
    doc.author_email = "debug@example.com"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"Inserted: {doc.name}")
    print(frappe.get_all("Manuscript Submission"))
