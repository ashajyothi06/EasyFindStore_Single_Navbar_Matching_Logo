import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  createSellerDeliveryManager,
  isCoreAuthenticationError,
  isCoreCsrfError,
  loadManagerCreateSession,
  loadSellerDeliveryManagers,
  type CoreAccount,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

export function AdminCreateManagerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] =
    useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [csrfToken, setCsrfToken] =
    useState("");
  const [managers, setManagers] =
    useState<CoreAccount[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [session, managerList] =
        await Promise.all([
          loadManagerCreateSession(),
          loadSellerDeliveryManagers(),
        ]);

      setCsrfToken(
        String(session.csrf_token || ""),
      );
      setManagers(
        (managerList.managers || []) as CoreAccount[],
      );
    } catch (requestError) {
      if (
        isCoreAuthenticationError(
          requestError,
        )
      ) {
        navigate(
          `/react/login?next=${encodeURIComponent(
            location.pathname,
          )}`,
          { replace: true },
        );
        return;
      }

      setNotice({
        type: "danger",
        text:
          requestError instanceof Error
            ? requestError.message
            : "Unable to load manager creation.",
      });
    } finally {
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !csrfToken ||
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const response =
        await createSellerDeliveryManager(
          csrfToken,
          {
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
        );

      setNotice({
        type: "success",
        text:
          response.message ||
          "Seller Delivery Manager created.",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      window.dispatchEvent(
        new Event("admin-dashboard-updated"),
      );
      await load();
    } catch (requestError) {
      if (isCoreCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice({
        type: "danger",
        text:
          requestError instanceof Error
            ? requestError.message
            : "Unable to create the manager account.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !csrfToken) {
    return (
      <main className="ca-page">
        <div className="ca-page-container">
        <div className="ca-loading">
          Loading manager accounts…
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ca-page">
      <div className="ca-page-container">
      <section className="ca-dashboard-grid manager-create-grid">
        <form
          className="ca-form-card"
          onSubmit={submit}
        >
          <div className="ca-section-heading">
            <div>
              <span className="ca-eyebrow">
                Admin-created role
              </span>
              <h1>
                Create Seller Delivery Manager
              </h1>
              <p>
                Create an approved manager account.
                The manager logs in using an OTP sent
                to the registered email address.
              </p>
            </div>
            <Link
              className="ca-button secondary small"
              to="/admin"
            >
              Back to Admin
            </Link>
          </div>

          {notice && (
            <div
              className={`ca-alert ${notice.type}`}
            >
              {notice.text}
            </div>
          )}

          <label>
            Full name
            <input
              type="text"
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Enter the manager's full name"
              required
            />
          </label>

          <div className="ca-two-column">
            <label>
              Email
              <input
                type="email"
                maxLength={150}
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="manager@example.com"
                required
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                minLength={8}
                maxLength={20}
                autoComplete="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="Enter phone number"
                required
              />
            </label>
          </div>

          <div className="ca-alert info">
            No password or seller assignment is
            required. This account is approved
            immediately and uses email OTP login.
          </div>

          <button
            className="ca-button primary full"
            type="submit"
            disabled={
              submitting ||
              !csrfToken ||
              !fullName.trim() ||
              !email.trim() ||
              !phone.trim()
            }
          >
            {submitting
              ? "Creating Account…"
              : "Create Manager Account"}
          </button>
        </form>

        <section className="ca-card">
          <div className="ca-section-heading">
            <div>
              <span className="ca-eyebrow">
                Current accounts
              </span>
              <h2>Seller Delivery Managers</h2>
              <p>
                Approved accounts available for
                seller-response and delivery-dispatch
                coordination.
              </p>
            </div>
            <span className="ca-count-badge">
              {managers.length}
            </span>
          </div>

          <div className="ca-compact-list">
            {managers.map((manager) => (
              <article key={manager.id}>
                <div>
                  <strong>
                    {manager.full_name}
                  </strong>
                  <small>
                    {manager.email} ·{" "}
                    {manager.phone}
                  </small>
                </div>
                <span className="ca-status success">
                  Approved
                </span>
                <Link
                  className="ca-button secondary small"
                  to={`/admin/accounts/${manager.id}`}
                >
                  Open
                </Link>
              </article>
            ))}

            {!managers.length && (
              <div className="ca-empty compact">
                No Seller Delivery Manager accounts
                have been created.
              </div>
            )}
          </div>
        </section>
      </section>
      </div>
    </main>
  );
}
