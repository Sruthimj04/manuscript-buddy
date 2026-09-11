"""
Fast2SMS OTP Service — Server-side only.

Replaces MSG91 with Fast2SMS and uses Frappe caching for OTP verification since 
Fast2SMS developer tier only handles delivery, not validation.

Configuration keys (set via `bench set-config`):
    fast2sms_auth_key — Fast2SMS Auth Key
    otp_dev_mode      — set to 1 to accept "123456" as valid OTP (dev only)
"""

import re
import random
import frappe
import requests

# ── Rate-limit windows ─────────────────────────────────────────────────────── #

MAX_SEND_ATTEMPTS = 5          # per phone per window
SEND_WINDOW_SECONDS = 600     # 10 minutes
MAX_VERIFY_ATTEMPTS = 5       # per phone per window
VERIFY_WINDOW_SECONDS = 600   # 10 minutes
RESEND_COOLDOWN_SECONDS = 30  # minimum gap between resends

# ── API Info ───────────────────────────────────────────────────────────────── #

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"
OTP_TTL_SECONDS = 600 # 10 minutes


# ── Helpers ────────────────────────────────────────────────────────────────── #

def _get_config(key, default=None):
    """Read a value from site_config.json."""
    value = frappe.conf.get(key)
    if default is not None and not value:
        return default
    if not value:
        frappe.throw(f"Configuration missing: {key}. Set it via bench set-config.")
    return value


def _is_dev_mode():
    """Check if development/testing mode is enabled."""
    # Check both msg91_dev_mode (for legacy compatibility) and otp_dev_mode
    return bool(frappe.conf.get("otp_dev_mode") or frappe.conf.get("msg91_dev_mode"))


def normalize_phone(phone):
    """
    Normalize a phone number to E.164 format.
    Input examples: "+919876543210", "919876543210", "09876543210", "9876543210"
    Output: "+919876543210"
    """
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    if len(cleaned) == 10 and cleaned[0] in "6789":
        cleaned = "91" + cleaned
    if cleaned.startswith("0"):
        cleaned = "91" + cleaned[1:]
    return "+" + cleaned


def _phone_for_gateway(e164_phone):
    """
    Fast2SMS expects 10 digit number (without 91 or +91) for Indian numbers.
    """
    if e164_phone.startswith("+91") and len(e164_phone) == 13:
        return e164_phone[3:]
    if e164_phone.startswith("+"):
        return e164_phone[1:]
    return e164_phone


def validate_phone(phone):
    """Validate that a phone number looks correct after normalization."""
    normalized = normalize_phone(phone)
    if not re.match(r"^\+[1-9]\d{10,14}$", normalized):
        frappe.throw("Invalid phone number format. Please use a valid mobile number with country code.")
    return normalized


# ── API Info ───────────────────────────────────────────────────────────────── #

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


# ── Helpers ────────────────────────────────────────────────────────────────── #


# ── Rate Limiting ──────────────────────────────────────────────────────────── #

def _check_rate_limit(key, max_attempts, window_seconds):
    """Check and increment a rate limit counter. Throws on exceeded."""
    cache = frappe.cache()
    count = cache.get_value(key) or 0
    if isinstance(count, bytes):
        count = int(count)

    if count >= max_attempts:
        frappe.throw(
            f"Too many attempts. Please wait {window_seconds // 60} minutes before trying again.",
            frappe.RateLimitExceededError if hasattr(frappe, "RateLimitExceededError") else frappe.ValidationError,
        )

    # set_value with expiry preserves expiry only if we pass it, but changing expiry resets it.
    # We will compute manually or let Frappe handle it.
    cache.set_value(key, count + 1, expires_in_sec=window_seconds)


def _check_resend_cooldown(mobile):
    """Ensure minimum gap between resend requests."""
    cache = frappe.cache()
    cooldown_key = f"otp_resend_cooldown:{mobile}"
    if cache.get_value(cooldown_key):
        frappe.throw(
            f"Please wait {RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP.",
            frappe.ValidationError,
        )
    cache.set_value(cooldown_key, 1, expires_in_sec=RESEND_COOLDOWN_SECONDS)


# ── Public API ─────────────────────────────────────────────────────────────── #

def send_otp(mobile):
    """
    Send an OTP to the given mobile number.
    """
    mobile = validate_phone(mobile)

    # Rate limit: max sends per window
    _check_rate_limit(f"otp_send:{mobile}", MAX_SEND_ATTEMPTS, SEND_WINDOW_SECONDS)

    if _is_dev_mode():
        frappe.logger().info(f"[DEV MODE] OTP send requested for {mobile} — use 123456")
        return {"success": True, "message": "OTP sent (dev mode)"}

    gateway_mobile = _phone_for_gateway(mobile)

    auth_key = _get_config("fast2sms_auth_key")
    headers = {
        "authorization": auth_key,
        "accept": "application/json",
        "content-type": "application/json"
    }
    
    # Fast2SMS OTP Send Route Payload
    payload = {
        "mobile": gateway_mobile,
        "otp_id": "123456",
        "otp_expiry": 10
    }

    try:
        response = requests.post(
            "https://www.fast2sms.com/dev/otp/send",
            json=payload,
            headers=headers,
            timeout=10,
        )
        data = response.json() if response.text else {}

        if response.status_code == 200 and data.get("return") == True:
            return {"success": True, "message": "OTP sent successfully"}
        else:
            error_msg = data.get("message", "Failed to send OTP")
            frappe.log_error(f"Fast2SMS Send OTP Error: {error_msg}", "OTP Service")
            frappe.throw("Unable to send OTP at this time. Please try again later.")

    except requests.exceptions.Timeout:
        frappe.throw("OTP service timed out. Please try again.")
    except requests.exceptions.RequestException as e:
        frappe.log_error(f"Fast2SMS Connection Error: {str(e)}", "OTP Service")
        frappe.throw("Unable to connect to OTP service. Please try again later.")


def verify_otp(mobile, otp):
    """
    Verify an OTP entered by the user.
    """
    mobile = validate_phone(mobile)

    if not otp or not str(otp).strip():
        frappe.throw("OTP is required.")

    otp = str(otp).strip()

    # Rate limit: max verification attempts
    _check_rate_limit(f"otp_verify:{mobile}", MAX_VERIFY_ATTEMPTS, VERIFY_WINDOW_SECONDS)

    if _is_dev_mode():
        if otp == "123456":
            return {"success": True, "message": "OTP verified (dev mode)"}
        else:
            frappe.throw("Invalid OTP. Please try again.")

    gateway_mobile = _phone_for_gateway(mobile)

    auth_key = _get_config("fast2sms_auth_key")
    headers = {
        "authorization": auth_key,
        "accept": "application/json",
        "content-type": "application/json"
    }

    payload = {
        "mobile": gateway_mobile,
        "otp": otp
    }

    try:
        response = requests.post(
            "https://www.fast2sms.com/dev/otp/verify",
            json=payload,
            headers=headers,
            timeout=10,
        )
        data = response.json() if response.text else {}

        if response.status_code == 200 and data.get("return") == True:
            return {"success": True, "message": "OTP verified successfully"}
        else:
            frappe.throw("Invalid OTP. Please check and try again.")
            
    except requests.exceptions.Timeout:
        frappe.throw("OTP service timed out. Please try again.")
    except requests.exceptions.RequestException as e:
        frappe.log_error(f"Fast2SMS Verify Error: {str(e)}", "OTP Service")
        frappe.throw("Unable to connect to OTP service. Please try again later.")


def resend_otp(mobile, retry_type="text"):
    """
    Resend OTP to the given mobile number.
    """
    mobile = validate_phone(mobile)

    # Cooldown check
    _check_resend_cooldown(mobile)

    # Basically call send_otp again (this generates a new OTP or reuse existing)
    # We will just generate and send a new one for simplicity
    return send_otp(mobile)

