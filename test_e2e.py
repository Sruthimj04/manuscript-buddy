import requests
import json
import uuid

import random

BASE_URL = "http://localhost:8080"
TEST_MOBILE = f"+9199{random.randint(10000000, 99999999)}" # unique phone
TEST_EMAIL = f"test_{uuid.uuid4().hex[:4]}@example.com"
session = requests.Session()

def test_flow():
    print("1. Sending OTP...")
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.author_send_otp", data={
        "mobile": TEST_MOBILE,
        "full_name": "E2E Test User",
        "email": TEST_EMAIL
    })
    print(resp.status_code, resp.text)
    assert resp.status_code == 200, "Failed to send OTP"
    
    print("\n2. Verifying OTP...")
    # msg91_dev_mode is 1, so OTP is 123456
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.author_verify_otp", data={
        "mobile": TEST_MOBILE,
        "otp": "123456",
        "full_name": "E2E Test User",
        "email": TEST_EMAIL
    })
    print(resp.status_code, resp.text)
    assert resp.status_code == 200, "Failed to verify OTP"
    assert session.cookies.get("sid", None), "Missing SID cookie from successful login"

    print("\n3. Creating Draft Manuscript...")
    draft_data = {
        "title": "My E2E Test Book",
        "author": "E2E Test User",
        "genre": "Science Fiction",
        "audience": "Young Adult",
        "abstract": "A test book.",
        "synopsis": "Full synopsis of the test book.",
        "state": "Draft"
    }
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.create_manuscript", data={
        "data": json.dumps(draft_data)
    })
    if resp.status_code != 200:
        with open("err.json", "w") as f:
            f.write(resp.text)
        assert resp.status_code == 200, "Failed to save draft"
    ms_id = resp.json().get("message", {}).get("id")
    assert ms_id, f"Manuscript ID not returned: {resp.text}"
    
    print("\n4. Checking one-active-submission rule...")
    resp = session.get(f"{BASE_URL}/api/method/manuscript_management.api.get_active_submission")
    assert resp.status_code == 200
    print("STEP 4 RESPONSE:", resp.text)
    active_ms = resp.json().get("message")
    print("Active Submission returned:", active_ms.get("id") if active_ms else "None")
    assert active_ms and active_ms.get("id") == ms_id, "One active submission rule failed"

    print("\n5. Creating Chapter 1...")
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.create_chapter", data={
        "manuscript_id": ms_id,
        "chapter_data": json.dumps({
            "chapterTitle": "The Beginning",
            "chapterContent": "Once upon a time in a test environment.",
            "chapterNumber": 1
        })
    })
    print(resp.status_code, resp.text)
    assert resp.status_code == 200
    chapter_name = resp.json().get("message", {}).get("chapters", [])[0].get("name")
    print("Chapter Name created:", chapter_name)

    print("\n6. Accepting Legal Declaration...")
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.accept_legal_declaration", data={
        "manuscript_id": ms_id
    })
    print(resp.status_code, resp.text)
    assert resp.status_code == 200

    print("\n7. Final Submit...")
    resp = session.post(f"{BASE_URL}/api/method/manuscript_management.api.final_submit", data={
        "manuscript_id": ms_id
    })
    print(resp.status_code, resp.text)
    assert resp.status_code == 200
    assert resp.json().get("message", {}).get("state") == "Pending Editor Review"

    print("\nAll Tests Passed Successfully!")

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"TEST FAILED: {e}")
