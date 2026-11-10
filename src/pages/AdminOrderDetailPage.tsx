import { RefundAdminPanel } from "../components/RefundAdminPanel";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  loadAdminOrder,
  markOrderReviewed,
  updateAdminOrderStatus,
  type StoreOrder,
  type StoreOrderStatus,
} from "../services/adminOrdersApi";
import { dueLabel, readableDate, statusText, todayIST } from "../lib/orderDates";
import "../styles/admin-orders-queue.css";

// Cancellation appears in the SAME selector as every delivery transition.
// Delivered orders require confirmation of physical return before cancellation.
const flow: Record<string, StoreOrderStatus[]> = {
  payment_pending: ["cancelled"],
  placed: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "out_for_delivery", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["cancelled"],
};
const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Match the EasyFindStore header and public pages' horizontal gutters.
 * This stylesheet is deliberately limited to page width and side padding;
 * the original admin-orders-queue.css controls all other visual styling.
 */
const ADMIN_ORDER_DETAIL_SPACING_STYLES = `
  main.admin-queue-page.rudra-admin-order-detail-wide {
    --rudra-admin-detail-gutter: clamp(18px, 2.4vw, 48px);
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: var(--rudra-admin-detail-gutter) !important;
    padding-right: var(--rudra-admin-detail-gutter) !important;
    box-sizing: border-box;
  }

  main.admin-queue-page.rudra-admin-order-detail-wide > .admin-queue-heading,
  main.admin-queue-page.rudra-admin-order-detail-wide > .admin-detail-layout,
  main.admin-queue-page.rudra-admin-order-detail-wide > .admin-queue-error {
    width: 100%;
    max-width: none;
    min-width: 0;
    margin-left: 0;
    margin-right: 0;
    box-sizing: border-box;
  }

  @media (min-width: 769px) and (max-width: 1100px) {
    main.admin-queue-page.rudra-admin-order-detail-wide {
      --rudra-admin-detail-gutter: 20px;
    }
  }

  @media (max-width: 768px) {
    main.admin-queue-page.rudra-admin-order-detail-wide {
      --rudra-admin-detail-gutter: 16px;
    }
  }
`;

export function AdminOrderDetailPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [csrf, setCsrf] = useState("");
  const [status, setStatus] = useState<StoreOrderStatus | "">("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelMethod, setCancelMethod] = useState<"original_payment_method" | "bank_transfer">("original_payment_method");
  const [requestBank, setRequestBank] = useState(false);
  const [refundDue, setRefundDue] = useState("");
  const [recallConfirmed, setRecallConfirmed] = useState(false);
  const [returnReceived, setReturnReceived] = useState(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const result = await loadAdminOrder(orderId);
      setOrder(result.order);
      setCsrf(result.csrf_token);
      setDate((previous) => previous || result.order.estimated_delivery_date || "");
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load order";
      if (/login|authenticat|unauthori/i.test(message)) {
        navigate(`/react/login?next=${encodeURIComponent(`/admin/orders/${orderId}`)}`, { replace: true });
      } else setError(message);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const isCancellation = status === "cancelled";
  const isPaid = order?.payment_status === "paid";
  const recallRequired = order?.status === "shipped" || order?.status === "out_for_delivery";
  const returnRequired = order?.status === "delivered";

  const apply = async () => {
    if (!order || !status || busy) return;
    if (isCancellation) {
      if (!note.trim()) return setError("Enter a reason for cancellation.");
      if (recallRequired && !recallConfirmed) return setError("Confirm shipment recall or delivery interception.");
      if (returnRequired && !returnReceived) return setError("Confirm the delivered products have been physically returned.");
      if (!window.confirm("Cancel this order? The customer will be notified. Paid orders start refund tracking; money is not transferred automatically.")) return;
    }
    setBusy(true);
    setError("");
    try {
      await updateAdminOrderStatus(order.id, status, csrf, note, isCancellation ? "" : date,
        isCancellation ? {
          cancel_refund_method: cancelMethod,
          request_bank_details: Boolean(isPaid && cancelMethod === "bank_transfer" && requestBank),
          refund_estimated_by: refundDue,
          shipment_recall_confirmed: Boolean(recallRequired && recallConfirmed),
          return_received_confirmed: Boolean(returnRequired && returnReceived),
        } : {});
      setStatus("");
      setNote("");
      setRefundDue("");
      setRequestBank(false);
      setRecallConfirmed(false);
      setReturnReceived(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setBusy(false);
    }
  };

  const addressParts = order?.delivery_address || {};
  const address = [
    addressParts.recipient_name, addressParts.address_line1, addressParts.address_line2,
    addressParts.landmark, addressParts.city, addressParts.state, addressParts.postal_code,
  ].filter(Boolean).join(", ");
  const coords = addressParts.latitude && addressParts.longitude
    ? `${addressParts.latitude},${addressParts.longitude}` : "";

  return (
    <>
      <style>{ADMIN_ORDER_DETAIL_SPACING_STYLES}</style>
      <main className="admin-queue-page rudra-admin-order-detail-wide">
      <Link to="/admin/orders" className="admin-detail-back">← Back to all orders</Link>
      {error && <p role="alert" className="admin-queue-error">{error}</p>}
      {!order ? <p>Loading order details…</p> : <>
        <header className="admin-queue-heading">
          <div>
            <span className="admin-queue-kicker">Admin / Order details</span>
            <h1>{order.order_number || order.id}</h1>
            <p>Placed {readableDate(order.created_at)} · {order.item_count || order.items?.length || 0} items · {statusText(order.status)}</p>
          </div>
          <span className="admin-queue-due">{dueLabel(order.estimated_delivery_date, order.status)}</span>
        </header>
        <section className="admin-detail-layout">
          <div className="admin-detail-main">
            <section className="admin-detail-card">
              <h2>Purchased items</h2>
              {order.items?.map((item, index) => <div className="admin-detail-item" key={`${item.name}-${index}`}>
                <div className="admin-detail-product-info">
                  {item.image_url && <img className="admin-detail-product-thumb" src={item.image_url} alt={item.name || "Product"} loading="lazy" />}
                  <div><b>{item.name || "Product"}</b><small>
                    Quantity {item.quantity || 1}{item.sku ? ` · SKU ${item.sku}` : ""}{item.size ? ` · ${item.size}` : ""}
                    {item.unit_label ? ` · ${item.unit_label}` : ""}{item.delivery_days ? ` · ${item.delivery_days} day(s) lead time` : ""}
                  </small></div>
                </div>
                <strong>{money(item.subtotal)}</strong>
              </div>)}
              <div className="admin-detail-breakdown">
                <div>Items subtotal <b>{money(order.subtotal ?? order.total)}</b></div>
                {Boolean(order.discount) && <div>Discount <b>− {money(order.discount)}</b></div>}
                {order.coupon_code && <div>Coupon <b>{order.coupon_code}</b></div>}
                <div>Delivery fee <b>{money(order.delivery_fee)}</b></div>
              </div>
              <div className="admin-detail-total">Order total <strong>{money(order.total)}</strong></div>
            </section>
            <section className="admin-detail-card">
              <h2>Customer and delivery address</h2>
              <p><b>{order.customer_name || "Customer"}</b></p><p>{order.user_email || ""}</p>
              <p>{address || "Address unavailable"}</p>
              {addressParts.phone && <a href={`tel:${addressParts.phone}`}>Call {addressParts.phone}</a>}
              {coords && <p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`} target="_blank" rel="noopener noreferrer">Open delivery location in Maps</a></p>}
              <h3>Payment</h3><p>{statusText(order.payment_method)} · {statusText(order.payment_status)}</p>
            </section>
            <section className="admin-detail-card">
              <h2>Delivery tracking history</h2>
              {(order.status_history || []).length ? <ol className="admin-detail-history">
                {(order.status_history || []).map((entry, index) => <li key={index}>
                  <b>{statusText(entry.status)}</b><span>{readableDate(entry.at)}</span>
                  {entry.note && <p>{entry.note}</p>}
                </li>)}
              </ol> : <p>Order placed. Further updates appear after the admin changes the status.</p>}
            </section>
          </div>
          <aside className="admin-detail-card admin-detail-sidebar">
            <h2>Admin fulfilment</h2>
            <p><a className="admin-queue-refresh" href={`/react/api/admin/orders/${encodeURIComponent(order.id)}/invoice`}>⬇ Download Invoice PDF</a></p>
            <p>Current status: <b>{statusText(order.status)}</b></p>
            <p>Expected delivery: <b>{readableDate(order.estimated_delivery_date)}</b></p>
            <p className="admin-detail-helper">Delivery estimates and status updates appear in the customer's order tracking.</p>
            {!order.admin_seen_at && <button className="admin-queue-refresh" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await markOrderReviewed(order.id, csrf); await refresh(); }
              catch (err) { setError(err instanceof Error ? err.message : "Unable to mark reviewed"); }
              finally { setBusy(false); }
            }}>Mark as reviewed</button>}
            {Boolean(flow[order.status]?.length) && <div className="admin-detail-controls">
              <label>Next delivery status
                <select value={status} onChange={(event) => { setStatus(event.target.value as StoreOrderStatus | ""); setError(""); }}>
                  <option value="">Select next status</option>
                  {flow[order.status].map(next => <option key={next} value={next}>{next === "cancelled" ? "Cancel Order" : statusText(next)}</option>)}
                </select>
              </label>
              {isCancellation ? <div className="rudra-cancel-form rudra-cancel-inline">
                <p><b>Cancellation & refund</b> — This action notifies the customer and cannot be undone.</p>
                <label>Cancellation reason (required)
                  <textarea rows={3} maxLength={500} required value={note} onChange={event => setNote(event.target.value)} placeholder="Reason shown to the customer" />
                </label>
                {isPaid && <>
                  <label>Refund method
                    <select value={cancelMethod} onChange={event => { setCancelMethod(event.target.value as "original_payment_method" | "bank_transfer"); setRequestBank(false); }}>
                      <option value="original_payment_method">Original payment method</option>
                      <option value="bank_transfer">Manual bank transfer</option>
                    </select>
                  </label>
                  {cancelMethod === "bank_transfer" && <label className="rudra-cancel-check">
                    <input type="checkbox" checked={requestBank} onChange={event => setRequestBank(event.target.checked)} /> Ask customer for bank details securely
                  </label>}
                  <label>Expected refund initiation by (optional)
                    <input type="date" min={todayIST()} value={refundDue} onChange={event => setRefundDue(event.target.value)} />
                  </label>
                  <p className="admin-detail-helper">Default target: seven business days. This does not automatically send funds.</p>
                </>}
                {recallRequired && <label className="rudra-cancel-check">
                  <input type="checkbox" checked={recallConfirmed} onChange={event => setRecallConfirmed(event.target.checked)} /> Shipment has been recalled or delivery intercepted
                </label>}
                {returnRequired && <label className="rudra-cancel-check">
                  <input type="checkbox" checked={returnReceived} onChange={event => setReturnReceived(event.target.checked)} /> Returned goods have physically been received and checked
                </label>}
              </div> : <>
                <label>Expected delivery date
                  <input type="date" value={date} onChange={event => setDate(event.target.value)} />
                </label>
                <label>Update note (optional)
                  <textarea rows={3} maxLength={500} placeholder="Packed and ready for dispatch…" value={note} onChange={event => setNote(event.target.value)} />
                </label>
              </>}
              <button className={isCancellation ? "rudra-cancel-confirm" : "admin-queue-save"}
                disabled={busy || !status || (isCancellation && (!note.trim() || (recallRequired && !recallConfirmed) || (returnRequired && !returnReceived)))}
                onClick={() => void apply()}>
                {busy ? "Saving…" : isCancellation ? "Confirm cancellation & notify customer" : "Update order status"}
              </button>
            </div>}
            {order.status === "delivered" && <p>Delivered {readableDate(order.delivered_at)}</p>}
            <RefundAdminPanel id={order.id} csrf={csrf} refund={order.refund} total={order.total}
              paid={order.payment_status === "paid"} cancelled={order.status === "cancelled"} onUpdate={refresh} />
          </aside>
        </section>
      </>}
      </main>
    </>
  );
}
