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
  loadAdminSellerBookings,
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

export function AdminSellerBookingsPage() {
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await loadAdminSellerBookings(
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
              "Unable to load seller bookings.",
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
          key: "active",
          label: "Active",
          value: Number(
            summary.active_count || 0,
          ),
        },
        {
          key: "payment_waiting",
          label: "Payment waiting",
          value: Number(
            summary.payment_waiting_count || 0,
          ),
          tone: "warning",
        },
        {
          key: "completed",
          label: "Completed",
          value: Number(
            summary.completed_count || 0,
          ),
          tone: "success",
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

  const bookings =
    data?.bookings || [];
  const currency =
    data?.currency_symbol || "₹";

  return (
    <main className="bn-page">
      <div className="bn-container"> 
        <section className="bn-heading">
          <div>
            <span className="bn-eyebrow">
              Administrator order centre
            </span>
            <h1>Seller Bookings</h1>
            <p>
              Review new seller allocations, payment
              status, fulfilment progress, and internal
              split orders.
            </p>
          </div>

          <Link
            className="bn-button secondary"
            to="/admin"
          >
            Admin Dashboard
          </Link>
        </section>

        <section className="bn-summary-grid">
          {summaryFilters.map((filter) => (
            <button
              key={filter.key}
              className={`bn-summary-card ${filter.tone || ""
                } ${statusFilter === filter.key
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

        {error && (
          <div className="bn-alert danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bn-loading">
            Loading seller bookings…
          </div>
        ) : bookings.length > 0 ? (
          <section className="bn-booking-grid">
            {bookings.map(
              (
                booking: SellerBookingNotification,
              ) => (
                <article
                  className={`bn-booking-card ${booking.is_new
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
                        {booking.booking_number}
                      </span>
                      <h2>
                        {booking.business_name ||
                          booking.seller_name ||
                          "Seller"}
                      </h2>
                    </div>

                    <span
                      className={`bn-status ${booking.status || "assigned"
                        }`}
                    >
                      {label(
                        booking.status ||
                        "assigned",
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
                          booking.item_count || 0,
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
                      <dt>Subtotal</dt>
                      <dd>
                        {money(
                          booking.subtotal,
                          currency,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <section className="bn-payment-strip">
                    <div>
                      <span>Payment</span>
                      <strong>
                        {label(
                          booking.payment_status ||
                          "pending",
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Method</span>
                      <strong>
                        {label(
                          booking.payment_method ||
                          "cash_on_delivery",
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Customer</span>
                      <strong>
                        {booking.customer_name ||
                          "Customer"}
                      </strong>
                    </div>
                    <div>
                      <span>Settlement</span>
                      <strong>
                        {label(
                          booking.settlement_status ||
                          "pending_payment",
                        )}
                      </strong>
                    </div>
                  </section>

                  <Link
                    className="bn-button primary full"
                    to={`/admin/seller-bookings/${booking.id}`}
                  >
                    Open Booking
                  </Link>
                </article>
              ),
            )}
          </section>
        ) : (
          <section className="bn-empty">
            {statusFilter === "new" ? (
              <>
                <h2>
                  No unread new bookings
                </h2>
                <p>
                  All currently assigned bookings
                  have already been opened.
                </p>
              </>
            ) : (
              <>
                <h2>No bookings found</h2>
                <p>
                  Seller bookings will appear here
                  after nearby allocation.
                </p>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
