import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadAdminSettlementSchedules,
  loadMySettlementSchedule,
  loadSettlementWalletPreview,
  payCustomSettlement,
  prepareSettlement,
  saveAdminSettlementSchedule,
  saveMySettlementSchedule,
  sendSettlementEmail,
  settlementErrorMessage,
  settlementInvoiceUrl,
  type AdminScheduleRow,
  type EarningsRow,
  type SettlementCadence,
  type SettlementRecord,
  type SettlementRole,
  type SettlementSchedule,
  type SettlementWalletPreview,
} from "../services/settlementEarningsApi";
import "../styles/settlement-earnings.css";

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function monthStart() {
  return `${currentMonth()}-01`;
}

function title(value: unknown) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const scheduleColors: Record<SettlementCadence, string> = {
  twice_weekly: "purple",
  weekly: "green",
  monthly: "blue",
};

function SelfSchedulePage({ role }: { role: SettlementRole }) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<SettlementSchedule | null>(null);
  const [outstanding, setOutstanding] = useState<EarningsRow | null>(null);
  const [options, setOptions] = useState<
    Array<{ value: SettlementCadence; label: string; description: string }>
  >([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await loadMySettlementSchedule();
      setSchedule(response.schedule);
      setOutstanding(response.current_outstanding);
      setOptions(response.options);
      setCsrfToken(response.csrf_token);
    } catch (requestError) {
      if (Number((requestError as any)?.status || 0) === 401) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            role === "seller"
              ? "/seller/payment-schedule"
              : "/delivery/payment-schedule",
          )}`,
          { replace: true },
        );
      } else {
        setError(
          settlementErrorMessage(
            requestError,
            "Unable to load payment schedule.",
          ),
        );
      }
    }
  }

  useEffect(() => {
    void load();
  }, [role]);

  async function choose(cadence: SettlementCadence) {
    if (!csrfToken) return;

    setWorking(cadence);
    setError("");
    try {
      const response = await saveMySettlementSchedule(cadence, csrfToken);
      setSchedule(response.schedule);
      setNotice(response.message);
      setCsrfToken(response.csrf_token || csrfToken);
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to update schedule.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <main className="settlement-page">
      <div className="settlement-container">
        <section className="settlement-heading schedule-hero">
          <div>
            <span className="settlement-eyebrow">Payment preference</span>
            <h1>
              {role === "seller"
                ? "Seller Payment Schedule"
                : "Delivery Payment Schedule"}
            </h1>
            <p>
              Your wallet contains only unsettled completed earnings. Once a full
              settlement is paid, the paid wallet becomes ₹0.00 and new completed
              work starts a fresh wallet balance.
            </p>
          </div>
          <div className="settlement-actions">
            <Link
              className="settlement-button secondary"
              to={role === "seller" ? "/seller/earnings" : "/delivery/earnings"}
            >
              Earnings Report
            </Link>
            <Link className="settlement-button secondary" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </section>

        {notice && <div className="settlement-notice success">{notice}</div>}
        {error && <div className="settlement-notice error">{error}</div>}

        <section className="settlement-grid settlement-card report-stats">
          <article className="settlement-stat tone-green wallet-highlight">
            <span>Current wallet balance</span>
            <strong>{money(outstanding?.net_amount)}</strong>
            <small>{outstanding?.record_count || 0} unsettled record(s)</small>
          </article>
          <article className="settlement-stat tone-purple">
            <span>Gross generated</span>
            <strong>{money(outstanding?.gross_amount)}</strong>
          </article>
          <article className="settlement-stat tone-amber">
            <span>Commission + COD deduction</span>
            <strong>
              {money(
                Number(outstanding?.commission_amount || 0) +
                  Number(outstanding?.cod_deduction_amount || 0),
              )}
            </strong>
          </article>
          <article className="settlement-stat tone-blue">
            <span>Next scheduled date</span>
            <strong>{schedule?.next_settlement_date || "—"}</strong>
          </article>
        </section>

        <section className="settlement-card">
          <div className="settlement-section-heading">
            <div>
              <h2>Choose settlement frequency</h2>
              <p>
                Monthly always follows the actual final calendar date, including
                February 28/29 and 30/31-day months.
              </p>
            </div>
          </div>

          <div className="schedule-option-grid">
            {options.map((option) => {
              const selected = schedule?.cadence === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={`schedule-option tone-${scheduleColors[option.value]} ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() => void choose(option.value)}
                  disabled={Boolean(working)}
                >
                  <span className="schedule-radio">{selected ? "✓" : ""}</span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  {working === option.value && <em>Saving…</em>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settlement-card company-note">
          <strong>Invoice issuer</strong>
          <p>
            Fruveto Enterprices · Hyderabad - 500062 · For more info: fruveto.com
          </p>
        </section>
      </div>
    </main>
  );
}

export function SellerPaymentSchedulePage() {
  return <SelfSchedulePage role="seller" />;
}

export function DeliveryPaymentSchedulePage() {
  return <SelfSchedulePage role="delivery" />;
}

type PaymentMethod = "bank_transfer" | "upi" | "cash" | "other";

export function AdminSettlementSchedulesPage() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] =
    useState<"all" | SettlementRole>("all");
  const [rows, setRows] = useState<AdminScheduleRow[]>([]);
  const [customPayments, setCustomPayments] = useState<SettlementRecord[]>([]);
  const [options, setOptions] = useState<
    Array<{ value: SettlementCadence; label: string; description: string }>
  >([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [customRole, setCustomRole] = useState<SettlementRole>("seller");
  const [customPayee, setCustomPayee] = useState("");
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [clearWallet, setClearWallet] = useState(true);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [walletPreview, setWalletPreview] =
    useState<SettlementWalletPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paidSettlement, setPaidSettlement] =
    useState<SettlementRecord | null>(null);

  async function load() {
    try {
      const response = await loadAdminSettlementSchedules(roleFilter);
      setRows(response.rows || []);
      setCustomPayments(response.custom_payments || []);
      setOptions(response.options || []);
      setCsrfToken(response.csrf_token || "");
    } catch (requestError) {
      if (Number((requestError as any)?.status || 0) === 401) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            "/admin/settlement-schedules",
          )}`,
          { replace: true },
        );
      } else {
        setError(
          settlementErrorMessage(requestError, "Unable to load schedules."),
        );
      }
    }
  }

  useEffect(() => {
    void load();
  }, [roleFilter]);

  const customPeople = useMemo(
    () => rows.filter((row) => row.role === customRole),
    [rows, customRole],
  );

  useEffect(() => {
    if (!customPeople.some((row) => row.payee_id === customPayee)) {
      setCustomPayee(customPeople[0]?.payee_id || "");
    }
  }, [customPeople, customPayee]);

  useEffect(() => {
    if (!customPayee) {
      setWalletPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void loadSettlementWalletPreview(
      customRole,
      customPayee,
      fromDate,
      toDate,
      clearWallet,
    )
      .then((response) => {
        if (cancelled) return;
        setWalletPreview(response.preview);
        if (response.csrf_token) setCsrfToken(response.csrf_token);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setWalletPreview(null);
        setError(
          settlementErrorMessage(
            requestError,
            "Unable to calculate wallet balance.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customRole, customPayee, fromDate, toDate, clearWallet]);

  async function update(row: AdminScheduleRow, cadence: SettlementCadence) {
    if (!csrfToken) return;
    setWorking(`${row.role}-${row.payee_id}`);
    setError("");
    try {
      const response = await saveAdminSettlementSchedule(
        row.role,
        row.payee_id,
        cadence,
        csrfToken,
      );
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(requestError, "Unable to update schedule."),
      );
    } finally {
      setWorking("");
    }
  }

  async function prepareDue(row: AdminScheduleRow) {
    if (!csrfToken) return;
    setWorking(`due-${row.role}-${row.payee_id}`);
    setPaidSettlement(null);
    setError("");
    try {
      const response = await prepareSettlement(
        row.role,
        row.payee_id,
        currentMonth(),
        csrfToken,
        {
          fromDate: row.suggested_range_start || monthStart(),
          toDate: row.suggested_range_end || today(),
          cadence: row.schedule.cadence,
        },
      );
      setNotice(
        `Scheduled settlement prepared: ${response.settlement.settlement_number}. Use the Seller/Delivery Settlements page to pay it.`,
      );
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to prepare scheduled settlement.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function customPay() {
    if (!csrfToken || !customPayee) return;
    if (!paymentReference.trim()) {
      setError("Enter the payment reference / UTR before custom payment.");
      return;
    }

    setWorking("custom");
    setPaidSettlement(null);
    setNotice("");
    setError("");

    try {
      const response = await payCustomSettlement(
        customRole,
        customPayee,
        csrfToken,
        {
          fromDate,
          toDate,
          clearWallet,
          paymentMethod,
          paymentReference: paymentReference.trim(),
        },
      );

      setPaidSettlement(response.settlement);
      setCsrfToken(response.csrf_token || csrfToken);
      setNotice(
        `${response.message} Wallet: ${money(
          response.wallet_before.net_amount,
        )} → ${money(response.wallet_after.net_amount)}.`,
      );
      setPaymentReference("");
      await load();

      const refreshed = await loadSettlementWalletPreview(
        customRole,
        customPayee,
        fromDate,
        toDate,
        clearWallet,
      );
      setWalletPreview(refreshed.preview);
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to complete custom payment.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function emailInvoice(settlement: SettlementRecord) {
    if (!csrfToken) return;
    setWorking(`email-${settlement.id}`);
    setError("");
    try {
      const response = await sendSettlementEmail(settlement.id, csrfToken);
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to email settlement invoice.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  const currentCustomPerson = customPeople.find(
    (row) => row.payee_id === customPayee,
  );

  return (
    <main className="settlement-page">
      <div className="settlement-container">
        <section className="settlement-heading schedule-admin-hero">
          <div>
            <span className="settlement-eyebrow">Admin payment operations</span>
            <h1>Settlement Schedules, Wallets & Custom Pay</h1>
            <p>
              Wallet balance is the current unsettled amount after commission and
              COD deductions. Custom Pay immediately records payment, marks the
              records paid, generates the invoice and recalculates the wallet.
            </p>
          </div>
          <div className="settlement-actions">
            <Link className="settlement-button primary" to="/admin/payments/sellers">
              Seller Payments
            </Link>
            <Link className="settlement-button primary" to="/admin/payments/delivery">
              Delivery Payments
            </Link>
            <Link className="settlement-button secondary" to="/admin/platform-earnings">
              Platform Earnings
            </Link>
            <Link className="settlement-button secondary" to="/admin/earnings">
              Earnings Centre
            </Link>
          </div>
        </section>

        {notice && <div className="settlement-notice success">{notice}</div>}
        {error && <div className="settlement-notice error">{error}</div>}

        <section className="settlement-card">
          <label className="settlement-field">
            <span>Show</span>
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as "all" | SettlementRole)
              }
            >
              <option value="all">Seller + Delivery</option>
              <option value="seller">Sellers</option>
              <option value="delivery">Delivery people</option>
            </select>
          </label>

          <div className="settlement-table-wrap">
            <table className="settlement-table colorful">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Availability</th>
                  <th>Current Schedule</th>
                  <th>Next Due</th>
                  <th>Records</th>
                  <th>Gross</th>
                  <th>Commission</th>
                  <th>COD</th>
                  <th>Wallet Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.role}-${row.payee_id}`}>
                    <td>
                      <strong>{row.payee_name}</strong>
                      <small>{row.role} · {row.payee_email}</small>
                    </td>
                    <td>
                      <span
                        className={`settlement-chip ${
                          row.available_for_orders ? "green" : "amber"
                        }`}
                      >
                        {row.available_for_orders ? "Taking orders" : "Paused"}
                      </span>
                    </td>
                    <td>
                      <select
                        value={row.schedule.cadence}
                        disabled={working === `${row.role}-${row.payee_id}`}
                        onChange={(event) =>
                          void update(
                            row,
                            event.target.value as SettlementCadence,
                          )
                        }
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {row.schedule.next_settlement_date}
                      <small>{row.schedule.due_today ? "Due today" : ""}</small>
                    </td>
                    <td>{row.outstanding.record_count}</td>
                    <td>{money(row.outstanding.gross_amount)}</td>
                    <td>{money(row.outstanding.commission_amount)}</td>
                    <td>{money(row.outstanding.cod_deduction_amount)}</td>
                    <td>
                      <strong className="wallet-money">
                        {money(row.wallet?.net_amount ?? row.outstanding.net_amount)}
                      </strong>
                      {Number(
                        row.wallet?.amount_due_to_platform ||
                          row.outstanding.amount_due_to_platform ||
                          0,
                      ) > 0 && (
                        <small className="wallet-due">
                          Due to Fruveto: {money(
                            row.wallet?.amount_due_to_platform ||
                              row.outstanding.amount_due_to_platform,
                          )}
                        </small>
                      )}
                    </td>
                    <td>
                      {row.schedule.due_today ? (
                        <button
                          className="settlement-button mini primary"
                          type="button"
                          disabled={
                            working === `due-${row.role}-${row.payee_id}` ||
                            (row.outstanding.record_count <= 0 &&
                              row.outstanding.cod_deduction_amount <= 0)
                          }
                          onClick={() => void prepareDue(row)}
                        >
                          {working === `due-${row.role}-${row.payee_id}`
                            ? "Preparing…"
                            : "Prepare Due"}
                        </button>
                      ) : (
                        <span className="settlement-chip green">Scheduled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="settlement-card custom-settlement-card">
          <div className="settlement-section-heading">
            <div>
              <h2>Custom Pay — Pay & Mark Paid Immediately</h2>
              <p>
                Use this when Fruveto is paying on the same day. The payment
                reference is stored, records are marked settled, the invoice is
                generated and the wallet is recalculated immediately.
              </p>
            </div>
            <span className="settlement-chip purple">Immediate payment</span>
          </div>

          <div className="settlement-form-grid four">
            <label className="settlement-field">
              <span>Role</span>
              <select
                value={customRole}
                onChange={(event) => {
                  setCustomRole(event.target.value as SettlementRole);
                  setRoleFilter("all");
                  setPaidSettlement(null);
                }}
              >
                <option value="seller">Seller</option>
                <option value="delivery">Delivery person</option>
              </select>
            </label>

            <label className="settlement-field">
              <span>Payee</span>
              <select
                value={customPayee}
                onChange={(event) => {
                  setCustomPayee(event.target.value);
                  setPaidSettlement(null);
                }}
              >
                <option value="">Select</option>
                {customPeople.map((row) => (
                  <option key={row.payee_id} value={row.payee_id}>
                    {row.payee_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="settlement-field">
              <span>From</span>
              <input
                type="date"
                value={fromDate}
                disabled={clearWallet}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>

            <label className="settlement-field">
              <span>To</span>
              <input
                type="date"
                value={toDate}
                disabled={clearWallet}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
          </div>

          <label className="custom-wallet-toggle">
            <input
              type="checkbox"
              checked={clearWallet}
              onChange={(event) => {
                setClearWallet(event.target.checked);
                setPaidSettlement(null);
              }}
            />
            <span>
              <strong>Clear full current wallet</strong>
              <small>
                Recommended for Custom Pay. This pays all currently unsettled
                completed records up to today so the wallet becomes ₹0.00 after
                payment, provided no new work is completed simultaneously.
              </small>
            </span>
          </label>

          <div className="custom-wallet-preview">
            <article className="wallet-card current">
              <span>Current wallet</span>
              <strong>
                {previewLoading
                  ? "Calculating…"
                  : money(walletPreview?.wallet.net_amount)}
              </strong>
              <small>
                Gross {money(walletPreview?.wallet.gross_amount)} · {walletPreview?.wallet.record_count || 0} record(s)
              </small>
            </article>

            <article className="wallet-card payout">
              <span>This custom payment</span>
              <strong>
                {previewLoading ? "—" : money(walletPreview?.selected.net_amount)}
              </strong>
              <small>
                Commission {money(walletPreview?.selected.commission_amount)} · COD {money(walletPreview?.selected.cod_deduction_amount)}
              </small>
            </article>

            <article className="wallet-card after">
              <span>Wallet after payment</span>
              <strong>
                {previewLoading
                  ? "—"
                  : money(walletPreview?.projected_wallet_after)}
              </strong>
              <small>
                {clearWallet
                  ? "Full-wallet custom payment closes the current payable wallet"
                  : "Remaining unsettled balance outside the selected date range"}
              </small>
            </article>
          </div>

          {currentCustomPerson && (
            <div className="custom-payee-banner">
              <div>
                <span>Paying</span>
                <strong>{currentCustomPerson.payee_name}</strong>
                <small>{currentCustomPerson.payee_email}</small>
              </div>
              <div>
                <span>Role</span>
                <strong>{title(currentCustomPerson.role)}</strong>
              </div>
            </div>
          )}

          <div className="settlement-form-grid payment-fields">
            <label className="settlement-field">
              <span>Payment method</span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethod)
                }
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="settlement-field custom-reference-field">
              <span>Payment reference / UTR / transaction ID</span>
              <input
                value={paymentReference}
                placeholder="Example: UTR123456789"
                onChange={(event) => setPaymentReference(event.target.value)}
              />
            </label>
          </div>

          <div className="custom-pay-actions">
            <button
              className="settlement-button primary custom-pay-button"
              type="button"
              disabled={
                working === "custom" ||
                !customPayee ||
                !paymentReference.trim() ||
                previewLoading ||
                Number(walletPreview?.selected.net_amount || 0) <= 0
              }
              onClick={() => void customPay()}
            >
              {working === "custom"
                ? "Paying & closing…"
                : `Pay & Mark Paid ${money(walletPreview?.selected.net_amount)}`}
            </button>
            <small>
              This action stores the payment reference, marks included records
              paid/settled, recalculates the wallet and creates the invoice.
            </small>
          </div>

          {paidSettlement && (
            <div className="custom-payment-success">
              <div className="custom-payment-success-head">
                <div>
                  <span className="settlement-status paid">Paid</span>
                  <h3>{paidSettlement.settlement_number}</h3>
                  <p>
                    Reference: <strong>{paidSettlement.payment_reference}</strong> · {title(paidSettlement.payment_method)}
                  </p>
                </div>
                <strong className="custom-paid-amount">
                  {money(paidSettlement.net_amount)}
                </strong>
              </div>

              <div className="custom-payment-success-actions">
                <a
                  className="settlement-button secondary"
                  href={settlementInvoiceUrl(paidSettlement.id)}
                  target="_blank"
                  rel="noreferrer"
                  download
                >
                  Download Invoice
                </a>
                <button
                  className="settlement-button secondary"
                  type="button"
                  disabled={working === `email-${paidSettlement.id}`}
                  onClick={() => void emailInvoice(paidSettlement)}
                >
                  {working === `email-${paidSettlement.id}`
                    ? "Sending…"
                    : "Email Invoice"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="settlement-card">
          <div className="settlement-section-heading">
            <div>
              <h2>Custom Payment History</h2>
              <p>Audit trail for every custom payment already marked paid.</p>
            </div>
            <span className="settlement-count-badge">
              {customPayments.length} payment(s)
            </span>
          </div>

          <div className="settlement-table-wrap">
            <table className="settlement-table colorful custom-history-table">
              <thead>
                <tr>
                  <th>Paid At</th>
                  <th>Payee</th>
                  <th>Role</th>
                  <th>Gross</th>
                  <th>Commission</th>
                  <th>COD</th>
                  <th>Paid Amount</th>
                  <th>Reference</th>
                  <th>Wallet After</th>
                  <th>Invoice / Email</th>
                </tr>
              </thead>
              <tbody>
                {customPayments.length ? (
                  customPayments.map((settlement) => (
                    <tr key={settlement.id}>
                      <td>{settlement.paid_at || "—"}</td>
                      <td>
                        <strong>{settlement.payee_name}</strong>
                        <small>{settlement.payee_email}</small>
                      </td>
                      <td>{title(settlement.role)}</td>
                      <td>{money(settlement.gross_amount)}</td>
                      <td>{money(settlement.commission_amount)}</td>
                      <td>{money(settlement.cod_deduction_amount)}</td>
                      <td><strong>{money(settlement.net_amount)}</strong></td>
                      <td>
                        {settlement.payment_reference || "—"}
                        <small>{title(settlement.payment_method)}</small>
                      </td>
                      <td>{money(settlement.wallet_after_amount)}</td>
                      <td>
                        <div className="settlement-row-actions">
                          <a
                            className="settlement-button mini secondary"
                            href={settlementInvoiceUrl(settlement.id)}
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            Download
                          </a>
                          <button
                            className="settlement-button mini secondary"
                            type="button"
                            disabled={working === `email-${settlement.id}`}
                            onClick={() => void emailInvoice(settlement)}
                          >
                            {working === `email-${settlement.id}`
                              ? "Sending…"
                              : "Email"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="settlement-empty-cell" colSpan={10}>
                      No custom payments have been completed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
