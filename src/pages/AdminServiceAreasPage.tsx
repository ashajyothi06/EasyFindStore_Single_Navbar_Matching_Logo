import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "../styles/catalog-extras.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
type Rule = { id: string; kind: "area" | "pincode"; value: string; mode: "allow" | "block" };

export function AdminServiceAreasPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [csrf, setCsrf] = useState("");
  const [kind, setKind] = useState<"area" | "pincode">("pincode");
  const [mode, setMode] = useState<"allow" | "block">("allow");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, payload?: Record<string, string>) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include", method: payload ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify({ ...payload, csrf_token: csrf }) : undefined,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.message || "Request failed");
    return json;
  }
  useEffect(() => {
    let active = true;
    request("/react/api/admin/service-areas")
      .then((response) => {
        if (active) { setRules(response.rules || []); setCsrf(response.csrf_token || ""); }
      })
      .catch((cause) => { if (active) setError(String(cause.message || cause)); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request("/react/api/admin/service-areas", { kind, mode, value });
      setRules(result.rules); setValue("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save rule"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError("");
    try {
      const result = await request(`/react/api/admin/service-areas/${encodeURIComponent(id)}/delete`, {});
      setRules(result.rules);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete rule"); }
    finally { setBusy(false); }
  }

  return <main className="service-area-admin">
    <Link className="area-back-link" to="/admin/catalog">← Back to catalogue</Link>
    <div className="area-heading">
      <div><h1>Delivery service areas</h1>
        <p>Decide which locations can order by adding an allowed or blocked area/pincode.</p>
      </div>
    </div>
    <div className="area-notice"><strong>Policy priority:</strong> Block rules always win. Adding one or more allow rules limits delivery to matching areas.</div>
    {error && <p className="area-alert" role="alert">{error}</p>}
    <section className="area-panel">
      <h2>Add a delivery rule</h2>
      <form className="area-form" onSubmit={save}>
        <label>Location type
          <select value={kind} onChange={(event) => setKind(event.target.value as "area" | "pincode")}>
            <option value="pincode">Pincode</option><option value="area">Area / locality</option>
          </select>
        </label>
        <label>Location
          <input maxLength={140} required value={value} onChange={(event) => setValue(event.target.value)}
            placeholder={kind === "pincode" ? "500062" : "ECIL"} />
        </label>
        <label>Delivery policy
          <select value={mode} onChange={(event) => setMode(event.target.value as "allow" | "block")}>
            <option value="allow">Allow delivery</option><option value="block">Block delivery</option>
          </select>
        </label>
        <button className="area-button" type="submit" disabled={busy || !csrf}>Save rule</button>
      </form>
    </section>
    <section className="area-panel">
      <h2>Current rules ({rules.length})</h2>
      <div className="area-table-wrap"><table className="area-table">
        <thead><tr><th>Type</th><th>Location</th><th>Policy</th><th>Action</th></tr></thead>
        <tbody>{rules.length ? rules.map((rule) => <tr key={rule.id}>
          <td>{rule.kind === "pincode" ? "Pincode" : "Area"}</td>
          <td>{rule.value}</td>
          <td><span className={`area-pill ${rule.mode}`}>{rule.mode}</span></td>
          <td><button className="area-button delete" type="button" disabled={busy} onClick={() => remove(rule.id)}>Remove</button></td>
        </tr>) : <tr><td className="area-empty" colSpan={4}>No restrictions set. All serviceable areas are currently allowed.</td></tr>}</tbody>
      </table></div>
    </section>
  </main>;
}
