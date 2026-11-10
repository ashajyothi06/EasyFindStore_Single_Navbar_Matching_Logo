import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  previewMultipleBookings,
} from "../services/deliveryDispatchApi";
import "../styles/delivery-dispatch.css";

const PREVIEW_STORAGE_KEY =
  "deliveryDispatchPreview";

interface FulfillmentSummary {
  product_types?: string[];
  delivery_time_slots?: string[];
  selected_delivery_time_slots?: string[];
  delivery_types?: string[];
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
}

interface DeliveryWindow {
  slot?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  time_label?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;
}

interface FulfillmentRecord {
  product_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  items?: Array<Record<string, any>>;
  delivery_type?: string;
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  fulfillment_summary?: FulfillmentSummary;
}

interface PreviewBooking extends FulfillmentRecord {
  id?: string;
  booking_id?: string;
  booking_number?: string;
  parent_order_number?: string;
  business_name?: string;
  seller_name?: string;
  customer_name?: string;
  item_count?: number;
  is_subscription_booking?: boolean;
  is_subscription_delivery?: boolean;
  subscription_item_name?: string;
  subscription_plan_code?: string;
  subscription_delivery_sequence?: number;
  subscription_scheduled_date?: string;
  scheduled_date?: string;
}

interface DeliveryCandidate {
  delivery_person_id: string;
  delivery_person_name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  service_area?: string;
  active_order_count?: number;
  available_capacity?: number;
  max_bulk_orders?: number;
  pickup_km?: number;
  delivery_km?: number;
  combined_km?: number;
  first_pickup_km?: number;
  pickup_count?: number;
  drop_count?: number;
  within_configured_limits?: boolean;
  subscription_limit_override?: boolean;
  eligibility_warnings?: string[];
}

interface DeliveryPreview extends FulfillmentRecord {
  preview_version?: number;
  preview_generated_at?: string;
  requested_booking_ids?: string[];
  selected_bookings?: PreviewBooking[];
  booking_count?: number;
  order_count?: number;
  item_count?: number;
  pickup_count?: number;
  drop_count?: number;
  subscription_delivery_count?: number;
  candidates?: DeliveryCandidate[];
  draft_id?: string;
  draft_number?: string;
  locked_delivery_person_id?: string;
  locked_delivery_person_name?: string;
}

interface PreviewResponse {
  success?: boolean;
  preview?: DeliveryPreview;
  csrf_token?: string;
  page_role?: "admin" | "manager";
  message?: string;
}

interface DraftResponse {
  success?: boolean;
  message?: string;
  redirect_url?: string;
  draft?: {
    id?: string;
    draft_number?: string;
  };
  csrf_token?: string;
  code?: string;
}

const PREVIEW_STYLES = `
  .dispatch-preview-refresh{display:flex;align-items:center;gap:9px;color:#5f6f65;font-size:.82rem}
  .dispatch-preview-refresh .pulse{width:9px;height:9px;border-radius:999px;background:#1b9b5b;box-shadow:0 0 0 5px rgba(27,155,91,.11)}
  .dispatch-preview-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:18px 0}
  .dispatch-preview-summary article{padding:16px;border:1px solid #dfe9e2;border-radius:14px;background:#fff}
  .dispatch-preview-summary strong{display:block;color:#123b25;font-size:1.35rem}
  .dispatch-preview-summary span{color:#68766d;font-size:.75rem}
  .dispatch-preview-section{margin-top:18px;padding:20px;border:1px solid #dfe9e2;border-radius:16px;background:#fff}
  .dispatch-preview-section h2{margin:0 0 13px}
  .dispatch-preview-bookings{display:grid;gap:10px}
  .dispatch-preview-booking{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;padding:13px 14px;border-radius:12px;background:#f7faf8}
  .dispatch-preview-booking.subscription{border:1px solid #cde6d5;background:#f3fbf5}
  .dispatch-preview-booking strong,.dispatch-preview-booking span{display:block}
  .dispatch-preview-booking small{color:#65756b}
  .dispatch-preview-date{color:#176c3e!important;font-weight:850}
  .dispatch-preview-fulfillment{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin:0 0 18px;padding:16px;border:1px solid #dfe9e2;border-radius:16px;background:#fff}
  .dispatch-preview-fulfillment div{padding:12px;border-radius:11px;background:#f1f7f3}
  .dispatch-preview-fulfillment span{display:block;color:#68766d;font-size:.68rem;font-weight:850;text-transform:uppercase}
  .dispatch-preview-fulfillment strong{display:block;margin-top:4px;color:#153e27}
  .dispatch-preview-booking-meta{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:7px}
  .dispatch-preview-booking-meta span{padding:4px 7px;border-radius:999px;background:#e8f4ec;color:#285b3e;font-size:.63rem;font-weight:800}
  .dispatch-preview-booking-meta .dispatch-selected-time{background:#dff3e5;color:#165f35;border:1px solid #a8d5b5}
  .dispatch-preview-booking-meta .dispatch-delivery-estimate{background:#fff7df;color:#735800;border:1px solid #ead38c}
  .dispatch-preview-candidates{display:grid;gap:12px}
  .dispatch-candidate{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:16px;border:1px solid #dfe8e1;border-radius:14px;cursor:pointer;transition:.16s ease}
  .dispatch-candidate:hover,.dispatch-candidate.selected{border-color:#26965b;background:#f4fbf6;box-shadow:0 8px 24px rgba(27,90,51,.08)}
  .dispatch-candidate input{width:20px;height:20px;accent-color:#168c50}
  .dispatch-candidate h3{margin:0 0 3px}
  .dispatch-candidate p{margin:2px 0;color:#65756b;font-size:.8rem}
  .dispatch-route-metrics{display:grid;grid-template-columns:repeat(3,minmax(72px,1fr));gap:8px;text-align:center}
  .dispatch-route-metrics span{padding:9px;border-radius:10px;background:#edf6f0;color:#5d6b62;font-size:.7rem}
  .dispatch-route-metrics strong{display:block;color:#123c25;font-size:.9rem}
  .dispatch-warning{margin-top:8px;padding:8px 10px;border-radius:9px;background:#fff5dc;color:#7b5800;font-size:.75rem}
  .dispatch-preview-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
  @media(max-width:900px){.dispatch-preview-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.dispatch-candidate{grid-template-columns:auto 1fr}.dispatch-route-metrics{grid-column:1/-1}.dispatch-preview-summary article:last-child{grid-column:1/-1}}
  @media(max-width:560px){.dispatch-preview-booking{grid-template-columns:1fr}.dispatch-preview-fulfillment{grid-template-columns:1fr}.dispatch-preview-actions{flex-direction:column}.dispatch-preview-actions .dispatch-button{width:100%}}
`;

function storedResponse(): PreviewResponse | null {
  try {
    const raw = sessionStorage.getItem(
      PREVIEW_STORAGE_KEY,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as PreviewResponse)
      : null;
  } catch {
    return null;
  }
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function title(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function fulfillmentValues(
  row: FulfillmentRecord,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
  fallback?: FulfillmentRecord,
): string[] {
  const entries = [
    ...(row.fulfillment_summary?.[key] || []),
    String(row[directKey] || ""),
    ...(fallback?.fulfillment_summary?.[key] || []),
    String(fallback?.[directKey] || ""),
  ].map(String).map((value) => value.trim()).filter(Boolean);
  const unique = [...new Map(entries.map((value) => [value.toLowerCase(), value])).values()];
  if (unique.length) return unique;
  return [];
}

function deliveryTimeLabel(value: string): string {
  return value === "both" ? "Morning & Evening" : title(value);
}

function concreteDeliveryTimes(values: unknown): string[] {
  const rawValues = Array.isArray(values) ? values : [values];
  const result: string[] = [];
  rawValues.forEach((value) => {
    const clean = String(value || "").trim().toLowerCase();
    const slots = clean === "both" ? ["morning", "evening"] : [clean];
    slots.forEach((slot) => {
      if (["morning", "evening"].includes(slot) && !result.includes(slot)) {
        result.push(slot);
      }
    });
  });
  return result;
}

function selectedDeliveryTimes(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): string[] {
  const itemSlots = (row.items || []).flatMap((item) =>
    concreteDeliveryTimes(
      item.customer_selected_delivery_time_slots ||
        item.selected_delivery_time_slots ||
        item.selected_delivery_time_slot,
    ),
  );
  const uniqueItemSlots = [...new Set(itemSlots)];
  if (uniqueItemSlots.length) return uniqueItemSlots;

  const sources: unknown[] = [
    row.customer_selected_delivery_time_slots,
    row.selected_delivery_time_slots,
    row.fulfillment_summary?.selected_delivery_time_slots,
    row.selected_delivery_time_slot,
    fallback?.customer_selected_delivery_time_slots,
    fallback?.selected_delivery_time_slots,
    fallback?.fulfillment_summary?.selected_delivery_time_slots,
    fallback?.selected_delivery_time_slot,
  ];

  for (const source of sources) {
    const slots = concreteDeliveryTimes(source);
    if (slots.length) return slots;
  }

  const scheduled = concreteDeliveryTimes(
    deliveryWindows(row, fallback).map((window) => window.slot),
  );
  if (scheduled.length) return scheduled;

  const legacy = [
    row.delivery_time_slot,
    ...(row.fulfillment_summary?.delivery_time_slots || []),
    fallback?.delivery_time_slot,
    ...(fallback?.fulfillment_summary?.delivery_time_slots || []),
  ].filter((value) => String(value || "").toLowerCase() !== "both");
  const legacySlots = concreteDeliveryTimes(legacy);
  if (legacySlots.length) return legacySlots;

  return [];
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return title(value);
}

function formatEstimatedDate(value: unknown): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const dateOnly = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatEstimatedClock(value: unknown): string {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatConfiguredClock(value: unknown): string {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function deliveryWindows(row: FulfillmentRecord, fallback?: FulfillmentRecord): DeliveryWindow[] {
  const direct = Array.isArray(row.promised_delivery_windows) ? row.promised_delivery_windows.filter(Boolean) : [];
  const itemWindows = (row.items || []).flatMap((item) =>
    Array.isArray(item.promised_delivery_windows) ? item.promised_delivery_windows.filter(Boolean) : [],
  );
  if (direct.length || itemWindows.length) {
    const seen = new Set<string>();
    return [...direct, ...itemWindows].filter((window) => {
      const key = [window.slot, window.date, window.start_at || window.start_time, window.end_at || window.end_time].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const source = row.promised_delivery_date || row.promised_delivery_time_label || row.promised_delivery_start_at || row.promised_delivery_end_at ? row : fallback;
  const summary = source?.fulfillment_summary;
  const date = source?.promised_delivery_date || summary?.promised_delivery_date;
  const timeLabel = source?.promised_delivery_time_label || summary?.promised_delivery_time_label;
  const startAt = source?.promised_delivery_start_at || summary?.promised_delivery_start_at;
  const endAt = source?.promised_delivery_end_at || summary?.promised_delivery_end_at;
  return date || timeLabel || startAt || endAt
    ? [{ date, time_label: timeLabel, start_at: startAt, end_at: endAt, timezone: source?.delivery_schedule_timezone || "Asia/Kolkata" }]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatEstimatedDate(window.date || window.start_at);
  const start = formatEstimatedClock(window.start_at) || formatConfiguredClock(window.start_time);
  const end = formatEstimatedClock(window.end_at) || formatConfiguredClock(window.end_time);
  const time = String(window.time_label || "").trim() || (start && end ? `${start} – ${end}` : start || end);
  const slot = window.slot ? deliveryTimeLabel(window.slot) : "";
  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

function readableDate(value: unknown): string {
  const text = String(value || "");
  if (!text) return "Delivery date unavailable";
  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function bookingDate(
  booking: PreviewBooking,
): string {
  return readableDate(
    booking.subscription_scheduled_date ||
      booking.scheduled_date,
  );
}

async function createMultipleBookingDraft(
  csrfToken: string,
  bookingIds: string[],
  deliveryPersonId: string,
  draftId: string,
): Promise<DraftResponse> {
  const response = await fetch(
    "/react/api/delivery-dispatch/manual/multiple-create",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        csrf_token: csrfToken,
        booking_ids: bookingIds,
        delivery_person_id: deliveryPersonId,
        draft_id: draftId,
      }),
    },
  );

  let payload: DraftResponse = {};
  try {
    payload = (await response.json()) as DraftResponse;
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success !== true) {
    const requestError = new Error(
      payload.message ||
        "Unable to create the delivery booking.",
    ) as Error & {
      status?: number;
      code?: string;
    };
    requestError.status = response.status;
    requestError.code = payload.code;
    throw requestError;
  }

  return payload;
}

export function MultipleBookingPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [initialResponse] =
    useState<PreviewResponse | null>(() => {
      const locationResponse =
        location.state &&
        typeof location.state === "object"
          ? (location.state as PreviewResponse)
          : null;
      return locationResponse || storedResponse();
    });

  const [data, setData] =
    useState<PreviewResponse | null>(
      initialResponse,
    );
  const [selectedPersonId, setSelectedPersonId] =
    useState(
      String(
        initialResponse?.preview
          ?.locked_delivery_person_id || "",
      ),
    );
  const [refreshing, setRefreshing] =
    useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const requestedBookingIds = useMemo(
    () =>
      (
        initialResponse?.preview
          ?.requested_booking_ids || []
      ).map(String),
    [initialResponse],
  );
  const initialDraftId = String(
    initialResponse?.preview?.draft_id || "",
  );
  const initialCsrfToken = String(
    initialResponse?.csrf_token || "",
  );

  useEffect(() => {
    let active = true;

    async function refreshPreview() {
      if (
        !initialCsrfToken ||
        !requestedBookingIds.length
      ) {
        setRefreshing(false);
        setError(
          "The selected bookings could not be restored. Return to delivery dispatch and select them again.",
        );
        return;
      }

      setRefreshing(true);
      setError("");
      try {
        // Always ask the backend for a new route. This deliberately
        // replaces an older sessionStorage preview whose delivery
        // distance may have been calculated from an unrelated address.
        const response = (await previewMultipleBookings(
          initialCsrfToken,
          requestedBookingIds,
          initialDraftId,
        )) as PreviewResponse;
        if (!active) return;

        setData(response);
        sessionStorage.setItem(
          PREVIEW_STORAGE_KEY,
          JSON.stringify(response),
        );

        const candidates =
          response.preview?.candidates || [];
        const locked = String(
          response.preview
            ?.locked_delivery_person_id || "",
        );
        setSelectedPersonId((current) => {
          if (locked) return locked;
          if (
            current &&
            candidates.some(
              (candidate) =>
                candidate.delivery_person_id ===
                current,
            )
          ) {
            return current;
          }
          return candidates.length === 1
            ? candidates[0].delivery_person_id
            : "";
        });
      } catch (requestError) {
        if (!active) return;
        if (isAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              location.pathname,
            )}`,
          );
          return;
        }
        setError(
          errorMessage(
            requestError,
            "Unable to refresh delivery distances.",
          ),
        );
      } finally {
        if (active) setRefreshing(false);
      }
    }

    void refreshPreview();
    return () => {
      active = false;
    };
  }, [
    initialCsrfToken,
    initialDraftId,
    location.pathname,
    requestedBookingIds,
  ]);

  const preview = data?.preview;
  const candidates = preview?.candidates || [];
  const selectedBookings =
    preview?.selected_bookings || [];
  const lockedPersonId = String(
    preview?.locked_delivery_person_id || "",
  );

  async function createDraft() {
    if (
      !data?.csrf_token ||
      !preview?.requested_booking_ids?.length ||
      !selectedPersonId
    ) {
      setError(
        "Select an eligible delivery person.",
      );
      return;
    }

    setCreating(true);
    setError("");
    try {
      const response =
        await createMultipleBookingDraft(
          data.csrf_token,
          preview.requested_booking_ids,
          selectedPersonId,
          String(preview.draft_id || ""),
        );
      sessionStorage.removeItem(
        PREVIEW_STORAGE_KEY,
      );
      navigate(
        response.redirect_url ||
          `/delivery-dispatch/drafts/${response.draft?.id || ""}`,
      );
    } catch (requestError) {
      const status = number(
        (requestError as { status?: number })
          ?.status,
      );
      if (status === 401) {
        window.location.assign(
          `/react/login?next=${encodeURIComponent(
            location.pathname,
          )}`,
        );
        return;
      }
      if (
        (requestError as { code?: string })
          ?.code === "csrf_failed"
      ) {
        window.location.reload();
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the delivery booking.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="dispatch-page">
      <style>{PREVIEW_STYLES}</style>
      <div className="dispatch-page-container">
        <section className="dispatch-heading-react">
          <div>
            <span className="dispatch-eyebrow">
              Delivery comparison
            </span>
            <h1>
              Preview Selected Bookings
            </h1>
            <p>
              Confirm each subscription delivery date,
              compare the current route, and choose the
              nearest available delivery person.
            </p>
            <div className="dispatch-preview-refresh">
              <span className="pulse" />
              {refreshing
                ? "Recalculating current delivery distances…"
                : `Distances refreshed${
                    preview?.preview_generated_at
                      ? ` at ${new Date(
                          preview.preview_generated_at,
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""
                  }`}
            </div>
          </div>
          <Link
            className="dispatch-button secondary"
            to={
              data?.page_role === "admin"
                ? "/admin/delivery-dispatch"
                : "/seller-delivery-manager/delivery-dispatch"
            }
          >
            Change Selection
          </Link>
        </section>

        {error && (
          <div className="dispatch-notice error">
            {error}
          </div>
        )}

        {preview && (
          <>
            <section className="dispatch-preview-summary">
              <article>
                <strong>
                  {preview.booking_count || 0}
                </strong>
                <span>Seller bookings</span>
              </article>
              <article>
                <strong>
                  {preview.subscription_delivery_count ||
                    0}
                </strong>
                <span>Subscription days</span>
              </article>
              <article>
                <strong>
                  {preview.item_count || 0}
                </strong>
                <span>Total items</span>
              </article>
              <article>
                <strong>
                  {preview.pickup_count || 0}
                </strong>
                <span>Pickup sellers</span>
              </article>
              <article>
                <strong>
                  {preview.drop_count || 0}
                </strong>
                <span>Customer drops</span>
              </article>
            </section>

            <section className="dispatch-preview-fulfillment" aria-label="Product and delivery plan">
              <div>
                <span>Product Type</span>
                <strong>
                  {fulfillmentValues(preview, "product_types", "product_type").join(", ") || "Not recorded"}
                </strong>
              </div>
              <div>
                <span>Customer Selected Time</span>
                <strong>
                  {selectedDeliveryTimes(preview)
                    .map((value) => `✓ ${deliveryTimeLabel(value)}`).join(" · ")}
                </strong>
              </div>
              <div>
                <span>Delivery Speed</span>
                <strong>
                  {fulfillmentValues(preview, "delivery_types", "delivery_type")
                    .map(deliveryTypeLabel).join(", ") || "Not recorded"}
                </strong>
              </div>
              <div>
                <span>Estimated Delivery (IST)</span>
                <strong>
                  {deliveryWindows(preview)
                    .map(deliveryEstimateLabel).filter(Boolean).join(" · ") || "Schedule pending"}
                </strong>
              </div>
              <div>
                <span>Delivery Status</span>
                <strong>
                  {title(preview.delivery_status || "scheduled")}
                </strong>
              </div>
            </section>

            <section className="dispatch-preview-section">
              <h2>
                Orders and subscription dates
              </h2>
              <div className="dispatch-preview-bookings">
                {selectedBookings.map(
                  (booking, index) => {
                    const isSubscription =
                      Boolean(
                        booking.is_subscription_booking ||
                          booking.is_subscription_delivery,
                      );
                    return (
                      <article
                        className={`dispatch-preview-booking${
                          isSubscription
                            ? " subscription"
                            : ""
                        }`}
                      key={
                        booking.id ||
                        booking.booking_id ||
                        index
                      }
                    >
                      <div>
                        <strong>
                          {isSubscription
                            ? booking.subscription_item_name ||
                              "Subscription item"
                            : booking.booking_number ||
                              booking.parent_order_number ||
                              "Customer order"}
                        </strong>
                        <small>
                          {booking.business_name ||
                            booking.seller_name ||
                            "Seller"}{" "}
                          →{" "}
                          {booking.customer_name ||
                            "Customer"}
                        </small>
                      </div>
                      <div>
                        {isSubscription && (
                          <span className="dispatch-preview-date">
                            Day{" "}
                            {booking.subscription_delivery_sequence ||
                              "—"}{" "}
                            · {bookingDate(booking)}
                          </span>
                        )}
                        <small>
                          {booking.item_count || 0} item(s)
                          {booking.subscription_plan_code
                            ? ` · ${title(
                                booking.subscription_plan_code,
                              )}`
                            : ""}
                        </small>
                        <div className="dispatch-preview-booking-meta">
                          {fulfillmentValues(
                            booking,
                            "product_types",
                            "product_type",
                            preview,
                          ).map((value) => (
                            <span key={`product-${value}`}>Product: {value}</span>
                          ))}
                          {selectedDeliveryTimes(
                            booking,
                            preview,
                          ).map((value) => (
                            <span className="dispatch-selected-time" key={`selected-time-${value}`}>
                              Customer selected: ✓ {deliveryTimeLabel(value)}
                            </span>
                          ))}
                          {fulfillmentValues(
                            booking,
                            "delivery_types",
                            "delivery_type",
                            preview,
                          ).map((value) => (
                            <span key={`speed-${value}`}>Speed: {deliveryTypeLabel(value)}</span>
                          ))}
                          {deliveryWindows(booking, preview).map((window, windowIndex) => (
                            <span
                              className="dispatch-delivery-estimate"
                              key={`estimate-${window.start_at || window.date || windowIndex}`}
                            >
                              Estimated: {deliveryEstimateLabel(window)}
                            </span>
                          ))}
                          <span>
                            Delivery status: {title(booking.delivery_status || preview.delivery_status || "scheduled")}
                          </span>
                        </div>
                      </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            <section className="dispatch-preview-section">
              <h2>
                Nearest available delivery people
              </h2>
              {refreshing ? (
                <div className="dispatch-loading">
                  Refreshing route distances…
                </div>
              ) : (
                <div className="dispatch-preview-candidates">
                  {candidates.map((candidate) => {
                    const selected =
                      selectedPersonId ===
                      candidate.delivery_person_id;
                    const locked =
                      Boolean(lockedPersonId) &&
                      lockedPersonId !==
                        candidate.delivery_person_id;
                    return (
                      <label
                        className={`dispatch-candidate${
                          selected ? " selected" : ""
                        }`}
                        key={
                          candidate.delivery_person_id
                        }
                      >
                        <input
                          type="radio"
                          name="delivery_person_id"
                          value={
                            candidate.delivery_person_id
                          }
                          checked={selected}
                          disabled={locked}
                          onChange={() =>
                            setSelectedPersonId(
                              candidate.delivery_person_id,
                            )
                          }
                        />
                        <div>
                          <h3>
                            {candidate.delivery_person_name ||
                              "Delivery person"}
                          </h3>
                          <p>
                            {candidate.phone || "No phone"}
                            {" · "}
                            {candidate.vehicle_type ||
                              "Vehicle not set"}
                            {candidate.vehicle_number
                              ? ` (${candidate.vehicle_number})`
                              : ""}
                          </p>
                          <p>
                            Active{" "}
                            {candidate.active_order_count ||
                              0}
                            {" · "}
                            Available capacity{" "}
                            {candidate.available_capacity ||
                              0}
                          </p>
                          {(candidate.eligibility_warnings ||
                            []).map((warning) => (
                            <div
                              className="dispatch-warning"
                              key={warning}
                            >
                              {warning}
                            </div>
                          ))}
                        </div>
                        <div className="dispatch-route-metrics">
                          <span>
                            Pickup
                            <strong>
                              {number(
                                candidate.pickup_km,
                              ).toFixed(2)}{" "}
                              km
                            </strong>
                          </span>
                          <span>
                            Delivery
                            <strong>
                              {number(
                                candidate.delivery_km,
                              ).toFixed(2)}{" "}
                              km
                            </strong>
                          </span>
                          <span>
                            Total route
                            <strong>
                              {number(
                                candidate.combined_km,
                              ).toFixed(2)}{" "}
                              km
                            </strong>
                          </span>
                        </div>
                      </label>
                    );
                  })}
                  {!candidates.length && (
                    <div className="dispatch-empty">
                      No eligible delivery person is
                      currently available.
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="dispatch-preview-actions">
              <Link
                className="dispatch-button secondary"
                to={
                  data?.page_role === "admin"
                    ? "/admin/delivery-dispatch"
                    : "/seller-delivery-manager/delivery-dispatch"
                }
              >
                Back
              </Link>
              <button
                className="dispatch-button primary"
                type="button"
                disabled={
                  refreshing ||
                  creating ||
                  !selectedPersonId
                }
                onClick={() => void createDraft()}
              >
                {creating
                  ? "Creating Delivery Booking…"
                  : preview.draft_id
                    ? `Add to ${
                        preview.draft_number ||
                        "Delivery Booking"
                      }`
                    : "Create Delivery Booking"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
