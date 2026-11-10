import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  activateAdminSellerGateway,
  deactivateAdminSellerGateway,
  editAdminSellerGateway,
  errorMessage,
  isAuthenticationError,
  isCsrfError,
  loadAdminSellerGateway,
  type RazorpayMode,
  type RazorpayStateResponse,
} from "../services/sellerRazorpayApi";
import "../styles/seller-razorpay.css";

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AdminSellerGatewayDetailPage() {
  const { sellerId = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<RazorpayStateResponse | null>(null);
  const [mode, setMode] = useState<RazorpayMode>("test");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [amountRupees, setAmountRupees] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  async function load() {
    if (!sellerId) return;

    setLoading(true);

    try {
      const response = await loadAdminSellerGateway(sellerId);
      setData(response);
      setMode(response.gateway?.mode || "test");
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign(
          `/react/login?next=${encodeURIComponent(
            `/admin/seller-payment-gateways/${sellerId}`,
          )}`,
        );
        return;
      }

      setNotice({
        kind: "error",
        text: errorMessage(
          error,
          "Unable to load this seller gateway.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Reload when seller changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  async function editCredentials(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const csrf = data?.csrf_token || "";

    if (!csrf) return;

    setWorking("edit");
    setNotice(null);

    try {
      const response = await editAdminSellerGateway(
        sellerId,
        csrf,
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
          "Credentials updated and verification reset.",
      });
    } catch (error) {
      handleError(error, "Unable to update credentials.");
    } finally {
      setWorking("");
    }
  }

  function handleError(error: unknown, fallback: string) {
    if (isCsrfError(error)) {
      window.location.reload();
      return;
    }

    if (isAuthenticationError(error)) {
      window.location.assign("/react/login");
      return;
    }

    setNotice({
      kind: "error",
      text: errorMessage(error, fallback),
    });
  }

  async function activate() {
    const csrf = data?.csrf_token || "";
    if (!csrf) return;

    setWorking("activate");
    setNotice(null);

    try {
      const response = await activateAdminSellerGateway(
        sellerId,
        csrf,
      );
      setData(response);
      setNotice({
        kind: "success",
        text: response.message || "Live payments activated.",
      });
    } catch (error) {
      handleError(error, "Unable to activate live payments.");
    } finally {
      setWorking("");
    }
  }

  async function deactivate() {
    const csrf = data?.csrf_token || "";
    if (!csrf) return;

    setWorking("deactivate");
    setNotice(null);

    try {
      const response = await deactivateAdminSellerGateway(
        sellerId,
        csrf,
      );
      setData(response);
      setNotice({
        kind: "success",
        text: response.message || "Live payments deactivated.",
      });
    } catch (error) {
      handleError(error, "Unable to deactivate live payments.");
    } finally {
      setWorking("");
    }
  }

  function openTestPage() {
    const amount = Math.max(
      1,
      Math.min(10000, Number(amountRupees) || 1),
    );

    navigate(
      `/admin/seller-payment-gateways/${sellerId}/test?amount=${amount}`,
    );
  }

  if (loading) {
    return (
      <main className="razorpay-page">
        <div className="razorpay-page-container">
          <section className="razorpay-loading">
            <div className="razorpay-spinner" />
            <p>Loading seller gateway…</p>
          </section>
        </div>
      </main>
    );
  }

  const seller = data?.seller;
  const gateway = data?.gateway;
  const state = data?.state;
  const canActivate =
    gateway?.mode === "live" &&
    ["LIVE_VERIFIED", "ACTIVE"].includes(
      gateway?.status || "",
    ) &&
    !gateway?.active_for_live_payments;

  return (
    <main className="razorpay-page">
      <div className="razorpay-page-container">
        <section className="payment-heading">
          <div>
            <span className="razorpay-eyebrow">
              Admin payment review
            </span>
            <h1>{seller?.full_name || "Seller Gateway"}</h1>
            <p>
              {seller?.email || "—"} ·{" "}
              {seller?.business_name || "Seller account"}
            </p>
          </div>

          <Link
            className="razorpay-button secondary"
            to="/admin/seller-payment-gateways"
          >
            All Gateways
          </Link>
        </section>

        {notice && (
          <div className={`razorpay-notice ${notice.kind}`}>
            {notice.text}
          </div>
        )}

        <section className="payment-stats">
          <article>
            <strong>
              {data?.bank_verified ? "Approved" : "Pending"}
            </strong>
            <span>Bank verification</span>
          </article>
          <article>
            <strong>{label(gateway?.mode || "test")}</strong>
            <span>Mode</span>
          </article>
          <article>
            <strong>
              {gateway?.key_id_masked || "Not saved"}
            </strong>
            <span>Encrypted Key ID</span>
          </article>
          <article>
            <strong>
              {label(gateway?.status || "NOT_CONFIGURED")}
            </strong>
            <span>Status</span>
          </article>
        </section>

        <section className="payment-layout">
          <div className="payment-card">
            <h2>Admin Payment Test</h2>

            {!gateway?.has_key_id || !gateway?.has_key_secret ? (
              <div className="razorpay-notice error">
                Seller credentials are incomplete.
              </div>
            ) : (
              <>
                {gateway.mode === "live" ? (
                  <div className="razorpay-notice error">
                    <strong>Live Mode warning</strong>
                    <p>
                      This test uses live credentials and can charge
                      real money.
                    </p>
                  </div>
                ) : (
                  <div className="razorpay-notice warning">
                    <strong>Test Mode</strong>
                    <p>
                      No real money is deducted when valid Razorpay
                      test keys are used.
                    </p>
                  </div>
                )}

                <label>
                  Test amount in rupees
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={amountRupees}
                    onChange={(event) =>
                      setAmountRupees(Number(event.target.value))
                    }
                  />
                </label>

                <button
                  className="razorpay-button primary"
                  type="button"
                  onClick={openTestPage}
                >
                  Create Payment Test
                </button>
              </>
            )}

            {gateway?.last_test &&
              Object.keys(gateway.last_test).length > 0 && (
                <>
                  <h3>Latest Test</h3>

                  <dl className="razorpay-details">
                    <div>
                      <dt>Status</dt>
                      <dd>{gateway.last_test.status || "—"}</dd>
                    </div>
                    <div>
                      <dt>Order ID</dt>
                      <dd>
                        {gateway.last_test.server_order_id || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Payment ID</dt>
                      <dd>
                        {gateway.last_test.payment_id || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Verified</dt>
                      <dd>
                        {gateway.last_test.verified_at || "—"}
                      </dd>
                    </div>
                    {gateway.last_test.message && (
                      <div>
                        <dt>Message</dt>
                        <dd>
                          {String(gateway.last_test.message)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              )}

            <div className="activation-actions">
              {canActivate && (
                <button
                  className="razorpay-button success"
                  type="button"
                  onClick={() => void activate()}
                  disabled={Boolean(working)}
                >
                  {working === "activate"
                    ? "Activating…"
                    : "Activate Real Payments"}
                </button>
              )}

              {gateway?.active_for_live_payments && (
                <button
                  className="razorpay-button danger"
                  type="button"
                  onClick={() => void deactivate()}
                  disabled={Boolean(working)}
                >
                  {working === "deactivate"
                    ? "Deactivating…"
                    : "Deactivate Real Payments"}
                </button>
              )}
            </div>

            {state?.awaiting_activation && (
              <div className="razorpay-notice warning">
                Live credentials are verified and awaiting activation.
              </div>
            )}
          </div>

          <form
            className="payment-card"
            onSubmit={editCredentials}
            autoComplete="off"
          >
            <h2>Edit Encrypted Credentials</h2>
            <p className="razorpay-muted">
              Blank fields preserve existing values. Editing resets
              testing and disables live payments.
            </p>

            <label>
              Mode
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as RazorpayMode)
                }
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

            <button
              className="razorpay-button primary"
              type="submit"
              disabled={working === "edit"}
            >
              {working === "edit"
                ? "Saving…"
                : "Save Changes and Reset Verification"}
            </button>
          </form>
        </section>

        {gateway?.history?.length ? (
          <section className="payment-card razorpay-history-section">
            <h2>Audit History</h2>

            <div className="history-list">
              {[...gateway.history]
                .reverse()
                .map((event, index) => (
                  <article key={`${event.at || "history"}-${index}`}>
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
    </main >
  );
}
