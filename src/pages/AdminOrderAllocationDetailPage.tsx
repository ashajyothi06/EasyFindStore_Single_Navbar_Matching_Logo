import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  errorText,
  isAuthenticationError,
  isCsrfError,
  loadAdminAllocation,
  type AllocationResponse,
  updateAdminBookingStatus,
  updateAdminSettlement,
} from "../services/nearbyFulfillmentApi";
import "../styles/nearby-fulfillment.css";

function title(value: unknown): string {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminOrderAllocationDetailPage() {
  const { orderId = "" } = useParams();
  const [data, setData] = useState<AllocationResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState("");

  async function load() {
    try {
      setData(await loadAdminAllocation(orderId));
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign(`/react/login?next=/admin/order-allocations/${orderId}`);
        return;
      }
      setNotice(errorText(error, "Unable to load allocation."));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function changeStatus(bookingId: string, status: string) {
    if (!data?.csrf_token) return;
    setWorking(bookingId);
    try {
      await updateAdminBookingStatus(bookingId, data.csrf_token, status);
      await load();
      setNotice("Booking status updated.");
    } catch (error) {
      if (isCsrfError(error)) return window.location.reload();
      setNotice(errorText(error, "Unable to update status."));
    } finally {
      setWorking("");
    }
  }

  async function changeSettlement(bookingId: string, status: string) {
    if (!data?.csrf_token) return;
    setWorking(bookingId);
    try {
      await updateAdminSettlement(bookingId, data.csrf_token, {
        settlement_status: status,
      });
      await load();
      setNotice("Settlement status updated.");
    } catch (error) {
      if (isCsrfError(error)) return window.location.reload();
      setNotice(errorText(error, "Unable to update settlement."));
    } finally {
      setWorking("");
    }
  }

  if (!data?.order) {
    return <main className="fulfillment-page"><div className="fulfillment-loading">{notice || "Loading allocation…"}</div></main>;
  }

  return (
    <main className="fulfillment-page">
      <div className="fulfillment-container">
      <section className="fulfillment-heading">
        <div>
          <span className="fulfillment-eyebrow">Allocation detail</span>
          <h1>{data.order.order_number || data.order.id}</h1>
          <p>{data.order.customer_name || data.order.user_email || "Customer order"}</p>
        </div>
        <Link className="fulfillment-button secondary" to="/admin/order-allocations">All Allocations</Link>
      </section>

      {notice && <div className="fulfillment-notice">{notice}</div>}

      <section className="fulfillment-list">
        {(data.bookings || []).map((booking) => (
          <article className="fulfillment-card" key={booking.id}>
            <div className="booking-card">
              <div>
                <span className="fulfillment-eyebrow">{booking.booking_number}</span>
                <h2>{booking.business_name || booking.seller_name || "Seller"}</h2>
                <p>{booking.item_count || 0} item(s) · {booking.distance_km ?? "—"} km</p>
              </div>
              <div className="booking-meta">
                <span className="fulfillment-status">{title(booking.status)}</span>
                <strong>{data.currency_symbol || "₹"}{Number(booking.seller_payable_amount || 0).toFixed(2)}</strong>
              </div>
            </div>

            <div className="admin-control-grid">
              <label>
                Booking status
                <select
                  value={booking.status}
                  disabled={working === booking.id}
                  onChange={(event) => void changeStatus(booking.id, event.target.value)}
                >
                  {(data.allowed_booking_statuses || []).map((status) => (
                    <option key={status} value={status}>{title(status)}</option>
                  ))}
                </select>
              </label>

              <label>
                Settlement status
                <select
                  value={booking.settlement_status}
                  disabled={working === booking.id}
                  onChange={(event) => void changeSettlement(booking.id, event.target.value)}
                >
                  {(data.allowed_settlement_statuses || []).map((status) => (
                    <option key={status} value={status}>{title(status)}</option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </section>
      </div>
    </main>
  );
}
