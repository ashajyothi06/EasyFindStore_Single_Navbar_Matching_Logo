import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";



type RequesterRole = "user" | "seller" | "delivery" | string;



type Agent = {

  name?: string;

  employee_id?: string;

};



type TicketUpdate = {

  id: string;

  status: string;

  message: string;

  created_at: string;

  customer_contacted?: boolean;

  requester_contacted?: boolean;

  agent?: Agent | null;

};



type Ticket = {

  id: string;

  ticket_number: string;

  requester_role?: RequesterRole;

  support_channel?: string;

  context_type?: string;

  context_id?: string;

  booking_id?: string;

  batch_id?: string;

  batch_number?: string;

  order_id: string;

  order_number?: string;

  order_customer_name?: string;

  item_name?: string;

  issue_type: string;

  subject: string;

  description: string;

  priority: string;

  status: string;

  created_at: string;

  updated_at: string;

  updates?: TicketUpdate[];

  last_customer_contact?: (Agent & { contacted_at?: string }) | null;

  last_requester_contact?: (Agent & { contacted_at?: string }) | null;

};



type Payload = {

  success: boolean;

  authenticated?: boolean;

  requester_role?: RequesterRole;

  support_channel?: string;

  tickets?: Ticket[];

  csrf_token?: string;

  login_url?: string;

  message?: string;

};



const STYLES = `

  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

  :root{

    --st-olive:#33371b;

    --st-olive-hover:#454b24;

    --st-olive-deep:#292d16;

    --st-olive-soft:#eef0e6;

    --st-olive-soft-2:#f7f7f2;

    --st-olive-border:#d9ddcc;

    --st-text:#242815;

    --st-muted:#626856;

    --st-white:#ffffff;
    --support-page-gutter:clamp(10px,2vw,36px);

  }



  .support-tickets-page{

    min-height:70vh;

    width:100%;

    padding:24px var(--support-page-gutter) 48px;

    background:var(--st-olive-soft-2);

    color:var(--st-text);

    font-family:"Nunito",Arial,Helvetica,sans-serif;

  }



  .support-tickets-page *,

  .support-tickets-page *::before,

  .support-tickets-page *::after{

    font-family:"Nunito",Arial,Helvetica,sans-serif !important;

  }



  .st-shell{

    width:100%;

    max-width:none;

    margin:0;

  }



  .st-head{

    display:flex;

    justify-content:space-between;

    align-items:flex-end;

    gap:18px;

    margin-bottom:22px;

  }



  .st-head h1{

    margin:5px 0;

    color:var(--st-olive-deep);

    font-size:clamp(2rem,4vw,3.4rem);

  }



  .st-head p{

    margin-bottom:0;

    color:var(--st-muted);

  }



  .st-actions{

    display:flex;

    gap:9px;

    flex-wrap:wrap;

  }



  .st-btn{

    display:inline-flex;

    align-items:center;

    justify-content:center;

    min-height:43px;

    padding:9px 14px;

    border:1px solid var(--st-olive);

    border-radius:11px;

    background:var(--st-olive);

    color:#fff;

    text-decoration:none;

    font-weight:850;

    transition:

      background-color .18s ease,

      border-color .18s ease,

      color .18s ease,

      box-shadow .18s ease;

  }



  .st-btn:hover{

    border-color:var(--st-olive-hover);

    background:var(--st-olive-hover);

  }



  .st-btn:focus-visible{

    outline:3px solid rgba(51,55,27,.22);

    outline-offset:2px;

  }



  .st-btn.secondary{

    border-color:var(--st-olive);

    background:var(--st-white);

    color:var(--st-olive);

  }



  .st-btn.secondary:hover{

    background:var(--st-olive-soft);

    color:var(--st-olive-deep);

  }



  .st-role-banner{

    display:flex;

    flex-wrap:wrap;

    align-items:center;

    gap:8px;

    margin:0 0 18px;

    padding:10px 12px;

    border:1px solid var(--st-olive-border);

    border-radius:12px;

    background:var(--st-olive-soft);

    color:var(--st-olive);

    font-size:.84rem;

    font-weight:750;

  }



  .st-grid{

    display:grid;

    gap:14px;

  }



  .st-ticket{

    padding:20px;

    border:1px solid var(--st-olive-border);

    border-radius:17px;

    background:var(--st-white);

    box-shadow:0 10px 30px rgba(51,55,27,.06);

  }



  .st-ticket-top{

    display:flex;

    justify-content:space-between;

    align-items:flex-start;

    gap:14px;

  }



  .st-ticket h2{

    margin:6px 0 4px;

    color:var(--st-olive-deep);

    font-size:1.2rem;

  }



  .st-number{

    color:var(--st-olive);

    font-weight:900;

  }



  .st-chip{

    display:inline-block;

    padding:5px 9px;

    border:1px solid rgba(51,55,27,.12);

    border-radius:999px;

    background:var(--st-olive-soft);

    color:var(--st-olive);

    font-size:.76rem;

    font-weight:850;

    text-transform:capitalize;

  }



  .st-meta{

    display:flex;

    flex-wrap:wrap;

    gap:10px;

    margin:11px 0;

    color:var(--st-muted);

    font-size:.85rem;

  }



  .st-meta span{

    padding:4px 7px;

    border:1px solid rgba(51,55,27,.06);

    border-radius:999px;

    background:var(--st-olive-soft-2);

  }



  .st-desc{

    line-height:1.6;

  }



  .st-updates{

    display:grid;

    gap:9px;

    margin-top:15px;

    padding-top:13px;

    border-top:1px solid #e7eadf;

  }



  .st-update{

    padding:10px 12px;

    border:1px solid rgba(51,55,27,.07);

    border-radius:10px;

    background:#f7f8f3;

  }



  .st-update strong{

    color:var(--st-olive);

  }



  .st-empty{

    padding:48px 20px;

    border:1px dashed #cfd6c4;

    border-radius:18px;

    background:var(--st-white);

    text-align:center;

  }



  .st-empty h2{

    color:var(--st-olive-deep);

  }



  .st-alert{

    padding:12px 14px;

    margin-bottom:16px;

    border:1px solid #f0c8c3;

    border-radius:10px;

    background:#fff0ef;

    color:#9b281d;

  }



  /* ================================================================

     MOBILE / WEBVIEW

     Matches the authenticated mobile header breakpoint and keeps the

     page compact, readable and touch friendly without changing desktop.

     ================================================================ */

  @media(max-width:820px){

    .support-tickets-page{

      min-height:calc(100dvh - 72px);

      padding:

        16px

        16px

        calc(94px + env(safe-area-inset-bottom));

      overflow-x:hidden;

    }



    .st-shell{

      width:100%;

      min-width:0;

    }



    .st-head{

      display:flex;

      align-items:stretch;

      flex-direction:column;

      gap:14px;

      margin-bottom:14px;

    }



    .st-head > div:first-child{

      min-width:0;

    }



    .st-head .st-number{

      display:inline-flex;

      align-items:center;

      width:max-content;

      min-height:27px;

      padding:5px 10px;

      border:1px solid var(--st-olive-border);

      border-radius:999px;

      background:var(--st-olive-soft);

      font-size:.74rem;

      line-height:1;

    }



    .st-head h1{

      margin:8px 0 5px;

      font-size:clamp(1.85rem,7.2vw,2.3rem);

      line-height:1.02;

      letter-spacing:-.025em;

    }



    .st-head p{

      max-width:38rem;

      margin:0;

      font-size:.91rem;

      line-height:1.48;

    }



    .st-actions{

      width:100%;

      display:grid;

      grid-template-columns:repeat(2,minmax(0,1fr));

      gap:8px;

    }



    .st-actions .st-btn{

      width:100%;

      min-width:0;

      min-height:46px;

      padding:10px 11px;

      border-radius:12px;

      font-size:.84rem;

      line-height:1.15;

      text-align:center;

    }



    .st-role-banner{

      gap:6px;

      margin:0 0 12px;

      padding:9px 10px;

      border-radius:11px;

      font-size:.75rem;

      line-height:1.25;

    }



    .st-grid{

      gap:11px;

    }



    .st-ticket{

      min-width:0;

      padding:15px;

      border-radius:15px;

      box-shadow:0 7px 22px rgba(51,55,27,.055);

    }



    .st-ticket-top{

      min-width:0;

      display:grid;

      grid-template-columns:minmax(0,1fr) auto;

      align-items:start;

      gap:9px;

    }



    .st-ticket-top > div{

      min-width:0;

    }



    .st-ticket .st-number{

      display:block;

      overflow:hidden;

      font-size:.77rem;

      line-height:1.2;

      text-overflow:ellipsis;

      white-space:nowrap;

    }



    .st-ticket h2{

      margin:5px 0 2px;

      font-size:1.04rem;

      line-height:1.23;

      overflow-wrap:anywhere;

    }



    .st-chip{

      max-width:42vw;

      padding:5px 8px;

      font-size:.66rem;

      line-height:1.15;

      text-align:center;

      white-space:normal;

    }



    .st-meta{

      gap:6px;

      margin:10px 0;

      font-size:.72rem;

      line-height:1.25;

    }



    .st-meta span{

      min-width:0;

      max-width:100%;

      padding:5px 7px;

      overflow-wrap:anywhere;

    }



    .st-ticket p{

      margin:9px 0;

      font-size:.87rem;

      line-height:1.48;

      overflow-wrap:anywhere;

    }



    .st-desc{

      margin-top:8px !important;

      line-height:1.55 !important;

    }



    .st-updates{

      gap:7px;

      margin-top:12px;

      padding-top:11px;

    }



    .st-updates > strong{

      font-size:.87rem;

    }



    .st-update{

      padding:9px 10px;

      border-radius:9px;

      font-size:.81rem;

      line-height:1.42;

      overflow-wrap:anywhere;

    }



    .st-alert{

      margin-bottom:12px;

      padding:10px 12px;

      border-radius:10px;

      font-size:.85rem;

      line-height:1.4;

    }



    .st-empty{

      padding:32px 16px;

      border-radius:15px;

    }



    .st-empty h2{

      margin:0 0 8px;

      font-size:1.34rem;

    }



    .st-empty p{

      max-width:30rem;

      margin:0 auto 16px;

      font-size:.87rem;

      line-height:1.48;

    }



    .st-empty .st-btn{

      width:100%;

      min-height:46px;

    }

  }



  @media(max-width:520px){

    .st-actions{

      grid-template-columns:1fr;

      gap:7px;

    }



    .st-actions .st-btn{

      min-height:44px;

    }

  }



  @media(max-width:480px){

    .support-tickets-page{

      padding:

        12px

        12px

        calc(90px + env(safe-area-inset-bottom));

    }



    .st-head{

      gap:11px;

      margin-bottom:12px;

    }



    .st-head h1{

      font-size:clamp(1.72rem,8.8vw,2rem);

    }



    .st-head p{

      font-size:.85rem;

    }



    .st-role-banner{

      gap:5px;

      padding:8px 9px;

      font-size:.69rem;

    }



    .st-ticket{

      padding:13px;

      border-radius:14px;

    }



    .st-ticket-top{

      gap:8px;

    }



    .st-ticket h2{

      font-size:.98rem;

    }



    .st-chip{

      max-width:38vw;

      padding:4px 7px;

      font-size:.62rem;

    }



    .st-meta{

      gap:5px;

      margin:9px 0;

      font-size:.68rem;

    }



    .st-ticket p{

      font-size:.83rem;

    }



    .st-update{

      padding:8px 9px;

      font-size:.77rem;

    }



    .st-empty{

      padding:27px 13px;

    }

  }



  @media(max-width:350px){
    .support-tickets-page{
      --support-page-gutter:10px;
    }



    .st-ticket-top{

      grid-template-columns:1fr;

    }



    .st-chip{

      width:max-content;

      max-width:100%;

    }

  }

  /* ================================================================
     SUPPORT TICKETS — SAME HORIZONTAL GUTTER AS PUBLIC ORDER PAGE
     ================================================================ */
  @media(min-width:1700px){
    .support-tickets-page{
      --support-page-gutter:clamp(32px,2.5vw,96px);
    }
  }

  @media(max-width:1439px){
    .support-tickets-page{
      --support-page-gutter:clamp(12px,1.8vw,24px);
    }
  }

  @media(max-width:900px){
    .support-tickets-page{
      --support-page-gutter:clamp(10px,2vw,18px);
    }
  }

  @media(max-width:700px){
    .support-tickets-page{
      --support-page-gutter:10px;
    }
  }

  .support-tickets-page,
  .st-shell,
  .st-head,
  .st-role-banner,
  .st-grid,
  .st-ticket,
  .st-alert,
  .st-empty{
    min-width:0;
    max-width:100%;
    box-sizing:border-box;
  }

  .st-shell,
  .st-head,
  .st-role-banner,
  .st-grid,
  .st-alert,
  .st-empty{
    width:100%;
    margin-left:0;
    margin-right:0;
  }

`;

function roleLabel(role: RequesterRole | undefined): string {

  if (role === "seller") return "Seller Support";

  if (role === "delivery") return "Delivery Support";

  return "Customer Support";

}



function roleNoun(role: RequesterRole | undefined): string {

  if (role === "seller") return "seller";

  if (role === "delivery") return "delivery person";

  return "customer";

}



function raiseIssueUrl(role: RequesterRole | undefined): string {

  if (role === "seller") return "/seller/bookings";

  if (role === "delivery") return "/delivery/batches";

  return "/orders";

}



function raiseIssueLabel(role: RequesterRole | undefined): string {

  if (role === "seller") return "Go to Seller Bookings";

  if (role === "delivery") return "Go to Delivery Batches";

  return "Raise New Issue";

}



export default function SupportTicketsPage() {

  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [requesterRole, setRequesterRole] = useState<RequesterRole>("user");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  const load = useCallback(async () => {

    setLoading(true);

    setError("");



    try {

      const response = await fetch("/react/api/support/tickets", {

        credentials: "include",

        headers: { Accept: "application/json" },

      });



      const payload = (await response

        .json()

        .catch(() => ({}))) as Payload;



      if (response.status === 401) {

        navigate(payload.login_url || "/react/login", {

          replace: true,

        });

        return;

      }



      if (!response.ok || payload.success !== true) {

        throw new Error(

          payload.message || "Unable to load support tickets.",

        );

      }



      setRequesterRole(payload.requester_role || "user");

      setTickets(payload.tickets || []);

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Unable to load support tickets.",

      );

    } finally {

      setLoading(false);

    }

  }, [navigate]);



  useEffect(() => {

    void load();

  }, [load]);



  const noun = roleNoun(requesterRole);

  const supportName = roleLabel(requesterRole);

  const issueUrl = raiseIssueUrl(requesterRole);



  const activeCount = useMemo(

    () =>

      tickets.filter(

        (ticket) =>

          !["resolved", "closed"].includes(

            String(ticket.status || "").toLowerCase(),

          ),

      ).length,

    [tickets],

  );



  return (

    <>

      <style>{STYLES}</style>



      <main className="support-tickets-page">

        <div className="st-shell">

          <section className="st-head">

            <div>

              <span className="st-number">Help & Support</span>

              <h1>My Tickets</h1>

              <p>

                Track your support requests and see updates from the complaint-management team.

              </p>

            </div>



            <div className="st-actions">

              <Link className="st-btn" to={issueUrl}>

                {raiseIssueLabel(requesterRole)}

              </Link>



              {requesterRole === "user" ? (

                <Link className="st-btn secondary" to="/contact-us">

                  Contact Us

                </Link>

              ) : null}

            </div>

          </section>



          <div className="st-role-banner">

            <span>{supportName}</span>

            <span>·</span>

            <span>{activeCount} active</span>

            <span>·</span>

            <span>{tickets.length} total tickets</span>

          </div>



          {error ? (

            <div className="st-alert" role="alert">

              {error}

            </div>

          ) : null}



          {loading ? (

            <div className="st-empty">Loading your tickets…</div>

          ) : tickets.length ? (

            <section className="st-grid">

              {tickets.map((ticket) => {

                const lastContact =

                  ticket.last_requester_contact ||

                  ticket.last_customer_contact;



                return (

                  <article className="st-ticket" key={ticket.id}>

                    <div className="st-ticket-top">

                      <div>

                        <span className="st-number">

                          {ticket.ticket_number}

                        </span>

                        <h2>{ticket.subject}</h2>

                      </div>



                      <span className="st-chip">

                        {ticket.status.replaceAll("_", " ")}

                      </span>

                    </div>



                    <div className="st-meta">

                      <span>

                        {ticket.context_type

                          ? ticket.context_type.replaceAll("_", " ")

                          : supportName}

                      </span>



                      {ticket.order_number || ticket.order_id ? (

                        <span>

                          Order {ticket.order_number || ticket.order_id}

                        </span>

                      ) : null}



                      {ticket.batch_number ? (

                        <span>Batch {ticket.batch_number}</span>

                      ) : null}



                      {ticket.item_name ? (

                        <span>Item: {ticket.item_name}</span>

                      ) : null}



                      <span>{ticket.issue_type.replaceAll("_", " ")}</span>

                      <span>Priority: {ticket.priority}</span>

                    </div>



                    {ticket.order_customer_name &&

                    requesterRole !== "user" ? (

                      <p>

                        <strong>Related customer:</strong>{" "}

                        {ticket.order_customer_name}

                      </p>

                    ) : null}



                    <p className="st-desc">{ticket.description}</p>



                    {lastContact ? (

                      <p>

                        <strong>Support contacted this {noun}:</strong>{" "}

                        {lastContact.name || "Support employee"} (

                        {lastContact.employee_id ||

                          "Employee ID unavailable"}

                        )

                      </p>

                    ) : null}



                    {ticket.updates?.length ? (

                      <div className="st-updates">

                        <strong>Support updates</strong>



                        {ticket.updates.map((update) => (

                          <div className="st-update" key={update.id}>

                            <div>

                              <strong>

                                {update.agent?.name || "Support team"}

                              </strong>

                              {update.agent?.employee_id

                                ? ` (${update.agent.employee_id})`

                                : ""}{" "}

                              ·{" "}

                              {new Date(

                                update.created_at,

                              ).toLocaleString()}

                            </div>



                            {update.message ? (

                              <div>{update.message}</div>

                            ) : null}

                          </div>

                        ))}

                      </div>

                    ) : null}

                  </article>

                );

              })}

            </section>

          ) : (

            <section className="st-empty">

              <h2>No tickets yet</h2>

              <p>

                New {supportName.toLowerCase()} tickets should start from the related{" "}

                {requesterRole === "delivery"

                  ? "delivery batch/order"

                  : requesterRole === "seller"

                    ? "seller booking/order"

                    : "customer order"}{" "}

                so the complaint-management team receives the correct context.

              </p>

              <Link className="st-btn" to={issueUrl}>

                {raiseIssueLabel(requesterRole)}

              </Link>

            </section>

          )}

        </div>

      </main>

    </>

  );

}
