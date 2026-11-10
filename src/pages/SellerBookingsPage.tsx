import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorText,
  isAuthenticationError,
  loadSellerBookings,
  type BookingResponse,
} from "../services/nearbyFulfillmentApi";
import "../styles/nearby-fulfillment.css";

type DeliveryTimeFilter = "all" | "morning" | "evening" | "both";
type DeliveryTypeFilter =
  | "all"
  | "instant_delivery"
  | "one_day_delivery";

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

type DeliveryItem = Record<string, any> & {
  product_type?: string;
  delivery_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
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
  fulfillment_summary?: {
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
};

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

function bookingProductTypes(booking: DeliveryBooking): string[] {
  const values = cleanList(booking.product_types);
  if (values.length) return values;

  return cleanList(
    (booking.items || []).map((item) => item.product_type),
  );
}

function bookingDeliveryTimes(booking: DeliveryBooking): string[] {
  const selectedValues = cleanList(
    booking.customer_selected_delivery_time_slots ||
      booking.selected_delivery_time_slots ||
      booking.fulfillment_summary?.selected_delivery_time_slots,
  ).flatMap((value) =>
    value.toLowerCase() === "both"
      ? ["morning", "evening"]
      : [value.toLowerCase()],
  );
  if (selectedValues.length) return Array.from(new Set(selectedValues));

  const values = cleanList(
    booking.delivery_time_slots ||
      booking.fulfillment_summary?.delivery_time_slots,
  ).flatMap((value) =>
    value.toLowerCase() === "both" ? [] : [value.toLowerCase()],
  );
  if (values.length) return values;

  return Array.from(
    new Set(
      (booking.items || []).flatMap((item) => {
        const selected = cleanList(
          item.customer_selected_delivery_time_slots ||
            item.selected_delivery_time_slots,
        );
        if (selected.length) return selected.map((value) => value.toLowerCase());
        const fallback = String(item.delivery_time_slot || "").toLowerCase();
        if (!fallback) return [];
        return fallback === "both" ? [] : [fallback];
      }),
    ),
  );
}

function bookingDeliveryTypes(booking: DeliveryBooking): string[] {
  const values = cleanList(
    booking.delivery_types ||
      booking.fulfillment_summary?.delivery_types ||
      [booking.delivery_type].filter(Boolean),
  ).map((value) => value.toLowerCase());
  if (values.length) return values;

  return cleanList(
    (booking.items || []).map((item) => item.delivery_type),
  ).map((value) => value.toLowerCase());
}

function bookingHasInstantDelivery(booking: DeliveryBooking): boolean {
  return bookingDeliveryTypes(booking).includes("instant_delivery");
}

function instantDeliverySelectionLabel(booking: DeliveryBooking): string {
  const direct = String(
    booking.selected_delivery_time_label ||
      booking.fulfillment_summary?.selected_delivery_time_label ||
      "",
  ).trim();

  if (direct) return direct;

  const itemLabel = (booking.items || [])
    .map((item) => String(item.selected_delivery_time_label || "").trim())
    .find(Boolean);

  return itemLabel || "10 min - 30 min";
}

function deliveryTimeLabel(value: string): string {
  return value === "both" ? "Morning & Evening" : title(value);
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant delivery";
  if (value === "one_day_delivery") return "One-day delivery";
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

function bookingDeliveryWindows(booking: DeliveryBooking): DeliveryWindow[] {
  const direct = Array.isArray(booking.promised_delivery_windows)
    ? booking.promised_delivery_windows.filter(Boolean)
    : [];
  const itemWindows = (booking.items || []).flatMap((item) =>
    Array.isArray(item.promised_delivery_windows)
      ? item.promised_delivery_windows.filter(Boolean)
      : [],
  );
  const windows = direct.length ? direct : itemWindows;

  if (windows.length) {
    const seen = new Set<string>();
    return windows.filter((window) => {
      const key = [
        window.slot,
        window.date,
        window.start_at || window.start_time,
        window.end_at || window.end_time,
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const date =
    booking.promised_delivery_date ||
    booking.fulfillment_summary?.promised_delivery_date;
  const timeLabel =
    booking.promised_delivery_label ||
    booking.promised_delivery_time_label ||
    booking.fulfillment_summary?.promised_delivery_label ||
    booking.fulfillment_summary?.promised_delivery_time_label;
  const startAt =
    booking.promised_delivery_start_at ||
    booking.fulfillment_summary?.promised_delivery_start_at;
  const endAt =
    booking.promised_delivery_end_at ||
    booking.fulfillment_summary?.promised_delivery_end_at;

  return date || timeLabel || startAt || endAt
    ? [
        {
          date,
          time_label: timeLabel,
          start_at: startAt,
          end_at: endAt,
          timezone: booking.delivery_schedule_timezone || "Asia/Kolkata",
        },
      ]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatDeliveryDate(window.date || window.start_at);
  const time = deliveryWindowTime(window);
  const rawSlot = String(window.slot || window.slot_key || "").toLowerCase();
  const slot =
    rawSlot && rawSlot !== "instant" ? deliveryTimeLabel(rawSlot) : "";
  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function SellerBookingsPage() {
  const [data, setData] = useState<BookingResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [productType, setProductType] = useState("all");
  const [deliveryTime, setDeliveryTime] =
    useState<DeliveryTimeFilter>("all");
  const [deliveryType, setDeliveryType] =
    useState<DeliveryTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");

    try {
      setData(await loadSellerBookings(nextStatus));
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        window.location.assign("/react/login?next=/seller/bookings");
        return;
      }
      setError(errorText(requestError, "Unable to load bookings."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookings = (data?.bookings || []) as DeliveryBooking[];

  const productTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          bookings.flatMap((booking) => bookingProductTypes(booking)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [bookings],
  );

  const visibleBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        if (
          productType !== "all" &&
          !bookingProductTypes(booking).some(
            (value) => value.toLowerCase() === productType.toLowerCase(),
          )
        ) {
          return false;
        }

        if (deliveryTime !== "all") {
          const timeSlots = new Set(bookingDeliveryTimes(booking));
          const matchesTime =
            deliveryTime === "both"
              ? timeSlots.has("morning") && timeSlots.has("evening")
              : timeSlots.has(deliveryTime);

          if (!matchesTime) return false;
        }

        if (
          deliveryType !== "all" &&
          !bookingDeliveryTypes(booking).includes(deliveryType)
        ) {
          return false;
        }

        return true;
      }),
    [bookings, deliveryTime, deliveryType, productType],
  );

  function clearDeliveryFilters() {
    setProductType("all");
    setDeliveryTime("all");
    setDeliveryType("all");
  }

  const hasDeliveryFilters =
    productType !== "all" ||
    deliveryTime !== "all" ||
    deliveryType !== "all";

  return (
    <main className="fulfillment-page">
      <div className="fulfillment-container">
        <section className="fulfillment-heading">
          <div>
            <span className="fulfillment-eyebrow">Seller bookings</span>
            <h1>Bookings and Payments</h1>
            <p>
              Review assigned orders, product and delivery settings,
              customer payment status, and settlement details.
            </p>
          </div>
          <Link
            className="fulfillment-button secondary"
            to="/seller/inventory"
          >
            Inventory
          </Link>
        </section>

        <section className="fulfillment-filter" aria-label="Booking filters">
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                const next = event.target.value;
                setStatus(next);
                void load(next);
              }}
            >
              {(
                data?.allowed_filters || [
                  "all",
                  "new",
                  "active",
                  "assigned",
                  "accepted",
                  "rejected",
                ]
              ).map((filter) => (
                <option key={filter} value={filter}>
                  {title(filter)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Product type</span>
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value)}
            >
              <option value="all">All product types</option>
              {productTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Delivery time</span>
            <select
              value={deliveryTime}
              onChange={(event) =>
                setDeliveryTime(event.target.value as DeliveryTimeFilter)
              }
            >
              <option value="all">All delivery times</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="both">Morning & Evening (Both)</option>
            </select>
          </label>

          <label>
            <span>Delivery type</span>
            <select
              value={deliveryType}
              onChange={(event) =>
                setDeliveryType(event.target.value as DeliveryTypeFilter)
              }
            >
              <option value="all">All delivery types</option>
              <option value="instant_delivery">Instant delivery</option>
              <option value="one_day_delivery">One-day delivery</option>
            </select>
          </label>

          {hasDeliveryFilters && (
            <button
              className="fulfillment-button secondary small"
              type="button"
              onClick={clearDeliveryFilters}
            >
              Clear Filters
            </button>
          )}
        </section>

        <p className="fulfillment-filter-count" aria-live="polite">
          Showing {visibleBookings.length} of {bookings.length} booking(s)
        </p>

        {error && <div className="fulfillment-notice error">{error}</div>}

        {loading ? (
          <div className="fulfillment-loading">Loading bookings…</div>
        ) : (
          <section className="fulfillment-list">
            {visibleBookings.map((booking) => {
              const productTypes = bookingProductTypes(booking);
              const deliveryTimes = bookingDeliveryTimes(booking);
              const deliveryTypes = bookingDeliveryTypes(booking);
              const instantDelivery = bookingHasInstantDelivery(booking);
              const selectedDeliveryLabel = instantDelivery
                ? instantDeliverySelectionLabel(booking)
                : deliveryTimes.length
                  ? deliveryTimes
                      .map((value) => `✓ ${deliveryTimeLabel(value)}`)
                      .join(" · ")
                  : "Not selected";
              const deliveryEstimates = bookingDeliveryWindows(booking)
                .map(deliveryEstimateLabel)
                .filter(Boolean);

              return (
                <article
                  className="fulfillment-card booking-card"
                  key={booking.id}
                >
                  <div>
                    <span className="fulfillment-eyebrow">
                      {booking.booking_number || booking.id}
                    </span>
                    <h2>{booking.customer_name || "Customer order"}</h2>
                    <p>
                      {booking.item_count || 0} item(s) ·{" "}
                      {booking.payment_method || "—"}
                    </p>

                    <div className="booking-delivery-meta">
                      <span>{productTypes.join(", ") || "Products"}</span>
                      <span aria-label="Customer selected delivery time">
                        Customer selected: {selectedDeliveryLabel}
                      </span>
                      <span>
                        {deliveryTypes.map(deliveryTypeLabel).join(", ") ||
                          "Delivery speed not recorded"}
                      </span>
                      {deliveryEstimates.slice(0, 2).map((estimate) => (
                        <span key={estimate}>
                          {instantDelivery
                            ? "Promised delivery"
                            : "Estimated delivery"}: {estimate}
                        </span>
                      ))}
                      {deliveryEstimates.length > 2 && (
                        <span>
                          +{deliveryEstimates.length - 2} more delivery
                          window(s)
                        </span>
                      )}
                      {!deliveryEstimates.length && (
                        <span>
                          {instantDelivery
                            ? "Promised delivery"
                            : "Estimated delivery"}: Schedule pending
                        </span>
                      )}
                      <span>
                        Delivery status: {title(
                          booking.delivery_status || "scheduled",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="booking-meta">
                    <span className="fulfillment-status">
                      {title(booking.status)}
                    </span>
                    <span>{title(booking.payment_status)}</span>
                    <strong>
                      {data?.currency_symbol || "₹"}
                      {Number(
                        booking.seller_payable_amount ??
                          booking.subtotal ??
                          0,
                      ).toFixed(2)}
                    </strong>
                    <Link
                      className="fulfillment-button secondary small"
                      to={`/seller/bookings/${booking.id}`}
                    >
                      View
                    </Link>
                    <Link
                      className="fulfillment-button secondary small"
                      to={`/seller/bookings/${booking.id}#support`}
                    >
                      Raise Issue
                    </Link>
                  </div>
                </article>
              );
            })}

            {!visibleBookings.length && (
              <div className="fulfillment-empty">
                No bookings match the selected filters.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
