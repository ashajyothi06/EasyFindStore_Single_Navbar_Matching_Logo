import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorText,
  isCsrfError,
  loadNearbyDiagnostics,
  syncNearbyInventory,
  type NearbyResponse,
} from "../services/nearbyFulfillmentApi";
import "../styles/nearby-fulfillment.css";

export function AdminNearbyDiagnosticsPage() {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("10");
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const response = await loadNearbyDiagnostics(
        Number(lat),
        Number(lng),
        Number(radius),
      );
      setData(response);
      setCsrfToken(response.csrf_token || "");
    } catch (error) {
      setNotice(errorText(error, "Unable to load diagnostics."));
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    if (!csrfToken) {
      setNotice("Run diagnostics first to obtain a security token.");
      return;
    }
    try {
      const response = await syncNearbyInventory(csrfToken);
      setNotice(response.message || "Inventory synchronized.");
    } catch (error) {
      if (isCsrfError(error)) return window.location.reload();
      setNotice(errorText(error, "Unable to synchronize inventory."));
    }
  }

  const report = data?.report || {};
  const sellers = report.sellers || [];

  return (
    <main className="fulfillment-page">
      <div className="fulfillment-container">
      <section className="fulfillment-heading">
        <div>
          <span className="fulfillment-eyebrow">Nearby seller diagnostics</span>
          <h1>Seller Eligibility and Inventory</h1>
          <p>Check seller distance, catalogue selection, positive inventory, and eligibility.</p>
        </div>
        <Link className="fulfillment-button secondary" to="/admin/order-s">Order Allocations</Link>
      </section>

      <form className="diagnostics-form" onSubmit={submit}>
        <input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="Latitude" required />
        <input value={lng} onChange={(event) => setLng(event.target.value)} placeholder="Longitude" required />
        <input value={radius} onChange={(event) => setRadius(event.target.value)} placeholder="Radius km" />
        <button className="fulfillment-button primary" disabled={loading} type="submit">
          {loading ? "Checking…" : "Run Diagnostics"}
        </button>
        <button className="fulfillment-button secondary" onClick={() => void sync()} type="button">
          Sync Seller Inventory
        </button>
      </form>

      {notice && <div className="fulfillment-notice">{notice}</div>}

      {data && (
        <>
          <section className="fulfillment-stats">
            <article><strong>{report.seller_count || 0}</strong><span>Sellers checked</span></article>
            <article><strong>{report.eligible_seller_count || 0}</strong><span>Eligible sellers</span></article>
            <article><strong>{report.active_admin_item_count || 0}</strong><span>Active items</span></article>
            <article><strong>{report.radius_km || 0} km</strong><span>Radius</span></article>
          </section>

          <section className="fulfillment-card table-card">
            <div className="fulfillment-table-wrap">
              <table className="fulfillment-table">
                <thead><tr><th>Seller</th><th>Distance</th><th>Selected</th><th>Available</th><th>Eligible</th><th>Reasons</th></tr></thead>
                <tbody>
                  {sellers.map((seller: any) => (
                    <tr key={seller.seller_id}>
                      <td><strong>{seller.business_name || seller.seller_name}</strong><small>{seller.seller_id}</small></td>
                      <td>{seller.distance_km ?? "—"} km</td>
                      <td>{seller.selected_item_count}</td>
                      <td>{seller.total_available_quantity}</td>
                      <td>{seller.eligible ? "Yes" : "No"}</td>
                      <td>{(seller.reasons || []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      </div>
    </main>
  );
}
