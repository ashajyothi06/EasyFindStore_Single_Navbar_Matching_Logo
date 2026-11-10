const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export type StoreOrderStatus = "placed" | "confirmed" | "processing" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "payment_pending";
import type {RefundSummary} from "../components/RefundCustomerPanel";
export interface StoreOrder {
  refund?: RefundSummary;
  id: string; order_number?: string; customer_name?: string; user_email?: string;
  created_at: string; updated_at?: string; admin_seen_at?: string;
  total: number; status: StoreOrderStatus; payment_status?: string; payment_method?: string;
  item_count?: number; items?: Array<{ name?: string; quantity?: number; subtotal?: number; delivery_days?: number; image_url?: string; sku?: string; unit_label?: string; price?: number; size?: string }> ;
  subtotal?: number; delivery_fee?: number; discount?: number; coupon_code?: string;
  delivery_address?: Record<string, string>; estimated_delivery_date?: string; delivered_at?: string; out_for_delivery_at?: string; status_history?: Array<{ status: string; note?: string; at: string }>;
}
export interface StoreOrderSummary { total: number; new_count: number; active: number; delivered: number; cancelled: number; payment_pending: number }
export interface StoreOrdersResult { success: boolean; orders: StoreOrder[]; summary: StoreOrderSummary; allowed_statuses: StoreOrderStatus[]; csrf_token: string; message?: string; }

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", cache: "no-store", ...init });
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(result.message || "Unable to process the order request.");
  return result as T;
}
export const loadAdminOrder = (id: string) => api<{success:boolean; order:StoreOrder;csrf_token:string}>(`/react/api/admin/orders/${encodeURIComponent(id)}`);
export const loadAdminOrders = () => api<StoreOrdersResult>("/react/api/admin/orders");
export const markOrderReviewed = (id: string, csrfToken: string) => api<{ success: boolean }>(`/react/api/admin/orders/${encodeURIComponent(id)}/seen`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ csrf_token: csrfToken })
});
export type AdminCancellationOptions = {
  cancel_refund_method?: "original_payment_method" | "bank_transfer";
  request_bank_details?: boolean;
  refund_estimated_by?: string;
  shipment_recall_confirmed?: boolean;
  return_received_confirmed?: boolean;
};
export const updateAdminOrderStatus = (id: string, status: StoreOrderStatus, csrfToken: string, note = "", estimatedDate = "", options: AdminCancellationOptions = {}) => api<{ success: boolean; order: StoreOrder }>(`/react/api/admin/orders/${encodeURIComponent(id)}/status`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ status, note, estimated_delivery_date: estimatedDate, ...options, csrf_token: csrfToken })
});
