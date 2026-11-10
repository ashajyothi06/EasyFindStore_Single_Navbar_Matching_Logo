import { Link } from "react-router-dom";

export function AdminSellerGatewaysDashboardCard() {
  return (
    <section className="payment-card admin-gateway-dashboard-card">
      <div>
        <h2>Seller Razorpay Gateways</h2>
        <p>
          Test seller payment credentials, edit encrypted keys, and
          activate verified Live Mode gateways.
        </p>
      </div>

      <Link
        className="razorpay-button primary"
        to="/admin/seller-payment-gateways"
      >
        Manage Gateways
      </Link>
    </section>
  );
}
