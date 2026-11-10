import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  finalizeSellerAadhaar,
  getSellerVerification,
  initializeSellerAadhaar,
  isAuthenticationError,
  isCsrfError,
  type VerificationState,
} from "../services/sellerVerificationApi";
import "../styles/seller-verification.css";

declare global {
  interface Window {
    DigiboostSdk?: (options: {
      gateway: string;
      token: string;
      selector: string;
      style?: Record<string, string>;
      onSuccess?: (data: Record<string, unknown>) => void;
      onFailure?: (error: Record<string, unknown>) => void;
    }) => void;
  }
}

const DIGIBOOST_SDK_URL =
  "https://cdn.jsdelivr.net/gh/surepassio/surepass-digiboost-web-sdk@latest/index.min.js";
const SESSION_CLIENT_ID_KEY = "seller_digilocker_client_id";
const SESSION_TOKEN_KEY = "seller_digilocker_token";
const SESSION_GATEWAY_KEY = "seller_digilocker_gateway";

let sdkPromise: Promise<void> | null = null;

function loadDigiboostSdk(): Promise<void> {
  if (window.DigiboostSdk) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${DIGIBOOST_SDK_URL}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load DigiLocker SDK.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = DIGIBOOST_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load DigiLocker SDK."));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export function SellerAadhaarVerificationPage() {
  const navigate = useNavigate();
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [gateway, setGateway] = useState("production");
  const [clientId, setClientId] = useState(
    () => sessionStorage.getItem(SESSION_CLIENT_ID_KEY) || "",
  );
  const [token, setToken] = useState(
    () => sessionStorage.getItem(SESSION_TOKEN_KEY) || "",
  );
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pollRef = useRef<number | null>(null);
  const pollCountRef = useRef(0);
  const finalizingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAutoChecking(false);
  }, []);

  const clearLocalSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_CLIENT_ID_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_GATEWAY_KEY);
    setClientId("");
    setToken("");
  }, []);

  const finalize = useCallback(
    async (activeClientId?: string) => {
      const id = activeClientId || clientId;

      if (!id || !csrfToken || finalizingRef.current) return;

      finalizingRef.current = true;
      setFinalizing(true);
      setError("");

      try {
        const payload = await finalizeSellerAadhaar(csrfToken, id);

        if (payload.pending || payload.code === "digilocker_pending") {
          setMessage(
            payload.message ||
            "DigiLocker is still processing. Complete the flow and retry.",
          );
          return;
        }

        if (payload.verification) {
          setVerification(payload.verification);
        }

        stopPolling();
        clearLocalSession();
        navigate("/seller/verification", {
          replace: true,
          state: {
            verificationMessage:
              payload.message ||
              "Aadhaar KYC was submitted for administrator review.",
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
            : "Unable to finalize Aadhaar KYC.",
        );
      } finally {
        finalizingRef.current = false;
        setFinalizing(false);
      }
    }, [clearLocalSession, clientId, csrfToken, navigate, stopPolling],
  );

  const startPolling = useCallback(
    (activeClientId: string) => {
      stopPolling();
      pollCountRef.current = 0;
      setAutoChecking(true);

      pollRef.current = window.setInterval(() => {
        pollCountRef.current += 1;

        if (pollCountRef.current > 12) {
          stopPolling();
          setMessage(
            "Automatic checking paused. Complete DigiLocker and use Retry Finalize.",
          );
          return;
        }

        void finalize(activeClientId);
      }, 5000);
    }, [finalize, stopPolling],
  );

  const launchSdk = useCallback(
    async (activeToken: string, activeGateway: string, activeClientId: string) => {
      await loadDigiboostSdk();

      if (!window.DigiboostSdk) {
        throw new Error("DigiLocker SDK loaded but DigiboostSdk is unavailable.");
      }

      const target = document.getElementById("seller-digilocker-button");
      if (!target) {
        throw new Error("DigiLocker launch container is unavailable.");
      }

      target.innerHTML = "";

      window.DigiboostSdk({
        gateway: activeGateway,
        token: activeToken,
        selector: "#seller-digilocker-button",
        style: {
          backgroundColor: "#2196F3",
          color: "white",
          padding: "12px 22px",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "700",
          boxShadow: "0 2px 8px rgba(33,150,243,0.25)",
        },
        onSuccess: () => {
          setMessage("DigiLocker completed. Finalizing your Aadhaar KYC…");
          void finalize(activeClientId);
        },
        onFailure: (sdkError) => {
          setError(
            String(
              sdkError?.message ||
              "DigiLocker was cancelled or could not be completed.",
            ),
          );
        },
      });
    },
    [finalize],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await getSellerVerification();
        if (cancelled) return;

        const state = payload.verification || null;
        const canEdit = Boolean(
          state?.permissions?.can_edit_kyc ??
          ["PROFILE_APPROVED", "KYC_PENDING", "KYC_REJECTED"].includes(
            state?.status || "",
          ),
        );

        if (!canEdit) {
          navigate("/seller/verification", { replace: true });
          return;
        }

        setVerification(state);
        setCsrfToken(payload.csrf_token || "");
        setGateway(
          sessionStorage.getItem(SESSION_GATEWAY_KEY) ||
          payload.gateway ||
          "production",
        );
      } catch (requestError) {
        if (cancelled) return;

        if (isAuthenticationError(requestError)) {
          navigate(
            `/react/login?next=${encodeURIComponent(
              "/seller/verification/aadhaar",
            )}`,
            { replace: true },
          );
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load Aadhaar verification.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [navigate, stopPolling]);

  async function startKyc() {
    if (!csrfToken) {
      setError("Security token unavailable. Refresh the page and try again.");
      return;
    }

    setInitializing(true);
    setError("");
    setMessage("Initializing DigiLocker…");

    try {
      const payload = await initializeSellerAadhaar(csrfToken);
      const nextToken = payload.token || "";
      const nextClientId = payload.client_id || "";
      const nextGateway = payload.gateway || gateway || "production";

      if (!nextToken || !nextClientId) {
        throw new Error("DigiLocker initialization did not return token and client ID.");
      }

      setToken(nextToken);
      setClientId(nextClientId);
      setGateway(nextGateway);
      setVerification(payload.verification || verification);
      setCsrfToken(payload.csrf_token || csrfToken);

      sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken);
      sessionStorage.setItem(SESSION_CLIENT_ID_KEY, nextClientId);
      sessionStorage.setItem(SESSION_GATEWAY_KEY, nextGateway);

      setMessage("DigiLocker is ready. Use the button below to complete KYC.");

      await launchSdk(nextToken, nextGateway, nextClientId);
      startPolling(nextClientId);
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start DigiLocker.",
      );
      setMessage("");
    } finally {
      setInitializing(false);
    }
  }

  if (loading) {
    return (
      <main className="verification-page">
        <section className="verification-loading" aria-busy="true">
          <div className="verification-spinner" />
          <p>Loading Aadhaar verification…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="verification-page narrow">
      <div className="verification-container">
        <section className="verification-heading">
          <div>
            <span className="verification-eyebrow">Seller onboarding</span>
            <h1>Aadhaar KYC</h1>
            <p>
              Complete the Surepass DigiLocker flow and submit the verified Aadhaar
              details for administrator review.
            </p>
          </div>

          <Link
            className="verification-button secondary"
            to="/seller/verification"
          >
            Back to Verification
          </Link>
        </section>

        {verification?.status === "KYC_REJECTED" && (
          <div className="verification-alert danger">
            Previous Aadhaar KYC was rejected: {" "}
            <strong>
              {verification.admin_review?.kyc_rejection_reason ||
                "No reason was provided."}
            </strong>
          </div>
        )}

        <section className="verification-card aadhaar-launch-card">
          <div className="verification-form-heading">
            <span className="verification-eyebrow">Secure identity check</span>
            <h2>Surepass DigiLocker verification</h2>
            <p>
              Start the session, complete the DigiLocker consent flow, and keep
              this page open while the backend checks completion.
            </p>
          </div>

          {error && (
            <div className="verification-alert danger" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="verification-alert warning" role="status">
              {message}
            </div>
          )}

          <div className="verification-status-row">
            <span>Current status</span>
            <strong>
              {(verification?.kyc?.status || verification?.status || "NOT_STARTED").replace(
                /_/g,
                " ",
              )}
            </strong>
          </div>

          <div className="verification-actions">
            <button
              className="verification-button primary"
              type="button"
              onClick={() => void startKyc()}
              disabled={initializing || finalizing}
            >
              {initializing ? "Initializing…" : token ? "Restart DigiLocker" : "Start Aadhaar KYC"}
            </button>

            {clientId && (
              <button
                className="verification-button secondary"
                type="button"
                onClick={() => void finalize()}
                disabled={finalizing}
              >
                {finalizing ? "Finalizing…" : "Retry Finalize"}
              </button>
            )}
          </div>

          <div className="digilocker-shell">
            <div id="seller-digilocker-button" className="digilocker-button-target" />
            {!token && (
              <p>
                The DigiLocker button will appear here after the session is
                initialized.
              </p>
            )}
          </div>

          {autoChecking && (
            <div className="verification-auto-check" aria-live="polite">
              <div className="verification-spinner small" />
              <span>Checking DigiLocker completion automatically…</span>
            </div>
          )}

          <div className="verification-security-note">
            Aadhaar data is fetched by the backend after successful DigiLocker
            consent. The seller response contains only masked Aadhaar information.
          </div>
        </section>
      </div>
    </main>
  );
}
