import requests
import json

auth_key = "4prPfgNSBEBEKY5CQ3N2RniMqmRKQVKclYd96PQIanFVKIV1CUn7x4uWrwHp"
headers = {
    "authorization": auth_key,
    "cache-control": "no-cache"
}

params_send = {
    "mobile": "6238488738", # from user
    "otp_id": "123456",
    "otp_expiry": 1
}

# 1. Send OTP
try:
    resp = requests.post("https://www.fast2sms.com/dev/otp/send", json=params_send, headers=headers)
    print("SEND OTP STATUS:", resp.status_code)
    try:
        print("SEND OTP JSON:", json.dumps(resp.json(), indent=2))
    except:
        print("TEXT:", resp.text)
except Exception as e:
    print("Send Error:", str(e))

# 2. Verify OTP (using hardcoded 123456 just for dev, though Fast2sms manages it real)
params_verify = {
    "mobile": "6238488738",
    "otp": "123456" # This will likely fail natively unless 123456 is what is generated, but tests the route structure
}
try:
    resp2 = requests.post("https://www.fast2sms.com/dev/otp/verify", json=params_verify, headers=headers)
    print("VERIFY OTP STATUS:", resp2.status_code)
    try:
        print("VERIFY JSON:", json.dumps(resp2.json(), indent=2))
    except:
        print("TEXT", resp2.text)
except Exception as e:
    print("Verify Error:", str(e))
