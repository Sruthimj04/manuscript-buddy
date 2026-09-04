import requests

auth_key = "4prPfgNSBEBEKY5CQ3N2RniMqmRKQVKclYd96PQIanFVKIV1CUn7x4uWrwHp"
headers = {
    "authorization": auth_key,
    "cache-control": "no-cache"
}

params = {
    "variables_values": "123456",
    "route": "otp",
    "numbers": "9999999999" # Placeholder
}

print("Testing Fast2SMS authentication...")

# Request Wallet Balance to see if the account is active/has funds
try:
    wallet_resp = requests.post("https://www.fast2sms.com/dev/wallet", headers=headers)
    print("Wallet Response:", wallet_resp.status_code, wallet_resp.text)
except Exception as e:
    print("Wallet Error:", str(e))
