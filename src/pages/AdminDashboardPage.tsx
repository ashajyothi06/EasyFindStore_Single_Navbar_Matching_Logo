import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadAdminCatalog, loadAdminDashboard } from "../services/coreCommerceApi";
import { loadAdminOrders, type StoreOrder, type StoreOrderSummary } from "../services/adminOrdersApi";
import "../styles/admin-ecommerce.css";

type DashboardNumbers = { products: number; categories: number; customers: number };
const initialTotals: DashboardNumbers = { products: 0, categories: 0, customers: 0 };
const initialSummary: StoreOrderSummary = { total: 0, new_count: 0, active: 0, delivered: 0, cancelled: 0, payment_pending: 0 };
const rupees = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const titleCase = (value: unknown) => String(value || "-").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [totals, setTotals] = useState(initialTotals);
  const [summary, setSummary] = useState(initialSummary);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportTotals,setSupportTotals]=useState({open_complaints:0,new_enquiries:0});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [data, catalogue, orderData] = await Promise.all([
          loadAdminDashboard(), loadAdminCatalog(), loadAdminOrders(),
        ]);
        if (!active) return;
        setTotals({
          products: Number(catalogue.summary?.item_count || 0),
          categories: Number(catalogue.summary?.category_count || 0),
          customers: Number(data.accounts?.filter(x => x.role === "user" && !x.is_deleted).length || data.account_summary?.users || 0),
        });
        setSummary(orderData.summary); setOrders(orderData.orders.slice(0, 8)); setError("");
        try { const response = await fetch("/react/api/admin/support/summary",{credentials:"include",cache:"no-store"}); if (response.ok) {const support=await response.json();if(active&&support.success)setSupportTotals({open_complaints:Number(support.open_complaints||0),new_enquiries:Number(support.new_enquiries||0)});}} catch { /* Do not block order dashboard if support API is unavailable. */ }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Unable to load admin dashboard";
          if (/login|unauthori[sz]ed|authenticat/i.test(message)) navigate("/react/login?next=/admin", { replace: true });
          else setError(message);
        }
      } finally { if (active) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 25000);
    return () => { active = false; window.clearInterval(timer); };
  }, [navigate]);

  return <main className="ec-react-page">
    <div className="ec-react-heading"><div><span className="ec-react-eyebrow">Store administration</span><h1>Admin Dashboard</h1><p>Manage customer orders, products, categories and delivery availability from one place.</p></div>
      <Link className="ec-react-primary" to="/admin/orders">Customer Orders {summary.new_count > 0 && <span className="ec-react-notification">{summary.new_count} new</span>}</Link>
    </div>
    {error && <div role="alert" className="ec-react-error">{error} <button onClick={() => window.location.reload()}>Retry</button></div>}
    <nav className="ec-react-links" aria-label="Admin features">
      <Link to="/admin/profile"><span>👤</span> My Profile</Link>
      <Link to="/admin/orders"><span>📦</span> Customer Orders</Link>
      <Link to="/admin/catalog"><span>🛍️</span> Manage Products</Link>
      <Link to="/admin/catalog/categories/new"><span>📁</span> Create Category</Link>
      <Link to="/admin/customers"><span>👤</span> Customers</Link>
      <Link to="/admin/complaints"><span>📨</span> Complaints {supportTotals.open_complaints>0&&`(${supportTotals.open_complaints})`}</Link>
      <Link to="/admin/enquiries"><span>✉️</span> Contact Enquiries {supportTotals.new_enquiries>0&&`(${supportTotals.new_enquiries})`}</Link>
      <Link to="/admin/offers"><span>🏷️</span> Product & Category Offers</Link>
      <Link to="/admin/offers?tab=coupons"><span>🎟️</span> Coupon Management</Link>
      <Link to="/admin/service-areas"><span>📍</span> Delivery Area Rules</Link>
      <Link to="/admin/delivery-pricing"><span>🚚</span> Delivery Charges</Link>
      <Link to="/admin/payment-transactions"><span>💳</span> Payment Transactions</Link>
    </nav>
    <section className="ec-react-stats" aria-label="Store summary">
      {[
        ["New Orders", summary.new_count], ["Orders In Progress", summary.active], ["Delivered", summary.delivered],
        ["All Orders", summary.total], ["Active Complaints",supportTotals.open_complaints],["New Enquiries",supportTotals.new_enquiries], ["Categories", totals.categories], ["Products", totals.products], ["Customers", totals.customers],
      ].map(([label, value]) => <article key={label}><strong>{loading ? "…" : value}</strong><span>{label}</span></article>)}
    </section>
    <section className="ec-react-panel"><div className="ec-react-panel-title"><h2>Latest Customer Orders</h2><Link to="/admin/orders">See all orders</Link></div>
      {orders.length ? <div className="ec-react-table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Created</th><th></th></tr></thead>
      <tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.order_number || order.id.slice(0, 8)}</strong>{!order.admin_seen_at && order.status === "placed" && <span className="ec-react-new">New</span>}</td><td>{order.customer_name || order.user_email}</td><td>{rupees(order.total)}</td><td>{titleCase(order.payment_status)}</td><td><span className="ec-react-pill">{titleCase(order.status)}</span></td><td>{new Date(order.created_at).toLocaleString("en-IN")}</td><td><Link to="/admin/orders">Manage</Link></td></tr>)}</tbody></table></div> : <div className="ec-react-empty">{loading ? "Loading orders…" : "New customer orders will appear here automatically."}</div>}
    </section>
  </main>;
}
