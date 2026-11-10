import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  finalizeDeliveryAadhaar,
  initializeDeliveryAadhaar,
  isAuthenticationError,
  isCsrfError,
  loadDeliveryAadhaarState,
  type DeliveryVerificationResponse,
  verificationErrorMessage,
} from "../services/deliveryVerificationApi";
import "../styles/delivery-verification.css";

declare global {
  interface Window {
    DigiboostSdk?: (options: {
      gateway: string;
      token: string;
      selector: string;
      style?: Record<string, string>;
      onSuccess: () => void;
      onFailure: () => void;
    }) => void;
  }
}

const SDK_URL =
  "https://cdn.jsdelivr.net/gh/surepassio/surepass-digiboost-web-sdk@latest/index.min.js";

function loadDigiBoostSdk(): Promise<void> {
  if (window.DigiboostSdk) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SDK_URL}"]`,
  );

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), {
        once: true,
      });
      existing.addEventListener(
        "error",
        () => reject(new Error("Unable to load DigiLocker SDK.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load DigiLocker SDK."));
    document.head.appendChild(script);
  });
}

export function DeliveryAadhaarVerificationPage() {
  const navigate = useNavigate();

  const [data, setData] =
    useState<DeliveryVerificationResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(
    "Click the button below to begin.",
  );
  const [messageType, setMessageType] = useState<
    "" | "success" | "error" | "warning"
  >("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryAadhaarState()
      .then((response) => {
        setData(response);

        if (!response.editable) {
          setMessage(
            "Aadhaar KYC cannot be edited in the current verification status.",
          );
          setMessageType("warning");
        }
      })
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              "/delivery/verification/aadhaar",
            )}`,
          );
          return;
        }

        setMessage(
          verificationErrorMessage(
            requestError,
            "Unable to load Aadhaar verification.",
          ),
        );
        setMessageType("error");
      })
      .finally(() => setLoading(false));
  }, []);

  async function initialize() {
    if (!data?.csrf_token || !data.editable) return;

    setWorking(true);
    setMessage("Initializing DigiLocker…");
    setMessageType("");

    const sdkContainer =
      document.getElementById("digilocker-button");

    if (sdkContainer) {
      sdkContainer.innerHTML = "";
    }

    try {
      await loadDigiBoostSdk();

      const initialization =
        await initializeDeliveryAadhaar(
          data.csrf_token,
        );

      setData((current) => ({
        ...current,
        ...initialization,
      }));
      setMessage(
        "Initialization complete. Continue using the DigiLocker button below.",
      );
      setMessageType("success");

      if (
        !window.DigiboostSdk ||
        !initialization.token ||
        !initialization.client_id
      ) {
        throw new Error(
          "DigiLocker initialization did not return the required information.",
        );
      }

      window.DigiboostSdk({
        gateway:
          initialization.gateway ||
          data.gateway ||
          "production",
        token: initialization.token,
        selector: "#digilocker-button",
        style: {
          backgroundColor: "#5b43d6",
          color: "white",
          padding: "12px 22px",
          borderRadius: "999px",
          fontWeight: "700",
        },
        onSuccess: () => {
          void finalize(
            initialization.client_id as string,
            initialization.csrf_token ||
            data.csrf_token ||
            "",
          );
        },
        onFailure: () => {
          setMessage(
            "DigiLocker verification was cancelled or failed.",
          );
          setMessageType("error");
          setWorking(false);
        },
      });
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setMessage(
        verificationErrorMessage(
          requestError,
          "Unable to initialize Aadhaar KYC.",
        ),
      );
      setMessageType("error");
      setWorking(false);
    }
  }

  async function finalize(
    clientId: string,
    csrfToken: string,
  ) {
    setMessage(
      "Downloading and validating Aadhaar XML…",
    );
    setMessageType("");

    try {
      const response = await finalizeDeliveryAadhaar(
        csrfToken,
        clientId,
      );

      if (response.pending) {
        setMessage(
          response.message ||
          "DigiLocker is not complete yet. Complete the flow and retry.",
        );
        setMessageType("warning");
        setWorking(false);
        return;
      }

      setMessage(
        response.message ||
        "KYC submitted successfully. Redirecting…",
      );
      setMessageType("success");

      window.setTimeout(() => {
        navigate("/delivery/verification");
      }, 850);
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setMessage(
        verificationErrorMessage(
          requestError,
          "Unable to finalize Aadhaar KYC.",
        ),
      );
      setMessageType("error");
      setWorking(false);
    }
  }

  return (
    <main className="dv-page">
      <div className="dv-page-container">
        <section className="dv-card dv-verify-card">
          <span className="dv-eyebrow">Step 2</span>
          <h1>Aadhaar DigiLocker KYC</h1>
          <p>
            Initialize Surepass, complete DigiLocker, and submit
            Aadhaar KYC for administrator approval.
          </p>

          <div
            className={`dv-message ${messageType}`}
            role="status"
          >
            {loading
              ? "Loading Aadhaar verification…"
              : message}
          </div>

          <div className="dv-actions">
            <button
              className="dv-button primary"
              type="button"
              onClick={() => void initialize()}
              disabled={
                loading ||
                working ||
                !data?.editable ||
                !data?.csrf_token
              }
            >
              {working
                ? "Verification in Progress…"
                : "Initialize Aadhaar KYC"}
            </button>

            <Link
              className="dv-button secondary"
              to="/delivery/verification"
            >
              Back
            </Link>
          </div>

          <div
            id="digilocker-button"
            className="dv-sdk-space"
          />
        </section>
      </div>
    </main>
  );
}
