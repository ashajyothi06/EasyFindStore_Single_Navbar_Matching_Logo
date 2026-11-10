import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  loadAdminDispatch,
  loadManagerDispatch,
  previewMultipleBookings,
  type DispatchPageResponse,
  type DispatchPageRole,
} from "../services/deliveryDispatchApi";
import "../styles/delivery-dispatch.css";

interface DeliveryDispatchPageProps {
  mode: "admin" | "manager";
}

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function readableDate(value: string): string {
  if (!value) return "Date unavailable";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const SUBSCRIPTION_ROW_STYLES = `
  .dispatch-table tr.subscription-booking-row{background:#f8fcf9}
  .subscription-booking-badge{display:inline-flex;margin-top:5px;padding:3px 7px;border-radius:999px;background:#e1f4e7;color:#17623a;font-size:.64rem;font-weight:900;letter-spacing:.03em;text-transform:uppercase}
  .subscription-day-picker{display:grid;gap:5px;min-width:190px;margin-top:7px}
  .subscription-day-picker select{width:100%;min-height:38px;padding:7px 9px;border:1px solid #bdd7c5;border-radius:9px;background:#fff;color:#153e27;font:inherit;font-size:.75rem;font-weight:750}
  .subscription-day-picker small{color:#63736a;line-height:1.35}
  .subscription-day-picker small.completed{color:#17723f;font-weight:850}
  .subscription-day-picker small.assigned{color:#956307;font-weight:850}
  .dispatch-fulfillment-filters{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr)) auto;gap:10px;align-items:end;margin:0 0 16px;padding:14px;border:1px solid #dfe9e2;border-radius:14px;background:#f8faf8}
  .dispatch-fulfillment-filters label{display:grid;gap:5px;color:#63736a;font-size:.72rem;font-weight:800}
  .dispatch-fulfillment-filters select{min-height:40px;padding:8px 10px;border:1px solid #cddbd1;border-radius:9px;background:#fff;color:#153e27;font:inherit}
  .dispatch-fulfillment-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
  .dispatch-fulfillment-meta span{padding:4px 7px;border-radius:999px;background:#edf6f0;color:#285b3e;font-size:.64rem;font-weight:800}
  .dispatch-fulfillment-meta .dispatch-selected-time{background:#dff3e5;color:#165f35;border:1px solid #a8d5b5}
  .dispatch-fulfillment-meta .dispatch-delivery-estimate{background:#fff7df;color:#735800;border:1px solid #ead38c}
  @media(max-width:900px){.dispatch-fulfillment-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:560px){.dispatch-fulfillment-filters{grid-template-columns:1fr}}
  @media(max-width:760px){.subscription-day-picker{min-width:160px}}
`;

interface FulfillmentSummary {
  product_types?: string[];
  delivery_time_slots?: string[];
  selected_delivery_time_slots?: string[];
  delivery_types?: string[];
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
}

interface DeliveryWindow {
  slot?: string;
  slot_key?: string;
  label?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  time_label?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;
}

interface SubscriptionDeliveryOption {
  id: string;
  selection_id: string;
  sequence: number;
  scheduled_date: string;
  status: string;
  delivery_assignment_status?: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  delivery_batch_id?: string;
  is_completed?: boolean;
  is_assigned?: boolean;
  available_for_selection?: boolean;
  draft?: {
    id?: string;
    draft_number?: string;
    delivery_person_name?: string;
  } | null;
}

type DispatchBookingRow = Record<string, any> & {
  booking_id?: string;
  id?: string;
  is_subscription_booking?: boolean;
  subscription_order_id?: string;
  subscription_item_name?: string;
  subscription_plan_code?: string;
  subscription_deliveries?: SubscriptionDeliveryOption[];
  default_selection_id?: string;
  product_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_type?: string;
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  fulfillment_summary?: FulfillmentSummary;
  items?: Array<Record<string, any>>;
};

function fulfillmentValues(
  row: DispatchBookingRow,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
): string[] {
  const values = [
    ...(row.fulfillment_summary?.[key] || []),
    String(row[directKey] || ""),
  ].map(String).map((value) => value.trim()).filter(Boolean);
  return [...new Map(values.map((value) => [value.toLowerCase(), value])).values()];
}

function deliveryTypesForRow(row: DispatchBookingRow): string[] {
  const direct = fulfillmentValues(
    row,
    "delivery_types",
    "delivery_type",
  ).map((value) => value.toLowerCase());

  const itemTypes = (row.items || [])
    .map((item) => String(item.delivery_type || "").trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...direct, ...itemTypes])];
}

function isInstantDelivery(row: DispatchBookingRow): boolean {
  return deliveryTypesForRow(row).includes("instant_delivery");
}

function instantDeliverySelectionLabel(row: DispatchBookingRow): string {
  const direct = String(
    row.selected_delivery_time_label ||
      row.fulfillment_summary?.selected_delivery_time_label ||
      "",
  ).trim();

  if (direct) return direct;

  const itemLabel = (row.items || [])
    .map((item) => String(item.selected_delivery_time_label || "").trim())
    .find(Boolean);

  return itemLabel || "10 min - 30 min";
}

function deliveryTimeLabel(value: string): string {
  return value === "both" ? "Morning & Evening" : label(value);
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

function concreteFallbackDeliveryTimes(values: unknown): string[] {
  const source = Array.isArray(values) ? values : [values];
  return concreteDeliveryTimes(
    source.filter(
      (value) => String(value || "").trim().toLowerCase() !== "both",
    ),
  );
}

function selectedDeliveryTimes(row: DispatchBookingRow): string[] {
  // Purchased-item/customer selections are authoritative. Generic
  // availability (`both`) is never presented as a customer selection.
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
  ];

  for (const source of sources) {
    const slots = concreteDeliveryTimes(source);
    if (slots.length) return slots;
  }

  const scheduled = concreteDeliveryTimes(
    deliveryWindows(row).map((window) => window.slot),
  );
  if (scheduled.length) return scheduled;

  const fallback = concreteFallbackDeliveryTimes([
    row.delivery_time_slot,
    ...(row.fulfillment_summary?.delivery_time_slots || []),
  ]);
  if (fallback.length) return fallback;

  return [];
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return label(value);
}

function formatEstimatedDate(value: unknown): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const dateOnly = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function formatEstimatedClock(value: unknown): string {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function formatConfiguredClock(value: unknown): string {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function deliveryWindows(row: DispatchBookingRow): DeliveryWindow[] {
  const direct = Array.isArray(row.promised_delivery_windows)
    ? row.promised_delivery_windows.filter(Boolean)
    : [];
  const itemWindows = (row.items || []).flatMap((item) =>
    Array.isArray(item.promised_delivery_windows)
      ? item.promised_delivery_windows.filter(Boolean)
      : [],
  );
  const windows = direct.length ? direct : itemWindows;
  if (windows.length) {
    const seen = new Set<string>();
    return windows.filter((window) => {
      const key = [
        window.slot || window.slot_key,
        window.date,
        window.start_at || window.start_time,
        window.end_at || window.end_time,
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const date = row.promised_delivery_date || row.fulfillment_summary?.promised_delivery_date;
  const timeLabel =
    row.promised_delivery_label ||
    row.promised_delivery_time_label ||
    row.fulfillment_summary?.promised_delivery_label ||
    row.fulfillment_summary?.promised_delivery_time_label;
  const startAt = row.promised_delivery_start_at || row.fulfillment_summary?.promised_delivery_start_at;
  const endAt = row.promised_delivery_end_at || row.fulfillment_summary?.promised_delivery_end_at;
  return date || timeLabel || startAt || endAt
    ? [{ date, time_label: timeLabel, start_at: startAt, end_at: endAt, timezone: row.delivery_schedule_timezone || "Asia/Kolkata" }]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatEstimatedDate(window.date || window.start_at);

  // For instant delivery, start_at/end_at are calculated from the actual
  // booking time (+10 minutes through +30 minutes). Prefer those exact
  // timestamps over a generic saved label.
  const exactStart = formatEstimatedClock(window.start_at);
  const exactEnd = formatEstimatedClock(window.end_at);
  const configuredStart = formatConfiguredClock(window.start_time);
  const configuredEnd = formatConfiguredClock(window.end_time);
  const savedLabel = String(window.time_label || "").trim();

  const time =
    exactStart || exactEnd
      ? exactStart && exactEnd
        ? `${exactStart} – ${exactEnd}`
        : exactStart || exactEnd
      : savedLabel ||
        (configuredStart && configuredEnd
          ? `${configuredStart} – ${configuredEnd}`
          : configuredStart || configuredEnd);

  const rawSlot = String(window.slot || window.slot_key || "").toLowerCase();
  const slot =
    rawSlot && rawSlot !== "instant" ? deliveryTimeLabel(rawSlot) : "";

  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function DeliveryDispatchPage({
  mode,
}: DeliveryDispatchPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const draftId = searchParams.get("draft_id") || "";

  const [data, setData] =
    useState<DispatchPageResponse | null>(null);
  const [
    subscriptionDaySelections,
    setSubscriptionDaySelections,
  ] =
    useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState("all");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("all");

  const pageRole: DispatchPageRole =
    mode === "admin" ? "admin" : "manager";

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response =
        mode === "admin"
          ? await loadAdminDispatch(draftId)
          : await loadManagerDispatch(draftId);

      setData(response);
      setSelectedIds([]);
      const initialDaySelections: Record<
        string,
        string
      > = {};
      for (const rawRow of response.booking_rows || []) {
        const row = rawRow as DispatchBookingRow;
        if (
          row.is_subscription_booking &&
          row.subscription_order_id
        ) {
          initialDaySelections[
            row.subscription_order_id
          ] = String(
            row.default_selection_id || "",
          );
        }
      }
      setSubscriptionDaySelections(
        initialDaySelections,
      );
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        window.location.assign(
          `/react/login?next=${encodeURIComponent(
            location.pathname + location.search,
          )}`,
        );
        return;
      }

      setError(
        errorMessage(
          requestError,
          "Unable to load delivery dispatch.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, draftId]);

  function bookingIdOf(
    rawRow: Record<string, unknown>,
  ): string {
    const row = rawRow as DispatchBookingRow;
    if (
      row.is_subscription_booking &&
      row.subscription_order_id
    ) {
      return (
        subscriptionDaySelections[
          row.subscription_order_id
        ] ||
        String(row.default_selection_id || "")
      );
    }
    return String(
      row.booking_id || row.id || "",
    );
  }

  function selectedSubscriptionDelivery(
    row: DispatchBookingRow,
  ): SubscriptionDeliveryOption | null {
    if (!row.is_subscription_booking) {
      return null;
    }
    const selectedId = bookingIdOf(row);
    return (
      (row.subscription_deliveries || []).find(
        (delivery) =>
          delivery.selection_id === selectedId,
      ) || null
    );
  }

  function rowIsAvailable(
    row: DispatchBookingRow,
  ): boolean {
    if (!row.is_subscription_booking) {
      return Boolean(
        row.available_for_selection,
      );
    }
    return Boolean(
      selectedSubscriptionDelivery(row)
        ?.available_for_selection,
    );
  }

  const allBookingRows = useMemo(
    () => (data?.booking_rows || []) as DispatchBookingRow[],
    [data?.booking_rows],
  );

  const productTypeOptions = useMemo(
    () => [...new Set(allBookingRows.flatMap((row) =>
      fulfillmentValues(row, "product_types", "product_type"),
    ))].sort((a, b) => a.localeCompare(b)),
    [allBookingRows],
  );

  const filteredBookingRows = useMemo(
    () => allBookingRows.filter((row) => {
      const productTypes = fulfillmentValues(row, "product_types", "product_type");
      const deliveryTimes = selectedDeliveryTimes(row);
      const deliveryTypes = deliveryTypesForRow(row);
      const productMatches = productTypeFilter === "all" || productTypes.some(
        (value) => value.toLowerCase() === productTypeFilter.toLowerCase(),
      );
      const timeMatches = deliveryTimeFilter === "all" || (
        deliveryTimeFilter === "both"
          ? deliveryTimes.includes("morning") && deliveryTimes.includes("evening")
          : deliveryTimes.includes(deliveryTimeFilter)
      );
      const typeMatches = deliveryTypeFilter === "all" || deliveryTypes.includes(deliveryTypeFilter);
      return productMatches && timeMatches && typeMatches;
    }),
    [allBookingRows, deliveryTimeFilter, deliveryTypeFilter, productTypeFilter],
  );

  const availableSelectionIds = useMemo(
    () =>
      filteredBookingRows
        .map((rawRow) => {
          const row =
            rawRow as DispatchBookingRow;
          return rowIsAvailable(row)
            ? bookingIdOf(row)
            : "";
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filteredBookingRows,
      subscriptionDaySelections,
    ],
  );

  function toggleBooking(
    bookingId: string,
    selected: boolean,
  ) {
    setSelectedIds((current) => {
      if (selected) {
        return current.includes(bookingId)
          ? current
          : [...current, bookingId];
      }

      return current.filter(
        (value) => value !== bookingId,
      );
    });
  }

  function toggleAll(selected: boolean) {
    setSelectedIds(
      selected
        ? availableSelectionIds
        : [],
    );
  }

  function changeSubscriptionDay(
    row: DispatchBookingRow,
    nextSelectionId: string,
  ) {
    const orderId = String(
      row.subscription_order_id || "",
    );
    const previousSelectionId = bookingIdOf(row);
    setSubscriptionDaySelections((current) => ({
      ...current,
      [orderId]: nextSelectionId,
    }));
    setSelectedIds((current) => {
      if (!current.includes(previousSelectionId)) {
        return current;
      }
      const nextDelivery = (
        row.subscription_deliveries || []
      ).find(
        (delivery) =>
          delivery.selection_id ===
          nextSelectionId,
      );
      if (
        !nextDelivery?.available_for_selection
      ) {
        return current.filter(
          (value) =>
            value !== previousSelectionId,
        );
      }
      return current.map((value) =>
        value === previousSelectionId
          ? nextSelectionId
          : value,
      );
    });
  }

  async function preview(event: FormEvent) {
    event.preventDefault();

    if (!selectedIds.length || !data?.csrf_token) {
      setError(
        "Select at least one available seller booking.",
      );
      return;
    }

    setPreviewing(true);
    setError("");

    try {
      const response = await previewMultipleBookings(
        data.csrf_token,
        selectedIds,
        draftId,
      );

      sessionStorage.setItem(
        "deliveryDispatchPreview",
        JSON.stringify(response),
      );

      navigate("/delivery-dispatch/preview", {
        state: response,
      });
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to compare delivery people.",
        ),
      );
    } finally {
      setPreviewing(false);
    }
  }

  const summary = data?.summary || {};
  const allSelected =
    availableSelectionIds.length > 0 &&
    availableSelectionIds.every((value) =>
      selectedIds.includes(value),
    );

  return (
    <main className="dispatch-page">
      <style>{SUBSCRIPTION_ROW_STYLES}</style>
      <div className="dispatch-page-container">
      <section className="dispatch-heading-react">
        <div>
          <span className="dispatch-eyebrow">
            {mode === "admin"
              ? "Administrator"
              : "Seller Delivery Manager"}
          </span>
          <h1>
            Assign Multiple Bookings to a Delivery Person
          </h1>
          <p>
            Select normal orders or a subscription delivery
            day, compare the complete pickup-and-delivery
            route, choose one nearby delivery person, and
            build the same delivery booking.
          </p>
        </div>

        <Link
          className="dispatch-button secondary"
          to={mode === "admin" ? "/admin" : "/dashboard"}
        >
          Back to Dashboard
        </Link>
      </section>

      <section className="dispatch-stat-grid-react">
        <article>
          <strong>
            {summary.ready_booking_count || 0}
          </strong>
          <span>Bookings / subscription days ready</span>
        </article>
        <article>
          <strong>
            {summary.ready_order_count || 0}
          </strong>
          <span>Customer orders ready</span>
        </article>
        <article>
          <strong>
            {summary.eligible_delivery_people || 0}
          </strong>
          <span>Eligible delivery people</span>
        </article>
        <article>
          <strong>
            {summary.open_draft_count || 0}
          </strong>
          <span>Open drafts</span>
        </article>
        <article>
          <strong>
            {summary.active_batches || 0}
          </strong>
          <span>Active batches</span>
        </article>
        <article>
          <strong>
            {data?.currency_symbol || "₹"}
            {Number(
              summary.pending_payout_amount || 0,
            ).toFixed(2)}
          </strong>
          <span>Pending payout</span>
        </article>
      </section>

      {error && (
        <div className="dispatch-notice error">
          {error}
        </div>
      )}

      {data?.selected_draft && (
        <section className="dispatch-current-draft">
          <div>
            <span className="dispatch-eyebrow">
              Adding to current draft
            </span>
            <h2>
              {data.selected_draft.draft_number} ·{" "}
              {data.selected_draft.delivery_person_name}
            </h2>
            <p>
              The delivery person remains locked while you
              add more seller bookings to the route.
            </p>
          </div>

          <Link
            className="dispatch-button primary"
            to={`/delivery-dispatch/drafts/${data.selected_draft.id}`}
          >
            Open Current Draft
          </Link>
        </section>
      )}

      {(data?.open_drafts || []).length > 0 && (
        <section className="dispatch-card">
          <h2>Open Delivery Booking Drafts</h2>

          <div className="dispatch-draft-list">
            {(data?.open_drafts || []).map((draft) => (
              <article
                key={draft.id}
                className={
                  draft.id === data?.selected_draft?.id
                    ? "selected"
                    : ""
                }
              >
                <div>
                  <strong>{draft.draft_number}</strong>
                  <small>
                    {draft.delivery_person_name} ·{" "}
                    {draft.seller_booking_count || 0} seller
                    booking(s) · {draft.order_count || 0} order(s)
                  </small>
                </div>

                <div>
                  <strong>
                    {Number(draft.combined_km || 0).toFixed(
                      2,
                    )}{" "}
                    km
                  </strong>
                  <small>Combined route</small>
                </div>

                <button
                  className="dispatch-button secondary small"
                  type="button"
                  onClick={() => {
                    setSearchParams({
                      draft_id: draft.id,
                    });
                  }}
                >
                  Select Draft
                </button>

                <Link
                  className="dispatch-button primary small"
                  to={`/delivery-dispatch/drafts/${draft.id}`}
                >
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <form
        className="dispatch-card"
        onSubmit={preview}
      >
        <div className="dispatch-section-heading-react">
          <div>
            <span>1</span>
            <div>
              <h2>Select Seller Bookings</h2>
              <p>
                Selecting one booking from a split customer
                order automatically includes the other ready
                seller bookings for that order. For a
                subscription, choose the required delivery day
                before comparing nearby delivery people.
              </p>
            </div>
          </div>

          <label className="dispatch-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) =>
                toggleAll(event.target.checked)
              }
            />
            Select all available
          </label>
        </div>

        <div className="dispatch-fulfillment-filters">
          <label>
            Product Type
            <select
              value={productTypeFilter}
              onChange={(event) =>
                setProductTypeFilter(event.target.value)
              }
            >
              <option value="all">All Product Types</option>
              {productTypeOptions.map((productType) => (
                <option key={productType} value={productType}>
                  {productType}
                </option>
              ))}
            </select>
          </label>

          <label>
            Customer Selected Time
            <select
              value={deliveryTimeFilter}
              onChange={(event) =>
                setDeliveryTimeFilter(event.target.value)
              }
            >
              <option value="all">All Times</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="both">Morning &amp; Evening</option>
            </select>
          </label>

          <label>
            Delivery Speed
            <select
              value={deliveryTypeFilter}
              onChange={(event) =>
                setDeliveryTypeFilter(event.target.value)
              }
            >
              <option value="all">All Delivery Speeds</option>
              <option value="instant_delivery">Instant Delivery</option>
              <option value="one_day_delivery">One-Day Delivery</option>
            </select>
          </label>

          <button
            className="dispatch-button secondary small"
            type="button"
            onClick={() => {
              setProductTypeFilter("all");
              setDeliveryTimeFilter("all");
              setDeliveryTypeFilter("all");
            }}
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="dispatch-loading">
            Loading dispatch bookings…
          </div>
        ) : (
          <div className="dispatch-table-wrap">
            <table className="dispatch-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Seller Booking</th>
                  <th>Customer Order</th>
                  <th>Pickup Seller</th>
                  <th>Customer</th>
                  <th>Units</th>
                  <th>Nearby People</th>
                  <th>Nearest Estimate</th>
                  <th>Current State</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookingRows.map((rawBooking) => {
                  const booking =
                    rawBooking as DispatchBookingRow;
                  const bookingId =
                    bookingIdOf(booking);
                  const subscriptionDelivery =
                    selectedSubscriptionDelivery(
                      booking,
                    );
                  const available =
                    rowIsAvailable(booking);
                  const instantDelivery = isInstantDelivery(booking);
                  const selectedTimes = selectedDeliveryTimes(booking);
                  const selectedTimeLabel = instantDelivery
                    ? instantDeliverySelectionLabel(booking)
                    : "";
                  const bookingDeliveryWindows = deliveryWindows(booking);
                  const stableRowKey = String(
                    booking.booking_id ||
                      booking.id ||
                      bookingId,
                  );

                  return (
                    <tr
                      key={stableRowKey}
                      className={
                        booking.is_subscription_booking
                          ? "subscription-booking-row"
                          : ""
                      }
                    >
                      <td>
                        {available ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              bookingId,
                            )}
                            onChange={(event) =>
                              toggleBooking(
                                bookingId,
                                event.target.checked,
                              )
                            }
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <strong>
                          {booking.booking_number}
                        </strong>
                        <small>
                          {label(booking.status)}
                        </small>
                        <div className="dispatch-fulfillment-meta">
                          {fulfillmentValues(
                            booking,
                            "product_types",
                            "product_type",
                          ).map((value) => (
                            <span key={`product-${value}`}>
                              Product: {value}
                            </span>
                          ))}
                          {instantDelivery ? (
                            <span
                              className="dispatch-selected-time"
                              key="selected-time-instant"
                            >
                              Customer selected: {selectedTimeLabel}
                            </span>
                          ) : (
                            selectedTimes.map((value) => (
                              <span
                                className="dispatch-selected-time"
                                key={`selected-time-${value}`}
                              >
                                Customer selected: ✓ {deliveryTimeLabel(value)}
                              </span>
                            ))
                          )}
                          {deliveryTypesForRow(booking).map((value) => (
                            <span key={`speed-${value}`}>
                              Speed: {deliveryTypeLabel(value)}
                            </span>
                          ))}
                          {bookingDeliveryWindows.map((window, index) => (
                            <span
                              className="dispatch-delivery-estimate"
                              key={`estimate-${window.start_at || window.date || index}`}
                            >
                              {instantDelivery ? "Promised" : "Estimated"}:{" "}
                              {deliveryEstimateLabel(window)}
                            </span>
                          ))}
                          <span>
                            Delivery status: {label(booking.delivery_status || "scheduled")}
                          </span>
                        </div>
                        {booking.is_subscription_booking ? (
                          <>
                            <span className="subscription-booking-badge">
                              Subscription
                            </span>
                            <label className="subscription-day-picker">
                              <select
                                aria-label="Select subscription delivery day"
                                value={bookingId}
                                onChange={(event) =>
                                  changeSubscriptionDay(
                                    booking,
                                    event.target.value,
                                  )
                                }
                              >
                                {(
                                  booking.subscription_deliveries ||
                                  []
                                ).map((delivery) => (
                                  <option
                                    key={delivery.id}
                                    value={
                                      delivery.selection_id
                                    }
                                  >
                                    Day {delivery.sequence} ·{" "}
                                    {readableDate(
                                      delivery.scheduled_date,
                                    )}{" "}
                                    · {label(
                                      delivery
                                        .delivery_assignment_status ||
                                        delivery.status,
                                    )}
                                  </option>
                                ))}
                              </select>
                              <small
                                className={
                                  subscriptionDelivery?.is_completed
                                    ? "completed"
                                    : subscriptionDelivery?.is_assigned
                                      ? "assigned"
                                      : ""
                                }
                              >
                                {subscriptionDelivery?.is_completed
                                  ? `Day ${subscriptionDelivery.sequence} completed`
                                  : subscriptionDelivery?.draft
                                    ? `Day ${subscriptionDelivery.sequence} is in ${subscriptionDelivery.draft.draft_number || "a draft"}`
                                    : subscriptionDelivery?.is_assigned
                                      ? `Assigned to ${subscriptionDelivery.delivery_person_name || "a delivery person"}`
                                      : `Selected: Day ${subscriptionDelivery?.sequence || "—"} for ${readableDate(subscriptionDelivery?.scheduled_date || "")}`}
                              </small>
                            </label>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <strong>
                          {booking.parent_order_number}
                        </strong>
                        {booking.is_subscription_booking ? (
                          <small>
                            {booking.subscription_item_name ||
                              "Subscription item"}
                            {booking.subscription_plan_code
                              ? ` · ${label(
                                  booking.subscription_plan_code,
                                )}`
                              : ""}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <strong>
                          {booking.business_name ||
                            booking.seller_name ||
                            "Seller"}
                        </strong>
                        <small>
                          {Number(
                            booking.distance_km || 0,
                          ).toFixed(2)}{" "}
                          km
                        </small>
                      </td>
                      <td>
                        <strong>
                          {booking.customer_name ||
                            "Customer"}
                        </strong>
                        <small>
                          {booking.delivery_address?.city ||
                            ""}
                        </small>
                      </td>
                      <td>
                        {booking.item_count || 0}
                      </td>
                      <td>
                        {booking.candidate_count || 0}
                      </td>
                      <td>
                        {booking.nearest_candidate ? (
                          <>
                            <strong>
                              {
                                booking.nearest_candidate
                                  .delivery_person_name
                              }
                            </strong>
                            <small>
                              Pickup{" "}
                              {Number(
                                booking.nearest_candidate
                                  .pickup_km || 0,
                              ).toFixed(2)}{" "}
                              km · Delivery{" "}
                              {Number(
                                booking.nearest_candidate
                                  .delivery_km || 0,
                              ).toFixed(2)}{" "}
                              km
                            </small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {subscriptionDelivery?.is_completed ? (
                          <span className="dispatch-status completed">
                            Day {subscriptionDelivery.sequence} Completed
                          </span>
                        ) : subscriptionDelivery?.draft ? (
                          <span className="dispatch-status collecting">
                            Day {subscriptionDelivery.sequence} In Draft
                          </span>
                        ) : subscriptionDelivery?.is_assigned ? (
                          <span className="dispatch-status assigned">
                            Day {subscriptionDelivery.sequence} Assigned
                          </span>
                        ) : booking.assigned ? (
                          <span className="dispatch-status assigned">
                            Assigned
                          </span>
                        ) : booking.draft ? (
                          <span className="dispatch-status collecting">
                            In Draft
                          </span>
                        ) : available ? (
                          <span className="dispatch-status accepted">
                            {subscriptionDelivery
                              ? `Day ${subscriptionDelivery.sequence} Available`
                              : "Available"}
                          </span>
                        ) : (
                          <span className="dispatch-status cancelled">
                            Not Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filteredBookingRows.length && (
                  <tr>
                    <td colSpan={9}>
                      {allBookingRows.length
                        ? "No accepted seller bookings match these delivery filters."
                        : "No accepted seller bookings are currently available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="dispatch-selection-footer">
          <strong>
            {selectedIds.length} booking(s) selected
          </strong>

          <button
            className="dispatch-button primary"
            type="submit"
            disabled={
              previewing || selectedIds.length === 0
            }
          >
            {previewing
              ? "Comparing…"
              : "Compare Delivery People"}
          </button>
        </div>
      </form>

      <section className="dispatch-card">
        <h2>Finalized Delivery Batches</h2>

        <div className="dispatch-batch-list">
          {(data?.batches || []).map((batch) => (
            <article key={batch.id}>
              <div>
                <strong>{batch.batch_number}</strong>
                <small>
                  {batch.delivery_person_name} ·{" "}
                  {batch.booking_count || 0} seller booking(s)
                  · {batch.order_count || 0} order(s)
                </small>
              </div>

              <span
                className={`dispatch-status ${batch.status}`}
              >
                {label(batch.status)}
              </span>

              <div>
                <strong>
                  {Number(
                    batch.estimated_route_km || 0,
                  ).toFixed(2)}{" "}
                  km
                </strong>
                <small>Combined route</small>
              </div>

              <div>
                <strong>
                  {data?.currency_symbol || "₹"}
                  {Number(
                    batch.payout_amount || 0,
                  ).toFixed(2)}
                </strong>
                <small>Delivery payout</small>
              </div>

              <Link
                className="dispatch-button secondary small"
                to={
                  pageRole === "admin"
                    ? `/admin/delivery-dispatch/batches/${batch.id}`
                    : `/seller-delivery-manager/delivery-dispatch/batches/${batch.id}`
                }
              >
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}

export function AdminDeliveryDispatchPage() {
  return <DeliveryDispatchPage mode="admin" />;
}

export function SellerDeliveryManagerDispatchPage() {
  return <DeliveryDispatchPage mode="manager" />;
}
