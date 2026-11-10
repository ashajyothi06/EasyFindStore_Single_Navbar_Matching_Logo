import { Link } from "react-router-dom";

interface SellerRazorpayDashboardCardProps {
  enabled?: boolean;
  status?: string;
}

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SellerRazorpayDashboardCard({
  enabled = true,
  status = "NOT_CONFIGURED",
}: SellerRazorpayDashboardCardProps) {
  if (!enabled) return null;

  return (
    <section className="payment-card seller-payment-dashboard-card">
      <div>
        <span className="razorpay-eyebrow">
          Seller online payments
        </span>
        <h2>Razorpay Payment Setup</h2>
        <p>
          Add encrypted Razorpay credentials after bank verification
          and submit them for administrator payment testing.
        </p>
        <p>
          <strong>Status:</strong> {label(status)}
        </p>
      </div>

      <Link
        className="razorpay-button primary"
        to="/seller/payments/razorpay"
      >
        Manage Razorpay
      </Link>
    </section>
  );
}
