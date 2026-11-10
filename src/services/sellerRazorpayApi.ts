const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export type RazorpayMode = "test" | "live";

export interface RazorpayUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  business_name?: string;
}

export interface RazorpayHistoryEvent {
  action?: string;
  actor_id?: string | null;
  actor_email?: string;
  actor_role?: string;
  note?: string;
  at?: string;
}

export interface RazorpayLastTest {
  status?: string;
  server_order_id?: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  receipt?: string;
  mode?: RazorpayMode;
  message?: string;
  method?: string;
  email?: string;
  contact?: string;
  created_at?: string;
  verified_at?: string;
  [key: string]: unknown;
}

export interface SellerGateway {
  provider: string;
  mode: RazorpayMode;
  key_id_masked: string;
  secret_masked: string;
  status: string;
  active_for_live_payments: boolean;
  last_test: RazorpayLastTest;
  history: RazorpayHistoryEvent[];
  created_at?: string | null;
  updated_at?: string | null;
  activated_at?: string | null;
  activated_by?: string | null;
  has_key_id?: boolean;
  has_key_secret?: boolean;
}

export interface RazorpayGatewayState {
  status: string;
  mode: RazorpayMode;
  needs_credentials: boolean;
  pending_admin_test: boolean;
  test_verified: boolean;
  needs_live_credentials: boolean;
  live_verified: boolean;
  awaiting_activation: boolean;
  live_active: boolean;
}

export interface RazorpayPermissions {
  can_submit_credentials: boolean;
  can_use_live_payments: boolean;
}

export interface RazorpayStateResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  login_url?: string;
  redirect_url?: string;
  csrf_token?: string;
  seller?: RazorpayUser;
  bank_verified?: boolean;
  gateway?: SellerGateway;
  state?: RazorpayGatewayState;
  permissions?: RazorpayPermissions;
  admin_view?: boolean;
  checkout?: RazorpayCheckoutPayload;
}

export interface RazorpayCheckoutPayload {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface AdminGatewayRow {
  seller: RazorpayUser;
  gateway: SellerGateway;
  bank_verified: boolean;
}

export interface AdminGatewaySummary {
  total_sellers: number;
  configured: number;
  pending_test: number;
  verified: number;
  active_live: number;
}

export interface AdminGatewayListResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  login_url?: string;
  sellers?: AdminGatewayRow[];
  summary?: AdminGatewaySummary;
  csrf_token?: string;
  filters?: {
    status?: string;
    mode?: string;
    q?: string;
  };
}

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export class SellerRazorpayApiError extends Error {
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
    this.name = "SellerRazorpayApiError";
    this.status = options.status;
    this.code = options.code;
    this.payload = options.payload;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
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

  const payload = await readJson<T & {
    success?: boolean;
    message?: string;
    code?: string;
  }>(response);

  if (!response.ok || payload.success === false) {
    throw new SellerRazorpayApiError(
      payload.message || "Unable to complete the Razorpay request.",
      {
        status: response.status,
        code: payload.code,
        payload: payload as Record<string, unknown>,
      },
    );
  }

  return payload;
}

function jsonPost(
  path: string,
  csrfToken: string,
  body: Record<string, unknown>,
): Promise<RazorpayStateResponse> {
  return request<RazorpayStateResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
}

export function loadSellerRazorpay(): Promise<RazorpayStateResponse> {
  return request<RazorpayStateResponse>(
    "/react/api/seller/payments/razorpay/session",
  );
}

export function saveSellerRazorpayCredentials(
  csrfToken: string,
  input: {
    mode: RazorpayMode;
    key_id?: string;
    key_secret?: string;
  },
): Promise<RazorpayStateResponse> {
  return jsonPost(
    "/react/api/seller/payments/razorpay",
    csrfToken,
    input,
  );
}

export function loadAdminSellerGateways(filters: {
  q?: string;
  status?: string;
  mode?: string;
} = {}): Promise<AdminGatewayListResponse> {
  const query = new URLSearchParams();

  if (filters.q?.trim()) query.set("q", filters.q.trim());
  if (filters.status?.trim()) query.set("status", filters.status.trim());
  if (filters.mode?.trim()) query.set("mode", filters.mode.trim());

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request<AdminGatewayListResponse>(
    `/react/api/admin/seller-payment-gateways${suffix}`,
  );
}

export function loadAdminSellerGateway(
  sellerId: string,
): Promise<RazorpayStateResponse> {
  return request<RazorpayStateResponse>(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}`,
  );
}

export function editAdminSellerGateway(
  sellerId: string,
  csrfToken: string,
  input: {
    mode: RazorpayMode;
    key_id?: string;
    key_secret?: string;
  },
): Promise<RazorpayStateResponse> {
  return jsonPost(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}/edit`,
    csrfToken,
    input,
  );
}

export function createAdminRazorpayTestOrder(
  sellerId: string,
  csrfToken: string,
  amountRupees: number,
): Promise<RazorpayStateResponse> {
  return jsonPost(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}/test-order`,
    csrfToken,
    { amount_rupees: amountRupees },
  );
}

export function verifyAdminRazorpayTest(
  sellerId: string,
  csrfToken: string,
  result: RazorpayPaymentResult,
): Promise<RazorpayStateResponse> {
  return jsonPost(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}/verify-test`,
    csrfToken,
    result,
  );
}

export function activateAdminSellerGateway(
  sellerId: string,
  csrfToken: string,
): Promise<RazorpayStateResponse> {
  return jsonPost(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}/activate`,
    csrfToken,
    {},
  );
}

export function deactivateAdminSellerGateway(
  sellerId: string,
  csrfToken: string,
): Promise<RazorpayStateResponse> {
  return jsonPost(
    `/react/api/admin/seller-payment-gateways/${encodeURIComponent(
      sellerId,
    )}/deactivate`,
    csrfToken,
    {},
  );
}

export function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof SellerRazorpayApiError &&
    (
      error.status === 401 ||
      error.code === "authentication_required"
    )
  );
}

export function isCsrfError(error: unknown): boolean {
  return (
    error instanceof SellerRazorpayApiError &&
    error.code === "csrf_failed"
  );
}

export function errorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
