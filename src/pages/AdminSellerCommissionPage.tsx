import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  createSellerCommissionRule,
  deleteSellerCommissionRule,
  loadAdminSettlementSettings,
  loadSellerCommissionRules,
  saveAdminSettlementSettings,
  setSellerOrderAvailability,
  settlementErrorMessage,
  updateSellerCommissionRule,
  type SellerCommissionRule,
  type SellerCommissionSeller,
  type SettlementSettings,
} from "../services/settlementEarningsApi";
import "../styles/settlement-earnings.css";

function commissionErrorMessage(error: unknown, fallback: string): string {
  const message = settlementErrorMessage(error, fallback);
  const code = String((error as any)?.code || "").trim();
  return code && !message.includes(code) ? `${message} (${code})` : message;
}

function authRedirect(
  error: unknown,
  navigate: ReturnType<typeof useNavigate>,
): boolean {
  const status = Number((error as any)?.status || 0);
  if (status === 401) {
    navigate("/react/login?next=/admin/seller-commissions", { replace: true });
    return true;
  }
  return false;
}

export function AdminSellerCommissionPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<SellerCommissionRule[]>([]);
  const [sellers, setSellers] = useState<SellerCommissionSeller[]>([]);
  const [settings, setSettings] = useState<SettlementSettings | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editValues, setEditValues] = useState<
    Record<string, { commission_percent: string; notes: string; is_active: boolean }>
  >({});
  const [working, setWorking] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [commissionPayload, settingsPayload] = await Promise.all([
        loadSellerCommissionRules(),
        loadAdminSettlementSettings(),
      ]);
      setRules(commissionPayload.rules || []);
      setSellers(commissionPayload.sellers || []);
      setSettings(settingsPayload.settings);
      setCsrfToken(
        commissionPayload.csrf_token || settingsPayload.csrf_token || "",
      );
      setEditValues(
        Object.fromEntries(
          (commissionPayload.rules || []).map((rule) => [
            rule.id,
            {
              commission_percent: String(rule.commission_percent ?? 0),
              notes: rule.notes || "",
              is_active: rule.is_active !== false,
            },
          ]),
        ),
      );
    } catch (requestError) {
      if (authRedirect(requestError, navigate)) return;
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to load seller commission rules.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unconfiguredSellers = useMemo(
    () => sellers.filter((seller) => !seller.has_commission_rule),
    [sellers],
  );

  async function createRule(event: FormEvent) {
    event.preventDefault();

    if (!csrfToken) {
      setError("Security token is missing. Refresh the page and try again.");
      return;
    }

    if (!selectedSellerId) {
      setError("Select a seller.");
      return;
    }

    if (newPercent.trim() === "") {
      setError("Commission percentage is required.");
      return;
    }

    const commissionPercent = Number(newPercent);
    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      setError("Commission percentage must be between 0 and 100.");
      return;
    }

    setWorking("create");
    setNotice("");
    setError("");
    try {
      const response = await createSellerCommissionRule(
        selectedSellerId,
        commissionPercent,
        newNotes,
        csrfToken,
      );
      setCsrfToken(response.csrf_token || csrfToken);
      setSelectedSellerId("");
      setNewPercent("");
      setNewNotes("");
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        commissionErrorMessage(
          requestError,
          "Unable to create seller commission rule.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function updateRule(rule: SellerCommissionRule) {
    if (!csrfToken) return;
    const values = editValues[rule.id];
    if (!values || values.commission_percent.trim() === "") {
      setError("Commission percentage is required.");
      return;
    }

    const commissionPercent = Number(values.commission_percent);
    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      setError("Commission percentage must be between 0 and 100.");
      return;
    }

    setWorking(`update-${rule.id}`);
    setNotice("");
    setError("");
    try {
      const response = await updateSellerCommissionRule(
        rule.id,
        {
          commission_percent: commissionPercent,
          notes: values.notes,
          is_active: values.is_active,
        },
        csrfToken,
      );
      setCsrfToken(response.csrf_token || csrfToken);
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        commissionErrorMessage(
          requestError,
          "Unable to update seller commission rule.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function deleteRule(rule: SellerCommissionRule) {
    if (!csrfToken) return;
    if (
      !window.confirm(
        `Delete the commission rule for ${rule.seller_name || "this seller"}? Future earnings will use the default seller commission percentage.`,
      )
    ) {
      return;
    }
    setWorking(`delete-${rule.id}`);
    setNotice("");
    setError("");
    try {
      const response = await deleteSellerCommissionRule(rule.id, csrfToken);
      setCsrfToken(response.csrf_token || csrfToken);
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to delete seller commission rule.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function saveDefaultCommission(event: FormEvent) {
    event.preventDefault();
    if (!settings || !csrfToken) return;
    setWorking("default");
    setNotice("");
    setError("");
    try {
      const response = await saveAdminSettlementSettings(csrfToken, settings);
      setSettings(response.settings);
      setCsrfToken(response.csrf_token || csrfToken);
      setNotice(
        "Default seller commission updated. It is used only when a seller has no dedicated commission rule.",
      );
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to update the default seller commission.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function toggleSellerOrders(seller: SellerCommissionSeller) {
    if (!csrfToken) return;
    setWorking(`seller-${seller.id}`);
    setNotice("");
    setError("");
    try {
      const response = await setSellerOrderAvailability(
        seller.id,
        !seller.order_active,
        csrfToken,
      );
      setCsrfToken(response.csrf_token || csrfToken);
      setNotice(response.message);
      await load();
    } catch (requestError) {
      setError(
        settlementErrorMessage(
          requestError,
          "Unable to update seller order availability.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <main className="settlement-page">
      <div className="settlement-container">
        <section className="settlement-heading">
          <div>
            <span className="settlement-eyebrow">Admin configuration</span>
            <h1>Seller Commission Management</h1>
            <p>
              Keep seller-specific commission percentages here. Earnings and
              monthly settlements only read these values; commission editing is
              intentionally kept out of the earnings and settlement pages.
            </p>
          </div>
          <div className="settlement-actions">
            <Link className="settlement-button secondary" to="/admin/earnings">
              Earnings
            </Link>
            <Link
              className="settlement-button secondary"
              to="/admin/settlements/sellers"
            >
              Seller Settlements
            </Link>
            <Link className="settlement-button secondary" to="/admin">
              Admin Dashboard
            </Link>
          </div>
        </section>

        {notice && <div className="settlement-notice">{notice}</div>}
        {error && <div className="settlement-notice error">{error}</div>}

        {settings && (
          <section className="settlement-card">
            <h2>Default Seller Commission</h2>
            <p className="settlement-muted">
              This is only a fallback. A seller-specific rule always takes
              priority over this percentage.
            </p>
            <form className="settlement-form-grid" onSubmit={saveDefaultCommission}>
              <label className="settlement-field">
                <span>Default seller commission %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={settings.seller_commission_percent}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      seller_commission_percent: Number(event.target.value),
                    })
                  }
                />
              </label>
              <button
                className="settlement-button primary"
                disabled={working === "default"}
                type="submit"
              >
                {working === "default" ? "Saving…" : "Save Default"}
              </button>
            </form>
          </section>
        )}

        <section className="settlement-card">
          <h2>Create Seller Commission Rule</h2>
          <form className="settlement-form-grid" onSubmit={createRule}>
            <label className="settlement-field">
              <span>Seller</span>
              <select
                required
                value={selectedSellerId}
                onChange={(event) => setSelectedSellerId(event.target.value)}
              >
                <option value="">Select seller</option>
                {unconfiguredSellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} {seller.email ? `· ${seller.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="settlement-field">
              <span>Commission %</span>
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={newPercent}
                onChange={(event) => setNewPercent(event.target.value)}
              />
            </label>
            <label className="settlement-field">
              <span>Notes</span>
              <input
                value={newNotes}
                placeholder="Optional agreement / reason"
                onChange={(event) => setNewNotes(event.target.value)}
              />
            </label>
            <button
              className="settlement-button primary"
              disabled={working === "create" || !unconfiguredSellers.length}
              type="submit"
            >
              {working === "create" ? "Creating…" : "Create Rule"}
            </button>
          </form>
          {!unconfiguredSellers.length && (
            <div className="settlement-empty compact">
              Every seller already has a dedicated commission rule.
            </div>
          )}
        </section>

        <section className="settlement-card">
          <h2>Seller Commission Rules</h2>
          <div className="settlement-table-wrap">
            <table className="settlement-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Commission %</th>
                  <th>Notes</th>
                  <th>Rule status</th>
                  <th>Order intake</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const values = editValues[rule.id] || {
                    commission_percent: String(rule.commission_percent ?? 0),
                    notes: rule.notes || "",
                    is_active: rule.is_active !== false,
                  };
                  const seller = sellers.find((row) => row.id === rule.seller_id);
                  return (
                    <tr key={rule.id}>
                      <td>
                        <strong>{rule.seller_name || "Seller"}</strong>
                        <small>{rule.seller_email}</small>
                        <small>Rule: {rule.id}</small>
                      </td>
                      <td>
                        <input
                          className="settlement-table-input"
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={values.commission_percent}
                          onChange={(event) =>
                            setEditValues((current) => ({
                              ...current,
                              [rule.id]: {
                                ...values,
                                commission_percent: event.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="settlement-table-notes"
                          value={values.notes}
                          placeholder="Optional notes"
                          onChange={(event) =>
                            setEditValues((current) => ({
                              ...current,
                              [rule.id]: {
                                ...values,
                                notes: event.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <label className="settlement-checkbox compact">
                          <input
                            type="checkbox"
                            checked={values.is_active}
                            onChange={(event) =>
                              setEditValues((current) => ({
                                ...current,
                                [rule.id]: {
                                  ...values,
                                  is_active: event.target.checked,
                                },
                              }))
                            }
                          />
                          {values.is_active ? "Active" : "Inactive"}
                        </label>
                      </td>
                      <td>
                        {seller ? (
                          <button
                            className={`settlement-button ${
                              seller.order_active ? "danger" : "primary"
                            }`}
                            disabled={working === `seller-${seller.id}`}
                            onClick={() => void toggleSellerOrders(seller)}
                            type="button"
                          >
                            {seller.order_active ? "Pause Orders" : "Activate Orders"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="settlement-inline">
                          <button
                            className="settlement-button primary"
                            disabled={working === `update-${rule.id}`}
                            onClick={() => void updateRule(rule)}
                            type="button"
                          >
                            {working === `update-${rule.id}` ? "Saving…" : "Save"}
                          </button>
                          <button
                            className="settlement-button danger"
                            disabled={working === `delete-${rule.id}`}
                            onClick={() => void deleteRule(rule)}
                            type="button"
                          >
                            {working === `delete-${rule.id}` ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !rules.length && (
                  <tr>
                    <td colSpan={6}>No seller-specific commission rules created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {loading && <div className="settlement-empty">Loading commission rules…</div>}
        </section>

        <section className="settlement-card">
          <h2>Sellers Using Default Commission</h2>
          <div className="settlement-table-wrap">
            <table className="settlement-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Effective commission</th>
                  <th>Order intake</th>
                </tr>
              </thead>
              <tbody>
                {unconfiguredSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td>
                      <strong>{seller.name}</strong>
                      <small>{seller.email}</small>
                    </td>
                    <td>{Number(seller.effective_commission_percent || 0).toFixed(2)}%</td>
                    <td>
                      <button
                        className={`settlement-button ${
                          seller.order_active ? "danger" : "primary"
                        }`}
                        disabled={working === `seller-${seller.id}`}
                        onClick={() => void toggleSellerOrders(seller)}
                        type="button"
                      >
                        {seller.order_active ? "Pause Orders" : "Activate Orders"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !unconfiguredSellers.length && (
                  <tr>
                    <td colSpan={3}>All sellers have dedicated commission rules.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
