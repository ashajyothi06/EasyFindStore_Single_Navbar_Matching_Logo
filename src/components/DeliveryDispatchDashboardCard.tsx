import { Link } from "react-router-dom";

interface DeliveryDispatchDashboardCardProps {
  role: string;
  newBatchCount?: number;
}

export function DeliveryDispatchDashboardCard({
  role,
  newBatchCount = 0,
}: DeliveryDispatchDashboardCardProps) {
  const normalizedRole = role
    .trim()
    .toLowerCase();

  if (
    ![
      "admin",
      "seller_delivery_manager",
      "delivery",
    ].includes(normalizedRole)
  ) {
    return null;
  }

  const destination =
    normalizedRole === "admin"
      ? "/admin/delivery-dispatch"
      : normalizedRole ===
          "seller_delivery_manager"
        ? "/seller-delivery-manager/delivery-dispatch"
        : "/delivery/batches";

  return (
    <section className="dispatch-card dispatch-dashboard-card">
      <div>
        <span className="dispatch-eyebrow">
          Delivery dispatch
        </span>
        <h2>
          {normalizedRole === "delivery"
            ? "My Bulk Delivery Batches"
            : "Delivery Assignment Centre"}
        </h2>
        <p>
          {normalizedRole === "delivery"
            ? "Open assigned pickup and delivery routes, update progress, and track payout."
            : "Select accepted seller bookings, compare delivery people, create routes, and manage payouts."}
        </p>
      </div>

      <div className="dispatch-dashboard-actions">
        {newBatchCount > 0 && (
          <span className="dispatch-status assigned">
            {newBatchCount} new
          </span>
        )}

        <Link
          className="dispatch-button primary"
          to={destination}
        >
          Open Delivery Dispatch
        </Link>
      </div>
    </section>
  );
}
