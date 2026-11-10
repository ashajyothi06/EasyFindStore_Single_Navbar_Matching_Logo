const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export interface SellerCatalogItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  group_name?: string;
  image_url?: string;
  size?: string;
  unit_label?: string;
  price?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface SellerCatalogCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  items: SellerCatalogItem[];
  sort_order?: number;
}

export interface SellerCatalogSelection {
  selected_category_ids: string[];
  fully_selected_category_ids: string[];
  selected_item_ids: string[];
  selected_items: Array<Record<string, unknown>>;
  category_count: number;
  item_count: number;
  updated_at?: string | null;
}

export interface SellerCatalogUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  business_name?: string;
}

export interface SellerCatalogPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  seller?: SellerCatalogUser;
  selection?: SellerCatalogSelection;
  active_categories?: SellerCatalogCategory[];
  total_active_items?: number;
  currency_symbol?: string;
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

async function request(
  path: string,
  init: RequestInit = {},
): Promise<SellerCatalogPayload> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = await readJson<SellerCatalogPayload>(response);

  if (!response.ok || !payload.success) {
    const error = new Error(
      payload.message || "Unable to complete the seller catalogue request.",
    ) as Error & {
      status?: number;
      code?: string;
      payload?: SellerCatalogPayload;
    };

    error.status = response.status;
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function loadSellerCatalog(): Promise<SellerCatalogPayload> {
  return request("/react/api/seller/catalog-selection/session");
}

export function updateSellerCatalog(
  csrfToken: string,
  selectedItemIds: string[],
  fullySelectedCategoryIds: string[],
): Promise<SellerCatalogPayload> {
  return request("/react/api/seller/catalog-selection/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({
      selected_item_ids: selectedItemIds,
      fully_selected_category_ids: fullySelectedCategoryIds,
    }),
  });
}

export function clearSellerCatalog(
  csrfToken: string,
): Promise<SellerCatalogPayload> {
  return request("/react/api/seller/catalog-selection/clear", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({}),
  });
}

export function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const apiError = error as Error & {
    status?: number;
    code?: string;
  };

  return (
    apiError.status === 401 ||
    apiError.code === "authentication_required"
  );
}

export function isCsrfError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error as Error & {
      code?: string;
    }
  ).code === "csrf_failed";
}
