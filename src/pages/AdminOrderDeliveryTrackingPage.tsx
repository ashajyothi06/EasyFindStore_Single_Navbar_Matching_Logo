import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_PREFIX = "/react/api/commerce";

type DeliveryItem = Record<string, any> & {
  order_id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  item_index?: number;
  item_id?: string;
  name?: string;
  quantity?: number;
  product_type?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_time_slot?: string;
  delivery_type?: string;
  promised_delivery_date?: string;
  delivery_status?: string;
  delivery_tracking_id: string;
  delivery_admin_note?: string;
};

interface TrackingResponse {
  success?: boolean;
  message?: string;
  delivery_items?: DeliveryItem[];
  count?: number;
  summary?: {
    total_items?: number;
    due_today?: number;
    delivered?: number;
    pending?: number;
    status_counts?: Record<string, number>;
  };
  allowed_statuses?: string[];
  timezone?: string;
  csrf_token?: string;
}

interface EditDraft {
  promised_delivery_date: string;
  delivery_status: string;
  delivery_admin_note: string;
}

const STYLES = `
  .delivery-admin{min-height:100vh;padding:28px;background:#f5f7f2;color:#202615;font-family:Inter,system-ui,sans-serif}
  .delivery-admin-container{width:min(1500px,100%);margin:0 auto}
  .delivery-admin-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
  .delivery-admin-eyebrow{color:#65703f;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
  .delivery-admin h1{margin:5px 0 7px;font-size:clamp(1.8rem,4vw,3rem)}
  .delivery-admin-heading p{margin:0;color:#68705d}
  .delivery-admin-button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 15px;border:1px solid #d7dccb;border-radius:11px;background:#fff;color:#30371f;font-weight:850;text-decoration:none;cursor:pointer}
  .delivery-admin-button.primary{border-color:#33371b;background:#33371b;color:#fff}
  .delivery-admin-button:disabled{opacity:.55;cursor:not-allowed}
  .delivery-admin-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
  .delivery-admin-stat{padding:17px;border:1px solid #dfe4d8;border-radius:16px;background:#fff;box-shadow:0 10px 28px rgba(51,55,27,.05)}
  .delivery-admin-stat strong{display:block;font-size:1.45rem;color:#33371b}.delivery-admin-stat span{color:#727967;font-size:.78rem}
  .delivery-admin-filters{display:grid;grid-template-columns:1.4fr repeat(5,minmax(135px,1fr)) auto;gap:10px;margin-bottom:18px;padding:15px;border:1px solid #dfe4d8;border-radius:16px;background:#fff}
  .delivery-admin-filters label{display:grid;gap:5px;color:#69705e;font-size:.7rem;font-weight:850;text-transform:uppercase}
  .delivery-admin input,.delivery-admin select,.delivery-admin textarea{width:100%;min-height:40px;padding:9px 10px;border:1px solid #d7dccb;border-radius:9px;background:#fff;color:#242b17;font:inherit;box-sizing:border-box}
  .delivery-admin textarea{min-height:64px;resize:vertical}
  .delivery-admin-notice{margin-bottom:15px;padding:12px 14px;border-radius:11px;background:#e9f5e7;color:#285d2c;font-weight:750}.delivery-admin-notice.error{background:#fff0f0;color:#9b2525}
  .delivery-admin-table-wrap{overflow:auto;border:1px solid #dfe4d8;border-radius:16px;background:#fff}
  .delivery-admin-table{width:100%;min-width:1250px;border-collapse:collapse}
  .delivery-admin-table th{padding:12px;background:#33371b;color:#fff;text-align:left;font-size:.7rem;text-transform:uppercase}
  .delivery-admin-table td{padding:12px;border-top:1px solid #edf0e9;vertical-align:top;font-size:.82rem}
  .delivery-admin-table strong,.delivery-admin-table small{display:block}.delivery-admin-table small{margin-top:3px;color:#747b69}
  .delivery-admin-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.delivery-admin-tag{padding:4px 7px;border-radius:999px;background:#edf3e8;color:#42522e;font-size:.65rem;font-weight:800}.delivery-admin-tag.time{border:1px solid #add4b4;background:#e2f3e4;color:#216037}
  .delivery-admin-editor{display:grid;grid-template-columns:145px 150px minmax(190px,1fr) auto;gap:7px;min-width:600px}.delivery-admin-editor .delivery-admin-button{align-self:start}
  .delivery-admin-empty{padding:35px;text-align:center;color:#747b69}
  @media(max-width:1100px){.delivery-admin-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.delivery-admin-filters label:first-child{grid-column:span 2}.delivery-admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:650px){.delivery-admin{padding:18px 12px}.delivery-admin-heading{flex-direction:column}.delivery-admin-heading .delivery-admin-button{width:100%}.delivery-admin-filters{grid-template-columns:1fr}.delivery-admin-filters label:first-child{grid-column:auto}.delivery-admin-stats{grid-template-columns:1fr 1fr}}
`;

function apiUrl(path: string): string {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function title(value: unknown): string {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function selectedTimes(item: DeliveryItem): string[] {
  const supplied = item.customer_selected_delivery_time_slots || item.selected_delivery_time_slots || [];
  if (Array.isArray(supplied) && supplied.length) {
    return [...new Set(supplied.map(String).filter((slot) => ["morning", "evening"].includes(slot)))];
  }
  if (item.delivery_time_slot === "both") return ["morning", "evening"];
  return ["morning", "evening"].includes(String(item.delivery_time_slot))
    ? [String(item.delivery_time_slot)]
    : [];
}

function speedLabel(value: unknown): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return title(value);
}

function initialDraft(item: DeliveryItem): EditDraft {
  return {
    promised_delivery_date: String(item.promised_delivery_date || ""),
    delivery_status: String(item.delivery_status || "scheduled"),
    delivery_admin_note: String(item.delivery_admin_note || ""),
  };
}

export function AdminOrderDeliveryTrackingPage() {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [speedFilter, setSpeedFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl(`${API_PREFIX}/admin/delivery-orders`), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as TrackingResponse;
      if (response.status === 401) {
        window.location.assign("/react/login?next=/admin/order-deliveries");
        return;
      }
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || "Unable to load delivery tracking.");
      }
      setData(payload);
      setDrafts(
        Object.fromEntries(
          (payload.delivery_items || []).map((item) => [
            item.delivery_tracking_id,
            initialDraft(item),
          ]),
        ),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load delivery tracking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const items = data?.delivery_items || [];
  const productOptions = useMemo(
    () => [...new Set(items.map((item) => String(item.product_type || "Products")))].sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const times = selectedTimes(item);
      if (dateFilter && item.promised_delivery_date !== dateFilter) return false;
      if (statusFilter !== "all" && item.delivery_status !== statusFilter) return false;
      if (timeFilter !== "all" && !times.includes(timeFilter)) return false;
      if (speedFilter !== "all" && item.delivery_type !== speedFilter) return false;
      if (productFilter !== "all" && String(item.product_type || "Products") !== productFilter) return false;
      if (!query) return true;
      return [item.order_number, item.customer_name, item.customer_phone, item.name, item.item_id]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [dateFilter, items, productFilter, search, speedFilter, statusFilter, timeFilter]);

  function changeDraft(trackingId: string, field: keyof EditDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [trackingId]: {
        ...(current[trackingId] || { promised_delivery_date: "", delivery_status: "scheduled", delivery_admin_note: "" }),
        [field]: value,
      },
    }));
  }

  async function save(item: DeliveryItem) {
    const trackingId = item.delivery_tracking_id;
    const draft = drafts[trackingId] || initialDraft(item);
    if (!data?.csrf_token) return;
    setWorking(trackingId);
    setNotice("");
    setError("");
    try {
      const body = new URLSearchParams({
        ...draft,
        csrf_token: data.csrf_token,
      });
      const response = await fetch(
        apiUrl(`${API_PREFIX}/admin/delivery-orders/${encodeURIComponent(item.order_id)}/items/${encodeURIComponent(trackingId)}`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-CSRF-Token": data.csrf_token,
          },
          body: body.toString(),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as TrackingResponse;
      if (response.status === 403) {
        window.location.reload();
        return;
      }
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || "Unable to update delivery item.");
      }
      setNotice(payload.message || "Delivery item updated.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update delivery item.");
    } finally {
      setWorking("");
    }
  }

  const summary = data?.summary || {};

  return (
    <main className="delivery-admin">
      <style>{STYLES}</style>
      <div className="delivery-admin-container">
        <section className="delivery-admin-heading">
          <div>
            <span className="delivery-admin-eyebrow">Admin delivery control</span>
            <h1>Order Delivery Tracking</h1>
            <p>Track every item, change promised dates, and record delivery completion in Indian time.</p>
          </div>
          <Link className="delivery-admin-button" to="/admin">Back to Admin</Link>
        </section>

        <section className="delivery-admin-stats">
          <article className="delivery-admin-stat"><strong>{summary.total_items || 0}</strong><span>Total delivery items</span></article>
          <article className="delivery-admin-stat"><strong>{summary.due_today || 0}</strong><span>Due today (IST)</span></article>
          <article className="delivery-admin-stat"><strong>{summary.pending || 0}</strong><span>Pending delivery</span></article>
          <article className="delivery-admin-stat"><strong>{summary.delivered || 0}</strong><span>Delivered</span></article>
        </section>

        <section className="delivery-admin-filters">
          <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, customer, phone or item" /></label>
          <label>Delivery date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
          <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{(data?.allowed_statuses || []).map((status) => <option value={status} key={status}>{title(status)}</option>)}</select></label>
          <label>Selected time<select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}><option value="all">All times</option><option value="morning">Morning</option><option value="evening">Evening</option></select></label>
          <label>Delivery speed<select value={speedFilter} onChange={(event) => setSpeedFilter(event.target.value)}><option value="all">All speeds</option><option value="instant_delivery">Instant Delivery</option><option value="one_day_delivery">One-Day Delivery</option></select></label>
          <label>Product type<select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option value="all">All products</option>{productOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <button className="delivery-admin-button" type="button" onClick={() => { setSearch(""); setDateFilter(""); setStatusFilter("all"); setTimeFilter("all"); setSpeedFilter("all"); setProductFilter("all"); }}>Clear</button>
        </section>

        {notice && <div className="delivery-admin-notice">{notice}</div>}
        {error && <div className="delivery-admin-notice error">{error}</div>}

        <div className="delivery-admin-table-wrap">
          {loading ? <div className="delivery-admin-empty">Loading delivery items…</div> : filteredItems.length ? (
            <table className="delivery-admin-table">
              <thead><tr><th>Order / Customer</th><th>Item and Plan</th><th>Current Tracking</th><th>Admin Update</th></tr></thead>
              <tbody>
                {filteredItems.map((item) => {
                  const draft = drafts[item.delivery_tracking_id] || initialDraft(item);
                  return (
                    <tr key={item.delivery_tracking_id}>
                      <td><strong>{item.order_number}</strong><small>{item.customer_name || "Customer"}</small><small>{item.customer_phone || "No phone"}</small></td>
                      <td><strong>{item.name || item.item_id}</strong><small>Quantity {item.quantity || 1}</small><div className="delivery-admin-tags"><span className="delivery-admin-tag">Product: {item.product_type || "Products"}</span>{selectedTimes(item).map((slot) => <span className="delivery-admin-tag time" key={slot}>✓ {title(slot)}</span>)}<span className="delivery-admin-tag">{speedLabel(item.delivery_type)}</span></div></td>
                      <td><strong>{item.promised_delivery_date || "Not scheduled"}</strong><small>{title(item.delivery_status || "scheduled")}</small>{item.delivery_admin_note && <small>Note: {item.delivery_admin_note}</small>}</td>
                      <td><div className="delivery-admin-editor"><input aria-label="Promised delivery date" type="date" value={draft.promised_delivery_date} onChange={(event) => changeDraft(item.delivery_tracking_id, "promised_delivery_date", event.target.value)} /><select aria-label="Delivery status" value={draft.delivery_status} onChange={(event) => changeDraft(item.delivery_tracking_id, "delivery_status", event.target.value)}>{(data?.allowed_statuses || []).map((status) => <option value={status} key={status}>{title(status)}</option>)}</select><textarea aria-label="Admin note" value={draft.delivery_admin_note} placeholder="Reason for delay or reschedule" onChange={(event) => changeDraft(item.delivery_tracking_id, "delivery_admin_note", event.target.value)} /><button className="delivery-admin-button primary" type="button" disabled={working === item.delivery_tracking_id} onClick={() => void save(item)}>{working === item.delivery_tracking_id ? "Saving…" : "Save"}</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="delivery-admin-empty">No delivery items match these filters.</div>}
        </div>
      </div>
    </main>
  );
}
