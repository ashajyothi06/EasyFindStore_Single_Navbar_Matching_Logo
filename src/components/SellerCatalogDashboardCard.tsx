import { Link } from "react-router-dom";

import "../styles/seller-catalog-react.css";

interface SellerCatalogDashboardCardProps {
  enabled?: boolean;
  selectedItemCount?: number;
  managePath?: string;
}

export function SellerCatalogDashboardCard({
  enabled = true,
  selectedItemCount = 0,
  managePath = "/seller/catalog-selection",
}: SellerCatalogDashboardCardProps) {
  return (
    <section className="seller-catalogue-navigation">
      <div>
        <span className="eyebrow">
          Seller product catalogue
        </span>

        <h2>Select the categories and items you can sell</h2>

        <p>
          Choose from the active categories and sub-items created by
          the administrator. You can select, unselect, and update your
          seller catalogue at any time.
        </p>

        <div className="seller-catalogue-stat">
          <span aria-hidden="true">✓</span>
          <span>
            {selectedItemCount} item
            {selectedItemCount === 1 ? "" : "s"} currently selected
          </span>
        </div>

        <div className="seller-catalog-dashboard-actions">
          {enabled ? (
            <>
              <Link className="button primary" to={managePath}>
                Select Categories &amp; Sub-Items
              </Link>

              <Link className="button secondary" to={managePath}>
                Update Current Selection
              </Link>
            </>
          ) : (
            <span className="seller-catalog-disabled-badge">
              Seller catalogue routes are not registered
            </span>
          )}
        </div>
      </div>

      <div
        className="seller-catalogue-icon"
        aria-hidden="true"
      >
        🧃
      </div>
    </section>
  );
}
