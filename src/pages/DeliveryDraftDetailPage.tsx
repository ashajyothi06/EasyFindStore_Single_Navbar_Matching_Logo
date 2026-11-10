import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  cancelDeliveryDraft,
  errorMessage,
  isAuthenticationError,
  isCsrfError,
  loadDeliveryDraft,
  removeOrderFromDeliveryDraft,
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
  if (deliveryTypesForRecord(row).includes("instant_delivery")) return true;
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

  // Instant delivery uses exact promised timestamps calculated from the
  // order booking time (+10 minutes through +30 minutes). Prefer these exact
  // timestamps over a generic saved "10 min - 30 min" label.
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

export function DeliveryDraftDetailPage() {
  const { draftId = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] =
    useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);

    try {
      setData(await loadDeliveryDraft(draftId));
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign(
          `/react/login?next=${encodeURIComponent(
            `/delivery-dispatch/drafts/${draftId}`,
          )}`,
        );
        return;
      }

      setNotice(
        errorMessage(
          error,
          "Unable to load the delivery draft.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function dispatchUrl() {
    return data?.page_role === "manager"
      ? "/seller-delivery-manager/delivery-dispatch"
      : "/admin/delivery-dispatch";
  }

  async function removeOrder(orderId: string) {
    if (
      !data?.csrf_token ||
      !window.confirm(
        "Remove this order from the delivery booking?",
      )
    ) {
      return;
    }

    setWorking(orderId);

    try {
      const response =
        await removeOrderFromDeliveryDraft(
          draftId,
          data.csrf_token,
          orderId,
        );

      setData((current) => ({
        ...current,
        ...response,
      }));
      setNotice(
        response.message || "Order removed.",
      );
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      setNotice(
        errorMessage(
          error,
          "Unable to remove the order.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function cancelDraft() {
    if (
      !data?.csrf_token ||
      !window.confirm(
        "Cancel this delivery booking draft?",
      )
    ) {
      return;
    }

    setWorking("cancel");

    try {
      const response = await cancelDeliveryDraft(
        draftId,
        data.csrf_token,
      );

      setNotice(
        response.message || "Draft cancelled.",
      );
      navigate(dispatchUrl());
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      setNotice(
        errorMessage(
          error,
          "Unable to cancel the draft.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  if (loading || !data?.draft) {
    return (
      <main className="dispatch-page">
        <div className="dispatch-loading">
          {notice || "Loading delivery draft…"}
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
            Delivery booking draft
          </span>
          <h1>{draft.draft_number}</h1>
          <p>
            Delivery person:{" "}
            <strong>
              {draft.delivery_person_name}
            </strong>{" "}
            · {draft.vehicle_type}{" "}
            {draft.vehicle_number}
          </p>
        </div>

        <Link
          className="dispatch-button secondary"
          to={`${dispatchUrl()}?draft_id=${encodeURIComponent(
            draft.id,
          )}`}
        >
          Add Another Order
        </Link>
      </section>

      <section className="dispatch-stat-grid-react">
        <article>
          <strong>{draft.order_count || 0}</strong>
          <span>Customer orders</span>
        </article>
        <article>
          <strong>
            {draft.seller_booking_count || 0}
          </strong>
          <span>Seller bookings</span>
        </article>
        <article>
          <strong>{draft.pickup_count || 0}</strong>
          <span>Pickup locations</span>
        </article>
        <article>
          <strong>
            {Number(draft.pickup_km || 0).toFixed(2)} km
          </strong>
          <span>Pickup route</span>
        </article>
        <article>
          <strong>
            {Number(draft.delivery_km || 0).toFixed(2)} km
          </strong>
          <span>Delivery route</span>
        </article>
        <article>
          <strong>
            {Number(draft.combined_km || 0).toFixed(2)} km
          </strong>
          <span>Combined route</span>
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

      {notice && (
        <div className="dispatch-notice warning">
          {notice}
        </div>
      )}

      {draft.validation_status !== "valid" && (
        <div className="dispatch-notice error">
          <strong>
            Delivery booking needs correction
          </strong>
          <p>{draft.validation_message}</p>
        </div>
      )}

      <div className="dispatch-detail-layout-react">
        <main className="dispatch-card">
          <h2>Orders Added to this Delivery Booking</h2>

          <div className="dispatch-draft-orders">
            {(draft.per_order_metrics || []).map(
              (order) => {
                const instantOrder = isInstantDelivery(order, draft);
                const orderSelectedLabel = instantOrder
                  ? instantDeliverySelectionLabel(order, draft)
                  : "";
                const orderWindows = deliveryWindows(order, draft);

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
                      {orderWindows.map((window, index) => (
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
                    <span>Pickups</span>
                    <strong>
                      {order.seller_pickup_count || 0}
                    </strong>
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
                  <button
                    className="dispatch-button danger small"
                    type="button"
                    onClick={() =>
                      void removeOrder(
                        String(order.order_id),
                      )
                    }
                    disabled={
                      working ===
                      String(order.order_id)
                    }
                  >
                    Remove
                  </button>
                </article>
                );
              },
            )}

            {!draft.per_order_metrics?.length && (
              <div className="dispatch-empty">
                No orders added.
              </div>
            )}
          </div>
        </main>

        <aside className="dispatch-card dispatch-sticky">
          <h2>Next Step</h2>

          <div className="dispatch-person-summary">
            <span>Selected delivery person</span>
            <strong>
              {draft.delivery_person_name}
            </strong>
            <small>
              {draft.delivery_person_phone} ·{" "}
              {draft.vehicle_type}{" "}
              {draft.vehicle_number}
            </small>
          </div>

          <Link
            className="dispatch-button secondary full"
            to={`${dispatchUrl()}?draft_id=${encodeURIComponent(
              draft.id,
            )}`}
          >
            Add Another Order
          </Link>

          <Link
            className={`dispatch-button primary full ${
              !draft.order_count ||
              draft.validation_status !== "valid"
                ? "disabled"
                : ""
            }`}
            to={`/delivery-dispatch/drafts/${draft.id}/price`}
            onClick={(event) => {
              if (
                !draft.order_count ||
                draft.validation_status !== "valid"
              ) {
                event.preventDefault();
              }
            }}
          >
            Continue to Final Price
          </Link>

          <button
            className="dispatch-button danger full"
            type="button"
            onClick={() => void cancelDraft()}
            disabled={working === "cancel"}
          >
            {working === "cancel"
              ? "Cancelling…"
              : "Cancel Draft"}
          </button>
        </aside>
      </div>
    </main>
  );
}
