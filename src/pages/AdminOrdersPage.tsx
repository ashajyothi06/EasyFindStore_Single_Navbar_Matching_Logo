import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loadAdminOrders,
  type StoreOrder,
  type StoreOrderSummary,
} from "../services/adminOrdersApi";
import {
  dateKey,
  dayDiff,
  dueLabel,
  readableDate,
  statusText,
} from "../lib/orderDates";
import "../styles/admin-orders-queue.css";

/**
 * Keeps the existing page design and CSS; only page gutters and the optional
 * pager/loading state use local styles.
 */
const ADMIN_ORDERS_PADDING_CSS = `
  .admin-queue-page {
    --admin-queue-page-gutter: clamp(18px, 2.4vw, 48px);
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: var(--admin-queue-page-gutter) !important;
    padding-right: var(--admin-queue-page-gutter) !important;
    box-sizing: border-box;
  }
  .admin-queue-page > .admin-queue-heading,
  .admin-queue-page > .admin-queue-stats,
  .admin-queue-page > .admin-queue-filters,
  .admin-queue-page > .admin-queue-filter-end,
  .admin-queue-page > .admin-queue-table-wrap,
  .admin-queue-page > .admin-queue-pagination {
    max-width: none !important;
    min-width: 0;
    margin-left: 0;
    margin-right: 0;
    box-sizing: border-box;
  }
  .admin-queue-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 0 20px;
    font-size: 14px;
  }
  .admin-queue-pagination-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .admin-queue-pagination button {
    padding: 7px 12px;
    border: 1px solid currentColor;
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .admin-queue-pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .admin-queue-refresh:disabled {
    cursor: wait;
    opacity: 0.7;
  }
  @media (min-width: 768px) and (max-width: 1199px) {
    .admin-queue-page { --admin-queue-page-gutter: 20px; }
  }
  @media (max-width: 767px) {
    .admin-queue-page { --admin-queue-page-gutter: 16px; }
  }
`;

const REFRESH_INTERVAL_MS = 20_000;
const PAGE_SIZE = 40;
const ORDER_STATUSES = [
  "placed", "confirmed", "processing", "packed", "shipped",
  "out_for_delivery", "delivered", "cancelled", "payment_pending",
];
const moneyFormatter = new Intl.NumberFormat("en-IN");

const blank: StoreOrderSummary = {
  total: 0,
  new_count: 0,
  active: 0,
  delivered: 0,
  cancelled: 0,
  payment_pending: 0,
};

const complete = (status: string) => status === "delivered" || status === "cancelled";

/** Compare only fields this page actually displays, sorts or filters by. */
function sameVisibleOrders(a: StoreOrder[], b: StoreOrder[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.order_number !== y.order_number ||
      x.created_at !== y.created_at ||
      x.customer_name !== y.customer_name ||
      x.user_email !== y.user_email ||
      x.status !== y.status ||
      x.admin_seen_at !== y.admin_seen_at ||
      x.item_count !== y.item_count ||
      x.items?.length !== y.items?.length ||
      x.total !== y.total ||
      x.estimated_delivery_date !== y.estimated_delivery_date ||
      x.delivered_at !== y.delivered_at ||
      x.delivery_address?.postal_code !== y.delivery_address?.postal_code
    ) return false;
  }
  return true;
}

function sameSummary(a: StoreOrderSummary, b: StoreOrderSummary): boolean {
  return (
    a.total === b.total &&
    a.new_count === b.new_count &&
    a.active === b.active &&
    a.delivered === b.delivered &&
    a.cancelled === b.cancelled &&
    a.payment_pending === b.payment_pending
  );
}

type PreparedOrder = {
  order: StoreOrder;
  created: string;
  eta: string;
  days: number | null;
  rank: number;
  isComplete: boolean;
  deliveredLate: boolean;
  searchText: string;
};

function prepareOrder(order: StoreOrder): PreparedOrder {
  const isComplete = complete(order.status);
  const days = dayDiff(order.estimated_delivery_date);
  const created = dateKey(order.created_at) || "";
  const eta = order.estimated_delivery_date || "";
  const deliveredDay = order.delivered_at ? dateKey(order.delivered_at) : "";
  const expectedDay = order.estimated_delivery_date ? dateKey(order.estimated_delivery_date) : "";

  let rank = 4;
  if (isComplete) rank = 50;
  else if (days !== null && days < 0) rank = 0;
  else if (days === 0) rank = 1;
  else if (days !== null && days <= 2) rank = 2;
  else if (order.status === "placed") rank = 3;

  return {
    order,
    created,
    eta,
    days,
    rank,
    isComplete,
    deliveredLate: order.status === "delivered" && !!deliveredDay && !!expectedDay && deliveredDay > expectedDay,
    searchText: [
      order.order_number,
      order.customer_name,
      order.user_email,
      order.id,
      order.delivery_address?.postal_code,
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

/** Pre-rendering at most PAGE_SIZE memoized rows keeps long queues responsive. */
const OrderRow = memo(function OrderRow({ item }: { item: PreparedOrder }) {
  const o = item.order;
  const url = `/admin/orders/${encodeURIComponent(o.id)}`;
  const rowClass = item.rank === 0 ? "admin-queue-overdue" : item.rank === 1 ? "admin-queue-today" : "";
  const dueClass = item.rank === 0 ? "overdue" : item.rank === 1 ? "today" : "";

  return (
    <tr className={rowClass}>
      <td>
        <Link to={url} className="admin-queue-id">
          {o.order_number || o.id.slice(0, 8)}
        </Link>
        {!o.admin_seen_at && o.status === "placed" && <span className="admin-queue-new">New</span>}
      </td>
      <td>{readableDate(o.created_at)}</td>
      <td>
        <strong>{o.customer_name || "Customer"}</strong>
        <small>{o.user_email || ""}</small>
      </td>
      <td>{o.item_count || o.items?.length || 0}</td>
      <td><b>₹{moneyFormatter.format(Number(o.total || 0))}</b></td>
      <td>{readableDate(o.estimated_delivery_date)}</td>
      <td>
        <span className={`admin-queue-due ${dueClass}`}>
          {dueLabel(o.estimated_delivery_date, o.status)}
        </span>
      </td>
      <td>{statusText(o.status)}</td>
      <td><Link className="admin-queue-open" to={url}>View details</Link></td>
    </tr>
  );
});

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [summary, setSummary] = useState<StoreOrderSummary>(blank);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [due, setDue] = useState("active");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("priority");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [todayMarker, setTodayMarker] = useState(() => new Date().toDateString());

  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async (manual = false) => {
    // Prevent overlapping network requests and unnecessary polling of hidden tabs.
    if (!mountedRef.current || inFlightRef.current) return;
    if (!manual && document.visibilityState === "hidden") return;

    inFlightRef.current = true;
    if (manual) setManualRefreshing(true);

    try {
      const result = await loadAdminOrders();
      if (!mountedRef.current) return;
      setOrders((old) => sameVisibleOrders(old, result.orders) ? old : result.orders);
      setSummary((old) => sameSummary(old, result.summary) ? old : result.summary);
      setError((old) => old ? "" : old);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      if (/unauthorized|login|authenticat/i.test(msg)) {
        navigate("/react/login?next=/admin/orders", { replace: true });
      } else {
        setError(msg);
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        if (manual) setManualRefreshing(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      // Keep overdue/today priorities accurate when the calendar day changes.
      const today = new Date().toDateString();
      setTodayMarker((old) => old === today ? old : today);
      void refresh();
    }, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  // Keeps typing responsive, even when thousands of orders are present.
  const deferredSearch = useDeferredValue(search);
  const query = deferredSearch.trim().toLowerCase();

  // Each date, priority and searchable string is computed once per data change,
  // instead of repeatedly inside the filter, sort, and table JSX.
  const prepared = useMemo(() => orders.map(prepareOrder), [orders, todayMarker]);

  const rows = useMemo(() => {
    const filtered = prepared.filter((item) => {
      const o = item.order;
      if (from && (!item.created || item.created < from)) return false;
      if (to && (!item.created || item.created > to)) return false;
      if (status === "new" && (o.admin_seen_at || o.status !== "placed")) return false;
      if (status !== "all" && status !== "new" && o.status !== status) return false;

      if (due === "active" && item.isComplete) return false;
      if (due === "overdue" && (item.isComplete || item.days === null || item.days >= 0)) return false;
      if (due === "today" && (item.isComplete || item.days !== 0)) return false;
      if (due === "soon" && (item.isComplete || item.days === null || item.days < 0 || item.days > 2)) return false;
      if (due === "unplanned" && (item.isComplete || item.days !== null)) return false;
      if (due === "delivered" && o.status !== "delivered") return false;
      if (due === "late_delivered" && !item.deliveredLate) return false;
      return !query || item.searchText.includes(query);
    });

    filtered.sort((a, b) => {
      if (sort === "priority") {
        const rankDiff = a.rank - b.rank;
        if (rankDiff) return rankDiff;
      }
      if (sort === "eta") {
        const etaA = a.eta || "9999";
        const etaB = b.eta || "9999";
        return etaA < etaB ? -1 : etaA > etaB ? 1 : 0;
      }
      const createdA = String(a.order.created_at || "");
      const createdB = String(b.order.created_at || "");
      if (sort === "oldest") return createdA < createdB ? -1 : createdA > createdB ? 1 : 0;
      return createdA > createdB ? -1 : createdA < createdB ? 1 : 0;
    });
    return filtered;
  }, [prepared, query, status, due, from, to, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const first = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = useMemo(() => rows.slice(first, first + PAGE_SIZE), [rows, first]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("all");
    setDue("all");
    setFrom("");
    setTo("");
    setSort("priority");
    setPage(1);
  }, []);

  return (
    <main className="admin-queue-page">
      <style>{ADMIN_ORDERS_PADDING_CSS}</style>

      <header className="admin-queue-heading">
        <div>
          <span className="admin-queue-kicker">Admin / Order management</span>
          <h1>Customer Orders</h1>
          <p>One row per order. Prioritize overdue and upcoming deliveries, then open an order to manage fulfillment.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={manualRefreshing}
          className="admin-queue-refresh"
        >
          {manualRefreshing ? "Refreshing…" : "Refresh orders"}
        </button>
      </header>

      <section className="admin-queue-stats">
        {[
          ["New", summary.new_count],
          ["In progress", summary.active],
          ["Delivered", summary.delivered],
          ["All orders", summary.total],
        ].map(([label, value]) => (
          <div key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="admin-queue-filters" aria-label="Filter orders">
        <label>
          Search
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Order, customer, phone or PIN"
          />
        </label>
        <label>
          Order status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="new">Unreviewed</option>
            {ORDER_STATUSES.map((x) => <option value={x} key={x}>{statusText(x)}</option>)}
          </select>
        </label>
        <label>
          Delivery priority
          <select value={due} onChange={(e) => { setDue(e.target.value); setPage(1); }}>
            <option value="active">Active orders</option>
            <option value="all">All orders</option>
            <option value="overdue">Overdue deliveries</option>
            <option value="today">Due today</option>
            <option value="soon">Due within 2 days</option>
            <option value="unplanned">Date not set</option>
            <option value="delivered">Delivered</option>
            <option value="late_delivered">Delivered late</option>
          </select>
        </label>
        <label>
          Placed from
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label>
          Placed through
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="priority">Urgent first</option>
            <option value="eta">Earliest delivery</option>
            <option value="newest">Newest orders</option>
            <option value="oldest">Oldest orders</option>
          </select>
        </label>
      </section>

      <div className="admin-queue-filter-end">
        <span>{rows.length} matching orders</span>
        <button type="button" onClick={clearFilters}>Clear filters</button>
      </div>

      {error && <p role="alert" className="admin-queue-error">{error}</p>}

      <div className="admin-queue-table-wrap">
        <table className="admin-queue-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Placed</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Expected delivery</th>
              <th>Priority</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((item) => <OrderRow key={item.order.id} item={item} />)}
          </tbody>
        </table>
        {initialLoading && !rows.length && <p className="admin-queue-empty" role="status">Loading orders…</p>}
        {!initialLoading && !rows.length && <p className="admin-queue-empty">No orders match these filters.</p>}
      </div>

      {rows.length > PAGE_SIZE && (
        <nav className="admin-queue-pagination" aria-label="Orders pagination">
          <span>Showing {first + 1}–{Math.min(first + PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div className="admin-queue-pagination-controls">
            <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </nav>
      )}
    </main>
  );
}
