import type { CommerceOrder } from "../types/commerce";
import "../styles/order-status-timeline.css";
const steps=["placed","confirmed","processing","packed","shipped","out_for_delivery","delivered"];
const title=(s:string)=>({placed:"Order received",confirmed:"Accepted by admin",processing:"Preparing order",packed:"Packed",shipped:"Shipped",out_for_delivery:"Out for delivery",delivered:"Delivered"} as Record<string,string>)[s]||s.replaceAll("_"," ");
const niceDate=(v:string)=>{if(!v)return"";const d=new Date(v.includes("T")?v:`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",...(v.includes("T")?{hour:"numeric",minute:"2-digit"}: {})});};
export function OrderStatusTimeline({order,compact=false}:{order:CommerceOrder;compact?:boolean}){
 const active=steps.indexOf(String(order.status||""));const history=order.status_history||[];
 return <section className={`order-tracking ${compact?"compact":""}`} aria-label="Order delivery tracking">
  <h3>Order tracking</h3>
  {order.estimated_delivery_date&&order.status!=="delivered"&&order.status!=="cancelled"&&<p className="order-tracking-eta">Estimated arrival: <strong>{niceDate(order.estimated_delivery_date)}</strong></p>}
  {order.status==="delivered"&&<p className="order-tracking-delivered">Delivered {niceDate(order.delivered_at||"")}</p>}
  {order.status==="cancelled"&&<p className="order-tracking-cancelled">This order was cancelled.</p>}
  <ol>{steps.map((step,i)=>{const record=[...history].reverse().find(h=>h.status===step);const complete=active>=i||Boolean(record);return <li key={step} className={complete?"done":""}><span className="order-tracking-dot">{complete?"✓":"○"}</span><span><b>{title(step)}</b>{record?.at&&<small>{niceDate(record.at)}</small>}{record?.note&&<small>{record.note}</small>}</span></li>})}</ol>
  <p className="order-tracking-foot">Status is updated directly by EasyFindStore admin. Estimated dates may change as your order progresses.</p>
 </section>;
}
