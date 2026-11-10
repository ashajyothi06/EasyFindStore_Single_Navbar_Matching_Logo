import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  loadAdminSellerGateways,
  type AdminGatewayListResponse,
} from "../services/sellerRazorpayApi";
import "../styles/seller-razorpay.css";

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AdminSellerGatewaysPage() {
  const [data, setData] =
    useState<AdminGatewayListResponse | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(filters = { q, status, mode }) {
    setLoading(true);
    setError("");

    try {
      const response = await loadAdminSellerGateways(filters);
      setData(response);
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        window.location.assign(
          "/react/login?next=/admin/seller-payment-gateways",
        );
        return;
      }

      setError(
        errorMessage(
          requestError,
          "Unable to load seller payment gateways.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ q: "", status: "", mode: "" });
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  function clearFilters() {
    setQ("");
    setStatus("");
    setMode("");
    void load({ q: "", status: "", mode: "" });
  }

  const rows = data?.sellers || [];
  const summary = data?.summary;

  return (
    <main className="razorpay-page">
      <div className="razorpay-page-container">
        <section className="payment-heading">
          <div>
            <span className="razorpay-eyebrow">Administration</span>
            <h1>Seller Razorpay Gateways</h1>
            <p>
              Review encrypted credentials, run payment tests, edit
              credentials, and activate verified Live Mode accounts.
            </p>
          </div>

          <Link className="razorpay-button secondary" to="/dashboard">
            Dashboard
          </Link>
        </section>

        <section className="payment-stats">
          <article>
            <strong>{summary?.total_sellers || 0}</strong>
            <span>Total sellers</span>
          </article>
          <article>
            <strong>{summary?.configured || 0}</strong>
            <span>Configured</span>
          </article>
          <article>
            <strong>{summary?.pending_test || 0}</strong>
            <span>Pending test</span>
          </article>
          <article>
            <strong>{summary?.active_live || 0}</strong>
            <span>Live active</span>
          </article>
        </section>

        <form className="gateway-filter-bar" onSubmit={submit}>
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search seller, email, phone or business"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="NOT_CONFIGURED">Not configured</option>
            <option value="PENDING_ADMIN_TEST">Pending admin test</option>
            <option value="TEST_VERIFIED">Test verified</option>
            <option value="LIVE_VERIFIED">Live verified</option>
            <option value="ACTIVE">Active</option>
            <option value="TEST_FAILED">Test failed</option>
          </select>

          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            aria-label="Filter by mode"
          >
            <option value="">All modes</option>
            <option value="test">Test Mode</option>
            <option value="live">Live Mode</option>
          </select>

          <button
            className="razorpay-button primary"
            type="submit"
          >
            Apply Filters
          </button>

          <button
            className="razorpay-button secondary"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </form>

        {error && (
          <div className="razorpay-notice error" role="alert">
            {error}
          </div>
        )}

        <section className="payment-card table-card">
          {loading ? (
            <div className="razorpay-loading compact" aria-busy="true">
              <div className="razorpay-spinner" />
              <p>Loading seller gateways…</p>
            </div>
          ) : (
            <div className="razorpay-table-wrap">
              <table className="razorpay-table">
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Bank</th>
                    <th>Mode</th>
                    <th>Key ID</th>
                    <th>Status</th>
                    <th>Live Payments</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.seller.id}>
                      <td>
                        <strong>{row.seller.full_name}</strong>
                        <small>{row.seller.email}</small>
                        <small>
                          {row.seller.business_name || ""}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`gateway-status ${row.bank_verified ? "success" : "danger"
                            }`}
                        >
                          {row.bank_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td>{label(row.gateway.mode)}</td>
                      <td>{row.gateway.key_id_masked}</td>
                      <td>
                        <span className="gateway-status">
                          {label(row.gateway.status)}
                        </span>
                      </td>
                      <td>
                        {row.gateway.active_for_live_payments
                          ? "Active"
                          : "Disabled"}
                      </td>
                      <td>
                        <Link
                          className="razorpay-button secondary small"
                          to={`/admin/seller-payment-gateways/${row.seller.id}`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {!rows.length && (
                    <tr>
                      <td colSpan={7}>
                        No matching seller accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
