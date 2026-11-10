import { Link } from "react-router-dom";

export function NearbyFulfillmentDashboardCard() {
  return (
    <section className="fulfillment-card nearby-dashboard-card">
      <div>
        <span className="fulfillment-eyebrow">Nearby order fulfilment</span>
        <h2>Inventory, Bookings and Payments</h2>
        <p>
          Maintain available quantities, review assigned products,
          confirm payment status, and track payable settlement amounts.
        </p>
      </div>

      <div className="fulfillment-actions">
        <Link className="fulfillment-button primary" to="/seller/inventory">
          Manage Inventory
        </Link>
        <Link className="fulfillment-button secondary" to="/seller/bookings">
          View Bookings and Payments
        </Link>
      </div>
    </section>
  );
}
