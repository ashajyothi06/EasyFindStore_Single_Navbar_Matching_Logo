export interface SubscriptionBookingItem {
  id?: string;
  item_id?: string;
  name: string;
  unit_label?: string;
  quantity?: number;
}

export interface SellerSubscriptionCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface SellerSubscriptionDelivery {
  id: string;
  subscription_order_id: string;
  booking_id?: string;
  item_id: string;
  item_name: string;
  combination_name?: string;
  included_catalog_items?: SubscriptionBookingItem[];
  complimentary_items?: SubscriptionBookingItem[];
  quantity: number;
  sequence: number;
  scheduled_date: string;
  status: string;
  delivery_agent_id?: string;
  delivery_schedule_mode?: string;
  delivery_schedule_label?: string;
  customer: SellerSubscriptionCustomer;
  plan_code?: string;
  payment_status?: string;
  order_status?: string;
  delivery_count?: number;
}

export interface SellerSubscriptionOrder {
  id: string;
  booking_id?: string;
  item_id: string;
  item_name: string;
  combination_name?: string;
  included_catalog_items?: SubscriptionBookingItem[];
  complimentary_items?: SubscriptionBookingItem[];
  quantity: number;
  plan_code: string;
  start_date: string;
  end_date: string;
  delivery_dates: string[];
  delivery_count: number;
  delivery_schedule_label?: string;
  payment_status: string;
  status: string;
  customer: SellerSubscriptionCustomer;
}

export interface SubscriptionBookingSummary {
  today: number;
  upcoming: number;
  overdue: number;
  total_orders: number;
  total_deliveries: number;
}

export interface SellerSubscriptionBookingsPayload {
  success: boolean;
  authenticated?: boolean;
  today: string;
  scope: string;
  selected_date?: string;
  summary: SubscriptionBookingSummary;
  orders: SellerSubscriptionOrder[];
  deliveries: SellerSubscriptionDelivery[];
  allowed_scopes: string[];
  currency_symbol: string;
  csrf_token: string;
}

export interface SellerSubscriptionBookingDetailPayload {
  success: boolean;
  message?: string;
  authenticated?: boolean;
  today: string;
  order: SellerSubscriptionOrder;
  deliveries: SellerSubscriptionDelivery[];
  currency_symbol: string;
  csrf_token: string;
}

export class SellerSubscriptionBookingError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SellerSubscriptionBookingError";
    this.status = status;
    this.code = code;
  }
}

function apiUrl(path: string): string {
  const base = String(
    import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      "",
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // A consistent error is thrown below.
  }
  if (!response.ok || payload.success === false) {
    throw new SellerSubscriptionBookingError(
      String(payload.message || `Request failed (${response.status}).`),
      response.status,
      String(payload.code || "subscription_booking_request_failed"),
    );
  }
  return payload as T;
}

export function loadSellerSubscriptionBookings(
  scope = "upcoming",
  selectedDate = "",
) {
  const query = new URLSearchParams();
  query.set("scope", scope);
  if (selectedDate) query.set("date", selectedDate);
  return request<SellerSubscriptionBookingsPayload>(
    `/react/api/seller/subscription-bookings?${query.toString()}`,
  );
}

export function loadSellerSubscriptionBooking(orderId: string) {
  return request<SellerSubscriptionBookingDetailPayload>(
    `/react/api/seller/subscription-bookings/${encodeURIComponent(orderId)}`,
  );
}

export function updateSellerSubscriptionDeliveryStatus(
  orderId: string,
  deliveryId: string,
  status: "accepted" | "preparing" | "completed",
  csrfToken: string,
) {
  return request<SellerSubscriptionBookingDetailPayload>(
    (
      `/react/api/seller/subscription-bookings/${encodeURIComponent(orderId)}` +
      `/deliveries/${encodeURIComponent(deliveryId)}/status`
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        status,
        csrf_token: csrfToken,
      }),
    },
  );
}

export function isSellerSubscriptionAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof SellerSubscriptionBookingError &&
    (error.status === 401 || error.code === "authentication_required")
  );
}
