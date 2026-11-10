import type { NearbySummary, ShopLocation } from "../types/storefront";

interface LocationPanelProps {
  location: ShopLocation | null;
  summary: NearbySummary;
  radiusKm: number;
  loading: boolean;
  error: string;
  onUseCurrentLocation: () => void;
  onClearLocation: () => void;
}

export function LocationPanel({
  location,
  summary,
  radiusKm,
  loading,
  error,
  onUseCurrentLocation,
  onClearLocation,
}: LocationPanelProps) {
  return (
    <section className="location-panel" aria-live="polite">
      <div>
        <span className="eyebrow">Delivery availability</span>
        {location ? (
          <>
            <h2>Products available within {radiusKm.toFixed(1)} km</h2>
            <p>
              Using <strong>{location.name}</strong>. {summary.seller_count} nearby
              seller{summary.seller_count === 1 ? "" : "s"} currently have matching
              stock.
            </p>
            <div className="stat-row">
              <span>{summary.category_count} categories</span>
              <span>{summary.item_count} products</span>
              <span>{summary.available_unit_count} units</span>
              {summary.nearest_seller_distance_km !== null && (
                <span>
                  Nearest seller: {summary.nearest_seller_distance_km.toFixed(2)} km
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <h2>Use your current location to see nearby products</h2>
            <p>
              Only products stocked by approved sellers inside the delivery radius
              will be shown.
            </p>
          </>
        )}
        {error && <p className="status-error">{error}</p>}
      </div>

      <div className="location-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={onUseCurrentLocation}
          disabled={loading}
        >
          {loading ? "Getting location…" : "Use My Current Location"}
        </button>
        {location && (
          <button className="button button-light" type="button" onClick={onClearLocation}>
            Change Location
          </button>
        )}
      </div>
    </section>
  );
}
