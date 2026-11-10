import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorText,
  isAuthenticationError,
  loadAdminAllocations,
  type AllocationResponse,
} from "../services/nearbyFulfillmentApi";
import "../styles/nearby-fulfillment.css";

function title(value: unknown): string {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminOrderAllocationsPage() {
  const [data, setData] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminAllocations()
      .then(setData)
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign("/react/login?next=/admin/order-allocations");
          return;
        }
        setError(errorText(requestError, "Unable to load allocations."));
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {};
  const orders = data?.orders || [];

  return (
    <main className="fulfillment-page">
      <div className="fulfillment-container">
      <section className="fulfillment-heading">
        <div>
          <span className="fulfillment-eyebrow">Administration</span>
          <h1>Order Allocations</h1>
          <p>Review split seller assignments, payments, fulfilment status, and settlements.</p>
        </div>
        <Link className="fulfillment-button secondary" to="/admin/nearby-sellers">Nearby Diagnostics</Link>
      </section>

      <section className="fulfillment-stats">
        <article><strong>{summary.allocated_orders || 0}</strong><span>Allocated orders</span></article>
        <article><strong>{summary.split_orders || 0}</strong><span>Split orders</span></article>
        <article><strong>{summary.seller_bookings || 0}</strong><span>Seller bookings</span></article>
        <article><strong>{data?.currency_symbol || "₹"}{Number(summary.pending_settlement_amount || 0).toFixed(2)}</strong><span>Pending settlement</span></article>
      </section>

      {error && <div className="fulfillment-notice error">{error}</div>}

      {loading ? <div className="fulfillment-loading">Loading allocations…</div> : (
        <section className="fulfillment-list">
          {orders.map((order) => (
            <article className="fulfillment-card booking-card" key={order.id}>
              <div>
                <span className="fulfillment-eyebrow">{order.order_number || order.id}</span>
                <h2>{order.customer_name || order.user_email || "Customer order"}</h2>
                <p>{order.seller_booking_count || order.fulfillment?.seller_count || 0} seller booking(s)</p>
              </div>
              <div className="booking-meta">
                <span className="fulfillment-status">{title(order.fulfillment_status || order.fulfillment?.status)}</span>
                <span>{title(order.payment_status)}</span>
                <Link className="fulfillment-button secondary small" to={`/admin/order-allocations/${order.id}`}>Review</Link>
              </div>
            </article>
          ))}
          {!orders.length && <div className="fulfillment-empty">No allocated orders found.</div>}
        </section>
      )}
      </div>
    </main>
  );
}
