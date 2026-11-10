export interface ShopLocation {
  latitude: number;
  longitude: number;
  name: string;
  source: string;
}

export interface NearbySummary {
  radius_km: number;
  seller_count: number;
  category_count: number;
  item_count: number;
  available_unit_count: number;
  nearest_seller_distance_km: number | null;
}

export interface NavigationPayload {
  home_url: string;
  react_home_url: string;
  legacy_shop_url: string;
  login_url: string;
  register_url: string;
  cart_url: string;
  authenticated: boolean;
  role: string;
}

export interface UserPayload {
  authenticated: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ShopPayload {
  name: string;
  currency_symbol: string;
  free_delivery_note?: string;
  nearby_radius_km: number;
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  size?: string;
  unit_label?: string;
  image_url?: string;
  delivery_days?: number;
  media?: {type:"image"|"video"|"document";url:string;name:string}[];
  category_id: string;
  category_name: string;
  category_slug: string;
  group_name?: string;
  compare_price?: number;
  display_price: number;
  discount_percentage: number;
  available_quantity: number;
  nearby_seller_count?: number;
  nearest_seller_distance_km?: number | null;
  cart_quantity: number;
  is_available: boolean;
  is_featured?: boolean;
  react_detail_url: string;
  legacy_detail_url: string;
  legacy_buy_now_url: string;
}

export interface ProductGroup {
  name: string;
  items: ProductItem[];
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  item_count: number;
  items: ProductItem[];
  groups: ProductGroup[];
}

export interface CategoryNavigationItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  item_count: number;
}

export interface HomePayload {
  success: boolean;
  shop: ShopPayload;
  navigation: NavigationPayload;
  user: UserPayload;
  location_required: boolean;
  auto_request_current_location: boolean;
  location: ShopLocation | null;
  summary: NearbySummary;
  selected_category: string;
  search_query: string;
  category_navigation: CategoryNavigationItem[];
  categories: ProductCategory[];
  featured_products: ProductItem[];
  category_count: number;
  item_count: number;
  empty_reason: string;
}

export interface ItemPayload {
  success: boolean;
  shop: ShopPayload;
  navigation: NavigationPayload;
  user: UserPayload;
  location: ShopLocation;
  summary: NearbySummary;
  category: Pick<ProductCategory, "id" | "name" | "slug" | "icon">;
  item: ProductItem;
  related_items: ProductItem[];
}

export interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  location_required?: boolean;
}
