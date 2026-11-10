import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const ISSUE_OPTIONS = [
  ["item_fault", "Item fault / defect"],
  ["delivery_issue", "Delivery issue"],
  ["damaged_item", "Damaged item"],
  ["missing_item", "Missing item"],
  ["wrong_item", "Wrong item"],
  ["quality_issue", "Quality issue"],
  ["payment_issue", "Payment issue"],
  ["other", "Other issue"],
] as const;

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .raise-ticket-page,
  .raise-ticket-page *,
  .raise-ticket-page *::before,
  .raise-ticket-page *::after {
    box-sizing: border-box;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }

  .raise-ticket-page {
    min-height: 70vh;
    width: 100%;
    padding: 28px clamp(10px, 2vw, 36px) 56px;
    background: #f7f7f2;
    color: #242815;
    font-family: "Nunito", Arial, Helvetica, sans-serif;
  }

  .rt-card {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: clamp(22px, 2.4vw, 34px);
    background: #fff;
    border: 1px solid #d9ddcc;
    border-radius: 22px;
    box-shadow: 0 16px 42px rgba(51, 55, 27, 0.08);
  }

  .rt-head {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .rt-head > div {
    min-width: 0;
    flex: 1;
  }

  .rt-head span {
    display: inline-block;
    color: #33371b;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .rt-head h1 {
    margin: 5px 0 8px;
    color: #242815;
    line-height: 1.08;
  }

  .rt-head p {
    margin: 0;
    color: #626856;
    line-height: 1.5;
  }

  .rt-head > div:first-child {
    max-width: 760px;
  }

  .rt-form {
    width: 100%;
  }

  .rt-context {
    margin-bottom: 18px;
    padding: 13px 15px;
    border: 1px solid #d9ddcc;
    border-radius: 12px;
    background: #eef0e6;
    overflow-wrap: anywhere;
  }

  .rt-form {
    display: grid;
    gap: 14px;
  }

  .rt-field {
    display: grid;
    gap: 7px;
  }

  .rt-field label {
    color: #33371b;
    font-weight: 850;
  }

  .rt-field input,
  .rt-field select,
  .rt-field textarea {
    width: 100%;
    min-width: 0;
    padding: 12px;
    border: 1px solid #d9ddcc;
    border-radius: 11px;
    background: #fff;
    color: #242815;
    font: inherit;
    outline: none;
  }

  .rt-field input:focus,
  .rt-field select:focus,
  .rt-field textarea:focus {
    border-color: #33371b;
    box-shadow: 0 0 0 3px rgba(51, 55, 27, 0.12);
  }

  .rt-field textarea {
    min-height: 170px;
    resize: vertical;
  }

  .rt-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rt-btn {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 15px;
    border: 1px solid #33371b;
    border-radius: 11px;
    background: #33371b;
    color: #fff;
    font: inherit;
    font-weight: 850;
    text-decoration: none;
    cursor: pointer;
  }

  .rt-btn.secondary {
    background: #fff;
    color: #33371b;
  }

  .rt-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .rt-alert {
    padding: 11px 13px;
    border-radius: 10px;
    background: #fff0ef;
    color: #9b281d;
  }

  .rt-success {
    padding: 18px;
    border-radius: 14px;
    background: #eef0e6;
    color: #33371b;
  }


  @media (min-width: 1100px) {
    .rt-card {
      padding-left: clamp(28px, 2.2vw, 42px);
      padding-right: clamp(28px, 2.2vw, 42px);
    }

    .rt-context,
    .rt-form,
    .rt-success {
      width: 100%;
    }
  }

  /* Match the responsive horizontal gutter used by the site header */
  @media (min-width: 1700px) {
    .raise-ticket-page {
      padding-left: clamp(32px, 2.5vw, 96px);
      padding-right: clamp(32px, 2.5vw, 96px);
    }
  }

  @media (max-width: 1439px) {
    .raise-ticket-page {
      padding-left: clamp(12px, 1.8vw, 24px);
      padding-right: clamp(12px, 1.8vw, 24px);
    }
  }

  @media (max-width: 900px) {
    .raise-ticket-page {
      padding-top: 22px;
      padding-left: clamp(10px, 2vw, 18px);
      padding-right: clamp(10px, 2vw, 18px);
      padding-bottom: 48px;
    }

    .rt-card {
      padding: 22px;
      border-radius: 19px;
    }
  }

  @media (max-width: 640px) {
    .raise-ticket-page {
      padding:
        14px
        clamp(8px, 3vw, 12px)
        calc(94px + env(safe-area-inset-bottom));
    }

    .rt-card {
      padding: 17px;
      border-radius: 17px;
    }

    .rt-head {
      flex-direction: column;
      gap: 14px;
      margin-bottom: 16px;
    }

    .rt-head .rt-btn {
      width: 100%;
    }

    .rt-context {
      margin-bottom: 16px;
      padding: 12px 13px;
    }

    .rt-field input,
    .rt-field select,
    .rt-field textarea {
      min-height: 48px;
      padding: 11px 12px;
      font-size: 16px;
    }

    .rt-field textarea {
      min-height: 145px;
    }

    .rt-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .rt-actions > * {
      width: 100%;
    }

    .rt-btn {
      min-height: 48px;
    }
  }

  @media (max-width: 480px) {
    .raise-ticket-page {
      padding:
        10px
        clamp(7px, 2.6vw, 10px)
        calc(92px + env(safe-area-inset-bottom));
    }

    .rt-card {
      padding: 14px;
      border-radius: 15px;
    }

    .rt-head {
      gap: 12px;
      margin-bottom: 14px;
    }

    .rt-head h1 {
      font-size: 1.75rem;
    }

    .rt-head p {
      font-size: 0.88rem;
    }

    .rt-context {
      padding: 11px 12px;
    }

    .rt-field textarea {
      min-height: 132px;
    }
  }

  @media (max-width: 340px) {
    .raise-ticket-page {
      padding-left: 7px;
      padding-right: 7px;
    }

    .rt-card {
      padding: 12px;
    }
  }
`;

export default function RaiseTicketPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("orderId") || "";
  const orderNumber = params.get("orderNumber") || orderId;
  const itemId = params.get("itemId") || "";
  const itemName = params.get("itemName") || "";
  const presetType =
    params.get("issueType") || (itemId ? "item_fault" : "delivery_issue");

  const [csrfToken, setCsrfToken] = useState("");
  const [issueType, setIssueType] = useState(presetType);
  const [subject, setSubject] = useState(
    itemName
      ? `Issue with ${itemName}`
      : `Issue with order ${orderNumber}`,
  );
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdTicket, setCreatedTicket] = useState("");

  useEffect(() => {
    if (!orderId) {
      navigate("/orders", { replace: true });
    }
  }, [navigate, orderId]);

  useEffect(() => {
    void fetch("/react/api/support/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((p) => {
        if (!p.authenticated) {
          navigate("/react/login", { replace: true });
        } else {
          setCsrfToken(p.csrf_token || "");
        }
      })
      .catch(() =>
        setError("Unable to initialise support. Refresh and try again."),
      );
  }, [navigate]);

  const contextLabel = useMemo(
    () =>
      itemName
        ? `Order ${orderNumber} · ${itemName}`
        : `Order ${orderNumber}`,
    [itemName, orderNumber],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

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
          order_id: orderId,
          item_id: itemId,
          issue_type: issueType,
          subject,
          description,
          priority,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to raise the ticket.",
        );
      }

      setCreatedTicket(
        payload.ticket?.ticket_number || "Ticket created",
      );
      setCsrfToken(payload.csrf_token || csrfToken);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to raise the ticket.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!orderId) return null;

  return (
    <>
      <style>{STYLES}</style>

      <main className="raise-ticket-page">
        <section className="rt-card">
          <div className="rt-head">
            <div>
              <span>Order-linked support</span>
              <h1>Raise an Issue</h1>
              <p>
                Complaints are linked to your purchased order so the support
                team can investigate the correct item and delivery.
              </p>
            </div>

            <Link className="rt-btn secondary" to="/orders">
              Back to Orders
            </Link>
          </div>

          <div className="rt-context">
            <strong>{contextLabel}</strong>
            <br />
            <small>Order ID: {orderId}</small>
          </div>

          {createdTicket ? (
            <div className="rt-success">
              <h2>{createdTicket}</h2>
              <p>
                Your complaint has been submitted. You can track it and see
                support updates from the employee who contacts you.
              </p>

              <div className="rt-actions">
                <Link className="rt-btn" to="/support/tickets">
                  View My Tickets
                </Link>

                <Link className="rt-btn secondary" to="/orders">
                  Back to Orders
                </Link>
              </div>
            </div>
          ) : (
            <form className="rt-form" onSubmit={submit}>
              <div className="rt-field">
                <label>Issue type</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                >
                  {ISSUE_OPTIONS.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rt-field">
                <label>Subject</label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="rt-field">
                <label>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="rt-field">
                <label>Describe the problem</label>
                <textarea
                  required
                  minLength={10}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what happened, the item condition, delivery problem, missing quantity, or any other useful details."
                />
              </div>

              {error ? (
                <div className="rt-alert" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="rt-actions">
                <button
                  className="rt-btn"
                  disabled={busy || !csrfToken}
                  type="submit"
                >
                  {busy ? "Submitting…" : "Raise Complaint"}
                </button>

                <Link
                  className="rt-btn secondary"
                  to="/support/tickets"
                >
                  My Tickets
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
