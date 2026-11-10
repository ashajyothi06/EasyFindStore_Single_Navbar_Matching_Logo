export interface CartItem {
  item_id: string;
  category_id?: string;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  sku?: string;
  size?: string;
  unit_label?: string;
  image_url?: string;
  price: number;
  admin_price?: number;
  price_source?: string;
  compare_price?: number | null;
  quantity: number;
  available_quantity?: number;
  subtotal: number;
}

export interface CartTotals {
  subtotal: number;
  delivery_fee: number;
  total: number;
}

export interface CartPayload {
  success: boolean;
  authenticated: boolean;
  message?: string;
  items: CartItem[];
  count: number;
  totals: CartTotals;
  currency_symbol: string;
  currency_code: string;
  csrf_token: string;
}

export interface CartCountPayload {
  success: boolean;
  authenticated: boolean;
  count: number;
}

export interface OrderItem {
  item_id: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug?: string;
  sku?: string;
  size?: string;
  unit_label?: string;
  image_url?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDeliveryAddress {
  id?: string;
  recipient_name: string;
  phone: string;
  alternate_phone?: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  address_type?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OrderPayment {
  provider?: string;
  status?: string;
  collector_seller_id?: string;
  collector_seller_name?: string;
  collector_business_name?: string;
  gateway_key_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount_subunits?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

import type {RefundSummary} from "../components/RefundCustomerPanel";

export interface CommerceOrder {
  refund?: RefundSummary;
  id: string;
  order_number: string;
  user_id?: string;
  user_email?: string;
  customer_name?: string;
  status: string;
  payment_method: string;
  payment_status: string;
  payment?: OrderPayment;
  items: OrderItem[];
  item_count?: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency?: string;
  delivery_address: OrderDeliveryAddress;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  out_for_delivery_at?: string;
  status_history?: Array<{ status:string;at:string;note?:string;estimated_delivery_date?:string }>;
}

export interface OrderDetailPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  order: CommerceOrder;
  currency_symbol: string;
  currency_code?: string;
  csrf_token?: string;
}

export interface OrdersPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  orders: CommerceOrder[];
  count: number;
  currency_symbol: string;
  currency_code?: string;
  csrf_token?: string;
}

export interface SavedAddress {
  id: string;
  user_id?: string;
  recipient_name: string;
  phone: string;
  alternate_phone?: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: "home" | "work" | "other" | string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string;
}

export interface AddressFormValues {
  recipient_name: string;
  phone: string;
  alternate_phone: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: "home" | "work" | "other";
  latitude: string;
  longitude: string;
  is_default: boolean;
}

export interface AddressesPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  addresses: SavedAddress[];
  count: number;
  csrf_token: string;
}

export interface AddressMutationPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  address?: SavedAddress;
  addresses: SavedAddress[];
  csrf_token: string;
}

export interface CheckoutUser {
  id: string;
  full_name?: string;
  email: string;
}

export interface CheckoutPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  mode: "cart" | "buy_now";
  user: CheckoutUser;
  items: CartItem[];
  totals: CartTotals;
  addresses: SavedAddress[];
  currency_symbol: string;
  currency_code: string;
  nearby_radius_km: number;
  razorpay_payment_enabled: boolean;
  cash_on_delivery_enabled: boolean;
  csrf_token: string;
}

export interface CheckoutPlaceOrderValues {
  mode: "cart" | "buy_now";
  address_mode: "existing" | "new";
  address_id?: string;
  payment_method:
    | "razorpay"
    | "cash_on_delivery";
  accept_fulfillment_terms: boolean;
  save_address?: boolean;
  recipient_name?: string;
  phone?: string;
  alternate_phone?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  address_type?: "home" | "work" | "other";
  latitude?: string;
  longitude?: string;
  is_default?: boolean;
}

export interface PlaceOrderPayload {
  success: boolean;
  message?: string;
  order: CommerceOrder;
  payment_required: boolean;
  payment_api_url?: string;
  order_api_url?: string;
  csrf_token: string;
}
