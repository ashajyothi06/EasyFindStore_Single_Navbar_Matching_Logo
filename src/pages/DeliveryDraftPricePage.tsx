import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  errorMessage,
  finalizeDeliveryDraft,
  isAuthenticationError,
  isCsrfError,
  loadDeliveryDraftPrice,
  type DraftResponse,
} from "../services/deliveryDispatchApi";
import "../styles/delivery-dispatch.css";

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
  promised_delivery_windows?: DeliveryWindow[];
  delivery_status?: string;
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
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  fulfillment_summary?: FulfillmentSummary;
}

type DeliveryOrderMetric = Record<string, any> & FulfillmentRecord;
type DeliveryDraft = NonNullable<DraftResponse["draft"]> & FulfillmentRecord & {
  per_order_metrics?: DeliveryOrderMetric[];
};

const FULFILLMENT_STYLES = `
  .dispatch-fulfillment-panel{margin:18px 0;padding:16px;border:1px solid #dfe9e2;border-radius:16px;background:#fff}
  .dispatch-fulfillment-panel h2{margin:0 0 12px;color:#153e27;font-size:1rem}
  .dispatch-fulfillment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin:0}
  .dispatch-fulfillment-grid div{padding:12px;border-radius:11px;background:#f1f7f3}
  .dispatch-fulfillment-grid dt{color:#68766d;font-size:.68rem;font-weight:850;text-transform:uppercase}
  .dispatch-fulfillment-grid dd{margin:4px 0 0;color:#153e27;font-weight:900}
  .dispatch-order-fulfillment{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:7px}
  .dispatch-order-fulfillment span{padding:4px 7px;border-radius:999px;background:#edf6f0;color:#285b3e;font-size:.63rem;font-weight:800}
  .dispatch-order-fulfillment .dispatch-selected-time{background:#dff3e5;color:#165f35;border:1px solid #a8d5b5}
  .dispatch-order-fulfillment .dispatch-estimate{background:#fff7df;color:#735800;border:1px solid #ead38c}
  @media(max-width:650px){.dispatch-fulfillment-grid{grid-template-columns:1fr}}
`;

function values(
  row: FulfillmentRecord,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
): string[] {
  const entries = [
    ...(row.fulfillment_summary?.[key] || []),
    String(row[directKey] || ""),
  ].map(String).map((value) => value.trim()).filter(Boolean);
  const unique = [...new Map(entries.map((value) => [value.toLowerCase(), value])).values()];
  if (unique.length) return unique;
  return [];
}

function deliveryTypesForRecord(row: FulfillmentRecord): string[] {
  const direct = values(
    row,
    "delivery_types",
    "delivery_type",
  ).map((value) => value.toLowerCase());

  const itemTypes = (row.items || [])
    .map((item) => String(item.delivery_type || "").trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...direct, ...itemTypes])];
}

function isInstantDelivery(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): boolean {
  if (deliveryTypesForRecord(row).includes("instant_delivery")) {
    return true;
  }

  return fallback
    ? deliveryTypesForRecord(fallback).includes("instant_delivery")
    : false;
}

function instantDeliverySelectionLabel(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): string {
  const direct = String(
    row.selected_delivery_time_label ||
      row.fulfillment_summary?.selected_delivery_time_label ||
      "",
  ).trim();

  if (direct) return direct;

  const itemLabel = (row.items || [])
    .map((item) => String(item.selected_delivery_time_label || "").trim())
    .find(Boolean);

  if (itemLabel) return itemLabel;

  if (fallback) {
    const fallbackLabel = String(
      fallback.selected_delivery_time_label ||
        fallback.fulfillment_summary?.selected_delivery_time_label ||
        "",
    ).trim();

    if (fallbackLabel) return fallbackLabel;
  }

  return "10 min - 30 min";
}

function deliveryTimeLabel(value: string): string {
  return value === "both"
    ? "Morning & Evening"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function selectedDeliveryTimes(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): string[] {
  const sources: unknown[] = [
    (row.items || []).flatMap((item) =>
      concreteDeliveryTimes(
        item.customer_selected_delivery_time_slots ||
          item.selected_delivery_time_slots ||
          item.selected_delivery_time_slot,
      ),
    ),
    row.customer_selected_delivery_time_slots,
    row.selected_delivery_time_slots,
    row.fulfillment_summary?.selected_delivery_time_slots,
    row.selected_delivery_time_slot,
  ];
  for (const source of sources) {
    const selected = concreteDeliveryTimes(source);
    if (selected.length) return selected;
  }

  const scheduled = deliveryWindows(row).flatMap((window) =>
    concreteDeliveryTimes(window.slot),
  );
  if (scheduled.length) return [...new Set(scheduled)];

  if (fallback) {
    const fallbackSources: unknown[] = [
      fallback.customer_selected_delivery_time_slots,
      fallback.selected_delivery_time_slots,
      fallback.fulfillment_summary?.selected_delivery_time_slots,
      fallback.selected_delivery_time_slot,
    ];
    for (const source of fallbackSources) {
      const selected = concreteDeliveryTimes(source);
      if (selected.length) return selected;
    }
  }

  return concreteFallbackDeliveryTimes(
    values(row, "delivery_time_slots", "delivery_time_slot"),
  );
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDeliveryDate(value: unknown): string {
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

function formatDeliveryClock(value: unknown): string {
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

function deliveryWindows(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): DeliveryWindow[] {
  const direct = Array.isArray(row.promised_delivery_windows)
    ? row.promised_delivery_windows.filter(Boolean)
    : [];
  const itemWindows = (row.items || []).flatMap((item) =>
    Array.isArray(item.promised_delivery_windows)
      ? item.promised_delivery_windows.filter(Boolean)
      : [],
  );
  if (direct.length || itemWindows.length) {
    const seen = new Set<string>();
    return [...direct, ...itemWindows].filter((window) => {
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
  const source =
    row.promised_delivery_date ||
    row.promised_delivery_label ||
    row.promised_delivery_time_label ||
    row.promised_delivery_start_at ||
    row.promised_delivery_end_at
      ? row
      : fallback;
  const summary = source?.fulfillment_summary;
  const date = source?.promised_delivery_date || summary?.promised_delivery_date;
  const savedLabel =
    source?.promised_delivery_label ||
    source?.promised_delivery_time_label ||
    summary?.promised_delivery_label ||
    summary?.promised_delivery_time_label;
  const start = source?.promised_delivery_start_at || summary?.promised_delivery_start_at;
  const end = source?.promised_delivery_end_at || summary?.promised_delivery_end_at;
  return date || savedLabel || start || end
    ? [
        {
          date,
          time_label: savedLabel,
          start_at: start,
          end_at: end,
          timezone: source?.delivery_schedule_timezone || "Asia/Kolkata",
        },
      ]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatDeliveryDate(window.date || window.start_at);

  // Instant delivery promises are calculated from the actual order booking
  // timestamp (+10 minutes through +30 minutes). Prefer the exact timestamps
  // whenever they are present.
  const exactStart = formatDeliveryClock(window.start_at);
  const exactEnd = formatDeliveryClock(window.end_at);
  const configuredStart = formatConfiguredClock(window.start_time);
  const configuredEnd = formatConfiguredClock(window.end_time);
  const saved = String(window.time_label || "").trim();

  const time =
    exactStart || exactEnd
      ? exactStart && exactEnd
        ? `${exactStart} – ${exactEnd}`
        : exactStart || exactEnd
      : saved ||
        (configuredStart && configuredEnd
          ? `${configuredStart} – ${configuredEnd}`
          : configuredStart || configuredEnd);

  const rawSlot = String(window.slot || window.slot_key || "").toLowerCase();
  const slot =
    rawSlot && rawSlot !== "instant" ? deliveryTimeLabel(rawSlot) : "";

  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function DeliveryDraftPricePage() {
  const { draftId = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] =
    useState<DraftResponse | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeliveryDraftPrice(draftId)
      .then(setData)
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              `/delivery-dispatch/drafts/${draftId}/price`,
            )}`,
          );
          return;
        }

        setError(
          errorMessage(
            requestError,
            "Unable to load final delivery price.",
          ),
        );
      });
  }, [draftId]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!data?.csrf_token) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await finalizeDeliveryDraft(
        draftId,
        data.csrf_token,
        Number(amount),
        note,
      );

      if (response.redirect_url) {
        navigate(response.redirect_url);
      } else if (response.finalized_batch_id) {
        navigate(
          `/admin/delivery-dispatch/batches/${response.finalized_batch_id}`,
        );
      }
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setError(
        errorMessage(
          requestError,
          "Unable to finalize the delivery booking.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!data?.draft) {
    return (
      <main className="dispatch-page">
        <div className="dispatch-loading">
          {error || "Loading final delivery price…"}
        </div>
      </main>
    );
  }

  const draft = data.draft as DeliveryDraft;
  const instantDraft = isInstantDelivery(draft);
  const draftSelectedLabel = instantDraft
    ? instantDeliverySelectionLabel(draft)
    : "";
  const draftDeliveryWindows = deliveryWindows(draft);

  return (
    <main className="dispatch-page">
      <style>{FULFILLMENT_STYLES}</style>
      <section className="dispatch-heading-react">
        <div>
          <span className="dispatch-eyebrow">
            Final delivery price
          </span>
          <h1>{draft.draft_number}</h1>
          <p>
            Review the complete route for{" "}
            <strong>
              {draft.delivery_person_name}
            </strong>{" "}
            and confirm the final payout.
          </p>
        </div>

        <Link
          className="dispatch-button secondary"
          to={`/delivery-dispatch/drafts/${draft.id}`}
        >
          Back to Booking
        </Link>
      </section>

      <section className="dispatch-stat-grid-react">
        <article>
          <strong>{draft.order_count || 0}</strong>
          <span>Customer orders</span>
        </article>
        <article>
          <strong>{draft.pickup_count || 0}</strong>
          <span>Seller pickups</span>
        </article>
        <article>
          <strong>{draft.drop_count || 0}</strong>
          <span>Customer drops</span>
        </article>
        <article>
          <strong>
            {Number(draft.pickup_km || 0).toFixed(2)} km
          </strong>
          <span>Pickup distance</span>
        </article>
        <article>
          <strong>
            {Number(draft.delivery_km || 0).toFixed(2)} km
          </strong>
          <span>Delivery distance</span>
        </article>
        <article>
          <strong>
            {Number(draft.combined_km || 0).toFixed(2)} km
          </strong>
          <span>Combined distance</span>
        </article>
      </section>

      <section className="dispatch-fulfillment-panel">
        <h2>Product and Delivery Plan</h2>
        <dl className="dispatch-fulfillment-grid">
          <div>
            <dt>Product Type</dt>
            <dd>{values(draft, "product_types", "product_type").join(", ") || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Customer Selected Time</dt>
            <dd>
              {instantDraft
                ? draftSelectedLabel
                : selectedDeliveryTimes(draft)
                    .map((value) => `✓ ${deliveryTimeLabel(value)}`)
                    .join(" · ") || "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>Delivery Speed</dt>
            <dd>
              {deliveryTypesForRecord(draft)
                .map(deliveryTypeLabel)
                .join(", ") || "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>
              {instantDraft ? "Promised Delivery (IST)" : "Estimated Delivery (IST)"}
            </dt>
            <dd>
              {draftDeliveryWindows
                .map(deliveryEstimateLabel)
                .filter(Boolean)
                .join(" · ") || "Schedule pending"}
            </dd>
          </div>
          <div>
            <dt>Delivery Status</dt>
            <dd>{deliveryTimeLabel(String(draft.delivery_status || "scheduled"))}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <div className="dispatch-notice error">
          {error}
        </div>
      )}

      <div className="dispatch-detail-layout-react">
        <main className="dispatch-card">
          <h2>Final Booking Review</h2>

          <div className="dispatch-draft-orders">
            {(draft.per_order_metrics || []).map(
              (order) => {
                const instantOrder = isInstantDelivery(order, draft);
                const orderSelectedLabel = instantOrder
                  ? instantDeliverySelectionLabel(order, draft)
                  : "";
                const orderDeliveryWindows = deliveryWindows(order, draft);

                return (
                <article key={String(order.order_id)}>
                  <div>
                    <strong>
                      {order.order_number}
                    </strong>
                    <small>
                      {order.customer_name}
                    </small>
                    <div className="dispatch-order-fulfillment">
                      {values(order, "product_types", "product_type").map((value) => (
                        <span key={`product-${value}`}>Product: {value}</span>
                      ))}
                      {instantOrder ? (
                        <span
                          className="dispatch-selected-time"
                          key="selected-time-instant"
                        >
                          Customer selected: {orderSelectedLabel}
                        </span>
                      ) : (
                        selectedDeliveryTimes(order, draft).map((value) => (
                          <span
                            className="dispatch-selected-time"
                            key={`selected-time-${value}`}
                          >
                            Customer selected: ✓ {deliveryTimeLabel(value)}
                          </span>
                        ))
                      )}
                      {deliveryTypesForRecord(order).map((value) => (
                        <span key={`speed-${value}`}>
                          Speed: {deliveryTypeLabel(value)}
                        </span>
                      ))}
                      {orderDeliveryWindows.map((window, index) => (
                        <span
                          className="dispatch-estimate"
                          key={`estimate-${window.start_at || window.date || index}`}
                        >
                          {instantOrder ? "Promised" : "Estimated"}:{" "}
                          {deliveryEstimateLabel(window)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span>Pickup Km</span>
                    <strong>
                      {Number(
                        order.pickup_km || 0,
                      ).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span>Delivery Km</span>
                    <strong>
                      {Number(
                        order.delivery_km || 0,
                      ).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span>Combined Km</span>
                    <strong>
                      {Number(
                        order.combined_km || 0,
                      ).toFixed(2)}
                    </strong>
                  </div>
                </article>
                );
              },
            )}
          </div>
        </main>

        <aside className="dispatch-card dispatch-sticky">
          <h2>Decide Final Delivery Amount</h2>
          <p className="dispatch-muted">
            This amount becomes the delivery-person payout
            for the finalized route.
          </p>

          <form onSubmit={submit}>
            <label>
              Final delivery amount
              <div className="dispatch-money-input">
                <span>
                  {data.currency_symbol || "₹"}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  required
                  autoFocus
                />
              </div>
            </label>

            <label>
              Final payout note
              <textarea
                rows={4}
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="Route complexity, waiting time, cold-storage handling..."
              />
            </label>

            <div className="dispatch-terms">
              <strong>Finalization</strong>
              <p>
                Finalizing creates the actual batch,
                assigns every selected order, and prevents
                duplicate delivery assignment.
              </p>
            </div>

            <button
              className="dispatch-button primary full"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Finalizing…"
                : "Confirm Price and Finalize"}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
