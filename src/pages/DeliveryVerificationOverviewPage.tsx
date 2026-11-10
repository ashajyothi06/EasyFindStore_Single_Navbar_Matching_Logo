import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  isAuthenticationError,
  loadDeliveryVerificationOverview,
  type DeliveryVerificationResponse,
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

export function DeliveryVerificationOverviewPage() {
  const [data, setData] =
    useState<DeliveryVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeliveryVerificationOverview()
      .then(setData)
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              "/delivery/verification",
            )}`,
          );
          return;
        }

        setError(
          verificationErrorMessage(
            requestError,
            "Unable to load delivery verification.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="dv-page">
        <div className="dv-loading">
          Loading delivery verification…
        </div>
      </main>
    );
  }

  if (error || !data?.verification) {
    return (
      <main className="dv-page">
        <div className="dv-page-container">
          <section className="dv-card dv-empty">
            <h1>Verification unavailable</h1>
            <p>{error || "Unable to load verification."}</p>
            <button
              className="dv-button primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </section>
        </div>
      </main>
    );
  }

  const verification = data.verification;
  const status = verification.status;
  const review = verification.admin_review || {};

  return (
    <main className="dv-page">
      <div className="dv-page-container">
        <section className="dv-heading">
          <div>
            <span className="dv-eyebrow">
              Delivery onboarding
            </span>
            <h1>Identity and Bank Verification</h1>
            <p>
              Complete Aadhaar KYC and bank verification after
              your delivery account is approved.
            </p>
          </div>

          <Link
            className="dv-button secondary"
            to="/dashboard"
          >
            Delivery Dashboard
          </Link>
        </section>

        {status === "KYC_SUBMITTED" && (
          <div className="dv-alert warning">
            Your Aadhaar KYC is waiting for administrator approval.
          </div>
        )}

        {status === "BANK_SUBMITTED" && (
          <div className="dv-alert warning">
            Your verified bank details are waiting for administrator
            approval.
          </div>
        )}

        {status === "KYC_REJECTED" && (
          <div className="dv-alert danger">
            Aadhaar KYC was rejected:{" "}
            <strong>
              {review.kyc_rejection_reason ||
                "Review the information and resubmit."}
            </strong>
          </div>
        )}

        {status === "BANK_REJECTED" && (
          <div className="dv-alert danger">
            Bank details were rejected:{" "}
            <strong>
              {review.bank_rejection_reason ||
                "Review the information and resubmit."}
            </strong>
          </div>
        )}

        {status === "COMPLETED" && (
          <div className="dv-alert success">
            Verification completed. Your delivery account is ready.
          </div>
        )}

        <section className="dv-step-grid">
          <article
            className={`dv-step ${[
                "PROFILE_APPROVED",
                "KYC_PENDING",
                "KYC_REJECTED",
              ].includes(status)
                ? "active"
                : ""
              }`}
          >
            <div className="dv-step-number">1</div>
            <h2>Profile Approved</h2>
            <p>
              Your delivery registration has been approved by the
              administrator.
            </p>
            <span className="dv-pill completed">
              Completed
            </span>
          </article>

          <article
            className={`dv-step ${[
                "PROFILE_APPROVED",
                "KYC_PENDING",
                "KYC_REJECTED",
                "KYC_SUBMITTED",
              ].includes(status)
                ? "active"
                : ""
              }`}
          >
            <div className="dv-step-number">2</div>
            <h2>Aadhaar KYC</h2>
            <p>
              Verify Aadhaar through Surepass DigiLocker.
            </p>

            {data.capabilities?.kyc_editable ? (
              <Link
                className="dv-button primary"
                to="/delivery/verification/aadhaar"
              >
                {status === "KYC_REJECTED"
                  ? "Resubmit Aadhaar KYC"
                  : "Start Aadhaar KYC"}
              </Link>
            ) : status === "KYC_SUBMITTED" ? (
              <span className="dv-pill review">
                Admin Review
              </span>
            ) : (
              <span className="dv-pill completed">
                Completed
              </span>
            )}
          </article>

          <article
            className={`dv-step ${[
                "KYC_APPROVED",
                "BANK_REJECTED",
                "BANK_SUBMITTED",
              ].includes(status)
                ? "active"
                : ""
              }`}
          >
            <div className="dv-step-number">3</div>
            <h2>Bank Verification</h2>
            <p>
              Verify the payout account through Surepass.
            </p>

            {data.capabilities?.bank_editable ? (
              <Link
                className="dv-button primary"
                to="/delivery/verification/bank"
              >
                {status === "BANK_REJECTED"
                  ? "Resubmit Bank Details"
                  : "Add Bank Details"}
              </Link>
            ) : status === "BANK_SUBMITTED" ? (
              <span className="dv-pill review">
                Admin Review
              </span>
            ) : status === "COMPLETED" ? (
              <span className="dv-pill completed">
                Completed
              </span>
            ) : (
              <span className="dv-pill">Locked</span>
            )}
          </article>
        </section>

        <section className="dv-card dv-summary-card">
          <div>
            <span className="dv-eyebrow">
              Current verification status
            </span>
            <h2>{label(status)}</h2>
          </div>

          <div className="dv-summary-meta">
            <span>Step {verification.step || 2}</span>
            <span>
              KYC: {label(verification.kyc?.status)}
            </span>
            <span>
              Bank: {label(verification.bank?.status)}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
