import frappe
frappe.init(site="frontend")
frappe.connect()

docs = frappe.get_all("Manuscript Submission", fields=["name", "title", "state", "author_email"])
for doc in docs:
    print(f"MS: {doc.name} | State: {doc.state} | Author: {doc.author_email} | Title: {doc.title}")
