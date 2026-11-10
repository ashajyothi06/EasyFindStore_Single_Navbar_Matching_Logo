import {useState, type FormEvent} from 'react';
import './refund-panels.css';
export type RefundSummary={status?:string;method?:string;amount?:number;estimated_by?:string;reference?:string;note?:string;history?:Array<{status:string;at:string;note?:string}>;bank_details_received?:boolean;bank_account_last4?:string};
const label=(s?:string)=>(s||'requested').replaceAll('_',' ').replace(/\b\w/g,ch=>ch.toUpperCase());
export function RefundCustomerPanel({orderId,csrf,refund,onUpdate}:{orderId:string;csrf:string;refund?:RefundSummary|null;onUpdate:()=>Promise<void>|void}){
 const [holder,setHolder]=useState(''),[bank,setBank]=useState(''),[account,setAccount]=useState(''),[ifsc,setIfsc]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!refund?.status)return null;
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{
   const response=await fetch(`/react/api/orders/${encodeURIComponent(orderId)}/refund/bank-details`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({holder_name:holder,bank_name:bank,account_number:account,ifsc,csrf_token:csrf})});
   const result=await response.json();if(!response.ok||result.success===false)throw new Error(result.message||'Unable to save');
   setAccount('');setMessage('Bank details submitted securely.');await onUpdate();
 }catch(err){setMessage(err instanceof Error?err.message:'Unable to save')}finally{setBusy(false)}};
 return <section className="rudra-refund-panel"><h2>Refund tracking</h2><p><b>{label(refund.status)}</b> · ₹{Number(refund.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</p><p>The admin can update the expected refund initiation date. Bank holidays and settlement processing may delay the actual credit.</p>{refund.estimated_by&&<p>Expected refund initiation by: <b>{refund.estimated_by}</b></p>}{refund.reference&&<p>Tracking reference: <b>{refund.reference}</b></p>}{refund.note&&<p>{refund.note}</p>}
 {refund.bank_details_received&&<p>Bank details provided (account ending {refund.bank_account_last4}).</p>}
 {refund.status==='closed'&&<p className="rudra-refund-closed">Refund case closed after the admin recorded successful settlement. Check your bank statement and contact support if the credit is missing.</p>}
 {refund.status==='bank_details_requested'&&<form onSubmit={save} autoComplete="off"><h3>Provide bank details for manual refund</h3><p>Only the store admin can request this. If you paid with Razorpay, the original payment method is normally preferred.</p><label>Account holder<input value={holder} onChange={e=>setHolder(e.target.value)} required minLength={3} maxLength={120}/></label><label>Bank name<input value={bank} onChange={e=>setBank(e.target.value)} required minLength={3} maxLength={120}/></label><label>Account number<input type="text" inputMode="numeric" autoComplete="off" value={account} onChange={e=>setAccount(e.target.value)} required pattern="[0-9]{6,20}"/></label><label>IFSC code<input value={ifsc} onChange={e=>setIfsc(e.target.value.toUpperCase())} required pattern="[A-Z]{4}0[A-Z0-9]{6}" maxLength={11}/></label><button type="submit" disabled={busy}>{busy?'Submitting…':'Submit bank details securely'}</button></form>}
 {message&&<p role="status">{message}</p>}
 {refund.history?.length?<ol>{refund.history.map((event,i)=><li key={i}>{label(event.status)} · {event.at?.slice(0,10)}{event.note?` — ${event.note}`:''}</li>)}</ol>:null}</section>;
}
