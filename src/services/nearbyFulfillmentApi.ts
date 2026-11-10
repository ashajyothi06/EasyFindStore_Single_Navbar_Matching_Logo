const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export interface FulfillmentUser {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  business_name?: string;
}

export interface InventoryRow {
  item_id: string;
  item?: Record<string, unknown>;
  category?: Record<string, unknown>;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  is_available: boolean;
}

export interface InventoryResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  login_url?: string;
  seller?: FulfillmentUser;
  inventory_rows?: InventoryRow[];
  inventory_summary?: Record<string, number>;
  radius_km?: number;
  default_quantity?: number;
  csrf_token?: string;
}

export interface BookingResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  login_url?: string;
  booking?: Record<string, any>;
  bookings?: Record<string, any>[];
  summary?: Record<string, any>;
  status_filter?: string;
  allowed_filters?: string[];
  rejection_fine_default_amount?: number;
  currency_symbol?: string;
  csrf_token?: string;
}

export interface AllocationResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  login_url?: string;
  orders?: Record<string, any>[];
  seller_bookings?: Record<string, any>[];
  order?: Record<string, any>;
  bookings?: Record<string, any>[];
  summary?: Record<string, any>;
  currency_symbol?: string;
  csrf_token?: string;
  allowed_booking_statuses?: string[];
  allowed_settlement_statuses?: string[];
}

export interface NearbyResponse {
  success: boolean;
  message?: string;
  code?: string;
  categories?: Record<string, any>[];
  summary?: Record<string, any>;
  report?: Record<string, any>;
  csrf_token?: string;
}

export class FulfillmentApiError extends Error {
  status?: number;
  code?: string;
  payload?: Record<string, unknown>;

  constructor(message: string, status?: number, code?: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = "FulfillmentApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
    code?: string;
  };

  if (!response.ok || payload.success === false) {
    throw new FulfillmentApiError(
      payload.message || "Unable to complete the fulfilment request.",
      response.status,
      payload.code,
      payload as Record<string, unknown>,
    );
  }

  return payload;
}

function post<T>(path: string, csrfToken: string, body: Record<string, unknown>): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
}

export const loadSellerInventory = () =>
  request<InventoryResponse>("/react/api/seller/inventory/session");

export const updateSellerInventory = (csrfToken: string, items: InventoryRow[]) =>
  post<InventoryResponse>("/react/api/seller/inventory", csrfToken, { items });

export const loadSellerBookingSummary = () =>
  request<BookingResponse>("/react/api/seller/bookings/summary");

export const loadSellerBookings = (status = "all") =>
  request<BookingResponse>(`/react/api/seller/bookings?status=${encodeURIComponent(status)}`);

export const loadSellerBooking = (bookingId: string) =>
  request<BookingResponse>(`/react/api/seller/bookings/${encodeURIComponent(bookingId)}`);

export const submitSellerBookingDecision = (
  bookingId: string,
  csrfToken: string,
  input: {
    decision: "accepted" | "rejected";
    rejection_reason?: string;
    fine_acknowledged?: boolean;
  },
) =>
  post<BookingResponse>(
    `/react/api/seller/bookings/${encodeURIComponent(bookingId)}/decision`,
    csrfToken,
    input,
  );

export const updateSellerBookingStatus = (
  bookingId: string,
  csrfToken: string,
  status: string,
  note = "",
) =>
  post<BookingResponse>(
    `/react/api/seller/bookings/${encodeURIComponent(bookingId)}/status`,
    csrfToken,
    { status, note },
  );

export const loadAdminAllocations = (status = "") =>
  request<AllocationResponse>(
    `/react/api/admin/order-allocations${status ? `?status=${encodeURIComponent(status)}` : ""}`,
  );

export const loadAdminAllocation = (orderId: string) =>
  request<AllocationResponse>(
    `/react/api/admin/order-allocations/${encodeURIComponent(orderId)}`,
  );

export const updateAdminBookingStatus = (
  bookingId: string,
  csrfToken: string,
  status: string,
  note = "",
) =>
  post<AllocationResponse>(
    `/react/api/admin/seller-bookings/${encodeURIComponent(bookingId)}/status`,
    csrfToken,
    { status, note },
  );

export const updateAdminSettlement = (
  bookingId: string,
  csrfToken: string,
  input: {
    settlement_status: string;
    settlement_reference?: string;
    settlement_note?: string;
  },
) =>
  post<AllocationResponse>(
    `/react/api/admin/seller-bookings/${encodeURIComponent(bookingId)}/settlement`,
    csrfToken,
    input,
  );

export const loadNearbyCatalogue = (lat: number, lng: number, radiusKm?: number) => {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radiusKm) params.set("radius_km", String(radiusKm));
  return request<NearbyResponse>(`/react/api/nearby/catalog?${params.toString()}`);
};

export const loadNearbyDiagnostics = (lat: number, lng: number, radiusKm?: number) => {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radiusKm) params.set("radius_km", String(radiusKm));
  return request<NearbyResponse>(
    `/react/api/admin/nearby-sellers/diagnostics?${params.toString()}`,
  );
};

export const syncNearbyInventory = (csrfToken: string) =>
  post<NearbyResponse>(
    "/react/api/admin/nearby-sellers/sync-inventory",
    csrfToken,
    {},
  );

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof FulfillmentApiError &&
    (error.status === 401 || error.code === "authentication_required");
}

export function isCsrfError(error: unknown): boolean {
  return error instanceof FulfillmentApiError && error.code === "csrf_failed";
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
