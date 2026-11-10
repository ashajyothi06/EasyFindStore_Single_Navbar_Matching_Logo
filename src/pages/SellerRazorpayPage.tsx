import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  isCsrfError,
  loadSellerRazorpay,
  saveSellerRazorpayCredentials,
  type RazorpayMode,
  type RazorpayStateResponse,
} from "../services/sellerRazorpayApi";
import "../styles/seller-razorpay.css";

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SellerRazorpayPage() {
  const [data, setData] = useState<RazorpayStateResponse | null>(null);
  const [mode, setMode] = useState<RazorpayMode>("test");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const payload = await loadSellerRazorpay();

        if (cancelled) return;

        setData(payload);
        setMode(payload.gateway?.mode || "test");
      } catch (error) {
        if (isAuthenticationError(error)) {
          window.location.assign(
            "/react/login?next=/seller/payments/razorpay",
          );
          return;
        }

        if (!cancelled) {
          setNotice({
            kind: "error",
            text: errorMessage(
              error,
              "Unable to load Razorpay settings.",
            ),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const csrfToken = data?.csrf_token || "";

    if (!csrfToken) {
      setNotice({
        kind: "error",
        text: "The security token is unavailable. Refresh the page.",
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await saveSellerRazorpayCredentials(
        csrfToken,
        {
          mode,
          key_id: keyId.trim() || undefined,
          key_secret: keySecret.trim() || undefined,
        },
      );

      setData(response);
      setMode(response.gateway?.mode || mode);
      setKeyId("");
      setKeySecret("");
      setNotice({
        kind: "success",
        text:
          response.message ||
          "Credentials submitted for administrator testing.",
      });

      window.dispatchEvent(
        new CustomEvent("seller-razorpay-updated"),
      );
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      if (isAuthenticationError(error)) {
        window.location.assign(
          "/react/login?next=/seller/payments/razorpay",
        );
        return;
      }

      setNotice({
        kind: "error",
        text: errorMessage(
          error,
          "Unable to save Razorpay credentials.",
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="razorpay-page">
        <div className="razorpay-page-container">
          <section className="razorpay-loading" aria-busy="true">
            <div className="razorpay-spinner" />
            <p>Loading Razorpay settings…</p>
          </section>
        </div>
      </main>
    );
  }

  const gateway = data?.gateway;
  const state = data?.state;
  const bankVerified = Boolean(data?.bank_verified);

  return (
    <main className="razorpay-page">
      <div className="razorpay-page-container">
        <section className="payment-heading">
          <div>
            <span className="razorpay-eyebrow">Seller payments</span>
            <h1>Razorpay Credentials</h1>
            <p>
              Add the Razorpay Key ID and Key Secret used for seller
              payments. Both values are encrypted before they are saved.
            </p>
          </div>

          <Link className="razorpay-button secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        </section>

        {notice && (
          <div className={`razorpay-notice ${notice.kind}`} role="status">
            {notice.text}
          </div>
        )}

        <section className="payment-stats">
          <article>
            <strong>
              {label(gateway?.status || "NOT_CONFIGURED")}
            </strong>
            <span>Verification status</span>
          </article>
          <article>
            <strong>{label(gateway?.mode || "test")}</strong>
            <span>Credential mode</span>
          </article>
          <article>
            <strong>
              {gateway?.key_id_masked || "Not saved"}
            </strong>
            <span>Saved Key ID</span>
          </article>
          <article>
            <strong>
              {gateway?.active_for_live_payments
                ? "Enabled"
                : "Disabled"}
            </strong>
            <span>Real payments</span>
          </article>
        </section>

        {!bankVerified ? (
          <section className="razorpay-notice error large">
            <h2>Bank verification is required</h2>
            <p>
              Razorpay credentials can be submitted only after the
              seller bank account has been approved.
            </p>
            <Link
              className="razorpay-button primary"
              to="/seller/verification"
            >
              Open Bank Verification
            </Link>
          </section>
        ) : (
          <section className="payment-layout">
            <form
              className="payment-card"
              onSubmit={submit}
              autoComplete="off"
            >
              <h2>Add or Replace Credentials</h2>
              <p className="razorpay-muted">
                Leave an existing field blank to keep its stored encrypted
                value. Any change disables real payments until admin
                testing is completed again.
              </p>

              <label>
                Credential mode
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as RazorpayMode)
                  }
                  required
                >
                  <option value="test">Test Mode</option>
                  <option value="live">Live Mode</option>
                </select>
              </label>

              <label>
                RAZORPAY_KEY_ID
                <input
                  type="password"
                  value={keyId}
                  onChange={(event) => setKeyId(event.target.value)}
                  placeholder={
                    gateway?.key_id_masked || "Enter Key ID"
                  }
                  autoComplete="new-password"
                />
              </label>

              <label>
                RAZORPAY_KEY_SECRET
                <input
                  type="password"
                  value={keySecret}
                  onChange={(event) => setKeySecret(event.target.value)}
                  placeholder={
                    gateway?.secret_masked || "Enter Key Secret"
                  }
                  autoComplete="new-password"
                />
              </label>

              <div className="security-note">
                <strong>Security</strong>
                <p>
                  The secret is never displayed again. It is encrypted
                  using authenticated encryption before storage.
                </p>
              </div>

              <button
                className="razorpay-button primary"
                type="submit"
                disabled={saving || !data?.csrf_token}
              >
                {saving
                  ? "Saving…"
                  : "Save and Submit for Admin Test"}
              </button>
            </form>

            <aside className="payment-card">
              <h2>Approval Flow</h2>

              <ol className="flow-list">
                <li className="done">
                  Bank verification approved
                </li>
                <li className={gateway?.has_key_id ? "done" : ""}>
                  Seller credentials encrypted and saved
                </li>
                <li className={state?.test_verified ? "done" : ""}>
                  Administrator payment test completed
                </li>
                <li className={state?.live_active ? "done" : ""}>
                  Live credentials activated for customer payments
                </li>
              </ol>

              {gateway?.mode === "live" ? (
                <div className="razorpay-notice error">
                  <strong>Live Mode</strong>
                  <p>
                    An administrator payment test using live credentials
                    involves a real transaction.
                  </p>
                </div>
              ) : (
                <div className="razorpay-notice warning">
                  <strong>Test Mode</strong>
                  <p>
                    Test keys simulate transactions and cannot accept
                    real customer payments.
                  </p>
                </div>
              )}
            </aside>
          </section>
        )}

        {gateway?.history?.length ? (
          <section className="payment-card razorpay-history-section">
            <h2>Recent Activity</h2>
            <div className="history-list">
              {[...gateway.history]
                .reverse()
                .slice(0, 10)
                .map((event, index) => (
                  <article key={`${event.at || "event"}-${index}`}>
                    <strong>
                      {label(event.action || "Activity")}
                    </strong>
                    <span>{event.at || "—"}</span>
                    <p>
                      {event.actor_email || "System"}
                      {event.note ? ` · ${event.note}` : ""}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
