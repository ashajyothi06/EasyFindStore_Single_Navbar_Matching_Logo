import {
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
  bookingErrorMessage,
  isBookingAuthenticationError,
  loadManagerSellerBookings,
  type BookingNotificationResponse,
  type SellerBookingNotification,
} from "../services/bookingNotificationsApi";
import "../styles/booking-notifications.css";

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function money(
  value: unknown,
  symbol: string,
): string {
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

interface SummaryFilter {
  key: string;
  label: string;
  value: number;
  tone?: string;
}

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

type DeliveryAwareBooking = SellerBookingNotification & {
  product_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_type?: string;
  items?: Array<Record<string, any>>;
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  fulfillment_summary?: FulfillmentSummary;
};

const FULFILLMENT_STYLES = `
  .bn-fulfillment-filters{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr)) auto;gap:12px;align-items:end;margin:18px 0;padding:16px;border:1px solid #dfe9e2;border-radius:16px;background:#f8faf8}
  .bn-fulfillment-filters label{display:grid;gap:6px;color:#63736a;font-size:.75rem;font-weight:800}
  .bn-fulfillment-filters select{min-height:42px;padding:9px 11px;border:1px solid #cddbd1;border-radius:10px;background:#fff;color:#153e27;font:inherit}
  .bn-filter-count{grid-column:1/-1;margin:0;color:#65756b;font-size:.78rem}
  .bn-fulfillment-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px}
  .bn-fulfillment-meta span{padding:5px 8px;border-radius:999px;background:#edf6f0;color:#285b3e;font-size:.68rem;font-weight:850}
  .bn-fulfillment-meta .bn-selected-time{background:#dff3e5;color:#165f35;border:1px solid #a8d5b5}
  .bn-fulfillment-meta .bn-delivery-estimate{background:#fff7df;color:#735800;border:1px solid #ead38c}
  @media(max-width:850px){.bn-fulfillment-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:520px){.bn-fulfillment-filters{grid-template-columns:1fr}}
`;

function fulfillmentValues(
  booking: DeliveryAwareBooking,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
): string[] {
  const values = [
    ...(booking.fulfillment_summary?.[key] || []),
    String(booking[directKey] || ""),
  ].map(String).map((value) => value.trim()).filter(Boolean);
  const unique = [...new Map(
    values.map((value) => [value.toLowerCase(), value]),
  ).values()];
  if (unique.length) return unique;
  return [];
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

function selectedDeliveryTimes(booking: DeliveryAwareBooking): string[] {
  const selected = concreteDeliveryTimes([
    ...(booking.customer_selected_delivery_time_slots || []),
    ...(booking.fulfillment_summary?.selected_delivery_time_slots || []),
    ...(booking.selected_delivery_time_slots || []),
    booking.selected_delivery_time_slot,
  ]);

  if (selected.length) return selected;

  const itemSelected = concreteDeliveryTimes(
    (booking.items || []).flatMap((item) =>
      item.customer_selected_delivery_time_slots ||
      item.selected_delivery_time_slots ||
      [],
    ),
  );
  if (itemSelected.length) return itemSelected;

  const scheduled = concreteDeliveryTimes(
    deliveryWindows(booking).map((window) => window.slot),
  );
  if (scheduled.length) return scheduled;

  return concreteDeliveryTimes(
    fulfillmentValues(booking, "delivery_time_slots", "delivery_time_slot")
      .filter((value) => value.toLowerCase() !== "both"),
  );
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return label(value);
}

function formatDeliveryDate(value: unknown): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const dateOnly = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatDeliveryClock(value: unknown): string {
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

function deliveryWindows(booking: DeliveryAwareBooking): DeliveryWindow[] {
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
      const key = [window.slot, window.date, window.start_at || window.start_time, window.end_at || window.end_time].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const date = booking.promised_delivery_date || booking.fulfillment_summary?.promised_delivery_date;
  const timeLabel = booking.promised_delivery_time_label || booking.fulfillment_summary?.promised_delivery_time_label;
  const startAt = booking.promised_delivery_start_at || booking.fulfillment_summary?.promised_delivery_start_at;
  const endAt = booking.promised_delivery_end_at || booking.fulfillment_summary?.promised_delivery_end_at;
  return date || timeLabel || startAt || endAt
    ? [{ date, time_label: timeLabel, start_at: startAt, end_at: endAt, timezone: booking.delivery_schedule_timezone || "Asia/Kolkata" }]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatDeliveryDate(window.date || window.start_at);
  const start = formatDeliveryClock(window.start_at) || formatConfiguredClock(window.start_time);
  const end = formatDeliveryClock(window.end_at) || formatConfiguredClock(window.end_time);
  const time = String(window.time_label || "").trim() || (start && end ? `${start} – ${end}` : start || end);
  const slot = window.slot ? deliveryTimeLabel(window.slot) : "";
  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function ManagerSellerBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const statusFilter =
    searchParams.get("status") || "all";

  const [data, setData] =
    useState<BookingNotificationResponse | null>(
      null,
    );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState("all");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await loadManagerSellerBookings(
            statusFilter,
          );

        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        if (
          isBookingAuthenticationError(
            requestError,
          )
        ) {
          navigate(
            `/react/login?next=${encodeURIComponent(
              location.pathname +
                location.search,
            )}`,
            { replace: true },
          );
          return;
        }

        if (!cancelled) {
          setError(
            bookingErrorMessage(
              requestError,
              "Unable to load seller responses.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    location.pathname,
    location.search,
    navigate,
    statusFilter,
  ]);

  const summaryFilters =
    useMemo<SummaryFilter[]>(() => {
      const summary = data?.summary || {};

      return [
        {
          key: "all",
          label: "All bookings",
          value: Number(
            summary.total_count || 0,
          ),
        },
        {
          key: "new",
          label: "New bookings",
          value: Number(
            summary.new_count || 0,
          ),
          tone: "new",
        },
        {
          key: "assigned",
          label: "Awaiting response",
          value: Number(
            summary.pending_response_count ||
              0,
          ),
          tone: "warning",
        },
        {
          key: "accepted",
          label: "Accepted",
          value: Number(
            summary.accepted_count || 0,
          ),
          tone: "success",
        },
        {
          key: "rejected",
          label: "Rejected / Reassign",
          value: Number(
            summary.rejected_count || 0,
          ),
          tone: "danger",
        },
      ];
    }, [data?.summary]);

  function selectFilter(key: string) {
    if (key === "all") {
      setSearchParams({});
      return;
    }

    setSearchParams({ status: key });
  }

  const allBookings = (data?.bookings || []) as DeliveryAwareBooking[];
  const productTypeOptions = useMemo(
    () => [...new Set(allBookings.flatMap((booking) =>
      fulfillmentValues(booking, "product_types", "product_type"),
    ))].sort((a, b) => a.localeCompare(b)),
    [allBookings],
  );
  const bookings = useMemo(
    () => allBookings.filter((booking) => {
      const products = fulfillmentValues(booking, "product_types", "product_type");
      const times = selectedDeliveryTimes(booking);
      const types = fulfillmentValues(booking, "delivery_types", "delivery_type");
      return (
        (productTypeFilter === "all" || products.some(
          (value) => value.toLowerCase() === productTypeFilter.toLowerCase(),
        )) &&
        (deliveryTimeFilter === "all" || (
          deliveryTimeFilter === "both"
            ? times.includes("morning") && times.includes("evening")
            : times.includes(deliveryTimeFilter)
        )) &&
        (deliveryTypeFilter === "all" || types.includes(deliveryTypeFilter))
      );
    }),
    [allBookings, deliveryTimeFilter, deliveryTypeFilter, productTypeFilter],
  );
  const summary = data?.summary || {};
  const currency =
    data?.currency_symbol || "₹";

  return (
    <main className="bn-page">
      <style>{FULFILLMENT_STYLES}</style>
      <div className="bn-container">
      <section className="bn-heading">
        <div>
          <span className="bn-eyebrow">
            Seller Delivery Manager
          </span>
          <h1>
            Seller Accept and Reject Management
          </h1>
          <p>
            Monitor seller responses, record Accept
            or Reject when required, review rejection
            reasons, apply fines, and identify orders
            that need reassignment.
          </p>
        </div>

        <div className="bn-heading-actions">
          <Link
            className="bn-button secondary"
            to="/dashboard"
          >
            Manager Dashboard
          </Link>

          <Link
            className="bn-button primary"
            to="/seller-delivery-manager/delivery-dispatch"
          >
            Assign Accepted Bookings
          </Link>
        </div>
      </section>

      <section className="bn-summary-grid">
        {summaryFilters.map((filter) => (
          <button
            key={filter.key}
            className={`bn-summary-card ${
              filter.tone || ""
            } ${
              statusFilter === filter.key
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              selectFilter(filter.key)
            }
          >
            <strong>{filter.value}</strong>
            <span>{filter.label}</span>
          </button>
        ))}
      </section>

      <section className="bn-fine-overview">
        <article>
          <span>Pending Fine Reviews</span>
          <strong>
            {Number(
              summary.pending_fine_count || 0,
            )}
          </strong>
        </article>
        <article>
          <span>Pending Fine Amount</span>
          <strong>
            {money(
              summary.pending_fine_amount,
              currency,
            )}
          </strong>
        </article>
        <article>
          <span>Reassignment Required</span>
          <strong>
            {Number(
              summary.reassignment_required_count ||
                0,
            )}
          </strong>
        </article>
      </section>

      <section className="bn-fulfillment-filters" aria-label="Delivery filters">
        <label>
          Product Type
          <select
            value={productTypeFilter}
            onChange={(event) => setProductTypeFilter(event.target.value)}
          >
            <option value="all">All Product Types</option>
            {productTypeOptions.map((productType) => (
              <option key={productType} value={productType}>{productType}</option>
            ))}
          </select>
        </label>

        <label>
          Customer Selected Time
          <select
            value={deliveryTimeFilter}
            onChange={(event) => setDeliveryTimeFilter(event.target.value)}
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
            onChange={(event) => setDeliveryTypeFilter(event.target.value)}
          >
            <option value="all">All Delivery Speeds</option>
            <option value="instant_delivery">Instant Delivery</option>
            <option value="one_day_delivery">One-Day Delivery</option>
          </select>
        </label>

        <button
          className="bn-button secondary"
          type="button"
          onClick={() => {
            setProductTypeFilter("all");
            setDeliveryTimeFilter("all");
            setDeliveryTypeFilter("all");
          }}
        >
          Clear Filters
        </button>
        <p className="bn-filter-count">
          Showing {bookings.length} of {allBookings.length} seller booking(s).
        </p>
      </section>

      {error && (
        <div className="bn-alert danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bn-loading">
          Loading seller responses…
        </div>
      ) : bookings.length > 0 ? (
        <section className="bn-booking-grid">
          {bookings.map(
            (
              booking: DeliveryAwareBooking,
            ) => {
              const fine =
                booking.seller_rejection_fine ||
                {};

              return (
                <article
                  className={`bn-booking-card ${
                    booking.is_new
                      ? "is-new"
                      : ""
                  }`}
                  key={booking.id}
                >
                  {booking.is_new && (
                    <div className="bn-new-ribbon">
                      New Booking
                    </div>
                  )}

                  <div className="bn-card-heading">
                    <div>
                      <span>
                        {
                          booking.booking_number
                        }
                      </span>
                      <h2>
                        {booking.business_name ||
                          booking.seller_name ||
                          "Seller"}
                      </h2>
                    </div>

                    <span
                      className={`bn-status ${
                        booking.status ||
                        "assigned"
                      }`}
                    >
                      {booking.status ===
                      "assigned"
                        ? "Awaiting Seller Response"
                        : label(
                            booking.status,
                          )}
                    </span>
                  </div>

                  <dl className="bn-card-stats">
                    <div>
                      <dt>Customer Order</dt>
                      <dd>
                        {
                          booking.parent_order_number
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Allocated Units</dt>
                      <dd>
                        {Number(
                          booking.item_count ||
                            0,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Distance</dt>
                      <dd>
                        {Number(
                          booking.distance_km ||
                            0,
                        ).toFixed(2)}{" "}
                        km
                      </dd>
                    </div>
                    <div>
                      <dt>Seller Payable</dt>
                      <dd>
                        {money(
                          booking.seller_payable_amount ??
                            booking.subtotal,
                          currency,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="bn-fulfillment-meta">
                    {fulfillmentValues(booking, "product_types", "product_type").map((value) => (
                      <span key={`product-${value}`}>Product: {value}</span>
                    ))}
                    {selectedDeliveryTimes(booking).map((value) => (
                      <span className="bn-selected-time" key={`selected-time-${value}`}>
                        Customer selected: ✓ {deliveryTimeLabel(value)}
                      </span>
                    ))}
                    {fulfillmentValues(booking, "delivery_types", "delivery_type").map((value) => (
                      <span key={`speed-${value}`}>Speed: {deliveryTypeLabel(value)}</span>
                    ))}
                    {deliveryWindows(booking).map((window, index) => (
                      <span className="bn-delivery-estimate" key={`estimate-${window.start_at || window.date || index}`}>
                        Estimated: {deliveryEstimateLabel(window)}
                      </span>
                    ))}
                    <span>
                      Delivery status: {label(booking.delivery_status || "scheduled")}
                    </span>
                  </div>

                  {booking.status ===
                    "rejected" && (
                    <section className="bn-decision-summary rejected">
                      <strong>
                        Reassignment Required
                      </strong>
                      <p>
                        {booking.seller_rejection_reason ||
                          booking.seller_response_note ||
                          "No rejection reason recorded."}
                      </p>
                      <span>
                        Fine:{" "}
                        {label(
                          fine.status ||
                            "pending_review",
                        )}
                        {Number(
                          fine.amount || 0,
                        ) > 0
                          ? ` · ${money(
                              fine.amount,
                              currency,
                            )}`
                          : ""}
                      </span>
                    </section>
                  )}

                  {booking.status ===
                    "accepted" && (
                    <section className="bn-decision-summary accepted">
                      <strong>
                        Seller Accepted
                      </strong>
                      <p>
                        Eligible for manual
                        delivery-person assignment.
                      </p>
                    </section>
                  )}

                  <Link
                    className="bn-button primary full"
                    to={`/seller-delivery-manager/bookings/${booking.id}`}
                  >
                    Manage Booking
                  </Link>
                </article>
              );
            },
          )}
        </section>
      ) : (
        <section className="bn-empty">
          <h2>No bookings found</h2>
          <p>
            {allBookings.length
              ? "No seller bookings match the selected product and delivery filters."
              : "Seller booking responses will appear here."}
          </p>
        </section>
      )}
      </div>
    </main>
  );
}
