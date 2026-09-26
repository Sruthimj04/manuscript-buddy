import random
import requests
from typing import Dict
from app.config import settings

# In-memory store for OTPs in dev mode
# mobile -> otp code
_otp_store: Dict[str, str] = {}

def send_otp(mobile: str, full_name: str, email: str) -> dict:
    # Standardize mobile format
    clean_mobile = mobile.strip()
    
    # Check if dev mode is enabled or SMS gateway key is unconfigured
    is_dev = settings.MSG91_DEV_MODE or (not settings.MSG91_AUTH_KEY) or (settings.ENVIRONMENT == "development")
    
    if is_dev:
        # Development / Mock mode OTP
        otp = "123456"
        _otp_store[clean_mobile] = otp
        return {
            "success": True,
            "message": f"Dev Mode: OTP sent to {clean_mobile} (Use OTP: 123456)"
        }
    
    # Production Mode using MSG91
    if not settings.MSG91_AUTH_KEY:
        return {
            "success": False,
            "message": "SMS gateway is not configured in production environment."
        }
        
    otp = f"{random.randint(100000, 999999)}"
    _otp_store[clean_mobile] = otp
    
    try:
        url = "https://control.msg91.com/api/v5/otp"
        headers = {
            "authkey": settings.MSG91_AUTH_KEY,
            "content-type": "application/json"
        }
        payload = {
            "template_id": settings.MSG91_TEMPLATE_ID,
            "mobile": clean_mobile,
            "otp": otp
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            return {"success": True, "message": "OTP sent successfully."}
        else:
            return {"success": False, "message": f"MSG91 error: {resp.text}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to send OTP via SMS: {str(e)}"}

def verify_otp(mobile: str, otp: str) -> bool:
    clean_mobile = mobile.strip()
    clean_otp = otp.strip()
    
    is_dev = settings.MSG91_DEV_MODE or (not settings.MSG91_AUTH_KEY) or (settings.ENVIRONMENT == "development")
    
    if is_dev:
        if clean_otp == "123456" or _otp_store.get(clean_mobile) == clean_otp:
            return True
        return False
        
    stored_otp = _otp_store.get(clean_mobile)
    if stored_otp and stored_otp == clean_otp:
        _otp_store.pop(clean_mobile, None)
        return True
        
    return False
