import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadAdminPaymentDesk,
  payAdminWalletManually,
  sendSettlementEmail,
  settlementErrorMessage,
  settlementInvoiceUrl,
  type PaymentDeskRow,
  type SettlementRecord,
  type SettlementRole,
} from "../services/settlementEarningsApi";
import "../styles/settlement-earnings.css";

type PaymentMethod = "bank_transfer" | "neft" | "imps" | "rtgs" | "upi";

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function title(value: unknown) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.readOnly = true;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function ManualPaymentPage({ role }: { role: SettlementRole }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PaymentDeskRow[]>([]);
  const [history, setHistory] = useState<SettlementRecord[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [lastPayment, setLastPayment] =
    useState<SettlementRecord | null>(null);

  const roleLabel = role === "seller" ? "Seller" : "Delivery";
  const route =
    role === "seller"
      ? "/admin/payments/sellers"
      : "/admin/payments/delivery";

  async function load() {
    try {
      const response = await loadAdminPaymentDesk(role);
      setRows(response.rows || []);
      setHistory(response.history || []);
      setCsrfToken(response.csrf_token || "");

      setSelectedPayeeId((current) => {
        if (
          current &&
          (response.rows || []).some(
            (row) => row.payee_id === current,
          )
        ) {
          return current;
        }

        const firstPayable = (response.rows || []).find(
          (row) =>
            row.bank?.payout_ready &&
            Number(row.wallet?.net_amount || 0) > 0,
        );

        return (
          firstPayable?.payee_id ||
          response.rows?.[0]?.payee_id ||
          ""
        );
      });
    } catch (requestError) {
      if (Number((requestError as any)?.status || 0) === 401) {
        navigate(
          `/react/login?next=${encodeURIComponent(route)}`,
          { replace: true },
        );
        return;
      }

      setError(
        settlementErrorMessage(
          requestError,
          `Unable to load ${roleLabel.toLowerCase()} payments.`,
        ),
      );
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const selected = useMemo(
    () =>
      rows.find((row) => row.payee_id === selectedPayeeId) ||
      null,
    [rows, selectedPayeeId],
  );

  const totals = useMemo(
    () => ({
      wallet: rows.reduce(
        (sum, row) => sum + Number(row.wallet?.net_amount || 0),
        0,
      ),
      gross: rows.reduce(
        (sum, row) => sum + Number(row.wallet?.gross_amount || 0),
        0,
      ),
      commission: rows.reduce(
        (sum, row) =>
          sum + Number(row.wallet?.commission_amount || 0),
        0,
      ),
      cod: rows.reduce(
        (sum, row) =>
          sum + Number(row.wallet?.cod_deduction_amount || 0),
        0,
      ),
      payable: rows.filter(
        (row) =>
          row.bank?.payout_ready &&
          Number(row.wallet?.net_amount || 0) > 0,
      ).length,
      bankReady: rows.filter((row) => row.bank?.payout_ready).length,
    }),
    [rows],
  );

  async function copy(label: string, value: string) {
    if (!value) return;

    try {
      await copyText(value);
      setCopyNotice(`${label} copied.`);
      window.setTimeout(() => setCopyNotice(""), 1600);
    } catch {
      setCopyNotice(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  async function makePayment() {
    if (!selected || !csrfToken) return;

    if (!selected.bank?.payout_ready) {
      setError(
        "Verified settlement bank details are not ready for this account.",
      );
      return;
    }

    if (Number(selected.wallet?.net_amount || 0) <= 0) {
      setError("There is no wallet amount available to pay.");
      return;
    }

    if (!paymentReference.trim()) {
      setError(
        "Enter the bank reference, UTR or transaction ID after making the payment.",
      );
      return;
    }

    setWorking("pay");
    setNotice("");
    setError("");
    setLastPayment(null);

    try {
      const response = await payAdminWalletManually(
        role,
        selected.payee_id,
        csrfToken,
        {
          paymentMethod,
          paymentReference: paymentReference.trim(),
          paymentNote: paymentNote.trim(),
        },
      );

      setLastPayment(response.settlement);
      setNotice(
        `${response.message} Wallet ${money(
          response.wallet_before.net_amount,
        )} → ${money(response.wallet_after.net_amount)}.`,
      );
      setCsrfToken(response.csrf_token || csrfToken);
      setPaymentReference("");
      setPaymentNote("");
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to record the manual payment.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function resendEmail(settlement: SettlementRecord) {
    if (!csrfToken) return;

    setWorking(`email-${settlement.id}`);
    setNotice("");
    setError("");

    try {
      const response = await sendSettlementEmail(
        settlement.id,
        csrfToken,
      );
      setNotice(response.message);
      setCsrfToken(response.csrf_token || csrfToken);
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to send the payment email.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <main className="settlement-page">
      <div className="settlement-container">
        <section className="settlement-heading payment-desk-hero">
          <div>
            <span className="settlement-eyebrow">
              Manual verified-account payment
            </span>
            <h1>{roleLabel} Payments</h1>
            <p>
              Review verified identity and bank information, transfer the
              payable wallet amount manually, then save the UTR/reference.
              Paid source records are closed immediately so the wallet starts
              again from new earnings.
            </p>
          </div>

          <div className="settlement-actions">
            <Link
              className="settlement-button secondary"
              to="/admin/settlement-schedules"
            >
              Settlement Schedules
            </Link>
            <Link
              className="settlement-button secondary"
              to="/admin/platform-earnings"
            >
              Platform Earnings
            </Link>
            <Link
              className="settlement-button secondary"
              to="/admin"
            >
              Admin Dashboard
            </Link>
          </div>
        </section>

        {notice && (
          <div className="settlement-notice success">{notice}</div>
        )}
        {error && (
          <div className="settlement-notice error">{error}</div>
        )}
        {copyNotice && (
          <div className="settlement-notice info">{copyNotice}</div>
        )}

        <section className="settlement-grid settlement-card report-stats payment-desk-stats">
          <article className="settlement-stat tone-green">
            <span>Total wallet payable</span>
            <strong>{money(totals.wallet)}</strong>
            <small>{totals.payable} account(s) ready to pay</small>
          </article>
          <article className="settlement-stat tone-blue">
            <span>Gross unsettled</span>
            <strong>{money(totals.gross)}</strong>
          </article>
          <article className="settlement-stat tone-purple">
            <span>Platform commission</span>
            <strong>{money(totals.commission)}</strong>
          </article>
          <article className="settlement-stat tone-amber">
            <span>COD deductions</span>
            <strong>{money(totals.cod)}</strong>
          </article>
          <article className="settlement-stat tone-green">
            <span>Verified bank accounts</span>
            <strong>
              {totals.bankReady}/{rows.length}
            </strong>
          </article>
        </section>

        <section className="settlement-card">
          <div className="settlement-section-heading">
            <div>
              <h2>{roleLabel} payment queue</h2>
              <p>
                Customer names and purchased-item details are intentionally
                excluded from this payment workflow.
              </p>
            </div>
            <span className="settlement-count-badge">
              {rows.length} {role === "seller" ? "seller(s)" : "person(s)"}
            </span>
          </div>

          <div className="settlement-table-wrap">
            <table className="settlement-table colorful payment-desk-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Verified bank account</th>
                  <th>IFSC / Bank</th>
                  <th>Wallet</th>
                  <th>Deductions</th>
                  <th>Schedule</th>
                  <th>Payment</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const selectedRow =
                    row.payee_id === selectedPayeeId;

                  return (
                    <tr
                      key={row.payee_id}
                      className={selectedRow ? "selected-payment-row" : ""}
                    >
                      <td>
                        <strong>{row.payee_name}</strong>
                        {row.bank?.verified_identity_name &&
                          row.bank.verified_identity_name !==
                            row.payee_name && (
                            <small>
                              Verified: {row.bank.verified_identity_name}
                            </small>
                          )}
                        <small>{row.email || "—"}</small>
                        <span
                          className={`settlement-chip ${
                            row.available_for_orders ? "green" : "amber"
                          }`}
                        >
                          {row.available_for_orders
                            ? "Taking orders"
                            : "Not taking orders"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {row.bank?.holder_name || "Bank not verified"}
                        </strong>
                        <div className="payment-copy-line">
                          <code>
                            {row.bank?.account_number ||
                              row.bank?.account_number_masked ||
                              "—"}
                          </code>
                          {row.bank?.account_number && (
                            <button
                              type="button"
                              className="settlement-copy-button"
                              onClick={() =>
                                void copy(
                                  "Account number",
                                  row.bank.account_number,
                                )
                              }
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <small>
                          {row.bank?.payout_ready
                            ? "✓ Approved settlement account"
                            : `Bank status: ${title(
                                row.bank?.bank_status || "Not ready",
                              )}`}
                        </small>
                      </td>

                      <td>
                        <div className="payment-copy-line">
                          <strong>{row.bank?.ifsc || "—"}</strong>
                          {row.bank?.ifsc && (
                            <button
                              type="button"
                              className="settlement-copy-button"
                              onClick={() =>
                                void copy("IFSC", row.bank.ifsc)
                              }
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <small>{row.bank?.bank_name || "—"}</small>
                        <small>{row.bank?.branch_name || ""}</small>
                      </td>

                      <td>
                        <strong className="wallet-money">
                          {money(row.wallet?.net_amount)}
                        </strong>
                        <small>
                          Gross {money(row.wallet?.gross_amount)}
                        </small>
                        <small>
                          {row.wallet?.record_count || 0} unsettled record(s)
                        </small>
                      </td>

                      <td>
                        <span className="settlement-chip purple">
                          Commission{" "}
                          {money(row.wallet?.commission_amount)}
                        </span>
                        {role === "delivery" && (
                          <span
                            className={`settlement-chip ${
                              Number(
                                row.wallet?.cod_deduction_amount || 0,
                              ) > 0
                                ? "amber"
                                : "green"
                            }`}
                          >
                            COD{" "}
                            {money(row.wallet?.cod_deduction_amount)}
                          </span>
                        )}
                        {Number(
                          row.wallet?.amount_due_to_platform || 0,
                        ) > 0 && (
                          <small className="wallet-due">
                            Due to Fruveto{" "}
                            {money(
                              row.wallet?.amount_due_to_platform,
                            )}
                          </small>
                        )}
                      </td>

                      <td>
                        <strong>
                          {row.schedule?.cadence_label ||
                            title(row.schedule?.cadence) ||
                            "—"}
                        </strong>
                        <small>
                          Next:{" "}
                          {row.schedule?.next_settlement_date || "—"}
                        </small>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            selectedRow
                              ? "settlement-button mini primary"
                              : "settlement-button mini secondary"
                          }
                          disabled={
                            !row.bank?.payout_ready ||
                            Number(row.wallet?.net_amount || 0) <= 0
                          }
                          onClick={() => {
                            setSelectedPayeeId(row.payee_id);
                            setLastPayment(null);
                            setError("");
                          }}
                        >
                          {selectedRow ? "Selected" : "Pay"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td className="settlement-empty-cell" colSpan={7}>
                      No {roleLabel.toLowerCase()} accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section className="settlement-card manual-payment-panel">
            <div className="settlement-section-heading">
              <div>
                <span className="settlement-eyebrow">
                  Selected payout
                </span>
                <h2>{selected.payee_name}</h2>
                <p>
                  Transfer exactly{" "}
                  <strong>{money(selected.wallet?.net_amount)}</strong>{" "}
                  to the verified account below. After the bank/UPI transfer
                  succeeds, enter the transaction reference and mark it paid.
                </p>
              </div>
              <strong className="manual-pay-amount">
                {money(selected.wallet?.net_amount)}
              </strong>
            </div>

            <div className="verified-bank-payment-card">
              <div>
                <span>Verified identity</span>
                <strong>
                  {selected.bank?.verified_identity_name ||
                    selected.full_name ||
                    selected.payee_name}
                </strong>
              </div>
              <div>
                <span>Account holder</span>
                <strong>{selected.bank?.holder_name || "—"}</strong>
              </div>
              <div>
                <span>Account number</span>
                <strong>{selected.bank?.account_number || "—"}</strong>
              </div>
              <div>
                <span>IFSC</span>
                <strong>{selected.bank?.ifsc || "—"}</strong>
              </div>
              <div>
                <span>Bank</span>
                <strong>{selected.bank?.bank_name || "—"}</strong>
              </div>
              <div>
                <span>Branch</span>
                <strong>{selected.bank?.branch_name || "—"}</strong>
              </div>
            </div>

            {!selected.bank?.payout_ready && (
              <div className="settlement-notice error">
                This verified bank account is not approved/complete. Finish the
                bank-review process before making the payout.
              </div>
            )}

            <div className="settlement-form-grid payment-fields">
              <label className="settlement-field">
                <span>Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as PaymentMethod,
                    )
                  }
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="neft">NEFT</option>
                  <option value="imps">IMPS</option>
                  <option value="rtgs">RTGS</option>
                  <option value="upi">UPI</option>
                </select>
              </label>

              <label className="settlement-field">
                <span>UTR / transaction reference</span>
                <input
                  value={paymentReference}
                  placeholder="Enter reference after payment"
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                />
              </label>

              <label className="settlement-field">
                <span>Payment note (optional)</span>
                <input
                  value={paymentNote}
                  placeholder="Example: September manual payout"
                  onChange={(event) =>
                    setPaymentNote(event.target.value)
                  }
                />
              </label>
            </div>

            <div className="manual-payment-confirmation">
              <div>
                <span>Before payment</span>
                <strong>{money(selected.wallet?.net_amount)}</strong>
              </div>
              <div className="manual-arrow">→</div>
              <div>
                <span>Wallet after successful full payout</span>
                <strong>₹0.00</strong>
              </div>
            </div>

            <button
              type="button"
              className="settlement-button primary manual-pay-submit"
              disabled={
                working === "pay" ||
                !selected.bank?.payout_ready ||
                Number(selected.wallet?.net_amount || 0) <= 0 ||
                !paymentReference.trim()
              }
              onClick={() => void makePayment()}
            >
              {working === "pay"
                ? "Saving payment…"
                : `Mark Paid ${money(selected.wallet?.net_amount)}`}
            </button>

            <p className="manual-payment-warning">
              Only click <strong>Mark Paid</strong> after the money has actually
              been transferred. Fruveto stores the account snapshot, payment
              method, reference, paid time and administrator audit details.
            </p>
          </section>
        )}

        {lastPayment && (
          <section className="settlement-card custom-payment-success">
            <div className="custom-payment-success-head">
              <div>
                <span className="settlement-status paid">Paid</span>
                <h3>{lastPayment.settlement_number}</h3>
                <p>
                  {title(lastPayment.payment_method)} ·{" "}
                  {lastPayment.payment_reference}
                </p>
              </div>
              <strong className="custom-paid-amount">
                {money(lastPayment.net_amount)}
              </strong>
            </div>

            <div className="custom-payment-success-actions">
              <a
                className="settlement-button secondary"
                href={settlementInvoiceUrl(lastPayment.id)}
                target="_blank"
                rel="noreferrer"
                download
              >
                Download Invoice
              </a>
              <button
                className="settlement-button secondary"
                type="button"
                disabled={working === `email-${lastPayment.id}`}
                onClick={() => void resendEmail(lastPayment)}
              >
                {working === `email-${lastPayment.id}`
                  ? "Sending…"
                  : "Send / Re-send Email"}
              </button>
            </div>
          </section>
        )}

        <section className="settlement-card">
          <div className="settlement-section-heading">
            <div>
              <h2>Paid payment history</h2>
              <p>
                Audit trail with the bank-account snapshot used for each
                settlement.
              </p>
            </div>
            <span className="settlement-count-badge">
              {history.length} payment(s)
            </span>
          </div>

          <div className="settlement-table-wrap">
            <table className="settlement-table colorful payment-history-table">
              <thead>
                <tr>
                  <th>Paid</th>
                  <th>Payee</th>
                  <th>Bank account</th>
                  <th>Reference</th>
                  <th>Gross</th>
                  <th>Commission</th>
                  {role === "delivery" && <th>COD</th>}
                  <th>Net paid</th>
                  <th>Email</th>
                  <th>Invoice</th>
                </tr>
              </thead>

              <tbody>
                {history.map((settlement) => (
                  <tr key={settlement.id}>
                    <td>
                      <strong>{formatDate(settlement.paid_at)}</strong>
                      <small>{settlement.settlement_number}</small>
                    </td>
                    <td>
                      <strong>{settlement.payee_name}</strong>
                      <small>
                        {settlement.payment_verified_identity_name || ""}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {settlement.payment_bank_holder_name || "—"}
                      </strong>
                      <small>
                        {settlement.payment_bank_account_masked || "—"}
                      </small>
                      <small>{settlement.payment_bank_ifsc || ""}</small>
                    </td>
                    <td>
                      <strong>{settlement.payment_reference || "—"}</strong>
                      <small>{title(settlement.payment_method)}</small>
                    </td>
                    <td>{money(settlement.gross_amount)}</td>
                    <td>{money(settlement.commission_amount)}</td>
                    {role === "delivery" && (
                      <td>{money(settlement.cod_deduction_amount)}</td>
                    )}
                    <td>
                      <strong>{money(settlement.net_amount)}</strong>
                    </td>
                    <td>
                      <span
                        className={`settlement-chip ${
                          settlement.email_status === "sent"
                            ? "green"
                            : "amber"
                        }`}
                      >
                        {title(settlement.email_status || "Not sent")}
                      </span>
                      <button
                        className="settlement-button mini secondary"
                        type="button"
                        disabled={
                          working === `email-${settlement.id}`
                        }
                        onClick={() => void resendEmail(settlement)}
                      >
                        {working === `email-${settlement.id}`
                          ? "Sending…"
                          : "Email"}
                      </button>
                    </td>
                    <td>
                      <a
                        className="settlement-button mini secondary"
                        href={settlementInvoiceUrl(settlement.id)}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}

                {!history.length && (
                  <tr>
                    <td
                      className="settlement-empty-cell"
                      colSpan={role === "delivery" ? 10 : 9}
                    >
                      No paid settlements yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="settlement-card company-note">
          <strong>Fruveto Enterprices</strong>
          <p>Hyderabad - 500062 · For more info: fruveto.com</p>
        </section>
      </div>
    </main>
  );
}

export function AdminSellerPaymentsPage() {
  return <ManualPaymentPage role="seller" />;
}

export function AdminDeliveryPaymentsPage() {
  return <ManualPaymentPage role="delivery" />;
}
