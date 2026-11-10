/**
 * Browser JWT authentication for the updated FastAPI backend.
 *
 * The server sets an HttpOnly `commerce_access` JWT cookie after OTP verification.
 * The browser attaches that cookie to every credentialed request. Never copy the
 * JSON `access_token` into localStorage/sessionStorage: a script-readable token
 * increases exposure if the application suffers an XSS vulnerability.
 *
 * /react/api/auth/session remains the CSRF + pending-OTP endpoint; /auth/me
 * is the authoritative check for JWT identity and account status.
 */

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const JWT_AUTH_CHANGED_EVENT = "fruveto:jwt-auth-changed";

export interface JwtUser {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  role: string;
  status?: string;
}

export interface JwtAuthIdentity {
  authenticated: boolean;
  user: JwtUser | null;
}

interface MeResponse {
  success?: boolean;
  authenticated?: boolean;
  user?: JwtUser | null;
  message?: string;
}

/** No optimistic sessionStorage checks: ask FastAPI to validate the JWT. */
export async function getJwtAuthIdentity(): Promise<JwtAuthIdentity> {
  const response = await fetch(`${API_BASE_URL}/react/api/auth/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (response.status === 401 || response.status === 403) {
    return { authenticated: false, user: null };
  }

  const payload = (await response.json().catch(() => ({}))) as MeResponse;
  if (!response.ok) {
    throw new Error(payload.message || `Unable to verify login (${response.status}).`);
  }
  if (!payload.success || !payload.authenticated || !payload.user?.id) {
    return { authenticated: false, user: null };
  }
  return { authenticated: true, user: payload.user };
}

/** Invalidates in-memory UI caches across the React app after login/logout. */
export function notifyJwtAuthChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(JWT_AUTH_CHANGED_EVENT));
  }
}
