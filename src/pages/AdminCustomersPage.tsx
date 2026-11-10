import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadAdminAccounts, type CoreAccount } from "../services/coreCommerceApi";
import "../styles/admin-ecommerce.css";

/**
 * Scoped EasyFindStore styling. Shared admin-ecommerce.css stays in place;
 * these overrides apply only to the Customers page.
 */
const ADMIN_CUSTOMERS_STYLES = `
  main.ec-react-page.rudra-customers-page {
    --rc-maroon: #55111f;
    --rc-maroon-deep: #3b0a15;
    --rc-maroon-hover: #6b1d30;
    --rc-gold: #c89d55;
    --rc-paper: #fffaf5;
    --rc-soft: #f9f0e9;
    --rc-ink: #291b20;
    --rc-muted: #75646a;
    --rc-border: #e9d9d0;
    --rc-gutter: clamp(16px, 2.4vw, 48px);
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    min-height: 100%;
    margin: 0 !important;
    padding: 30px var(--rc-gutter) 64px !important;
    box-sizing: border-box;
    background: var(--rc-paper);
    color: var(--rc-ink);
    overflow-x: clip;
  }

  main.rudra-customers-page *,
  main.rudra-customers-page *::before,
  main.rudra-customers-page *::after {
    box-sizing: border-box;
  }

  main.rudra-customers-page .ec-react-heading {
    width: 100%;
    max-width: none !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin: 0 0 24px !important;
    padding: 0 0 22px !important;
    border-bottom: 1px solid var(--rc-border);
    background: transparent;
  }

  main.rudra-customers-page .ec-react-eyebrow {
    display: inline-block;
    color: var(--rc-maroon) !important;
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
  }

  main.rudra-customers-page .ec-react-heading h1 {
    margin: 5px 0 9px;
    color: var(--rc-maroon-deep) !important;
    font-size: clamp(1.65rem, 2.4vw, 2.55rem);
    line-height: 1.18;
    letter-spacing: -.035em;
    font-weight: 800;
  }

  main.rudra-customers-page .ec-react-heading p {
    margin: 0;
    color: var(--rc-muted) !important;
    line-height: 1.5;
    font-size: .94rem;
  }

  main.rudra-customers-page .ec-react-heading .ec-react-primary.ec-react-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: auto;
    min-height: 42px;
    padding: 10px 16px;
    border: 1px solid #d7b6ba !important;
    border-radius: 11px;
    background: #fff !important;
    color: var(--rc-maroon) !important;
    font-size: .87rem;
    font-weight: 750;
    line-height: 1.3;
    text-align: center;
    text-decoration: none;
    box-shadow: none;
    transition: background-color .16s ease, border-color .16s ease;
  }

  main.rudra-customers-page .ec-react-heading .ec-react-primary.ec-react-secondary:hover {
    border-color: var(--rc-maroon) !important;
    background: var(--rc-soft) !important;
  }

  main.rudra-customers-page .ec-react-panel {
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    padding: clamp(16px, 1.7vw, 26px) !important;
    border: 1px solid var(--rc-border) !important;
    border-radius: 18px;
    background: #fff !important;
    box-shadow: 0 8px 26px rgba(60, 19, 31, .05);
  }

  main.rudra-customers-page .ec-react-panel-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 18px;
    padding: 0 0 14px;
    border-bottom: 1px solid var(--rc-border);
    background: transparent;
  }

  main.rudra-customers-page .ec-react-panel-title h2 {
    margin: 0;
    color: var(--rc-maroon-deep) !important;
    font-size: clamp(1.1rem, 1.5vw, 1.4rem);
    line-height: 1.3;
    font-weight: 800;
  }

  main.rudra-customers-page .ec-react-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0 0 18px;
    padding: 0;
    background: transparent;
  }

  main.rudra-customers-page .ec-react-filters input {
    display: block;
    width: min(100%, 480px);
    min-width: 0;
    min-height: 46px;
    margin: 0;
    padding: 10px 14px;
    border: 1px solid var(--rc-border) !important;
    border-radius: 11px;
    outline: none;
    background: #fff !important;
    color: var(--rc-ink) !important;
    box-shadow: none;
    font: inherit;
    font-size: .91rem;
    transition: border-color .16s ease, box-shadow .16s ease;
  }

  main.rudra-customers-page .ec-react-filters input::placeholder {
    color: #9a8990;
  }

  main.rudra-customers-page .ec-react-filters input:focus {
    border-color: var(--rc-maroon) !important;
    box-shadow: 0 0 0 3px rgba(200, 157, 85, .18);
  }

  main.rudra-customers-page :is(a, button, input):focus-visible {
    outline: 3px solid rgba(200, 157, 85, .48);
    outline-offset: 2px;
  }

  main.rudra-customers-page .ec-react-table-scroll {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: visible;
    border: 1px solid var(--rc-border);
    border-radius: 13px;
    background: #fff;
    -webkit-overflow-scrolling: touch;
    scrollbar-color: #d2b7b0 transparent;
  }

  main.rudra-customers-page .ec-react-table-scroll table {
    width: 100%;
    min-width: 640px;
    margin: 0;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: auto;
    background: #fff;
    color: var(--rc-ink);
  }

  main.rudra-customers-page .ec-react-table-scroll thead,
  main.rudra-customers-page .ec-react-table-scroll thead tr {
    background: var(--rc-maroon) !important;
  }

  main.rudra-customers-page .ec-react-table-scroll th {
    padding: 15px 17px;
    border: 0;
    border-bottom: 2px solid var(--rc-gold);
    background: var(--rc-maroon) !important;
    color: #fff !important;
    font-size: .76rem;
    font-weight: 750;
    letter-spacing: .035em;
    text-align: left;
    white-space: nowrap;
  }

  main.rudra-customers-page .ec-react-table-scroll td {
    padding: 15px 17px;
    border: 0;
    border-bottom: 1px solid #f0e6df;
    background: transparent;
    color: var(--rc-ink);
    font-size: .89rem;
    line-height: 1.5;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }

  main.rudra-customers-page .ec-react-table-scroll tbody tr {
    background: #fff;
    transition: background-color .14s ease;
  }

  main.rudra-customers-page .ec-react-table-scroll tbody tr:nth-child(even) {
    background: #fffbf8;
  }

  main.rudra-customers-page .ec-react-table-scroll tbody tr:hover {
    background: #fff1e9;
  }

  main.rudra-customers-page .ec-react-table-scroll tbody tr:last-child td {
    border-bottom: 0;
  }

  main.rudra-customers-page .ec-react-table-scroll td:first-child {
    font-weight: 750;
    color: var(--rc-maroon-deep);
  }

  main.rudra-customers-page .rudra-customer-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 27px;
    padding: 4px 10px;
    border: 1px solid #e3cabb;
    border-radius: 999px;
    background: #fff6ef;
    color: var(--rc-maroon);
    font-size: .75rem;
    font-weight: 750;
    line-height: 1.2;
    white-space: nowrap;
  }

  main.rudra-customers-page .rudra-customer-status.blocked {
    border-color: #edc4c3;
    background: #fff0ef;
    color: #9b262d;
  }

  main.rudra-customers-page .ec-react-error {
    margin: 0 0 14px;
    padding: 13px 15px;
    border: 1px solid #edc4c3;
    border-radius: 11px;
    background: #fff0ef;
    color: #9b262d;
    font-size: .88rem;
    line-height: 1.45;
  }

  main.rudra-customers-page .rudra-customers-empty {
    padding: 22px 16px;
    border-top: 0;
    color: var(--rc-muted);
    text-align: center;
    font-size: .88rem;
  }

  @media (max-width: 900px) {
    main.ec-react-page.rudra-customers-page {
      padding-top: 22px !important;
      padding-bottom: 46px !important;
    }
    main.rudra-customers-page .ec-react-panel {
      padding: 18px !important;
    }
  }

  @media (max-width: 600px) {
    main.ec-react-page.rudra-customers-page {
      --rc-gutter: 16px;
      padding-top: 16px !important;
      padding-bottom: 34px !important;
    }
    main.rudra-customers-page .ec-react-heading {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
      margin-bottom: 16px !important;
      padding-bottom: 17px !important;
    }
    main.rudra-customers-page .ec-react-heading .ec-react-primary.ec-react-secondary {
      width: 100%;
    }
    main.rudra-customers-page .ec-react-panel {
      padding: 14px !important;
      border-radius: 14px;
    }
    main.rudra-customers-page .ec-react-panel-title {
      margin-bottom: 13px;
      padding-bottom: 12px;
    }
    main.rudra-customers-page .ec-react-filters {
      margin-bottom: 14px;
    }
    main.rudra-customers-page .ec-react-filters input {
      width: 100%;
      min-height: 44px;
      font-size: 16px;
    }
    main.rudra-customers-page .ec-react-table-scroll th,
    main.rudra-customers-page .ec-react-table-scroll td {
      padding: 12px 13px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    main.rudra-customers-page *,
    main.rudra-customers-page *::before,
    main.rudra-customers-page *::after {
      transition: none !important;
    }
  }
`;

export function AdminCustomersPage() {
  const [accounts, setAccounts] = useState<CoreAccount[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    loadAdminAccounts({ role: "user" })
      .then((result) => {
        if (active) {
          setAccounts((result.accounts || []).filter((account) => account.role === "user"));
        }
      })
      .catch((caughtError) => {
        if (!active) return;
        if (/login|unauthori[sz]ed/i.test(String(caughtError))) {
          navigate("/react/login?next=/admin/customers", { replace: true });
        } else {
          setError(String(caughtError));
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const filtered = accounts.filter((account) =>
    `${account.full_name} ${account.email} ${account.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <style>{ADMIN_CUSTOMERS_STYLES}</style>
      <main className="ec-react-page rudra-customers-page">
        <div className="ec-react-heading">
          <div>
            <span className="ec-react-eyebrow">Customer accounts</span>
            <h1>Customers</h1>
            <p>View and manage customer accounts.</p>
          </div>
          <Link className="ec-react-primary ec-react-secondary" to="/admin">
            Back to Dashboard
          </Link>
        </div>

        <div className="ec-react-panel">
          <div className="ec-react-panel-title">
            <h2>Customer List ({accounts.length})</h2>
          </div>
          <div className="ec-react-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or mobile"
              aria-label="Search customers"
            />
          </div>
          {error && (
            <div role="alert" className="ec-react-error">
              {error}
            </div>
          )}
          <div className="ec-react-table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <tr key={account.id}>
                    <td>{account.full_name}</td>
                    <td>{account.email}</td>
                    <td>{account.phone}</td>
                    <td>
                      <span className={`rudra-customer-status${account.is_blocked ? " blocked" : ""}`}>
                        {account.is_blocked ? "Blocked" : account.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="rudra-customers-empty" colSpan={4}>
                      {search ? "No customers match your search." : "No customer accounts found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
