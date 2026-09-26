import urllib.request
import urllib.error
import json

url = "http://localhost:8080/api/method/manuscript_management.api.author_send_otp"
data = json.dumps({"mobile": "+919876543210"}).encode('utf-8')
headers = {'Content-Type': 'application/json'}

try:
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as f:
        print(f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
