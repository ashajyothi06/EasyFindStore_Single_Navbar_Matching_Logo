import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadDeliveryPaymentRecords,
  loadSellerPaymentRecords,
  settlementErrorMessage,
  settlementInvoiceUrl,
  type PaymentRecordRow,
  type SelfPaymentRecordsSummary,
  type SettlementRole,
} from "../services/settlementEarningsApi";
import "../styles/settlement-earnings.css";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function money(value: unknown): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function title(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatDate(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) return "—";

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: text.includes("T") ? "short" : undefined,
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function paymentStatusClass(
  value: string,
): string {
  if (value === "paid") return "green";
  if (value === "processing") return "purple";
  return "amber";
}

function SelfPaymentRecordsPage({
  role,
}: {
  role: SettlementRole;
}) {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(currentMonth());
  const [statusFilter, setStatusFilter] =
    useState<"all" | "paid" | "processing" | "pending">(
      "all",
    );
  const [search, setSearch] = useState("");

  const [data, setData] =
    useState<SelfPaymentRecordsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    const request =
      role === "seller"
        ? loadSellerPaymentRecords(period)
        : loadDeliveryPaymentRecords(period);

    request
      .then((response) => {
        if (!cancelled) {
          setData(response.payment_records);
        }
      })
      .catch((requestError) => {
        if (cancelled) return;

        if (
          Number(
            (requestError as { status?: number })?.status ||
              0,
          ) === 401
        ) {
          const next =
            role === "seller"
              ? "/seller/payment-records"
              : "/delivery/payment-records";

          navigate(
            `/react/login?next=${encodeURIComponent(next)}`,
            { replace: true },
          );
          return;
        }

        setError(
          settlementErrorMessage(
            requestError,
            "Unable to load payment records.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [role, period, navigate]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.records || []).filter((row) => {
      if (
        statusFilter !== "all" &&
        row.payment_record_status !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      const values =
        role === "seller"
          ? [
              row.order_number,
              row.booking_number,
              row.payment_reference,
              row.payment_method,
              row.payment_status,
              row.settlement_number,
            ]
          : [
              row.batch_number,
              row.payment_reference,
              row.payout_status,
              row.settlement_number,
              ...(row.cod_statuses || []),
            ];

      return values
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [data, statusFilter, search, role]);

  const filtered = useMemo(
    () =>
      visibleRows.reduce(
        (total, row) => {
          total.gross += Number(row.gross_amount || 0);
          total.commission += Number(
            row.commission_amount || 0,
          );
          total.cod += Number(
            row.cod_deduction_amount || 0,
          );
          total.net += Number(row.net_amount || 0);

          if (row.payment_record_status === "paid") {
            total.paid += Number(row.net_amount || 0);
          } else {
            total.pending += Number(row.net_amount || 0);
          }

          return total;
        },
        {
          gross: 0,
          commission: 0,
          cod: 0,
          net: 0,
          paid: 0,
          pending: 0,
        },
      ),
    [visibleRows],
  );

  const isSeller = role === "seller";

  return (
    <main className="settlement-page self-payment-records-page">
      <div className="settlement-container">
        <section
          className={`settlement-heading ${
            isSeller
              ? "seller-payment-records-hero"
              : "delivery-payment-records-hero"
          }`}
        >
          <div>
            <span className="settlement-eyebrow">
              {isSeller
                ? "Seller payments"
                : "Delivery payments"}
            </span>

            <h1>
              {isSeller
                ? "Seller Payment Records"
                : "Delivery Payment Records"}
            </h1>

            <p>
              {isSeller
                ? "Track every completed seller order, commission deduction, final earning, settlement status, payment reference and invoice in one table."
                : "Track every completed delivery batch, payout, commission, COD deduction, final earning, payment reference and invoice in one table."}
            </p>
          </div>

          <div className="settlement-actions">
            <Link
              className="settlement-button primary"
              to={
                isSeller
                  ? "/seller/earnings"
                  : "/delivery/earnings"
              }
            >
              Current Earnings
            </Link>

            <Link
              className="settlement-button secondary"
              to={
                isSeller
                  ? "/seller/payment-schedule"
                  : "/delivery/payment-schedule"
              }
            >
              Payment Schedule
            </Link>

            <Link
              className="settlement-button secondary"
              to="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </section>

        {error && (
          <div className="settlement-notice error">
            {error}
          </div>
        )}

        <section className="settlement-card payment-records-filter-card">
          <div className="payment-records-filter-grid">
            <label className="settlement-field">
              <span>Report month</span>
              <input
                type="month"
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value)
                }
              />
            </label>

            <label className="settlement-field">
              <span>Payment status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | "paid"
                      | "processing"
                      | "pending",
                  )
                }
              >
                <option value="all">All records</option>
                <option value="paid">Paid</option>
                <option value="processing">
                  Settlement processing
                </option>
                <option value="pending">
                  Pending settlement
                </option>
              </select>
            </label>

            <label className="settlement-field payment-record-search">
              <span>Search</span>
              <input
                type="search"
                value={search}
                placeholder={
                  isSeller
                    ? "Order, booking, reference…"
                    : "Batch, payout reference, COD…"
                }
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </label>
          </div>

          <div className="payment-record-filter-note">
            Showing <strong>{visibleRows.length}</strong> of{" "}
            <strong>{data?.record_count || 0}</strong>{" "}
            completed payment record(s).
          </div>
        </section>

        {loading || !data ? (
          <section className="settlement-card">
            Loading payment records…
          </section>
        ) : (
          <>
            <section className="payment-record-kpi-grid">
              <article className="payment-record-kpi gross">
                <span>
                  {isSeller
                    ? "Orders generated"
                    : "Delivery payout"}
                </span>
                <strong>{money(filtered.gross)}</strong>
              </article>

              <article className="payment-record-kpi commission">
                <span>Commission deducted</span>
                <strong>
                  {money(filtered.commission)}
                </strong>
              </article>

              {!isSeller && (
                <article className="payment-record-kpi cod">
                  <span>COD deducted</span>
                  <strong>{money(filtered.cod)}</strong>
                </article>
              )}

              <article className="payment-record-kpi net">
                <span>Final earnings</span>
                <strong>{money(filtered.net)}</strong>
              </article>

              <article className="payment-record-kpi paid">
                <span>Already paid</span>
                <strong>{money(filtered.paid)}</strong>
              </article>

              <article className="payment-record-kpi pending">
                <span>Pending / processing</span>
                <strong>{money(filtered.pending)}</strong>
              </article>
            </section>

            <section className="settlement-card payment-record-table-card">
              <div className="settlement-section-heading">
                <div>
                  <h2>
                    {isSeller
                      ? "Order-wise Payment Records"
                      : "Delivery-wise Payment Records"}
                  </h2>
                  <p>
                    Paid records remain visible here after the
                    current wallet is cleared, so you always have
                    a permanent payment reference and invoice
                    history.
                  </p>
                </div>

                <span className="settlement-chip green">
                  Fruveto Enterprices
                </span>
              </div>

              <div className="settlement-table-wrap payment-record-table-wrap">
                {isSeller ? (
                  <table className="settlement-table colorful payment-record-table">
                    <thead>
                      <tr>
                        <th>Order / Booking</th>
                        <th>Completed</th>
                        <th>Customer Payment</th>
                        <th>Generated Amount</th>
                        <th>Commission</th>
                        <th>Final Earning</th>
                        <th>Settlement</th>
                        <th>Payment Reference</th>
                        <th>Paid At</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleRows.map((row) => (
                        <SellerPaymentRecordRow
                          key={row.record_id}
                          row={row}
                        />
                      ))}

                      {!visibleRows.length && (
                        <tr>
                          <td
                            colSpan={10}
                            className="settlement-empty-cell"
                          >
                            No seller payment records match the
                            selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="settlement-table colorful payment-record-table">
                    <thead>
                      <tr>
                        <th>Delivery Batch</th>
                        <th>Completed</th>
                        <th>Deliveries</th>
                        <th>Delivery Payout</th>
                        <th>Commission</th>
                        <th>COD Deduction</th>
                        <th>Final Earning</th>
                        <th>Settlement</th>
                        <th>Payment Reference</th>
                        <th>Paid At</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleRows.map((row) => (
                        <DeliveryPaymentRecordRow
                          key={row.record_id}
                          row={row}
                        />
                      ))}

                      {!visibleRows.length && (
                        <tr>
                          <td
                            colSpan={11}
                            className="settlement-empty-cell"
                          >
                            No delivery payment records match the
                            selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SellerPaymentRecordRow({
  row,
}: {
  row: PaymentRecordRow;
}) {
  return (
    <tr>
      <td>
        <strong>
          {row.order_number ||
            row.booking_number ||
            row.record_id}
        </strong>
        {row.booking_number &&
          row.booking_number !== row.order_number && (
            <small>{row.booking_number}</small>
          )}
      </td>

      <td>{formatDate(row.completed_at)}</td>

      <td>
        <span
          className={`settlement-chip ${
            row.payment_status === "paid"
              ? "green"
              : "amber"
          }`}
        >
          {title(row.payment_status || "pending")}
        </span>
        <small>{title(row.payment_method)}</small>
      </td>

      <td>
        <strong>{money(row.gross_amount)}</strong>
      </td>

      <td>
        <strong>{money(row.commission_amount)}</strong>
        <small>
          {Number(
            row.commission_percent || 0,
          ).toFixed(2)}
          %
        </small>
      </td>

      <td>
        <strong className="payment-record-net">
          {money(row.net_amount)}
        </strong>
      </td>

      <td>
        <span
          className={`settlement-chip ${paymentStatusClass(
            row.payment_record_status,
          )}`}
        >
          {title(row.payment_record_status)}
        </span>
        {row.settlement_number && (
          <small>{row.settlement_number}</small>
        )}
      </td>

      <td>
        <strong>
          {row.payment_reference || "—"}
        </strong>
      </td>

      <td>{formatDate(row.paid_at)}</td>

      <td>
        {row.settlement_id ? (
          <a
            className="settlement-button mini secondary"
            href={settlementInvoiceUrl(
              row.settlement_id,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Invoice
          </a>
        ) : (
          <span className="settlement-muted">
            Not generated
          </span>
        )}
      </td>
    </tr>
  );
}

function DeliveryPaymentRecordRow({
  row,
}: {
  row: PaymentRecordRow;
}) {
  return (
    <tr>
      <td>
        <strong>
          {row.batch_number || row.record_id}
        </strong>
      </td>

      <td>{formatDate(row.completed_at)}</td>

      <td>
        <strong>{row.order_count || 0}</strong>
      </td>

      <td>
        <strong>{money(row.gross_amount)}</strong>
      </td>

      <td>
        <strong>{money(row.commission_amount)}</strong>
        <small>
          {Number(
            row.commission_percent || 0,
          ).toFixed(2)}
          %
        </small>
      </td>

      <td>
        <span
          className={`settlement-chip ${
            Number(row.cod_deduction_amount || 0) > 0
              ? "amber"
              : "green"
          }`}
        >
          {money(row.cod_deduction_amount)}
        </span>

        {(row.cod_statuses || []).length > 0 && (
          <small>
            {(row.cod_statuses || [])
              .map(title)
              .join(" · ")}
          </small>
        )}
      </td>

      <td>
        <strong className="payment-record-net">
          {money(row.net_amount)}
        </strong>
      </td>

      <td>
        <span
          className={`settlement-chip ${paymentStatusClass(
            row.payment_record_status,
          )}`}
        >
          {title(row.payment_record_status)}
        </span>
        {row.settlement_number && (
          <small>{row.settlement_number}</small>
        )}
      </td>

      <td>
        <strong>
          {row.payment_reference || "—"}
        </strong>
      </td>

      <td>{formatDate(row.paid_at)}</td>

      <td>
        {row.settlement_id ? (
          <a
            className="settlement-button mini secondary"
            href={settlementInvoiceUrl(
              row.settlement_id,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Invoice
          </a>
        ) : (
          <span className="settlement-muted">
            Not generated
          </span>
        )}
      </td>
    </tr>
  );
}

export function SellerPaymentRecordsPage() {
  return <SelfPaymentRecordsPage role="seller" />;
}

export function DeliveryPaymentRecordsPage() {
  return <SelfPaymentRecordsPage role="delivery" />;
}
