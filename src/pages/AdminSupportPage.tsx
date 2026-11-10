import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/admin-support.css";

type Person = { name?: string; employee_id?: string };
type Update = { id: string; created_at?: string; status?: string; public_message?: string; internal_note?: string; agent?: Person };
type Ticket = { id: string; ticket_number?: string; requester_name?: string; requester_email?: string; requester_phone?: string; customer_name?: string; customer_email?: string; customer_phone?: string; order_number?: string; item_name?: string; issue_type?: string; subject?: string; description?: string; priority?: string; status: string; created_at?: string; resolution?: string; updates?: Update[] };
type Enquiry = { id: string; contact_number?: string; full_name?: string; email?: string; phone?: string; subject?: string; message?: string; status: string; created_at?: string; handler_note?: string; handled_by?: Person; email_verified?: boolean };
type SupportData = { success: boolean; message?: string; csrf_token?: string; tickets?: Ticket[]; contacts?: Enquiry[]; summary?: { open_tickets?: number; new_contacts?: number }; ticket_statuses?: string[]; contact_statuses?: string[] };
const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
const CONTACT_STATUSES = ["new", "in_progress", "contacted", "closed"];
const pretty = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const dateText = (s?: string) => s ? new Date(s).toLocaleString("en-IN", {timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"}) : "—";
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function AdminSupportPage({ kind }: { kind: "complaints" | "enquiries" }) {
  const navigate = useNavigate();
  const [data, setData] = useState<SupportData | null>(null);
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [contacted, setContacted] = useState(false);

  const refresh = async () => {
    const r = await fetch(`${BASE}/react/api/complaint-management/dashboard`, { credentials:"include", cache:"no-store" });
    const payload = await r.json() as SupportData;
    if (r.status===401 || r.status===403) { navigate(`/react/login?next=/admin/${kind}`,{replace:true}); return; }
    if (!r.ok || !payload.success) throw new Error(payload.message||"Unable to load customer support records.");
    setData(payload);
  };
  useEffect(() => { let mounted=true; void refresh().catch(e=>{if(mounted)setError(String(e.message||e))}); const interval=window.setInterval(()=>void refresh().catch(()=>{}),30000); return()=>{mounted=false;window.clearInterval(interval)}; },[kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => (kind==="complaints" ? data?.tickets||[] : data?.contacts||[]).filter(row => {
    const haystack = JSON.stringify(row).toLowerCase();
    return (!search || haystack.includes(search.trim().toLowerCase())) && (!statusFilter || row.status===statusFilter);
  }),[data,kind,search,statusFilter]);
  const chosen = rows.find(row=>row.id===selected);
  const selectRow = (row:Ticket|Enquiry) => {
    if(selected===row.id){setSelected("");return;}
    setSelected(row.id);setStatus(row.status);setPublicMessage("");setInternalNote(kind==="enquiries"?(row as Enquiry).handler_note||"":"");setResolution("");setContacted(false);setError("");setSuccess("");
  };
  const save = async (e:FormEvent) => {
    e.preventDefault();if(!chosen||busyId)return;
    setBusyId(chosen.id);setError("");setSuccess("");
    const endpoint = kind==="complaints" ? `/react/api/complaint-management/tickets/${encodeURIComponent(chosen.id)}/update` : `/react/api/complaint-management/contacts/${encodeURIComponent(chosen.id)}/update`;
    const body = kind==="complaints"? {status,public_message:publicMessage,internal_note:internalNote,resolution,requester_contacted:contacted,csrf_token:data?.csrf_token}:{status,handler_note:internalNote,csrf_token:data?.csrf_token};
    try{const r=await fetch(`${BASE}${endpoint}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":data?.csrf_token||""},body:JSON.stringify(body)});const result=await r.json();if(!r.ok||!result.success)throw new Error(result.message||"Unable to save action");setSuccess(`${kind==="complaints"?"Complaint":"Enquiry"} updated successfully.`);await refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to update record")}finally{setBusyId("")}
  };
  const statuses = kind==="complaints"?data?.ticket_statuses||TICKET_STATUSES:data?.contact_statuses||CONTACT_STATUSES;
  return <main className="asc-react"><header className="asc-react-heading"><div><span className="asc-react-eyebrow">ADMIN • CUSTOMER SUPPORT</span><h1>{kind==="complaints"?"Complaint Management":"Contact Enquiries"}</h1><p>All customer cases are managed directly by the store administrator.</p></div><div className="asc-react-links"><Link to="/admin">Dashboard</Link><Link to="/admin/complaints" className={kind==="complaints"?"active":""}>Complaints <b>{data?.summary?.open_tickets||0}</b></Link><Link to="/admin/enquiries" className={kind==="enquiries"?"active":""}>Enquiries <b>{data?.summary?.new_contacts||0}</b></Link></div></header>
    <section className="asc-react-toolbar"><input aria-label="Search support cases" placeholder="Search customer, order, email, subject or reference" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All statuses</option>{statuses.map(s=><option value={s} key={s}>{pretty(s)}</option>)}</select><button type="button" onClick={()=>void refresh().catch(e=>setError(String(e.message||e)))}>Refresh</button><span>{rows.length} records</span></section>
    {error&&<p role="alert" className="asc-react-error">{error}</p>}{success&&<p role="status" className="asc-react-success">{success}</p>}
    <section className="asc-react-panel"><div className="asc-react-table-scroll"><table><thead><tr><th>Reference</th><th>Customer</th><th>Subject / Order</th><th>Received</th><th>Status</th><th>Manage</th></tr></thead><tbody>{rows.map(row=>{const complaint=kind==="complaints"?row as Ticket:null;const enquiry=kind==="enquiries"?row as Enquiry:null;return <tr key={row.id} className={selected===row.id?"selected":""}><td><strong>{complaint?.ticket_number||enquiry?.contact_number||row.id.slice(0,8)}</strong></td><td><strong>{complaint?.requester_name||complaint?.customer_name||enquiry?.full_name||"Customer"}</strong><small>{complaint?.requester_email||complaint?.customer_email||enquiry?.email||""}</small></td><td>{complaint?.subject||enquiry?.subject}<small>{complaint?.order_number||""}</small></td><td>{dateText(row.created_at)}</td><td><span className="asc-react-chip">{pretty(row.status)}</span></td><td><button type="button" onClick={()=>selectRow(row)}>{selected===row.id?"Close":"Review / Act"}</button></td></tr>})}</tbody></table>{rows.length===0&&<p className="asc-react-empty">{data?"No matching submissions yet.":"Loading support records…"}</p>}</div></section>
    {chosen&&<section className="asc-react-detail" aria-label="Selected support case details"><div><h2>{kind==="complaints"?"Complaint details":"Contact enquiry details"}</h2><p className="asc-react-description">{(chosen as Ticket).description||(chosen as Enquiry).message||"No message"}</p>{kind==="complaints"&&<><p><strong>Order:</strong> {(chosen as Ticket).order_number||"—"}</p><p><strong>Product:</strong> {(chosen as Ticket).item_name||"—"}</p><p><strong>Priority:</strong> {pretty((chosen as Ticket).priority||"normal")}</p><h3>Action history</h3>{((chosen as Ticket).updates||[]).map(update=><article key={update.id} className="asc-react-history"><strong>{pretty(update.status||"updated")}</strong> · {dateText(update.created_at)}<p>{update.public_message||update.internal_note||"Status updated"}</p></article>)}</>}{kind==="enquiries"&&<><p><strong>Email:</strong> {(chosen as Enquiry).email||"—"} {(chosen as Enquiry).email_verified?"✓ Verified":""}</p><p><strong>Phone:</strong> {(chosen as Enquiry).phone||"—"}</p><p><strong>Previous note:</strong> {(chosen as Enquiry).handler_note||"—"}</p></>}</div><form onSubmit={e=>void save(e)}><h3>Admin action</h3><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></label>{kind==="complaints"&&<label>Public update to customer<textarea rows={3} value={publicMessage} onChange={e=>setPublicMessage(e.target.value)} placeholder="Information the customer can see in their ticket history"/></label>}<label>{kind==="complaints"?"Internal action / note":"Action taken / follow-up note"}<textarea rows={3} value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder="Record investigation, response, or follow-up"/></label>{kind==="complaints"&&<><label>Resolution<textarea rows={2} value={resolution} onChange={e=>setResolution(e.target.value)}/></label><label className="asc-react-checkbox"><input type="checkbox" checked={contacted} onChange={e=>setContacted(e.target.checked)}/> Customer contacted</label></>}<button type="submit" disabled={Boolean(busyId)||!data?.csrf_token}>{busyId?"Saving…":"Save Status & Action"}</button></form></section>}
  </main>;
}
