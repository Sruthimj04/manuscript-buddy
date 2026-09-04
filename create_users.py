import frappe

def setup_user(email, first_name, role, password='password123'):
    if not frappe.db.exists('User', email):
        user = frappe.get_doc({
            'doctype': 'User',
            'email': email,
            'first_name': first_name,
            'send_welcome_email': 0
        })
        user.insert(ignore_permissions=True)
    
    user = frappe.get_doc('User', email)
    user.add_roles(role)
    user.new_password = password
    user.save(ignore_permissions=True)
    frappe.db.commit()
    print(f'Created {email}')

setup_user('editor@example.com', 'Head', 'Manuscript Editor')
setup_user('admin@example.com', 'Admin', 'System Manager')
