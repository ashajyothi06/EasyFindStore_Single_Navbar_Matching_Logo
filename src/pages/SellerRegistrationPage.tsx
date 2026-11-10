import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import "../styles/react-auth.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "/login";

// Point these variables to the same seller-location endpoints used by the
// existing Jinja seller registration page when the default paths differ.
const SELLER_LOCATION_SUGGESTIONS_URL =
  import.meta.env.VITE_SELLER_LOCATION_SUGGESTIONS_URL ||
  "/seller-location-registration/location-suggestions";
const SELLER_REVERSE_LOCATION_URL =
  import.meta.env.VITE_SELLER_REVERSE_LOCATION_URL ||
  "/seller-location-registration/reverse-location";
const SELLER_PARSE_LOCATION_URL =
  import.meta.env.VITE_SELLER_PARSE_LOCATION_URL ||
  "/seller-location-registration/parse-location-input";

interface PendingOtp {
  masked_email: string;
  expiry_minutes: number;
  remaining_attempts: number;
  expired?: boolean;
}

interface RegistrationSessionPayload {
  success: boolean;
  authenticated: boolean;
  csrf_token: string;
  pending_otp: PendingOtp | null;
  login_url?: string;
}

interface RegistrationApiPayload {
  success: boolean;
  message?: string;
  code?: string;
  masked_email?: string;
  expiry_minutes?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  restart_required?: boolean;
  csrf_token?: string;
  redirect_url?: string;
}

interface LocationSuggestion {
  latitude: number | string;
  longitude: number | string;
  name?: string;
  display_name?: string;
  maps_url?: string;
  source?: string;
}

interface LocationApiPayload {
  success: boolean;
  message?: string;
  location?: LocationSuggestion;
  suggestions?: LocationSuggestion[];
}

interface SellerRegistrationForm {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  gst_number: string;
  product_category: string;
  pickup_address: string;
  location_input: string;
  seller_latitude: string;
  seller_longitude: string;
  location_name: string;
  seller_maps_url: string;
  location_source: string;
  location_accuracy_meters: string;
}

type RegistrationStage = "form" | "otp" | "complete";
type NoticeKind = "success" | "error" | "info";

interface Notice {
  kind: NoticeKind;
  text: string;
}

const INITIAL_FORM: SellerRegistrationForm = {
  full_name: "",
  email: "",
  phone: "",
  business_name: "",
  gst_number: "",
  product_category: "",
  pickup_address: "",
  location_input: "",
  seller_latitude: "",
  seller_longitude: "",
  location_name: "",
  seller_maps_url: "",
  location_source: "",
  location_accuracy_meters: "",
};

const SELLER_REGISTRATION_THEME = `
  .seller-registration-page {
    --seller-bg: #33371b;
    --seller-cream: #fffdf2;
    --seller-text: #33371b;
    --seller-muted: #dfe4cf;
    --seller-yellow: #f0e875;
    --seller-lime: #c8d34d;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    position: relative;
    background:
      radial-gradient(circle at 14% 10%, rgba(200, 211, 77, 0.15), transparent 30%),
      radial-gradient(circle at 88% 82%, rgba(110, 231, 160, 0.08), transparent 28%),
      var(--seller-bg) !important;
    color: var(--seller-cream);
  }
  .seller-registration-page .dispatch-page-container {
    width: 100%;
    max-width: 100%;
    padding-left: clamp(18px, 4vw, 64px);
    padding-right: clamp(18px, 4vw, 64px);
    background: transparent !important;
  }
  .seller-registration-page .dispatch-heading-react {
    background: transparent !important;
  }
  .seller-registration-page .dispatch-heading-react h1 {
    color: var(--seller-cream) !important;
  }
  .seller-registration-page .dispatch-heading-react p,
  .seller-registration-page .dispatch-muted {
    color: var(--seller-muted) !important;
  }
  .seller-registration-page .dispatch-eyebrow {
    color: var(--seller-yellow) !important;
  }
  .seller-registration-page .dispatch-card {
    color: var(--seller-text) !important;
    background: rgba(255, 253, 242, 0.98) !important;
    border-color: rgba(240, 232, 117, 0.52) !important;
    box-shadow: 0 24px 70px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.7) !important;
  }
  .seller-registration-page .dispatch-card h2,
  .seller-registration-page .dispatch-card label,
  .seller-registration-page .dispatch-registration-form label {
    color: var(--seller-text) !important;
  }
  .seller-registration-page .dispatch-card input,
  .seller-registration-page .dispatch-card select,
  .seller-registration-page .dispatch-card textarea,
  .seller-registration-page .dispatch-registration-form input,
  .seller-registration-page .dispatch-registration-form select,
  .seller-registration-page .dispatch-registration-form textarea,
  .seller-registration-page .dispatch-location-actions input {
    color: var(--seller-text) !important;
    background: #fffef8 !important;
    border-color: rgba(51, 55, 27, 0.28) !important;
  }
  .seller-registration-page .dispatch-card input:focus,
  .seller-registration-page .dispatch-card select:focus,
  .seller-registration-page .dispatch-card textarea:focus,
  .seller-registration-page .dispatch-registration-form input:focus,
  .seller-registration-page .dispatch-registration-form textarea:focus,
  .seller-registration-page .dispatch-location-actions input:focus {
    border-color: var(--seller-lime) !important;
    box-shadow: 0 0 0 3px rgba(200, 211, 77, 0.2) !important;
  }
  .seller-registration-page .dispatch-card input[readonly],
  .seller-registration-page .dispatch-registration-form input[readonly] {
    background: #f0f2dc !important;
    color: #59602f !important;
  }
  .seller-registration-page .dispatch-button.primary {
    color: var(--seller-text) !important;
    background: linear-gradient(135deg, var(--seller-yellow), var(--seller-lime)) !important;
    border-color: var(--seller-yellow) !important;
  }
  .seller-registration-page .dispatch-button.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #fff49a, var(--seller-yellow)) !important;
  }
  .seller-registration-page .dispatch-button.secondary {
    color: var(--seller-text) !important;
    background: var(--seller-cream) !important;
    border-color: rgba(51, 55, 27, 0.35) !important;
  }
  .seller-registration-page .dispatch-button.secondary:hover:not(:disabled) {
    background: var(--seller-yellow) !important;
  }
  .seller-registration-page .dispatch-suggestion-list {
    background: var(--seller-cream) !important;
    border-color: rgba(51, 55, 27, 0.2) !important;
  }
  .seller-registration-page .dispatch-suggestion-list button {
    color: var(--seller-text) !important;
    background: transparent !important;
    border-color: rgba(51, 55, 27, 0.12) !important;
  }
  .seller-registration-page .dispatch-suggestion-list button:hover {
    background: rgba(200, 211, 77, 0.18) !important;
  }
  .seller-registration-page .seller-reg-links {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .seller-registration-page .seller-reg-links a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 7px 18px;
    border: 1.5px solid rgba(51, 55, 27, 0.3);
    border-radius: 999px;
    background: rgba(255, 253, 242, 0.06);
    color: var(--seller-text) !important;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: background 0.18s, border-color 0.18s;
  }
  .seller-registration-page .seller-reg-links a:hover {
    background: rgba(240, 232, 117, 0.15);
    border-color: var(--seller-lime);
  }


  /* ── Mobile overrides ── */
  @media (max-width: 640px) {
    .seller-registration-page {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    .seller-registration-page .dispatch-page-container {
      width: 100%;
      max-width: 100%;
      padding-left: 12px;
      padding-right: 12px;
    }
    .seller-registration-page .dispatch-heading-react {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    .seller-registration-page .dispatch-heading-react > a,
    .seller-registration-page .dispatch-heading-react > .dispatch-button {
      width: 100%;
      justify-content: center;
    }
    .seller-registration-page .dispatch-form-grid {
      grid-template-columns: 1fr !important;
    }
    .seller-registration-page .dispatch-location-actions {
      grid-template-columns: 1fr !important;
    }
    .seller-registration-page .dispatch-span-two {
      grid-column: 1 !important;
    }
    .seller-registration-page .seller-reg-links {
      flex-direction: column;
    }
    .seller-registration-page .seller-reg-links a {
      width: 100%;
      justify-content: center;
    }
  }
`;

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

function apiMessage(payload: RegistrationApiPayload, fallback: string): string {
  return payload.message?.trim() || fallback;
}

function isValidCoordinatePair(latitude: unknown, longitude: unknown): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function mapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
    latitude,
  )}&mlon=${encodeURIComponent(longitude)}#map=17/${encodeURIComponent(
    latitude,
  )}/${encodeURIComponent(longitude)}`;
}

function parseCoordinateText(value: string): LocationSuggestion | null {
  const directMatch = value.match(
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  );
  const atMatch = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const queryMatch = value.match(
    /(?:query|q|destination)=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i,
  );
  const match = directMatch || atMatch || queryMatch;

  if (!match || !isValidCoordinatePair(match[1], match[2])) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return {
    latitude,
    longitude,
    name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    display_name: "",
    maps_url: mapUrl(latitude, longitude),
    source: directMatch ? "coordinates" : "map_url",
  };
}

export function SellerRegistrationPage() {
  const otpInputRef = useRef<HTMLInputElement>(null);
  const placeSearchRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const skipNextSuggestionSearchRef = useRef(false);
  const suggestionBlurTimerRef = useRef<number | null>(null);

  const [stage, setStage] = useState<RegistrationStage>("form");
  const [form, setForm] = useState<SellerRegistrationForm>(INITIAL_FORM);
  const [otp, setOtp] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [locationNotice, setLocationNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [parsingLocation, setParsingLocation] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loginUrl, setLoginUrl] = useState(LOGIN_URL);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(apiUrl("/react/api/register/seller/session"), {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await readJson<RegistrationSessionPayload>(response);

        if (cancelled) return;
        if (!response.ok || !payload.success) {
          throw new Error("Unable to load the seller registration session.");
        }

        setCsrfToken(payload.csrf_token);
        setLoginUrl(payload.login_url || LOGIN_URL);

        if (payload.authenticated) {
          window.location.assign("/dashboard");
          return;
        }

        if (payload.pending_otp) {
          setMaskedEmail(payload.pending_otp.masked_email);
          setExpiryMinutes(payload.pending_otp.expiry_minutes);
          setRemainingAttempts(payload.pending_otp.remaining_attempts);
          setStage("otp");
          if (payload.pending_otp.expired) {
            setNotice({
              kind: "info",
              text: "The previous OTP expired. Use Resend OTP to continue.",
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load the seller registration session.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage === "otp") {
      window.setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [stage]);

  useEffect(() => {
    const query = placeQuery.trim();

    if (skipNextSuggestionSearchRef.current) {
      skipNextSuggestionSearchRef.current = false;
      setSearchingPlaces(false);
      setSuggestionsOpen(false);
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setSearchingPlaces(false);
      setSuggestionsOpen(false);
      suggestionAbortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      suggestionAbortRef.current?.abort();
      const controller = new AbortController();
      suggestionAbortRef.current = controller;
      setSearchingPlaces(true);
      setSuggestionsOpen(true);

      try {
        const response = await fetch(
          `${apiUrl(SELLER_LOCATION_SUGGESTIONS_URL)}?q=${encodeURIComponent(query)}`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const payload = await readJson<LocationApiPayload>(response);
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Location suggestions are unavailable.");
        }
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
        setLocationNotice(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setSuggestionsOpen(false);
        setLocationNotice({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Location suggestions are unavailable.",
        });
      } finally {
        if (suggestionAbortRef.current === controller) {
          setSearchingPlaces(false);
        }
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [placeQuery]);

  function updateField<K extends keyof SellerRegistrationForm>(
    key: K,
    value: SellerRegistrationForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyLocation(
    location: LocationSuggestion,
    source?: string,
    accuracy?: number | string,
  ) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!isValidCoordinatePair(latitude, longitude)) {
      setLocationNotice({
        kind: "error",
        text: "The selected place does not have valid coordinates.",
      });
      return;
    }

    const locationName = String(
      location.name ||
      location.display_name ||
      `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    ).trim();
    const selectedMapUrl = location.maps_url || mapUrl(latitude, longitude);
    const fullAddress = String(location.display_name || "").trim();

    setForm((current) => ({
      ...current,
      seller_latitude: latitude.toFixed(7),
      seller_longitude: longitude.toFixed(7),
      location_name: locationName,
      seller_maps_url: selectedMapUrl,
      location_source: source || location.source || "place_search",
      location_accuracy_meters: accuracy == null ? "" : String(accuracy),
      pickup_address: fullAddress || current.pickup_address,
    }));
    skipNextSuggestionSearchRef.current = true;
    setPlaceQuery(locationName);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setLocationNotice({
      kind: "success",
      text: fullAddress
        ? "Business location selected and pickup address auto-filled."
        : "Business location selected. Complete the pickup address below.",
    });
  }

  async function reverseCoordinates(latitude: number, longitude: number) {
    try {
      const response = await fetch(
        `${apiUrl(SELLER_REVERSE_LOCATION_URL)}?lat=${encodeURIComponent(
          latitude,
        )}&lng=${encodeURIComponent(longitude)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const payload = await readJson<LocationApiPayload>(response);
      return response.ok && payload.success ? payload.location || null : null;
    } catch {
      return null;
    }
  }

  function getCurrentPosition(
    options: PositionOptions,
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function requestCurrentPosition(): Promise<GeolocationPosition> {
    try {
      return await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    } catch {
      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60000,
      });
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationNotice({
        kind: "error",
        text: "This browser does not support location access.",
      });
      return;
    }

    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setLocationNotice({
        kind: "error",
        text: "Current location requires HTTPS or localhost.",
      });
      return;
    }

    setLocating(true);
    setLocationNotice({ kind: "info", text: "Requesting current locationâ€¦" });

    try {
      const position = await requestCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      setLocationNotice({
        kind: "info",
        text: "Location captured. Finding the complete addressâ€¦",
      });

      const reversed = await reverseCoordinates(latitude, longitude);
      applyLocation(
        reversed
          ? { ...reversed, latitude, longitude }
          : {
              latitude,
              longitude,
              name: "Current business location",
              display_name: "",
              maps_url: mapUrl(latitude, longitude),
            },
        "current_location",
        accuracy,
      );
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      let text = "Unable to capture the current location.";

      if (geoError?.code === geoError?.PERMISSION_DENIED) {
        text =
          "Location permission was denied. Allow location access or use place search/map URL.";
      } else if (geoError?.code === geoError?.POSITION_UNAVAILABLE) {
        text = "Position is unavailable. Turn on GPS or Wi-Fi and try again.";
      } else if (geoError?.code === geoError?.TIMEOUT) {
        text = "Location request timed out. Try again or choose another method.";
      }

      setLocationNotice({ kind: "error", text });
    } finally {
      setLocating(false);
    }
  }

  function handlePlaceSearchFocus() {
    if (suggestionBlurTimerRef.current !== null) {
      window.clearTimeout(suggestionBlurTimerRef.current);
    }
    if (placeQuery.trim().length >= 2) {
      setSuggestionsOpen(true);
    }
  }

  function handlePlaceSearchBlur() {
    suggestionBlurTimerRef.current = window.setTimeout(() => {
      setSuggestionsOpen(false);
    }, 180);
  }

  function handleLocationInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void parseTypedLocation();
    }
  }

  async function parseTypedLocation() {
    const value = form.location_input.trim();
    if (!value) {
      setLocationNotice({
        kind: "error",
        text: "Paste a map URL or enter latitude and longitude.",
      });
      locationInputRef.current?.focus();
      return;
    }

    setParsingLocation(true);
    setLocationNotice({ kind: "info", text: "Reading the supplied locationâ€¦" });

    try {
      const response = await fetch(
        `${apiUrl(SELLER_PARSE_LOCATION_URL)}?value=${encodeURIComponent(value)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const payload = await readJson<LocationApiPayload>(response);

      let location: LocationSuggestion | null = null;
      if (response.ok && payload.success && payload.location) {
        location = payload.location;
      } else {
        location = parseCoordinateText(value);
      }

      if (!location) {
        throw new Error(payload.message || "Coordinates could not be read.");
      }

      const reversed = await reverseCoordinates(
        Number(location.latitude),
        Number(location.longitude),
      );
      applyLocation(
        { ...location, ...(reversed || {}) },
        location.source || "map_url",
      );
    } catch (error) {
      const localLocation = parseCoordinateText(value);
      if (localLocation) {
        applyLocation(localLocation, localLocation.source || "coordinates");
      } else {
        setLocationNotice({
          kind: "error",
          text:
            error instanceof Error ? error.message : "Unable to read this location.",
        });
      }
    } finally {
      setParsingLocation(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!isValidCoordinatePair(form.seller_latitude, form.seller_longitude)) {
      setLocationNotice({
        kind: "error",
        text: "Select the business location before submitting.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        apiUrl("/react/api/register/seller/request-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            ...form,
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            business_name: form.business_name.trim(),
            gst_number: form.gst_number.trim().toUpperCase(),
            product_category: form.product_category.trim(),
            pickup_address: form.pickup_address.trim(),
          }),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);
      if (payload.csrf_token) setCsrfToken(payload.csrf_token);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.redirect_url) {
          window.location.assign(payload.redirect_url);
          return;
        }
        throw new Error(apiMessage(payload, "Unable to send the registration OTP."));
      }

      setMaskedEmail(payload.masked_email || form.email.trim().toLowerCase());
      setExpiryMinutes(payload.expiry_minutes || 0);
      setRemainingAttempts(payload.max_attempts ?? null);
      setOtp("");
      setStage("otp");
      setNotice({
        kind: "success",
        text: payload.message || "Registration OTP sent successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to send the registration OTP.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!/^\d{6}$/.test(otp)) {
      setNotice({ kind: "error", text: "Enter the complete six-digit OTP." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        apiUrl("/react/api/register/seller/verify-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ otp }),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);
      if (payload.csrf_token) setCsrfToken(payload.csrf_token);
      if (typeof payload.remaining_attempts === "number") {
        setRemainingAttempts(payload.remaining_attempts);
      }

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.restart_required) {
          setStage("form");
          setOtp("");
        }
        throw new Error(apiMessage(payload, "Unable to verify the OTP."));
      }

      setLoginUrl(payload.redirect_url || LOGIN_URL);
      setStage("complete");
      setNotice({
        kind: "success",
        text: payload.message || "Seller registration submitted successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to verify the OTP.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setNotice(null);
    setResending(true);
    try {
      const response = await fetch(
        apiUrl("/react/api/register/seller/resend-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({}),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.restart_required) {
          setStage("form");
          setOtp("");
        }
        throw new Error(apiMessage(payload, "Unable to resend the OTP."));
      }

      setMaskedEmail(payload.masked_email || maskedEmail);
      setExpiryMinutes(payload.expiry_minutes || expiryMinutes);
      setRemainingAttempts(payload.max_attempts ?? null);
      setOtp("");
      setNotice({
        kind: "success",
        text: payload.message || "A new registration OTP was sent.",
      });
      otpInputRef.current?.focus();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to resend the OTP.",
      });
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  }

  function handleOtpKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && otp.length !== 6) {
      event.preventDefault();
      setNotice({ kind: "error", text: "Enter the complete six-digit OTP." });
    }
  }

  if (loading) {
    return (
      <main className="react-auth-shell" style={{ backgroundColor: "#33371b" }}>
        <section className="react-auth-card" aria-busy="true">
          <div className="react-auth-loader" />
          <p className="react-auth-loading-text">Loading seller registration…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dispatch-page seller-registration-page">
      <style>{SELLER_REGISTRATION_THEME}</style>
      <div className="dispatch-page-container">

        {/* â”€â”€ Page heading (same pattern as delivery registration) â”€â”€ */}
        <section className="dispatch-heading-react">
          <div>
            <span className="dispatch-eyebrow">Seller onboarding</span>
            <h1>Register Your Juice Business</h1>
            <p>
              Add the owner, business and pickup-location details. Your email
              must be verified before the application is sent for admin approval.
            </p>
          </div>
          <Link className="dispatch-button secondary" to={LOGIN_URL}>
            Already Registered
          </Link>
        </section>

        {/* â”€â”€ Global notice â”€â”€ */}
        {notice && (
          <div
            className={`dispatch-notice ${notice.kind}`}
            role={notice.kind === "error" ? "alert" : "status"}
          >
            {notice.text}
          </div>
        )}

        {/* â”€â”€ Registration form â”€â”€ */}
        {stage === "form" ? (
          <form
            className="dispatch-card dispatch-registration-form"
            onSubmit={requestOtp}
            noValidate
          >
            {/* Business Details section */}
            <section>
              <h2>Business Details</h2>
              <div className="dispatch-form-grid">
                <label>
                  Full name
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    autoComplete="name"
                    required
                    autoFocus
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    autoComplete="email"
                    required
                    placeholder="name@example.com"
                  />
                </label>

                <label>
                  Contact number
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </label>

                <label>
                  Business name
                  <input
                    type="text"
                    value={form.business_name}
                    onChange={(event) => updateField("business_name", event.target.value)}
                    autoComplete="organization"
                    required
                  />
                </label>

                <label>
                  GST number
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={(event) => updateField("gst_number", event.target.value)}
                    maxLength={20}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  Primary product category
                  <input
                    type="text"
                    value={form.product_category}
                    onChange={(event) => updateField("product_category", event.target.value)}
                    placeholder="Example: Fresh Fruit Juices"
                    required
                  />
                </label>
              </div>
            </section>

            {/* Pickup Location section */}
            <section>
              <h2>Pickup Location</h2>

              <div className="dispatch-location-actions">
                <button
                  className="dispatch-button primary"
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                >
                  {locating ? "Locatingâ€¦" : "Use Current Location"}
                </button>

                <input
                  ref={placeSearchRef}
                  type="search"
                  value={placeQuery}
                  onChange={(event) => {
                    setPlaceQuery(event.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={handlePlaceSearchFocus}
                  onBlur={handlePlaceSearchBlur}
                  autoComplete="off"
                  placeholder="Search place, paste map URL, or enter latitude, longitude"
                />

                <button
                  className="dispatch-button secondary"
                  type="button"
                  onClick={parseTypedLocation}
                  disabled={parsingLocation}
                >
                  {parsingLocation ? "Readingâ€¦" : "Parse Map Location"}
                </button>
              </div>

              {searchingPlaces && (
                <p className="dispatch-muted">Searching placesâ€¦</p>
              )}

              {suggestionsOpen && !searchingPlaces && suggestions.length > 0 && (
                <div className="dispatch-suggestion-list">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyLocation(suggestion, "place_search")}
                    >
                      <strong>
                        {suggestion.name || suggestion.display_name || "Select location"}
                      </strong>
                      {suggestion.display_name && (
                        <span>{suggestion.display_name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {locationNotice && (
                <div
                  className={`dispatch-notice ${locationNotice.kind}`}
                  role={locationNotice.kind === "error" ? "alert" : "status"}
                >
                  {locationNotice.text}
                </div>
              )}

              {isValidCoordinatePair(form.seller_latitude, form.seller_longitude) && (
                <div className="dispatch-notice success">
                  <strong>{form.location_name || "Selected business location"}</strong>
                  <br />
                  <small>
                    Latitude {form.seller_latitude} Â· Longitude {form.seller_longitude}
                    {form.location_accuracy_meters
                      ? ` Â· Accuracy about ${Math.round(Number(form.location_accuracy_meters))} m`
                      : ""}
                  </small>
                  {form.seller_maps_url && (
                    <>
                      <br />
                      <a href={form.seller_maps_url} target="_blank" rel="noreferrer">
                        Open selected location
                      </a>
                    </>
                  )}
                </div>
              )}

              <div className="dispatch-form-grid">
                <label className="dispatch-span-two">
                  Complete pickup address
                  <textarea
                    rows={3}
                    value={form.pickup_address}
                    onChange={(event) => updateField("pickup_address", event.target.value)}
                    autoComplete="street-address"
                    placeholder="Shop number, building, street, area, landmark, city, state, PIN code"
                    required
                  />
                </label>

                <label>
                  Location input / map URL
                  <input
                    ref={locationInputRef}
                    type="text"
                    value={form.location_input}
                    onChange={(event) => updateField("location_input", event.target.value)}
                    onKeyDown={handleLocationInputKeyDown}
                    placeholder="Paste map URL or 17.385044, 78.486671"
                    autoComplete="off"
                  />
                </label>

                <label>
                  Coordinates
                  <input
                    type="text"
                    value={
                      form.seller_latitude && form.seller_longitude
                        ? `${form.seller_latitude}, ${form.seller_longitude}`
                        : ""
                    }
                    readOnly
                    placeholder="Auto-filled from location"
                  />
                </label>
              </div>
            </section>

            <button
              className="dispatch-button primary full"
              type="submit"
              disabled={submitting || !csrfToken}
            >
              {submitting ? "Sending OTPâ€¦" : "Verify Email and Submit"}
            </button>

            {/* Registration links removed — links are present in site footer only */}
          </form>

        ) : stage === "otp" ? (

          <div className="dispatch-card">
            <span className="dispatch-eyebrow">Email verification</span>
            <h2 style={{ margin: "10px 0 6px", letterSpacing: "-0.03em" }}>
              Verify Seller Registration
            </h2>
            <p className="dispatch-muted">
              Enter the code sent to <strong style={{ color: "#344054" }}>{maskedEmail}</strong>
              {expiryMinutes > 0 ? ` within ${expiryMinutes} minutes.` : "."}
            </p>

            <form onSubmit={verifyOtp} noValidate style={{ marginTop: "20px" }}>
              <label style={{ display: "grid", gap: "7px", color: "#344054", fontSize: "0.86rem", fontWeight: 750 }}>
                Registration OTP
                <input
                  ref={otpInputRef}
                  type="text"
                  value={otp}
                  onChange={(event) => handleOtpChange(event.target.value)}
                  onKeyDown={handleOtpKeyDown}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  aria-label="Six-digit seller registration OTP"
                  style={{
                    width: "100%", minHeight: "54px",
                    border: "1px solid #d0d5dd", borderRadius: "11px",
                    background: "#fff", padding: "9px 12px",
                    color: "#101828", font: "inherit",
                    fontSize: "26px", letterSpacing: "0.4em",
                    textAlign: "center", outline: "none",
                  }}
                />
              </label>

              {remainingAttempts !== null && (
                <p className="dispatch-muted" style={{ marginTop: "8px", fontSize: "0.82rem" }}>
                  {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining
                </p>
              )}

              <button
                className="dispatch-button primary full"
                type="submit"
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? "Verifyingâ€¦" : "Verify and Submit Registration"}
              </button>

              <div style={{ display: "flex", gap: "12px", marginTop: "14px", justifyContent: "center" }}>
                <button
                  type="button"
                  className="dispatch-button secondary"
                  onClick={resendOtp}
                  disabled={resending}
                >
                  {resending ? "Sendingâ€¦" : "Resend OTP"}
                </button>
                <button
                  type="button"
                  className="dispatch-button secondary"
                  onClick={() => { setStage("form"); setOtp(""); setNotice(null); }}
                  disabled={submitting || resending}
                >
                  Edit details
                </button>
              </div>
            </form>
          </div>

        ) : (

          <div className="dispatch-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <span className="dispatch-eyebrow">Email verified</span>
            <h2 style={{ margin: "12px 0 10px", letterSpacing: "-0.03em" }}>
              Seller Registration Submitted
            </h2>
            <p className="dispatch-muted">
              Your email has been verified. The seller account is waiting for
              administrator approval. OTP login will become available after approval.
            </p>
            <a
              className="dispatch-button primary"
              href={loginUrl}
              style={{ marginTop: "24px", display: "inline-flex" }}
            >
              Continue to Login
            </a>
          </div>

        )}
      </div>
    </main>
  );
}

export default SellerRegistrationPage;
