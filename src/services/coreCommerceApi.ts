const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export interface CoreAccount {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  login_method?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  is_blocked?: boolean;
  is_deleted?: boolean;
  email_verified?: boolean;
  account_source?: string;
  rejection_reason?: string;
  seller_verification_status?: string;
  delivery_verification_status?: string;
  business_name?: string;
  gst_number?: string;
  pickup_address?: string;
  product_category?: string;
  bank_verified?: boolean;
  vehicle_type?: string;
  vehicle_number?: string;
  license_number?: string;
  service_area?: string;
  service_radius_km?: number;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
  max_bulk_orders?: number;
  max_active_orders?: number;
}

export interface ProductMedia {
  type: "image" | "video" | "document";
  url: string;
  name: string;
}

export interface ProductVariant {
 id: string; key: string; color?: string; size?: string; material?: string; capacity?: string; style?: string; weight?: string; model?: string;
 image_url?: string; price: number; stock_quantity: number; sku?: string; delivery_extra_fee?: number;
}
export interface CatalogItem {
  parent_product_id?: string;
  id: string;
  name: string;
  slug: string;
  group_name?: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number | null;
  regular_price?: number;
  sale_active?: boolean;
  sale_savings?: number;
  discount_percent?: number;
  sale_type?: string;
  sale_value?: number;
  sale_start?: string;
  sale_end?: string;
  sku?: string;
  size?: string;
  unit_label?: string;
  stock_quantity?: number;
  variants?: ProductVariant[];
  delivery_size?: string;
  delivery_fee_mode?: string;

  // New ordering field. Keep sort_order for backward compatibility.
  serial_number?: number;
  sort_order?: number;

  is_active?: boolean;
  is_featured?: boolean;

  // These can be present on item payloads returned by the backend.
  product_type?: string;
  delivery_time_slot?: string;
  delivery_type?: string;
  delivery_days?: number;
  delivery_extra_fee?: number;
  media?: ProductMedia[];
  brand?: string;
  highlights?: string;
  specifications?: string;
  warranty?: string;
  return_days?: number;
}

export interface CatalogCategory {
  variant_attributes?: string[];
  delivery_size?: string;
  delivery_fee_override?: number | null;
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  description?: string;
  image_url?: string;

  // Category metadata used by the updated admin/category form.
  product_type?: string;
  delivery_time_slot?: string;
  delivery_type?: string;

  // Public catalogue order is controlled by serial_number.
  // sort_order remains available for older records/fallback ordering.
  serial_number?: number;
  sort_order?: number;

  is_active?: boolean;
  items?: CatalogItem[];
}

export interface CoreApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  errors?: string[];
  authenticated?: boolean;
  csrf_token?: string;
  account?: CoreAccount;
  accounts?: CoreAccount[];
  manager?: CoreAccount;
  managers?: CoreAccount[];
  admin?: CoreAccount;
  category?: CatalogCategory;
  categories?: CatalogCategory[];
  item?: CatalogItem;
  summary?: Record<string, any>;
  catalog_summary?: Record<string, any>;
  features?: Record<string, boolean>;
  navigation?: Record<string, string>;
  item_image_max_mb?: number;
  category_image_max_mb?: number;
  [key: string]: any;
}

export class CoreCommerceApiError extends Error {
  status?: number;
  code?: string;
  payload?: CoreApiResponse;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      payload?: CoreApiResponse;
    } = {},
  ) {
    super(message);
    this.name = "CoreCommerceApiError";
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
    .catch(() => ({}))) as T & CoreApiResponse;

  if (!response.ok || payload.success === false) {
    throw new CoreCommerceApiError(
      payload.message ||
        "Unable to complete the request.",
      {
        status: response.status,
        code: payload.code,
        payload,
      },
    );
  }

  return payload;
}

function postJson<T>(
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

function postForm<T>(
  path: string,
  csrfToken: string,
  form: FormData,
): Promise<T> {
  // Do not set Content-Type manually for FormData.
  // The browser must add the multipart boundary automatically.
  //
  // Keep a form-field copy of the token as well as the X-CSRF-Token header.
  // This makes the request compatible with both the React API CSRF check and
  // the FastAPI/Flask compatibility form parser.
  if (!form.has("csrf_token")) {
    form.set("csrf_token", csrfToken);
  }

  return request<T>(path, {
    method: "POST",
    headers: {
      "X-CSRF-Token": csrfToken,
    },
    body: form,
  });
}

/**
 * Category create/update now supports multipart FormData because category
 * images are uploaded from the React form.
 *
 * Record<string, unknown> is intentionally still accepted so any older caller
 * that has not yet moved to FormData continues to work.
 */
function postCategoryPayload<T>(
  path: string,
  csrfToken: string,
  input: FormData | Record<string, unknown>,
): Promise<T> {
  if (input instanceof FormData) {
    return postForm<T>(path, csrfToken, input);
  }

  return postJson<T>(path, csrfToken, input);
}

export const loadCoreHome = () =>
  request<CoreApiResponse>(
    "/react/api/home",
  );

export const loadPublicCatalog = () =>
  request<CoreApiResponse>(
    "/react/api/catalog/categories",
  );

export const loadAdminDashboard = () =>
  request<CoreApiResponse>(
    "/react/api/admin/dashboard",
  );

export function loadAdminAccounts(
  input: {
    role?: string;
    status?: string;
    query?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (input.role) params.set("role", input.role);
  if (input.status) params.set("status", input.status);
  if (input.query) params.set("q", input.query);

  const query = params.toString();

  return request<CoreApiResponse>(
    `/react/api/admin/accounts${
      query ? `?${query}` : ""
    }`,
  );
}

export const loadAdminAccount = (
  userId: string,
) =>
  request<CoreApiResponse>(
    `/react/api/admin/accounts/${encodeURIComponent(
      userId,
    )}`,
  );

export const updateAdminAccountStatus = (
  userId: string,
  csrfToken: string,
  status: "approved" | "disabled",
) =>
  postJson<CoreApiResponse>(
    `/react/api/admin/accounts/${encodeURIComponent(
      userId,
    )}/status`,
    csrfToken,
    { status },
  );

export const requestAdminAccountRejectionReview = (
  userId: string,
  csrfToken: string,
) =>
  postJson<CoreApiResponse>(
    `/react/api/admin/accounts/${encodeURIComponent(
      userId,
    )}/reject`,
    csrfToken,
    {},
  );

export const loadAdminCatalog = () =>
  request<CoreApiResponse>(
    "/react/api/admin/catalog",
  );

export const loadDefaultCatalog = (
  csrfToken: string,
) =>
  postJson<CoreApiResponse>(
    "/react/api/admin/catalog/load-defaults",
    csrfToken,
    {},
  );

export const loadAdminCategory = (
  categoryId: string,
) =>
  request<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}`,
  );

export const createAdminCategory = (
  csrfToken: string,
  input: FormData | Record<string, unknown>,
) =>
  postCategoryPayload<CoreApiResponse>(
    "/react/api/admin/catalog/categories",
    csrfToken,
    input,
  );

export const updateAdminCategory = (
  categoryId: string,
  csrfToken: string,
  input: FormData | Record<string, unknown>,
) =>
  postCategoryPayload<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}`,
    csrfToken,
    input,
  );

export const deleteAdminCategory = (
  categoryId: string,
  csrfToken: string,
) =>
  postJson<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}/delete`,
    csrfToken,
    {},
  );

export const loadAdminItem = (
  categoryId: string,
  itemId: string,
) =>
  request<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}/items/${encodeURIComponent(itemId)}`,
  );

export const createAdminItem = (
  categoryId: string,
  csrfToken: string,
  form: FormData,
) =>
  postForm<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}/items`,
    csrfToken,
    form,
  );

export const updateAdminItem = (
  categoryId: string,
  itemId: string,
  csrfToken: string,
  form: FormData,
) =>
  postForm<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}/items/${encodeURIComponent(itemId)}`,
    csrfToken,
    form,
  );

export const deleteAdminItem = (
  categoryId: string,
  itemId: string,
  csrfToken: string,
) =>
  postJson<CoreApiResponse>(
    `/react/api/admin/catalog/categories/${encodeURIComponent(
      categoryId,
    )}/items/${encodeURIComponent(itemId)}/delete`,
    csrfToken,
    {},
  );

export const loadSellerDeliveryManagers = () =>
  request<CoreApiResponse>(
    "/react/api/admin/seller-delivery-managers",
  );

export const loadManagerCreateSession = () =>
  request<CoreApiResponse>(
    "/react/api/admin/seller-delivery-managers/create",
  );

export const createSellerDeliveryManager = (
  csrfToken: string,
  input: {
    full_name: string;
    email: string;
    phone: string;
  },
) =>
  postJson<CoreApiResponse>(
    "/react/api/admin/seller-delivery-managers",
    csrfToken,
    input,
  );

export function isCoreAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof CoreCommerceApiError &&
    (
      error.status === 401 ||
      error.code === "authentication_required"
    )
  );
}

export function isCoreCsrfError(
  error: unknown,
): boolean {
  return (
    error instanceof CoreCommerceApiError &&
    error.code === "csrf_failed"
  );
}
