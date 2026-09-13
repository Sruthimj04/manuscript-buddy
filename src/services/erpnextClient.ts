/**
 * Low-level Frappe/ERPNext API client.
 *
 * Wraps `fetch()` for calling Frappe's `api/method/` endpoints.
 * Uses cookie-based session auth (`credentials: "include"`).
 *
 * Configuration: set `VITE_ERPNEXT_URL` in your `.env` file.
 * Example: VITE_ERPNEXT_URL=http://localhost:8000
 */

// In dev mode, Vite proxy forwards /api/* to ERPNext (configured in vite.config.ts).
// In production, set VITE_ERPNEXT_URL to the ERPNext origin, or use a reverse proxy.
const BASE_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? (import.meta.env["VITE_ERPNEXT_URL"] as string | undefined) ?? "";

// ── Core request helper ──────────────────────────────────────────────────── //

interface FrappeResponse<T = unknown> {
  message: T;
  exc_type?: string;
  exception?: string;
  _server_messages?: string;
}

export class FrappeError extends Error {
  status: number;
  excType?: string;

  constructor(message: string, status: number, excType?: string) {
    super(message);
    this.name = "FrappeError";
    this.status = status;
    if (excType !== undefined) {
      this.excType = excType;
    }
  }
}

function getStoredToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("token");
  }
  return null;
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Frappe-CSRF-Token": getCsrfToken(),
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include" as RequestCredentials,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    let excType: string | undefined;

    try {
      const body = (await res.json()) as FrappeResponse;
      if (body._server_messages) {
        const msgs = JSON.parse(body._server_messages);
        errorMessage = Array.isArray(msgs)
          ? msgs.map((m: string) => JSON.parse(m)?.message ?? m).join("; ")
          : String(msgs);
      } else if (body.exception) {
        errorMessage = body.exception;
      }
      excType = body.exc_type;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }

    throw new FrappeError(errorMessage, res.status, excType);
  }

  const json = (await res.json()) as FrappeResponse<T>;
  return json.message;
}

// ── CSRF token management ─────────────────────────────────────────────────── //

let csrfToken = "";

function getCsrfToken(): string {
  if (csrfToken) return csrfToken;
  // Frappe sets this cookie after login
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match?.[1] ?? "";
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

// ── Public API ────────────────────────────────────────────────────────────── //

/**
 * Call a Frappe whitelisted method.
 *
 * Usage:
 *   const result = await call<Manuscript[]>("manuscript_management.api.list_manuscripts", { page: 1 });
 */
export async function call<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return request<T>(`/api/method/${method}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

/**
 * Login to Frappe with email/password credentials.
 */
export async function login(
  usr: string,
  pwd: string,
): Promise<{ message: string; full_name: string }> {
  const res = await fetch(`${BASE_URL}/api/method/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FrappeError(
      body?.message || "Login failed",
      res.status,
      body?.exc_type,
    );
  }

  const data = await res.json();

  if (data.access_token && typeof window !== "undefined") {
    localStorage.setItem("token", data.access_token);
  }

  // After login, Frappe returns a CSRF token in a cookie — capture it
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  if (match?.[1]) setCsrfToken(match[1]);

  return data;
}

/**
 * Logout from Frappe.
 */
export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
  await request("/api/method/logout", { method: "POST" });
  setCsrfToken("");
}

/**
 * Get the currently logged-in Frappe user.
 * Returns the user email or null if not logged in.
 */
export async function getLoggedUser(): Promise<string | null> {
  try {
    const user = await request<string>("/api/method/frappe.auth.get_logged_user");
    return user && user !== "Guest" ? user : null;
  } catch {
    return null;
  }
}

/**
 * Get user info (full_name, roles) for the logged-in user.
 */
export async function getUserInfo(): Promise<{
  name: string;
  email: string;
  roles: string[];
} | null> {
  try {
    const email = await getLoggedUser();
    if (!email) return null;

    const user = await call<{
      name: string;
      email: string;
      full_name: string;
      roles: { role: string }[];
    }>("frappe.client.get", {
      doctype: "User",
      name: email,
    });

    const roles = (user.roles ?? []).map((r) => r.role);

    return {
      name: user.full_name || user.name,
      email: user.email || email,
      roles,
    };
  } catch {
    return null;
  }
}

export default { call, login, logout, getLoggedUser, getUserInfo };
