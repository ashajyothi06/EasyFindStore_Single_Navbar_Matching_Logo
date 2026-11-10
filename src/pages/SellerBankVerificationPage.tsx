import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getSellerVerification,
  isAuthenticationError,
  isCsrfError,
  submitSellerBank,
  type VerificationState,
} from "../services/sellerVerificationApi";
import "../styles/seller-verification.css";

export function SellerBankVerificationPage() {
  const navigate = useNavigate();
  const [verification, setVerification] = useState<VerificationState | null>(
    null,
  );
  const [csrfToken, setCsrfToken] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await getSellerVerification();
        if (cancelled) return;

        const state = payload.verification || null;
        const canEdit = Boolean(
          state?.permissions?.can_edit_bank ??
          ["KYC_APPROVED", "BANK_REJECTED"].includes(state?.status || ""),
        );

        if (!canEdit) {
          navigate("/seller/verification", { replace: true });
          return;
        }

        setVerification(state);
        setCsrfToken(payload.csrf_token || "");
        setIfsc(String(state?.bank?.ifsc || ""));
      } catch (requestError) {
        if (cancelled) return;

        if (isAuthenticationError(requestError)) {
          navigate(
            `/react/login?next=${encodeURIComponent("/seller/verification/bank")}`,
            { replace: true },
          );
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load bank verification.",
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanAccount = accountNumber.replace(/\D/g, "");
    const cleanConfirm = confirmAccountNumber.replace(/\D/g, "");
    const cleanIfsc = ifsc.trim().toUpperCase();

    if (!/^\d{6,20}$/.test(cleanAccount)) {
      setError("Account number must contain 6 to 20 digits.");
      return;
    }

    if (cleanAccount !== cleanConfirm) {
      setError("Account numbers do not match.");
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setError("Please enter a valid IFSC code.");
      return;
    }

    if (!csrfToken) {
      setError("Security token unavailable. Refresh the page and try again.");
      return;
    }

    setSubmitting(true);

    try {
      await submitSellerBank(csrfToken, {
        account_number: cleanAccount,
        confirm_account_number: cleanConfirm,
        ifsc: cleanIfsc,
      });

      navigate("/seller/verification", {
        replace: true,
        state: {
          verificationMessage:
            "Bank verification was submitted for administrator approval.",
        },
      });
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      if (isAuthenticationError(requestError)) {
        navigate("/react/login", { replace: true });
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify bank details.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="verification-page">
        <section className="verification-loading" aria-busy="true">
          <div className="verification-spinner" />
          <p>Loading bank verification…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="verification-page narrow">
      <div className="seller-verification-container">
        <section className="verification-heading">
          <div>
            <span className="verification-eyebrow">Seller onboarding</span>
            <h1>Bank verification</h1>
            <p>
              Enter the settlement account details. Surepass will verify the
              account holder and IFSC before submission.
            </p>
          </div>

          <Link
            className="verification-button secondary"
            to="/seller/verification"
          >
            Back to Verification
          </Link>
        </section>

        {verification?.status === "BANK_REJECTED" && (
          <div className="verification-alert danger">
            Previous bank details were rejected:{" "}
            <strong>
              {verification.admin_review?.bank_rejection_reason ||
                "No reason was provided."}
            </strong>
          </div>
        )}

        <form
          className="verification-card verification-form"
          onSubmit={handleSubmit}
        >
          <div className="verification-form-heading">
            <span className="verification-eyebrow">Settlement account</span>
            <h2>Verified bank details</h2>
            <p>
              The account number is sent securely to the backend for
              verification.
            </p>
          </div>

          {error && (
            <div className="verification-alert danger" role="alert">
              {error}
            </div>
          )}

          <label className="verification-field">
            <span>Account number</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={accountNumber}
              onChange={(event) =>
                setAccountNumber(event.target.value.replace(/\D/g, ""))
              }
              minLength={6}
              maxLength={20}
              required
            />
          </label>

          <label className="verification-field">
            <span>Confirm account number</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={confirmAccountNumber}
              onChange={(event) =>
                setConfirmAccountNumber(event.target.value.replace(/\D/g, ""))
              }
              minLength={6}
              maxLength={20}
              required
            />
          </label>

          <label className="verification-field">
            <span>IFSC code</span>
            <input
              type="text"
              value={ifsc}
              onChange={(event) => setIfsc(event.target.value.toUpperCase())}
              minLength={11}
              maxLength={11}
              placeholder="ABCD0123456"
              autoCapitalize="characters"
              required
            />
          </label>

          <div className="verification-security-note">
            The seller-facing API returns only the masked account number after
            verification. Full bank details remain restricted to authorised
            admin review.
          </div>

          <div className="verification-actions">
            <button
              className="verification-button primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Verifying…" : "Verify and Submit"}
            </button>

            <Link
              className="verification-button secondary"
              to="/seller/verification"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
