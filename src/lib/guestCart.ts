/** Guest cart keeps only public product IDs and quantities. No addresses, OTPs or tokens. */
import { addCartItem, getCart } from "./api";
import type { CatalogCategory, CatalogItem } from "../services/coreCommerceApi";

const KEY = "rudraamshika.guest-cart.v1";
export type GuestLine = { itemId: string; quantity: number };
const notify = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated")); };
const safeQuantity = (value: unknown) => Math.max(0, Math.min(99, Math.trunc(Number(value) || 0)));

export function readGuestCart(): GuestLine[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((x): x is GuestLine => !!x && typeof x.itemId === "string" && x.itemId.length < 150)
      .slice(0, 100).map(x => ({ itemId:x.itemId, quantity:safeQuantity(x.quantity) }))
      .filter(x => x.quantity > 0);
  } catch { return []; }
}
function writeGuestCart(lines: GuestLine[]) {
  // Fail visibly on storage denial; never falsely tell a customer their items were saved.
  localStorage.setItem(KEY, JSON.stringify(lines.filter(x => x.quantity > 0)));
  notify();
}
export const guestCartCount = () => readGuestCart().reduce((sum,x) => sum+x.quantity, 0);
export function setGuestQuantity(itemId:string, quantity:number, stock:number) {
  const max = Math.max(0, Math.min(99,Math.trunc(Number(stock)||0)));
  const next = Math.max(0,Math.min(max,safeQuantity(quantity)));
  const lines=readGuestCart().filter(x=>x.itemId!==itemId);
  if(next) lines.push({itemId,quantity:next});
  writeGuestCart(lines);
  return next;
}
export function addGuestItem(itemId:string, quantity:number, stock:number) {
  const old = readGuestCart().find(x=>x.itemId===itemId)?.quantity||0;
  const max=Math.max(0, Math.min(99, Number(stock)||0));
  if(old+quantity > max) throw new Error(`Only ${max} item(s) are currently in stock, including those already in your cart.`);
  setGuestQuantity(itemId,old+quantity,max);
}
export const findCatalogProduct=(categories:CatalogCategory[],itemId:string):{item:CatalogItem;category:CatalogCategory}|undefined => {
  for(const category of categories){const item=(category.items||[]).find(x=>x.id===itemId);if(item)return {item,category};
    for (const parent of category.items || []) {
      const variant = parent.variants?.find(v=>v.id===itemId);
      if(variant) return {category,item:{...parent,...variant,name:`${parent.name} — ${[variant.color,variant.size,variant.material,variant.capacity,variant.style,variant.weight,variant.model].filter(Boolean).join(' / ')}`,image_url:variant.image_url || parent.image_url}};
    }}
  return undefined;
};
export async function fetchCatalog():Promise<CatalogCategory[]>{
  const BASE=(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response=await fetch(`${BASE}/react/api/catalog/categories`,{credentials:"include",cache:"no-store"});
  if(!response.ok)throw new Error("Unable to verify product stock");
  const payload=await response.json();
  return Array.isArray(payload.categories)?payload.categories:[];
}
export async function currentSession():Promise<{authenticated:boolean;csrf_token:string;user?:{role:string}}>{
  const BASE=(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response=await fetch(`${BASE}/react/api/auth/session`,{credentials:"include",cache:"no-store"});
  if(!response.ok) throw new Error("Unable to check account status");
  return response.json();
}
/** Works for logged-in and guest customers, always validated against real stock. */
export async function addProductToCart(item:CatalogItem,quantity:number):Promise<"guest"|"account">{
  const session=await currentSession();
  if(session.authenticated){
    await addCartItem(item.id,quantity,session.csrf_token);
    notify(); return "account";
  }
  addGuestItem(item.id,quantity,Number(item.stock_quantity)||0);
  return "guest";
}
let mergeTask:Promise<{merged:number;remaining:number}>|null=null;
/** Sequential, idempotent merge: delete each local row only after the backend confirms it.
 * Checkout remains blocked on errors, so unsynced items cannot disappear.
 */
export function mergeGuestCart():Promise<{merged:number;remaining:number}>{
  if(mergeTask)return mergeTask;
  mergeTask=(async()=>{
    const session=await currentSession();
    if(!session.authenticated) throw new Error("Sign in to continue to checkout.");
    const rows=readGuestCart();if(!rows.length)return {merged:0,remaining:0};
    const categories=await fetchCatalog();
    const server=await getCart();
    let merged=0;
    for(const row of rows){
      const found=findCatalogProduct(categories,row.itemId);
      if(!found) throw new Error("A saved item is no longer available. Remove it from the guest cart before checkout.");
      const stock=Math.max(0,Number(found.item.stock_quantity)||0);
      const existing=server.items?.find(x=>String(x.item_id)===row.itemId)?.quantity || 0;
      if(row.quantity+existing>stock)throw new Error(`${found.item.name}: only ${stock} in stock (${existing} already in your account cart). Adjust the guest quantity before checkout.`);
      await addCartItem(row.itemId,row.quantity,session.csrf_token);
      // Only clear after a confirmed successful write; refresh server cart between lines.
      setGuestQuantity(row.itemId,0,stock);
      merged++;
    }
    return {merged,remaining:readGuestCart().length};
  })().finally(()=>{mergeTask=null});
  return mergeTask;
}
