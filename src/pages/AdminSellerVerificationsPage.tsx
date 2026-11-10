import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  getAdminSellerVerifications,
  isAuthenticationError,
  type SellerVerificationRow,
  type VerificationSummary,
} from "../services/sellerVerificationApi";
import "../styles/seller-verification.css";

const STATUS_OPTIONS = [
  "",
  "PROFILE_APPROVED",
  "KYC_PENDING",
  "KYC_SUBMITTED",
  "KYC_REJECTED",
  "KYC_APPROVED",
  "BANK_SUBMITTED",
  "BANK_REJECTED",
  "COMPLETED",
];

function badgeKind(status: string): string {
  if (["COMPLETED", "KYC_APPROVED", "BANK_APPROVED"].includes(status)) {
    return "completed";
  }
  if (["KYC_SUBMITTED", "BANK_SUBMITTED", "KYC_PENDING"].includes(status)) {
    return "review";
  }
  if (["KYC_REJECTED", "BANK_REJECTED"].includes(status)) {
    return "rejected";
  }
  return "neutral";
}

export function AdminSellerVerificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [rows, setRows] = useState<SellerVerificationRow[]>([]);
  const [summary, setSummary] = useState<VerificationSummary>({
    total: 0,
    kyc_pending_review: 0,
    bank_pending_review: 0,
    completed: 0,
    action_required: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const payload = await getAdminSellerVerifications({
          q: searchParams.get("q") || "",
          status: searchParams.get("status") || "",
        });

        if (cancelled) return;
        setRows(payload.rows || []);
        setSummary(
          payload.summary || {
            total: 0,
            kyc_pending_review: 0,
            bank_pending_review: 0,
            completed: 0,
            action_required: 0,
          },
        );
      } catch (requestError) {
        if (cancelled) return;

        if (isAuthenticationError(requestError)) {
          navigate(
            `/react/login?next=${encodeURIComponent(
              "/admin/seller-verifications",
            )}`,
            { replace: true },
          );
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load seller verifications.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (status) next.set("status", status);
    setSearchParams(next);
  }

  return (
    <main className="verification-page-seller">
      <div className="verification-container"> 
      <section className="verification-heading">
        <div>
          <span className="verification-eyebrow">Administrator review</span>
          <h1>Seller Aadhaar and bank verification</h1>
          <p>
            Review Surepass submissions, protected artifacts, rejection reasons,
            and onboarding completion.
          </p>
        </div>

        <a className="verification-button secondary" href="/admin">
          Back to Admin
        </a>
      </section>

      <section className="verification-summary-grid five">
        <article><strong>{summary.total}</strong><span>Approved sellers</span></article>
        <article><strong>{summary.kyc_pending_review}</strong><span>KYC review</span></article>
        <article><strong>{summary.bank_pending_review}</strong><span>Bank review</span></article>
        <article><strong>{summary.completed}</strong><span>Completed</span></article>
        <article><strong>{summary.action_required}</strong><span>Seller action</span></article>
      </section>

      <form className="verification-filter-bar" onSubmit={handleFilter}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search seller, business, email, or phone…"
        />

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option || "all"} value={option}>
              {option ? option.replace(/_/g, " ") : "All statuses"}
            </option>
          ))}
        </select>

        <button className="verification-button primary" type="submit">
          Apply Filters
        </button>
      </form>

      {error && <div className="verification-alert danger">{error}</div>}

      {loading ? (
        <section className="verification-loading" aria-busy="true">
          <div className="verification-spinner" />
          <p>Loading seller verifications…</p>
        </section>
      ) : rows.length ? (
        <div className="verification-table-wrap">
          <table className="verification-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Business</th>
                <th>Overall status</th>
                <th>Aadhaar</th>
                <th>Bank</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ seller, verification }) => (
                <tr key={seller.id}>
                  <td>
                    <strong>{seller.full_name || "Unnamed Seller"}</strong>
                    <small>{seller.email}</small>
                  </td>
                  <td>
                    <strong>{seller.business_name || "—"}</strong>
                    <small>{seller.phone || ""}</small>
                  </td>
                  <td>
                    <span className={`verification-status ${badgeKind(verification.status)}`}>
                      {verification.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <span className={`verification-status ${badgeKind(String(verification.kyc?.status || ""))}`}>
                      {String(verification.kyc?.status || "NOT STARTED").replace(/^KYC_/, "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <span className={`verification-status ${badgeKind(String(verification.bank?.status || ""))}`}>
                      {String(verification.bank?.status || "NOT STARTED").replace(/^BANK_/, "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="verification-button secondary small"
                      to={`/admin/seller-verifications/${encodeURIComponent(seller.id)}`}
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
        <section className="verification-empty">
          <h2>No matching seller verifications</h2>
          <p>Change the status filter or search query and try again.</p>
        </section>
      )}
      </div>
    </main>
  );
}
