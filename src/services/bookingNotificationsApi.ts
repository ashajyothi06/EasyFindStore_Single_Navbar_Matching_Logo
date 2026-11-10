const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export interface BookingNotificationSummary {
  audience?: "admin" | "manager";
  viewer_id?: string;
  total_count?: number;
  new_count?: number;
  assigned_count?: number;
  pending_response_count?: number;
  accepted_count?: number;
  rejected_count?: number;
  pending_fine_count?: number;
  pending_fine_amount?: number;
  reassignment_required_count?: number;
  active_count?: number;
  preparing_count?: number;
  ready_count?: number;
  completed_count?: number;
  cancelled_count?: number;
  payment_waiting_count?: number;
  paid_count?: number;
  split_booking_count?: number;
  allocated_unit_count?: number;
  seller_payable_amount?: number;
  latest_booking_at?: string | null;
  has_new_orders?: boolean;
  recent_bookings?: SellerBookingNotification[];
}

export interface BookingNotificationUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

export interface SellerBookingNotification {
  id: string;
  booking_number?: string;
  parent_order_id?: string;
  parent_order_number?: string;
  seller_id?: string;
  seller_name?: string;
  business_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  settlement_status?: string;
  seller_payable_amount?: number;
  subtotal?: number;
  item_count?: number;
  distinct_item_count?: number;
  distance_km?: number;
  item_names?: string[];
  items?: Array<Record<string, any>>;
  delivery_address?: Record<string, any>;
  is_new?: boolean;
  can_record_decision?: boolean;
  reassignment_required?: boolean;
  seller_rejection_reason?: string;
  seller_response_note?: string;
  seller_rejection_fine?: {
    applicable?: boolean;
    amount?: number;
    status?: string;
    manager_note?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    collected_at?: string;
    waived_at?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface BookingNotificationResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  audience?: "admin" | "manager";
  booking_notifications_enabled?: boolean;
  user?: BookingNotificationUser;
  bookings?: SellerBookingNotification[];
  booking?: SellerBookingNotification;
  order?: Record<string, any> | null;
  summary?: BookingNotificationSummary;
  status_filter?: string;
  allowed_filters?: string[];
  allowed_decisions?: string[];
  fine_statuses?: string[];
  marked_seen_count?: number;
  currency_symbol?: string;
  navigation?: Record<string, string>;
  csrf_token?: string;
}

export class BookingNotificationsApiError extends Error {
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
    this.name = "BookingNotificationsApiError";
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
      code?: string;
    };

  if (!response.ok || payload.success === false) {
    throw new BookingNotificationsApiError(
      payload.message ||
        "Unable to complete the booking request.",
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
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
}

export const loadBookingNotificationsSession = () =>
  request<BookingNotificationResponse>(
    "/react/api/booking-notifications/session",
  );

export const loadAdminSellerBookingSummary = () =>
  request<BookingNotificationResponse>(
    "/react/api/admin/seller-bookings/summary",
  );

export const loadManagerSellerBookingSummary = () =>
  request<BookingNotificationResponse>(
    "/react/api/seller-delivery-manager/bookings/summary",
  );

export function loadAdminSellerBookings(
  status = "all",
) {
  return request<BookingNotificationResponse>(
    `/react/api/admin/seller-bookings?status=${encodeURIComponent(
      status,
    )}`,
  );
}

export function loadManagerSellerBookings(
  status = "all",
) {
  return request<BookingNotificationResponse>(
    `/react/api/seller-delivery-manager/bookings?status=${encodeURIComponent(
      status,
    )}`,
  );
}

export const loadAdminSellerBooking = (
  bookingId: string,
) =>
  request<BookingNotificationResponse>(
    `/react/api/admin/seller-bookings/${encodeURIComponent(
      bookingId,
    )}`,
  );

export const loadManagerSellerBooking = (
  bookingId: string,
) =>
  request<BookingNotificationResponse>(
    `/react/api/seller-delivery-manager/bookings/${encodeURIComponent(
      bookingId,
    )}`,
  );

export const submitManagerSellerDecision = (
  bookingId: string,
  csrfToken: string,
  input: {
    decision: "accepted" | "rejected";
    note?: string;
    rejection_reason?: string;
    fine_amount?: number | string;
  },
) =>
  post<BookingNotificationResponse>(
    `/react/api/seller-delivery-manager/bookings/${encodeURIComponent(
      bookingId,
    )}/status`,
    csrfToken,
    input,
  );

export const updateManagerRejectionFine = (
  bookingId: string,
  csrfToken: string,
  input: {
    fine_amount: number | string;
    fine_status: string;
    fine_note?: string;
  },
) =>
  post<BookingNotificationResponse>(
    `/react/api/seller-delivery-manager/bookings/${encodeURIComponent(
      bookingId,
    )}/rejection-fine`,
    csrfToken,
    input,
  );

export function isBookingAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof BookingNotificationsApiError &&
    (
      error.status === 401 ||
      error.code === "authentication_required"
    )
  );
}

export function isBookingCsrfError(
  error: unknown,
): boolean {
  return (
    error instanceof BookingNotificationsApiError &&
    error.code === "csrf_failed"
  );
}

export function bookingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
