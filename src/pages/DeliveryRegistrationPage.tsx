import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  errorMessage,
  loadDeliveryRegistrationSession,
  parseDeliveryLocation,
  registerDeliveryPerson,
  reverseDeliveryLocation,
  suggestDeliveryLocations,
  type DeliveryLocation,
} from "../services/deliveryDispatchApi";
import "../styles/delivery-dispatch.css";

interface RegistrationForm {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  service_area: string;
  service_radius_km: number;
  max_bulk_orders: number;
  max_active_orders: number;
  latitude: number | null;
  longitude: number | null;
  maps_url: string;
  location_name: string;
  location_source: string;
  accuracy_meters: number | null;
}

const INITIAL_FORM: RegistrationForm = {
  full_name: "",
  email: "",
  phone: "",
  vehicle_type: "",
  vehicle_number: "",
  license_number: "",
  service_area: "",
  service_radius_km: 25,
  max_bulk_orders: 5,
  max_active_orders: 20,
  latitude: null,
  longitude: null,
  maps_url: "",
  location_name: "",
  location_source: "",
  accuracy_meters: null,
};

const DELIVERY_REGISTRATION_THEME = `
  .delivery-registration-theme {
    --dispatch-theme-bg: #33371b;
    --dispatch-theme-panel: #fffdf2;
    --dispatch-theme-cream: #fffdf2;
    --dispatch-theme-text: #33371b;
    --dispatch-theme-muted: #dfe4cf;
    --dispatch-theme-yellow: #f0e875;
    --dispatch-theme-lime: #c8d34d;
    --dispatch-theme-green: #6ee7a0;
    background:
      radial-gradient(circle at 14% 10%, rgba(200, 211, 77, 0.15), transparent 30%),
      radial-gradient(circle at 88% 82%, rgba(110, 231, 160, 0.08), transparent 28%),
      var(--dispatch-theme-bg) !important;
    color: var(--dispatch-theme-cream);
  }

  .delivery-registration-theme .dispatch-page-container {
    background: transparent !important;
  }

  .delivery-registration-theme .dispatch-heading-react {
    border-color: rgba(240, 232, 117, 0.28) !important;
    background: transparent !important;
  }

  .delivery-registration-theme .dispatch-heading-react h1 {
    color: var(--dispatch-theme-cream) !important;
  }

  .delivery-registration-theme .dispatch-heading-react p,
  .delivery-registration-theme .dispatch-muted {
    color: var(--dispatch-theme-muted) !important;
  }

  .delivery-registration-theme .dispatch-eyebrow {
    color: var(--dispatch-theme-yellow) !important;
    background: rgba(240, 232, 117, 0.1) !important;
    border-color: rgba(240, 232, 117, 0.26) !important;
  }

  .delivery-registration-theme .dispatch-card {
    color: var(--dispatch-theme-text) !important;
    background: rgba(255, 253, 242, 0.98) !important;
    border-color: rgba(240, 232, 117, 0.52) !important;
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
  }

  .delivery-registration-theme .dispatch-card section,
  .delivery-registration-theme .dispatch-card h2 {
    border-color: rgba(51, 55, 27, 0.15) !important;
  }

  .delivery-registration-theme .dispatch-card h2,
  .delivery-registration-theme .dispatch-card label {
    color: var(--dispatch-theme-text) !important;
  }

  .delivery-registration-theme .dispatch-card input,
  .delivery-registration-theme .dispatch-card select,
  .delivery-registration-theme .dispatch-card textarea {
    color: var(--dispatch-theme-text) !important;
    background: #fffef8 !important;
    border-color: rgba(51, 55, 27, 0.28) !important;
    caret-color: var(--dispatch-theme-text);
  }

  .delivery-registration-theme .dispatch-card input::placeholder,
  .delivery-registration-theme .dispatch-card textarea::placeholder {
    color: #7a8054 !important;
  }

  .delivery-registration-theme .dispatch-card input:focus,
  .delivery-registration-theme .dispatch-card select:focus,
  .delivery-registration-theme .dispatch-card textarea:focus {
    border-color: var(--dispatch-theme-lime) !important;
    outline-color: var(--dispatch-theme-lime) !important;
    box-shadow: 0 0 0 3px rgba(200, 211, 77, 0.2) !important;
  }

  .delivery-registration-theme .dispatch-card input:read-only {
    background: #f0f2dc !important;
    color: #59602f !important;
  }

  .delivery-registration-theme .dispatch-button.primary {
    color: var(--dispatch-theme-text) !important;
    background: linear-gradient(135deg, var(--dispatch-theme-yellow), var(--dispatch-theme-lime)) !important;
    border-color: var(--dispatch-theme-yellow) !important;
    box-shadow: 0 10px 26px rgba(200, 211, 77, 0.2) !important;
  }

  .delivery-registration-theme .dispatch-button.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #fff49a, var(--dispatch-theme-yellow)) !important;
  }

  .delivery-registration-theme .dispatch-button.secondary {
    color: var(--dispatch-theme-text) !important;
    background: var(--dispatch-theme-panel) !important;
    border-color: var(--dispatch-theme-yellow) !important;
  }

  .delivery-registration-theme .dispatch-card .dispatch-button.secondary {
    color: var(--dispatch-theme-yellow) !important;
    background: var(--dispatch-theme-bg) !important;
    border-color: var(--dispatch-theme-lime) !important;
  }

  .delivery-registration-theme .dispatch-button.secondary:hover:not(:disabled) {
    color: var(--dispatch-theme-text) !important;
    background: var(--dispatch-theme-yellow) !important;
  }

  .delivery-registration-theme .dispatch-button:focus-visible,
  .delivery-registration-theme .dispatch-suggestion-list button:focus-visible {
    outline: 3px solid var(--dispatch-theme-yellow) !important;
    outline-offset: 3px;
  }

  .delivery-registration-theme .dispatch-suggestion-list {
    background: var(--dispatch-theme-panel) !important;
    border-color: rgba(51, 55, 27, 0.2) !important;
    box-shadow: 0 14px 36px rgba(51, 55, 27, 0.14) !important;
  }

  .delivery-registration-theme .dispatch-suggestion-list button {
    color: var(--dispatch-theme-text) !important;
    background: transparent !important;
    border-color: rgba(51, 55, 27, 0.12) !important;
  }

  .delivery-registration-theme .dispatch-suggestion-list button:hover {
    background: rgba(200, 211, 77, 0.18) !important;
  }

  .delivery-registration-theme .dispatch-suggestion-list span {
    color: #687044 !important;
  }

  .delivery-registration-theme .dispatch-notice.success {
    color: #174128 !important;
    background: #dff8e7 !important;
    border-color: #6ee7a0 !important;
  }

  .delivery-registration-theme .dispatch-notice.warning {
    color: #4f4814 !important;
    background: #fff9c7 !important;
    border-color: var(--dispatch-theme-yellow) !important;
  }

  .delivery-registration-theme .dispatch-notice.error {
    color: #6a2424 !important;
    background: #ffe7df !important;
    border-color: #ff9f80 !important;
  }
`;

export function DeliveryRegistrationPage() {
  const [form, setForm] =
    useState<RegistrationForm>(INITIAL_FORM);
  const [csrfToken, setCsrfToken] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    DeliveryLocation[]
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] =
    useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    loadDeliveryRegistrationSession()
      .then((response) => {
        setCsrfToken(response.csrf_token || "");
        setForm((current) => ({
          ...current,
          service_radius_km:
            response.defaults?.service_radius_km || 25,
          max_bulk_orders:
            response.defaults?.max_bulk_orders || 5,
          max_active_orders:
            response.defaults?.max_active_orders || 20,
        }));
      })
      .catch((error) => {
        setNotice({
          kind: "error",
          text: errorMessage(
            error,
            "Unable to initialize delivery registration.",
          ),
        });
      });
  }, []);

  useEffect(() => {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }

    if (locationQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimer.current = window.setTimeout(() => {
      setLoadingSuggestions(true);

      suggestDeliveryLocations(locationQuery)
        .then((response) => {
          setSuggestions(response.suggestions || []);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => {
          setLoadingSuggestions(false);
        });
    }, 400);

    return () => {
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, [locationQuery]);

  function applyLocation(
    location: DeliveryLocation,
    source = "place_search",
  ) {
    setForm((current) => ({
      ...current,
      latitude: location.latitude,
      longitude: location.longitude,
      maps_url: location.maps_url || "",
      location_name:
        location.name ||
        location.display_name ||
        `${location.latitude}, ${location.longitude}`,
      service_area:
        location.display_name || current.service_area,
      location_source:
        location.source || source,
    }));

    setLocationQuery(
      location.display_name ||
        location.name ||
        `${location.latitude}, ${location.longitude}`,
    );
    setSuggestions([]);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice({
        kind: "error",
        text: "Geolocation is not supported by this browser.",
      });
      return;
    }

    setLocating(true);
    setNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const response = await reverseDeliveryLocation(
            latitude,
            longitude,
          );

          applyLocation(
            response.location || {
              latitude,
              longitude,
              name: `${latitude}, ${longitude}`,
            },
            "current_location",
          );
        } catch {
          applyLocation(
            {
              latitude,
              longitude,
              name: `${latitude}, ${longitude}`,
            },
            "current_location",
          );
        } finally {
          setForm((current) => ({
            ...current,
            accuracy_meters:
              position.coords.accuracy || null,
            location_source: "current_location",
          }));
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        setNotice({
          kind: "error",
          text:
            error.message ||
            "Unable to access the current location.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }

  async function parseMapValue() {
    if (!locationQuery.trim()) return;

    setLocating(true);
    setNotice(null);

    try {
      const response = await parseDeliveryLocation(
        locationQuery,
      );

      if (response.location) {
        applyLocation(
          response.location,
          response.location.source ||
            "manual_coordinates",
        );
      }
    } catch (error) {
      setNotice({
        kind: "error",
        text: errorMessage(
          error,
          "Coordinates were not found in that value.",
        ),
      });
    } finally {
      setLocating(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (
      form.latitude === null ||
      form.longitude === null
    ) {
      setNotice({
        kind: "error",
        text:
          "Select the service-area location before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await registerDeliveryPerson(
        csrfToken,
        {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          vehicle_type: form.vehicle_type,
          vehicle_number: form.vehicle_number,
          license_number: form.license_number,
          service_area: form.service_area,
          service_radius_km: form.service_radius_km,
          max_bulk_orders: form.max_bulk_orders,
          max_active_orders: form.max_active_orders,
          delivery_latitude: form.latitude,
          delivery_longitude: form.longitude,
          delivery_maps_url: form.maps_url,
          location_name: form.location_name,
          location_source:
            form.location_source ||
            "manual_coordinates",
          location_accuracy_meters:
            form.accuracy_meters,
          location_input: locationQuery,
        },
      );

      setCsrfToken(response.csrf_token || csrfToken);
      setNotice({
        kind: "success",
        text:
          response.message ||
          "Delivery registration submitted.",
      });
      setForm(INITIAL_FORM);
      setLocationQuery("");
    } catch (error) {
      setNotice({
        kind: "error",
        text: errorMessage(
          error,
          "Unable to submit delivery registration.",
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dispatch-page delivery-registration-theme">
      <style>{DELIVERY_REGISTRATION_THEME}</style>
      <div className="dispatch-page-container">
      <section className="dispatch-heading-react">
        <div>
          <span className="dispatch-eyebrow">
            Delivery registration
          </span>
          <h1>Register as a Delivery Partner</h1>
          <p>
            Submit vehicle, service-area, location, and
            route-capacity details for administrator approval.
          </p>
        </div>

        <Link
          className="dispatch-button secondary"
          to="/react/login"
        >
          Already Registered
        </Link>
      </section>

      {notice && (
        <div className={`dispatch-notice ${notice.kind}`}>
          {notice.text}
        </div>
      )}

      <form
        className="dispatch-card dispatch-registration-form"
        onSubmit={submit}
      >
        <section>
          <h2>Profile and Vehicle</h2>

          <div className="dispatch-form-grid">
            <label>
              Full name
              <input
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Vehicle type
              <select
                value={form.vehicle_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vehicle_type: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select vehicle</option>
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="auto">Auto</option>
                <option value="car">Car</option>
                <option value="mini_truck">Mini Truck</option>
              </select>
            </label>

            <label>
              Vehicle number
              <input
                value={form.vehicle_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vehicle_number: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Driving licence number
              <input
                value={form.license_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    license_number: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>
        </section>

        <section>
          <h2>Service Area Location</h2>

          <div className="dispatch-location-actions">
            <button
              className="dispatch-button primary"
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating
                ? "Locating…"
                : "Use Current Location"}
            </button>

            <input
              value={locationQuery}
              onChange={(event) =>
                setLocationQuery(event.target.value)
              }
              placeholder="Search place, paste map URL, or enter latitude, longitude"
            />

            <button
              className="dispatch-button secondary"
              type="button"
              onClick={() => void parseMapValue()}
              disabled={locating}
            >
              Parse Map Location
            </button>
          </div>

          {loadingSuggestions && (
            <p className="dispatch-muted">
              Searching locations…
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="dispatch-suggestion-list">
              {suggestions.map((suggestion, index) => (
                <button
                  type="button"
                  key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                  onClick={() =>
                    applyLocation(suggestion)
                  }
                >
                  <strong>
                    {suggestion.name ||
                      suggestion.display_name}
                  </strong>
                  <span>
                    {suggestion.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="dispatch-form-grid">
            <label className="dispatch-span-two">
              Complete operating address
              <textarea
                rows={3}
                value={form.service_area}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    service_area: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Latitude
              <input
                value={form.latitude ?? ""}
                readOnly
              />
            </label>

            <label>
              Longitude
              <input
                value={form.longitude ?? ""}
                readOnly
              />
            </label>

            <label>
              Service radius (km)
              <input
                type="number"
                min={1}
                max={500}
                value={form.service_radius_km}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    service_radius_km: Number(
                      event.target.value,
                    ),
                  }))
                }
              />
            </label>

            <label>
              Orders per batch
              <input
                type="number"
                min={1}
                max={100}
                value={form.max_bulk_orders}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_bulk_orders: Number(
                      event.target.value,
                    ),
                  }))
                }
              />
            </label>

            <label>
              Maximum active orders
              <input
                type="number"
                min={1}
                max={500}
                value={form.max_active_orders}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_active_orders: Number(
                      event.target.value,
                    ),
                  }))
                }
              />
            </label>
          </div>
        </section>

        <button
          className="dispatch-button primary"
          type="submit"
          disabled={submitting || !csrfToken}
        >
          {submitting
            ? "Submitting…"
            : "Submit Delivery Registration"}
        </button>
      </form>
      </div>
    </main>
  );
}
