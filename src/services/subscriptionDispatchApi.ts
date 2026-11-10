export interface SubscriptionDispatchItem {
  id?: string;
  item_id?: string;
  name: string;
  unit_label?: string;
  quantity?: number;
}

export interface SubscriptionDispatchDelivery {
  id: string;
  subscription_order_id: string;
  item_name: string;
  sequence: number;
  scheduled_date: string;
  status: string;
  delivery_assignment_status?: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  delivery_batch_id?: string;
  is_completed: boolean;
  included_catalog_items?: SubscriptionDispatchItem[];
  complimentary_items?: SubscriptionDispatchItem[];
}

export interface SubscriptionDispatchOrder {
  id: string;
  item_name: string;
  plan_code: string;
  start_date: string;
  end_date: string;
  delivery_count: number;
  completed_delivery_count: number;
  quantity: number;
  status: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  seller: {
    id: string;
    name: string;
    phone?: string;
  };
  deliveries: SubscriptionDispatchDelivery[];
  next_delivery?: SubscriptionDispatchDelivery | null;
}

export interface SubscriptionDeliveryPerson {
  id: string;
  full_name: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  service_area?: string;
}

export interface SubscriptionDispatchPayload {
  success: boolean;
  message?: string;
  page_role?: "admin" | "manager";
  subscription_orders: SubscriptionDispatchOrder[];
  delivery_people: SubscriptionDeliveryPerson[];
  summary?: {
    subscription_count?: number;
    delivery_count?: number;
    unassigned_count?: number;
    completed_count?: number;
  };
  csrf_token: string;
}

class SubscriptionDispatchError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SubscriptionDispatchError";
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

async function request(
  path: string,
  init: RequestInit = {},
): Promise<SubscriptionDispatchPayload> {
  const response = await fetch(apiUrl(path), {
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
    throw new SubscriptionDispatchError(
      String(payload.message || `Request failed (${response.status}).`),
      response.status,
      String(payload.code || "subscription_dispatch_request_failed"),
    );
  }
  return payload as unknown as SubscriptionDispatchPayload;
}

export function loadSubscriptionDispatch(
  mode: "admin" | "manager",
) {
  const path =
    mode === "admin"
      ? "/react/api/admin/delivery-dispatch/subscriptions"
      : "/react/api/seller-delivery-manager/delivery-dispatch/subscriptions";
  return request(path);
}

export function assignSubscriptionDelivery(
  deliveryId: string,
  deliveryPersonId: string,
  csrfToken: string,
) {
  return request(
    `/react/api/delivery-dispatch/subscriptions/${encodeURIComponent(deliveryId)}/assign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        delivery_person_id: deliveryPersonId,
        csrf_token: csrfToken,
      }),
    },
  );
}

export function isSubscriptionDispatchAuthenticationError(
  error: unknown,
): boolean {
  return (
    error instanceof SubscriptionDispatchError &&
    (error.status === 401 || error.code === "authentication_required")
  );
}
