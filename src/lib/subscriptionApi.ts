export type SubscriptionPlanCode =
  | "weekly"
  | "monthly"
  | "three_months"
  | "custom";

export interface SubscriptionSeller {
  seller_id: string;
  seller_name: string;
  distance_km: number | null;
}

export interface SubscriptionIncludedItem {
  id?: string;
  item_id?: string;
  name: string;
  sku?: string;
  unit_label?: string;
  image_url?: string;
  quantity?: number;
  catalog_price?: string | number;
  available_seller_ids?: string[];
}

export interface SubscriptionCombination {
  id: string;
  name: string;
  description?: string;
  catalog_item_ids: string[];
  included_catalog_items?: SubscriptionIncludedItem[];
  sub_items?: SubscriptionIncludedItem[];
  item_details?: SubscriptionIncludedItem[];
  available_seller_ids: string[];
}

export interface ComplimentaryConfig {
  max_items: number;
  budget: string | number;
}

export interface SubscriptionItem {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sku?: string;
  unit_label?: string;
  base_price?: string | number;
  plan_prices: {
    weekly?: string | number;
    monthly?: string | number;
    three_months?: string | number;
    custom_per_day?: string | number;
  };
  allowed_plan_codes: SubscriptionPlanCode[];
  minimum_custom_days?: number;
  available_sellers: SubscriptionSeller[];
  catalog_combinations?: SubscriptionCombination[];
  complimentary_config?: ComplimentaryConfig;
  complimentary_choices?: SubscriptionIncludedItem[];
}

export interface SubscriptionCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  items: SubscriptionItem[];
}

export interface SubscriptionAddress {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export interface SubscriptionCatalogPayload {
  success: boolean;
  categories: SubscriptionCategory[];
  location: {
    latitude?: number;
    longitude?: number;
    name?: string;
  } | null;
  location_required: boolean;
  nearby_radius_km: number;
  nearby_seller_count: number;
  saved_addresses: SubscriptionAddress[];
  selected_saved_address_id: string;
  csrf_token: string;
  subscription_csrf_token: string;
  currency_symbol: string;
}

export interface AddSubscriptionCartInput {
  item_id: string;
  combination_id?: string;
  seller_id: string;
  plan_code: SubscriptionPlanCode;
  custom_days?: number;
  start_date: string;
  quantity: number;
  selected_delivery_dates: string[];
  complimentary_item_ids: string[];
  csrf_token: string;
  subscription_csrf_token: string;
}

export interface AddSubscriptionCartPayload {
  success: boolean;
  message: string;
  item?: Record<string, unknown>;
  cart_url?: string;
  subscription_csrf_token: string;
}

export interface SubscriptionCatalogRequestOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export class SubscriptionApiError extends Error {
  status: number;
  code: string;
  csrfToken: string;

  constructor(
    message: string,
    status: number,
    code = "SUBSCRIPTION_REQUEST_FAILED",
    csrfToken = "",
  ) {
    super(message);
    this.name = "SubscriptionApiError";
    this.status = status;
    this.code = code;
    this.csrfToken = csrfToken;
  }
}

const CATALOG_REQUEST_COALESCE_MS = 250;

let catalogRequest:
  | {
      startedAt: number;
      promise: Promise<SubscriptionCatalogPayload>;
    }
  | undefined;

function apiUrl(path: string): string {
  const base = String(
    import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      "",
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export function subscriptionAssetUrl(value?: string): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:") ||
    clean.startsWith("//")
  ) {
    return clean;
  }
  return apiUrl(clean.startsWith("/") ? clean : `/${clean}`);
}

function detailMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map((entry) => {
      if (entry && typeof entry === "object" && "msg" in entry) {
        return String((entry as { msg?: unknown }).msg || "");
      }
      return String(entry || "");
    })
    .filter(Boolean)
    .join(", ");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: init.credentials || "include",
    headers,
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    if (response.ok) {
      throw new SubscriptionApiError(
        "The server returned an invalid response. Please try again.",
        response.status || 502,
        "INVALID_SUBSCRIPTION_RESPONSE",
      );
    }
  }

  if (!response.ok || payload.success === false) {
    throw new SubscriptionApiError(
      String(
        payload.message ||
          detailMessage(payload.detail) ||
          `Request failed (${response.status}).`,
      ),
      response.status,
      String(payload.code || "SUBSCRIPTION_REQUEST_FAILED"),
      String(payload.subscription_csrf_token || ""),
    );
  }

  return payload as T;
}

export function getSubscriptionCatalog(
  options: SubscriptionCatalogRequestOptions = {},
): Promise<SubscriptionCatalogPayload> {
  const now = Date.now();

  // Coalesce only near-simultaneous uncancellable calls. This prevents
  // duplicate development/route requests without reusing stale location data.
  if (
    !options.forceRefresh &&
    !options.signal &&
    catalogRequest &&
    now - catalogRequest.startedAt <= CATALOG_REQUEST_COALESCE_MS
  ) {
    return catalogRequest.promise;
  }

  const promise = request<SubscriptionCatalogPayload>(
    "/react/api/subscriptions/catalog",
    options.signal ? { signal: options.signal } : {},
  );

  if (!options.signal) {
    const trackedRequest = { startedAt: now, promise };
    catalogRequest = trackedRequest;

    void promise.then(
      () => {
        if (catalogRequest === trackedRequest) catalogRequest = undefined;
      },
      () => {
        if (catalogRequest === trackedRequest) catalogRequest = undefined;
      },
    );
  }

  return promise;
}

export async function getSubscriptionItem(
  itemId: string,
  options: SubscriptionCatalogRequestOptions = {},
): Promise<{
  payload: SubscriptionCatalogPayload;
  category: SubscriptionCategory;
  item: SubscriptionItem;
}> {
  const payload = await getSubscriptionCatalog(options);
  for (const category of payload.categories || []) {
    const item = (category.items || []).find(
      (candidate) => candidate.id === itemId,
    );
    if (item) return { payload, category, item };
  }

  throw new SubscriptionApiError(
    "This subscription is unavailable near the selected location.",
    404,
    "SUBSCRIPTION_NOT_FOUND",
  );
}

function isCsrfError(error: unknown): error is SubscriptionApiError {
  if (!(error instanceof SubscriptionApiError)) return false;

  const code = error.code.toLowerCase();
  const message = error.message.toLowerCase();
  return (
    [400, 403, 419].includes(error.status) &&
    (code.includes("csrf") || message.includes("csrf"))
  );
}

export async function addSubscriptionToCart(
  input: AddSubscriptionCartInput,
): Promise<AddSubscriptionCartPayload> {
  const submit = (body: AddSubscriptionCartInput) => {
    const form = new URLSearchParams();
    form.set("item_id", body.item_id);
    form.set("combination_id", body.combination_id || "");
    form.set("seller_id", body.seller_id);
    form.set("plan_code", body.plan_code);
    if (body.custom_days !== undefined) {
      form.set("custom_days", String(body.custom_days));
    }
    form.set("start_date", body.start_date);
    form.set("quantity", String(body.quantity));
    form.set("subscription_csrf_token", body.subscription_csrf_token);
    form.set("csrf_token", body.csrf_token);
    body.selected_delivery_dates.forEach((date) => {
      form.append("selected_delivery_dates", date);
    });
    body.complimentary_item_ids.forEach((itemId) => {
      form.append("complimentary_item_ids", itemId);
    });

    return request<AddSubscriptionCartPayload>(
      "/react/api/subscriptions/cart/items",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRF-Token": body.csrf_token,
        },
        body: form.toString(),
      },
    );
  };

  try {
    return await submit(input);
  } catch (error) {
    if (!isCsrfError(error)) throw error;

    // Always bypass request coalescing here so the retry uses fresh tokens.
    const catalog = await getSubscriptionCatalog({ forceRefresh: true });
    return submit({
      ...input,
      csrf_token: catalog.csrf_token,
      subscription_csrf_token: catalog.subscription_csrf_token,
    });
  }
}