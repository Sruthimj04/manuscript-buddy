import frappe

frappe.init(site="frontend", sites_path="sites")
frappe.connect()

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
print("Permissions added.")
