import type { SavedAddress } from "../types/commerce";
import { getJwtAuthIdentity } from "./jwtAuth";
import type {
  HomePayload,
  ProductCategory,
  ProductItem,
} from "../types/storefront";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

const COMMERCE_LOCATION_API_PATH =
  "/react/api/commerce/location";

const STOREFRONT_LOCATION_PATHS = [
  "/react/api/location",
  "/api/user/shop/location",
] as const;

const STOREFRONT_CATALOG_PATHS = [
  "/react/api/storefront/catalog",
  "/react/api/catalog",
  "/react/api/home",
  "/api/user/catalog",
] as const;

const DELIVERY_LOCATION_CACHE_KEY =
  "fruveto.delivery-location-state.v1";
const DELIVERY_LOCATION_CACHE_TTL_MS =
  5 * 60 * 1000;

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function requestUrl(
  path: string,
  params?: URLSearchParams,
): string {
  const query = params?.toString();

  return apiUrl(
    query ? `${path}?${query}` : path,
  );
}

export interface DeliveryCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface DeliveryLocationState {
  source: string | null;
  address_id: string;
  latitude: number | null;
  longitude: number | null;
  revision: number;
  name?: string;
  updated_at?: string;
}

export interface LocationStatePayload {
  success: boolean;
  location: DeliveryLocationState;
  csrf_token: string;
}

export interface DeliveryLocationLoadOptions {
  forceRefresh?: boolean;
}

export interface SavedLocationPayload
  extends LocationStatePayload {
  message: string;
  addresses: SavedAddress[];
}

interface CurrentLocationPayload
  extends LocationStatePayload {
  message: string;
}

export interface LocationAuthUser {
  id: string;
  email: string;
  name: string;
  full_name: string;
  role: string;
}

export interface LocationAuthSessionPayload {
  success: boolean;
  authenticated: boolean;
  user: LocationAuthUser | null;
  csrf_token: string;
  navigation?: Record<string, string>;
  location?: DeliveryLocationState | null;
}

interface RawAuthSessionPayload {
  success?: boolean;
  authenticated?: boolean;
  csrf_token?: string;
  message?: string;
  code?: string;
  login_url?: string;
  navigation?: Record<string, string>;
  location?: unknown;
  user?: Partial<LocationAuthUser> & {
    authenticated?: boolean;
  } | null;
}

interface ErrorPayload {
  success?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  login_url?: string;
}

interface NearbyCatalogQuery {
  q?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

type LooseRecord =
  Record<string, unknown>;

export class LocationApiError
  extends Error {
  readonly status: number;
  readonly code: string;
  readonly csrfToken: string;
  readonly loginUrl: string;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      csrfToken?: string;
      loginUrl?: string;
    },
  ) {
    super(message);
    this.name = "LocationApiError";
    this.status = options.status;
    this.code = String(
      options.code ||
        "LOCATION_REQUEST_FAILED",
    )
      .trim()
      .toUpperCase();
    this.csrfToken = String(
      options.csrfToken || "",
    ).trim();
    this.loginUrl = String(
      options.loginUrl ||
        "/react/login",
    ).trim();
  }
}

function finiteNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function emptyLocationState():
DeliveryLocationState {
  return {
    source: null,
    address_id: "",
    latitude: null,
    longitude: null,
    revision: 0,
  };
}

function normaliseLocation(
  value: unknown,
  fallback: Partial<
    DeliveryLocationState
  > = {},
): DeliveryLocationState {
  const raw =
    value &&
    typeof value === "object"
      ? (value as LooseRecord)
      : {};

  const latitude =
    finiteNumber(
      raw.latitude ??
        raw.lat ??
        fallback.latitude,
    );

  const longitude =
    finiteNumber(
      raw.longitude ??
        raw.lng ??
        raw.lon ??
        fallback.longitude,
    );

  return {
    source: String(
      raw.source ??
        fallback.source ??
        "",
    ).trim() || null,
    address_id: String(
      raw.address_id ??
        raw.addressId ??
        fallback.address_id ??
        "",
    ).trim(),
    latitude,
    longitude,
    revision:
      finiteNumber(
        raw.revision ??
          fallback.revision,
      ) || 0,
    name: String(
      raw.name ??
        raw.location_name ??
        raw.place_name ??
        fallback.name ??
        "",
    ).trim() || undefined,
    updated_at: String(
      raw.updated_at ??
        fallback.updated_at ??
        "",
    ).trim() || undefined,
  };
}

interface CachedDeliveryLocationState {
  cached_at: number;
  payload: LocationStatePayload;
}

let memoryLocationCache:
  CachedDeliveryLocationState | null = null;
let locationStatePromise:
  Promise<LocationStatePayload> | null = null;

function copyLocationPayload(
  payload: LocationStatePayload,
): LocationStatePayload {
  return {
    success: payload.success !== false,
    location: {
      ...payload.location,
    },
    csrf_token: String(
      payload.csrf_token || "",
    ).trim(),
  };
}

function normaliseCachedLocationPayload(
  value: unknown,
): LocationStatePayload | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const raw = value as LooseRecord;
  if (raw.success === false) {
    return null;
  }

  return {
    success: true,
    location: normaliseLocation(
      raw.location,
    ),
    csrf_token: String(
      raw.csrf_token || "",
    ).trim(),
  };
}

function removeStoredLocationCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      DELIVERY_LOCATION_CACHE_KEY,
    );
  } catch {
    // Storage may be unavailable in a restricted/private browser context.
  }
}

export function clearDeliveryLocationCache(): void {
  memoryLocationCache = null;
  locationStatePromise = null;
  removeStoredLocationCache();
}

function readDeliveryLocationCache():
LocationStatePayload | null {
  const now = Date.now();

  if (memoryLocationCache) {
    if (
      now - memoryLocationCache.cached_at <
      DELIVERY_LOCATION_CACHE_TTL_MS
    ) {
      return copyLocationPayload(
        memoryLocationCache.payload,
      );
    }

    clearDeliveryLocationCache();
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(
      DELIVERY_LOCATION_CACHE_KEY,
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored) as {
      cached_at?: unknown;
      payload?: unknown;
    };
    const cachedAt = finiteNumber(
      parsed.cached_at,
    );
    const payload =
      normaliseCachedLocationPayload(
        parsed.payload,
      );

    if (
      cachedAt === null ||
      !payload ||
      now - cachedAt >=
        DELIVERY_LOCATION_CACHE_TTL_MS
    ) {
      clearDeliveryLocationCache();
      return null;
    }

    memoryLocationCache = {
      cached_at: cachedAt,
      payload,
    };
    return copyLocationPayload(payload);
  } catch {
    clearDeliveryLocationCache();
    return null;
  }
}

function writeDeliveryLocationCache(
  payload: LocationStatePayload,
): void {
  const entry: CachedDeliveryLocationState = {
    cached_at: Date.now(),
    payload: copyLocationPayload(payload),
  };
  memoryLocationCache = entry;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      DELIVERY_LOCATION_CACHE_KEY,
      JSON.stringify(entry),
    );
  } catch {
    // The in-memory cache still avoids repeated requests for this app session.
  }
}

function rememberDeliveryLocation(
  payload: LocationStatePayload,
): void {
  // Prevent an older in-flight read from overwriting a newly selected value.
  locationStatePromise = null;
  writeDeliveryLocationCache(payload);
}

async function readPayload(
  response: Response,
): Promise<LooseRecord> {
  return (
    await response
      .json()
      .catch(() => ({}))
  ) as LooseRecord;
}

function createLocationError(
  response: Response,
  payload: ErrorPayload,
  fallbackMessage: string,
): LocationApiError {
  return new LocationApiError(
    String(
      payload.message ||
        fallbackMessage,
    ),
    {
      status: response.status,
      code: String(
        payload.code ||
          "LOCATION_REQUEST_FAILED",
      ),
      csrfToken: String(
        payload.csrf_token || "",
      ),
      loginUrl: String(
        payload.login_url ||
          "/react/login",
      ),
    },
  );
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage =
    "Unable to update the delivery location.",
): Promise<T> {
  const payload =
    await readPayload(response);

  if (
    !response.ok ||
    payload.success === false
  ) {
    throw createLocationError(
      response,
      payload as ErrorPayload,
      fallbackMessage,
    );
  }

  return payload as T;
}

function normaliseAuthSession(
  payload: RawAuthSessionPayload,
): LocationAuthSessionPayload {
  const rawUser =
    payload.user &&
    typeof payload.user === "object"
      ? payload.user
      : null;

  const authenticated = Boolean(
    payload.authenticated ??
      rawUser?.authenticated ??
      rawUser?.id ??
      rawUser?.email,
  );

  const user = authenticated
    ? {
        id: String(
          rawUser?.id || "",
        ).trim(),
        email: String(
          rawUser?.email || "",
        ).trim(),
        name: String(
          rawUser?.name ||
            rawUser?.full_name ||
            "",
        ).trim(),
        full_name: String(
          rawUser?.full_name ||
            rawUser?.name ||
            "",
        ).trim(),
        role: String(
          rawUser?.role || "",
        )
          .trim()
          .toLowerCase(),
      }
    : null;

  return {
    success:
      payload.success !== false,
    authenticated,
    user,
    csrf_token: String(
      payload.csrf_token || "",
    ).trim(),
    navigation:
      payload.navigation,
    location: payload.location
      ? normaliseLocation(
          payload.location,
        )
      : null,
  };
}

async function requestAuthSession(
  path: string,
): Promise<{
  response: Response;
  payload: RawAuthSessionPayload;
}> {
  const response = await fetch(
    apiUrl(path),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
  );

  const payload = (
    await readPayload(response)
  ) as RawAuthSessionPayload;

  return {
    response,
    payload,
  };
}

export async function getLocationAuthSession():
Promise<LocationAuthSessionPayload> {
  const primary =
    await requestAuthSession(
      "/react/api/auth/session",
    );

  if (
    primary.response.status !== 404
  ) {
    if (
      !primary.response.ok ||
      primary.payload.success === false
    ) {
      throw createLocationError(
        primary.response,
        primary.payload,
        "Unable to read the current login session.",
      );
    }

    const session = normaliseAuthSession(primary.payload);
    const identity = await getJwtAuthIdentity();
    return {
      ...session,
      authenticated: identity.authenticated,
      user: identity.authenticated && identity.user
        ? {
            id: String(identity.user.id),
            email: String(identity.user.email || ""),
            name: String(identity.user.name || identity.user.full_name || ""),
            full_name: String(identity.user.full_name || identity.user.name || ""),
            role: String(identity.user.role || "").toLowerCase(),
          }
        : null,
    };
  }

  const fallback =
    await requestAuthSession(
      "/react/api/session",
    );

  if (
    !fallback.response.ok ||
    fallback.payload.success === false
  ) {
    throw createLocationError(
      fallback.response,
      fallback.payload,
      "Unable to read the current login session.",
    );
  }

  return normaliseAuthSession(
    fallback.payload,
  );
}

async function postCommerceLocation<T>(
  path: string,
  values: Record<
    string,
    string | number
  >,
  csrfToken: string,
): Promise<T> {
  const body = new URLSearchParams();
  const cleanToken = String(
    csrfToken || "",
  ).trim();

  Object.entries(values).forEach(
    ([key, value]) => {
      body.set(key, String(value));
    },
  );

  if (cleanToken) {
    body.set(
      "csrf_token",
      cleanToken,
    );
  }

  const response = await fetch(
    apiUrl(
      `${COMMERCE_LOCATION_API_PATH}${path}`,
    ),
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(cleanToken
          ? {
              "X-CSRF-Token":
                cleanToken,
            }
          : {}),
      },
      body: body.toString(),
    },
  );

  return parseResponse<T>(
    response,
  );
}

/**
 * Write the browser/saved coordinates to the exact storefront location
 * endpoint used by the HTML catalogue. Coordinates are also placed in the
 * URL query string, so FastAPI can still read them if middleware consumed
 * the request body before the route handler runs.
 */
async function postStorefrontLocation(
  coordinates: DeliveryCoordinates,
  name: string,
  revision: number,
  csrfToken: string,
): Promise<CurrentLocationPayload> {
  const latitude = Number(
    coordinates.latitude,
  );
  const longitude = Number(
    coordinates.longitude,
  );
  const accuracy = Number(
    coordinates.accuracy || 0,
  );

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      "The browser returned an invalid latitude.",
    );
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      "The browser returned an invalid longitude.",
    );
  }

  let cleanToken = String(
    csrfToken || "",
  ).trim();

  if (!cleanToken) {
    try {
      const session =
        await getLocationAuthSession();

      cleanToken =
        session.csrf_token;
    } catch {
      // The storefront route may be public or protected by a session cookie
      // without a route-level CSRF requirement. Continue with cookies.
    }
  }

  const cleanName =
    String(
      name || "Current location",
    ).trim() ||
    "Current location";

  const values = {
    revision,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy:
      Number.isFinite(accuracy)
        ? accuracy
        : 0,
    name: cleanName,
    location_name: cleanName,
  };

  let lastError:
    LocationApiError | null = null;

  for (
    const path
    of STOREFRONT_LOCATION_PATHS
  ) {
    const params =
      new URLSearchParams();

    Object.entries(values).forEach(
      ([key, value]) => {
        params.set(
          key,
          String(value),
        );
      },
    );

    if (cleanToken) {
      params.set(
        "csrf_token",
        cleanToken,
      );
    }

    const response = await fetch(
      requestUrl(path, params),
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json;charset=UTF-8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(cleanToken
            ? {
                "X-CSRF-Token":
                  cleanToken,
              }
            : {}),
        },
        body: JSON.stringify({
          ...values,
          csrf_token:
            cleanToken || undefined,
          coords: {
            latitude,
            longitude,
            accuracy:
              values.accuracy,
          },
        }),
      },
    );

    const payload =
      await readPayload(response);

    if (
      response.status === 404
    ) {
      lastError =
        createLocationError(
          response,
          payload as ErrorPayload,
          "The storefront location endpoint was not found.",
        );
      continue;
    }

    if (
      !response.ok ||
      payload.success === false
    ) {
      throw createLocationError(
        response,
        payload as ErrorPayload,
        "Unable to save the current location.",
      );
    }

    const location =
      normaliseLocation(
        payload.location,
        {
          source:
            "current",
          latitude,
          longitude,
          revision,
          name: cleanName,
        },
      );

    return {
      success: true,
      message: String(
        payload.message ||
          "Current location selected.",
      ),
      csrf_token: String(
        payload.csrf_token ||
          cleanToken,
      ).trim(),
      location,
    };
  }

  throw (
    lastError ||
    new LocationApiError(
      "No storefront location endpoint is available.",
      {
        status: 404,
        code:
          "STOREFRONT_LOCATION_NOT_FOUND",
      },
    )
  );
}

export function normaliseCatalogPayload(
  rawPayload: LooseRecord,
): HomePayload {
  const objectValue = (
    value: unknown,
  ): LooseRecord =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? (value as LooseRecord)
      : {};

  // Different compatibility endpoints may wrap the same nearby payload under
  // data, catalog, catalogue, storefront, or payload. Read the first complete
  // source instead of silently treating a wrapped response as an empty list.
  const containers: LooseRecord[] = [
    rawPayload,
    objectValue(rawPayload.data),
    objectValue(rawPayload.catalog),
    objectValue(rawPayload.catalogue),
    objectValue(rawPayload.storefront),
    objectValue(rawPayload.payload),
  ];

  const firstArray = (
    keys: string[],
  ): unknown[] => {
    for (const container of containers) {
      for (const key of keys) {
        const value = container[key];

        if (Array.isArray(value)) {
          return value;
        }
      }
    }

    return [];
  };

  const firstValue = (
    keys: string[],
  ): unknown => {
    for (const container of containers) {
      for (const key of keys) {
        const value = container[key];

        if (
          value !== undefined &&
          value !== null
        ) {
          return value;
        }
      }
    }

    return undefined;
  };

  const categoryItemCount = (
    category: ProductCategory,
  ): number => {
    const directCount = Array.isArray(
      category.items,
    )
      ? category.items.length
      : 0;

    const groupedCount = Array.isArray(
      category.groups,
    )
      ? category.groups.reduce(
          (total, group) =>
            total +
            (
              Array.isArray(group.items)
                ? group.items.length
                : 0
            ),
          0,
        )
      : 0;

    // Some endpoints include the same items in both category.items and groups.
    // Home.tsx performs the final identity-based de-duplication.
    return Math.max(
      directCount,
      groupedCount,
      Number(category.item_count || 0),
    );
  };

  const categories = firstArray([
    "categories",
    "display_categories",
    "nearby_categories",
  ])
    .filter(
      (value): value is ProductCategory =>
        Boolean(
          value &&
            typeof value === "object",
        ),
    )
    .map((category) => ({
      ...category,
      items: Array.isArray(category.items)
        ? category.items
        : [],
      groups: Array.isArray(category.groups)
        ? category.groups
        : [],
    }));

  const featuredProducts = firstArray([
    "featured_products",
    "featuredProducts",
    "offers",
  ])
    .map((value) => {
      if (
        !value ||
        typeof value !== "object"
      ) {
        return null;
      }

      const record = value as LooseRecord;
      const wrappedItem =
        record.item &&
        typeof record.item === "object"
          ? (record.item as ProductItem)
          : null;
      const wrappedCategory =
        record.category &&
        typeof record.category === "object"
          ? (record.category as ProductCategory)
          : null;

      if (wrappedItem) {
        return {
          ...wrappedItem,
          category_id:
            wrappedItem.category_id ||
            wrappedCategory?.id ||
            "",
          category_name:
            wrappedItem.category_name ||
            wrappedCategory?.name ||
            "",
          category_slug:
            wrappedItem.category_slug ||
            wrappedCategory?.slug ||
            "",
        } as ProductItem;
      }

      return record as ProductItem;
    })
    .filter(
      (item): item is ProductItem =>
        Boolean(item),
    );

  const rawNavigation = firstArray([
    "category_navigation",
    "categoryNavigation",
    "navigation_categories",
  ]);

  const categoryNavigation =
    rawNavigation.length > 0
      ? rawNavigation
      : categories.map(
          (category) => ({
            id: String(
              category.id || "",
            ),
            name: String(
              category.name || "",
            ),
            slug: String(
              category.slug || "",
            ),
            item_count:
              categoryItemCount(
                category,
              ),
          }),
        );

  const rawLocation = firstValue([
    "location",
    "shop_location",
    "delivery_location",
  ]);

  const location = rawLocation
    ? normaliseLocation(
        rawLocation,
      )
    : null;

  const rawSummary = firstValue([
    "summary",
    "nearby_summary",
  ]);

  const summary =
    rawSummary &&
    typeof rawSummary === "object"
      ? rawSummary
      : {};

  const itemCount = Number(
    firstValue([
      "item_count",
      "product_count",
    ]),
  );

  const calculatedItemCount =
    categories.reduce(
      (total, category) =>
        total +
        categoryItemCount(
          category,
        ),
      0,
    );

  const rawShop = firstValue([
    "shop",
    "store",
  ]);

  const rawNavigationObject =
    firstValue([
      "navigation",
    ]);

  const rawUser = firstValue([
    "user",
    "current_user",
  ]);

  return {
    ...rawPayload,
    success:
      firstValue(["success"]) !== false,
    shop:
      rawShop &&
      typeof rawShop === "object"
        ? rawShop
        : {
            name:
              "Fresh Juice Store",
            currency_symbol: "₹",
            free_delivery_note:
              "Availability is based on nearby sellers",
          },
    navigation:
      rawNavigationObject &&
      typeof rawNavigationObject ===
        "object"
        ? rawNavigationObject
        : {},
    user:
      rawUser &&
      typeof rawUser === "object"
        ? rawUser
        : {
            authenticated: false,
            id: "",
            name: "",
            email: "",
            role: "",
          },
    location_required: Boolean(
      firstValue([
        "location_required",
      ]) ??
        !location,
    ),
    auto_request_current_location:
      Boolean(
        firstValue([
          "auto_request_current_location",
        ]) ??
          !location,
      ),
    location,
    summary,
    selected_category: String(
      firstValue([
        "selected_category",
      ]) ||
        "",
    ),
    search_query: String(
      firstValue([
        "search_query",
        "q",
      ]) ||
        "",
    ),
    category_navigation:
      categoryNavigation,
    categories,
    featured_products:
      featuredProducts,
    category_count:
      Number.isFinite(
        Number(
          firstValue([
            "category_count",
          ]),
        ),
      )
        ? Number(
            firstValue([
              "category_count",
            ]),
          )
        : categories.length,
    item_count:
      Number.isFinite(itemCount)
        ? itemCount
        : calculatedItemCount,
    empty_reason: String(
      firstValue([
        "empty_reason",
      ]) ||
        (
          !location
            ? "location_required"
            : categories.length === 0 &&
                featuredProducts.length === 0
              ? "no_matching_products"
              : ""
        ),
    ),
  } as HomePayload;
}

/**
 * Load the same nearby catalogue data used by the HTML storefront.
 *
 * Endpoint order matters:
 * 1. Dedicated nearby storefront payload
 * 2. React catalogue alias
 * 3. React home alias
 * 4. Existing authenticated nearby catalogue
 */
export async function getNearbyStorefrontCatalog(
  query: NearbyCatalogQuery = {},
): Promise<HomePayload> {
  const params =
    new URLSearchParams();

  if (query.q?.trim()) {
    params.set(
      "q",
      query.q.trim(),
    );
  }

  if (
    query.category?.trim()
  ) {
    params.set(
      "category",
      query.category.trim(),
    );
  }

  const latitude =
    finiteNumber(
      query.latitude,
    );
  const longitude =
    finiteNumber(
      query.longitude,
    );

  if (
    latitude !== null &&
    longitude !== null
  ) {
    params.set(
      "latitude",
      String(latitude),
    );
    params.set(
      "longitude",
      String(longitude),
    );
    params.set(
      "lat",
      String(latitude),
    );
    params.set(
      "lng",
      String(longitude),
    );
    params.set(
      "location_name",
      query.locationName ||
        "Current location",
    );
  }

  // Prevent a browser/proxy cache from returning a catalogue created before
  // the latest location POST completed.
  params.set(
    "_location_refresh",
    String(Date.now()),
  );

  let lastError:
    LocationApiError | null = null;

  for (
    const path
    of STOREFRONT_CATALOG_PATHS
  ) {
    const response = await fetch(
      requestUrl(path, params),
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
    );

    const payload =
      await readPayload(response);

    if (
      response.status === 404
    ) {
      lastError =
        createLocationError(
          response,
          payload as ErrorPayload,
          "The nearby catalogue endpoint was not found.",
        );
      continue;
    }

    if (
      !response.ok ||
      payload.success === false
    ) {
      throw createLocationError(
        response,
        payload as ErrorPayload,
        "Unable to load nearby products.",
      );
    }

    return normaliseCatalogPayload(
      payload,
    );
  }

  throw (
    lastError ||
    new LocationApiError(
      "No nearby catalogue endpoint is available.",
      {
        status: 404,
        code:
          "CATALOG_ENDPOINT_NOT_FOUND",
      },
    )
  );
}

async function loadCommerceLocationState():
Promise<LocationStatePayload | null> {
  try {
    const response = await fetch(
      apiUrl(
        COMMERCE_LOCATION_API_PATH,
      ),
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
    );

    if (
      response.ok
    ) {
      const payload =
        await parseResponse<
          LocationStatePayload
        >(
          response,
          "Unable to load the delivery location.",
        );

      return {
        ...payload,
        location:
          normaliseLocation(
            payload.location,
          ),
      };
    } else if (
      response.status !== 404
    ) {
      await parseResponse(
        response,
        "Unable to load the delivery location.",
      );
    }
  } catch (
    error
  ) {
    if (
      !(
        error instanceof
          LocationApiError
      ) ||
      error.status !== 404
    ) {
      throw error;
    }
  }

  return null;
}

async function loadDeliveryLocationState():
Promise<LocationStatePayload> {
  // These endpoints are independent, so load them together during the
  // five-minute refresh instead of waiting for one before starting the other.
  const [commercePayload, session] =
    await Promise.all([
      loadCommerceLocationState(),
      getLocationAuthSession(),
    ]);

  const sessionLocation =
    session.location
      ? normaliseLocation(
          session.location,
        )
      : null;

  return {
    success: true,
    location:
      (
        commercePayload !== null &&
        commercePayload.location.latitude !==
          null &&
        commercePayload.location.longitude !==
          null
      )
        ? commercePayload.location
        : (
            sessionLocation ||
            emptyLocationState()
          ),
    csrf_token: String(
      commercePayload?.csrf_token ||
        session.csrf_token ||
        "",
    ).trim(),
  };
}

export function getDeliveryLocationState(
  options: DeliveryLocationLoadOptions = {},
): Promise<LocationStatePayload> {
  if (!options.forceRefresh) {
    const cached =
      readDeliveryLocationCache();
    if (cached) {
      return Promise.resolve(cached);
    }

    if (locationStatePromise) {
      return locationStatePromise;
    }
  }

  const freshRequest =
    loadDeliveryLocationState();
  let trackedRequest:
    Promise<LocationStatePayload>;

  trackedRequest = freshRequest.then(
    (payload) => {
      if (
        locationStatePromise ===
        trackedRequest
      ) {
        writeDeliveryLocationCache(
          payload,
        );
        locationStatePromise = null;
      }

      return copyLocationPayload(
        payload,
      );
    },
    (error: unknown) => {
      if (
        locationStatePromise ===
        trackedRequest
      ) {
        locationStatePromise = null;
      }
      throw error;
    },
  );

  locationStatePromise = trackedRequest;
  return trackedRequest;
}

/**
 * The old implementation called `/current/begin` before the browser returned
 * coordinates. That temporarily cleared the usable storefront location.
 * This implementation waits for valid coordinates and writes them directly
 * to the storefront location route used by the HTML page.
 */
export async function setCurrentDeliveryLocation(
  coordinates: DeliveryCoordinates,
  revision: number,
  csrfToken: string,
): Promise<CurrentLocationPayload> {
  const result =
    await postStorefrontLocation(
      coordinates,
      "Current location",
      revision,
      csrfToken,
    );

  // Keep the commerce location selector in sync when that add-on is present.
  // A commerce sync failure must not undo the working storefront location.
  try {
    await postCommerceLocation(
      "/current",
      {
        revision,
        latitude:
          coordinates.latitude,
        longitude:
          coordinates.longitude,
        accuracy:
          coordinates.accuracy || 0,
      },
      result.csrf_token ||
        csrfToken,
    );
  } catch {
    // Optional compatibility sync.
  }

  rememberDeliveryLocation({
    success: true,
    location: result.location,
    csrf_token:
      result.csrf_token ||
      csrfToken,
  });

  return result;
}

/**
 * Retained only for compatibility with older callers. It intentionally does
 * not clear or switch the storefront session before coordinates are ready.
 */
export async function beginCurrentDeliveryLocation(
  _revision: number,
  _csrfToken: string,
): Promise<CurrentLocationPayload> {
  return {
    success: true,
    message:
      "Waiting for browser coordinates.",
    csrf_token:
      _csrfToken,
    location:
      emptyLocationState(),
  };
}

export async function setSavedDeliveryLocation(
  addressId: string,
  revision: number,
  csrfToken: string,
): Promise<SavedLocationPayload> {
  const cleanAddressId = String(
    addressId || "",
  ).trim();

  if (!cleanAddressId) {
    throw new Error(
      "Select a saved delivery address.",
    );
  }

  const selected =
    await postCommerceLocation<
      SavedLocationPayload
    >(
      `/saved/${encodeURIComponent(
        cleanAddressId,
      )}`,
      {
        revision,
      },
      csrfToken,
    );

  const selectedLocation =
    normaliseLocation(
      selected.location,
      {
        source: "saved",
        address_id:
          cleanAddressId,
        revision,
        name:
          "Saved delivery location",
      },
    );

  if (
    selectedLocation.latitude !==
      null &&
    selectedLocation.longitude !==
      null
  ) {
    const storefrontResult =
      await postStorefrontLocation(
        {
          latitude:
            selectedLocation.latitude,
          longitude:
            selectedLocation.longitude,
        },
        selectedLocation.name ||
          "Saved delivery location",
        revision,
        selected.csrf_token ||
          csrfToken,
      );

    selected.location = {
      ...selectedLocation,
      ...storefrontResult.location,
      source: "saved",
      address_id:
        cleanAddressId,
      revision,
    };

    selected.csrf_token =
      storefrontResult.csrf_token ||
      selected.csrf_token;
  } else {
    selected.location =
      selectedLocation;
  }

  const result: SavedLocationPayload = {
    ...selected,
    addresses:
      Array.isArray(
        selected.addresses,
      )
        ? selected.addresses
        : [],
  };

  rememberDeliveryLocation(result);
  return result;
}

let cachedCoordinates:
  DeliveryCoordinates | null = null;
let cachedCoordinatesAt = 0;
let coordinatesPromise:
  Promise<DeliveryCoordinates> | null =
  null;

function geolocationErrorMessage(
  error: GeolocationPositionError,
): string {
  const messages:
    Record<number, string> = {
    1:
      "Location permission was denied.",
    2:
      "The current location is unavailable.",
    3:
      "Location detection timed out.",
  };

  return (
    messages[error.code] ||
    error.message ||
    "Unable to detect the current location."
  );
}

function readBrowserPosition(
  options: PositionOptions,
): Promise<DeliveryCoordinates> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      navigator.geolocation
        .getCurrentPosition(
          (position) => {
            resolve({
              latitude:
                position.coords
                  .latitude,
              longitude:
                position.coords
                  .longitude,
              accuracy:
                position.coords
                  .accuracy,
            });
          },
          (error) => {
            reject(
              new Error(
                geolocationErrorMessage(
                  error,
                ),
              ),
            );
          },
          options,
        );
    },
  );
}

/**
 * Matches the HTML page: first try accurate GPS, then use a faster cached/
 * network position. The shared promise prevents duplicate StrictMode prompts.
 */
export async function getBrowserCoordinates(
  options: {
    forceRefresh?: boolean;
  } = {},
): Promise<DeliveryCoordinates> {
  if (
    !navigator.geolocation
  ) {
    throw new Error(
      "Geolocation is not supported by this browser.",
    );
  }

  const secureContext =
    window.isSecureContext ||
    window.location.hostname ===
      "localhost" ||
    window.location.hostname ===
      "127.0.0.1";

  if (!secureContext) {
    throw new Error(
      "Current location requires HTTPS or localhost.",
    );
  }

  const forceRefresh =
    options.forceRefresh === true;

  if (
    !forceRefresh &&
    cachedCoordinates &&
    Date.now() -
      cachedCoordinatesAt <
      60000
  ) {
    return cachedCoordinates;
  }

  if (
    !forceRefresh &&
    coordinatesPromise
  ) {
    return coordinatesPromise;
  }

  coordinatesPromise =
    (async () => {
      try {
        return await readBrowserPosition(
          {
            enableHighAccuracy:
              true,
            timeout: 12000,
            maximumAge: 0,
          },
        );
      } catch {
        return readBrowserPosition(
          {
            enableHighAccuracy:
              false,
            timeout: 12000,
            maximumAge: 60000,
          },
        );
      }
    })();

  try {
    const coordinates =
      await coordinatesPromise;

    cachedCoordinates =
      coordinates;
    cachedCoordinatesAt =
      Date.now();

    return coordinates;
  } finally {
    coordinatesPromise = null;
  }
}
