import { Link } from "react-router-dom";

interface DeliveryVerificationDashboardCardProps {
  status?: string;
}

function label(value: unknown): string {
  return String(value || "PROFILE_APPROVED")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export function DeliveryVerificationDashboardCard({
  status = "PROFILE_APPROVED",
}: DeliveryVerificationDashboardCardProps) {
  return (
    <section className="dv-card dv-dashboard-card">
      <div>
        <span className="dv-eyebrow">
          Delivery verification
        </span>
        <h2>Delivery Verification</h2>
        <p>
          Current status:{" "}
          <strong>{label(status)}</strong>
        </p>
      </div>

      <Link
        className="dv-button primary"
        to="/delivery/verification"
      >
        Open Aadhaar and Bank Verification
      </Link>
    </section>
  );
}
