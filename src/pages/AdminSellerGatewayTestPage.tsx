import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  createAdminRazorpayTestOrder,
  errorMessage,
  isAuthenticationError,
  isCsrfError,
  loadAdminSellerGateway,
  verifyAdminRazorpayTest,
  type RazorpayCheckoutPayload,
  type RazorpayPaymentResult,
  type RazorpayStateResponse,
} from "../services/sellerRazorpayApi";
import "../styles/seller-razorpay.css";

declare global {
  interface Window {
    Razorpay?: new (
      options: Record<string, unknown>,
    ) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), {
        once: true,
      });
      existing.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay Checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

export function AdminSellerGatewayTestPage() {
  const { sellerId = "" } = useParams();
  const [searchParams] = useSearchParams();

  const initialAmount = useMemo(() => {
    const raw = Number(searchParams.get("amount") || 1);
    return Math.max(1, Math.min(10000, raw || 1));
  }, [searchParams]);

  const [data, setData] = useState<RazorpayStateResponse | null>(null);
  const [checkout, setCheckout] =
    useState<RazorpayCheckoutPayload | null>(null);
  const [amountRupees, setAmountRupees] =
    useState(initialAmount);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    kind: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await loadAdminSellerGateway(sellerId);

        if (!cancelled) {
          setData(response);
        }
      } catch (error) {
        if (isAuthenticationError(error)) {
          window.location.assign(
            `/react/login?next=${encodeURIComponent(
              `/admin/seller-payment-gateways/${sellerId}/test`,
            )}`,
          );
          return;
        }

        if (!cancelled) {
          setResult({
            kind: "error",
            text: errorMessage(
              error,
              "Unable to load the seller gateway.",
            ),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  function handleError(error: unknown, fallback: string) {
    if (isCsrfError(error)) {
      window.location.reload();
      return;
    }

    if (isAuthenticationError(error)) {
      window.location.assign("/react/login");
      return;
    }

    setResult({
      kind: "error",
      text: errorMessage(error, fallback),
    });
  }

  async function createOrder() {
    const csrf = data?.csrf_token || "";

    if (!csrf) {
      setResult({
        kind: "error",
        text: "The security token is unavailable. Refresh the page.",
      });
      return;
    }

    setCreating(true);
    setResult(null);

    try {
      const response = await createAdminRazorpayTestOrder(
        sellerId,
        csrf,
        Math.max(1, Math.min(10000, amountRupees || 1)),
      );

      setData(response);
      setCheckout(response.checkout || null);
      setResult({
        kind: "success",
        text:
          response.message ||
          "Test order created. Open Razorpay Checkout.",
      });

      await loadRazorpayScript();
    } catch (error) {
      handleError(error, "Unable to create the test order.");
    } finally {
      setCreating(false);
    }
  }

  async function verifyPayment(
    payment: RazorpayPaymentResult,
  ) {
    const csrf = data?.csrf_token || "";

    setVerifying(true);
    setResult({
      kind: "warning",
      text: "Verifying payment on the server…",
    });

    try {
      const response = await verifyAdminRazorpayTest(
        sellerId,
        csrf,
        payment,
      );

      setData(response);
      setResult({
        kind: "success",
        text:
          response.message ||
          "Razorpay payment was verified successfully.",
      });
    } catch (error) {
      handleError(error, "Payment verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function openCheckout() {
    if (!checkout) return;

    try {
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable.");
      }

      const instance = new window.Razorpay({
        key: checkout.key_id,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.order_id,
        prefill: checkout.prefill || {},
        theme: { color: "#5b43d6" },
        handler: (response: RazorpayPaymentResult) => {
          void verifyPayment(response);
        },
        modal: {
          ondismiss: () => {
            setResult({
              kind: "warning",
              text: "Payment window closed without verification.",
            });
          },
        },
      });

      instance.open();
    } catch (error) {
      setResult({
        kind: "error",
        text: errorMessage(
          error,
          "Unable to open Razorpay Checkout.",
        ),
      });
    }
  }

  if (loading) {
    return (
      <main className="razorpay-page">
        <div className="razorpay-page-container">
          <section className="razorpay-loading">
            <div className="razorpay-spinner" />
            <p>Loading payment test…</p>
          </section>
        </div>
      </main>
    );
  }

  const seller = data?.seller;
  const gateway = data?.gateway;

  return (
    <main className="razorpay-page">
      <div className="razorpay-page-container">
        <section className="payment-heading">
          <div>
            <span className="razorpay-eyebrow">
              Admin verification
            </span>
            <h1>
              Test {seller?.full_name || "Seller"}&apos;s Razorpay
              Gateway
            </h1>
            <p>
              Complete Checkout. The server validates the signature and
              confirms that the payment is captured.
            </p>
          </div>

          <Link
            className="razorpay-button secondary"
            to={`/admin/seller-payment-gateways/${sellerId}`}
          >
            Back to Review
          </Link>
        </section>

        <section className="payment-card centered-test">
          <div className="test-amount">
            <span>Test amount</span>
            <strong>
              ₹
              {(
                checkout
                  ? checkout.amount / 100
                  : amountRupees
              ).toFixed(2)}
            </strong>
          </div>

          <p>
            Mode: <strong>{gateway?.mode || "test"}</strong>
          </p>

          {gateway?.mode === "live" ? (
            <div className="razorpay-notice error">
              This uses Live Mode credentials and can deduct real money.
            </div>
          ) : (
            <div className="razorpay-notice warning">
              This is a simulated Test Mode transaction.
            </div>
          )}

          {!checkout && (
            <label className="test-amount-input">
              Test amount in rupees
              <input
                type="number"
                min={1}
                max={10000}
                value={amountRupees}
                onChange={(event) =>
                  setAmountRupees(Number(event.target.value))
                }
              />
            </label>
          )}

          {!checkout ? (
            <button
              className="razorpay-button primary"
              type="button"
              onClick={() => void createOrder()}
              disabled={creating}
            >
              {creating ? "Creating Test Order…" : "Create Test Order"}
            </button>
          ) : (
            <button
              className="razorpay-button primary"
              type="button"
              onClick={() => void openCheckout()}
              disabled={verifying}
            >
              {verifying
                ? "Verifying…"
                : "Open Razorpay Checkout"}
            </button>
          )}

          {result && (
            <div className={`test-result ${result.kind}`}>
              {result.text}
            </div>
          )}

          <Link
            className="razorpay-button secondary"
            to={`/admin/seller-payment-gateways/${sellerId}`}
          >
            Cancel
          </Link>
        </section>
      </div>
    </main>
  );
}
