import requests

BASE_URL = "http://127.0.0.1:8080"

def test_auth_scenarios():
    session = requests.Session()
    
    print("--- SCENARIO 1: Unauthenticated user check ---")
    resp = session.get(f"{BASE_URL}/api/method/frappe.auth.get_logged_user")
    print("get_logged_user status:", resp.status_code, resp.json())
    assert resp.json().get("message") == "Guest"
    
    resp = session.post(f"{BASE_URL}/api/method/frappe.client.get", json={"doctype": "User", "name": "Guest"})
    print("frappe.client.get for Guest status:", resp.status_code)
    assert resp.status_code == 404, "Unauthenticated user should get 404 from frappe.client.get"
    
    print("\n--- SCENARIO 2: Valid Login ---")
    login_resp = session.post(f"{BASE_URL}/api/method/login", json={"usr": "author@example.com", "pwd": "password123"})
    print("Login status:", login_resp.status_code, login_resp.json())
    assert login_resp.status_code == 200
    token = login_resp.json().get("access_token") or session.cookies.get("sid")
    print("Received token/cookie successfully.")
    
    print("\n--- SCENARIO 3: Authenticated User Info Check ---")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = session.get(f"{BASE_URL}/api/method/frappe.auth.get_logged_user", headers=headers)
    print("get_logged_user status:", resp.status_code, resp.json())
    assert resp.json().get("message") == "author@example.com"
    
    user_info = session.post(f"{BASE_URL}/api/method/frappe.client.get", json={"doctype": "User", "name": "author@example.com"}, headers=headers)
    print("frappe.client.get status:", user_info.status_code, user_info.json())
    assert user_info.status_code == 200
    assert user_info.json()["message"]["email"] == "author@example.com"
    
    print("\n--- SCENARIO 4: Invalid / Expired Token Check ---")
    invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
    resp = requests.get(f"{BASE_URL}/api/method/frappe.auth.get_logged_user", headers=invalid_headers)
    print("Invalid token get_logged_user status:", resp.status_code, resp.json())
    assert resp.json().get("message") == "Guest"
    
    print("\n--- SCENARIO 5: Logout Check ---")
    logout_resp = session.post(f"{BASE_URL}/api/method/logout")
    print("Logout status:", logout_resp.status_code, logout_resp.json())
    assert logout_resp.status_code == 200
    
    post_logout_check = session.get(f"{BASE_URL}/api/method/frappe.auth.get_logged_user")
    print("Post logout check:", post_logout_check.json())
    assert post_logout_check.json().get("message") == "Guest"
    
    print("\nALL 5 AUTHENTICATION TEST SCENARIOS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_auth_scenarios()
