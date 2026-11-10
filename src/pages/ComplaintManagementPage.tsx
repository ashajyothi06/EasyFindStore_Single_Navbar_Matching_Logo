import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Agent = {
  id?: string;
  full_name?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  location_name?: string;
};

type TicketUpdate = {
  id: string;
  status: string;
  public_message?: string;
  internal_note?: string;
  customer_contacted?: boolean;
  requester_contacted?: boolean;
  created_at: string;
  agent?: {
    name?: string;
    employee_id?: string;
  };
};

type Ticket = {
  id: string;
  ticket_number: string;

  requester_id?: string;
  requester_role?: "user" | "seller" | "delivery" | string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  support_channel?: string;
  context_type?: string;
  context_id?: string;
  booking_id?: string;
  batch_id?: string;
  batch_number?: string;
  order_customer_name?: string;
  order_customer_phone?: string;

  // Legacy customer fields remain optional for older tickets.
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  order_id: string;
  order_number?: string;
  item_name?: string;
  issue_type: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to?: {
    name?: string;
    employee_id?: string;
  } | null;
  last_customer_contact?: {
    name?: string;
    employee_id?: string;
    contacted_at?: string;
  } | null;
  last_requester_contact?: {
    name?: string;
    employee_id?: string;
    contacted_at?: string;
  } | null;
  updates?: TicketUpdate[];
};

type Contact = {
  id: string;
  contact_number: string;
  full_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  handled_by?: {
    name?: string;
    employee_id?: string;
  } | null;
  handler_note?: string;
};

type DashboardPayload = {
  success: boolean;
  message?: string;
  login_url?: string;
  agent?: Agent;
  csrf_token?: string;
  summary?: {
    open_tickets: number;
    resolved_tickets: number;
    new_contacts: number;
    total_contacts: number;
    channels?: Record<
      string,
      {
        total?: number;
        active?: number;
        resolved?: number;
      }
    >;
  };
  tickets?: Ticket[];
  contacts?: Contact[];
  ticket_statuses?: string[];
  contact_statuses?: string[];
};

type SortDirection = "oldest" | "newest";
type SupportAudience = "customer" | "seller" | "delivery";

const DEFAULT_TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

const DEFAULT_CONTACT_STATUSES = [
  "new",
  "in_progress",
  "contacted",
  "closed",
];

const COMPLETED_TICKET_STATUSES = new Set(["resolved", "closed"]);
const COMPLETED_CONTACT_STATUSES = new Set(["closed"]);
const REOPENABLE_TICKET_STATUSES = new Set(["resolved", "closed"]);

const STYLES = `
  :root{
    --cm-olive:#33371b;
    --cm-olive-hover:#454b24;
    --cm-olive-deep:#292d16;
    --cm-olive-soft:#eef0e6;
    --cm-olive-soft-2:#f7f7f2;
    --cm-olive-soft-3:#e5e8d9;
    --cm-text:#272b1b;
    --cm-muted:#737765;
    --cm-border:#dfe3d3;
    --cm-border-strong:#cbd1bc;
    --cm-white:#ffffff;
    --cm-danger:#9b281d;
    --cm-danger-bg:#fff0ef;
    --cm-shadow:0 10px 28px rgba(51,55,27,.08);
  }

  .cm-page{
    min-height:100vh;
    background:var(--cm-olive-soft-2);
    color:var(--cm-text);
    font-family:Inter,system-ui,sans-serif;
  }

  .cm-shell{
    width:100%;
    max-width:none;
    margin:0;
    padding:24px clamp(20px,3.6vw,56px) 48px;
  }

  .cm-support-audience-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:12px;
    margin-bottom:18px;
  }

  .cm-support-audience-card{
    position:relative;
    min-height:104px;
    display:grid;
    grid-template-columns:minmax(0,1fr) auto;
    align-items:center;
    gap:14px;
    padding:16px 17px;
    overflow:hidden;
    border:1px solid var(--cm-border);
    border-radius:15px;
    background:var(--cm-white);
    color:var(--cm-text);
    text-align:left;
    cursor:pointer;
    box-shadow:0 3px 12px rgba(51,55,27,.04);
    transition:
      border-color .18s ease,
      background-color .18s ease,
      transform .18s ease,
      box-shadow .18s ease;
  }

  .cm-support-audience-card::before{
    content:"";
    position:absolute;
    inset:0 auto 0 0;
    width:4px;
    background:#cbd1bc;
    transition:background-color .18s ease;
  }

  .cm-support-audience-card:hover{
    border-color:rgba(51,55,27,.34);
    background:#fafaf6;
    transform:translateY(-1px);
  }

  .cm-support-audience-card.active{
    border-color:var(--cm-olive);
    background:var(--cm-olive-soft);
    box-shadow:0 7px 18px rgba(51,55,27,.11);
  }

  .cm-support-audience-card.active::before{
    background:var(--cm-olive);
  }

  .cm-support-audience-copy{
    min-width:0;
    display:grid;
    gap:5px;
  }

  .cm-support-audience-copy strong{
    color:var(--cm-olive-deep);
    font-size:.98rem;
    font-weight:900;
  }

  .cm-support-audience-copy span{
    color:var(--cm-muted);
    font-size:.74rem;
    line-height:1.4;
  }

  .cm-support-audience-count{
    min-width:62px;
    display:grid;
    justify-items:end;
    gap:2px;
  }

  .cm-support-audience-count strong{
    color:var(--cm-olive);
    font-size:1.55rem;
    line-height:1;
  }

  .cm-support-audience-count span{
    color:var(--cm-muted);
    font-size:.65rem;
    font-weight:800;
    text-transform:uppercase;
    letter-spacing:.04em;
  }

  .cm-stats{
    display:grid;
    grid-template-columns:repeat(5,minmax(0,1fr));
    gap:12px;
    margin-bottom:18px;
  }

  .cm-stat{
    padding:17px;
    background:var(--cm-white);
    border:1px solid var(--cm-border);
    border-radius:15px;
    box-shadow:0 3px 12px rgba(51,55,27,.04);
  }

  .cm-stat span{
    display:block;
    color:var(--cm-muted);
    font-size:.78rem;
  }

  .cm-stat strong{
    display:block;
    margin-top:4px;
    color:var(--cm-olive);
    font-size:1.7rem;
  }

  .cm-tabs{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    margin-bottom:15px;
  }

  .cm-tab{
    min-height:42px;
    padding:10px 15px;
    border:1px solid var(--cm-border-strong);
    border-radius:10px;
    background:var(--cm-white);
    color:var(--cm-olive);
    font:inherit;
    font-weight:800;
    cursor:pointer;
    transition:
      background-color .18s ease,
      border-color .18s ease,
      color .18s ease,
      transform .18s ease,
      box-shadow .18s ease;
  }

  .cm-tab:hover{
    border-color:rgba(51,55,27,.42);
    background:var(--cm-olive-soft);
  }

  .cm-tab.active{
    border-color:var(--cm-olive);
    background:var(--cm-olive);
    color:#fff;
    box-shadow:0 6px 14px rgba(51,55,27,.18);
  }

  .cm-tab.active:hover{
    border-color:var(--cm-olive-hover);
    background:var(--cm-olive-hover);
  }

  .cm-workspace{
    display:grid;
    grid-template-columns:minmax(340px,.82fr) minmax(0,1.18fr);
    gap:16px;
  }

  .cm-list,
  .cm-detail{
    min-height:620px;
    overflow:hidden;
    border:1px solid var(--cm-border);
    border-radius:17px;
    background:var(--cm-white);
    box-shadow:var(--cm-shadow);
  }

  .cm-list{
    display:flex;
    flex-direction:column;
  }

  .cm-list-head{
    display:grid;
    gap:10px;
    padding:14px 15px;
    border-bottom:1px solid var(--cm-border);
    background:#fbfbf7;
  }

  .cm-list-head input,
  .cm-list-head select{
    width:100%;
    min-height:40px;
    box-sizing:border-box;
    padding:9px 10px;
    border:1px solid var(--cm-border-strong);
    border-radius:9px;
    outline:none;
    background:var(--cm-white);
    color:var(--cm-text);
    font:inherit;
    transition:
      border-color .18s ease,
      box-shadow .18s ease,
      background-color .18s ease;
  }

  .cm-list-head input:hover,
  .cm-list-head select:hover{
    border-color:rgba(51,55,27,.4);
  }

  .cm-list-head input:focus,
  .cm-list-head select:focus,
  .cm-form select:focus,
  .cm-form textarea:focus{
    border-color:var(--cm-olive);
    box-shadow:0 0 0 3px rgba(51,55,27,.12);
  }

  .cm-filter-row{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:8px;
  }

  .cm-filter-row.three{
    grid-template-columns:repeat(3,minmax(0,1fr));
  }

  .cm-filter-label{
    display:grid;
    gap:5px;
    color:var(--cm-olive);
    font-size:.7rem;
    font-weight:850;
    text-transform:uppercase;
    letter-spacing:.04em;
  }

  .cm-queue-summary{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:8px;
    color:var(--cm-muted);
    font-size:.76rem;
  }

  .cm-queue-summary strong{
    color:var(--cm-olive);
  }

  .cm-list-body{
    max-height:720px;
    overflow:auto;
    flex:1;
  }

  .cm-list-body::-webkit-scrollbar,
  .cm-detail::-webkit-scrollbar{
    width:9px;
  }

  .cm-list-body::-webkit-scrollbar-thumb,
  .cm-detail::-webkit-scrollbar-thumb{
    border:2px solid transparent;
    border-radius:999px;
    background:rgba(51,55,27,.28);
    background-clip:padding-box;
  }

  .cm-row{
    position:relative;
    width:100%;
    padding:14px 15px;
    border:0;
    border-bottom:1px solid #eceee5;
    background:var(--cm-white);
    color:inherit;
    text-align:left;
    cursor:pointer;
    transition:background-color .16s ease;
  }

  .cm-row:hover{
    background:#f6f7f0;
  }

  .cm-row.active{
    background:var(--cm-olive-soft);
  }

  .cm-row.active::before{
    content:"";
    position:absolute;
    inset:0 auto 0 0;
    width:4px;
    background:var(--cm-olive);
  }

  .cm-row-top{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:9px;
  }

  .cm-row strong{
    color:var(--cm-olive-deep);
  }

  .cm-row p{
    margin:7px 0 4px;
  }

  .cm-row-meta{
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:6px;
    margin-top:7px;
  }

  .cm-queue-number{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:26px;
    height:22px;
    padding:0 6px;
    border-radius:999px;
    background:var(--cm-olive);
    color:#fff;
    font-size:.67rem;
    font-weight:900;
  }

  .cm-muted{
    color:var(--cm-muted);
    font-size:.78rem;
  }

  .cm-chip{
    display:inline-block;
    padding:4px 7px;
    border:1px solid rgba(51,55,27,.12);
    border-radius:999px;
    background:var(--cm-olive-soft);
    color:var(--cm-olive);
    font-size:.7rem;
    font-weight:850;
    text-transform:capitalize;
  }

  .cm-chip.open{
    border-color:rgba(51,55,27,.18);
    background:#edf0df;
    color:var(--cm-olive);
  }

  .cm-chip.in_progress{
    border-color:rgba(51,55,27,.18);
    background:#e8ead9;
    color:var(--cm-olive-deep);
  }

  .cm-chip.waiting_customer{
    border-color:rgba(76,82,38,.18);
    background:#f2f0de;
    color:#62652e;
  }

  .cm-chip.resolved{
    border-color:#d4d9c5;
    background:#f1f3eb;
    color:#555a3d;
  }

  .cm-chip.closed{
    border-color:#d8dbd0;
    background:#f5f5f1;
    color:#65695c;
  }

  .cm-priority{
    display:inline-block;
    padding:4px 7px;
    border:1px solid var(--cm-border);
    border-radius:999px;
    background:#f5f5f0;
    color:#626654;
    font-size:.67rem;
    font-weight:850;
    text-transform:capitalize;
  }

  .cm-priority.high,
  .cm-priority.urgent{
    border-color:#f2c9c5;
    background:var(--cm-danger-bg);
    color:var(--cm-danger);
  }

  .cm-empty-list{
    padding:28px 18px;
    color:var(--cm-muted);
    text-align:center;
  }

  .cm-detail{
    padding:20px;
    overflow:auto;
  }

  .cm-detail h2{
    margin:4px 0 10px;
    color:var(--cm-olive-deep);
  }

  .cm-detail-toolbar{
    display:flex;
    flex-wrap:wrap;
    justify-content:space-between;
    align-items:center;
    gap:10px;
    margin-bottom:8px;
  }

  .cm-detail-actions{
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:8px;
  }

  .cm-secondary-button,
  .cm-reopen-button{
    min-height:40px;
    padding:8px 13px;
    border-radius:9px;
    font:inherit;
    font-size:.82rem;
    font-weight:850;
    cursor:pointer;
    transition:
      background-color .18s ease,
      border-color .18s ease,
      color .18s ease,
      box-shadow .18s ease;
  }

  .cm-secondary-button{
    border:1px solid var(--cm-olive);
    background:var(--cm-white);
    color:var(--cm-olive);
  }

  .cm-secondary-button:hover{
    background:var(--cm-olive-soft);
  }

  .cm-reopen-button{
    border:1px solid var(--cm-olive);
    background:var(--cm-olive);
    color:#fff;
    box-shadow:0 5px 12px rgba(51,55,27,.16);
  }

  .cm-reopen-button:hover{
    border-color:var(--cm-olive-hover);
    background:var(--cm-olive-hover);
  }

  .cm-secondary-button:disabled,
  .cm-reopen-button:disabled,
  .cm-submit:disabled{
    cursor:not-allowed;
    opacity:.58;
    box-shadow:none;
  }

  .cm-detail-grid{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:10px;
    margin:14px 0;
  }

  .cm-info{
    padding:11px;
    border:1px solid #eceee5;
    border-radius:10px;
    background:#f9f9f5;
  }

  .cm-info span{
    display:block;
    color:var(--cm-muted);
    font-size:.72rem;
  }

  .cm-info strong{
    color:var(--cm-olive-deep);
  }

  .cm-message{
    padding:14px;
    border:1px solid var(--cm-border);
    border-radius:11px;
    background:#fff;
    white-space:pre-wrap;
    line-height:1.55;
  }

  .cm-form{
    display:grid;
    gap:11px;
    margin-top:18px;
    padding-top:17px;
    border-top:1px solid var(--cm-border);
  }

  .cm-form label{
    color:var(--cm-olive);
    font-size:.78rem;
    font-weight:850;
  }

  .cm-form select,
  .cm-form textarea{
    width:100%;
    box-sizing:border-box;
    padding:10px;
    border:1px solid var(--cm-border-strong);
    border-radius:9px;
    outline:none;
    background:var(--cm-white);
    color:var(--cm-text);
    font:inherit;
    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .cm-form textarea{
    min-height:90px;
    resize:vertical;
  }

  .cm-check{
    display:flex;
    align-items:center;
    gap:8px;
    color:var(--cm-olive);
  }

  .cm-check input{
    width:16px;
    height:16px;
    accent-color:var(--cm-olive);
  }

  .cm-submit{
    min-height:44px;
    border:1px solid var(--cm-olive);
    border-radius:10px;
    background:var(--cm-olive);
    color:#fff;
    font-weight:900;
    cursor:pointer;
    box-shadow:0 6px 14px rgba(51,55,27,.18);
    transition:
      background-color .18s ease,
      border-color .18s ease,
      transform .18s ease,
      box-shadow .18s ease;
  }

  .cm-submit:hover:not(:disabled){
    border-color:var(--cm-olive-hover);
    background:var(--cm-olive-hover);
    box-shadow:0 8px 18px rgba(51,55,27,.2);
  }

  .cm-submit:active:not(:disabled),
  .cm-reopen-button:active:not(:disabled),
  .cm-tab:active:not(:disabled){
    transform:translateY(1px);
  }

  .cm-submit:focus-visible,
  .cm-reopen-button:focus-visible,
  .cm-secondary-button:focus-visible,
  .cm-tab:focus-visible,
  .cm-row:focus-visible{
    outline:3px solid rgba(51,55,27,.22);
    outline-offset:2px;
  }

  .cm-updates{
    display:grid;
    gap:8px;
    margin-top:15px;
  }

  .cm-update{
    padding:10px;
    border:1px solid #e7e9df;
    border-radius:9px;
    background:#f7f8f2;
    font-size:.85rem;
  }

  .cm-update strong{
    color:var(--cm-olive);
  }

  .cm-alert{
    padding:11px 13px;
    margin-bottom:14px;
    border:1px solid #f0c8c3;
    border-radius:10px;
    background:var(--cm-danger-bg);
    color:var(--cm-danger);
  }

  .cm-success{
    padding:11px 13px;
    margin-bottom:14px;
    border:1px solid #d5dbc5;
    border-radius:10px;
    background:var(--cm-olive-soft);
    color:var(--cm-olive);
    font-weight:700;
  }

  @media(max-width:1100px){
    .cm-stats{
      grid-template-columns:repeat(3,1fr);
    }

    .cm-workspace{
      grid-template-columns:1fr;
    }

    .cm-list,
    .cm-detail{
      min-height:auto;
    }
  }

  @media(max-width:700px){
    .cm-support-audience-grid{
      grid-template-columns:1fr;
    }

    .cm-stats{
      grid-template-columns:repeat(2,1fr);
    }

    .cm-filter-row,
    .cm-filter-row.three{
      grid-template-columns:1fr;
    }
  }

  @media(max-width:520px){
    .cm-stats,
    .cm-detail-grid{
      grid-template-columns:1fr;
    }

    .cm-detail-toolbar{
      align-items:flex-start;
      flex-direction:column;
    }

    .cm-shell{
      padding:18px 12px 34px;
    }

    .cm-list-head,
    .cm-detail{
      padding-left:12px;
      padding-right:12px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .cm-tab,
    .cm-row,
    .cm-submit,
    .cm-reopen-button,
    .cm-secondary-button,
    .cm-list-head input,
    .cm-list-head select,
    .cm-form select,
    .cm-form textarea{
      transition:none;
    }
  }
`;


function normaliseStatus(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function statusLabel(value: string | undefined): string {
  const normalized = normaliseStatus(value);
  return normalized ? normalized.replaceAll("_", " ") : "unknown";
}

function timestamp(value: string | undefined): number {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ageLabel(value: string | undefined): string {
  const createdAt = timestamp(value);
  if (!createdAt) return "Unknown age";

  const elapsedMs = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 60) return `${Math.max(1, minutes)}m old`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h old`;

  const days = Math.floor(hours / 24);
  return `${days}d old`;
}

function supportAudienceOfTicket(ticket: Ticket): SupportAudience {
  const role = String(ticket.requester_role || "")
    .trim()
    .toLowerCase();
  const channel = String(ticket.support_channel || "")
    .trim()
    .toLowerCase();

  if (role === "seller" || channel === "seller_support") {
    return "seller";
  }

  if (role === "delivery" || channel === "delivery_support") {
    return "delivery";
  }

  return "customer";
}

function requesterRoleLabel(ticket: Ticket): string {
  const audience = supportAudienceOfTicket(ticket);

  if (audience === "seller") return "Seller";
  if (audience === "delivery") return "Delivery Person";
  return "Customer";
}

function requesterName(ticket: Ticket): string {
  return (
    ticket.requester_name ||
    ticket.customer_name ||
    requesterRoleLabel(ticket)
  );
}

function requesterEmail(ticket: Ticket): string {
  return ticket.requester_email || ticket.customer_email || "";
}

function requesterPhone(ticket: Ticket): string {
  return ticket.requester_phone || ticket.customer_phone || "";
}

function ticketIsActive(ticket: Ticket): boolean {
  return !COMPLETED_TICKET_STATUSES.has(normaliseStatus(ticket.status));
}

function contactIsActive(contact: Contact): boolean {
  return !COMPLETED_CONTACT_STATUSES.has(normaliseStatus(contact.status));
}

function sortByCreatedAt<T extends { created_at: string }>(
  rows: T[],
  direction: SortDirection,
): T[] {
  return [...rows].sort((left, right) => {
    const difference = timestamp(left.created_at) - timestamp(right.created_at);
    return direction === "oldest" ? difference : -difference;
  });
}

export default function ComplaintManagementPage() {
  const [data, setData] = useState<DashboardPayload>({ success: false });
  const [supportAudience, setSupportAudience] =
    useState<SupportAudience>("customer");
  const [tab, setTab] = useState<"tickets" | "contacts">("tickets");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Ticket queue defaults to unresolved work and oldest-first FIFO processing.
  const [ticketStatusFilter, setTicketStatusFilter] = useState("active");
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState("all");
  const [ticketSort, setTicketSort] = useState<SortDirection>("oldest");

  // Contact requests use the same oldest-first queue approach.
  const [contactStatusFilter, setContactStatusFilter] = useState("active");
  const [contactSort, setContactSort] = useState<SortDirection>("oldest");

  const [ticketStatus, setTicketStatus] = useState("in_progress");
  const [publicMessage, setPublicMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [customerContacted, setCustomerContacted] = useState(false);

  const [contactStatus, setContactStatus] = useState("in_progress");
  const [contactNote, setContactNote] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(
        "/react/api/complaint-management/dashboard",
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as DashboardPayload;

      if (!response.ok || payload.success !== true) {
        if (payload.login_url) {
          window.location.href = payload.login_url;
        }

        throw new Error(
          payload.message ||
            "Unable to load complaint-management workspace.",
        );
      }

      setData(payload);

      if (payload.agent) {
        const headerAgent = {
          id: payload.agent.id,
          full_name: payload.agent.full_name,
          employee_id: payload.agent.employee_id,
          location_name: payload.agent.location_name,
        };

        try {
          window.sessionStorage.setItem(
            "fruveto:complaint-agent-header:v1",
            JSON.stringify(headerAgent),
          );
        } catch {
          // Header still receives the live event if sessionStorage is unavailable.
        }

        window.dispatchEvent(
          new CustomEvent("complaint-agent-header-updated", {
            detail: headerAgent,
          }),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load workspace.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ticketStatuses = useMemo(() => {
    const statuses = new Set<string>(
      (data.ticket_statuses || DEFAULT_TICKET_STATUSES)
        .map(normaliseStatus)
        .filter(Boolean),
    );

    (data.tickets || []).forEach((ticket) => {
      const status = normaliseStatus(ticket.status);
      if (status) statuses.add(status);
    });

    return Array.from(statuses);
  }, [data.ticket_statuses, data.tickets]);

  const contactStatuses = useMemo(() => {
    const statuses = new Set<string>(
      (data.contact_statuses || DEFAULT_CONTACT_STATUSES)
        .map(normaliseStatus)
        .filter(Boolean),
    );

    (data.contacts || []).forEach((contact) => {
      const status = normaliseStatus(contact.status);
      if (status) statuses.add(status);
    });

    return Array.from(statuses);
  }, [data.contact_statuses, data.contacts]);

  const ticketPriorities = useMemo(() => {
    const priorities = new Set<string>();

    (data.tickets || []).forEach((ticket) => {
      const priority = String(ticket.priority || "").trim().toLowerCase();
      if (priority) priorities.add(priority);
    });

    const preferredOrder = ["urgent", "high", "medium", "normal", "low"];

    return Array.from(priorities).sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);

      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }

      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  }, [data.tickets]);

  const normalizedSearch = search.trim().toLowerCase();

  const ticketRows = useMemo(() => {
    const filtered = (data.tickets || []).filter((row) => {
      if (supportAudienceOfTicket(row) !== supportAudience) {
        return false;
      }

      const status = normaliseStatus(row.status);

      const matchesStatus =
        ticketStatusFilter === "all"
          ? true
          : ticketStatusFilter === "active"
            ? ticketIsActive(row)
            : status === ticketStatusFilter;

      if (!matchesStatus) return false;

      const priority = String(row.priority || "").trim().toLowerCase();
      if (
        ticketPriorityFilter !== "all" &&
        priority !== ticketPriorityFilter
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchable = [
        row.ticket_number,
        row.requester_name,
        row.requester_email,
        row.requester_phone,
        row.customer_name,
        row.customer_email,
        row.customer_phone,
        row.requester_role,
        row.support_channel,
        row.subject,
        row.order_number,
        row.order_id,
        row.item_name,
        row.issue_type,
        row.priority,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    return sortByCreatedAt(filtered, ticketSort);
  }, [
    data.tickets,
    normalizedSearch,
    supportAudience,
    ticketPriorityFilter,
    ticketSort,
    ticketStatusFilter,
  ]);

  const contactRows = useMemo(() => {
    const filtered = (data.contacts || []).filter((row) => {
      const status = normaliseStatus(row.status);

      const matchesStatus =
        contactStatusFilter === "all"
          ? true
          : contactStatusFilter === "active"
            ? contactIsActive(row)
            : status === contactStatusFilter;

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      const searchable = [
        row.contact_number,
        row.full_name,
        row.subject,
        row.email,
        row.phone,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    return sortByCreatedAt(filtered, contactSort);
  }, [
    contactSort,
    contactStatusFilter,
    data.contacts,
    normalizedSearch,
  ]);

  const selectedTicket = useMemo(
    () => (data.tickets || []).find((row) => row.id === selectedId),
    [data.tickets, selectedId],
  );

  const selectedContact = useMemo(
    () => (data.contacts || []).find((row) => row.id === selectedId),
    [data.contacts, selectedId],
  );

  const audienceTickets = useMemo(
    () =>
      (data.tickets || []).filter(
        (ticket) => supportAudienceOfTicket(ticket) === supportAudience,
      ),
    [data.tickets, supportAudience],
  );

  const supportAudienceCounts = useMemo(() => {
    const counts: Record<
      SupportAudience,
      { total: number; active: number }
    > = {
      customer: { total: 0, active: 0 },
      seller: { total: 0, active: 0 },
      delivery: { total: 0, active: 0 },
    };

    for (const ticket of data.tickets || []) {
      const audience = supportAudienceOfTicket(ticket);
      counts[audience].total += 1;
      if (ticketIsActive(ticket)) {
        counts[audience].active += 1;
      }
    }

    return counts;
  }, [data.tickets]);

  const activeTicketCount = useMemo(
    () => audienceTickets.filter(ticketIsActive).length,
    [audienceTickets],
  );

  const resolvedTicketCount = useMemo(
    () =>
      audienceTickets.filter(
        (ticket) => normaliseStatus(ticket.status) === "resolved",
      ).length,
    [audienceTickets],
  );

  const closedTicketCount = useMemo(
    () =>
      audienceTickets.filter(
        (ticket) => normaliseStatus(ticket.status) === "closed",
      ).length,
    [audienceTickets],
  );

  const waitingTicketCount = useMemo(
    () =>
      audienceTickets.filter(
        (ticket) =>
          normaliseStatus(ticket.status) === "waiting_customer",
      ).length,
    [audienceTickets],
  );

  const activeContactCount = useMemo(
    () => (data.contacts || []).filter(contactIsActive).length,
    [data.contacts],
  );

  const requesterLabel =
    supportAudience === "seller"
      ? "seller"
      : supportAudience === "delivery"
        ? "delivery person"
        : "customer";

  const audienceTitle =
    supportAudience === "seller"
      ? "Seller Support"
      : supportAudience === "delivery"
        ? "Delivery Support"
        : "Customer Support";

  // Keep selection inside the current filtered queue.
  // When a ticket is resolved/closed in "Active" view, this automatically
  // advances the agent to the next oldest unresolved complaint.
  useEffect(() => {
    if (tab === "tickets") {
      const selectedIsVisible = ticketRows.some(
        (ticket) => ticket.id === selectedId,
      );

      if (!selectedIsVisible) {
        setSelectedId(ticketRows[0]?.id || "");
      }

      return;
    }

    const selectedIsVisible = contactRows.some(
      (contact) => contact.id === selectedId,
    );

    if (!selectedIsVisible) {
      setSelectedId(contactRows[0]?.id || "");
    }
  }, [contactRows, selectedId, tab, ticketRows]);

  // Synchronize the edit form whenever another ticket is selected.
  // This prevents accidentally applying the previous ticket's status.
  useEffect(() => {
    if (!selectedTicket) return;

    setTicketStatus(
      normaliseStatus(selectedTicket.status) ||
        ticketStatuses[0] ||
        "open",
    );
    setPublicMessage("");
    setInternalNote("");
    setCustomerContacted(false);
  }, [selectedTicket?.id, selectedTicket?.status, ticketStatuses]);

  // Same protection for Contact Us cases.
  useEffect(() => {
    if (!selectedContact) return;

    setContactStatus(
      normaliseStatus(selectedContact.status) ||
        contactStatuses[0] ||
        "new",
    );
    setContactNote("");
  }, [contactStatuses, selectedContact?.id, selectedContact?.status]);

  const updateTicket = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedTicket || busy) return;

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/react/api/complaint-management/tickets/${encodeURIComponent(
          selectedTicket.id,
        )}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": data.csrf_token || "",
          },
          body: JSON.stringify({
            csrf_token: data.csrf_token,
            status: ticketStatus,
            public_message: publicMessage,
            internal_note: internalNote,
            customer_contacted: customerContacted,
            requester_contacted: customerContacted,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to update ticket.",
        );
      }

      setPublicMessage("");
      setInternalNote("");
      setCustomerContacted(false);
      setSuccessMessage("Ticket updated successfully.");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update ticket.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicket || busy) return;

    const currentStatus = normaliseStatus(selectedTicket.status);
    if (!REOPENABLE_TICKET_STATUSES.has(currentStatus)) return;

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/react/api/complaint-management/tickets/${encodeURIComponent(
          selectedTicket.id,
        )}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": data.csrf_token || "",
          },
          body: JSON.stringify({
            csrf_token: data.csrf_token,
            status: "open",
            public_message:
              "Your support ticket has been reopened for further review.",
            internal_note:
              `Ticket reopened from ${statusLabel(currentStatus)} by complaint-management staff.`,
            customer_contacted: false,
            requester_contacted: false,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to reopen ticket.",
        );
      }

      // Return to the active queue so the reopened complaint is immediately visible.
      setTicketStatusFilter("active");
      setTicketSort("oldest");
      setSuccessMessage(
        `${selectedTicket.ticket_number} reopened and returned to the active queue.`,
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reopen ticket.",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateContact = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedContact || busy) return;

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/react/api/complaint-management/contacts/${encodeURIComponent(
          selectedContact.id,
        )}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": data.csrf_token || "",
          },
          body: JSON.stringify({
            csrf_token: data.csrf_token,
            status: contactStatus,
            handler_note: contactNote,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to update contact request.",
        );
      }

      setContactNote("");
      setSuccessMessage("Contact request updated successfully.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update contact request.",
      );
    } finally {
      setBusy(false);
    }
  };

  const switchSupportAudience = (next: SupportAudience) => {
    setSupportAudience(next);
    setTab("tickets");
    setSearch("");
    setError("");
    setSuccessMessage("");
    setSelectedId("");
    setTicketStatusFilter("active");
    setTicketPriorityFilter("all");
    setTicketSort("oldest");
  };

  const switchTab = (nextTab: "tickets" | "contacts") => {
    setTab(nextTab);
    setSearch("");
    setError("");
    setSuccessMessage("");
    setSelectedId("");

    if (nextTab === "tickets") {
      setTicketStatusFilter("active");
      setTicketPriorityFilter("all");
      setTicketSort("oldest");
    } else {
      setContactStatusFilter("active");
      setContactSort("oldest");
    }
  };

  const selectedTicketQueueIndex =
    tab === "tickets"
      ? ticketRows.findIndex((ticket) => ticket.id === selectedId)
      : -1;

  const rows = tab === "tickets" ? ticketRows : contactRows;

  return (
    <>
      <style>{STYLES}</style>

      <main className="cm-page">
        <div className="cm-shell">
          {error ? (
            <div className="cm-alert" role="alert">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="cm-success" role="status">
              {successMessage}
            </div>
          ) : null}

          <section
            className="cm-support-audience-grid"
            aria-label="Support queues"
          >
            {(
              [
                {
                  key: "customer" as const,
                  title: "Customer Support",
                  text: "Customer order complaints and Contact Us requests",
                },
                {
                  key: "seller" as const,
                  title: "Seller Support",
                  text: "Seller booking, item, pickup, payment and settlement issues",
                },
                {
                  key: "delivery" as const,
                  title: "Delivery Support",
                  text: "Delivery batch, order, route, COD and payout issues",
                },
              ] as const
            ).map((option) => (
              <button
                type="button"
                className={`cm-support-audience-card ${
                  supportAudience === option.key ? "active" : ""
                }`}
                aria-pressed={supportAudience === option.key}
                key={option.key}
                onClick={() => switchSupportAudience(option.key)}
              >
                <span className="cm-support-audience-copy">
                  <strong>{option.title}</strong>
                  <span>{option.text}</span>
                </span>

                <span className="cm-support-audience-count">
                  <strong>
                    {supportAudienceCounts[option.key].active}
                  </strong>
                  <span>
                    active · {supportAudienceCounts[option.key].total} total
                  </span>
                </span>
              </button>
            ))}
          </section>

          <section className="cm-stats">
            <article className="cm-stat">
              <span>{audienceTitle} active queue</span>
              <strong>{activeTicketCount}</strong>
            </article>

            <article className="cm-stat">
              <span>Waiting for requester</span>
              <strong>{waitingTicketCount}</strong>
            </article>

            <article className="cm-stat">
              <span>Resolved tickets</span>
              <strong>{resolvedTicketCount}</strong>
            </article>

            <article className="cm-stat">
              <span>Closed tickets</span>
              <strong>{closedTicketCount}</strong>
            </article>

            <article className="cm-stat">
              <span>
                {supportAudience === "customer"
                  ? "Active Contact Us requests"
                  : "Total tickets in this queue"}
              </span>
              <strong>
                {supportAudience === "customer"
                  ? activeContactCount
                  : audienceTickets.length}
              </strong>
            </article>
          </section>

          <div className="cm-tabs">
            <button
              type="button"
              className={`cm-tab ${tab === "tickets" ? "active" : ""}`}
              onClick={() => switchTab("tickets")}
            >
              {audienceTitle} Tickets ({activeTicketCount} active)
            </button>

            {supportAudience === "customer" ? (
              <button
                type="button"
                className={`cm-tab ${tab === "contacts" ? "active" : ""}`}
                onClick={() => switchTab("contacts")}
              >
                Contact Us ({activeContactCount} active)
              </button>
            ) : null}
          </div>

          <section className="cm-workspace">
            <aside className="cm-list">
              <div className="cm-list-head">
                <input
                  placeholder={
                    tab === "tickets"
                      ? `Search ${requesterLabel}, order, ticket, item…`
                      : "Search contact, customer, email…"
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {tab === "tickets" ? (
                  <div className="cm-filter-row three">
                    <label className="cm-filter-label">
                      Status
                      <select
                        value={ticketStatusFilter}
                        onChange={(event) => {
                          setTicketStatusFilter(event.target.value);
                          setSelectedId("");
                        }}
                      >
                        <option value="active">Active / Unresolved</option>
                        <option value="all">All statuses</option>
                        {ticketStatuses.map((status) => (
                          <option value={status} key={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="cm-filter-label">
                      Priority
                      <select
                        value={ticketPriorityFilter}
                        onChange={(event) => {
                          setTicketPriorityFilter(event.target.value);
                          setSelectedId("");
                        }}
                      >
                        <option value="all">All priorities</option>
                        {ticketPriorities.map((priority) => (
                          <option value={priority} key={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="cm-filter-label">
                      Queue order
                      <select
                        value={ticketSort}
                        onChange={(event) =>
                          setTicketSort(
                            event.target.value as SortDirection,
                          )
                        }
                      >
                        <option value="oldest">
                          Oldest complaint first
                        </option>
                        <option value="newest">
                          Newest complaint first
                        </option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="cm-filter-row">
                    <label className="cm-filter-label">
                      Status
                      <select
                        value={contactStatusFilter}
                        onChange={(event) => {
                          setContactStatusFilter(event.target.value);
                          setSelectedId("");
                        }}
                      >
                        <option value="active">Active / Pending</option>
                        <option value="all">All statuses</option>
                        {contactStatuses.map((status) => (
                          <option value={status} key={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="cm-filter-label">
                      Queue order
                      <select
                        value={contactSort}
                        onChange={(event) =>
                          setContactSort(
                            event.target.value as SortDirection,
                          )
                        }
                      >
                        <option value="oldest">
                          Oldest request first
                        </option>
                        <option value="newest">
                          Newest request first
                        </option>
                      </select>
                    </label>
                  </div>
                )}

                <div className="cm-queue-summary">
                  <span>
                    Showing <strong>{rows.length}</strong>{" "}
                    {tab === "tickets" ? "ticket(s)" : "request(s)"}
                  </span>

                  <span>
                    {tab === "tickets" && ticketSort === "oldest"
                      ? "FIFO queue"
                      : tab === "contacts" && contactSort === "oldest"
                        ? "FIFO queue"
                        : "Custom order"}
                  </span>
                </div>
              </div>

              <div className="cm-list-body">
                {rows.length === 0 ? (
                  <div className="cm-empty-list">
                    No cases match the selected filters.
                  </div>
                ) : null}

                {rows.map((row, index) =>
                  tab === "tickets" ? (
                    <button
                      type="button"
                      className={`cm-row ${
                        selectedId === (row as Ticket).id
                          ? "active"
                          : ""
                      }`}
                      key={(row as Ticket).id}
                      onClick={() =>
                        setSelectedId((row as Ticket).id)
                      }
                    >
                      <div className="cm-row-top">
                        <div>
                          <span className="cm-queue-number">
                            #{index + 1}
                          </span>{" "}
                          <strong>
                            {(row as Ticket).ticket_number}
                          </strong>
                        </div>

                        <span
                          className={`cm-chip ${normaliseStatus(
                            (row as Ticket).status,
                          )}`}
                        >
                          {statusLabel((row as Ticket).status)}
                        </span>
                      </div>

                      <p>{requesterName(row as Ticket)}</p>

                      <div className="cm-row-meta">
                        <span className="cm-chip">
                          {requesterRoleLabel(row as Ticket)}
                        </span>
                        {(row as Ticket).context_type ? (
                          <span className="cm-muted">
                            {statusLabel((row as Ticket).context_type)}
                          </span>
                        ) : null}
                      </div>

                      <div className="cm-muted">
                        {(row as Ticket).subject}
                        {(row as Ticket).order_number
                          ? ` · ${(row as Ticket).order_number}`
                          : ""}
                      </div>

                      <div className="cm-row-meta">
                        <span
                          className={`cm-priority ${String(
                            (row as Ticket).priority || "",
                          ).toLowerCase()}`}
                        >
                          {(row as Ticket).priority || "normal"}
                        </span>

                        <span className="cm-muted">
                          {ageLabel((row as Ticket).created_at)}
                        </span>

                        <span className="cm-muted">
                          {new Date(
                            (row as Ticket).created_at,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`cm-row ${
                        selectedId === (row as Contact).id
                          ? "active"
                          : ""
                      }`}
                      key={(row as Contact).id}
                      onClick={() =>
                        setSelectedId((row as Contact).id)
                      }
                    >
                      <div className="cm-row-top">
                        <div>
                          <span className="cm-queue-number">
                            #{index + 1}
                          </span>{" "}
                          <strong>
                            {(row as Contact).contact_number}
                          </strong>
                        </div>

                        <span
                          className={`cm-chip ${normaliseStatus(
                            (row as Contact).status,
                          )}`}
                        >
                          {statusLabel((row as Contact).status)}
                        </span>
                      </div>

                      <p>{(row as Contact).full_name}</p>

                      <div className="cm-muted">
                        {(row as Contact).subject}
                      </div>

                      <div className="cm-row-meta">
                        <span className="cm-muted">
                          {ageLabel((row as Contact).created_at)}
                        </span>

                        <span className="cm-muted">
                          {new Date(
                            (row as Contact).created_at,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </aside>

            <section className="cm-detail">
              {tab === "tickets" && selectedTicket ? (
                <>
                  <div className="cm-detail-toolbar">
                    <div>
                      <span
                        className={`cm-chip ${normaliseStatus(
                          selectedTicket.status,
                        )}`}
                      >
                        {statusLabel(selectedTicket.status)}
                      </span>

                      {selectedTicket.priority ? (
                        <>
                          {" "}
                          <span
                            className={`cm-priority ${String(
                              selectedTicket.priority,
                            ).toLowerCase()}`}
                          >
                            {selectedTicket.priority}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div className="cm-detail-actions">
                      {selectedTicketQueueIndex >= 0 ? (
                        <span className="cm-muted">
                          Queue position{" "}
                          <strong>
                            #{selectedTicketQueueIndex + 1}
                          </strong>{" "}
                          of {ticketRows.length}
                        </span>
                      ) : null}

                      {REOPENABLE_TICKET_STATUSES.has(
                        normaliseStatus(selectedTicket.status),
                      ) ? (
                        <button
                          type="button"
                          className="cm-reopen-button"
                          disabled={busy}
                          onClick={() => void reopenTicket()}
                        >
                          {busy ? "Reopening…" : "Reopen Ticket"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <h2>
                    {selectedTicket.ticket_number} ·{" "}
                    {selectedTicket.subject}
                  </h2>

                  <div className="cm-detail-grid">
                    <div className="cm-info">
                      <span>{requesterRoleLabel(selectedTicket)}</span>
                      <strong>{requesterName(selectedTicket)}</strong>
                      <div>{requesterEmail(selectedTicket) || "No email"}</div>
                      <div>{requesterPhone(selectedTicket) || "No phone"}</div>
                    </div>

                    <div className="cm-info">
                      <span>Order / Work Context</span>
                      <strong>
                        {selectedTicket.order_number ||
                          selectedTicket.batch_number ||
                          selectedTicket.order_id ||
                          selectedTicket.context_id ||
                          "General support"}
                      </strong>
                      <div>
                        {selectedTicket.item_name || "Whole order / general issue"}
                      </div>
                      <div>
                        {statusLabel(selectedTicket.issue_type)}
                        {selectedTicket.context_type
                          ? ` · ${statusLabel(selectedTicket.context_type)}`
                          : ""}
                      </div>
                      {selectedTicket.order_customer_name ? (
                        <div>
                          Order customer: {selectedTicket.order_customer_name}
                        </div>
                      ) : null}
                    </div>

                    <div className="cm-info">
                      <span>Raised</span>
                      <strong>
                        {new Date(
                          selectedTicket.created_at,
                        ).toLocaleString()}
                      </strong>
                      <div>{ageLabel(selectedTicket.created_at)}</div>
                    </div>

                    <div className="cm-info">
                      <span>Assigned to</span>
                      <strong>
                        {selectedTicket.assigned_to?.name ||
                          "Not specifically assigned"}
                      </strong>
                      <div>
                        {selectedTicket.assigned_to?.employee_id
                          ? `Employee ID ${selectedTicket.assigned_to.employee_id}`
                          : "Available to complaint-management team"}
                      </div>
                    </div>
                  </div>

                  <div className="cm-message">
                    {selectedTicket.description}
                  </div>

                  {(selectedTicket.last_requester_contact ||
                    selectedTicket.last_customer_contact) ? (
                    <p className="cm-muted">
                      Last {requesterLabel} contact:{" "}
                      {(selectedTicket.last_requester_contact ||
                        selectedTicket.last_customer_contact)?.name} (
                      {(selectedTicket.last_requester_contact ||
                        selectedTicket.last_customer_contact)?.employee_id})
                      {(selectedTicket.last_requester_contact ||
                        selectedTicket.last_customer_contact)?.contacted_at
                        ? ` · ${new Date(
                            String(
                              (selectedTicket.last_requester_contact ||
                                selectedTicket.last_customer_contact)
                                ?.contacted_at,
                            ),
                          ).toLocaleString()}`
                        : ""}
                    </p>
                  ) : null}

                  {selectedTicket.updates?.length ? (
                    <div className="cm-updates">
                      {[...selectedTicket.updates]
                        .sort(
                          (left, right) =>
                            timestamp(right.created_at) -
                            timestamp(left.created_at),
                        )
                        .map((update) => (
                          <div
                            className="cm-update"
                            key={update.id}
                          >
                            <strong>
                              {update.agent?.name || "Agent"} (
                              {update.agent?.employee_id || "—"})
                            </strong>{" "}
                            · {statusLabel(update.status)} ·{" "}
                            {new Date(
                              update.created_at,
                            ).toLocaleString()}
                            <br />

                            {update.public_message ? (
                              <>
                                {requesterRoleLabel(selectedTicket)} update:{" "}
                                {update.public_message}
                                <br />
                              </>
                            ) : null}

                            {update.internal_note ? (
                              <>Internal: {update.internal_note}</>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : null}

                  <form
                    className="cm-form"
                    onSubmit={updateTicket}
                  >
                    <label htmlFor="cm-ticket-status">
                      Status
                    </label>

                    <select
                      id="cm-ticket-status"
                      value={ticketStatus}
                      onChange={(event) =>
                        setTicketStatus(event.target.value)
                      }
                    >
                      {ticketStatuses.map((status) => (
                        <option value={status} key={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="cm-public-message">
                      Update visible to {requesterLabel}
                    </label>

                    <textarea
                      id="cm-public-message"
                      value={publicMessage}
                      onChange={(event) =>
                        setPublicMessage(event.target.value)
                      }
                      placeholder={`What should the ${requesterLabel} see in My Support Tickets?`}
                    />

                    <label htmlFor="cm-internal-note">
                      Internal note
                    </label>

                    <textarea
                      id="cm-internal-note"
                      value={internalNote}
                      onChange={(event) =>
                        setInternalNote(event.target.value)
                      }
                      placeholder={`Internal investigation note (not shown to the ${requesterLabel})`}
                    />

                    <label className="cm-check">
                      <input
                        type="checkbox"
                        checked={customerContacted}
                        onChange={(event) =>
                          setCustomerContacted(
                            event.target.checked,
                          )
                        }
                      />
                      I contacted the {requesterLabel}
                    </label>

                    <button
                      className="cm-submit"
                      disabled={busy}
                      type="submit"
                    >
                      {busy
                        ? "Saving…"
                        : ticketStatus === "resolved"
                          ? "Resolve Ticket & Continue Queue"
                          : ticketStatus === "closed"
                            ? "Close Ticket & Continue Queue"
                            : "Save Ticket Update"}
                    </button>
                  </form>
                </>
              ) : tab === "contacts" && selectedContact ? (
                <>
                  <div className="cm-detail-toolbar">
                    <span
                      className={`cm-chip ${normaliseStatus(
                        selectedContact.status,
                      )}`}
                    >
                      {statusLabel(selectedContact.status)}
                    </span>
                  </div>

                  <h2>
                    {selectedContact.contact_number} ·{" "}
                    {selectedContact.subject}
                  </h2>

                  <div className="cm-detail-grid">
                    <div className="cm-info">
                      <span>Customer</span>
                      <strong>{selectedContact.full_name}</strong>
                      <div>{selectedContact.email}</div>
                      <div>{selectedContact.phone || "No phone"}</div>
                    </div>

                    <div className="cm-info">
                      <span>Received</span>
                      <strong>
                        {new Date(
                          selectedContact.created_at,
                        ).toLocaleString()}
                      </strong>
                      <div>{ageLabel(selectedContact.created_at)}</div>

                      {selectedContact.handled_by ? (
                        <div>
                          Handled by{" "}
                          {selectedContact.handled_by.name} (
                          {selectedContact.handled_by.employee_id})
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="cm-message">
                    {selectedContact.message}
                  </div>

                  <form
                    className="cm-form"
                    onSubmit={updateContact}
                  >
                    <label htmlFor="cm-contact-status">
                      Status
                    </label>

                    <select
                      id="cm-contact-status"
                      value={contactStatus}
                      onChange={(event) =>
                        setContactStatus(event.target.value)
                      }
                    >
                      {contactStatuses.map((status) => (
                        <option value={status} key={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="cm-contact-note">
                      Handling note
                    </label>

                    <textarea
                      id="cm-contact-note"
                      value={contactNote}
                      onChange={(event) =>
                        setContactNote(event.target.value)
                      }
                      placeholder="Call outcome, reply summary, or follow-up note"
                    />

                    <button
                      className="cm-submit"
                      disabled={busy}
                      type="submit"
                    >
                      {busy
                        ? "Saving…"
                        : contactStatus === "closed"
                          ? "Close Request & Continue Queue"
                          : "Update Contact Request"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="cm-empty-list">
                  No case is selected. Change the filters or choose a
                  case from the queue.
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
