import {
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
  loadAdminSellerBooking,
  type BookingNotificationResponse,
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

export function AdminSellerBookingDetailPage() {
  const { bookingId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
          await loadAdminSellerBooking(
            bookingId,
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
              location.pathname,
            )}`,
            { replace: true },
          );
          return;
        }

        if (!cancelled) {
          setError(
            bookingErrorMessage(
              requestError,
              "Unable to load the seller booking.",
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
    bookingId,
    location.pathname,
    navigate,
  ]);

  if (loading) {
    return (
      <main className="bn-page">
        <div className = "bn-container">
        <div className="bn-loading">
          Loading seller booking…
        </div>
        </div>
      </main>
    );
  }

  if (error || !data?.booking) {
    return (
      <main className="bn-page">
        <div className = "bn-container">
        <section className="bn-empty">
          <h1>Booking unavailable</h1>
          <p>
            {error ||
              "The seller booking was not found."}
          </p>
          <Link
            className="bn-button secondary"
            to="/admin/seller-bookings"
          >
            Back to Admin Bookings
          </Link>
        </section> 
        </div>
      </main>
    );
  }

  const booking = data.booking;
  const order = data.order;
  const address =
    booking.delivery_address || {};
  const currency =
    data.currency_symbol || "₹";

  return (
    <main className="bn-page">
      <div className = "bn-container">
      <section className="bn-heading">
        <div>
          <span className="bn-eyebrow">
            Administrator booking review
          </span>

          {booking.is_new && (
            <span className="bn-inline-new">
              New Booking
            </span>
          )}

          <h1>{booking.booking_number}</h1>

          <p>
            Parent order:{" "}
            {booking.parent_order_number} ·
            Seller:{" "}
            {booking.business_name ||
              booking.seller_name ||
              "Seller"}
          </p>
        </div>

        <div className="bn-heading-actions">
          <Link
            className="bn-button secondary"
            to="/admin/seller-bookings"
          >
            Back to Admin Bookings
          </Link>

          {order?.id && (
            <Link
              className="bn-button primary"
              to={`/admin/order-allocations/${order.id}`}
            >
              Open Full Allocation
            </Link>
          )}
        </div>
      </section>

      <section className="bn-payment-card">
        <article>
          <span>Booking Status</span>
          <strong>
            {label(
              booking.status || "assigned",
            )}
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
          <span>Seller Payable</span>
          <strong>
            {money(
              booking.seller_payable_amount ??
                booking.subtotal,
              currency,
            )}
          </strong>
        </article>
        <article>
          <span>Settlement</span>
          <strong>
            {label(
              booking.settlement_status ||
                "pending_payment",
            )}
          </strong>
        </article>
      </section>

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

              {!booking.items?.length && (
                <div className="bn-empty compact">
                  No assigned products.
                </div>
              )}
            </div>
          </section>

          <section className="bn-card">
            <h2>Customer Delivery</h2>

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
          <h2>Administrator Actions</h2>

          <p>
            Use the full allocation page to
            update fulfilment status,
            settlement reference, and settlement
            state.
          </p>

          {order?.id && (
            <Link
              className="bn-button primary full"
              to={`/admin/order-allocations/${order.id}`}
            >
              Manage Allocation
            </Link>
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
              <dt>Subtotal</dt>
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
