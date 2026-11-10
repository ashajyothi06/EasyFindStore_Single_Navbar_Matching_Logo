import { useEffect,useState } from "react";
import { Navigate,useLocation } from "react-router-dom";
import { CartPage } from "../pages/CartPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { GuestCartPage } from "../pages/GuestCartPage";
import { currentSession,mergeGuestCart,readGuestCart } from "../lib/guestCart";
import "../styles/marketplace.css";
export function CommerceGate({checkout=false}:{checkout?:boolean}){
 const [mode,setMode]=useState<"loading"|"guest"|"account"|"error">("loading"),[message,setMessage]=useState("");
 const location=useLocation();const [retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setMode("loading");(async()=>{
  try {const session=await currentSession();if(!live)return;
   if(!session.authenticated){setMode("guest");return;}
   if(readGuestCart().length)await mergeGuestCart();
   if(live)setMode("account");
  }catch(e){if(live){setMessage(e instanceof Error?e.message:"Could not sync your cart");setMode("error")}}
 })();return()=>{live=false}},[retry]);
 if(mode==="loading")return <main className="market-gate">Checking your cart and account…</main>;
 if(mode==="guest")return checkout?<Navigate to={`/store/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace/>:<GuestCartPage/>;
 if(mode==="error")return <main className="market-gate"><h2>Your saved items need attention</h2><p role="alert">{message}</p><p>Your guest cart has been kept intact. You can review it before retrying.</p><button type="button" onClick={()=>setRetry(x=>x+1)}>Retry cart sync</button><button type="button" onClick={()=>setMode("guest")}>Review saved items</button></main>;
 return checkout?<CheckoutPage/>:<CartPage/>;
}
