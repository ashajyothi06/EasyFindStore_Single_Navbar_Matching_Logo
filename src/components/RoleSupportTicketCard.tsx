import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

export type SupportRequesterRole = "seller" | "delivery";

export type SupportTicketItem = {
  id?: string;
  item_id?: string;
  product_id?: string;
  catalog_item_id?: string;
  name?: string;
};

export type SupportOrderOption = {
  id: string;
  label: string;
  customerName?: string;
  items?: SupportTicketItem[];
};

type TicketResponse = {
  success: boolean;
  message?: string;
  csrf_token?: string;
  login_url?: string;
  ticket?: {
    id?: string;
    ticket_number?: string;
    status?: string;
  };
};

type RoleSupportTicketCardProps = {
  role: SupportRequesterRole;
  csrfToken: string;
  contextType: "seller_booking" | "seller_subscription" | "delivery_batch";
  contextId: string;
  bookingId?: string;
  batchId?: string;
  orderId?: string;
  orderNumber?: string;
  items?: SupportTicketItem[];
  orderOptions?: SupportOrderOption[];
  title?: string;
  description?: string;
};

const SUPPORT_STYLES = `
  :root{
    --role-support-olive:#33371b;
    --role-support-olive-hover:#454b24;
    --role-support-soft:#eef0e6;
    --role-support-page:#f7f7f2;
    --role-support-border:#dfe3d3;
    --role-support-muted:#707561;
    --role-support-danger:#9b281d;
  }

  .role-support-card{
    margin-top:18px;
    overflow:hidden;
    border:1px solid var(--role-support-border);
    border-radius:16px;
    background:#fff;
    box-shadow:0 8px 24px rgba(51,55,27,.07);
  }

  .role-support-card > summary{
    min-height:64px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    padding:15px 17px;
    background:linear-gradient(135deg,#f7f7f2,#fff);
    color:var(--role-support-olive);
    list-style:none;
    cursor:pointer;
    user-select:none;
  }

  .role-support-card > summary::-webkit-details-marker{
    display:none;
  }

  .role-support-summary-copy{
    min-width:0;
    display:grid;
    gap:3px;
  }

  .role-support-summary-copy strong{
    color:var(--role-support-olive);
    font-size:1rem;
    font-weight:900;
  }

  .role-support-summary-copy span{
    color:var(--role-support-muted);
    font-size:.8rem;
    line-height:1.4;
  }

  .role-support-summary-action{
    flex:0 0 auto;
    padding:8px 12px;
    border-radius:999px;
    background:var(--role-support-olive);
    color:#fff;
    font-size:.75rem;
    font-weight:850;
  }

  .role-support-card[open] .role-support-summary-action{
    background:var(--role-support-olive-hover);
  }

  .role-support-body{
    padding:17px;
    border-top:1px solid var(--role-support-border);
  }

  .role-support-context{
    display:flex;
    flex-wrap:wrap;
    gap:7px;
    margin-bottom:14px;
  }

  .role-support-context span{
    padding:6px 9px;
    border:1px solid var(--role-support-border);
    border-radius:999px;
    background:var(--role-support-soft);
    color:var(--role-support-olive);
    font-size:.72rem;
    font-weight:800;
  }

  .role-support-form{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:12px;
  }

  .role-support-field{
    display:grid;
    gap:6px;
  }

  .role-support-field.full{
    grid-column:1/-1;
  }

  .role-support-field > span{
    color:var(--role-support-olive);
    font-size:.76rem;
    font-weight:850;
  }

  .role-support-field input,
  .role-support-field select,
  .role-support-field textarea{
    width:100%;
    box-sizing:border-box;
    padding:10px 11px;
    border:1px solid #cbd1bc;
    border-radius:10px;
    outline:none;
    background:#fff;
    color:#272b1b;
    font:inherit;
    transition:border-color .16s ease, box-shadow .16s ease;
  }

  .role-support-field textarea{
    min-height:105px;
    resize:vertical;
  }

  .role-support-field input:focus,
  .role-support-field select:focus,
  .role-support-field textarea:focus{
    border-color:var(--role-support-olive);
    box-shadow:0 0 0 3px rgba(51,55,27,.12);
  }

  .role-support-actions{
    grid-column:1/-1;
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:9px;
  }

  .role-support-submit,
  .role-support-link{
    min-height:42px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:9px 14px;
    border-radius:10px;
    font:inherit;
    font-size:.84rem;
    font-weight:850;
    text-decoration:none;
  }

  .role-support-submit{
    border:1px solid var(--role-support-olive);
    background:var(--role-support-olive);
    color:#fff;
    cursor:pointer;
  }

  .role-support-submit:hover:not(:disabled){
    border-color:var(--role-support-olive-hover);
    background:var(--role-support-olive-hover);
  }

  .role-support-submit:disabled{
    cursor:not-allowed;
    opacity:.58;
  }

  .role-support-link{
    border:1px solid #cbd1bc;
    background:#fff;
    color:var(--role-support-olive);
  }

  .role-support-link:hover{
    background:var(--role-support-soft);
  }

  .role-support-message{
    grid-column:1/-1;
    padding:10px 12px;
    border-radius:10px;
    font-size:.82rem;
    line-height:1.45;
  }

  .role-support-message.success{
    border:1px solid #d5dbc5;
    background:var(--role-support-soft);
    color:var(--role-support-olive);
  }

  .role-support-message.error{
    border:1px solid #f0c8c3;
    background:#fff0ef;
    color:var(--role-support-danger);
  }

  @media(max-width:680px){
    .role-support-form{
      grid-template-columns:1fr;
    }

    .role-support-field.full,
    .role-support-actions,
    .role-support-message{
      grid-column:1;
    }

    .role-support-card > summary{
      align-items:flex-start;
      flex-direction:column;
    }
  }
`;

const SELLER_ISSUES = [
  ["order_issue", "Order issue"],
  ["item_fault", "Item / product issue"],
  ["inventory_issue", "Inventory issue"],
  ["preparation_issue", "Preparation issue"],
  ["pickup_issue", "Pickup / handover issue"],
  ["payment_issue", "Payment issue"],
  ["settlement_issue", "Settlement issue"],
  ["other", "Other"],
] as const;

const DELIVERY_ISSUES = [
  ["delivery_issue", "Delivery issue"],
  ["pickup_issue", "Seller pickup issue"],
  ["customer_unavailable", "Customer unavailable"],
  ["address_issue", "Address / location issue"],
  ["route_issue", "Route / navigation issue"],
  ["item_damage", "Item damaged in transit"],
  ["missing_item", "Missing item"],
  ["payment_issue", "Payment issue"],
  ["cod_issue", "COD collection issue"],
  ["payout_issue", "Payout issue"],
  ["other", "Other"],
] as const;

function itemId(item: SupportTicketItem): string {
  return String(
    item.item_id ||
      item.id ||
      item.product_id ||
      item.catalog_item_id ||
      "",
  ).trim();
}

function uniqueItems(items: SupportTicketItem[]): SupportTicketItem[] {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = itemId(item) || `${String(item.name || "")}:${index}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function RoleSupportTicketCard({
  role,
  csrfToken,
  contextType,
  contextId,
  bookingId = "",
  batchId = "",
  orderId = "",
  orderNumber = "",
  items = [],
  orderOptions = [],
  title,
  description,
}: RoleSupportTicketCardProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [issueType, setIssueType] = useState(
    role === "seller" ? "order_issue" : "delivery_issue",
  );
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [createdTicketNumber, setCreatedTicketNumber] = useState("");

  useEffect(() => {
    if (window.location.hash === "#support") {
      detailsRef.current?.setAttribute("open", "");
      window.setTimeout(() => {
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80);
    }
  }, []);

  const selectedOrder = useMemo(
    () =>
      orderOptions.find(
        (option) => String(option.id) === String(selectedOrderId),
      ),
    [orderOptions, selectedOrderId],
  );

  const availableItems = useMemo(
    () =>
      uniqueItems(
        selectedOrder
          ? selectedOrder.items || []
          : items,
      ),
    [items, selectedOrder],
  );

  useEffect(() => {
    if (
      selectedItemId &&
      !availableItems.some((item) => itemId(item) === selectedItemId)
    ) {
      setSelectedItemId("");
    }
  }, [availableItems, selectedItemId]);

  const issueOptions =
    role === "seller" ? SELLER_ISSUES : DELIVERY_ISSUES;

  const roleLabel = role === "seller" ? "Seller" : "Delivery";

  async function submitTicket(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!csrfToken) {
      setMessageType("error");
      setMessage(
        "The page security token is unavailable. Refresh the page and try again.",
      );
      return;
    }

    setSubmitting(true);
    setMessage("");
    setCreatedTicketNumber("");

    try {
      const response = await fetch("/react/api/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          csrf_token: csrfToken,
          context_type: contextType,
          context_id: contextId,
          booking_id: bookingId,
          batch_id: batchId,
          order_id: selectedOrderId || orderId,
          item_id: selectedItemId,
          issue_type: issueType,
          priority,
          subject,
          description: problemDescription,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as TicketResponse;

      if (response.status === 401 && payload.login_url) {
        window.location.assign(payload.login_url);
        return;
      }

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to raise this support ticket.",
        );
      }

      setMessageType("success");
      setMessage(
        payload.message || "Support ticket raised successfully.",
      );
      setCreatedTicketNumber(
        String(payload.ticket?.ticket_number || ""),
      );
      setSelectedItemId("");
      setIssueType(
        role === "seller" ? "order_issue" : "delivery_issue",
      );
      setPriority("normal");
      setSubject("");
      setProblemDescription("");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to raise this support ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{SUPPORT_STYLES}</style>

      <details className="role-support-card" id="support" ref={detailsRef}>
        <summary>
          <div className="role-support-summary-copy">
            <strong>{title || `${roleLabel} Support`}</strong>
            <span>
              {description ||
                `Raise a support ticket for a problem related to this ${
                  role === "seller" ? "booking/order" : "delivery batch/order"
                }.`}
            </span>
          </div>

          <span className="role-support-summary-action">
            Raise Issue
          </span>
        </summary>

        <div className="role-support-body">
          <div className="role-support-context">
            {orderNumber ? <span>Order {orderNumber}</span> : null}
            {bookingId ? <span>Booking linked</span> : null}
            {batchId ? <span>Delivery batch linked</span> : null}
            <span>{roleLabel} support</span>
          </div>

          <form className="role-support-form" onSubmit={submitTicket}>
            {orderOptions.length > 0 ? (
              <label className="role-support-field full">
                <span>Related customer order</span>
                <select
                  value={selectedOrderId}
                  onChange={(event) => {
                    setSelectedOrderId(event.target.value);
                    setSelectedItemId("");
                  }}
                >
                  <option value="">
                    General batch / not limited to one order
                  </option>
                  {orderOptions.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.label}
                      {option.customerName
                        ? ` — ${option.customerName}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="role-support-field">
              <span>Issue type</span>
              <select
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                required
              >
                {issueOptions.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="role-support-field">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            {availableItems.length > 0 ? (
              <label className="role-support-field full">
                <span>Related item (optional)</span>
                <select
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                >
                  <option value="">Whole order / general issue</option>
                  {availableItems.map((item, index) => {
                    const id = itemId(item);
                    if (!id) return null;
                    return (
                      <option value={id} key={`${id}-${index}`}>
                        {item.name || id}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}

            <label className="role-support-field full">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Briefly describe the issue"
                minLength={3}
                maxLength={180}
                required
              />
            </label>

            <label className="role-support-field full">
              <span>Describe the problem</span>
              <textarea
                value={problemDescription}
                onChange={(event) =>
                  setProblemDescription(event.target.value)
                }
                placeholder="Explain what happened and what help you need…"
                minLength={10}
                maxLength={5000}
                required
              />
            </label>

            {message ? (
              <div
                className={`role-support-message ${messageType}`}
                role={messageType === "error" ? "alert" : "status"}
              >
                {message}
                {createdTicketNumber
                  ? ` Ticket: ${createdTicketNumber}.`
                  : ""}
              </div>
            ) : null}

            <div className="role-support-actions">
              <button
                className="role-support-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Raising Ticket…" : "Raise Support Ticket"}
              </button>

              <Link className="role-support-link" to="/support/tickets">
                My Support Tickets
              </Link>
            </div>
          </form>
        </div>
      </details>
    </>
  );
}
