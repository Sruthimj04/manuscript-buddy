import frappe

def execute():
    # Get the last error log
    logs = frappe.get_all("Error Log", fields=["error"], limit=1, order_by="creation desc")
    if logs:
        with open("/tmp/error.txt", "w", encoding="utf-8") as f:
            f.write(logs[0].error)
    else:
        print("No error logs found.")

