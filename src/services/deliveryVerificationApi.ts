const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export type DeliveryVerificationStatus =
  | "PROFILE_APPROVED"
  | "KYC_PENDING"
  | "KYC_SUBMITTED"
  | "KYC_REJECTED"
  | "KYC_APPROVED"
  | "BANK_SUBMITTED"
  | "BANK_REJECTED"
  | "COMPLETED";

export interface DeliveryVerificationUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  vehicle_type?: string;
  vehicle_number?: string;
  license_number?: string;
  service_area?: string;
  service_radius_km?: number;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VerificationHistoryEntry {
  status: string;
  at?: string;
  note?: string;
}

export interface AadhaarIdentity {
  name?: string;
  uid_number?: string;
  uid_masked?: string;
  uid_last4?: string;
  dob?: string;
  gender?: string;
  [key: string]: unknown;
}

export interface AadhaarAddress {
  house?: string;
  street?: string;
  lm?: string;
  loc?: string;
  vtc?: string;
  dist?: string;
  state?: string;
  pc?: string;
  country?: string;
  [key: string]: unknown;
}

export interface DeliveryKycState {
  status?: string;
  provider?: string;
  client_id?: string;
  initialized_at?: string;
  expiry_seconds?: number;
  submitted_at?: string;
  aadhaar_preview?: {
    identity?: AadhaarIdentity;
    address?: AadhaarAddress;
  };
  xml_file?: string;
  photo_file?: string;
  xml_saved_for_email?: string;
  has_xml_artifact?: boolean;
  has_photo_artifact?: boolean;
  [key: string]: unknown;
}

export interface DeliveryBankState {
  status?: string;
  provider?: string;
  account_number_masked?: string;
  ifsc?: string;
  holder_name?: string;
  bank_name?: string;
  branch_name?: string;
  imps_reference?: string;
  verified_at?: string;
  submitted_at?: string;
  [key: string]: unknown;
}

export interface DeliveryAdminReview {
  kyc_approved?: boolean;
  kyc_rejected?: boolean;
  kyc_rejection_reason?: string;
  kyc_reviewed_at?: string;
  kyc_reviewed_by?: string;
  bank_approved?: boolean;
  bank_rejected?: boolean;
  bank_rejection_reason?: string;
  bank_reviewed_at?: string;
  bank_reviewed_by?: string;
}

export interface DeliveryVerification {
  status: DeliveryVerificationStatus;
  step?: number;
  kyc?: DeliveryKycState;
  bank?: DeliveryBankState;
  admin_review?: DeliveryAdminReview;
  history?: VerificationHistoryEntry[];
}

export interface DeliveryVerificationCapabilities {
  kyc_editable?: boolean;
  bank_editable?: boolean;
  completed?: boolean;
  can_review_kyc?: boolean;
  can_review_bank?: boolean;
}

export interface DeliveryVerificationNavigation {
  overview_url?: string;
  aadhaar_url?: string;
  bank_url?: string;
  dashboard_url?: string;
}

export interface DeliveryVerificationResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  pending?: boolean;
  status?: DeliveryVerificationStatus;
  delivery_verification_enabled?: boolean;
  delivery_user?: DeliveryVerificationUser;
  verification?: DeliveryVerification;
  capabilities?: DeliveryVerificationCapabilities;
  navigation?: DeliveryVerificationNavigation;
  editable?: boolean;
  gateway?: string;
  csrf_token?: string;
  token?: string;
  client_id?: string;
  expiry_seconds?: number;
  errors?: string[];
}

export interface DeliveryVerificationSummary {
  total: number;
  kyc_pending_review: number;
  bank_pending_review: number;
  completed: number;
  action_required?: number;
}

export interface AdminDeliveryVerificationRow {
  delivery_user: DeliveryVerificationUser;
  verification: DeliveryVerification;
  detail_url?: string;
}

export interface AdminDeliveryVerificationListResponse {
  success: boolean;
  message?: string;
  code?: string;
  rows?: AdminDeliveryVerificationRow[];
  summary?: DeliveryVerificationSummary;
  status_filter?: string;
  query?: string;
  allowed_statuses?: DeliveryVerificationStatus[];
  csrf_token?: string;
}

export interface AdminDeliveryVerificationDetailResponse {
  success: boolean;
  message?: string;
  code?: string;
  delivery_user?: DeliveryVerificationUser;
  verification?: DeliveryVerification;
  artifact_urls?: {
    photo?: string;
    xml?: string;
  };
  capabilities?: DeliveryVerificationCapabilities;
  csrf_token?: string;
}

export class DeliveryVerificationApiError extends Error {
  status?: number;
  code?: string;
  payload?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      payload?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "DeliveryVerificationApiError";
    this.status = options.status;
    this.code = options.code;
    this.payload = options.payload;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: {
    allowPending202?: boolean;
  } = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as T & {
      success?: boolean;
      message?: string;
      error?: string;
      code?: string;
    };

  if (
    options.allowPending202 &&
    response.status === 202
  ) {
    return payload;
  }

  if (!response.ok || payload.success === false) {
    throw new DeliveryVerificationApiError(
      payload.message ||
        payload.error ||
        "Unable to complete the verification request.",
      {
        status: response.status,
        code: payload.code,
        payload: payload as Record<string, unknown>,
      },
    );
  }

  return payload;
}

function post<T>(
  path: string,
  csrfToken: string,
  body: Record<string, unknown>,
  options: {
    allowPending202?: boolean;
  } = {},
): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(body),
    },
    options,
  );
}

export function loadDeliveryVerificationSession() {
  return request<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/session",
  );
}

export function loadDeliveryVerificationOverview() {
  return request<DeliveryVerificationResponse>(
    "/react/api/delivery/verification",
  );
}

export function loadDeliveryAadhaarState() {
  return request<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/aadhaar",
  );
}

export function initializeDeliveryAadhaar(
  csrfToken: string,
) {
  return post<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/aadhaar/init",
    csrfToken,
    {},
  );
}

export function finalizeDeliveryAadhaar(
  csrfToken: string,
  clientId: string,
) {
  return post<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/aadhaar/finalize",
    csrfToken,
    {
      client_id: clientId,
    },
    {
      allowPending202: true,
    },
  );
}

export function loadDeliveryBankState() {
  return request<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/bank",
  );
}

export function submitDeliveryBank(
  csrfToken: string,
  input: {
    account_number: string;
    confirm_account_number: string;
    ifsc: string;
  },
) {
  return post<DeliveryVerificationResponse>(
    "/react/api/delivery/verification/bank",
    csrfToken,
    input,
  );
}

export function loadAdminDeliveryVerifications(
  input: {
    query?: string;
    status?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (input.query?.trim()) {
    params.set("q", input.query.trim());
  }

  if (input.status?.trim()) {
    params.set("status", input.status.trim());
  }

  const query = params.toString();

  return request<AdminDeliveryVerificationListResponse>(
    `/react/api/admin/delivery-verifications${
      query ? `?${query}` : ""
    }`,
  );
}

export function loadAdminDeliveryVerification(
  deliveryId: string,
) {
  return request<AdminDeliveryVerificationDetailResponse>(
    `/react/api/admin/delivery-verifications/${encodeURIComponent(
      deliveryId,
    )}`,
  );
}

export function submitAdminDeliveryKycDecision(
  deliveryId: string,
  csrfToken: string,
  input: {
    action: "approve" | "reject";
    reason?: string;
  },
) {
  return post<AdminDeliveryVerificationDetailResponse>(
    `/react/api/admin/delivery-verifications/${encodeURIComponent(
      deliveryId,
    )}/kyc-decision`,
    csrfToken,
    input,
  );
}

export function submitAdminDeliveryBankDecision(
  deliveryId: string,
  csrfToken: string,
  input: {
    action: "approve" | "reject";
    reason?: string;
  },
) {
  return post<AdminDeliveryVerificationDetailResponse>(
    `/react/api/admin/delivery-verifications/${encodeURIComponent(
      deliveryId,
    )}/bank-decision`,
    csrfToken,
    input,
  );
}

export function deliveryArtifactUrl(
  deliveryId: string,
  kind: "photo" | "xml",
): string {
  return apiUrl(
    `/react/api/admin/delivery-verifications/${encodeURIComponent(
      deliveryId,
    )}/artifact/${kind}`,
  );
}

export function isAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof DeliveryVerificationApiError &&
    (
      error.status === 401 ||
      error.code === "authentication_required"
    )
  );
}

export function isCsrfError(
  error: unknown,
): boolean {
  return (
    error instanceof DeliveryVerificationApiError &&
    error.code === "csrf_failed"
  );
}

export function verificationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
