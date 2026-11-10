import { getJwtAuthIdentity, JWT_AUTH_CHANGED_EVENT } from "./jwtAuth";

import type {
  ApiErrorPayload,
  HomePayload,
  ItemPayload,
  ShopLocation,
} from "../types/storefront";

import type {
  CartCountPayload,
  CartPayload,
  AddressFormValues,
  AddressMutationPayload,
  AddressesPayload,
  CheckoutPayload,
  CheckoutPlaceOrderValues,
  OrderDetailPayload,
  OrdersPayload,
  PlaceOrderPayload,
} from "../types/commerce";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

const SHOP_LOCATION_STORAGE_KEY =
  "fruveto.active-shop-location.v2";
const HOME_CATALOG_STORAGE_KEY =
  "fruveto.home-catalog-cache.v1";
const CLIENT_CACHE_TTL_MS =
  5 * 60 * 1000;
const MAX_MEMORY_CATALOG_ENTRIES = 6;

let cachedShopLocation:
  | ShopLocation
  | null = null;
let cachedShopLocationAt = 0;

interface HomeCatalogCacheEntry {
  cache_key: string;
  cached_at: number;
  payload: HomePayload;
}

const homeCatalogMemoryCache =
  new Map<string, HomeCatalogCacheEntry>();
const homeCatalogRequests =
  new Map<string, Promise<HomePayload>>();
let homeCatalogCacheGeneration = 0;

function finiteCoordinate(
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

function normaliseShopLocation(
  value: unknown,
  fallbackSource = "current",
): ShopLocation | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const raw = value as Record<
    string,
    unknown
  >;

  const latitude =
    finiteCoordinate(
      raw.latitude ??
        raw.lat,
    );

  const longitude =
    finiteCoordinate(
      raw.longitude ??
        raw.lng ??
        raw.lon,
    );

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    ...(raw as unknown as ShopLocation),
    source: String(
      raw.source ||
        fallbackSource,
    ).trim() || fallbackSource,
    latitude,
    longitude,
    name:
      String(
        raw.name ||
          raw.location_name ||
          "Current location",
      ).trim() ||
      "Current location",
  };
}

function readStoredShopLocation():
ShopLocation | null {
  const now = Date.now();

  if (
    cachedShopLocation &&
    now - cachedShopLocationAt <
      CLIENT_CACHE_TTL_MS
  ) {
    return cachedShopLocation;
  }

  cachedShopLocation = null;
  cachedShopLocationAt = 0;

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        SHOP_LOCATION_STORAGE_KEY,
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      cached_at?: unknown;
      location?: unknown;
    };
    const cachedAt =
      finiteCoordinate(
        parsed.cached_at,
      );
    const location =
      normaliseShopLocation(
        parsed.location,
      );

    if (
      location &&
      cachedAt !== null &&
      now - cachedAt <
        CLIENT_CACHE_TTL_MS
    ) {
      cachedShopLocation =
        location;
      cachedShopLocationAt =
        cachedAt;
      return location;
    }

    window.sessionStorage.removeItem(
      SHOP_LOCATION_STORAGE_KEY,
    );
    return null;
  } catch {
    return null;
  }
}

function locationIdentity(
  location: ShopLocation | null,
): string {
  if (!location) return "";

  return [
    location.source || "",
    String(
      (location as ShopLocation & {
        address_id?: string;
      }).address_id || "",
    ),
    Number(location.latitude).toFixed(6),
    Number(location.longitude).toFixed(6),
  ].join("|");
}

function removeStoredHomeCatalog(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      HOME_CATALOG_STORAGE_KEY,
    );
  } catch {
    // Ignore storage restrictions.
  }
}

export function clearHomeCatalogCache(): void {
  homeCatalogCacheGeneration += 1;
  homeCatalogMemoryCache.clear();
  homeCatalogRequests.clear();
  removeStoredHomeCatalog();
}

export function rememberCatalogLocation(
  location: ShopLocation,
): ShopLocation {
  const previousIdentity =
    locationIdentity(
      readStoredShopLocation(),
    );
  const normalised =
    normaliseShopLocation(
      location,
      location.source ||
        "current",
    );

  if (!normalised) {
    throw new Error(
      "The selected location has invalid coordinates.",
    );
  }

  cachedShopLocation =
    normalised;
  cachedShopLocationAt =
    Date.now();

  if (
    previousIdentity &&
    previousIdentity !==
      locationIdentity(normalised)
  ) {
    clearHomeCatalogCache();
  }

  if (
    typeof window !== "undefined"
  ) {
    try {
      window.sessionStorage.setItem(
        SHOP_LOCATION_STORAGE_KEY,
        JSON.stringify(
          {
            cached_at:
              cachedShopLocationAt,
            location:
              normalised,
          },
        ),
      );
    } catch {
      // The in-memory value is still usable when storage is unavailable.
    }
  }

  return normalised;
}

export function getRememberedCatalogLocation():
ShopLocation | null {
  return readStoredShopLocation();
}

export function forgetCatalogLocation():
void {
  cachedShopLocation = null;
  cachedShopLocationAt = 0;
  clearHomeCatalogCache();

  if (
    typeof window !== "undefined"
  ) {
    try {
      window.sessionStorage.removeItem(
        SHOP_LOCATION_STORAGE_KEY,
      );
    } catch {
      // Ignore storage restrictions.
    }
  }
}

function handleDeliveryLocationUpdate(
  event: Event,
): void {
  if (!(event instanceof CustomEvent)) {
    return;
  }

  const detail =
    event.detail &&
    typeof event.detail === "object"
      ? (event.detail as Record<
          string,
          unknown
        >)
      : {};
  const location =
    normaliseShopLocation(
      {
        ...detail,
        address_id:
          detail.address_id ??
          detail.addressId,
        name:
          detail.name ||
          (detail.source === "saved"
            ? "Saved delivery location"
            : "Current location"),
      },
      String(
        detail.source || "current",
      ),
    );

  if (location) {
    rememberCatalogLocation(
      location,
    );
  }
}

if (typeof window !== "undefined") {
  const cacheWindow = window as Window & {
    __fruvetoLocationCacheListener?: boolean;
  };

  if (!cacheWindow.__fruvetoLocationCacheListener) {
    cacheWindow.addEventListener(
      "delivery-location-updated",
      handleDeliveryLocationUpdate,
    );
    cacheWindow.__fruvetoLocationCacheListener = true;
  }
}


async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiRequestError(
        "The server took too long to respond. Please try again.",
        408,
        {
          code: "REQUEST_TIMEOUT",
        },
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

interface ExtendedApiErrorPayload
  extends ApiErrorPayload {
  success?: boolean;
  code?: string;
  errors?: string[];
  csrf_token?: string;
  login_url?: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: string[];
  readonly csrfToken: string;
  readonly loginUrl: string;

  constructor(
    message: string,
    status: number,
    payload: ExtendedApiErrorPayload = {},
  ) {
    super(message);

    this.name = "ApiRequestError";
    this.status = status;
    this.code = String(
      payload.code || "",
    )
      .trim()
      .toUpperCase();

    this.errors = Array.isArray(payload.errors)
      ? payload.errors.map(String)
      : [];

    this.csrfToken = String(
      payload.csrf_token || "",
    ).trim();

    this.loginUrl = String(
      payload.login_url || "/react/login",
    ).trim();
  }
}

async function readJson<T>(
  response: Response,
): Promise<T> {
  const payload = (
    await response
      .json()
      .catch(() => ({}))
  ) as T & ExtendedApiErrorPayload;

  if (
    !response.ok ||
    payload.success === false
  ) {
    throw new ApiRequestError(
      payload.message ||
        `Request failed with status ${response.status}.`,
      response.status,
      payload,
    );
  }

  return payload;
}

async function postForm<T>(
  path: string,
  values: Record<
    string,
    string | number | boolean | undefined
  >,
  csrfToken = "",
  timeoutMs = 0,
): Promise<T> {
  const body = new URLSearchParams();

  if (csrfToken.trim()) {
    body.set(
      "csrf_token",
      csrfToken.trim(),
    );
  }

  for (
    const [key, value]
    of Object.entries(values)
  ) {
    if (value === undefined) {
      continue;
    }

    body.set(key, String(value));
  }

  const init: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      ...(csrfToken.trim() ? { "X-CSRF-Token": csrfToken.trim() } : {}),
    },
    body: body.toString(),
  };
  // Preserve existing timeouts for unrelated forms. Only cart writes below
  // opt into a deadline to avoid leaving a delete UI pending indefinitely.
  const response = timeoutMs > 0
    ? await fetchWithTimeout(apiUrl(path), init, timeoutMs)
    : await fetch(apiUrl(path), init);

  return readJson<T>(response);
}


export interface AuthSessionUser {
  id: string;
  full_name: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthSessionPayload {
  success: boolean;
  authenticated: boolean;
  user: AuthSessionUser | null;
  csrf_token: string;
  dashboard_url?: string;
  navigation?: Record<string, string>;
}

interface AuthSessionSecurityPayload {
  success: boolean;
  authenticated?: boolean;
  csrf_token?: string;
  user?: Partial<AuthSessionUser> & {
    authenticated?: boolean;
  } | null;
  dashboard_url?: string;
  navigation?: Record<string, string>;
}

let cachedSessionCsrfToken = "";

function normaliseAuthSession(
  payload: AuthSessionSecurityPayload,
): AuthSessionPayload {
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
        full_name: String(
          rawUser?.full_name ||
            rawUser?.name ||
            "",
        ).trim(),
        name: String(
          rawUser?.name ||
            rawUser?.full_name ||
            "",
        ).trim(),
        email: String(
          rawUser?.email || "",
        ).trim(),
        role: String(
          rawUser?.role || "",
        )
          .trim()
          .toLowerCase(),
        status: String(
          rawUser?.status || "",
        )
          .trim()
          .toLowerCase(),
      }
    : null;

  const csrfToken = String(
    payload.csrf_token || "",
  ).trim();

  if (csrfToken) {
    cachedSessionCsrfToken = csrfToken;
  }

  return {
    success: payload.success !== false,
    authenticated,
    user,
    csrf_token: csrfToken,
    dashboard_url:
      payload.dashboard_url,
    navigation:
      payload.navigation,
  };
}

async function requestAuthSession(
  path: string,
): Promise<{
  response: Response;
  payload: AuthSessionSecurityPayload;
}> {
  const response = await fetch(
    apiUrl(path),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const payload = (
    await response
      .json()
      .catch(() => ({}))
  ) as AuthSessionSecurityPayload &
    ExtendedApiErrorPayload;

  return {
    response,
    payload,
  };
}

/**
 * Return the current authenticated session independently of the catalogue.
 *
 * The main authentication module exposes /react/api/auth/session.
 * The storefront add-on exposes /react/api/session. Supporting both prevents
 * the Home page from treating a valid session as anonymous when a different
 * /react/api/home route wins route registration.
 */
let cachedAuthSession:
  | AuthSessionPayload
  | null = null;
let cachedAuthSessionAt = 0;
// JWTs may expire or accounts may be blocked: never trust 5-minute user caches.
const JWT_IDENTITY_CACHE_TTL_MS = 30 * 1000;

if (typeof window !== "undefined") {
  window.addEventListener(JWT_AUTH_CHANGED_EVENT, () => {
    cachedAuthSession = null;
    cachedAuthSessionAt = 0;
    cachedSessionCsrfToken = "";
    authSessionPromise = null;
  });
}

let authSessionPromise:
  | Promise<AuthSessionPayload>
  | null = null;

export async function getAuthSession(
  forceRefresh = false,
): Promise<AuthSessionPayload> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedAuthSession &&
    now - cachedAuthSessionAt <
      JWT_IDENTITY_CACHE_TTL_MS
  ) {
    return cachedAuthSession;
  }

  if (!forceRefresh && authSessionPromise) {
    return authSessionPromise;
  }

  authSessionPromise = (async () => {
    const primary =
      await requestAuthSession(
        "/react/api/auth/session",
      );

    let session: AuthSessionPayload;

    if (primary.response.status !== 404) {
      if (
        !primary.response.ok ||
        primary.payload.success === false
      ) {
        throw new ApiRequestError(
          primary.payload.message ||
            "Unable to read the current login session.",
          primary.response.status,
          primary.payload,
        );
      }

      session = normaliseAuthSession(
        primary.payload,
      );
    } else {
      const fallback =
        await requestAuthSession(
          "/react/api/session",
        );

      if (
        !fallback.response.ok ||
        fallback.payload.success === false
      ) {
        throw new ApiRequestError(
          fallback.payload.message ||
            "Unable to read the current login session.",
          fallback.response.status,
          fallback.payload,
        );
      }

      session = normaliseAuthSession(
        fallback.payload,
      );
    }

    // /auth/session supplies CSRF and OTP state. User identity comes only
    // from the signed, validated JWT via /auth/me.
    const identity = await getJwtAuthIdentity();
    session = {
      ...session,
      authenticated: identity.authenticated,
      user: identity.authenticated && identity.user
        ? normaliseAuthSession({ success: true, authenticated: true, user: identity.user }).user
        : null,
    };
    cachedAuthSession = session;
    cachedAuthSessionAt = Date.now();

    return session;
  })();

  try {
    return await authSessionPromise;
  } finally {
    authSessionPromise = null;
  }
}

async function getSessionCsrfToken(
  forceRefresh = false,
): Promise<string> {
  if (
    !forceRefresh &&
    cachedSessionCsrfToken
  ) {
    return cachedSessionCsrfToken;
  }

  const session =
    await getAuthSession(forceRefresh);

  const token = String(
    session.csrf_token || "",
  ).trim();

  if (!token) {
    throw new ApiRequestError(
      "Unable to create a location security token. Refresh the page and try again.",
      400,
      {
        code: "CSRF_TOKEN_MISSING",
      },
    );
  }

  cachedSessionCsrfToken = token;
  return token;
}

async function postSessionProtectedForm<T>(
  path: string,
  values: Record<
    string,
    string | number | boolean | undefined
  >,
): Promise<T> {
  let token =
    await getSessionCsrfToken();

  try {
    return await postForm<T>(
      path,
      values,
      token,
    );
  } catch (error) {
    const shouldRefreshToken =
      error instanceof ApiRequestError &&
      error.status === 400;

    if (!shouldRefreshToken) {
      throw error;
    }

    cachedSessionCsrfToken = "";

    token =
      await getSessionCsrfToken(true);

    return postForm<T>(
      path,
      values,
      token,
    );
  }
}

export interface HomeQuery {
  q?: string;
  category?: string;
  latitude?: number | string;
  longitude?: number | string;
  locationName?: string;
  forceRefresh?: boolean;
}

function homeCatalogCacheKey(
  query: HomeQuery,
  latitude: number | null,
  longitude: number | null,
  locationName: string,
): string {
  return JSON.stringify({
    q: query.q?.trim() || "",
    category:
      query.category?.trim() || "",
    latitude,
    longitude,
    locationName:
      locationName.trim(),
  });
}

function readHomeCatalogCache(
  cacheKey: string,
): HomePayload | null {
  const now = Date.now();
  const memoryEntry =
    homeCatalogMemoryCache.get(
      cacheKey,
    );

  if (memoryEntry) {
    if (
      now - memoryEntry.cached_at <
      CLIENT_CACHE_TTL_MS
    ) {
      return memoryEntry.payload;
    }
    homeCatalogMemoryCache.delete(
      cacheKey,
    );
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored =
      window.sessionStorage.getItem(
        HOME_CATALOG_STORAGE_KEY,
      );
    if (!stored) return null;

    const entry = JSON.parse(
      stored,
    ) as Partial<HomeCatalogCacheEntry>;

    if (
      entry.cache_key !== cacheKey ||
      typeof entry.cached_at !== "number" ||
      !entry.payload ||
      typeof entry.payload !== "object" ||
      now - entry.cached_at >=
        CLIENT_CACHE_TTL_MS
    ) {
      if (
        typeof entry.cached_at !== "number" ||
        now - Number(entry.cached_at) >=
          CLIENT_CACHE_TTL_MS
      ) {
        removeStoredHomeCatalog();
      }
      return null;
    }

    const validEntry =
      entry as HomeCatalogCacheEntry;
    homeCatalogMemoryCache.set(
      cacheKey,
      validEntry,
    );
    return validEntry.payload;
  } catch {
    removeStoredHomeCatalog();
    return null;
  }
}

function writeHomeCatalogCache(
  cacheKey: string,
  payload: HomePayload,
): void {
  const entry: HomeCatalogCacheEntry = {
    cache_key: cacheKey,
    cached_at: Date.now(),
    payload,
  };

  if (
    !homeCatalogMemoryCache.has(
      cacheKey,
    ) &&
    homeCatalogMemoryCache.size >=
      MAX_MEMORY_CATALOG_ENTRIES
  ) {
    const oldestKey =
      homeCatalogMemoryCache.keys()
        .next().value as
        | string
        | undefined;
    if (oldestKey) {
      homeCatalogMemoryCache.delete(
        oldestKey,
      );
    }
  }

  homeCatalogMemoryCache.set(
    cacheKey,
    entry,
  );

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      HOME_CATALOG_STORAGE_KEY,
      JSON.stringify(entry),
    );
  } catch {
    // The memory cache still prevents repeated requests in this app session.
  }
}

/**
 * Load the same nearby catalogue used by the HTML storefront.
 *
 * Latitude and longitude are sent on every catalogue request. This avoids
 * relying only on a previous location POST/session update and guarantees that
 * the nearby seller filter receives the exact active coordinates.
 */
export async function getHomeCatalog(
  query: HomeQuery = {},
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

  const remembered =
    readStoredShopLocation();

  const latitude =
    finiteCoordinate(
      query.latitude ??
        remembered?.latitude,
    );

  const longitude =
    finiteCoordinate(
      query.longitude ??
        remembered?.longitude,
    );

  const locationName = String(
    query.locationName ||
      remembered?.name ||
      "Current location",
  );

  if (
    latitude !== null &&
    longitude !== null
  ) {
    // Send both naming styles because the HTML route reads lat/lng while
    // some React API handlers read latitude/longitude.
    params.set(
      "lat",
      String(latitude),
    );
    params.set(
      "lng",
      String(longitude),
    );
    params.set(
      "latitude",
      String(latitude),
    );
    params.set(
      "longitude",
      String(longitude),
    );
    params.set(
      "location_name",
      locationName,
    );
  }

  const cacheKey =
    homeCatalogCacheKey(
      query,
      latitude,
      longitude,
      locationName,
    );

  if (query.forceRefresh) {
    clearHomeCatalogCache();
  } else {
    const cached =
      readHomeCatalogCache(
        cacheKey,
      );
    if (cached) return cached;

    const pending =
      homeCatalogRequests.get(
        cacheKey,
      );
    if (pending) return pending;
  }

  const requestGeneration =
    homeCatalogCacheGeneration;
  const request = (async () => {
    // Only real refreshes receive a cache-busting value. Cached tab switches
    // return before this request is created.
    params.set(
      "_location_refresh",
      String(Date.now()),
    );

    const suffix =
      `?${params.toString()}`;
    const endpoints = [
      "/react/api/storefront/catalog",
      "/react/api/catalog",
      "/react/api/home",
    ];
    let lastResponse:
      Response | null = null;

    for (
      const endpoint
      of endpoints
    ) {
      const response =
        await fetchWithTimeout(
          apiUrl(
            `${endpoint}${suffix}`,
          ),
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
              Pragma:
                "no-cache",
            },
          },
          15000,
        );

      lastResponse = response;

      if (
        response.status === 404
      ) {
        continue;
      }

      const payload =
        await readJson<HomePayload>(
          response,
        );

      if (
        requestGeneration ===
        homeCatalogCacheGeneration
      ) {
        const responseLocation =
          normaliseShopLocation(
            (
              payload as HomePayload & {
                location?: unknown;
              }
            ).location,
            remembered?.source ||
              "current",
          );
        let finalCacheKey =
          cacheKey;

        if (responseLocation) {
          const storedLocation =
            rememberCatalogLocation(
              responseLocation,
            );
          finalCacheKey =
            homeCatalogCacheKey(
              query,
              storedLocation.latitude,
              storedLocation.longitude,
              storedLocation.name ||
                locationName,
            );
        }

        writeHomeCatalogCache(
          finalCacheKey,
          payload,
        );
      }

      return payload;
    }

    if (!lastResponse) {
      throw new ApiRequestError(
        "No nearby catalogue endpoint is available.",
        404,
        {
          code:
            "CATALOG_ENDPOINT_NOT_FOUND",
        },
      );
    }

    return readJson<HomePayload>(
      lastResponse,
    );
  })();

  homeCatalogRequests.set(
    cacheKey,
    request,
  );

  try {
    return await request;
  } finally {
    if (
      homeCatalogRequests.get(
        cacheKey,
      ) === request
    ) {
      homeCatalogRequests.delete(
        cacheKey,
      );
    }
  }
}

export async function setCurrentLocation(
  location: Omit<
    ShopLocation,
    "source"
  >,
  csrfToken = "",
): Promise<ShopLocation> {
  const latitude = Number(
    location.latitude,
  );

  const longitude = Number(
    location.longitude,
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

  const locationName =
    String(
      location.name ||
        "Current location",
    ).trim() ||
    "Current location";

  const values = {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    name: locationName,
    location_name:
      locationName,
  };

  const query =
    new URLSearchParams();

  Object.entries(values).forEach(
    ([key, value]) => {
      query.set(
        key,
        String(value),
      );
    },
  );

  const paths = [
    `/react/api/location?${query.toString()}`,
    `/api/user/shop/location?${query.toString()}`,
  ];

  let payload:
    {
      success: boolean;
      message?: string;
      location?: ShopLocation;
    }
    | null = null;

  let lastError:
    unknown = null;

  for (const path of paths) {
    try {
      payload = csrfToken.trim()
        ? await postForm<{
            success: boolean;
            message?: string;
            location?: ShopLocation;
          }>(
            path,
            values,
            csrfToken,
          )
        : await postSessionProtectedForm<{
            success: boolean;
            message?: string;
            location?: ShopLocation;
          }>(
            path,
            values,
          );

      break;
    } catch (error) {
      lastError = error;

      if (
        error instanceof
          ApiRequestError &&
        error.status === 404
      ) {
        continue;
      }

      throw error;
    }
  }

  if (!payload) {
    throw (
      lastError instanceof Error
        ? lastError
        : new Error(
            "Unable to save the current location.",
          )
    );
  }

  const stored =
    rememberCatalogLocation(
      (
        normaliseShopLocation(
          payload.location,
          "current",
        ) || {
          source: "current",
          latitude,
          longitude,
          name: locationName,
        }
      ) as ShopLocation,
    );

  return stored;
}

export async function clearCurrentLocation(): Promise<void> {
  await postSessionProtectedForm<{
    success: boolean;
    message?: string;
  }>(
    "/react/api/location/clear",
    {},
  );

  forgetCatalogLocation();
}

export async function getItem(
  categorySlug: string,
  itemSlug: string,
): Promise<ItemPayload> {
  const response = await fetch(
    apiUrl(
      `/react/api/item/${encodeURIComponent(
        categorySlug,
      )}/${encodeURIComponent(
        itemSlug,
      )}`,
    ),
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<ItemPayload>(
    response,
  );
}

/* ---------------------------------
   Commerce cart APIs
---------------------------------- */

const COMMERCE_API_PREFIX =
  "/react/api/commerce";

/**
 * Lightweight shared cart snapshot for fast SPA navigation.
 * No localStorage/sessionStorage: a different logged-in account must never
 * inherit another person's basket after a reload.
 * All callers of getCart() still retrieve an authoritative server response.
 */
let lastCartSnapshot: { payload: CartPayload; at: number } | null = null;
let inFlightCartRead: { revision: number; promise: Promise<CartPayload> } | null = null;
let cartRequestRevision = 0;
let lastCompletedWriteRevision = 0;
let cartSessionEpoch = 0;
const CART_SNAPSHOT_MAX_AGE_MS = 90_000;

export function peekCachedCart(): CartPayload | null {
  const cached = lastCartSnapshot;
  if (!cached || Date.now() - cached.at > CART_SNAPSHOT_MAX_AGE_MS) return null;
  return cached.payload;
}

/**
 * Compatibility export for cart pages that use the previous snapshot helper
 * name. Both helpers read the same short-lived, authenticated in-memory cache.
 */
export function getCachedCartSnapshot(): CartPayload | null {
  return peekCachedCart();
}

export function invalidateCartSnapshot(): void {
  lastCartSnapshot = null;
  inFlightCartRead = null;
  cartRequestRevision += 1;
  cartSessionEpoch += 1;
}

if (typeof window !== "undefined") {
  window.addEventListener(JWT_AUTH_CHANGED_EVENT, invalidateCartSnapshot);
}

async function postCartMutation(
  path: string,
  values: Record<string, string | number | boolean | undefined>,
  csrfToken: string,
): Promise<CartPayload> {
  const revision = ++cartRequestRevision;
  const epoch = cartSessionEpoch;
  try {
    const payload = await postForm<CartPayload>(path, values, csrfToken, 15_000);
    if (epoch === cartSessionEpoch && revision >= lastCompletedWriteRevision) {
      lastCompletedWriteRevision = revision;
      lastCartSnapshot = { payload, at: Date.now() };
    }
    return payload;
  } catch (error) {
    // A timed-out request may have reached the server. Never pretend that an
    // old snapshot is confirmed after an uncertain mutation result.
    if (epoch === cartSessionEpoch) lastCartSnapshot = null;
    throw error;
  }
}

export async function getCart(): Promise<CartPayload> {
  // Deduplicate simultaneous initial reads (e.g. home + navbar + cart page).
  // A mutation always starts a new revision so a stale read cannot overwrite
  // the most recent successful mutation snapshot.
  const revision = cartRequestRevision;
  if (inFlightCartRead?.revision === revision) return inFlightCartRead.promise;
  const epoch = cartSessionEpoch;
  const request = (async (): Promise<CartPayload> => {
    const response = await fetchWithTimeout(
      apiUrl(`${COMMERCE_API_PREFIX}/cart`),
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
      15_000,
    );
    const payload = await readJson<CartPayload>(response);
    if (epoch === cartSessionEpoch && revision === cartRequestRevision) {
      lastCartSnapshot = { payload, at: Date.now() };
    }
    return payload;
  })();
  const pending = { revision, promise: request };
  inFlightCartRead = pending;
  try {
    return await request;
  } finally {
    if (inFlightCartRead === pending) inFlightCartRead = null;
  }
}

export async function getCartCount(): Promise<CartCountPayload> {
  const response = await fetch(
    apiUrl(
      `${COMMERCE_API_PREFIX}/cart/count`,
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<CartCountPayload>(
    response,
  );
}

export async function addCartItem(
  itemId: string,
  quantity: number,
  csrfToken: string,
): Promise<CartPayload> {
  return postCartMutation(
    `${COMMERCE_API_PREFIX}/cart/items/${encodeURIComponent(
      itemId,
    )}`,
    {
      quantity: Math.max(
        1,
        Math.min(
          99,
          Number(quantity || 1),
        ),
      ),
    },
    csrfToken,
  );
}

export async function updateCartItem(
  itemId: string,
  values: {
    action?:
      | "set"
      | "increase"
      | "decrease";
    quantity?: number;
  },
  csrfToken: string,
): Promise<CartPayload> {
  return postCartMutation(
    `${COMMERCE_API_PREFIX}/cart/items/${encodeURIComponent(
      itemId,
    )}/update`,
    values,
    csrfToken,
  );
}

export async function removeCartItem(
  itemId: string,
  csrfToken: string,
): Promise<CartPayload> {
  return postCartMutation(
    `${COMMERCE_API_PREFIX}/cart/items/${encodeURIComponent(
      itemId,
    )}/remove`,
    {},
    csrfToken,
  );
}

export async function clearCart(
  csrfToken: string,
): Promise<CartPayload> {
  return postCartMutation(
    `${COMMERCE_API_PREFIX}/cart/clear`,
    {},
    csrfToken,
  );
}

/**
 * Replace a cart with a product using the server's bulk-clear endpoint.
 *
 * Normal path: exactly TWO mutation requests, regardless of the quantity or
 * number of existing products (clear the whole cart, then add one item).
 *
 * Some older storefront installations lack /cart/clear. Only when the route
 * is missing do we remove lines individually, using the dedicated /remove
 * endpoint first and falling back to decrements only for legacy servers.
 * Never retry a potentially successful mutation on a network timeout.
 *
 * IMPORTANT: The frontend must prevent other cart writes while this runs.
 * For a truly atomic switch, the server needs a transactional replace route.
 */
export async function replaceCartWithItem(
  itemId: string,
  csrfToken: string,
): Promise<CartPayload> {
  const id = String(itemId || "").trim();
  if (!id) {
    throw new Error("Cannot add an item without a cart item ID.");
  }

  let token = String(csrfToken || "").trim();
  if (!token) {
    const current = await getCart();
    token = String(current.csrf_token || "").trim();
  }

  const routeUnsupported = (error: unknown): boolean =>
    error instanceof ApiRequestError &&
    (error.status === 404 || error.status === 405 || error.status === 501);

  try {
    // This clears EVERY cart line in one request on supported backends.
    const cleared = await clearCart(token);
    token = cleared.csrf_token || token;
  } catch (error) {
    if (!routeUnsupported(error)) throw error;

    // Compatibility path for an old backend that does not expose /cart/clear.
    let cart = await getCart();
    token = cart.csrf_token || token;

    for (const line of cart.items) {
      const lineId = String(line.item_id || "").trim();
      if (!lineId) continue;

      try {
        // One request per existing product, rather than one per unit.
        cart = await removeCartItem(lineId, token);
        token = cart.csrf_token || token;
      } catch (removeError) {
        if (!routeUnsupported(removeError)) throw removeError;

        // Oldest API variant: a decrement removes only one unit at a time.
        const quantity = Math.max(0, Math.trunc(Number(line.quantity || 0)));
        for (let index = 0; index < quantity; index += 1) {
          cart = await updateCartItem(
            lineId,
            { action: "decrease" },
            token,
          );
          token = cart.csrf_token || token;
        }
      }
    }
  }

  // Only add after the clear succeeded; otherwise the original error is kept.
  return addCartItem(id, 1, token);
}

export async function startBuyNow(
  itemId: string,
  quantity: number,
  csrfToken: string,
): Promise<{
  success: boolean;
  message?: string;
  checkout_url?: string;
  mode?: string;
}> {
  return postForm(
    `${COMMERCE_API_PREFIX}/buy-now/${encodeURIComponent(
      itemId,
    )}`,
    {
      quantity: Math.max(
        1,
        Math.min(
          99,
          Number(quantity || 1),
        ),
      ),
    },
    csrfToken,
  );
}



export async function getOrders(): Promise<OrdersPayload> {
  const response = await fetch(
    apiUrl(
      `${COMMERCE_API_PREFIX}/orders`,
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<OrdersPayload>(
    response,
  );
}

/* ---------------------------------
   Commerce order detail API
---------------------------------- */

export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetailPayload> {
  const response = await fetch(
    apiUrl(
      `${COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
        orderId,
      )}`,
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<OrderDetailPayload>(
    response,
  );
}

/* ---------------------------------
   Commerce address APIs
---------------------------------- */

function addressRequestValues(
  values: AddressFormValues,
): Record<string, string | boolean> {
  return {
    recipient_name: values.recipient_name.trim(),
    phone: values.phone.trim(),
    alternate_phone:
      values.alternate_phone.trim(),
    address_line1:
      values.address_line1.trim(),
    address_line2:
      values.address_line2.trim(),
    landmark: values.landmark.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    postal_code:
      values.postal_code.trim(),
    country:
      values.country.trim() || "India",
    address_type: values.address_type,
    latitude: values.latitude.trim(),
    longitude: values.longitude.trim(),
    is_default: values.is_default,
  };
}

export async function getAddresses(): Promise<AddressesPayload> {
  const response = await fetch(
    apiUrl(
      `${COMMERCE_API_PREFIX}/addresses`,
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<AddressesPayload>(
    response,
  );
}

export async function createAddress(
  values: AddressFormValues,
  csrfToken: string,
): Promise<AddressMutationPayload> {
  return postForm<AddressMutationPayload>(
    `${COMMERCE_API_PREFIX}/addresses`,
    addressRequestValues(values),
    csrfToken,
  );
}

export async function updateAddress(
  addressId: string,
  values: AddressFormValues,
  csrfToken: string,
): Promise<AddressMutationPayload> {
  return postForm<AddressMutationPayload>(
    `${COMMERCE_API_PREFIX}/addresses/${encodeURIComponent(
      addressId,
    )}/update`,
    addressRequestValues(values),
    csrfToken,
  );
}

export async function setDefaultAddress(
  addressId: string,
  csrfToken: string,
): Promise<AddressMutationPayload> {
  return postForm<AddressMutationPayload>(
    `${COMMERCE_API_PREFIX}/addresses/${encodeURIComponent(
      addressId,
    )}/default`,
    {},
    csrfToken,
  );
}

export async function deleteAddress(
  addressId: string,
  csrfToken: string,
): Promise<AddressMutationPayload> {
  return postForm<AddressMutationPayload>(
    `${COMMERCE_API_PREFIX}/addresses/${encodeURIComponent(
      addressId,
    )}/delete`,
    {},
    csrfToken,
  );
}

/* ---------------------------------
   Commerce checkout APIs
---------------------------------- */

export async function getCheckout(
  mode: "cart" | "buy_now" = "cart",
): Promise<CheckoutPayload> {
  const params = new URLSearchParams();
  params.set("mode", mode);

  const response = await fetch(
    apiUrl(
      `${COMMERCE_API_PREFIX}/checkout?${params.toString()}`,
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<CheckoutPayload>(
    response,
  );
}

export async function placeOrder(
  values: CheckoutPlaceOrderValues,
  csrfToken: string,
): Promise<PlaceOrderPayload> {
  const requestValues: Record<
    string,
    string | number | boolean | undefined
  > = {
    mode: values.mode,
    address_mode: values.address_mode,
    address_id: values.address_id,
    payment_method: values.payment_method,
    accept_fulfillment_terms:
      values.accept_fulfillment_terms,
  };

  if (values.address_mode === "new") {
    Object.assign(requestValues, {
      save_address:
        values.save_address ?? true,
      recipient_name:
        values.recipient_name || "",
      phone: values.phone || "",
      alternate_phone:
        values.alternate_phone || "",
      address_line1:
        values.address_line1 || "",
      address_line2:
        values.address_line2 || "",
      landmark: values.landmark || "",
      city: values.city || "",
      state: values.state || "",
      postal_code:
        values.postal_code || "",
      country:
        values.country || "India",
      address_type:
        values.address_type || "home",
      latitude: values.latitude || "",
      longitude: values.longitude || "",
      is_default:
        values.is_default ?? false,
    });
  }

  return postForm<PlaceOrderPayload>(
    `${COMMERCE_API_PREFIX}/checkout/place-order`,
    requestValues,
    csrfToken,
  );
}

/* ---------------------------------
   Realtime cart socket
---------------------------------- */

export interface CartSocketTicketPayload {
  success: boolean;
  ticket: string;
  websocket_path: string;
  expires_in: number;
}

export async function getCartSocketTicket(): Promise<CartSocketTicketPayload> {
  const response = await fetch(
    apiUrl(
      "/react/api/cart/socket-ticket",
    ),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJson<CartSocketTicketPayload>(
    response,
  );
}

export function buildCartSocketUrl(
  websocketPath: string,
  ticket: string,
): string {
  const baseUrl =
    API_BASE_URL ||
    window.location.origin;

  const url = new URL(
    websocketPath,
    baseUrl,
  );

  url.protocol =
    url.protocol === "https:"
      ? "wss:"
      : "ws:";

  url.searchParams.set(
    "ticket",
    ticket,
  );

  return url.toString();
}
