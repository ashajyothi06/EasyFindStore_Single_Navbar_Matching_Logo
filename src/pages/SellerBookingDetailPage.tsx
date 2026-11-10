import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  errorText,
  isAuthenticationError,
  isCsrfError,
  loadSellerBooking,
  submitSellerBookingDecision,
  type BookingResponse,
} from "../services/nearbyFulfillmentApi";
import { RoleSupportTicketCard } from "../components/RoleSupportTicketCard";
import "../styles/nearby-fulfillment.css";

type DeliveryTimeSlot = "morning" | "evening";

type DeliveryWindow = {
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
};

type FulfillmentSummary = {
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
};

type DeliveryItem = Record<string, any> & {
  item_id?: string;
  id?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_time_slot?: string;
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
};

type DeliveryBooking = Record<string, any> & {
  id: string;
  items?: DeliveryItem[];
  product_types?: string[];
  delivery_time_slots?: string[];
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_types?: string[];
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
};

const SELLER_TIMING_STYLES = `
  .seller-delivery-priority{margin:0 0 18px;border:2px solid #2f7a45!important;background:linear-gradient(135deg,#f1faf4,#fff)!important}
  .seller-delivery-priority-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:13px}
  .seller-delivery-priority-header h2{margin:3px 0 0;color:#174b2a}
  .seller-delivery-priority-header p{margin:5px 0 0;color:#52705c;font-size:.84rem}
  .seller-delivery-priority-badge{padding:6px 10px;border-radius:999px;background:#174b2a;color:#fff;font-size:.69rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
  .seller-delivery-time-list{display:flex;flex-wrap:wrap;gap:10px}
  .seller-delivery-time-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;border:1px solid #a7d3b3;border-radius:12px;background:#fff;color:#174b2a;font-size:.9rem;font-weight:900}
  .seller-delivery-time-chip::before{content:'✓';display:grid;place-items:center;width:23px;height:23px;border-radius:999px;background:#23824a;color:#fff;font-size:.76rem}
  .seller-delivery-window-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
  .seller-delivery-window{display:grid;gap:5px;padding:13px 14px;border:1px solid #a7d3b3;border-radius:13px;background:#fff;color:#174b2a}
  .seller-delivery-window strong{font-size:.92rem}
  .seller-delivery-window span{color:#365f43;font-size:.82rem;font-weight:800}
  .seller-delivery-window small{color:#52705c;font-size:.74rem;font-weight:750}
  .seller-item-delivery-times{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:6px}
  .seller-item-delivery-times span{padding:4px 7px;border-radius:999px;background:#e8f5ec;color:#23633a;font-size:.67rem;font-weight:850}
  .seller-item-estimate{display:block!important;margin-top:6px;color:#31583d;font-size:.7rem;font-weight:800;line-height:1.4}
  .seller-timing-warning{margin:12px 0 0;padding:10px 12px;border-left:4px solid #e0a100;border-radius:8px;background:#fff8df;color:#745800;font-size:.78rem;font-weight:750}
  @media(max-width:620px){.seller-delivery-priority-header{display:grid}.seller-delivery-priority-badge{justify-self:start}}
`;

function title(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cleanList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function concreteDeliveryTimes(values: unknown): DeliveryTimeSlot[] {
  const result: DeliveryTimeSlot[] = [];
  cleanList(values).forEach((value) => {
    const clean = value.toLowerCase();
    const candidates = clean === "both" ? ["morning", "evening"] : [clean];
    candidates.forEach((candidate) => {
      if (
        (candidate === "morning" || candidate === "evening") &&
        !result.includes(candidate)
      ) {
        result.push(candidate);
      }
    });
  });
  return result;
}

function concreteFallbackDeliveryTimes(
  values: unknown,
): DeliveryTimeSlot[] {
  return concreteDeliveryTimes(
    cleanList(values).filter(
      (value) => value.toLowerCase() !== "both",
    ),
  );
}

function selectedBookingDeliveryTimes(
  booking: DeliveryBooking,
): DeliveryTimeSlot[] {
  const direct = concreteDeliveryTimes(
    booking.customer_selected_delivery_time_slots ||
      booking.selected_delivery_time_slots ||
      booking.fulfillment_summary?.selected_delivery_time_slots,
  );
  if (direct.length) return direct;

  const itemTimes = concreteDeliveryTimes(
    (booking.items || []).flatMap(
      (item) =>
        item.customer_selected_delivery_time_slots ||
        item.selected_delivery_time_slots ||
        [],
    ),
  );
  if (itemTimes.length) return itemTimes;

  const scheduledTimes = concreteDeliveryTimes([
    ...(booking.promised_delivery_windows || []).map(
      (window) => window.slot,
    ),
    ...(booking.items || []).flatMap((item) =>
      (item.promised_delivery_windows || []).map(
        (window) => window.slot,
      ),
    ),
  ]);
  if (scheduledTimes.length) return scheduledTimes;

  return concreteFallbackDeliveryTimes(
    booking.delivery_time_slots ||
      booking.fulfillment_summary?.delivery_time_slots ||
      [booking.delivery_time_slot].filter(Boolean),
  );
}

function selectedItemDeliveryTimes(
  item: DeliveryItem,
  bookingTimes: DeliveryTimeSlot[],
): DeliveryTimeSlot[] {
  const selected = concreteDeliveryTimes(
    item.customer_selected_delivery_time_slots ||
      item.selected_delivery_time_slots,
  );
  if (selected.length) return selected;
  const scheduled = concreteDeliveryTimes(
    (item.promised_delivery_windows || []).map(
      (window) => window.slot,
    ),
  );
  if (scheduled.length) return scheduled;
  const fallback = concreteFallbackDeliveryTimes(
    [item.delivery_time_slot].filter(Boolean),
  );
  return fallback.length ? fallback : bookingTimes;
}

function bookingDeliveryTypes(booking: DeliveryBooking): string[] {
  const direct = cleanList(
    booking.delivery_types ||
      booking.fulfillment_summary?.delivery_types ||
      [booking.delivery_type].filter(Boolean),
  ).map((value) => value.toLowerCase());

  if (direct.length) return direct;

  return cleanList(
    (booking.items || []).map((item) => item.delivery_type),
  ).map((value) => value.toLowerCase());
}

function isInstantDeliveryBooking(booking: DeliveryBooking): boolean {
  return bookingDeliveryTypes(booking).includes("instant_delivery");
}

function isInstantDeliveryItem(item: DeliveryItem): boolean {
  return String(item.delivery_type || "").toLowerCase() === "instant_delivery";
}

function instantDeliverySelectionLabel(
  record: DeliveryBooking | DeliveryItem,
): string {
  const direct = String(record.selected_delivery_time_label || "").trim();
  if (direct) return direct;

  if ("fulfillment_summary" in record) {
    const summaryLabel = String(
      record.fulfillment_summary?.selected_delivery_time_label || "",
    ).trim();
    if (summaryLabel) return summaryLabel;

    const itemLabel = (record.items || [])
      .map((item) => String(item.selected_delivery_time_label || "").trim())
      .find(Boolean);

    if (itemLabel) return itemLabel;
  }

  return "10 min - 30 min";
}

function deliveryTimeLabel(value: unknown): string {
  if (String(value || "").toLowerCase() === "morning") return "Morning";
  if (String(value || "").toLowerCase() === "evening") return "Evening";
  return title(value);
}

function deliveryTypeLabel(value: unknown): string {
  const clean = String(value || "").toLowerCase();
  if (clean === "instant_delivery") return "Instant delivery";
  if (clean === "one_day_delivery") return "One-day delivery";
  return title(value);
}

function formatDeliveryDate(value: unknown): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const dateOnly = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        12,
      )
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
  const clean = String(value || "").trim();
  if (!clean) return "";
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function formatConfiguredClock(value: unknown): string {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

function deliveryWindowTime(window: DeliveryWindow): string {
  const exactStart = formatDeliveryClock(window.start_at);
  const exactEnd = formatDeliveryClock(window.end_at);

  if (exactStart || exactEnd) {
    return exactStart && exactEnd
      ? `${exactStart} – ${exactEnd}`
      : exactStart || exactEnd;
  }

  const savedLabel = String(window.time_label || "").trim();
  if (savedLabel) return savedLabel;

  const start = formatConfiguredClock(window.start_time);
  const end = formatConfiguredClock(window.end_time);
  return start && end ? `${start} – ${end}` : start || end;
}

function deliveryWindowsFromRecord(
  record: DeliveryBooking | DeliveryItem,
): DeliveryWindow[] {
  const direct = Array.isArray(record.promised_delivery_windows)
    ? record.promised_delivery_windows.filter(Boolean)
    : [];
  if (direct.length) return direct;

  const date = record.promised_delivery_date;
  const timeLabel =
    record.promised_delivery_label || record.promised_delivery_time_label;
  const startAt = record.promised_delivery_start_at;
  const endAt = record.promised_delivery_end_at;
  return date || timeLabel || startAt || endAt
    ? [
        {
          date,
          time_label: timeLabel,
          start_at: startAt,
          end_at: endAt,
          timezone: record.delivery_schedule_timezone || "Asia/Kolkata",
        },
      ]
    : [];
}

function bookingDeliveryWindows(booking: DeliveryBooking): DeliveryWindow[] {
  let windows = deliveryWindowsFromRecord(booking);
  if (!windows.length) {
    windows = (booking.items || []).flatMap(deliveryWindowsFromRecord);
  }
  if (!windows.length && booking.fulfillment_summary) {
    windows = deliveryWindowsFromRecord({
      id: "summary",
      ...booking.fulfillment_summary,
      delivery_schedule_timezone:
        booking.delivery_schedule_timezone || "Asia/Kolkata",
    });
  }

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

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatDeliveryDate(window.date || window.start_at);
  const time = deliveryWindowTime(window);
  return [date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function SellerBookingDetailPage() {
  const { bookingId = "" } = useParams();
  const [data, setData] = useState<BookingResponse | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setData(await loadSellerBooking(bookingId));
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign(
          `/react/login?next=/seller/bookings/${bookingId}`,
        );
        return;
      }
      setNotice(errorText(error, "Unable to load booking."));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function decide(
    decision: "accepted" | "rejected",
    event?: FormEvent,
  ) {
    event?.preventDefault();
    if (!data?.csrf_token) return;
    setWorking(decision);
    setNotice("");

    try {
      const response = await submitSellerBookingDecision(
        bookingId,
        data.csrf_token,
        {
          decision,
          rejection_reason: reason,
          fine_acknowledged: acknowledged,
        },
      );
      setData(response);
      setNotice(response.message || `Booking ${decision}.`);
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }
      setNotice(errorText(error, "Unable to submit booking decision."));
    } finally {
      setWorking("");
    }
  }

  const booking = data?.booking as DeliveryBooking | undefined;

  if (!booking) {
    return (
      <main className="fulfillment-page">
        <div className="fulfillment-loading">
          {notice || "Loading booking…"}
        </div>
      </main>
    );
  }

  const productTypes = cleanList(
    booking.product_types || booking.fulfillment_summary?.product_types,
  );
  const selectedDeliveryTimes = selectedBookingDeliveryTimes(booking);
  const deliveryTypes = bookingDeliveryTypes(booking);
  const instantDelivery = isInstantDeliveryBooking(booking);
  const instantSelectionLabel = instantDeliverySelectionLabel(booking);
  const deliveryWindows = bookingDeliveryWindows(booking);
  const deliveryTimingReady =
    instantDelivery || selectedDeliveryTimes.length > 0;

  return (
    <main className="fulfillment-page">
      <style>{SELLER_TIMING_STYLES}</style>
      <div className="fulfillment-container">
        <section className="fulfillment-heading">
          <div>
            <span className="fulfillment-eyebrow">Seller booking</span>
            <h1>{booking.booking_number || "Booking Detail"}</h1>
            <p>
              {booking.customer_name || "Customer"} · {title(booking.status)}
            </p>
          </div>
          <Link className="fulfillment-button secondary" to="/seller/bookings">
            All Bookings
          </Link>
        </section>

        {notice && <div className="fulfillment-notice">{notice}</div>}

        <section className="fulfillment-card seller-delivery-priority">
          <div className="seller-delivery-priority-header">
            <div>
              <span className="fulfillment-eyebrow">
                Customer-selected delivery schedule
              </span>
              <h2>Deliver at the selected time</h2>
              <p>
                Prepare and hand over this booking for the checked delivery
                period shown below.
              </p>
            </div>
            <span className="seller-delivery-priority-badge">Important</span>
          </div>

          {deliveryWindows.length ? (
            <div className="seller-delivery-window-list">
              {deliveryWindows.map((window, index) => {
                const slot = concreteDeliveryTimes([window.slot])[0] ||
                  selectedDeliveryTimes[index] ||
                  selectedDeliveryTimes[0];
                return (
                  <div
                    className="seller-delivery-window"
                    key={`${window.slot || "delivery"}-${
                      window.start_at || window.date || index
                    }`}
                  >
                    <strong>
                      ✓ {instantDelivery
                        ? `Instant delivery · ${instantSelectionLabel}`
                        : slot
                          ? `${deliveryTimeLabel(slot)} delivery`
                          : "Scheduled delivery"}
                    </strong>
                    <span>
                      {formatDeliveryDate(window.date || window.start_at) ||
                        "Date pending"}
                    </span>
                    <small>
                      {deliveryWindowTime(window)
                        ? `${deliveryWindowTime(window)} IST`
                        : "Exact time pending"}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : instantDelivery ? (
            <>
              <div className="seller-delivery-time-list">
                <span className="seller-delivery-time-chip">
                  Instant delivery · {instantSelectionLabel}
                </span>
              </div>
              <div className="seller-timing-warning">
                The instant-delivery promise is 10-30 minutes from the order
                booking time. Exact promised clock time is not available in this
                booking snapshot.
              </div>
            </>
          ) : selectedDeliveryTimes.length ? (
            <>
              <div className="seller-delivery-time-list">
                {selectedDeliveryTimes.map((slot) => (
                  <span className="seller-delivery-time-chip" key={slot}>
                    {deliveryTimeLabel(slot)} delivery
                  </span>
                ))}
              </div>
              <div className="seller-timing-warning">
                The customer slot is saved, but the exact estimated delivery
                date and time window are not available yet.
              </div>
            </>
          ) : (
            <div className="seller-timing-warning">
              No customer delivery time is recorded. Confirm the delivery
              timing with the manager before accepting this booking.
            </div>
          )}
        </section>

        <section className="fulfillment-grid two">
          <article className="fulfillment-card">
            <h2>Assigned Items</h2>
            <div className="booking-items">
              {(booking.items || []).map((item) => {
                const itemTimes = selectedItemDeliveryTimes(
                  item,
                  selectedDeliveryTimes,
                );
                const itemWindows = deliveryWindowsFromRecord(item);
                const instantItem = isInstantDeliveryItem(item);
                const itemInstantLabel = instantDeliverySelectionLabel(item);
                return (
                  <div key={item.item_id || item.id}>
                    <span>
                      <strong>{item.name || item.item_id}</strong>
                      <small>
                        {item.product_type || "Products"} ·{" "}
                        {deliveryTypeLabel(
                          item.delivery_type || "one_day_delivery",
                        )}
                      </small>
                      <span className="seller-item-delivery-times">
                        {instantItem ? (
                          <span>✓ {itemInstantLabel}</span>
                        ) : (
                          itemTimes.map((slot) => (
                            <span key={slot}>✓ {deliveryTimeLabel(slot)}</span>
                          ))
                        )}
                      </span>
                      {itemWindows.map((window, index) => (
                        <span
                          className="seller-item-estimate"
                          key={`${window.start_at || window.date || index}`}
                        >
                          {instantItem ? "Promised" : "Estimated"}:{" "}
                          {deliveryEstimateLabel(window) || "Schedule pending"}
                        </span>
                      ))}
                    </span>
                    <strong>
                      {item.quantity} × {data.currency_symbol || "₹"}
                      {Number(item.price || 0).toFixed(2)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="fulfillment-card">
            <h2>Product and Delivery</h2>
            <dl className="fulfillment-details">
              <div>
                <dt>Product type</dt>
                <dd>{productTypes.join(", ") || "Products"}</dd>
              </div>
              <div>
                <dt>Customer selected</dt>
                <dd>
                  {instantDelivery
                    ? instantSelectionLabel
                    : selectedDeliveryTimes.length
                      ? selectedDeliveryTimes
                          .map((slot) => `✓ ${deliveryTimeLabel(slot)}`)
                          .join(" · ")
                      : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Delivery type</dt>
                <dd>
                  {deliveryTypes.map(deliveryTypeLabel).join(", ") ||
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>{instantDelivery ? "Promised delivery" : "Estimated delivery"}</dt>
                <dd>
                  {deliveryWindows.length
                    ? deliveryWindows
                        .map((window) => {
                          const rawSlot = String(
                            window.slot || window.slot_key || "",
                          ).toLowerCase();
                          const slot =
                            rawSlot && rawSlot !== "instant"
                              ? `${deliveryTimeLabel(rawSlot)}: `
                              : "";
                          return `${slot}${deliveryEstimateLabel(window)}`;
                        })
                        .join(" · ")
                    : "Schedule pending"}
                </dd>
              </div>
              <div>
                <dt>Delivery status</dt>
                <dd>
                  {title(booking.delivery_status || "scheduled")}
                </dd>
              </div>
            </dl>
          </article>

          <article className="fulfillment-card">
            <h2>Payment and Settlement</h2>
            <dl className="fulfillment-details">
              <div>
                <dt>Payment method</dt>
                <dd>{title(booking.payment_method)}</dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>{title(booking.payment_status)}</dd>
              </div>
              <div>
                <dt>Settlement</dt>
                <dd>{title(booking.settlement_status)}</dd>
              </div>
              <div>
                <dt>Payable</dt>
                <dd>
                  {data.currency_symbol || "₹"}
                  {Number(booking.seller_payable_amount || 0).toFixed(2)}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        {booking.status === "assigned" && (
          <section className="fulfillment-card decision-card">
            <h2>Accept or Reject Booking</h2>
            <div className="fulfillment-actions">
              <button
                className="fulfillment-button success"
                disabled={Boolean(working) || !deliveryTimingReady}
                onClick={() => void decide("accepted")}
                type="button"
              >
                {working === "accepted" ? "Accepting…" : "Accept Booking"}
              </button>
            </div>

            {!deliveryTimingReady && (
              <div className="seller-timing-warning">
                Acceptance is disabled until a delivery time is available.
              </div>
            )}

            <form onSubmit={(event) => void decide("rejected", event)}>
              <label>
                Rejection reason
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                I understand that a rejection fine may be collected after
                manager review.
              </label>
              <button
                className="fulfillment-button danger"
                disabled={Boolean(working)}
                type="submit"
              >
                {working === "rejected" ? "Rejecting…" : "Reject Booking"}
              </button>
            </form>
          </section>
        )}

        <RoleSupportTicketCard
          role="seller"
          csrfToken={data?.csrf_token || ""}
          contextType="seller_booking"
          contextId={booking.id}
          bookingId={booking.id}
          orderId={String(
            booking.parent_order_id ||
              booking.order_id ||
              "",
          )}
          orderNumber={String(
            booking.parent_order_number ||
              booking.order_number ||
              booking.booking_number ||
              "",
          )}
          items={(booking.items || []) as Array<Record<string, any>>}
          title="Seller Support"
          description="Raise a ticket for an order, item, preparation, pickup, payment, or settlement issue related to this booking."
        />
      </div>
    </main>
  );
}
