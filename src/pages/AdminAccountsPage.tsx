import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  isCoreAuthenticationError,
  loadAdminAccounts,
  type CoreAccount,
  type CoreApiResponse,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function statusTone(account: CoreAccount): string {
  if (account.is_deleted || account.is_blocked) {
    return "danger";
  }

  if (account.status === "approved") {
    return "success";
  }

  if (
    account.status === "pending" ||
    account.status ===
    "email_verification_pending"
  ) {
    return "warning";
  }

  return "danger";
}

export function AdminAccountsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [data, setData] =
    useState<CoreApiResponse | null>(null);
  const [query, setQuery] = useState(
    searchParams.get("q") || "",
  );
  const [role, setRole] = useState(
    searchParams.get("role") || "",
  );
  const [status, setStatus] = useState(
    searchParams.get("status") || "",
  );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await loadAdminAccounts({
            query:
              searchParams.get("q") || "",
            role:
              searchParams.get("role") ||
              "",
            status:
              searchParams.get("status") ||
              "",
          });

        if (!cancelled) {
          setData(response);
          setQuery(
            searchParams.get("q") || "",
          );
          setRole(
            searchParams.get("role") || "",
          );
          setStatus(
            searchParams.get("status") ||
            "",
          );
        }
      } catch (requestError) {
        if (
          isCoreAuthenticationError(
            requestError,
          )
        ) {
          navigate(
            `/react/login?next=${encodeURIComponent(
              location.pathname +
              location.search,
            )}`,
            { replace: true },
          );
          return;
        }

        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load accounts.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    location.pathname,
    location.search,
    navigate,
    searchParams,
  ]);

  function submit(event: FormEvent) {
    event.preventDefault();

    const next = new URLSearchParams();

    if (query.trim()) {
      next.set("q", query.trim());
    }

    if (role) {
      next.set("role", role);
    }

    if (status) {
      next.set("status", status);
    }

    setSearchParams(next);
  }

  function reset() {
    setQuery("");
    setRole("");
    setStatus("");
    setSearchParams({});
  }

  const accounts =
    (data?.accounts || []) as CoreAccount[];
  const summary =
    (data?.summary || {}) as Record<
      string,
      any
    >;

  return (
    <main className="ca-page">
      <div className="ca-page-container">
        <section className="ca-heading">
          <div>
            <span className="ca-eyebrow">
              Account operations
            </span>
            <h1>Platform Accounts</h1>
            <p>
              Find seller, delivery, customer and
              Seller Delivery Manager accounts and open
              their React review page.
            </p>
          </div>

          <div className="ca-actions">
            <Link
              className="ca-button secondary"
              to="/admin"
            >
              Back to Admin
            </Link>
            <Link
              className="ca-button primary"
              to="/admin/seller-delivery-managers/create"
            >
              Create Manager
            </Link>
          </div>
        </section>

        <section className="ca-stat-grid five">
          <article>
            <strong>
              {Number(summary.total || 0)}
            </strong>
            <span>Total accounts</span>
          </article>
          <article>
            <strong>
              {Number(summary.pending || 0)}
            </strong>
            <span>Pending</span>
          </article>
          <article>
            <strong>
              {Number(summary.approved || 0)}
            </strong>
            <span>Approved</span>
          </article>
          <article>
            <strong>
              {Number(summary.disabled || 0)}
            </strong>
            <span>Disabled</span>
          </article>
          <article>
            <strong>
              {Number(summary.blocked || 0)}
            </strong>
            <span>Blocked</span>
          </article>
        </section>

        <section className="ca-card">
          <form
            className="ca-filter-form"
            onSubmit={submit}
          >
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search name, email, phone, business or vehicle"
            />

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
            >
              <option value="">All roles</option>
              {(data?.allowed_roles || [
                "user",
                "seller",
                "delivery",
                "seller_delivery_manager",
                "admin",
              ]).map((item: string) => (
                <option
                  key={item}
                  value={item}
                >
                  {label(item)}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option value="">All statuses</option>
              {(data?.allowed_statuses || [
                "email_verification_pending",
                "pending",
                "approved",
                "rejected",
                "disabled",
              ]).map((item: string) => (
                <option
                  key={item}
                  value={item}
                >
                  {label(item)}
                </option>
              ))}
            </select>

            <button
              className="ca-button primary"
              type="submit"
            >
              Filter
            </button>

            <button
              className="ca-button secondary"
              type="button"
              onClick={reset}
            >
              Reset
            </button>
          </form>

          {error && (
            <div className="ca-alert danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="ca-loading compact">
              Loading accounts…
            </div>
          ) : accounts.length ? (
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Seller / Delivery Details</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th>Created</th>
                    <th>Review</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>
                          {account.full_name ||
                            "Unnamed Account"}
                        </strong>
                        <small>
                          {account.email}
                        </small>
                        <small>
                          {account.phone}
                        </small>
                      </td>
                      <td>
                        {label(account.role)}
                      </td>
                      <td>
                        {account.role === "seller"
                          ? account.business_name ||
                          account.product_category ||
                          "—"
                          : account.role ===
                            "delivery"
                            ? [
                              account.vehicle_type,
                              account.vehicle_number,
                              account.service_area,
                            ]
                              .filter(Boolean)
                              .join(" · ") ||
                            "—"
                            : "Platform account"}
                      </td>
                      <td>
                        <span
                          className={`ca-status ${statusTone(
                            account,
                          )}`}
                        >
                          {account.is_deleted
                            ? "Deleted"
                            : account.is_blocked
                              ? "Blocked"
                              : label(
                                account.status,
                              )}
                        </span>
                      </td>
                      <td>
                        {account.role === "seller"
                          ? label(
                            account.seller_verification_status,
                          )
                          : account.role ===
                            "delivery"
                            ? label(
                              account.delivery_verification_status,
                            )
                            : "—"}
                      </td>
                      <td>
                        {account.created_at ||
                          "—"}
                      </td>
                      <td>
                        <Link
                          className="ca-button secondary small"
                          to={`/admin/accounts/${account.id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ca-empty compact">
              No accounts match the selected filters.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
