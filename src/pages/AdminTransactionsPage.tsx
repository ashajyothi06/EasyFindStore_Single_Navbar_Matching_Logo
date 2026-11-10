import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  loadAdminPaymentTransactions,
  paymentTransactionsCsvUrl,
  PaymentTransactionsApiError,
  type PaymentTransactionFilters,
  type PaymentTransactionsResponse,
} from "../services/paymentTransactionsApi";
import "../styles/core-admin.css";

const TRANSACTION_STYLES = `
  .pt-toolbar {
    display: grid;
    grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(150px, .7fr)) auto;
    gap: 12px;
    align-items: end;
  }

  .pt-field {
    display: grid;
    gap: 7px;
  }

  .pt-field span {
    font-size: .78rem;
    font-weight: 700;
    color: #626856;
  }

  .pt-field input,
  .pt-field select {
    width: 100%;
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid #d9ddcc;
    border-radius: 10px;
    background: #fff;
    color: #242815;
    font: inherit;
  }

  .pt-table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #e1e4d8;
    border-radius: 16px;
    background: #fff;
  }

  .pt-table {
    width: 100%;
    min-width: 1180px;
    border-collapse: collapse;
  }

  .pt-table th,
  .pt-table td {
    padding: 13px 14px;
    border-bottom: 1px solid #eceee6;
    text-align: left;
    vertical-align: top;
    font-size: .86rem;
  }

  .pt-table th {
    background: #f7f8f3;
    color: #505644;
    font-size: .72rem;
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  .pt-table tr:last-child td {
    border-bottom: 0;
  }

  .pt-order-link {
    color: #33371b;
    font-weight: 700;
    text-decoration: none;
  }

  .pt-subtle {
    display: block;
    margin-top: 4px;
    color: #767b6b;
    font-size: .76rem;
    overflow-wrap: anywhere;
  }

  .pt-id-stack {
    display: grid;
    gap: 7px;
    min-width: 235px;
  }

  .pt-id-row {
    display: grid;
    grid-template-columns: 66px minmax(0, 1fr) auto;
    gap: 7px;
    align-items: center;
  }

  .pt-id-label {
    color: #767b6b;
    font-size: .68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .pt-id-value {
    color: #242815;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: .74rem;
    overflow-wrap: anywhere;
  }

  .pt-copy {
    border: 1px solid #d9ddcc;
    border-radius: 8px;
    padding: 4px 7px;
    background: #fff;
    color: #33371b;
    cursor: pointer;
    font-size: .67rem;
    font-weight: 800;
  }

  .pt-copy:hover { background: #f1f3e9; }

  .pt-track-note {
    margin: 12px 0 0;
    padding: 12px 14px;
    border: 1px solid #dfe3d3;
    border-radius: 12px;
    background: #f7f8f3;
    color: #5f6555;
    font-size: .79rem;
    line-height: 1.45;
  }

  .pt-error-text {
    max-width: 340px;
    color: #9f2f2f;
    font-size: .78rem;
    line-height: 1.4;
  }

  .pt-status {
    display: inline-flex;
    padding: 5px 9px;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 800;
    text-transform: capitalize;
  }

  .pt-status.success { background:#e8f6ea; color:#216c2e; }
  .pt-status.failed { background:#fdeaea; color:#9a2828; }
  .pt-status.created { background:#fff3d9; color:#8a6200; }
  .pt-status.cancelled { background:#efefef; color:#575757; }
  .pt-status.other { background:#edf0f5; color:#4c5667; }

  @media (max-width: 1080px) {
    .pt-toolbar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .pt-toolbar {
      grid-template-columns: 1fr;
    }
  }
`;

function money(value: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: String(currency || "INR"),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminTransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeFilters, setActiveFilters] =
    useState<PaymentTransactionFilters>({
      status: "all",
      limit: 250,
    });
  const [data, setData] =
    useState<PaymentTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload =
        await loadAdminPaymentTransactions(
          activeFilters,
        );
      setData(payload);
    } catch (requestError) {
      if (
        requestError instanceof
          PaymentTransactionsApiError &&
        requestError.status === 401
      ) {
        navigate(
          `${requestError.loginUrl || "/react/login"}?next=${encodeURIComponent(
            location.pathname,
          )}`,
          { replace: true },
        );
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load payment transactions.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilters, location.pathname, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyId(value: string) {
    const clean = String(value || "").trim();
    if (!clean) return;

    try {
      await navigator.clipboard.writeText(clean);
      setCopiedId(clean);
      window.setTimeout(() => {
        setCopiedId((current) =>
          current === clean ? "" : current,
        );
      }, 1500);
    } catch {
      setError("Unable to copy the Razorpay ID. Please copy it manually.");
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setActiveFilters({
      status,
      search: search.trim(),
      from_date: fromDate,
      to_date: toDate,
      limit: 250,
    });
  }

  function clearFilters() {
    setStatus("all");
    setSearch("");
    setFromDate("");
    setToDate("");
    setActiveFilters({
      status: "all",
      limit: 250,
    });
  }

  const exportUrl = useMemo(
    () =>
      paymentTransactionsCsvUrl(
        activeFilters,
      ),
    [activeFilters],
  );

  const summary = data?.summary;

  return (
    <main className="ca-page">
      <style>{TRANSACTION_STYLES}</style>
      <div className="ca-page-container">
        <section className="ca-heading">
          <div>
            <span className="ca-eyebrow">
              Payments & analytics
            </span>
            <h1>Payment Transactions</h1>
            <p>
              Track every Razorpay payment using the exact Payment ID (pay_...),
              Razorpay Order ID (order_...), Fruveto order ID, or internal
              transaction ID, alongside success/failure and email status.
            </p>
          </div>

          <div className="ca-actions">
            <Link
              className="ca-button secondary"
              to="/admin"
            >
              Admin Dashboard
            </Link>
            <a
              className="ca-button primary"
              href={exportUrl}
            >
              Export CSV
            </a>
          </div>
        </section>

        <section className="ca-stat-grid">
          <article>
            <strong>{summary?.total_records || 0}</strong>
            <span>Total events</span>
          </article>
          <article>
            <strong>{summary?.created || 0}</strong>
            <span>Created payments</span>
          </article>
          <article>
            <strong>{summary?.successful || 0}</strong>
            <span>Successful payments</span>
          </article>
          <article>
            <strong>{summary?.failed || 0}</strong>
            <span>Failed payments</span>
          </article>
          <article>
            <strong>
              {money(
                summary?.successful_amount || 0,
                "INR",
              )}
            </strong>
            <span>Successful value</span>
          </article>
          <article>
            <strong>{summary?.unique_razorpay_payments || 0}</strong>
            <span>Razorpay payments tracked</span>
          </article>
          <article>
            <strong>{summary?.email_sent || 0}</strong>
            <span>Confirmation emails sent</span>
          </article>
        </section>

        <section className="ca-card">
          <form
            className="pt-toolbar"
            onSubmit={applyFilters}
          >
            <label className="pt-field">
              <span>Search</span>
              <input
                value={search}
                placeholder="Paste pay_..., order_..., PTX ID, order ID, email..."
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </label>

            <label className="pt-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                <option value="all">All</option>
                <option value="created">Created</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="pt-field">
              <span>From date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
              />
            </label>

            <label className="pt-field">
              <span>To date</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
              />
            </label>

            <div className="ca-actions">
              <button
                className="ca-button secondary"
                type="button"
                onClick={clearFilters}
              >
                Clear
              </button>
              <button
                className="ca-button primary"
                type="submit"
              >
                Apply
              </button>
            </div>
          </form>
          <div className="pt-track-note">
            For support or reconciliation, paste the exact Razorpay <strong>pay_...</strong>
            or <strong>order_...</strong> ID into Search. Both are indexed in PostgreSQL
            and exported as separate CSV columns.
          </div>
        </section>

        {error ? (
          <section className="ca-card">
            <div className="ca-empty">
              <strong>Unable to load transactions</strong>
              <p>{error}</p>
              <button
                className="ca-button primary"
                type="button"
                onClick={() => void load()}
              >
                Try Again
              </button>
            </div>
          </section>
        ) : null}

        <section className="ca-card">
          <div className="ca-section-heading">
            <div>
              <h2>Transaction Records</h2>
              <p>
                Showing {data?.transactions.length || 0} of {data?.count || 0}
                matching records.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="ca-empty compact">
              Loading payment transactions…
            </div>
          ) : data?.transactions.length ? (
            <div className="pt-table-wrap">
              <table className="pt-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Razorpay Tracking</th>
                    <th>Email</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map(
                    (transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          {dateTime(
                            transaction.event_at ||
                              transaction.created_at,
                          )}
                          <span className="pt-subtle">
                            {transaction.id}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pt-status ${
                              transaction.status_group ||
                              "other"
                            }`}
                          >
                            {transaction.status_group ||
                              transaction.status ||
                              "other"}
                          </span>
                          <span className="pt-subtle">
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          {transaction.order_id ? (
                            <Link
                              className="pt-order-link"
                              to={`/orders/${encodeURIComponent(
                                transaction.order_id,
                              )}`}
                            >
                              {transaction.order_number ||
                                transaction.order_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                          <span className="pt-subtle">
                            {transaction.order_id}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {transaction.customer_name ||
                              "Customer"}
                          </strong>
                          <span className="pt-subtle">
                            {transaction.user_email || "—"}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {money(
                              transaction.amount,
                              transaction.currency ||
                                "INR",
                            )}
                          </strong>
                          <span className="pt-subtle">
                            {transaction.payment_method ||
                              transaction.provider ||
                              "—"}
                          </span>
                        </td>
                        <td>
                          <div className="pt-id-stack">
                            <div className="pt-id-row">
                              <span className="pt-id-label">Payment</span>
                              <span className="pt-id-value">
                                {transaction.razorpay_payment_id || "—"}
                              </span>
                              {transaction.razorpay_payment_id ? (
                                <button
                                  className="pt-copy"
                                  type="button"
                                  onClick={() =>
                                    void copyId(transaction.razorpay_payment_id || "")
                                  }
                                >
                                  {copiedId === transaction.razorpay_payment_id
                                    ? "Copied"
                                    : "Copy"}
                                </button>
                              ) : null}
                            </div>

                            <div className="pt-id-row">
                              <span className="pt-id-label">Order</span>
                              <span className="pt-id-value">
                                {transaction.razorpay_order_id || "—"}
                              </span>
                              {transaction.razorpay_order_id ? (
                                <button
                                  className="pt-copy"
                                  type="button"
                                  onClick={() =>
                                    void copyId(transaction.razorpay_order_id || "")
                                  }
                                >
                                  {copiedId === transaction.razorpay_order_id
                                    ? "Copied"
                                    : "Copy"}
                                </button>
                              ) : null}
                            </div>

                            <div className="pt-id-row">
                              <span className="pt-id-label">Internal</span>
                              <span className="pt-id-value">{transaction.id}</span>
                              <button
                                className="pt-copy"
                                type="button"
                                onClick={() => void copyId(transaction.id)}
                              >
                                {copiedId === transaction.id ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pt-status ${
                              transaction.email_status ===
                              "sent"
                                ? "success"
                                : transaction.email_status ===
                                    "failed"
                                  ? "failed"
                                  : "other"
                            }`}
                          >
                            {transaction.email_status ||
                              "not applicable"}
                          </span>
                          {transaction.email_error ? (
                            <span className="pt-subtle">
                              {transaction.email_error}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {transaction.failure_reason ? (
                            <div className="pt-error-text">
                              {transaction.failure_reason}
                            </div>
                          ) : (
                            <>
                              <strong>
                                {transaction.gateway_status ||
                                  "Recorded"}
                              </strong>
                              <span className="pt-subtle">
                                {transaction.collector_business_name ||
                                  "EasyFindStore Store"}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ca-empty compact">
              No payment transaction records match these filters.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
