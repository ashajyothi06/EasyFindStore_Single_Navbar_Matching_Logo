import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  isAuthenticationError,
  isCsrfError,
  loadDeliveryBankState,
  submitDeliveryBank,
  type DeliveryVerificationResponse,
  verificationErrorMessage,
} from "../services/deliveryVerificationApi";
import "../styles/delivery-verification.css";

export function DeliveryBankVerificationPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<DeliveryVerificationResponse | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeliveryBankState()
      .then(setData)
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              "/delivery/verification/bank",
            )}`,
          );
          return;
        }

        setError(
          verificationErrorMessage(
            requestError,
            "Unable to load bank verification.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!data?.csrf_token || !data.editable) return;

    if (accountNumber !== confirmAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await submitDeliveryBank(data.csrf_token, {
        account_number: accountNumber,
        confirm_account_number: confirmAccountNumber,
        ifsc: ifsc.trim().toUpperCase(),
      });

      setData((current) => ({
        ...current,
        ...response,
      }));
      navigate("/delivery/verification", {
        state: {
          message: response.message || "Bank details submitted successfully.",
        },
      });
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setError(
        verificationErrorMessage(
          requestError,
          "Unable to verify and submit bank details.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const rejectionReason =
    data?.verification?.admin_review?.bank_rejection_reason;

  return (
    <main className="dv-page">
      <div className="dv-page-container">
        <div className="dv-page-container-center-bank">
          <section className="dv-auth-shell">
            <form className="dv-card dv-bank-form" onSubmit={submit}>
              <div>
                <span className="dv-eyebrow">Step 3</span>
                <h1>Bank Verification</h1>
                <p>
                  The account is verified through Surepass and then reviewed by
                  the administrator.
                </p>
              </div>

              {rejectionReason && (
                <div className="dv-alert warning">
                  Previous submission rejected: {rejectionReason}
                </div>
              )}

              {error && <div className="dv-alert danger">{error}</div>}

              {!loading && data?.editable === false && (
                <div className="dv-alert warning">
                  Bank details cannot be edited in the current verification
                  status.
                </div>
              )}

              <label>
                Account number
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6,20}"
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(event.target.value.replace(/\D/g, ""))
                  }
                  autoComplete="off"
                  required
                />
              </label>

              <label>
                Confirm account number
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6,20}"
                  value={confirmAccountNumber}
                  onChange={(event) =>
                    setConfirmAccountNumber(
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  autoComplete="off"
                  required
                />
              </label>

              <label>
                IFSC code
                <input
                  type="text"
                  maxLength={11}
                  value={ifsc}
                  onChange={(event) =>
                    setIfsc(event.target.value.toUpperCase())
                  }
                  required
                />
              </label>

              <div className="dv-alert info">
                The verified account number is available only on the protected
                administrator review screen.
              </div>

              <button
                className="dv-button primary full"
                type="submit"
                disabled={
                  loading || submitting || !data?.editable || !data?.csrf_token
                }
              >
                {submitting ? "Verifying…" : "Verify and Submit Bank Details"}
              </button>

              <Link
                className="dv-button secondary full"
                to="/delivery/verification"
              >
                Cancel
              </Link>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
