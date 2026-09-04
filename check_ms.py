import frappe

def execute():
    records = frappe.get_all("Manuscript Submission", fields=["*"])
    for r in records:
        print(f"ID: {r.name}, Author Email: {r.get('author_email')}, Owner: {r.owner}, State: {r.state}, Submitted: {r.get('submitted_at')}")
execute()

