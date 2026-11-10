export interface SellerSubscriptionSubItem {
  id?: string;
  name: string;
  unit_label?: string;
  quantity?: number;
}

export interface SellerSubscriptionCombination {
  id: string;
  name: string;
  sub_items?: SellerSubscriptionSubItem[];
}

export interface SellerComplimentaryChoice {
  id?: string;
  name: string;
  catalog_price?: string | number;
}

export interface SellerSubscriptionItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price?: string | number;
  catalog_combinations?: SellerSubscriptionCombination[];
  complimentary_config?: {
    max_items: number;
    budget: string | number;
  };
  complimentary_choices?: SellerComplimentaryChoice[];
  plan_prices?: {
    weekly?: string | number;
    monthly?: string | number;
    three_months?: string | number;
    custom_tiers?: Array<{
      days: number;
      price: string | number;
    }>;
  };
}

export interface SellerSubscriptionCategory {
  id: string;
  name: string;
  description?: string;
  items: SellerSubscriptionItem[];
}

export interface SellerSubscriptionCatalogPayload {
  success: boolean;
  message?: string;
  categories: SellerSubscriptionCategory[];
  selected_item_ids: string[];
  csrf_token: string;
  subscription_csrf_token: string;
  currency_symbol: string;
}

export interface SaveSellerSubscriptionInput {
  selected_item_ids: string[];
  csrf_token: string;
  subscription_csrf_token: string;
}

function apiUrl(path: string): string {
  const base = String(
    import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      "",
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export function sellerSubscriptionAssetUrl(value?: string): string {
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

async function sellerRequest(
  path: string,
  init: RequestInit = {},
): Promise<SellerSubscriptionCatalogPayload> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  let payload: Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    payload = (await response.json()) as Record<string, unknown>;
  }

  if (!response.ok || payload.success === false) {
    throw new Error(
      String(
        payload.message ||
          `Unable to process seller subscriptions (${response.status}).`,
      ),
    );
  }
  return payload as unknown as SellerSubscriptionCatalogPayload;
}

export function getSellerSubscriptionCatalog() {
  return sellerRequest("/react/api/subscriptions/seller/catalog");
}

export function saveSellerSubscriptionSelection(
  input: SaveSellerSubscriptionInput,
) {
  const form = new URLSearchParams();
  form.set("csrf_token", input.csrf_token);
  form.set(
    "subscription_csrf_token",
    input.subscription_csrf_token,
  );
  input.selected_item_ids.forEach((itemId) => {
    form.append("selected_item_ids", itemId);
  });

  return sellerRequest("/react/api/subscriptions/seller/selection", {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "X-CSRF-Token": input.csrf_token,
    },
    body: form.toString(),
  });
}
