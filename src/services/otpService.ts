/**
 * OTP service — calls FastAPI / ERPNext backend endpoints for phone verification.
 */

const BASE_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

export interface OtpResponse {
  success: boolean;
  message?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  access_token?: string;
  token?: string;
  user?: {
    name: string;
    email: string;
    role: "author" | "editor" | "admin";
  };
}

/**
 * Send an OTP to the author's phone number during signup.
 */
export async function sendOtp(
  mobile: string,
  fullName: string,
  email: string,
): Promise<OtpResponse> {
  const url = `${BASE_URL}/api/v1/auth/otp/send`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ mobile, full_name: fullName, email }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.message && typeof data.message === "object" ? data.message : data;
    }
  } catch {
    // Fall through to compat endpoint
  }

  // Fallback to compatibility endpoint
  const compatUrl = `${BASE_URL}/api/method/manuscript_management.api.author_send_otp`;
  const compatRes = await fetch(compatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ mobile, full_name: fullName, email }),
  });

  if (!compatRes.ok) {
    const errData = await compatRes.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || `Failed to send OTP (${compatRes.status})`);
  }

  const compatData = await compatRes.json();
  return compatData.message || compatData;
}

/**
 * Verify the OTP entered by the user.
 */
export async function verifyOtp(
  mobile: string,
  otp: string,
  fullName?: string,
  email?: string,
  password?: string,
): Promise<VerifyOtpResponse> {
  const url = `${BASE_URL}/api/v1/auth/otp/verify`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mobile,
        otp,
        full_name: fullName,
        email,
        password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.message && typeof data.message === "object" ? data.message : data;
    }
  } catch {
    // Fall through to compat endpoint
  }

  // Fallback to compatibility endpoint
  const compatUrl = `${BASE_URL}/api/method/manuscript_management.api.author_verify_otp`;
  const compatRes = await fetch(compatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      mobile,
      otp,
      full_name: fullName,
      email,
      password,
    }),
  });

  if (!compatRes.ok) {
    const errData = await compatRes.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || `Invalid or expired OTP (${compatRes.status})`);
  }

  const compatData = await compatRes.json();
  return compatData.message || compatData;
}

/**
 * Resend OTP to the same phone number.
 */
export async function resendOtp(mobile: string): Promise<OtpResponse> {
  return sendOtp(mobile, "", "");
}

export default { sendOtp, verifyOtp, resendOtp };
