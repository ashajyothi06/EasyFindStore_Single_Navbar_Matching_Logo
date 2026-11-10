import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  bookingErrorMessage,
  isBookingAuthenticationError,
  isBookingCsrfError,
  loadManagerSellerBooking,
  submitManagerSellerDecision,
  type BookingNotificationResponse,
  updateManagerRejectionFine,
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
}

const FULFILLMENT_STYLES = `
  .bn-fulfillment-card{margin:18px 0}
  .bn-fulfillment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin:0}
  .bn-fulfillment-grid div{padding:14px;border:1px solid #dfe9e2;border-radius:12px;background:#f8faf8}
  .bn-fulfillment-grid dt{color:#69776f;font-size:.72rem;font-weight:800;text-transform:uppercase}
  .bn-fulfillment-grid dd{margin:5px 0 0;color:#153e27;font-weight:900}
  .bn-item-fulfillment{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:7px}
  .bn-item-fulfillment span{padding:4px 7px;border-radius:999px;background:#edf6f0;color:#285b3e;font-size:.64rem;font-weight:800}
  .bn-item-fulfillment .bn-selected-time{background:#dff3e5;color:#165f35;border:1px solid #a8d5b5}
  .bn-item-fulfillment .bn-delivery-estimate{background:#fff7df;color:#735800;border:1px solid #ead38c}
  @media(max-width:650px){.bn-fulfillment-grid{grid-template-columns:1fr}}
`;

function fulfillmentValues(
  row: FulfillmentRecord,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
  fallback?: FulfillmentRecord,
): string[] {
  const values = [
    ...(row.fulfillment_summary?.[key] || []),
    String(row[directKey] || ""),
    ...(fallback?.fulfillment_summary?.[key] || []),
    String(fallback?.[directKey] || ""),
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

function selectedDeliveryTimes(
  row: FulfillmentRecord,
  fallback?: FulfillmentRecord,
): string[] {
  const selected = concreteDeliveryTimes([
    ...(row.customer_selected_delivery_time_slots || []),
    ...(row.fulfillment_summary?.selected_delivery_time_slots || []),
    ...(row.selected_delivery_time_slots || []),
    row.selected_delivery_time_slot,
  ]);
  if (selected.length) return selected;

  if (fallback) {
    const fallbackSelected = concreteDeliveryTimes([
      ...(fallback.customer_selected_delivery_time_slots || []),
      ...(fallback.fulfillment_summary?.selected_delivery_time_slots || []),
      ...(fallback.selected_delivery_time_slots || []),
      fallback.selected_delivery_time_slot,
    ]);
    if (fallbackSelected.length) return fallbackSelected;
  }

  const scheduled = concreteDeliveryTimes(
    deliveryWindows(row, fallback).map((window) => window.slot),
  );
  if (scheduled.length) return scheduled;

  return concreteDeliveryTimes(
    fulfillmentValues(
      row,
      "delivery_time_slots",
      "delivery_time_slot",
      fallback,
    ).filter((value) => value.toLowerCase() !== "both"),
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
  const date = formatDeliveryDate(window.date || window.start_at);
  const start = formatDeliveryClock(window.start_at) || formatConfiguredClock(window.start_time);
  const end = formatDeliveryClock(window.end_at) || formatConfiguredClock(window.end_time);
  const time = String(window.time_label || "").trim() || (start && end ? `${start} – ${end}` : start || end);
  const slot = window.slot ? deliveryTimeLabel(window.slot) : "";
  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

export function ManagerSellerBookingDetailPage() {
  const { bookingId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] =
    useState<BookingNotificationResponse | null>(
      null,
    );
  const [acceptanceNote, setAcceptanceNote] =
    useState("");
  const [rejectionReason, setRejectionReason] =
    useState("");
  const [initialFine, setInitialFine] =
    useState("0");
  const [fineAmount, setFineAmount] =
    useState("0");
  const [fineStatus, setFineStatus] =
    useState("pending_review");
  const [fineNote, setFineNote] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "warning" | "danger";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response =
        await loadManagerSellerBooking(
          bookingId,
        );

      setData(response);

      const fine =
        response.booking
          ?.seller_rejection_fine || {};

      setFineAmount(
        String(fine.amount ?? 0),
      );
      setFineStatus(
        String(
          fine.status ||
          "pending_review",
        ),
      );
      setFineNote(
        String(fine.manager_note || ""),
      );
    } catch (requestError) {
      if (
        isBookingAuthenticationError(
          requestError,
        )
      ) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            location.pathname,
          )}`,
          { replace: true },
        );
        return;
      }

      setNotice({
        type: "danger",
        text: bookingErrorMessage(
          requestError,
          "Unable to load the seller booking.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [
    bookingId,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptBooking(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!data?.csrf_token) return;

    setWorking("accept");
    setNotice(null);

    try {
      const response =
        await submitManagerSellerDecision(
          bookingId,
          data.csrf_token,
          {
            decision: "accepted",
            note: acceptanceNote,
          },
        );

      setNotice({
        type: "success",
        text:
          response.message ||
          "Seller acceptance recorded.",
      });
      setAcceptanceNote("");
      window.dispatchEvent(
        new Event("seller-booking-updated"),
      );
      await load();
    } catch (requestError) {
      if (isBookingCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice({
        type: "danger",
        text: bookingErrorMessage(
          requestError,
          "Unable to accept the seller booking.",
        ),
      });
    } finally {
      setWorking("");
    }
  }

  async function rejectBooking(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !data?.csrf_token ||
      !rejectionReason.trim()
    ) {
      return;
    }

    if (
      !window.confirm(
        "Reject this seller booking, release reserved stock, and flag a fine?",
      )
    ) {
      return;
    }

    setWorking("reject");
    setNotice(null);

    try {
      const response =
        await submitManagerSellerDecision(
          bookingId,
          data.csrf_token,
          {
            decision: "rejected",
            rejection_reason:
              rejectionReason.trim(),
            fine_amount: initialFine,
          },
        );

      setNotice({
        type: "warning",
        text:
          response.message ||
          "Seller rejection recorded.",
      });
      setRejectionReason("");
      window.dispatchEvent(
        new Event("seller-booking-updated"),
      );
      await load();
    } catch (requestError) {
      if (isBookingCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice({
        type: "danger",
        text: bookingErrorMessage(
          requestError,
          "Unable to reject the seller booking.",
        ),
      });
    } finally {
      setWorking("");
    }
  }

  async function updateFine(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!data?.csrf_token) return;

    setWorking("fine");
    setNotice(null);

    try {
      const response =
        await updateManagerRejectionFine(
          bookingId,
          data.csrf_token,
          {
            fine_amount: fineAmount,
            fine_status: fineStatus,
            fine_note: fineNote,
          },
        );

      setNotice({
        type: "success",
        text:
          response.message ||
          "Seller rejection fine updated.",
      });
      window.dispatchEvent(
        new Event("seller-booking-updated"),
      );
      await load();
    } catch (requestError) {
      if (isBookingCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice({
        type: "danger",
        text: bookingErrorMessage(
          requestError,
          "Unable to update the rejection fine.",
        ),
      });
    } finally {
      setWorking("");
    }
  }

  if (loading && !data?.booking) {
    return (
      <main className="bn-page">
        <div className="bn-loading">
          Loading seller response…
        </div>
      </main>
    );
  }

  if (!data?.booking) {
    return (
      <main className="bn-page">
        <div className="bn-container">
          <section className="bn-empty">
            <h1>Booking unavailable</h1>
            <p>
              {notice?.text ||
                "The seller booking was not found."}
            </p>
            <Link
              className="bn-button secondary"
              to="/seller-delivery-manager/seller-responses"
            >
              Back to Manager Bookings
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const booking = data.booking as typeof data.booking & FulfillmentRecord;
  const address =
    booking.delivery_address || {};
  const fine =
    booking.seller_rejection_fine || {};
  const currency =
    data.currency_symbol || "₹";
  const paymentBlocked =
    booking.payment_method === "razorpay" &&
    booking.payment_status !== "paid";
  const canRecordDecision =
    Boolean(
      booking.can_record_decision,
    ) && !paymentBlocked;

  return (
    <main className="bn-page">
      <style>{FULFILLMENT_STYLES}</style>
      <div className="bn-container">
        <section className="bn-heading">
          <div>
            <span className="bn-eyebrow">
              Seller Delivery Manager
            </span>

            {booking.is_new && (
              <span className="bn-inline-new">
                New Booking
              </span>
            )}

            <h1>{booking.booking_number}</h1>

            <p>
              {booking.business_name ||
                booking.seller_name ||
                "Seller"}{" "}
              · Parent order:{" "}
              {booking.parent_order_number}
            </p>
          </div>

          <Link
            className="bn-button secondary"
            to="/seller-delivery-manager/seller-responses"
          >
            Back to Manager Bookings
          </Link>
        </section>

        {notice && (
          <div
            className={`bn-alert ${notice.type}`}
          >
            {notice.text}
          </div>
        )}

        <section className="bn-payment-card">
          <article>
            <span>Seller Response</span>
            <strong>
              {booking.status === "assigned"
                ? "Awaiting Response"
                : label(booking.status)}
            </strong>
          </article>
          <article>
            <span>Payment</span>
            <strong>
              {label(
                booking.payment_status ||
                "pending",
              )}
            </strong>
          </article>
          <article>
            <span>Payment Method</span>
            <strong>
              {label(
                booking.payment_method ||
                "cash_on_delivery",
              )}
            </strong>
          </article>
          <article>
            <span>Seller</span>
            <strong>
              {booking.business_name ||
                booking.seller_name ||
                "Seller"}
            </strong>
          </article>
          <article>
            <span>Seller Payable</span>
            <strong>
              {money(
                booking.seller_payable_amount ??
                booking.subtotal,
                currency,
              )}
            </strong>
          </article>
        </section>

        <section className="bn-card bn-fulfillment-card">
          <h2>Product and Delivery Plan</h2>
          <dl className="bn-fulfillment-grid">
            <div>
              <dt>Product Type</dt>
              <dd>
                {fulfillmentValues(booking, "product_types", "product_type").join(", ") || "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Customer Selected Time</dt>
              <dd>
                {selectedDeliveryTimes(booking)
                  .map((value) => `✓ ${deliveryTimeLabel(value)}`).join(" · ")}
              </dd>
            </div>
            <div>
              <dt>Delivery Speed</dt>
              <dd>
                {fulfillmentValues(booking, "delivery_types", "delivery_type")
                  .map(deliveryTypeLabel).join(", ") || "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Estimated Delivery (IST)</dt>
              <dd>
                {deliveryWindows(booking)
                  .map(deliveryEstimateLabel).filter(Boolean).join(" · ") || "Schedule pending"}
              </dd>
            </div>
            <div>
              <dt>Delivery Status</dt>
              <dd>
                {label(booking.delivery_status || "scheduled")}
              </dd>
            </div>
          </dl>
        </section>

        {paymentBlocked && (
          <div className="bn-alert warning">
            Accept or Reject is disabled until
            the Razorpay payment is verified.
          </div>
        )}

        {booking.status === "accepted" && (
          <section className="bn-decision-result accepted">
            <strong>Seller Accepted</strong>
            <p>
              This booking is eligible for
              delivery-person assignment. Delivery
              progress is managed through the delivery
              batch workflow.
            </p>
            <Link
              className="bn-button primary"
              to="/seller-delivery-manager/delivery-dispatch"
            >
              Open Manual Delivery Assignment
            </Link>
          </section>
        )}

        {booking.status === "rejected" && (
          <section className="bn-decision-result rejected">
            <strong>
              Seller Rejected — Reassignment Required
            </strong>
            <p>
              <strong>Reason:</strong>{" "}
              {booking.seller_rejection_reason ||
                booking.seller_response_note ||
                "No reason recorded."}
            </p>
            <p>
              Reserved inventory was released. This
              seller payable was removed and the order
              requires reassignment.
            </p>
          </section>
        )}

        <div className="bn-detail-layout">
          <main className="bn-detail-main">
            <section className="bn-card">
              <h2>Assigned Products</h2>

              <div className="bn-item-list">
                {(booking.items || []).map(
                  (item, index) => (
                    <article
                      key={`${String(
                        item.name || "item",
                      )}-${index}`}
                    >
                      <div>
                        <strong>
                          {String(
                            item.name ||
                            "Product",
                          )}
                        </strong>
                        <small>
                          {String(
                            item.category_name ||
                            "",
                          )}
                          {item.size
                            ? ` · ${String(
                              item.size,
                            )}`
                            : ""}
                        </small>
                        <div className="bn-item-fulfillment">
                          {fulfillmentValues(
                            item as FulfillmentRecord,
                            "product_types",
                            "product_type",
                            booking,
                          ).map((value) => (
                            <span key={`product-${value}`}>Product: {value}</span>
                          ))}
                          {selectedDeliveryTimes(
                            item as FulfillmentRecord,
                            booking,
                          ).map((value) => (
                            <span className="bn-selected-time" key={`selected-time-${value}`}>
                              Customer selected: ✓ {deliveryTimeLabel(value)}
                            </span>
                          ))}
                          {fulfillmentValues(
                            item as FulfillmentRecord,
                            "delivery_types",
                            "delivery_type",
                            booking,
                          ).map((value) => (
                            <span key={`speed-${value}`}>Speed: {deliveryTypeLabel(value)}</span>
                          ))}
                          {deliveryWindows(
                            item as FulfillmentRecord,
                            booking,
                          ).map((window, windowIndex) => (
                            <span
                              className="bn-delivery-estimate"
                              key={`estimate-${window.start_at || window.date || windowIndex}`}
                            >
                              Estimated: {deliveryEstimateLabel(window)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span>
                          {Number(
                            item.quantity || 0,
                          )}{" "}
                          ×{" "}
                          {money(
                            item.price,
                            currency,
                          )}
                        </span>
                        <strong>
                          {money(
                            item.subtotal,
                            currency,
                          )}
                        </strong>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </section>

            <section className="bn-card">
              <h2>Delivery Address</h2>

              <p className="bn-address">
                <strong>
                  {String(
                    address.recipient_name ||
                    booking.customer_name ||
                    "Customer",
                  )}
                </strong>
                <br />
                {String(
                  address.address_line1 || "",
                )}
                {address.address_line2
                  ? `, ${String(
                    address.address_line2,
                  )}`
                  : ""}
                <br />
                {String(address.city || "")}
                {address.city &&
                  address.state
                  ? ", "
                  : ""}
                {String(address.state || "")}
                {address.postal_code
                  ? ` — ${String(
                    address.postal_code,
                  )}`
                  : ""}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {String(
                  address.phone ||
                  booking.customer_phone ||
                  "—",
                )}
              </p>
            </section>
          </main>

          <aside className="bn-card bn-sticky">
            {canRecordDecision ? (
              <>
                <h2>Record Seller Decision</h2>
                <p>
                  Use this when coordinating the
                  seller response. The decision is
                  final.
                </p>

                <form
                  className="bn-action-form"
                  onSubmit={acceptBooking}
                >
                  <label>
                    Manager note
                    <textarea
                      rows={3}
                      value={acceptanceNote}
                      onChange={(event) =>
                        setAcceptanceNote(
                          event.target.value,
                        )
                      }
                      placeholder="Optional acceptance coordination note"
                    />
                  </label>

                  <button
                    className="bn-button primary full"
                    type="submit"
                    disabled={
                      working === "accept"
                    }
                  >
                    {working === "accept"
                      ? "Accepting…"
                      : "Accept for Seller"}
                  </button>
                </form>

                <div className="bn-divider">
                  <span>OR</span>
                </div>

                <form
                  className="bn-action-form"
                  onSubmit={rejectBooking}
                >
                  <label>
                    Rejection reason
                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Initial fine amount
                    <div className="bn-money-input">
                      <span>{currency}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={initialFine}
                        onChange={(event) =>
                          setInitialFine(
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </label>

                  <button
                    className="bn-button danger full"
                    type="submit"
                    disabled={
                      working === "reject" ||
                      !rejectionReason.trim()
                    }
                  >
                    {working === "reject"
                      ? "Rejecting…"
                      : "Reject for Seller"}
                  </button>
                </form>
              </>
            ) : booking.status ===
              "rejected" ? (
              <>
                <h2>Manage Rejection Fine</h2>

                <div className="bn-alert warning compact">
                  <strong>
                    Fine Collection Notice
                  </strong>
                  <p>
                    A rejection fine will be
                    collected unless the manager
                    explicitly waives it.
                  </p>
                </div>

                <form
                  className="bn-action-form"
                  onSubmit={updateFine}
                >
                  <label>
                    Fine amount
                    <div className="bn-money-input">
                      <span>{currency}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={fineAmount}
                        onChange={(event) =>
                          setFineAmount(
                            event.target.value,
                          )
                        }
                        required
                      />
                    </div>
                  </label>

                  <label>
                    Fine status
                    <select
                      value={fineStatus}
                      onChange={(event) =>
                        setFineStatus(
                          event.target.value,
                        )
                      }
                      required
                    >
                      {(data.fine_statuses || [
                        "pending_review",
                        "applied",
                        "waived",
                        "collected",
                        "disputed",
                      ]).map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {label(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Fine note
                    <textarea
                      rows={3}
                      value={fineNote}
                      onChange={(event) =>
                        setFineNote(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <button
                    className="bn-button primary full"
                    type="submit"
                    disabled={
                      working === "fine"
                    }
                  >
                    {working === "fine"
                      ? "Updating…"
                      : "Update Fine"}
                  </button>
                </form>

                <dl className="bn-fine-summary">
                  <div>
                    <dt>Reassignment</dt>
                    <dd>Required</dd>
                  </div>
                  <div>
                    <dt>Fine Status</dt>
                    <dd>
                      {label(
                        fine.status ||
                        "pending_review",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Fine Amount</dt>
                    <dd>
                      {money(
                        fine.amount,
                        currency,
                      )}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <h2>
                  Seller Response Recorded
                </h2>
                <p>
                  No additional Accept or Reject
                  action is available. Delivery
                  progress is managed through the
                  delivery-person assignment and
                  batch workflow.
                </p>
              </>
            )}

            <dl className="bn-side-stats">
              <div>
                <dt>Allocated Units</dt>
                <dd>
                  {Number(
                    booking.item_count || 0,
                  )}
                </dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>
                  {Number(
                    booking.distance_km || 0,
                  ).toFixed(2)}{" "}
                  km
                </dd>
              </div>
              <div>
                <dt>Original Subtotal</dt>
                <dd>
                  {money(
                    booking.subtotal,
                    currency,
                  )}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
