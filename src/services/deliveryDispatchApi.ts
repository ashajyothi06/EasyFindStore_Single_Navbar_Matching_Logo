const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export type DispatchPageRole =
  | "admin"
  | "manager"
  | "delivery";

export interface DispatchUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  vehicle_type?: string;
  vehicle_number?: string;
  service_area?: string;
  service_radius_km?: number;
  max_bulk_orders?: number;
  max_active_orders?: number;
  max_route_km?: number;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
  delivery_availability?: Record<string, unknown>;
}

export interface DispatchSummary {
  ready_booking_count?: number;
  ready_order_count?: number;
  eligible_delivery_people?: number;
  open_draft_count?: number;
  draft_order_count?: number;
  total_batches?: number;
  new_batch_count?: number;
  active_batches?: number;
  completed_batches?: number;
  assigned_orders?: number;
  pending_payout_amount?: number;
  pending_cod_collection?: number;
  recent_batches?: DispatchBatch[];
}

export interface DispatchNavigation {
  home_url?: string;
  batch_detail_pattern?: string;
}

export interface DispatchCandidate {
  delivery_person_id: string;
  delivery_person_name: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  service_area?: string;
  service_radius_km?: number;
  active_order_count?: number;
  available_capacity?: number;
  max_bulk_orders?: number;
  pickup_km?: number;
  delivery_km?: number;
  combined_km?: number;
  first_pickup_km?: number;
  pickup_count?: number;
  drop_count?: number;
  route?: Record<string, any>;
  score?: number;
}

export interface DispatchBookingRow {
  id?: string;
  booking_id?: string;
  booking_number?: string;
  order_id?: string;
  parent_order_id?: string;
  parent_order_number?: string;
  seller_id?: string;
  seller_name?: string;
  business_name?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Record<string, any>;
  item_count?: number;
  distance_km?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  available_for_selection?: boolean;
  candidate_count?: number;
  nearest_candidate?: DispatchCandidate | null;
  assigned?: Record<string, any> | null;
  draft?: Record<string, any> | null;
  [key: string]: any;
}

export interface DispatchOrderRow {
  order_id: string;
  parent_order_id?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  seller_booking_ids?: string[];
  seller_booking_count?: number;
  seller_pickup_count?: number;
  seller_pickup_names?: string[];
  item_count?: number;
  payment_method?: string;
  payment_status?: string;
  all_bookings_ready?: boolean;
  candidate_count?: number;
  candidates?: DispatchCandidate[];
  assigned?: Record<string, any> | null;
  draft?: Record<string, any> | null;
  created_at?: string;
}

export interface DispatchDraft {
  id: string;
  draft_number: string;
  status: string;
  delivery_person_id: string;
  delivery_person_name: string;
  delivery_person_phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  order_ids?: string[];
  booking_ids?: string[];
  order_count?: number;
  seller_booking_count?: number;
  pickup_count?: number;
  drop_count?: number;
  pickup_km?: number;
  delivery_km?: number;
  combined_km?: number;
  route?: Record<string, any>;
  per_order_metrics?: Array<Record<string, any>>;
  validation_status?: string;
  validation_message?: string;
  finalized_batch_id?: string;
  finalized_batch_number?: string;
  [key: string]: any;
}

export interface DispatchBatch {
  id: string;
  batch_number: string;
  status: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  booking_ids?: string[];
  parent_order_ids?: string[];
  booking_count?: number;
  order_count?: number;
  pickup_count?: number;
  drop_count?: number;
  item_count?: number;
  pickup_manifest?: Array<Record<string, any>>;
  drop_manifest?: Array<Record<string, any>>;
  route?: Record<string, any>;
  estimated_route_km?: number;
  payout?: Record<string, any>;
  payout_amount?: number;
  payout_status?: string;
  payout_reference?: string;
  payout_note?: string;
  cod_collection_amount?: number;
  cod_collection_status?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface DispatchPageResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  user?: DispatchUser;
  page_role?: DispatchPageRole;
  order_rows?: DispatchOrderRow[];
  booking_rows?: DispatchBookingRow[];
  open_drafts?: DispatchDraft[];
  selected_draft?: DispatchDraft | null;
  batches?: DispatchBatch[];
  summary?: DispatchSummary;
  currency_symbol?: string;
  navigation?: DispatchNavigation;
  csrf_token?: string;
}

export interface DispatchPreview {
  selected_booking_ids: string[];
  requested_booking_ids: string[];
  auto_included_booking_count: number;
  selected_bookings: DispatchBookingRow[];
  booking_count: number;
  order_ids: string[];
  order_count: number;
  pickup_count: number;
  pickup_names: string[];
  drop_count: number;
  item_count: number;
  candidates: DispatchCandidate[];
  draft_id?: string;
  draft_number?: string;
  locked_delivery_person_id?: string;
  locked_delivery_person_name?: string;
}

export interface DispatchPreviewResponse {
  success: boolean;
  message?: string;
  code?: string;
  preview?: DispatchPreview;
  page_role?: DispatchPageRole;
  currency_symbol?: string;
  csrf_token?: string;
}

export interface DraftResponse {
  success: boolean;
  message?: string;
  code?: string;
  draft?: DispatchDraft;
  page_role?: DispatchPageRole;
  currency_symbol?: string;
  finalized_batch_id?: string;
  redirect_url?: string;
  csrf_token?: string;
}

export interface BatchListResponse {
  success: boolean;
  message?: string;
  code?: string;
  batches?: DispatchBatch[];
  summary?: DispatchSummary;
  currency_symbol?: string;
  navigation?: DispatchNavigation;
  csrf_token?: string;
}

export interface BatchDetailResponse {
  success: boolean;
  message?: string;
  code?: string;
  batch?: DispatchBatch;
  delivery_person?: DispatchUser | null;
  page_role?: DispatchPageRole;
  allowed_statuses?: string[];
  allowed_payout_statuses?: string[];
  currency_symbol?: string;
  csrf_token?: string;
}

export interface RegistrationSessionResponse {
  success: boolean;
  csrf_token?: string;
  geocoder_enabled?: boolean;
  defaults?: {
    service_radius_km?: number;
    max_bulk_orders?: number;
    max_active_orders?: number;
  };
  allowed_location_sources?: string[];
  navigation?: {
    login_url?: string;
    registration_url?: string;
  };
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  name?: string;
  display_name?: string;
  maps_url?: string;
  source?: string;
}

export interface LocationSuggestionsResponse {
  success: boolean;
  message?: string;
  suggestions?: DeliveryLocation[];
  location?: DeliveryLocation;
}

export interface DeliveryRegistrationInput {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  service_area: string;
  service_radius_km: number;
  max_bulk_orders: number;
  max_active_orders: number;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_maps_url?: string;
  location_name?: string;
  location_source?: string;
  location_accuracy_meters?: number | null;
  location_input?: string;
}

export interface DeliveryRegistrationResponse {
  success: boolean;
  message?: string;
  code?: string;
  errors?: string[];
  user?: DispatchUser | null;
  status?: string;
  login_url?: string;
  csrf_token?: string;
}

export class DeliveryDispatchApiError extends Error {
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
    this.name = "DeliveryDispatchApiError";
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
    throw new DeliveryDispatchApiError(
      payload.message ||
        "Unable to complete the delivery request.",
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

export const loadDeliveryRegistrationSession = () =>
  request<RegistrationSessionResponse>(
    "/react/api/register/delivery/session",
  );

export const suggestDeliveryLocations = (query: string) =>
  request<LocationSuggestionsResponse>(
    `/react/api/delivery-location/suggest?q=${encodeURIComponent(
      query,
    )}`,
  );

export const reverseDeliveryLocation = (
  latitude: number,
  longitude: number,
) =>
  request<LocationSuggestionsResponse>(
    `/react/api/delivery-location/reverse?lat=${encodeURIComponent(
      String(latitude),
    )}&lng=${encodeURIComponent(String(longitude))}`,
  );

export const parseDeliveryLocation = (value: string) =>
  request<LocationSuggestionsResponse>(
    `/react/api/delivery-location/parse?value=${encodeURIComponent(
      value,
    )}`,
  );

export const registerDeliveryPerson = (
  csrfToken: string,
  input: DeliveryRegistrationInput,
) =>
  post<DeliveryRegistrationResponse>(
    "/react/api/register/delivery",
    csrfToken,
    input as unknown as Record<string, unknown>,
  );

export const loadDispatchSession = () =>
  request<DispatchPageResponse>(
    "/react/api/delivery-dispatch/session",
  );

export function loadAdminDispatch(draftId = "") {
  const query = draftId
    ? `?draft_id=${encodeURIComponent(draftId)}`
    : "";
  return request<DispatchPageResponse>(
    `/react/api/admin/delivery-dispatch${query}`,
  );
}

export function loadManagerDispatch(draftId = "") {
  const query = draftId
    ? `?draft_id=${encodeURIComponent(draftId)}`
    : "";
  return request<DispatchPageResponse>(
    `/react/api/seller-delivery-manager/delivery-dispatch${query}`,
  );
}

export const previewMultipleBookings = (
  csrfToken: string,
  bookingIds: string[],
  draftId = "",
) =>
  post<DispatchPreviewResponse>(
    "/react/api/delivery-dispatch/manual/multiple-preview",
    csrfToken,
    {
      booking_ids: bookingIds,
      draft_id: draftId,
    },
  );

export const createMultipleBookingDraft = (
  csrfToken: string,
  input: {
    booking_ids: string[];
    delivery_person_id: string;
    draft_id?: string;
  },
) =>
  post<DraftResponse>(
    "/react/api/delivery-dispatch/manual/multiple-create",
    csrfToken,
    input,
  );

export const addOrderToDeliveryDraft = (
  csrfToken: string,
  input: {
    order_id: string;
    delivery_person_id: string;
    draft_id?: string;
  },
) =>
  post<DraftResponse>(
    "/react/api/delivery-dispatch/manual/add-order",
    csrfToken,
    input,
  );

export const loadDeliveryDraft = (draftId: string) =>
  request<DraftResponse>(
    `/react/api/delivery-dispatch/drafts/${encodeURIComponent(
      draftId,
    )}`,
  );

export const loadDeliveryDraftPrice = (
  draftId: string,
) =>
  request<DraftResponse>(
    `/react/api/delivery-dispatch/drafts/${encodeURIComponent(
      draftId,
    )}/price`,
  );

export const removeOrderFromDeliveryDraft = (
  draftId: string,
  csrfToken: string,
  orderId: string,
) =>
  post<DraftResponse>(
    `/react/api/delivery-dispatch/drafts/${encodeURIComponent(
      draftId,
    )}/remove-order`,
    csrfToken,
    { order_id: orderId },
  );

export const cancelDeliveryDraft = (
  draftId: string,
  csrfToken: string,
) =>
  post<DraftResponse>(
    `/react/api/delivery-dispatch/drafts/${encodeURIComponent(
      draftId,
    )}/cancel`,
    csrfToken,
    {},
  );

export const finalizeDeliveryDraft = (
  draftId: string,
  csrfToken: string,
  finalDeliveryAmount: number,
  note = "",
) =>
  post<DraftResponse>(
    `/react/api/delivery-dispatch/drafts/${encodeURIComponent(
      draftId,
    )}/finalize`,
    csrfToken,
    {
      final_delivery_amount: finalDeliveryAmount,
      note,
    },
  );

export const loadDeliveryBatches = () =>
  request<BatchListResponse>(
    "/react/api/delivery/batches",
  );

export const loadDeliveryBatch = (batchId: string) =>
  request<BatchDetailResponse>(
    `/react/api/delivery/batches/${encodeURIComponent(
      batchId,
    )}`,
  );

export const loadAdminDeliveryBatch = (
  batchId: string,
) =>
  request<BatchDetailResponse>(
    `/react/api/admin/delivery-dispatch/batches/${encodeURIComponent(
      batchId,
    )}`,
  );

export const loadManagerDeliveryBatch = (
  batchId: string,
) =>
  request<BatchDetailResponse>(
    `/react/api/seller-delivery-manager/delivery-dispatch/batches/${encodeURIComponent(
      batchId,
    )}`,
  );

export const updateDeliveryBatchStatus = (
  batchId: string,
  csrfToken: string,
  status: string,
  note = "",
) =>
  post<BatchDetailResponse>(
    `/react/api/delivery/batches/${encodeURIComponent(
      batchId,
    )}/status`,
    csrfToken,
    { status, note },
  );

export const updateDeliveryBatchPayout = (
  batchId: string,
  csrfToken: string,
  input: {
    payout_status: string;
    payout_reference?: string;
    payout_note?: string;
  },
) =>
  post<BatchDetailResponse>(
    `/react/api/admin/delivery-dispatch/batches/${encodeURIComponent(
      batchId,
    )}/payout`,
    csrfToken,
    input,
  );

export function isAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof DeliveryDispatchApiError &&
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
    error instanceof DeliveryDispatchApiError &&
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
