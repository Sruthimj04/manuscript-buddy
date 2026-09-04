import frappe

frappe.init(site="frontend")
frappe.connect()

logs = frappe.get_all("Error Log", fields=["error"], limit=1, order_by="creation desc")
if logs:
    print(logs[0].error)
else:
    print("No logs")
