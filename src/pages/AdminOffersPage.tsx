import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/admin-offers.css";

type Product = { id:string;name:string;sale_type:string;sale_value:number };
type Category = {id:string;name:string;items:Product[]};
type Coupon = {id:string;code:string;description:string;applicable_to:string;product_ids:string[];discount_type:string;discount_value:number;minimum_order_amount:number;maximum_discount_amount:number;usage_limit:number;per_user_limit:number;valid_from:string;valid_until:string;is_active:boolean;usage_count:number};
type Model = {success:boolean;categories:Category[];coupons:Coupon[];csrf_token:string;message?:string};
const base=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/$/,"");
const blank={id:"",code:"",description:"",applicable_to:"all",product_ids:[] as string[],discount_type:"percentage",discount_value:10,minimum_order_amount:0,maximum_discount_amount:0,usage_limit:0,per_user_limit:0,valid_from:"",valid_until:"",is_active:true};
async function request(path:string, options:RequestInit={}){
 const r=await fetch(`${base}${path}`,{credentials:"include",cache:"no-store",...options});
 const data=await r.json();if(!r.ok||data.success===false)throw new Error(data.message||"Operation failed");return data;
}
export function AdminOffersPage(){
 const location=useLocation();const [tab,setTab]=useState((location.search.includes("tab=coupons")||location.pathname.includes("coupons"))?"coupons":"sales");
 const [categories,setCategories]=useState<Category[]>([]),[coupons,setCoupons]=useState<Coupon[]>([]),[csrf,setCsrf]=useState("");
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const [scope,setScope]=useState("products"),[categoryId,setCategoryId]=useState(""),[selected,setSelected]=useState<string[]>([]);
 const [sale,setSale]=useState({sale_type:"percentage",sale_value:"10",sale_start:"",sale_end:""});
 const [coupon,setCoupon]=useState({...blank});
 const reload=useCallback(async()=>{try{const x=await request("/react/api/admin/merchandising") as Model;setCategories(x.categories);setCoupons(x.coupons);setCsrf(x.csrf_token);setError("")}catch(e){setError(e instanceof Error?e.message:"Cannot load offers")}},[]);
 useEffect(()=>{void reload()},[reload]);
 useEffect(()=>setTab((location.search.includes("tab=coupons")||location.pathname.includes("coupons"))?"coupons":"sales"),[location.pathname]);
 const all=categories.flatMap(cat=>cat.items.map(item=>({...item,category:cat.name})));
 const post=async(path:string,payload:Record<string,unknown>)=>request(path,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({...payload,csrf_token:csrf})});
 const submitSale=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{const r=await post("/react/api/admin/merchandising/sales",{...sale,scope,category_id:categoryId,product_ids:selected});setMessage(r.message);await reload()}catch(e){setError(e instanceof Error?e.message:"Could not save sale")}finally{setSaving(false)}};
 const submitCoupon=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{await post("/react/api/admin/merchandising/coupons",coupon);setMessage("Coupon saved successfully");setCoupon({...blank});await reload()}catch(e){setError(e instanceof Error?e.message:"Could not save coupon")}finally{setSaving(false)}};
 const toggle=async(row:Coupon,operation:"toggle"|"delete")=>{if(operation==="delete"&&!window.confirm(`Delete coupon ${row.code}?`))return;setSaving(true);try{await post(`/react/api/admin/merchandising/coupons/${encodeURIComponent(row.id)}/${operation}`,{});setMessage(`Coupon ${operation} successful`);await reload()}catch(e){setError(e instanceof Error?e.message:"Could not update coupon")}finally{setSaving(false)}};
 const pick=(id:string,checked:boolean,field:"sale"|"coupon")=>{if(field==="sale")setSelected(v=>checked?[...v.filter(x=>x!==id),id]:v.filter(x=>x!==id));else setCoupon(v=>({...v,product_ids:checked?[...v.product_ids.filter(x=>x!==id),id]:v.product_ids.filter(x=>x!==id)}))};
 const pickProducts=(value:string[],field:"sale"|"coupon")=><div className="offer-picks">{categories.map(cat=><details key={cat.id} open={cat.items.some(p=>value.includes(p.id))}><summary>{cat.name} ({cat.items.length})</summary>{cat.items.map(item=><label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={e=>pick(item.id,e.target.checked,field)}/>{item.name}</label>)}</details>)}</div>;
 return <main className="offer-admin"><header className="offer-top"><div><small>RUDRAAMSHIKA · ADMIN</small><h1>Offers & Coupons</h1><p>Manage sale prices and coupon codes for individual products, whole categories, or the entire store.</p></div><Link to="/admin">← Dashboard</Link></header>
 <div className="offer-tabs"><button className={tab==="sales"?"active":""} onClick={()=>setTab("sales")}>Product & Category Sales</button><button className={tab==="coupons"?"active":""} onClick={()=>setTab("coupons")}>Coupon Management</button></div>
 {error&&<p role="alert" className="offer-error">{error}</p>}{message&&<p role="status" className="offer-success">{message}</p>}
 {tab==="sales"?<form className="offer-card" onSubmit={submitSale}><h2>Create or update sale pricing</h2><p>Sale prices update catalogue and checkout together. Select a scope and apply a percentage or fixed-amount markdown. Choose No sale to remove previous discounts.</p>
 <div className="offer-fields"><label>Apply sale to<select value={scope} onChange={e=>setScope(e.target.value)}><option value="products">Specific products</option><option value="category">A category</option><option value="all">All products</option></select></label>
 {scope==="category"&&<label>Category<select required value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
 <label>Discount type<select value={sale.sale_type} onChange={e=>setSale(v=>({...v,sale_type:e.target.value}))}><option value="none">No sale (remove)</option><option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option></select></label>
 <label>Discount value<input type="number" min="0" max={sale.sale_type==="percentage"?100:undefined} step="0.01" disabled={sale.sale_type==="none"} value={sale.sale_value} onChange={e=>setSale(v=>({...v,sale_value:e.target.value}))}/></label>
 <label>Starts (optional)<input type="datetime-local" value={sale.sale_start} onChange={e=>setSale(v=>({...v,sale_start:e.target.value}))}/></label><label>Ends (optional)<input type="datetime-local" value={sale.sale_end} onChange={e=>setSale(v=>({...v,sale_end:e.target.value}))}/></label></div>
 {scope==="products"&&<><h3>Choose products ({selected.length} selected)</h3>{pickProducts(selected,"sale")}</>}
 {scope==="all"&&<p className="offer-warning">This changes sale pricing for all {all.length} products, including existing active sales.</p>}
 <button className="offer-save" disabled={saving||!all.length||scope==="products"&&!selected.length} type="submit">{saving?"Saving…":"Apply sale changes"}</button></form>:<><form className="offer-card" onSubmit={submitCoupon}><h2>{coupon.id?`Edit ${coupon.code}`:"Create coupon"}</h2><div className="offer-fields">
 <label>Coupon code<input value={coupon.code} required maxLength={40} placeholder="WELCOME10" onChange={e=>setCoupon(v=>({...v,code:e.target.value.toUpperCase()}))}/></label>
 <label>Discount type<select value={coupon.discount_type} onChange={e=>setCoupon(v=>({...v,discount_type:e.target.value}))}><option value="percentage">Percentage</option><option value="fixed">Fixed ₹ amount</option></select></label>
 <label>Discount value<input type="number" min="0.01" max={coupon.discount_type==="percentage"?100:undefined} step="0.01" required value={coupon.discount_value} onChange={e=>setCoupon(v=>({...v,discount_value:Number(e.target.value)}))}/></label>
 <label>Applies to<select value={coupon.applicable_to} onChange={e=>setCoupon(v=>({...v,applicable_to:e.target.value}))}><option value="all">All products</option><option value="products">Selected products</option></select></label>
 <label>Minimum order ₹<input type="number" min="0" value={coupon.minimum_order_amount} onChange={e=>setCoupon(v=>({...v,minimum_order_amount:Number(e.target.value)}))}/></label>
 <label>Maximum discount ₹ (0 = no cap)<input type="number" min="0" value={coupon.maximum_discount_amount} onChange={e=>setCoupon(v=>({...v,maximum_discount_amount:Number(e.target.value)}))}/></label>
 <label>Usage limit (0 = unlimited)<input type="number" min="0" value={coupon.usage_limit} onChange={e=>setCoupon(v=>({...v,usage_limit:Number(e.target.value)}))}/></label>
 <label>Per user limit<input type="number" min="0" value={coupon.per_user_limit} onChange={e=>setCoupon(v=>({...v,per_user_limit:Number(e.target.value)}))}/></label>
 <label>Starts (optional)<input type="datetime-local" value={coupon.valid_from?.slice(0,16)||""} onChange={e=>setCoupon(v=>({...v,valid_from:e.target.value}))}/></label><label>Expires (optional)<input type="datetime-local" value={coupon.valid_until?.slice(0,16)||""} onChange={e=>setCoupon(v=>({...v,valid_until:e.target.value}))}/></label>
 <label className="offer-wide">Description<input value={coupon.description} onChange={e=>setCoupon(v=>({...v,description:e.target.value}))}/></label>
 <label className="offer-check"><input type="checkbox" checked={coupon.is_active} onChange={e=>setCoupon(v=>({...v,is_active:e.target.checked}))}/> Coupon active</label></div>
 {coupon.applicable_to==="products"&&<><h3>Eligible products ({coupon.product_ids.length})</h3>{pickProducts(coupon.product_ids,"coupon")}</>}
 <div className="offer-actions"><button className="offer-save" disabled={saving} type="submit">{saving?"Saving…":coupon.id?"Save coupon":"Create coupon"}</button>{coupon.id&&<button type="button" onClick={()=>setCoupon({...blank})}>Cancel edit</button>}</div></form>
 <section className="offer-card"><h2>Existing coupons ({coupons.length})</h2><div className="offer-table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th>Scope</th><th>Status</th><th>Uses</th><th>Manage</th></tr></thead><tbody>{coupons.map(row=><tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.discount_type==="percentage"?`${row.discount_value}%`:`₹${row.discount_value}`}</td><td>{row.applicable_to==="products"?`${row.product_ids?.length||0} products`:"Entire store"}</td><td>{row.is_active?"Active":"Paused"}</td><td>{row.usage_count||0}</td><td><button onClick={()=>{setCoupon({...blank,...row});window.scrollTo({top:0,behavior:"smooth"})}}>Edit</button><button disabled={saving} onClick={()=>void toggle(row,"toggle")}>{row.is_active?"Pause":"Enable"}</button><button disabled={saving} onClick={()=>void toggle(row,"delete")}>Delete</button></td></tr>)}</tbody></table></div></section></>}
 </main>;
}
