import frappe
frappe.init(site="frontend")
frappe.connect()

def create_user(email, first_name, role, password):
    # Ensure role exists
    if not frappe.db.exists("Role", role):
        frappe.get_doc({"doctype": "Role", "role_name": role}).insert(ignore_permissions=True)

    if not frappe.db.exists("User", email):
        user = frappe.new_doc("User")
        user.email = email
        user.first_name = first_name
        user.send_welcome_email = 0
        user.append("roles", {"role": role})
        user.insert(ignore_permissions=True)
        from frappe.utils.password import update_password
        update_password(email, password)
        print(f"Created {email}")
    else:
        user = frappe.get_doc("User", email)
        if not any(r.role == role for r in user.roles):
            user.append("roles", {"role": role})
            user.save(ignore_permissions=True)
        from frappe.utils.password import update_password
        update_password(email, password)
        print(f"Updated {email}")

create_user("editor@example.com", "Editor", "Manuscript Editor", "editor123")
create_user("admin@example.com", "Admin", "System Manager", "admin123")

frappe.db.commit()
print("Frappe Provisioning Done!")
