import { Link } from "react-router-dom";

import "../styles/dashboard-manager-bookings.css";

function buildLegacyResponseUrl(): string {
  const backendBase = String(
    import.meta.env.VITE_BACKEND_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "",
  ).replace(/\/$/, "");

  const configuredPath = String(
    import.meta.env.VITE_SELLER_RESPONSE_HTML_PATH ||
      "/seller-delivery-manager/bookings",
  ).trim();

  if (/^https?:\/\//i.test(configuredPath)) {
    return configuredPath;
  }

  const normalizedPath = configuredPath.startsWith("/")
    ? configuredPath
    : `/${configuredPath}`;

  return `${backendBase}${normalizedPath}`;
}

export function SellerResponseManagementBridgePage() {
  const legacyResponseUrl =
    buildLegacyResponseUrl();

  return (
    <main className="react-dashboard-page">
      <section className="manager-response-bridge">
        <span className="dashboard-eyebrow">
          Seller delivery manager
        </span>

        <h1>Seller Response Management</h1>

        <p>
          Open the existing seller-response centre to coordinate
          seller Accept or Reject decisions, rejection reasons,
          fines, and reassignment. Accepted bookings can then be
          grouped in the React multiple-booking assignment page.
        </p>

        <div className="dashboard-actions">
          <a
            className="dashboard-button primary"
            href={legacyResponseUrl}
          >
            Open Seller Response Centre
          </a>

          <Link
            className="dashboard-button secondary"
            to="/seller-delivery-manager/delivery-dispatch"
          >
            Assign Multiple Bookings
          </Link>

          <Link
            className="dashboard-button secondary"
            to="/dashboard"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="manager-response-note">
          <strong>Development configuration</strong>
          <p>
            Set VITE_BACKEND_BASE_URL to your FastAPI server and
            VITE_SELLER_RESPONSE_HTML_PATH to the existing HTML route
            when the backend and Vite run on different ports.
          </p>
        </div>
      </section>
    </main>
  );
}
