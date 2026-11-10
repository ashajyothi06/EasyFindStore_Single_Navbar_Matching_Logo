const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export interface DashboardUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  business_name: string;
  vehicle_type: string;
}

export interface DashboardFeatures {
  storefront_enabled: boolean;
  seller_verification_enabled: boolean;
  delivery_verification_enabled: boolean;
  seller_catalog_enabled: boolean;
}

export interface DashboardPreviewItem {
  id?: string;
  name: string;
  slug?: string;
}

export interface DashboardCategory {
  id?: string;
  name: string;
  slug: string;
  icon?: string;
  item_count: number;
  preview_items?: DashboardPreviewItem[];
}

export interface DashboardPayload {
  success: boolean;
  authenticated: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  user?: DashboardUser;
  role?: string;
  features?: DashboardFeatures;
  storefront?: {
    categories: DashboardCategory[];
    total_categories: number;
  };
  dashboard_url?: string;
  redirect_url?: string;
  login_url?: string;
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export async function loadDashboard(): Promise<DashboardPayload> {
  const response = await fetch(apiUrl("/react/api/dashboard"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const payload = await readJson<DashboardPayload>(response);

  if (!response.ok || !payload.success) {
    const error = new Error(
      payload.message || "Unable to load dashboard.",
    ) as Error & {
      status?: number;
      code?: string;
      payload?: DashboardPayload;
    };

    error.status = response.status;
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function loadSellerSelectedItemCount(): Promise<number> {
  const response = await fetch(
    apiUrl("/react/api/seller/catalog-selection/session"),
    {
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );

  const payload = await readJson<{
    success: boolean;
    selection?: { item_count?: number };
  }>(response);

  if (!response.ok || !payload.success) {
    return 0;
  }

  return Number(payload.selection?.item_count || 0);
}

export function getDashboardErrorPayload(
  error: unknown,
): DashboardPayload | null {
  if (!(error instanceof Error)) return null;

  return (
    error as Error & {
      payload?: DashboardPayload;
    }
  ).payload || null;
}
