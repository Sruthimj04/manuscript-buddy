/**
 * OTP service — calls Frappe backend endpoints for phone verification.
 *
 * The MSG91 credentials are NEVER exposed to the browser.
 * All OTP operations go through the Frappe backend which securely
 * communicates with MSG91.
 */

import { call } from "./erpnextClient";

const API = "manuscript_management.api";

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
 *
 * @param mobile - Phone number with country code (e.g., +919876543210)
 * @param fullName - Author's full name
 * @param email - Author's email address
 */
export async function sendOtp(
  mobile: string,
  fullName: string,
  email: string,
): Promise<OtpResponse> {
  return call<OtpResponse>(`${API}.author_send_otp`, {
    mobile,
    full_name: fullName,
    email,
  });
}

/**
 * Verify the OTP entered by the user.
 * On success, the backend creates the user account and establishes a session.
 *
 * @param mobile - Phone number used for OTP
 * @param otp - The OTP code entered by the user
 * @param fullName - Author's full name
 * @param email - Author's email address
 * @param password - Author's password
 */
export async function verifyOtp(
  mobile: string,
  otp: string,
  fullName?: string,
  email?: string,
  password?: string,
): Promise<VerifyOtpResponse> {
  return call<VerifyOtpResponse>(`${API}.author_verify_otp`, {
    mobile,
    otp,
    full_name: fullName,
    email,
    password,
  });
}

/**
 * Resend OTP to the same phone number.
 *
 * @param mobile - Phone number to resend OTP to
 */
export async function resendOtp(mobile: string): Promise<OtpResponse> {
  return call<OtpResponse>(`${API}.author_resend_otp`, {
    mobile,
  });
}
