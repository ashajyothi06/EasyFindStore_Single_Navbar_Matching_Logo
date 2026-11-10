import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadAdminEarnings,
  loadAdminSettlements,
  loadDeliveryEarnings,
  loadPlatformEarnings,
  loadSellerEarnings,
  markSettlementPaid,
  prepareSettlement,
  sendSettlementEmail,
  settlementErrorMessage,
  settlementInvoiceUrl,
  type AdminEarningsSummary,
  type EarningsDetailRecord,
  type EarningsRow,
  type PlatformEarningsSummary,
  type SettlementRecord,
  type SettlementRole,
} from "../services/settlementEarningsApi";
import "../styles/settlement-earnings.css";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(): string {
  return `${currentMonth()}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: unknown): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function title(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) return "—";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: text.includes("T") ? "short" : undefined,
        timeZone: "Asia/Kolkata",
      }).format(parsed);
}

function authRedirect(error: unknown, next: string, navigate: ReturnType<typeof useNavigate>) {
  if (Number((error as any)?.status || 0) === 401) {
    navigate(`/react/login?next=${encodeURIComponent(next)}`, { replace: true });
    return true;
  }
  return false;
}

function Stat({ label, value, tone = "green" }: { label: string; value: string | number; tone?: string }) {
  return (
    <article className={`settlement-stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: string }) {
  return <tr><td className="settlement-empty-cell" colSpan={colSpan}>{children}</td></tr>;
}

function SettlementHistory({ rows }: { rows: SettlementRecord[] }) {
  if (!rows.length) return <p className="settlement-muted">No settlement invoice has been generated in this month yet.</p>;
  return (
    <div className="settlement-table-wrap">
      <table className="settlement-table colorful">
        <thead><tr><th>Settlement</th><th>Range</th><th>Gross</th><th>Commission</th><th>COD</th><th>Net</th><th>Status</th><th>Invoice</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.settlement_number || row.id}</strong><small>{row.payment_reference || "No payment reference"}</small></td>
              <td>{row.range_start || row.period} → {row.range_end || row.period}</td>
              <td>{money(row.gross_amount)}</td>
              <td>{money(row.commission_amount)}</td>
              <td>{money(row.cod_deduction_amount)}</td>
              <td><strong>{money(row.net_amount)}</strong></td>
              <td><span className={`settlement-status ${row.status}`}>{title(row.status)}</span></td>
              <td><a className="settlement-button mini secondary" href={settlementInvoiceUrl(row.id)} target="_blank" rel="noreferrer">Invoice</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailTable({ role, rows }: { role: SettlementRole; rows: EarningsDetailRecord[] }) {
  return (
    <div className="settlement-table-wrap">
      <table className="settlement-table colorful detail-report">
        <thead>
          {role === "seller" ? (
            <tr><th>Order / Booking</th><th>Completed</th><th>Payment</th><th>Gross generated</th><th>Commission</th><th>Net earning</th></tr>
          ) : (
            <tr><th>Delivery batch</th><th>Completed</th><th>Deliveries</th><th>Delivery payout</th><th>Commission</th><th>COD deduction</th><th>Net earning</th></tr>
          )}
        </thead>
        <tbody>
          {rows.map((row) => role === "seller" ? (
            <tr key={row.record_id}>
              <td><strong>{row.order_number || row.booking_number || row.record_id}</strong><small>{row.booking_number && row.booking_number !== row.order_number ? row.booking_number : ""}</small></td>
              <td>{formatDate(row.completed_at)}</td>
              <td><span className="settlement-chip purple">{title(row.payment_method || row.payment_status || "Paid")}</span></td>
              <td>{money(row.gross_amount)}</td>
              <td>{money(row.commission_amount)}<small>{Number(row.commission_percent || 0).toFixed(2)}%</small></td>
              <td><strong>{money(row.net_amount)}</strong></td>
            </tr>
          ) : (
            <tr key={row.record_id}>
              <td><strong>{row.batch_number || row.record_id}</strong></td>
              <td>{formatDate(row.completed_at)}</td>
              <td><strong>{row.order_count || 0}</strong></td>
              <td>{money(row.gross_amount)}</td>
              <td>{money(row.commission_amount)}<small>{Number(row.commission_percent || 0).toFixed(2)}%</small></td>
              <td><span className={Number(row.cod_deduction_amount || 0) > 0 ? "settlement-chip amber" : "settlement-chip green"}>{money(row.cod_deduction_amount)}</span></td>
              <td><strong>{money(row.net_amount)}</strong></td>
            </tr>
          ))}
          {!rows.length && <EmptyRow colSpan={role === "seller" ? 6 : 7}>No new unsettled completed records for this month.</EmptyRow>}
        </tbody>
      </table>
    </div>
  );
}

export function AdminEarningsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentMonth());
  const [summary, setSummary] = useState<AdminEarningsSummary | null>(null);
  const [sellerFilter, setSellerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAdminEarnings(period)
      .then((response) => !cancelled && setSummary(response.summary))
      .catch((requestError) => {
        if (!cancelled && !authRedirect(requestError, "/admin/earnings", navigate)) setError(settlementErrorMessage(requestError, "Unable to load earnings."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [navigate, period]);

  const sellerRows = summary?.seller_rows || [];
  const visible = sellerFilter === "all" ? sellerRows : sellerRows.filter((row) => row.payee_id === sellerFilter);
  const totals = useMemo(() => ({
    gross: visible.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
    commission: visible.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0),
    net: visible.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
    records: visible.reduce((sum, row) => sum + Number(row.record_count || 0), 0),
  }), [visible]);

  return (
    <main className="settlement-page"><div className="settlement-container">
      <section className="settlement-heading finance-hero"><div><span className="settlement-eyebrow">Admin finance</span><h1>Earnings & Payment Report</h1><p>Detailed generated amount by seller, delivery payout, platform commission and unsettled balances.</p></div><div className="settlement-actions"><Link className="settlement-button primary" to="/admin/platform-earnings">Platform Earnings</Link><Link className="settlement-button secondary" to="/admin/settlement-schedules">Payment Schedules</Link><Link className="settlement-button secondary" to="/admin/seller-commissions">Seller Commission</Link></div></section>
      {error && <div className="settlement-notice error">{error}</div>}
      <section className="settlement-card filter-card"><div className="settlement-form-grid"><label className="settlement-field"><span>Month</span><input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label><label className="settlement-field"><span>Seller</span><select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}><option value="all">All sellers</option>{sellerRows.map((row) => <option key={row.payee_id} value={row.payee_id}>{row.payee_name}</option>)}</select></label></div></section>
      {loading || !summary ? <section className="settlement-card settlement-empty">Loading report…</section> : <>
        <section className="settlement-grid settlement-card report-stats"><Stat label="Seller generated" value={money(totals.gross)} /><Stat label="Seller commission" value={money(totals.commission)} tone="purple" /><Stat label="Seller net payable" value={money(totals.net)} tone="blue" /><Stat label="Seller order records" value={totals.records} tone="amber" /><Stat label="Delivery payout" value={money(summary.delivery_gross)} /><Stat label="Delivery commission" value={money(summary.delivery_commission)} tone="purple" /><Stat label="COD deductions" value={money(summary.delivery_cod_deductions)} tone="amber" /><Stat label="Platform pending commission" value={money(totals.commission + Number(summary.delivery_commission || 0))} tone="blue" /></section>
        <section className="settlement-card"><div className="settlement-section-heading"><div><h2>Seller-wise generated amount</h2><p>Commission is read-only here and comes from Seller Commission Management.</p></div></div><div className="settlement-table-wrap"><table className="settlement-table colorful"><thead><tr><th>Seller</th><th>Orders</th><th>Generated</th><th>Commission %</th><th>Platform commission</th><th>Net payable</th><th>Next settlement</th></tr></thead><tbody>{visible.map((row) => <tr key={row.payee_id}><td><strong>{row.payee_name}</strong><small>{row.payee_email}</small></td><td>{row.record_count}</td><td>{money(row.gross_amount)}</td><td>{Number(row.commission_percent || 0).toFixed(2)}%</td><td>{money(row.commission_amount)}</td><td><strong>{money(row.net_amount)}</strong></td><td>{row.schedule?.next_settlement_date || "—"}<small>{row.schedule?.cadence_label}</small></td></tr>)}{!visible.length && <EmptyRow colSpan={7}>No unsettled seller records found.</EmptyRow>}</tbody></table></div></section>
      </>}
    </div></main>
  );
}

export function AdminPlatformEarningsPage() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [sellerId, setSellerId] = useState("");
  const [stateFilter, setStateFilter] =
    useState<"all" | "successful" | "processing" | "attention">("all");
  const [issueFilter, setIssueFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [settlementFilter, setSettlementFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [summary, setSummary] =
    useState<PlatformEarningsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    loadPlatformEarnings(fromDate, toDate, sellerId)
      .then((response) => {
        if (!cancelled) {
          setSummary(response.summary);
        }
      })
      .catch((requestError) => {
        if (
          !cancelled &&
          !authRedirect(
            requestError,
            "/admin/platform-earnings",
            navigate,
          )
        ) {
          setError(
            settlementErrorMessage(
              requestError,
              "Unable to load seller platform earnings.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, sellerId, navigate]);

  const issueOptions = useMemo(() => {
    const values = new Map<string, string>();
    (summary?.rows || []).forEach((row) => {
      if (row.issue_code && row.issue_code !== "none") {
        values.set(row.issue_code, row.issue_label);
      }
    });
    return [...values.entries()];
  }, [summary]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (summary?.rows || []).filter((row) => {
      if (
        stateFilter !== "all" &&
        row.order_state !== stateFilter
      ) {
        return false;
      }

      if (
        issueFilter !== "all" &&
        row.issue_code !== issueFilter
      ) {
        return false;
      }

      if (
        paymentFilter !== "all" &&
        row.payment_status !== paymentFilter
      ) {
        return false;
      }

      if (settlementFilter !== "all") {
        const settled =
          String(row.settlement_status || "").toLowerCase() ===
          "settled";
        if (settlementFilter === "settled" && !settled) {
          return false;
        }
        if (settlementFilter === "unsettled" && settled) {
          return false;
        }
      }

      if (!query) return true;

      const searchable = [
        row.order_number,
        row.booking_number,
        row.seller_name,
        row.seller_email,
        row.delivery_person_name,
        row.seller_status,
        row.delivery_status,
        row.issue_label,
        ...(row.items || []).map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    summary,
    stateFilter,
    issueFilter,
    paymentFilter,
    settlementFilter,
    search,
  ]);

  const filteredTotals = useMemo(() => {
    return visibleRows.reduce(
      (accumulator, row) => {
        accumulator.orderAmount += Number(row.seller_amount || 0);
        accumulator.commission += Number(row.commission_amount || 0);

        if (row.commission_realized) {
          accumulator.realized += Number(row.commission_amount || 0);
        } else if (row.order_state !== "attention") {
          accumulator.pending += Number(row.commission_amount || 0);
        }

        if (row.order_state === "successful") {
          accumulator.successful += 1;
        } else if (row.order_state === "processing") {
          accumulator.processing += 1;
        } else {
          accumulator.attention += 1;
        }

        if (row.issue_code !== "none") {
          accumulator.issueCount += 1;
        }

        return accumulator;
      },
      {
        orderAmount: 0,
        commission: 0,
        realized: 0,
        pending: 0,
        successful: 0,
        processing: 0,
        attention: 0,
        issueCount: 0,
      },
    );
  }, [visibleRows]);

  function resetOperationalFilters() {
    setStateFilter("all");
    setIssueFilter("all");
    setPaymentFilter("all");
    setSettlementFilter("all");
    setSearch("");
  }

  return (
    <main className="settlement-page platform-advanced-page">
      <div className="settlement-container">
        <section className="settlement-heading platform-hero platform-advanced-hero">
          <div>
            <span className="settlement-eyebrow">
              Fruveto Enterprices · Seller commission control
            </span>
            <h1>Platform Earnings After Settlement</h1>
            <p>
              Seller-only commission dashboard. Delivery payout and delivery
              commission are intentionally excluded. Track every seller order,
              items, seller value, commission, payment, seller response,
              delivery progress and operational delays from one page.
            </p>
          </div>

          <div className="settlement-actions">
            <Link
              className="settlement-button secondary"
              to="/admin/earnings"
            >
              Earnings Centre
            </Link>
            <Link
              className="settlement-button secondary"
              to="/admin/settlement-schedules"
            >
              Settlements
            </Link>
          </div>
        </section>

        {error && (
          <div className="settlement-notice error">{error}</div>
        )}

        <section className="settlement-card platform-filter-card">
          <div className="platform-filter-grid">
            <label className="settlement-field">
              <span>Seller</span>
              <select
                value={sellerId}
                onChange={(event) => setSellerId(event.target.value)}
              >
                <option value="">All sellers</option>
                {(summary?.sellers || []).map((seller) => (
                  <option
                    key={seller.seller_id}
                    value={seller.seller_id}
                  >
                    {seller.seller_name} ·{" "}
                    {Number(seller.commission_percent || 0).toFixed(2)}%
                  </option>
                ))}
              </select>
            </label>

            <label className="settlement-field">
              <span>From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>

            <label className="settlement-field">
              <span>To</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>

            <label className="settlement-field">
              <span>Order state</span>
              <select
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(
                    event.target.value as
                      | "all"
                      | "successful"
                      | "processing"
                      | "attention",
                  )
                }
              >
                <option value="all">All states</option>
                <option value="successful">Successful</option>
                <option value="processing">Processing</option>
                <option value="attention">Attention</option>
              </select>
            </label>

            <label className="settlement-field">
              <span>Operational issue</span>
              <select
                value={issueFilter}
                onChange={(event) =>
                  setIssueFilter(event.target.value)
                }
              >
                <option value="all">All issues</option>
                <option value="none">No issue</option>
                {issueOptions.map(([value, labelText]) => (
                  <option key={value} value={value}>
                    {labelText}
                  </option>
                ))}
              </select>
            </label>

            <label className="settlement-field">
              <span>Payment</span>
              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
              >
                <option value="all">All payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="created">Created</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label className="settlement-field">
              <span>Settlement</span>
              <select
                value={settlementFilter}
                onChange={(event) =>
                  setSettlementFilter(event.target.value)
                }
              >
                <option value="all">All settlement states</option>
                <option value="settled">Settled</option>
                <option value="unsettled">Unsettled / Processing</option>
              </select>
            </label>

            <label className="settlement-field platform-search-field">
              <span>Search</span>
              <input
                type="search"
                value={search}
                placeholder="Order, seller, item, delivery person…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="platform-filter-footer">
            <span>
              Showing <strong>{visibleRows.length}</strong> of{" "}
              <strong>{summary?.tracked_order_count || 0}</strong>{" "}
              seller orders
            </span>
            <button
              type="button"
              className="settlement-button mini secondary"
              onClick={resetOperationalFilters}
            >
              Reset Filters
            </button>
          </div>
        </section>

        {loading || !summary ? (
          <section className="settlement-card">
            Loading seller commission and order tracking…
          </section>
        ) : (
          <>
            <section className="platform-kpi-grid">
              <article className="platform-kpi primary">
                <span>Seller order value</span>
                <strong>{money(filteredTotals.orderAmount)}</strong>
                <small>Delivery amount excluded</small>
              </article>

              <article className="platform-kpi success">
                <span>Commission realized</span>
                <strong>{money(filteredTotals.realized)}</strong>
                <small>Orders already settled</small>
              </article>

              <article className="platform-kpi purple">
                <span>Commission pending</span>
                <strong>{money(filteredTotals.pending)}</strong>
                <small>Expected from active/unsettled orders</small>
              </article>

              <article className="platform-kpi blue">
                <span>Total seller commission</span>
                <strong>{money(filteredTotals.commission)}</strong>
                <small>For currently filtered orders</small>
              </article>

              <article className="platform-kpi success-soft">
                <span>Successful orders</span>
                <strong>{filteredTotals.successful}</strong>
              </article>

              <article className="platform-kpi amber">
                <span>Processing</span>
                <strong>{filteredTotals.processing}</strong>
              </article>

              <article className="platform-kpi danger">
                <span>Need attention</span>
                <strong>{filteredTotals.issueCount}</strong>
                <small>Seller/delivery/payment issues</small>
              </article>
            </section>

            <section className="settlement-card platform-orders-card">
              <div className="settlement-section-heading">
                <div>
                  <h2>Seller Order & Commission Monitor</h2>
                  <p>
                    The amount column is seller merchandise value only.
                    Delivery charges/payouts are not included anywhere on this
                    page.
                  </p>
                </div>
                <span className="settlement-chip purple">
                  Live operational tracking
                </span>
              </div>

              <div className="settlement-table-wrap platform-orders-wrap">
                <table className="settlement-table colorful platform-orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Seller</th>
                      <th>Items / Qty</th>
                      <th>Seller Amount</th>
                      <th>Commission</th>
                      <th>Payment</th>
                      <th>Seller Status</th>
                      <th>Delivery Status</th>
                      <th>Settlement</th>
                      <th>Issue / SLA</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.record_id}
                        className={`platform-order-row state-${row.order_state} ${
                          row.issue_code !== "none"
                            ? "has-issue"
                            : ""
                        }`}
                      >
                        <td>
                          <strong>{row.order_number}</strong>
                          <small>
                            {formatDate(row.created_at)}
                          </small>
                          <span
                            className={`platform-state-pill ${row.order_state}`}
                          >
                            {title(row.order_state)}
                          </span>
                        </td>

                        <td>
                          <strong>{row.seller_name}</strong>
                          <small>{row.seller_email}</small>
                        </td>

                        <td>
                          <div className="platform-items-list">
                            {(row.items || []).length ? (
                              row.items.map((item, index) => (
                                <span
                                  key={`${row.record_id}-${item.name}-${index}`}
                                >
                                  {item.name}
                                  <b>×{item.quantity}</b>
                                </span>
                              ))
                            ) : (
                              <span>Items unavailable</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <strong className="platform-money">
                            {money(row.seller_amount)}
                          </strong>
                          <small>Delivery excluded</small>
                        </td>

                        <td>
                          <strong className="platform-commission">
                            {money(row.commission_amount)}
                          </strong>
                          <small>
                            {Number(row.commission_percent || 0).toFixed(2)}%
                            {" · "}
                            {row.commission_realized
                              ? "Realized"
                              : "Pending"}
                          </small>
                        </td>

                        <td>
                          <span
                            className={`settlement-chip ${
                              row.payment_status === "paid"
                                ? "green"
                                : row.payment_status === "failed"
                                  ? "red"
                                  : "amber"
                            }`}
                          >
                            {title(row.payment_status)}
                          </span>
                          <small>{title(row.payment_method)}</small>
                        </td>

                        <td>
                          <span
                            className={`platform-flow-status seller ${row.seller_status}`}
                          >
                            {title(row.seller_status)}
                          </span>
                          <small>
                            {row.seller_seen
                              ? "Seller opened order"
                              : "Not opened by seller"}
                          </small>
                        </td>

                        <td>
                          <span
                            className={`platform-flow-status delivery ${row.delivery_status}`}
                          >
                            {title(row.delivery_status)}
                          </span>
                          <small>
                            {row.delivery_person_name ||
                              "Delivery person not linked"}
                          </small>
                        </td>

                        <td>
                          <span
                            className={`settlement-chip ${
                              row.settlement_status === "settled"
                                ? "green"
                                : row.settlement_status === "processing"
                                  ? "purple"
                                  : "amber"
                            }`}
                          >
                            {title(row.settlement_status)}
                          </span>
                          {row.settled_at && (
                            <small>{formatDate(row.settled_at)}</small>
                          )}
                        </td>

                        <td>
                          <div
                            className={`platform-issue ${
                              row.issue_code === "none"
                                ? "clear"
                                : "warning"
                            }`}
                          >
                            <strong>{row.issue_label}</strong>
                            <small>{row.issue_detail}</small>
                            {row.promised_delivery_end_at && (
                              <em>
                                Promise:{" "}
                                {formatDate(
                                  row.promised_delivery_end_at,
                                )}
                              </em>
                            )}
                          </div>
                        </td>

                        <td>
                          {formatDate(row.updated_at)}
                        </td>
                      </tr>
                    ))}

                    {!visibleRows.length && (
                      <EmptyRow colSpan={11}>
                        No seller orders match the selected filters.
                      </EmptyRow>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="settlement-card">
              <div className="settlement-section-heading">
                <div>
                  <h2>Paid Seller Commission Settlements</h2>
                  <p>
                    Seller settlements only. No delivery payout, delivery
                    commission or COD figures are shown here.
                  </p>
                </div>
              </div>

              <div className="settlement-table-wrap">
                <table className="settlement-table colorful">
                  <thead>
                    <tr>
                      <th>Paid Date</th>
                      <th>Seller</th>
                      <th>Settlement</th>
                      <th>Seller Amount</th>
                      <th>Commission %</th>
                      <th>Platform Commission</th>
                      <th>Payment Reference</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.seller_settlements || []).map(
                      (settlement) => (
                        <tr key={settlement.settlement_id}>
                          <td>{formatDate(settlement.paid_at)}</td>
                          <td>
                            <strong>{settlement.seller_name}</strong>
                          </td>
                          <td>{settlement.settlement_number}</td>
                          <td>{money(settlement.seller_amount)}</td>
                          <td>
                            {Number(
                              settlement.commission_percent || 0,
                            ).toFixed(2)}
                            %
                          </td>
                          <td>
                            <strong>
                              {money(settlement.commission_amount)}
                            </strong>
                          </td>
                          <td>
                            {settlement.payment_reference || "—"}
                          </td>
                          <td>
                            <a
                              className="settlement-button mini secondary"
                              href={settlementInvoiceUrl(
                                settlement.settlement_id,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Invoice
                            </a>
                          </td>
                        </tr>
                      ),
                    )}

                    {!summary.seller_settlements.length && (
                      <EmptyRow colSpan={8}>
                        No paid seller settlements in this date range.
                      </EmptyRow>
                    )}
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


function AdminSettlementList({ role }: { role: SettlementRole }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentMonth());
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function load() { try { const response = await loadAdminSettlements(role, period); setRows(response.rows || []); setCsrfToken(response.csrf_token || ""); } catch (e) { if (!authRedirect(e, role === "seller" ? "/admin/settlements/sellers" : "/admin/settlements/delivery", navigate)) setError(settlementErrorMessage(e, "Unable to load settlements.")); } }
  useEffect(() => { void load(); }, [period, role]);
  async function prepare(row: EarningsRow) { if (!csrfToken) return; setWorking(`p-${row.payee_id}`); try { const r = await prepareSettlement(role, row.payee_id, period, csrfToken); setNotice(r.message); await load(); } catch(e) { setError(settlementErrorMessage(e, "Unable to prepare settlement.")); } finally { setWorking(""); } }
  async function paid(row: EarningsRow) { if (!row.settlement || !csrfToken) return; setWorking(`m-${row.settlement.id}`); try { const r = await markSettlementPaid(row.settlement.id, refs[row.settlement.id] || "", csrfToken); setNotice(r.message); await load(); } catch(e) { setError(settlementErrorMessage(e, "Unable to mark paid.")); } finally { setWorking(""); } }
  async function email(row: EarningsRow) { if (!row.settlement || !csrfToken) return; setWorking(`e-${row.settlement.id}`); try { const r = await sendSettlementEmail(row.settlement.id, csrfToken); setNotice(r.message); } catch(e) { setError(settlementErrorMessage(e, "Unable to send invoice.")); } finally { setWorking(""); } }
  return <main className="settlement-page"><div className="settlement-container"><section className="settlement-heading"><div><span className="settlement-eyebrow">Admin settlement</span><h1>{role === "seller" ? "Seller Settlements" : "Delivery Person Settlements"}</h1><p>Prepare only new unsettled records. Once marked paid, those records are cleared and the next balance starts from newly completed work.</p></div><div className="settlement-actions"><Link className="settlement-button primary" to="/admin/settlement-schedules">Schedules & Custom Settlement</Link><Link className="settlement-button secondary" to="/admin/earnings">Earnings</Link></div></section>{notice && <div className="settlement-notice success">{notice}</div>}{error && <div className="settlement-notice error">{error}</div>}<section className="settlement-card"><label className="settlement-field"><span>Month</span><input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label></section><section className="settlement-card"><div className="settlement-table-wrap"><table className="settlement-table colorful"><thead><tr><th>Payee</th><th>Schedule</th><th>Records</th><th>Gross</th><th>Commission</th>{role === "delivery" && <th>COD</th>}<th>Net</th><th>Settlement action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.payee_id}><td><strong>{row.payee_name}</strong><small>{row.payee_email}</small></td><td>{row.schedule?.cadence_label || "Monthly"}<small>Next: {row.schedule?.next_settlement_date || "—"}</small></td><td>{row.record_count}</td><td>{money(row.gross_amount)}</td><td>{money(row.commission_amount)}<small>{Number(row.commission_percent || 0).toFixed(2)}%</small></td>{role === "delivery" && <td>{money(row.cod_deduction_amount)}</td>}<td><strong>{money(row.net_amount)}</strong></td><td>{row.settlement ? <div className="settlement-row-actions"><span className={`settlement-status ${row.settlement.status}`}>{title(row.settlement.status)}</span><a className="settlement-button mini secondary" href={settlementInvoiceUrl(row.settlement.id)} target="_blank" rel="noreferrer">Invoice</a><button className="settlement-button mini secondary" onClick={() => void email(row)} disabled={Boolean(working)}>Email</button>{row.settlement.status !== "paid" && <><input className="settlement-inline-input" placeholder="Payment reference" value={refs[row.settlement.id] || ""} onChange={(e) => setRefs((c) => ({ ...c, [row.settlement!.id]: e.target.value }))} /><button className="settlement-button mini primary" onClick={() => void paid(row)} disabled={Boolean(working)}>Mark Paid</button></>}</div> : <button className="settlement-button mini primary" onClick={() => void prepare(row)} disabled={Boolean(working) || (row.record_count <= 0 && row.cod_deduction_amount <= 0)}>{working === `p-${row.payee_id}` ? "Preparing…" : "Prepare"}</button>}</td></tr>)}</tbody></table></div></section></div></main>;
}

export function AdminSellerSettlementsPage() { return <AdminSettlementList role="seller" />; }
export function AdminDeliverySettlementsPage() { return <AdminSettlementList role="delivery" />; }

function SelfEarningsPage({ role }: { role: SettlementRole }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentMonth());
  const [row, setRow] = useState<EarningsRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; setLoading(true); (role === "seller" ? loadSellerEarnings(period) : loadDeliveryEarnings(period)).then((r) => !cancelled && setRow(r.earnings)).catch((e) => { if (!cancelled && !authRedirect(e, role === "seller" ? "/seller/earnings" : "/delivery/earnings", navigate)) setError(settlementErrorMessage(e, "Unable to load earnings.")); }).finally(() => !cancelled && setLoading(false)); return () => { cancelled = true; }; }, [role, period, navigate]);
  return <main className="settlement-page"><div className="settlement-container"><section className={`settlement-heading ${role === "seller" ? "seller-report-hero" : "delivery-report-hero"}`}><div><span className="settlement-eyebrow">{role === "seller" ? "Seller finance" : "Delivery finance"}</span><h1>{role === "seller" ? "Order Earnings Report" : "Delivery Earnings & COD Report"}</h1><p>{role === "seller" ? "Every completed paid seller order is listed with commission and your final amount." : "Every completed delivery is listed with payout, commission, COD cash liability and final payable amount."}</p></div><div className="settlement-actions"><Link className="settlement-button primary" to={role === "seller" ? "/seller/payment-records" : "/delivery/payment-records"}>Payment Records</Link><Link className="settlement-button secondary" to={role === "seller" ? "/seller/payment-schedule" : "/delivery/payment-schedule"}>Payment Schedule</Link><Link className="settlement-button secondary" to="/dashboard">Dashboard</Link></div></section>{error && <div className="settlement-notice error">{error}</div>}<section className="settlement-card"><label className="settlement-field"><span>Report month</span><input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label></section>{loading || !row ? <section className="settlement-card">Loading…</section> : <><section className="settlement-grid settlement-card report-stats"><Stat label={role === "seller" ? "Generated from orders" : "Delivery payout"} value={money(row.gross_amount)} /><Stat label={`Commission (${Number(row.commission_percent || 0).toFixed(2)}%)`} value={money(row.commission_amount)} tone="purple" />{role === "delivery" && <Stat label="COD cash deduction" value={money(row.cod_deduction_amount)} tone="amber" />}<Stat label="Current amount payable" value={money(row.net_amount)} tone="blue" /><Stat label="New unsettled records" value={row.record_count} /></section><section className="settlement-card"><div className="settlement-section-heading"><div><h2>Detailed payment records</h2><p>Settled records disappear from the current amount and remain available below in Settlement History.</p></div><span className="settlement-chip green">Next: {row.schedule?.next_settlement_date || "—"}</span></div><DetailTable role={role} rows={row.records || []} /></section><section className="settlement-card"><h2>Settlement History & Invoices</h2><p className="settlement-muted">Invoices are issued by Fruveto Enterprices, Hyderabad - 500062 · fruveto.com.</p><SettlementHistory rows={row.settlement_history || []} /></section></>}</div></main>;
}

export function SellerEarningsPage() { return <SelfEarningsPage role="seller" />; }
export function DeliveryEarningsPage() { return <SelfEarningsPage role="delivery" />; }
