import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  isAuthenticationError,
  loadAdminDeliveryVerifications,
  type AdminDeliveryVerificationListResponse,
  verificationErrorMessage,
} from "../services/deliveryVerificationApi";
import "../styles/delivery-verification.css";

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "completed";
  if (
    ["KYC_SUBMITTED", "BANK_SUBMITTED"].includes(status)
  ) {
    return "review";
  }
  if (
    ["KYC_REJECTED", "BANK_REJECTED"].includes(status)
  ) {
    return "rejected";
  }
  return "";
}

export function AdminDeliveryVerificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [data, setData] =
    useState<AdminDeliveryVerificationListResponse | null>(
      null,
    );
  const [query, setQuery] = useState(
    searchParams.get("q") || "",
  );
  const [status, setStatus] = useState(
    searchParams.get("status") || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(
    nextQuery = searchParams.get("q") || "",
    nextStatus = searchParams.get("status") || "",
  ) {
    setLoading(true);
    setError("");

    try {
      setData(
        await loadAdminDeliveryVerifications({
          query: nextQuery,
          status: nextStatus,
        }),
      );
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            "/admin/delivery-verifications",
          )}`,
          { replace: true },
        );
        return;
      }

      setError(
        verificationErrorMessage(
          requestError,
          "Unable to load delivery verification reviews.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextStatus =
      searchParams.get("status") || "";

    setQuery(nextQuery);
    setStatus(nextStatus);
    void load(nextQuery, nextStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function submit(event: FormEvent) {
    event.preventDefault();

    const params: Record<string, string> = {};

    if (query.trim()) params.q = query.trim();
    if (status) params.status = status;

    setSearchParams(params);
  }

  function reset() {
    setQuery("");
    setStatus("");
    setSearchParams({});
  }

  const summary = data?.summary || {
    total: 0,
    kyc_pending_review: 0,
    bank_pending_review: 0,
    completed: 0,
  };

  return (
    <main className="dv-page">
      <div className="dv-page-container">
      <section className="dv-heading">
        <div>
          <span className="dv-eyebrow">
            Admin verification
          </span>
          <h1>Delivery KYC and Bank Reviews</h1>
          <p>
            Review delivery-person Aadhaar and payout-bank
            submissions.
          </p>
        </div>

        <Link
          className="dv-button secondary"
          to="/admin"
        >
          Back to Admin
        </Link>
      </section>

      <section className="dv-stat-grid">
        <article>
          <strong>{summary.total}</strong>
          <span>Approved delivery accounts</span>
        </article>
        <article>
          <strong>
            {summary.kyc_pending_review}
          </strong>
          <span>KYC reviews</span>
        </article>
        <article>
          <strong>
            {summary.bank_pending_review}
          </strong>
          <span>Bank reviews</span>
        </article>
        <article>
          <strong>{summary.completed}</strong>
          <span>Completed</span>
        </article>
      </section>

      {error && (
        <div className="dv-alert danger">
          {error}
        </div>
      )}

      <section className="dv-card">
        <form
          className="dv-filter-form"
          onSubmit={submit}
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search delivery person"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            <option value="">All statuses</option>
            {(data?.allowed_statuses || [
              "PROFILE_APPROVED",
              "KYC_PENDING",
              "KYC_SUBMITTED",
              "KYC_REJECTED",
              "KYC_APPROVED",
              "BANK_SUBMITTED",
              "BANK_REJECTED",
              "COMPLETED",
            ]).map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>

          <button
            className="dv-button primary"
            type="submit"
          >
            Filter
          </button>

          <button
            className="dv-button secondary"
            type="button"
            onClick={reset}
          >
            Reset
          </button>
        </form>

        {loading ? (
          <div className="dv-loading">
            Loading verification records…
          </div>
        ) : (data?.rows || []).length ? (
          <div className="dv-table-wrap">
            <table className="dv-table">
              <thead>
                <tr>
                  <th>Delivery Person</th>
                  <th>Vehicle</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {(data?.rows || []).map((row) => (
                  <tr key={row.delivery_user.id}>
                    <td>
                      <strong>
                        {row.delivery_user.full_name}
                      </strong>
                      <small>
                        {row.delivery_user.email} ·{" "}
                        {row.delivery_user.phone}
                      </small>
                    </td>
                    <td>
                      {row.delivery_user.vehicle_type ||
                        "—"}
                      <small>
                        {row.delivery_user.vehicle_number ||
                          "—"}
                      </small>
                    </td>
                    <td>
                      {row.delivery_user.service_area ||
                        "—"}
                    </td>
                    <td>
                      <span
                        className={`dv-pill ${statusClass(
                          row.verification.status,
                        )}`}
                      >
                        {label(
                          row.verification.status,
                        )}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="dv-button primary small"
                        to={`/admin/delivery-verifications/${row.delivery_user.id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dv-empty">
            No delivery-verification records match the
            selected filter.
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
