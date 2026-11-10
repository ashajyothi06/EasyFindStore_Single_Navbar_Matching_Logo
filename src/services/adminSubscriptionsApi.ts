const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
const ADMIN_SUBSCRIPTION_API = `${API_BASE}/react/api/subscriptions/admin`;

export const SUBSCRIPTION_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type SubscriptionWeekday = (typeof SUBSCRIPTION_WEEKDAYS)[number];

export type AdminScheduleEntry = {
  id: string;
  scope: "weekday" | "date";
  weekday?: string;
  weekday_index?: number | null;
  schedule_date?: string;
  title: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  remove_image?: boolean;
};

export type AdminDeliveryExclusion = {
  date: string;
  reason?: string;
};

export type AdminCatalogChoice = {
  id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  slug?: string;
  sku?: string;
  unit_label?: string;
  description?: string;
  image_url?: string;
  catalog_price?: string | number;
};

export type AdminCombinationSubItem = {
  id: string;
  source_catalog_item_id?: string;
  name: string;
  sku?: string;
  slug?: string;
  unit_label?: string;
  description?: string;
  quantity?: number;
};

export type AdminSubscriptionCombination = {
  id: string;
  name: string;
  description?: string;
  sub_items?: AdminCombinationSubItem[];
  item_details?: AdminCombinationSubItem[];
};

export type AdminSubscriptionItem = {
  id: string;
  category_id: string;
  serial_number?: number;
  source_catalog_item_id?: string;
  name: string;
  slug?: string;
  sku?: string;
  description?: string;
  detailed_description?: string;
  unit_label?: string;
  image_url?: string;
  base_price?: string | number;
  is_active?: boolean;
  allowed_plan_codes?: string[];
  minimum_custom_days?: number;
  plan_prices?: {
    weekly?: string | number;
    monthly?: string | number;
    three_months?: string | number;
    custom_per_day?: string | number;
  };
  catalog_combinations?: AdminSubscriptionCombination[];
  complimentary_config?: {
    max_items?: number;
    budget?: string | number;
    eligible_item_ids?: string[];
  };
  complimentary_choices?: AdminCatalogChoice[];
  content_schedule?: {
    weekday_entries?: AdminScheduleEntry[];
    date_entries?: AdminScheduleEntry[];
  };
  delivery_exclusions?: {
    excluded_weekdays?: string[];
    excluded_dates?: AdminDeliveryExclusion[];
  };
};

export type AdminSubscriptionCategory = {
  id: string;
  serial_number?: number;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  items?: AdminSubscriptionItem[];
};

export type AdminSubscriptionCatalogPayload = {
  success: boolean;
  categories: AdminSubscriptionCategory[];
  catalog_items: AdminCatalogChoice[];
  currency_symbol: string;
  subscription_csrf_token: string;
  message?: string;
};

export type AdminSubscriptionItemPayload = {
  success: boolean;
  category: AdminSubscriptionCategory;
  item: AdminSubscriptionItem | null;
  catalog_items: AdminCatalogChoice[];
  allowed_plan_codes?: string[];
  currency_symbol: string;
  subscription_csrf_token: string;
  message?: string;
};

export type SaveAdminSubscriptionItemInput = {
  id: string;
  category_id: string;
  serial_number: number;
  source_catalog_item_id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  detailed_description: string;
  unit_label: string;
  remove_image: boolean;
  weekly_price: string;
  monthly_price: string;
  three_months_price: string;
  custom_price_per_day: string;
  allowed_plan_codes: string[];
  minimum_custom_days: number;
  is_active: boolean;
  complimentary_max_items: number;
  complimentary_budget: string;
  complimentary_item_ids: string[];
  catalog_combinations_json: string;
  content_schedule: {
    weekday_entries: AdminScheduleEntry[];
    date_entries: AdminScheduleEntry[];
  };
  delivery_exclusions: {
    excluded_weekdays: string[];
    excluded_dates: AdminDeliveryExclusion[];
  };
  subscription_csrf_token: string;
};

export class AdminSubscriptionApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "SUBSCRIPTION_REQUEST_FAILED") {
    super(message);
    this.name = "AdminSubscriptionApiError";
    this.status = status;
    this.code = code;
  }
}

export function isAdminSubscriptionAuthenticationError(error: unknown): boolean {
  return (
    error instanceof AdminSubscriptionApiError &&
    (error.status === 401 || error.status === 403)
  );
}

export function adminSubscriptionAssetUrl(value: unknown): string {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: (await response.text()).replace(/<[^>]*>/g, " ") };
  if (!response.ok || payload?.success === false) {
    const detail = Array.isArray(payload?.detail)
      ? payload.detail
          .map((entry: { msg?: string } | string) =>
            typeof entry === "string" ? entry : String(entry?.msg || ""),
          )
          .filter(Boolean)
          .join(" ")
      : String(payload?.detail || "");
    throw new AdminSubscriptionApiError(
      String(
        payload?.message ||
          detail ||
          response.statusText ||
          `Request failed with status ${response.status}.`,
      )
        .replace(/\s+/g, " ")
        .trim(),
      response.status,
      String(payload?.code || "SUBSCRIPTION_REQUEST_FAILED"),
    );
  }
  return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${ADMIN_SUBSCRIPTION_API}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  return parseResponse<T>(response);
}

export function loadAdminSubscriptionCatalog(): Promise<AdminSubscriptionCatalogPayload> {
  return request<AdminSubscriptionCatalogPayload>("/catalog");
}

export async function loadAdminSubscriptionCategory(
  categoryId: string,
): Promise<{
  success: boolean;
  category: AdminSubscriptionCategory;
  subscription_csrf_token: string;
}> {
  return request(`/categories/${encodeURIComponent(categoryId)}`);
}

export function loadAdminSubscriptionItem(
  categoryId: string,
  itemId?: string,
): Promise<AdminSubscriptionItemPayload> {
  const suffix = itemId
    ? `/${encodeURIComponent(itemId)}`
    : "/new";
  return request(
    `/categories/${encodeURIComponent(categoryId)}/items${suffix}`,
  );
}

export function seedAdminSubscriptionCatalog(
  subscriptionCsrfToken: string,
): Promise<AdminSubscriptionCatalogPayload> {
  return request("/seed", {
    method: "POST",
    body: JSON.stringify({ subscription_csrf_token: subscriptionCsrfToken }),
  });
}

export async function saveAdminSubscriptionCategory(input: {
  id?: string;
  name: string;
  slug: string;
  description: string;
  serial_number: number;
  is_active: boolean;
  remove_image: boolean;
  image_file?: File | null;
  subscription_csrf_token: string;
}): Promise<AdminSubscriptionCatalogPayload> {
  const body = new FormData();
  body.append("id", input.id || "");
  body.append("name", input.name);
  body.append("slug", input.slug);
  body.append("description", input.description);
  body.append("serial_number", String(input.serial_number));
  body.append("is_active", input.is_active ? "1" : "");
  body.append("remove_image", input.remove_image ? "1" : "");
  body.append("subscription_csrf_token", input.subscription_csrf_token);
  if (input.image_file) {
    const compressed = await compressSubscriptionImage(input.image_file);
    body.append("image_file", compressed, compressed.name);
  }
  return request("/categories/save", { method: "POST", body });
}

export function deleteAdminSubscriptionCategory(
  categoryId: string,
  subscriptionCsrfToken: string,
): Promise<{ success: boolean; message?: string; subscription_csrf_token?: string }> {
  return request(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
    body: JSON.stringify({ subscription_csrf_token: subscriptionCsrfToken }),
  });
}

export function saveAdminSubscriptionItem(
  input: SaveAdminSubscriptionItemInput,
): Promise<AdminSubscriptionCatalogPayload> {
  return request("/items/save", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAdminSubscriptionItem(
  categoryId: string,
  itemId: string,
  subscriptionCsrfToken: string,
): Promise<{ success: boolean; message?: string; subscription_csrf_token?: string }> {
  return request(
    `/categories/${encodeURIComponent(categoryId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ subscription_csrf_token: subscriptionCsrfToken }),
    },
  );
}

const MAX_IMAGE_BYTES = 700 * 1024;
const MAX_IMAGE_DIMENSION = 1400;

async function compressSubscriptionImage(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_BYTES || typeof document === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  let quality = 0.86;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image compression is unavailable.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= MAX_IMAGE_BYTES) break;
    if (quality > 0.58) quality -= 0.08;
    else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      quality = 0.78;
    }
  }
  bitmap.close();
  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name} could not be compressed below 700 KB.`);
  }
  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "") || "subscription-image"}.webp`,
    { type: "image/webp", lastModified: Date.now() },
  );
}

export async function uploadAdminSubscriptionImage(input: {
  itemId: string;
  targetType: "item" | "weekday" | "date";
  targetKey: string;
  file: File;
  subscriptionCsrfToken: string;
}): Promise<{
  success: boolean;
  image_url: string;
  subscription_csrf_token: string;
}> {
  const body = new FormData();
  const file = await compressSubscriptionImage(input.file);
  body.append("subscription_csrf_token", input.subscriptionCsrfToken);
  body.append("target_type", input.targetType);
  body.append("target_key", input.targetKey);
  body.append("image_file", file, file.name);
  const response = await fetch(
    `${ADMIN_SUBSCRIPTION_API}/items/${encodeURIComponent(input.itemId)}/image`,
    { method: "POST", body, credentials: "include" },
  );
  return parseResponse(response);
}
