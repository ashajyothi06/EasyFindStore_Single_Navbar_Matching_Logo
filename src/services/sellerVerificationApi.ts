const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export type VerificationStatus =
  | "PROFILE_APPROVED"
  | "KYC_PENDING"
  | "KYC_SUBMITTED"
  | "KYC_REJECTED"
  | "KYC_APPROVED"
  | "BANK_SUBMITTED"
  | "BANK_REJECTED"
  | "COMPLETED"
  | string;

export interface SellerVerificationUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  business_name: string;
  product_category: string;
  pickup_address: string;
}

export interface AadhaarIdentity {
  name?: string;
  dob?: string;
  gender?: string;
  uid_number?: string;
  uid_masked?: string;
  uid_last4?: string;
}

export interface AadhaarAddress {
  co?: string;
  house?: string;
  street?: string;
  lm?: string;
  loc?: string;
  vtc?: string;
  dist?: string;
  state?: string;
  pc?: string;
  country?: string;
}

export interface VerificationState {
  status: VerificationStatus;
  step: number;
  kyc: {
    status?: string;
    provider?: string;
    client_id?: string;
    initialized_at?: string;
    submitted_at?: string;
    expiry_seconds?: number | null;
    aadhaar_preview?: {
      identity?: AadhaarIdentity;
      address?: AadhaarAddress;
    };
    [key: string]: unknown;
  };
  bank: {
    status?: string;
    provider?: string;
    account_number?: string;
    account_number_masked?: string;
    ifsc?: string;
    holder_name?: string;
    bank_name?: string;
    branch_name?: string;
    imps_reference?: string | number | null;
    verified_at?: string;
    submitted_at?: string;
    [key: string]: unknown;
  };
  admin_review: {
    kyc_approved?: boolean;
    kyc_rejected?: boolean;
    kyc_rejection_reason?: string;
    kyc_reviewed_at?: string | null;
    kyc_reviewed_by?: string | null;
    bank_approved?: boolean;
    bank_rejected?: boolean;
    bank_rejection_reason?: string;
    bank_reviewed_at?: string | null;
    bank_reviewed_by?: string | null;
  };
  history: Array<{
    status?: string;
    at?: string;
    note?: string;
  }>;
  permissions?: {
    can_edit_kyc?: boolean;
    can_edit_bank?: boolean;
  };
  artifact_urls?: {
    xml?: string | null;
    photo?: string | null;
  };
}

export interface VerificationSummary {
  total: number;
  kyc_pending_review: number;
  bank_pending_review: number;
  completed: number;
  action_required: number;
}

export interface SellerVerificationRow {
  seller: SellerVerificationUser;
  verification: VerificationState;
}

export interface VerificationApiResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  error?: string;
  code?: string;
  pending?: boolean;
  status?: string;
  seller?: SellerVerificationUser;
  verification?: VerificationState;
  csrf_token?: string;
  gateway?: string;
  token?: string;
  client_id?: string;
  expiry_seconds?: number | null;
  rows?: SellerVerificationRow[];
  summary?: VerificationSummary;
  status_filter?: string;
  query?: string;
  login_url?: string;
}

export class VerificationApiError extends Error {
  status: number;
  code?: string;
  payload: VerificationApiResponse;

  constructor(
    message: string,
    status: number,
    payload: VerificationApiResponse,
  ) {
    super(message);
    this.name = "VerificationApiError";
    this.status = status;
    this.code = payload.code;
    this.payload = payload;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function parseJson(
  response: Response,
): Promise<VerificationApiResponse> {
  return (await response.json().catch(() => ({}))) as VerificationApiResponse;
}

async function request(
  path: string,
  init: RequestInit = {},
  options: { allowAccepted?: boolean } = {},
): Promise<VerificationApiResponse> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = await parseJson(response);

  if (response.status === 202 && options.allowAccepted) {
    return payload;
  }

  if (!response.ok || payload.success === false) {
    throw new VerificationApiError(
      payload.message ||
        payload.error ||
        `Verification request failed (${response.status}).`,
      response.status,
      payload,
    );
  }

  return payload;
}

function jsonRequest(
  method: "POST",
  csrfToken: string,
  body: Record<string, unknown>,
): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({
      ...body,
      csrf_token: csrfToken,
    }),
  };
}

export function getSellerVerification(): Promise<VerificationApiResponse> {
  return request("/react/api/seller/verification/session");
}

export function initializeSellerAadhaar(
  csrfToken: string,
): Promise<VerificationApiResponse> {
  return request(
    "/react/api/seller/verification/aadhaar/init",
    jsonRequest("POST", csrfToken, {}),
  );
}

export function finalizeSellerAadhaar(
  csrfToken: string,
  clientId: string,
): Promise<VerificationApiResponse> {
  return request(
    "/react/api/seller/verification/aadhaar/finalize",
    jsonRequest("POST", csrfToken, {
      client_id: clientId,
    }),
    { allowAccepted: true },
  );
}

export function submitSellerBank(
  csrfToken: string,
  values: {
    account_number: string;
    confirm_account_number: string;
    ifsc: string;
  },
): Promise<VerificationApiResponse> {
  return request(
    "/react/api/seller/verification/bank",
    jsonRequest("POST", csrfToken, values),
  );
}

export function getAdminSellerVerifications(
  filters: { status?: string; q?: string } = {},
): Promise<VerificationApiResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);

  const suffix = params.toString() ? `?${params.toString()}` : "";

  return request(
    `/react/api/admin/seller-verifications${suffix}`,
  );
}

export function getAdminSellerVerificationDetail(
  sellerId: string,
): Promise<VerificationApiResponse> {
  return request(
    `/react/api/admin/seller-verifications/${encodeURIComponent(sellerId)}`,
  );
}

export function submitAdminKycDecision(
  sellerId: string,
  csrfToken: string,
  action: "approve" | "reject",
  reason = "",
): Promise<VerificationApiResponse> {
  return request(
    `/react/api/admin/seller-verifications/${encodeURIComponent(
      sellerId,
    )}/kyc-decision`,
    jsonRequest("POST", csrfToken, { action, reason }),
  );
}

export function submitAdminBankDecision(
  sellerId: string,
  csrfToken: string,
  action: "approve" | "reject",
  reason = "",
): Promise<VerificationApiResponse> {
  return request(
    `/react/api/admin/seller-verifications/${encodeURIComponent(
      sellerId,
    )}/bank-decision`,
    jsonRequest("POST", csrfToken, { action, reason }),
  );
}

export function verificationArtifactUrl(
  relativeUrl?: string | null,
): string {
  if (!relativeUrl) return "";
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return apiUrl(relativeUrl);
}

export function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof VerificationApiError &&
    (error.status === 401 ||
      error.code === "authentication_required")
  );
}

export function isCsrfError(error: unknown): boolean {
  return (
    error instanceof VerificationApiError &&
    error.code === "csrf_failed"
  );
}
