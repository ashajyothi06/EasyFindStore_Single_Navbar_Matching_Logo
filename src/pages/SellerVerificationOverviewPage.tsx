import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getSellerVerification,
  isAuthenticationError,
  type SellerVerificationUser,
  type VerificationState,
} from "../services/sellerVerificationApi";
import "../styles/seller-verification.css";

function statusMessage(verification: VerificationState) {
  const status = verification.status;
  const review = verification.admin_review || {};

  if (status === "KYC_SUBMITTED") {
    return {
      kind: "warning",
      text: "Your Aadhaar KYC is waiting for administrator approval.",
    };
  }

  if (status === "BANK_SUBMITTED") {
    return {
      kind: "warning",
      text: "Your verified bank details are waiting for administrator approval.",
    };
  }

  if (status === "KYC_REJECTED") {
    return {
      kind: "danger",
      text: `Aadhaar KYC was rejected: ${
        review.kyc_rejection_reason || "No reason was provided."
      }`,
    };
  }

  if (status === "BANK_REJECTED") {
    return {
      kind: "danger",
      text: `Bank details were rejected: ${
        review.bank_rejection_reason || "No reason was provided."
      }`,
    };
  }

  if (status === "COMPLETED") {
    return {
      kind: "success",
      text: "Verification completed. Your seller account is ready.",
    };
  }

  return null;
}

export function SellerVerificationOverviewPage() {
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerVerificationUser | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const payload = await getSellerVerification();
        if (cancelled) return;

        setSeller(payload.seller || null);
        setVerification(payload.verification || null);
      } catch (requestError) {
        if (cancelled) return;

        if (isAuthenticationError(requestError)) {
          navigate(
            `/react/login?next=${encodeURIComponent("/seller/verification")}`,
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
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <main className="verification-page">
        <section className="verification-loading" aria-busy="true">
          <div className="verification-spinner" />
          <p>Loading seller verification…</p>
        </section>
      </main>
    );
  }

  if (error || !verification) {
    return (
      <main className="verification-page">
        <section className="verification-error" role="alert">
          <h1>Verification unavailable</h1>
          <p>{error || "Unable to load verification data."}</p>
          <button
            className="verification-button primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  const status = verification.status;
  const message = statusMessage(verification);
  const canEditKyc = Boolean(
    verification.permissions?.can_edit_kyc ??
      ["PROFILE_APPROVED", "KYC_PENDING", "KYC_REJECTED"].includes(status),
  );
  const canEditBank = Boolean(
    verification.permissions?.can_edit_bank ??
      ["KYC_APPROVED", "BANK_REJECTED"].includes(status),
  );

  return (
    <main className="verification-page">
      <section className="verification-heading">
        <div>
          <span className="verification-eyebrow">Seller onboarding</span>
          <h1>Identity and bank verification</h1>
          <p>
            Complete Aadhaar KYC and bank verification before managing
            products and orders.
          </p>
        </div>

        <Link className="verification-button secondary" to="/dashboard">
          Back to Dashboard
        </Link>
      </section>

      {seller && (
        <section className="verification-seller-strip">
          <div>
            <strong>{seller.full_name}</strong>
            <span>{seller.email}</span>
          </div>
          <div>
            <strong>{seller.business_name || "Business not provided"}</strong>
            <span>{seller.phone || "Phone not provided"}</span>
          </div>
        </section>
      )}

      {message && (
        <div className={`verification-alert ${message.kind}`} role="status">
          {message.text}
        </div>
      )}

      <div className="verification-step-grid">
        <article
          className={`verification-step ${
            ["PROFILE_APPROVED", "KYC_PENDING", "KYC_REJECTED"].includes(status)
              ? "active"
              : ""
          }`}
        >
          <div className="verification-step-number">1</div>
          <h2>Profile approved</h2>
          <p>Your seller registration has been approved by the administrator.</p>
          <span className="verification-status completed">Completed</span>
        </article>

        <article
          className={`verification-step ${
            [
              "PROFILE_APPROVED",
              "KYC_PENDING",
              "KYC_REJECTED",
              "KYC_SUBMITTED",
            ].includes(status)
              ? "active"
              : ""
          }`}
        >
          <div className="verification-step-number">2</div>
          <h2>Aadhaar KYC</h2>
          <p>Verify Aadhaar securely through Surepass DigiLocker.</p>

          {canEditKyc ? (
            <Link
              className="verification-button primary"
              to="/seller/verification/aadhaar"
            >
              {status === "KYC_REJECTED" ? "Retry Aadhaar KYC" : "Start Aadhaar KYC"}
            </Link>
          ) : status === "KYC_SUBMITTED" ? (
            <span className="verification-status review">Admin review</span>
          ) : (
            <span className="verification-status completed">Completed</span>
          )}
        </article>

        <article
          className={`verification-step ${
            ["KYC_APPROVED", "BANK_REJECTED", "BANK_SUBMITTED"].includes(status)
              ? "active"
              : ""
          }`}
        >
          <div className="verification-step-number">3</div>
          <h2>Bank verification</h2>
          <p>Verify the settlement account through Surepass.</p>

          {canEditBank ? (
            <Link
              className="verification-button primary"
              to="/seller/verification/bank"
            >
              {status === "BANK_REJECTED" ? "Update Bank Details" : "Add Bank Details"}
            </Link>
          ) : status === "BANK_SUBMITTED" ? (
            <span className="verification-status review">Admin review</span>
          ) : status === "COMPLETED" ? (
            <span className="verification-status completed">Completed</span>
          ) : (
            <span className="verification-status">Locked</span>
          )}
        </article>
      </div>

      {verification.history?.length > 0 && (
        <section className="verification-card verification-history-card">
          <span className="verification-eyebrow">Activity</span>
          <h2>Verification history</h2>
          <div className="verification-history">
            {[...verification.history].reverse().map((entry, index) => (
              <article key={`${entry.at || "history"}-${index}`}>
                <div>
                  <strong>{(entry.status || "Update").replace(/_/g, " ")}</strong>
                  <p>{entry.note || "Verification status updated."}</p>
                </div>
                <time>{entry.at ? new Date(entry.at).toLocaleString() : ""}</time>
              </article>
            ))}
          </div>
        </section>
      )}

      {status === "COMPLETED" && (
        <div className="verification-actions">
          <Link className="verification-button primary" to="/dashboard">
            Open Seller Dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
