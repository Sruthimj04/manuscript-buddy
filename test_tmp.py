import requests
import random
BASE_URL = "http://localhost:8080"
TEST_MOBILE = f"+9199{random.randint(10000000, 99999999)}"
TEST_EMAIL = f"test_{random.randint(1000, 9999)}@example.com"
resp = requests.post(f"{BASE_URL}/api/method/manuscript_management.api.author_send_otp", data={
    "mobile": TEST_MOBILE,
    "full_name": "E2E Test User",
    "email": TEST_EMAIL
})
with open('resp.txt', 'w') as f:
    f.write(resp.text)
