import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  isCoreAuthenticationError,
  isCoreCsrfError,
  loadAdminAccount,
  requestAdminAccountRejectionReview,
  updateAdminAccountStatus,
  type CoreAccount,
  type CoreApiResponse,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

const BACKEND_PAGE_BASE_URL = (
  import.meta.env.VITE_BACKEND_PAGE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "");

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function legacyReviewUrl(userId: string): string {
  return `${BACKEND_PAGE_BASE_URL}/admin#account-${encodeURIComponent(
    userId,
  )}`;
}

export function AdminAccountDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] =
    useState<CoreApiResponse | null>(null);
  const [working, setWorking] =
    useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "warning" | "danger";
    text: string;
  } | null>(null);
  const [loading, setLoading] =
    useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response =
        await loadAdminAccount(userId);
      setData(response);
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
            : "Unable to load the account.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    location.pathname,
    navigate,
    userId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(
    status: "approved" | "disabled",
  ) {
    if (!data?.csrf_token) return;

    const action =
      status === "approved"
        ? "approve"
        : "disable";

    if (
      !window.confirm(
        `${action.charAt(0).toUpperCase()}${action.slice(
          1,
        )} this account?`,
      )
    ) {
      return;
    }

    setWorking(status);
    setNotice(null);

    try {
      const response =
        await updateAdminAccountStatus(
          userId,
          data.csrf_token,
          status,
        );

      setNotice({
        type: "success",
        text:
          response.message ||
          "Account status updated.",
      });
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
            : "Unable to update the account.",
      });
    } finally {
      setWorking("");
    }
  }

  async function requestRejectionReview() {
    if (!data?.csrf_token) return;

    setWorking("reject");
    setNotice(null);

    try {
      const response =
        await requestAdminAccountRejectionReview(
          userId,
          data.csrf_token,
        );

      setNotice({
        type: "warning",
        text:
          response.message ||
          "Detailed rejection review is required.",
      });

      if (response.dashboard_url) {
        window.location.assign(
          `${BACKEND_PAGE_BASE_URL}${response.dashboard_url}`,
        );
      }
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
            : "Unable to open rejection review.",
      });
    } finally {
      setWorking("");
    }
  }

  if (loading && !data?.account) {
    return (
      <main className="ca-page">
        <div className="ca-page-container">
          <div className="ca-loading">
            Loading account review…
          </div>
        </div>
      </main>
    );
  }

  if (!data?.account) {
    return (
      <main className="ca-page">
        <div className="ca-page-container">
          <section className="ca-empty">
            <h1>Account unavailable</h1>
            <p>
              {notice?.text ||
                "The selected account was not found."}
            </p>
            <Link
              className="ca-button secondary"
              to="/admin/accounts"
            >
              Back to Accounts
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const account =
    data.account as CoreAccount;
  const roleDetails: Array<{
    label: string;
    value: unknown;
  }> =
    account.role === "seller"
      ? [
        {
          label: "Business name",
          value: account.business_name,
        },
        {
          label: "GST number",
          value: account.gst_number,
        },
        {
          label: "Product category",
          value: account.product_category,
        },
        {
          label: "Pickup address",
          value: account.pickup_address,
        },
        {
          label: "Seller verification",
          value:
            account.seller_verification_status,
        },
        {
          label: "Bank verified",
          value: account.bank_verified
            ? "Yes"
            : "No",
        },
      ]
      : account.role === "delivery"
        ? [
          {
            label: "Vehicle type",
            value: account.vehicle_type,
          },
          {
            label: "Vehicle number",
            value: account.vehicle_number,
          },
          {
            label: "Driving licence",
            value: account.license_number,
          },
          {
            label: "Service area",
            value: account.service_area,
          },
          {
            label: "Service radius",
            value:
              account.service_radius_km != null
                ? `${account.service_radius_km} km`
                : "",
          },
          {
            label: "Orders per batch",
            value: account.max_bulk_orders,
          },
          {
            label: "Maximum active orders",
            value: account.max_active_orders,
          },
          {
            label: "Delivery verification",
            value:
              account.delivery_verification_status,
          },
        ]
        : [];

  return (
    <main className="ca-page">
      <div className="ca-page-container">
        <section className="ca-heading">
          <div>
            <span className="ca-eyebrow">
              Administrator account review
            </span>
            <h1>{account.full_name}</h1>
            <p>
              {account.email} · {account.phone} ·{" "}
              {label(account.role)}
            </p>
          </div>

          <div className="ca-actions">
            <Link
              className="ca-button secondary"
              to="/admin/accounts"
            >
              Back to Accounts
            </Link>
            <a
              className="ca-button secondary"
              href={legacyReviewUrl(account.id)}
            >
              Open Full HTML Review
            </a>
          </div>
        </section>

        {notice && (
          <div
            className={`ca-alert ${notice.type}`}
          >
            {notice.text}
          </div>
        )}

        <section className="ca-dashboard-grid">
          <article className="ca-card">
            <h2>Account Details</h2>

            <dl className="ca-detail-list">
              <div>
                <dt>Account ID</dt>
                <dd>{account.id}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{label(account.role)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{label(account.status)}</dd>
              </div>
              <div>
                <dt>Login method</dt>
                <dd>
                  {label(
                    account.login_method ||
                    "email_otp",
                  )}
                </dd>
              </div>
              <div>
                <dt>Email verified</dt>
                <dd>
                  {account.email_verified
                    ? "Yes"
                    : "No"}
                </dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>
                  {account.is_blocked
                    ? "Yes"
                    : "No"}
                </dd>
              </div>
              <div>
                <dt>Deleted</dt>
                <dd>
                  {account.is_deleted
                    ? "Yes"
                    : "No"}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  {account.created_at || "—"}
                </dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  {account.updated_at || "—"}
                </dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>
                  {account.last_login_at ||
                    "—"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="ca-card">
            <h2>
              {account.role === "seller"
                ? "Seller Details"
                : account.role === "delivery"
                  ? "Delivery Details"
                  : "Role Details"}
            </h2>

            {roleDetails.length ? (
              <dl className="ca-detail-list">
                {roleDetails.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>
                      {String(
                        row.value ?? "",
                      ).trim() || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                No additional role-specific details
                are required for this account.
              </p>
            )}

            {account.maps_url && (
              <a
                className="ca-button secondary"
                href={account.maps_url}
                target="_blank"
                rel="noreferrer"
              >
                Open Location
              </a>
            )}
          </article>
        </section>

        {data.can_change_status !== false &&
          account.role !== "admin" && (
            <section className="ca-feature-card">
              <div className="ca-section-heading">
                <div>
                  <span className="ca-eyebrow">
                    Available React operations
                  </span>
                  <h2>Account Status</h2>
                  <p>
                    Approve or disable this account.
                    Rejection, editing, blocking,
                    deletion and restoration remain in
                    the detailed server-rendered review
                    until their add-on APIs are exposed.
                  </p>
                </div>
              </div>

              <div className="ca-actions">
                <button
                  className="ca-button success"
                  type="button"
                  onClick={() =>
                    void updateStatus(
                      "approved",
                    )
                  }
                  disabled={
                    working === "approved" ||
                    account.status ===
                    "approved"
                  }
                >
                  {working === "approved"
                    ? "Approving…"
                    : "Approve Account"}
                </button>

                <button
                  className="ca-button secondary"
                  type="button"
                  onClick={() =>
                    void updateStatus(
                      "disabled",
                    )
                  }
                  disabled={
                    working === "disabled" ||
                    account.status ===
                    "disabled"
                  }
                >
                  {working === "disabled"
                    ? "Disabling…"
                    : "Disable Account"}
                </button>

                <button
                  className="ca-button danger"
                  type="button"
                  onClick={() =>
                    void requestRejectionReview()
                  }
                  disabled={
                    working === "reject"
                  }
                >
                  Open Rejection Review
                </button>
              </div>
            </section>
          )}
      </div>
    </main>
  );
}
