import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  loadBookingNotificationsSession,
  type BookingNotificationResponse,
} from "../services/bookingNotificationsApi";
import "../styles/booking-notifications.css";

interface BookingNotificationsDashboardCardProps {
  role: string;
}

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export function BookingNotificationsDashboardCard({
  role,
}: BookingNotificationsDashboardCardProps) {
  const normalizedRole = role
    .trim()
    .toLowerCase();

  const [data, setData] =
    useState<BookingNotificationResponse | null>(
      null,
    );
  const [available, setAvailable] =
    useState(false);

  useEffect(() => {
    if (
      ![
        "admin",
        "seller_delivery_manager",
      ].includes(normalizedRole)
    ) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response =
          await loadBookingNotificationsSession();

        if (!cancelled) {
          setData(response);
          setAvailable(true);
        }
      } catch {
        if (!cancelled) {
          setAvailable(false);
        }
      }
    }

    const refresh = () => {
      void load();
    };

    void load();

    window.addEventListener("pageshow", refresh);
    window.addEventListener(
      "seller-booking-updated",
      refresh,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "pageshow",
        refresh,
      );
      window.removeEventListener(
        "seller-booking-updated",
        refresh,
      );
    };
  }, [normalizedRole]);

  if (
    ![
      "admin",
      "seller_delivery_manager",
    ].includes(normalizedRole)
  ) {
    return null;
  }

  const summary = data?.summary || {};
  const isAdmin =
    normalizedRole === "admin";
  const newCount = Number(
    summary.new_count || 0,
  );
  const recent =
    summary.recent_bookings || [];

  return (
    <section className="bn-dashboard-card">
      <div className="bn-dashboard-heading">
        <div>
          <span className="bn-eyebrow">
            {isAdmin
              ? "Administrator order centre"
              : "Seller Delivery Manager"}
          </span>

          <h2>
            {isAdmin
              ? "New Orders, Seller Bookings and Payments"
              : "Seller Accept and Reject Management"}
          </h2>

          <p>
            {isAdmin
              ? "Review new seller allocations, payment status, split fulfilment, and internal settlement progress."
              : "Coordinate seller responses, review rejection reasons and fines, identify reassignment work, and send accepted bookings to delivery assignment."}
          </p>
        </div>

        {newCount > 0 && (
          <Link
            className="bn-dashboard-badge"
            to={
              isAdmin
                ? "/admin/seller-bookings?status=new"
                : "/seller-delivery-manager/seller-responses?status=new"
            }
          >
            {newCount} New Booking
            {newCount === 1 ? "" : "s"}
          </Link>
        )}
      </div>

      {available ? (
        <>
          <div className="bn-dashboard-stats">
            <article>
              <strong>
                {Number(
                  summary.total_count || 0,
                )}
              </strong>
              <span>Seller bookings</span>
            </article>

            <article>
              <strong>{newCount}</strong>
              <span>
                {isAdmin
                  ? "New for this admin"
                  : "New for this manager"}
              </span>
            </article>

            <article>
              <strong>
                {Number(
                  isAdmin
                    ? summary.active_count || 0
                    : summary.pending_response_count ||
                        0,
                )}
              </strong>
              <span>
                {isAdmin
                  ? "Active fulfilment"
                  : "Awaiting response"}
              </span>
            </article>

            <article>
              <strong>
                {Number(
                  isAdmin
                    ? summary.payment_waiting_count ||
                        0
                    : summary.accepted_count ||
                        0,
                )}
              </strong>
              <span>
                {isAdmin
                  ? "Payment waiting"
                  : "Accepted"}
              </span>
            </article>

            <article>
              <strong>
                {isAdmin
                  ? Number(
                      summary.split_booking_count ||
                        0,
                    )
                  : Number(
                      summary.reassignment_required_count ||
                        0,
                    )}
              </strong>
              <span>
                {isAdmin
                  ? "Split bookings"
                  : "Reassignment required"}
              </span>
            </article>
          </div>

          {recent.length > 0 && (
            <div className="bn-dashboard-recent">
              {recent
                .slice(0, 5)
                .map((booking) => (
                  <article key={booking.id}>
                    <div>
                      <strong>
                        {booking.booking_number ||
                          booking.parent_order_number}
                        {booking.is_new
                          ? " · New"
                          : ""}
                      </strong>
                      <small>
                        {booking.business_name ||
                          booking.seller_name ||
                          "Seller"}{" "}
                        ·{" "}
                        {Number(
                          booking.item_count ||
                            0,
                        )}{" "}
                        unit(s)
                      </small>
                    </div>

                    <span
                      className={`bn-status ${
                        booking.status ||
                        "assigned"
                      }`}
                    >
                      {label(
                        booking.status ||
                          "assigned",
                      )}
                    </span>

                    <span
                      className={`bn-status ${
                        booking.payment_status ||
                        "pending"
                      }`}
                    >
                      {label(
                        booking.payment_status ||
                          "pending",
                      )}
                    </span>

                    <Link
                      className="bn-button secondary small"
                      to={
                        isAdmin
                          ? `/admin/seller-bookings/${booking.id}`
                          : `/seller-delivery-manager/bookings/${booking.id}`
                      }
                    >
                      Review
                    </Link>
                  </article>
                ))}
            </div>
          )}
        </>
      ) : (
        <div className="bn-empty compact">
          Booking summary is currently unavailable.
          The navigation remains available.
        </div>
      )}

      <div className="bn-heading-actions">
        <Link
          className="bn-button primary"
          to={
            isAdmin
              ? "/admin/seller-bookings"
              : "/seller-delivery-manager/seller-responses"
          }
        >
          {isAdmin
            ? "Open Admin Booking Centre"
            : "Seller Response Management"}
        </Link>

        <Link
          className="bn-button secondary"
          to={
            isAdmin
              ? "/admin/order-allocations"
              : "/seller-delivery-manager/delivery-dispatch"
          }
        >
          {isAdmin
            ? "Open Order Allocations"
            : "Assign Accepted Bookings"}
        </Link>
      </div>
    </section>
  );
}
