import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getAdminSellerVerificationDetail,
  isAuthenticationError,
  isCsrfError,
  submitAdminBankDecision,
  submitAdminKycDecision,
  verificationArtifactUrl,
  type SellerVerificationUser,
  type VerificationState,
} from "../services/sellerVerificationApi";
import "../styles/seller-verification.css";

function formatValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "—";
}

function formatAddress(address: Record<string, unknown>): string {
  return [
    address.co,
    address.house,
    address.street,
    address.lm,
    address.loc,
    address.vtc,
    address.dist,
    address.state,
    address.pc,
    address.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

interface DecisionPanelProps {
  title: string;
  description: string;
  disabled: boolean;
  busy: boolean;
  onSubmit: (action: "approve" | "reject", reason: string) => Promise<void>;
}

function DecisionPanel({
  title,
  description,
  disabled,
  busy,
  onSubmit,
}: DecisionPanelProps) {
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");

    if (action === "reject" && !reason.trim()) {
      setLocalError("A rejection reason is required.");
      return;
    }

    await onSubmit(action, reason.trim());
    setReason("");
  }

  return (
    <form className="verification-decision-panel" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <p>{description}</p>

      {localError && (
        <div className="verification-alert danger" role="alert">
          {localError}
        </div>
      )}

      <div className="verification-decision-options">
        <label>
          <input
            type="radio"
            name={`${title}-decision`}
            value="approve"
            checked={action === "approve"}
            onChange={() => setAction("approve")}
            disabled={disabled || busy}
          />
          Approve
        </label>
        <label>
          <input
            type="radio"
            name={`${title}-decision`}
            value="reject"
            checked={action === "reject"}
            onChange={() => setAction("reject")}
            disabled={disabled || busy}
          />
          Reject
        </label>
      </div>

      {action === "reject" && (
        <label className="verification-field">
          <span>Rejection reason</span>
          <textarea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what the seller must correct…"
            disabled={disabled || busy}
            required
          />
        </label>
      )}

      <button
        className={`verification-button ${action === "approve" ? "primary" : "danger"}`}
        type="submit"
        disabled={disabled || busy}
      >
        {busy
          ? "Saving…"
          : action === "approve"
            ? `Approve ${title}`
            : `Reject ${title}`}
      </button>

      {disabled && (
        <small>This decision is unavailable in the current verification status.</small>
      )}
    </form>
  );
}

export function AdminSellerVerificationDetailPage() {
  const { sellerId = "" } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerVerificationUser | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"kyc" | "bank" | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDetail() {
    if (!sellerId) {
      setError("Seller ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await getAdminSellerVerificationDetail(sellerId);
      setSeller(payload.seller || null);
      setVerification(payload.verification || null);
      setCsrfToken(payload.csrf_token || "");
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            `/admin/seller-verifications/${sellerId}`,
          )}`,
          { replace: true },
        );
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load seller verification.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    // sellerId is the only route input; loadDetail intentionally stays local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  async function handleDecision(
    kind: "kyc" | "bank",
    action: "approve" | "reject",
    reason: string,
  ) {
    if (!sellerId || !csrfToken) {
      setError("Security token unavailable. Refresh the page and try again.");
      return;
    }

    setBusyAction(kind);
    setError("");
    setMessage("");

    try {
      const payload =
        kind === "kyc"
          ? await submitAdminKycDecision(
            sellerId,
            csrfToken,
            action,
            reason,
          )
          : await submitAdminBankDecision(
            sellerId,
            csrfToken,
            action,
            reason,
          );

      setSeller(payload.seller || seller);
      setVerification(payload.verification || verification);
      setCsrfToken(payload.csrf_token || csrfToken);
      setMessage(payload.message || "Verification decision saved.");
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save verification decision.",
      );
    } finally {
      setBusyAction("");
    }
  }

  if (loading) {
    return (
      <main className="verification-page wide">
        <section className="verification-loading" aria-busy="true">
          <div className="verification-spinner" />
          <p>Loading seller verification…</p>
        </section>
      </main>
    );
  }

  if (error && !verification) {
    return (
      <main className="verification-page">
        <section className="verification-error" role="alert">
          <h1>Seller verification unavailable</h1>
          <p>{error}</p>
          <Link
            className="verification-button secondary"
            to="/admin/seller-verifications"
          >
            Back to Reviews
          </Link>
        </section>
      </main>
    );
  }

  if (!seller || !verification) return null;

  const identity = verification.kyc?.aadhaar_preview?.identity || {};
  const address = verification.kyc?.aadhaar_preview?.address || {};
  const artifactUrls = verification.artifact_urls || {};

  return (
    <main className="verification-page wide">
      <div className="verification-container">
        <section className="verification-heading">
          <div>
            <span className="verification-eyebrow">Administrator review</span>
            <h1>{seller.full_name || "Seller verification"}</h1>
            <p>
              Review protected Aadhaar data, Surepass bank verification, and the
              complete onboarding history.
            </p>
          </div>

          <Link
            className="verification-button secondary"
            to="/admin/seller-verifications"
          >
            Back to Reviews
          </Link>
        </section>

        {message && <div className="verification-alert success">{message}</div>}
        {error && <div className="verification-alert danger">{error}</div>}

        <section className="verification-detail-hero">
          <div>
            <span className="verification-eyebrow">Seller</span>
            <h2>{seller.business_name || seller.full_name}</h2>
            <p>{seller.email} · {seller.phone || "No phone"}</p>
          </div>
          <span className={`verification-status ${verification.status === "COMPLETED"
              ? "completed"
              : ["KYC_SUBMITTED", "BANK_SUBMITTED"].includes(verification.status)
                ? "review"
                : ["KYC_REJECTED", "BANK_REJECTED"].includes(verification.status)
                  ? "rejected"
                  : "neutral"
            }`}>
            {verification.status.replace(/_/g, " ")}
          </span>
        </section>

        <section className="verification-detail-grid">
          <article className="verification-card">
            <span className="verification-eyebrow">Seller profile</span>
            <h2>Account details</h2>
            <dl className="verification-detail-list">
              <div><dt>Name</dt><dd>{formatValue(seller.full_name)}</dd></div>
              <div><dt>Email</dt><dd>{formatValue(seller.email)}</dd></div>
              <div><dt>Phone</dt><dd>{formatValue(seller.phone)}</dd></div>
              <div><dt>Business</dt><dd>{formatValue(seller.business_name)}</dd></div>
              <div><dt>Category</dt><dd>{formatValue(seller.product_category)}</dd></div>
              <div><dt>Pickup address</dt><dd>{formatValue(seller.pickup_address)}</dd></div>
            </dl>
          </article>

          <article className="verification-card">
            <span className="verification-eyebrow">Aadhaar KYC</span>
            <h2>Verified identity</h2>
            <dl className="verification-detail-list">
              <div><dt>KYC status</dt><dd>{formatValue(verification.kyc?.status).replace(/_/g, " ")}</dd></div>
              <div><dt>Name</dt><dd>{formatValue(identity.name)}</dd></div>
              <div><dt>Date of birth</dt><dd>{formatValue(identity.dob)}</dd></div>
              <div><dt>Gender</dt><dd>{formatValue(identity.gender)}</dd></div>
              <div><dt>Aadhaar</dt><dd className="sensitive-value">{formatValue(identity.uid_number || identity.uid_masked)}</dd></div>
              <div><dt>Address</dt><dd>{formatAddress(address as Record<string, unknown>) || "—"}</dd></div>
            </dl>

            <div className="verification-artifact-actions">
              {artifactUrls.photo && (
                <a
                  className="verification-button secondary small"
                  href={verificationArtifactUrl(artifactUrls.photo)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Aadhaar Photo
                </a>
              )}
              {artifactUrls.xml && (
                <a
                  className="verification-button secondary small"
                  href={verificationArtifactUrl(artifactUrls.xml)}
                >
                  Download Protected XML
                </a>
              )}
            </div>
          </article>

          <article className="verification-card">
            <span className="verification-eyebrow">Settlement account</span>
            <h2>Verified bank details</h2>
            <dl className="verification-detail-list">
              <div><dt>Bank status</dt><dd>{formatValue(verification.bank?.status).replace(/_/g, " ")}</dd></div>
              <div><dt>Account holder</dt><dd>{formatValue(verification.bank?.holder_name)}</dd></div>
              <div><dt>Account number</dt><dd className="sensitive-value">{formatValue(verification.bank?.account_number || verification.bank?.account_number_masked)}</dd></div>
              <div><dt>IFSC</dt><dd>{formatValue(verification.bank?.ifsc)}</dd></div>
              <div><dt>Bank</dt><dd>{formatValue(verification.bank?.bank_name)}</dd></div>
              <div><dt>Branch</dt><dd>{formatValue(verification.bank?.branch_name)}</dd></div>
              <div><dt>IMPS reference</dt><dd>{formatValue(verification.bank?.imps_reference)}</dd></div>
            </dl>
          </article>
        </section>

        <section className="verification-decision-grid">
          <DecisionPanel
            title="KYC"
            description="Approve the submitted Aadhaar KYC or reject it with a correction reason."
            disabled={verification.status !== "KYC_SUBMITTED"}
            busy={busyAction === "kyc"}
            onSubmit={(action, reason) =>
              handleDecision("kyc", action, reason)
            }
          />

          <DecisionPanel
            title="Bank"
            description="Approve the submitted settlement account or return it to the seller."
            disabled={verification.status !== "BANK_SUBMITTED"}
            busy={busyAction === "bank"}
            onSubmit={(action, reason) =>
              handleDecision("bank", action, reason)
            }
          />
        </section>

        <section className="verification-card verification-history-card">
          <span className="verification-eyebrow">Audit trail</span>
          <h2>Verification history</h2>
          <div className="verification-history">
            {[...(verification.history || [])].reverse().map((entry, index) => (
              <article key={`${entry.at || "entry"}-${index}`}>
                <div>
                  <strong>{formatValue(entry.status).replace(/_/g, " ")}</strong>
                  <p>{formatValue(entry.note)}</p>
                </div>
                <time>{entry.at ? new Date(entry.at).toLocaleString() : ""}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
