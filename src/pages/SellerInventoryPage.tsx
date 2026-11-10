import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorText,
  isAuthenticationError,
  isCsrfError,
  loadSellerInventory,
  type InventoryResponse,
  type InventoryRow,
  updateSellerInventory,
} from "../services/nearbyFulfillmentApi";
import "../styles/nearby-fulfillment.css"; 

function value(row: InventoryRow, key: string, fallback = ""): string {
  return String(row.item?.[key] ?? fallback);
}

export function SellerInventoryPage() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await loadSellerInventory();
      setData(response);
      setRows(response.inventory_rows || []);
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign("/react/login?next=/seller/inventory");
        return;
      }
      setNotice(errorText(error, "Unable to load inventory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateRow(index: number, patch: Partial<InventoryRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data?.csrf_token) return;

    setSaving(true);
    setNotice("");

    try {
      const response = await updateSellerInventory(data.csrf_token, rows);
      setData(response);
      setRows(response.inventory_rows || rows);
      setNotice(response.message || "Inventory updated successfully.");
      window.dispatchEvent(new CustomEvent("seller-inventory-updated"));
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }
      setNotice(errorText(error, "Unable to update inventory."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="fulfillment-page"><div className="fulfillment-loading">Loading inventory…</div></main>;
  }

  const summary = data?.inventory_summary || {};

  return (
    <main className="fulfillment-page">
      <div className="fulfillment-container">
        <section className="fulfillment-heading">
          <div>
            <span className="fulfillment-eyebrow">Nearby fulfilment</span>
            <h1>Seller Inventory</h1>
            <p>Maintain available quantities for the catalogue items selected by your business.</p>
          </div>
          <Link className="fulfillment-button secondary" to="/dashboard">Dashboard</Link>
        </section>

        {notice && <div className="fulfillment-notice">{notice}</div>}

        <section className="fulfillment-stats">
          <article><strong>{summary.selected_item_count || 0}</strong><span>Selected items</span></article>
          <article><strong>{summary.available_item_count || 0}</strong><span>Available items</span></article>
          <article><strong>{summary.available_unit_count || 0}</strong><span>Available units</span></article>
          <article><strong>{summary.reserved_unit_count || 0}</strong><span>Reserved units</span></article>
        </section>

        <form onSubmit={submit}>
          <section className="fulfillment-card table-card">
            <div className="fulfillment-table-wrap">
              <table className="fulfillment-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Available</th>
                    <th>Reserved</th>
                    <th>Sold</th>
                    <th>Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.item_id}>
                      <td>
                        <strong>{value(row, "name", row.item_id)}</strong>
                        <small>{value(row, "size", value(row, "unit_label"))}</small>
                      </td>
                      <td>{String(row.category?.name || "—")}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          value={row.available_quantity}
                          onChange={(event) =>
                            updateRow(index, {
                              available_quantity: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td>{row.reserved_quantity}</td>
                      <td>{row.sold_quantity}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.is_available}
                          onChange={(event) =>
                            updateRow(index, { is_available: event.target.checked })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr><td colSpan={6}>No selected catalogue items are available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="fulfillment-actions">
            <button className="fulfillment-button primary" disabled={saving} type="submit">
              {saving ? "Saving…" : "Save Inventory"}
            </button>
            <Link className="fulfillment-button secondary" to="/seller/catalog-selection">
              Manage Catalogue Selection
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
