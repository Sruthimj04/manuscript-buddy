import frappe

def execute():
    if not frappe.db.exists("Role", "Manuscript Author"):
        frappe.get_doc({"doctype": "Role", "role_name": "Manuscript Author"}).insert(ignore_permissions=True)
        frappe.db.commit()
    print("Role generated successfully.")
