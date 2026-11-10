import { memo, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiRequestError, clearCart, getCart } from "../lib/api";

import {
  addSubscriptionToCart,
  getSubscriptionItem,
  SubscriptionApiError,
  subscriptionAssetUrl,
  type SubscriptionCatalogPayload,
  type SubscriptionCategory,
  type SubscriptionCombination,
  type SubscriptionIncludedItem,
  type SubscriptionItem,
  type SubscriptionPlanCode,
} from "../lib/subscriptionApi";

type SubscriptionScheduleEntry = {
  id: string;
  scope: "weekday" | "date";
  weekday?: string;
  weekday_index?: number | null;
  schedule_date?: string;
  title: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
};

type SubscriptionItemWithSchedule = SubscriptionItem & {
  detailed_description?: string;
  content_schedule?: {
    weekday_entries?: SubscriptionScheduleEntry[];
    date_entries?: SubscriptionScheduleEntry[];
  };
  delivery_exclusions?: {
    excluded_weekdays?: string[];
    excluded_dates?: Array<{
      date: string;
      reason?: string;
    }>;
  };
};

/**
 * Fast subscription detail navigation: share in-flight requests, keep a short
 * in-memory cache, and render a safe sessionStorage preview on reload.
 * Security tokens are NEVER persisted. Cached previews stay read-only until
 * the live server response verifies pricing, seller availability, and tokens.
 */
type SubscriptionDetailResponse = Awaited<ReturnType<typeof getSubscriptionItem>>;
type SubscriptionDetailCache = {
  savedAt: number;
  data: SubscriptionDetailResponse;
  verified: boolean;
};
const SUBSCRIPTION_DETAIL_CACHE_KEY = "fruveto:subscription-detail:preview:v1";
const SUBSCRIPTION_DETAIL_CACHE_MAX_AGE_MS = 5 * 60_000;
const SUBSCRIPTION_DETAIL_FRESH_MS = 45_000;
const subscriptionDetailCache = new Map<string, SubscriptionDetailCache>();
const subscriptionDetailRequests = new Map<string, Promise<SubscriptionDetailResponse>>();

function safeItemId(value: string): string {
  try { return decodeURIComponent(value); }
  catch { return value; }
}

function readSubscriptionDetailCache(key: string): SubscriptionDetailCache | null {
  if (!key) return null;
  const memory = subscriptionDetailCache.get(key);
  if (memory) {
    if (Date.now() - memory.savedAt < SUBSCRIPTION_DETAIL_CACHE_MAX_AGE_MS) return memory;
    subscriptionDetailCache.delete(key);
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SUBSCRIPTION_DETAIL_CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      key?: string;
      savedAt?: number;
      data?: SubscriptionDetailResponse;
    };
    if (saved.key !== key || !saved.data?.item || !saved.data?.category ||
        !Number.isFinite(saved.savedAt) ||
        Date.now() - Number(saved.savedAt) >= SUBSCRIPTION_DETAIL_CACHE_MAX_AGE_MS) {
      return null;
    }
    const entry: SubscriptionDetailCache = {
      savedAt: Number(saved.savedAt),
      data: saved.data,
      verified: false, // Session previews contain no auth/CSRF credentials.
    };
    subscriptionDetailCache.set(key, entry);
    return entry;
  } catch { return null; }
}

function cacheSubscriptionDetail(key: string, data: SubscriptionDetailResponse): void {
  const savedAt = Date.now();
  subscriptionDetailCache.set(key, { savedAt, data, verified: true });
  if (subscriptionDetailCache.size > 8) {
    subscriptionDetailCache.delete(subscriptionDetailCache.keys().next().value as string);
  }
  if (typeof window === "undefined") return;
  // Only render-safe data is stored across reloads, never security tokens.
  try {
    const safeData = {
      item: data.item,
      category: data.category,
      payload: { currency_symbol: data.payload?.currency_symbol || "₹" },
    } as SubscriptionDetailResponse;
    window.sessionStorage.setItem(
      SUBSCRIPTION_DETAIL_CACHE_KEY,
      JSON.stringify({ key, savedAt, data: safeData }),
    );
  } catch { /* A full/disabled sessionStorage must not break the page. */ }
}

function requestSubscriptionDetailOnce(key: string): Promise<SubscriptionDetailResponse> {
  const existing = subscriptionDetailRequests.get(key);
  if (existing) return existing;
  const request = getSubscriptionItem(key)
    .then((data) => {
      cacheSubscriptionDetail(key, data);
      return data;
    })
    .finally(() => {
      if (subscriptionDetailRequests.get(key) === request) {
        subscriptionDetailRequests.delete(key);
      }
    });
  subscriptionDetailRequests.set(key, request);
  return request;
}

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .subscription-detail{--subscription-olive:#33371b;--subscription-olive-hover:#454b24;--subscription-olive-soft:#eef0e6;--subscription-ink:#242815;--subscription-muted:#626856;--subscription-border:#d9ddcc;width:100%;padding:40px 0 80px;background:#f7f7f2;color:var(--subscription-ink);font-family:"Nunito",Arial,Helvetica,sans-serif}
  .subscription-detail-container{width:100%;margin:0 auto;padding-left:clamp(18px,4vw,64px);padding-right:clamp(18px,4vw,64px);}
  .subscription-detail-top{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin:0 0 18px;padding:0}.subscription-detail-link{color:var(--subscription-olive);font-weight:800;text-decoration:none}
  .subscription-detail-link:hover{color:var(--subscription-olive-hover);text-decoration:underline}
  .subscription-detail-layout{display:block;width:100%;margin:0}
  .subscription-detail-card{border:0;border-radius:0;background:transparent;box-shadow:none;overflow:visible}
  .subscription-product-overview{display:grid;grid-template-columns:minmax(360px,430px) minmax(0,1fr);align-items:center;gap:56px;padding:40px 46px;margin:0 0 28px;border:1px solid var(--subscription-border);border-radius:24px;background:#fff;box-shadow:0 18px 46px rgba(51,55,27,.07)}
  .subscription-product-overview .subscription-detail-media{width:100%;max-width:420px;aspect-ratio:4/5;margin:0 auto;border-radius:20px;box-shadow:none}
  .subscription-product-overview .subscription-detail-copy{padding:4px 0 0}
  .subscription-product-overview .subscription-detail-copy h1{max-width:760px}
  .subscription-product-overview .subscription-price-grid{max-width:430px}
  .subscription-product-overview .subscription-detail-copy > p:last-of-type{margin:18px 0 14px;color:var(--subscription-olive);font-size:1rem;font-weight:800}

  .subscription-detail-media{position:relative;width:calc(100% - 28px);max-width:380px;aspect-ratio:4/5;margin:14px auto 0;overflow:hidden;border:1px solid var(--subscription-border);border-radius:18px;background:linear-gradient(145deg,#f7f7f2,var(--subscription-olive-soft));box-shadow:0 10px 28px rgba(51,55,27,.08);font-size:4rem;isolation:isolate}
  .subscription-detail-carousel-image{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;animation:subscription-detail-carousel-drop .35s cubic-bezier(.22,.8,.24,1) both}
  @keyframes subscription-detail-carousel-drop{from{opacity:.18;transform:translateY(-34px) scale(1.018)}to{opacity:1;transform:translateY(0) scale(1)}}
  @media(prefers-reduced-motion:reduce){.subscription-detail-carousel-image{animation:none}}
  .subscription-detail-carousel-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .subscription-detail-media::after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(180deg,transparent,rgba(20,24,10,.9));pointer-events:none}
  .subscription-detail-carousel-caption{position:absolute;z-index:2;left:16px;right:16px;bottom:38px;display:grid;gap:3px;color:#fff;text-shadow:0 2px 9px rgba(0,0,0,.5)}
  .subscription-detail-carousel-label{font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
  .subscription-detail-carousel-caption strong{font-size:clamp(1.05rem,2vw,1.35rem);line-height:1.12}
  .subscription-detail-carousel-caption p{display:-webkit-box;overflow:hidden;margin:0;color:rgba(255,255,255,.9);font-size:.76rem;line-height:1.3;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  .subscription-detail-carousel-controls,.subscription-detail-carousel-control{display:none!important}
  .subscription-detail-carousel-days{position:absolute;z-index:4;top:12px;left:12px;right:12px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;justify-content:flex-start;pointer-events:auto}
  .subscription-detail-carousel-day{min-height:27px;padding:5px 9px;border:1px solid rgba(255,255,255,.58);border-radius:999px;background:rgba(28,32,16,.56);color:#fff;font:inherit;font-size:.62rem;font-weight:900;line-height:1;cursor:pointer;backdrop-filter:blur(7px);box-shadow:0 3px 10px rgba(0,0,0,.12);transition:background .2s ease,color .2s ease,border-color .2s ease,transform .2s ease}
  .subscription-detail-carousel-day:hover{background:rgba(28,32,16,.78);transform:translateY(-1px)}
  .subscription-detail-carousel-day.active{border-color:#fff;background:#fff;color:var(--subscription-olive);box-shadow:0 4px 12px rgba(0,0,0,.18);animation:subscription-detail-day-pop .32s ease both}
  @keyframes subscription-detail-day-pop{0%{transform:scale(.94)}70%{transform:scale(1.04)}100%{transform:scale(1)}}
  .subscription-detail-carousel-day:focus-visible{outline:3px solid rgba(255,255,255,.88);outline-offset:2px}
  .subscription-detail-carousel-dots{position:absolute;z-index:3;left:12px;right:12px;bottom:13px;display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
  .subscription-detail-carousel-dot{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer}
  .subscription-detail-carousel-dot.active{background:#fff;transform:scale(1.3)}
  .subscription-detail-carousel-day:focus-visible,.subscription-detail-carousel-dot:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}
  .subscription-detail-copy{padding:18px 20px 20px}.subscription-detail-copy h1{margin:0 0 18px;font-size:clamp(2.35rem,4vw,3.6rem);line-height:1.02;letter-spacing:-.045em}.subscription-detail-copy p{margin:0 0 18px;color:var(--subscription-muted);font-size:1rem;line-height:1.6}
  .subscription-detailed-description{margin:20px 0;padding:16px 18px;border-left:4px solid var(--subscription-olive);border-radius:0 12px 12px 0;background:var(--subscription-olive-soft);color:var(--subscription-muted);font-size:.95rem;line-height:1.6;white-space:pre-line}
  .subscription-detail-eyebrow{display:block;margin-bottom:12px;color:var(--subscription-olive);font-size:.78rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
  .subscription-price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}.subscription-price{padding:13px 14px;border:1px solid #eceee5;border-radius:12px;background:#f7f7f2;color:var(--subscription-muted);font-size:.8rem}.subscription-price strong{display:block;margin-top:4px;color:var(--subscription-ink);font-size:1.05rem}
  .subscription-form{padding:0 0 30px}
  .subscription-form-grid,.subscription-summary,.subscription-submit{width:100%}.subscription-form h2{margin:0 0 4px}.subscription-form-intro{margin:0 0 20px;color:var(--subscription-muted)}
  .subscription-field{display:grid;gap:7px;margin-bottom:16px}.subscription-field label,.subscription-label{font-size:.86rem;font-weight:850}.subscription-input{width:100%;min-height:46px;padding:10px 12px;border:1px solid var(--subscription-border);border-radius:12px;background:#fff;color:var(--subscription-ink);font:inherit}
  .subscription-number-stepper{display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:stretch;gap:8px;width:100%}
  .subscription-number-stepper .subscription-input{text-align:center;font-weight:850;font-variant-numeric:tabular-nums}
  .subscription-number-stepper-button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0;border:1px solid var(--subscription-border);border-radius:12px;background:var(--subscription-olive-soft);color:var(--subscription-olive);font:inherit;font-size:1.35rem;font-weight:900;line-height:1;cursor:pointer;transition:background .18s ease,border-color .18s ease,transform .18s ease}
  .subscription-number-stepper-button:hover:not(:disabled){border-color:var(--subscription-olive);background:#e5e9d8;transform:translateY(-1px)}
  .subscription-number-stepper-button:disabled{cursor:not-allowed;opacity:.42}
  .subscription-number-stepper-button:focus-visible{outline:3px solid rgba(51,55,27,.22);outline-offset:2px}
  .subscription-custom-days-help{margin-top:1px;color:var(--subscription-muted);font-size:.72rem;line-height:1.35}
  .subscription-custom-days-help.invalid{color:#a12632;font-weight:750}
  .subscription-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.subscription-full{grid-column:1/-1}
  .subscription-option-list{display:grid;gap:9px}.subscription-option{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--subscription-border);border-radius:13px;background:#f7f7f2}.subscription-option input{margin-top:4px;accent-color:var(--subscription-olive)}.subscription-option span{font-size:.87rem}.subscription-option small{display:block;margin-top:3px;color:var(--subscription-muted)}
  .subscription-items{display:grid;gap:7px;margin-top:9px}.subscription-item-row{display:flex;justify-content:space-between;gap:12px;padding:9px 11px;border-radius:10px;background:#f7f7f2;font-size:.82rem}
  .subscription-dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:340px;overflow:auto;padding:12px;border:1px solid var(--subscription-border);border-radius:14px;background:#f7f7f2}.subscription-date label{display:block;margin-bottom:4px;color:var(--subscription-muted);font-size:.72rem;font-weight:800}
  .subscription-calendar-layout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}
  .subscription-calendar{height:100%;min-width:0;overflow:hidden;border:1px solid var(--subscription-border);border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(51,55,27,.055)}
  .subscription-calendar-header{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px;background:var(--subscription-olive);color:#fff}
  .subscription-calendar-title{display:flex;align-items:center;justify-content:center;gap:6px;flex:1}
  .subscription-calendar-select{min-height:32px;padding:5px 25px 5px 8px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:var(--subscription-olive-hover);color:#fff;font:inherit;font-size:.73rem;font-weight:800}
  .subscription-calendar-nav{width:32px;height:32px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:rgba(255,255,255,.09);color:#fff;font-size:1rem;cursor:pointer}
  .subscription-calendar-nav:hover:not(:disabled){background:rgba(255,255,255,.18)}
  .subscription-calendar-nav:disabled{cursor:not-allowed;opacity:.35}
  .subscription-calendar-edit-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--subscription-border);background:linear-gradient(90deg,var(--subscription-olive-soft),#f7f7f2);color:var(--subscription-olive)}
  .subscription-calendar-edit-copy{display:grid;gap:1px;font-size:.69rem}.subscription-calendar-edit-copy strong{font-size:.8rem}.subscription-calendar-edit-copy span{color:var(--subscription-muted)}
  .subscription-calendar-cancel{min-height:29px;padding:5px 9px;border:1px solid var(--subscription-border);border-radius:8px;background:#fff;color:var(--subscription-olive);font:inherit;font-size:.68rem;font-weight:850;cursor:pointer}
  .subscription-calendar-cancel:hover{background:var(--subscription-olive-soft)}
  .subscription-calendar-idle{padding:8px 10px;border-bottom:1px solid var(--subscription-border);background:#f7f7f2;color:var(--subscription-muted);font-size:.7rem;font-weight:750}
  .subscription-calendar-weekdays,.subscription-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
  .subscription-calendar-weekdays span{padding:6px 2px;background:#f7f7f2;color:var(--subscription-muted);font-size:.6rem;font-weight:900;text-align:center;text-transform:uppercase}
  .subscription-calendar-day{position:relative;min-height:39px;padding:3px;border:1px solid transparent;background:#fff;color:var(--subscription-ink);font:inherit;cursor:pointer}
  .subscription-calendar-day:hover:not(:disabled){background:var(--subscription-olive-soft)}
  .subscription-calendar-day.other{color:#8a8f80;background:#f7f7f2}
  .subscription-calendar-day:disabled{cursor:not-allowed;color:#b3b7aa;background:#f7f7f2}
  .subscription-calendar-day.excluded,.subscription-calendar-day.excluded:disabled{color:#a25a62;background:#fff0f1;text-decoration:line-through}
  .subscription-calendar-day.selected{background:var(--subscription-olive-soft);color:var(--subscription-olive);font-weight:900}
  .subscription-calendar-day.active{border-color:var(--subscription-olive);background:var(--subscription-olive);color:#fff;box-shadow:inset 0 0 0 2px #fff}
  .subscription-calendar-day.edit-target{border-color:var(--subscription-olive);background:var(--subscription-olive-soft);color:var(--subscription-olive);box-shadow:inset 0 0 0 2px #fff,0 0 0 2px var(--subscription-olive);font-weight:900}
  .subscription-calendar-day-number{display:block;font-size:.74rem}
  .subscription-calendar-dot{position:absolute;left:50%;bottom:4px;width:4px;height:4px;border-radius:50%;background:var(--subscription-olive);transform:translateX(-50%)}
  .subscription-calendar-day.active .subscription-calendar-dot{background:#fff}
  .subscription-calendar-help{padding:7px 10px;border-top:1px solid var(--subscription-border);background:#f7f7f2;color:var(--subscription-muted);font-size:.66rem;line-height:1.35}
  .subscription-date-list{width:100%;height:100%;min-width:0;max-height:none;overflow:auto;padding:11px;border:1px solid var(--subscription-border);border-radius:14px;background:#f7f7f2;box-shadow:0 8px 22px rgba(51,55,27,.045)}
  .subscription-date-list-title{margin:0 0 10px;padding:1px 2px 9px;border-bottom:1px solid var(--subscription-border);color:var(--subscription-ink);font-size:.8rem;font-weight:900;line-height:1.35}
  .subscription-date-choice{width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;margin-bottom:7px;padding:8px 9px;border:1px solid var(--subscription-border);border-radius:10px;background:#fff;color:var(--subscription-ink);font:inherit;font-size:.71rem;text-align:left;transition:border-color .2s,background .2s,box-shadow .2s}
  .subscription-date-choice.active{border-color:var(--subscription-olive);background:var(--subscription-olive-soft);color:var(--subscription-olive);font-weight:850}
  .subscription-date-number{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:var(--subscription-olive-soft);font-weight:900}
  .subscription-date-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .subscription-date-edit{display:inline-flex;align-items:center;justify-content:center;min-width:64px;min-height:30px;padding:5px 10px;border:0;border-radius:8px;background:var(--subscription-olive);color:#fff;font:inherit;font-size:.68rem;font-weight:900;cursor:pointer;box-shadow:0 4px 10px rgba(51,55,27,.14)}
  .subscription-date-edit:hover{background:var(--subscription-olive-hover);transform:translateY(-1px)}
  .subscription-date-choice.active{box-shadow:0 0 0 2px rgba(51,55,27,.16)}
  .subscription-date-choice.active .subscription-date-edit{background:var(--subscription-olive)}
  .subscription-plan-panel{width:100%;height:100%;min-width:0;align-self:stretch;padding:16px;border:1px solid var(--subscription-border);border-radius:14px;background:linear-gradient(145deg,#fff,#f7f7f2);box-shadow:0 8px 22px rgba(51,55,27,.045)}
  .subscription-plan-panel-eyebrow{display:block;margin-bottom:5px;color:var(--subscription-olive);font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .subscription-plan-panel h3{margin:0 0 6px;color:var(--subscription-ink);font-size:1.05rem}
  .subscription-plan-panel-description{margin:0 0 11px;color:var(--subscription-muted);font-size:.72rem;line-height:1.4}
  .subscription-plan-panel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
  .subscription-plan-panel-item{padding:9px;border:1px solid var(--subscription-border);border-radius:9px;background:#fff}
  .subscription-plan-panel-item span{display:block;margin-bottom:3px;color:var(--subscription-muted);font-size:.58rem;font-weight:800;text-transform:uppercase}
  .subscription-plan-panel-item strong{display:block;color:var(--subscription-ink);font-size:.78rem;line-height:1.25}
  .subscription-plan-panel-total{grid-column:1/-1;background:var(--subscription-olive-soft)}
  .subscription-plan-panel-total strong{color:var(--subscription-olive);font-size:1rem}
  .subscription-plan-panel .subscription-submit{margin-top:12px}

  .subscription-summary{margin:18px 0;padding:15px;border-radius:14px;background:var(--subscription-olive-soft)}.subscription-summary-line{display:flex;justify-content:space-between;gap:12px;margin:6px 0}.subscription-summary-total{padding-top:9px;border-top:1px solid var(--subscription-border);font-size:1.05rem;font-weight:900}
  .subscription-alert{margin-bottom:15px;padding:12px 14px;border-radius:12px;background:#fff0f0;color:#a12632}.subscription-success{background:var(--subscription-olive-soft);color:var(--subscription-olive)}
  .subscription-submit{width:100%;min-height:48px;border:0;border-radius:13px;background:var(--subscription-olive);color:#fff;font:inherit;font-weight:900;cursor:pointer}.subscription-submit:disabled{cursor:not-allowed;opacity:.58}
  .subscription-submit:hover:not(:disabled){background:var(--subscription-olive-hover)}
  .subscription-input:focus-visible,.subscription-calendar-select:focus-visible,.subscription-calendar-nav:focus-visible,.subscription-calendar-cancel:focus-visible,.subscription-calendar-day:focus-visible,.subscription-date-edit:focus-visible,.subscription-submit:focus-visible,.subscription-detail-link:focus-visible{outline:3px solid rgba(51,55,27,.22);outline-offset:2px}
  .subscription-loading{padding:16px;margin:0 0 15px;border:1px solid var(--subscription-border);border-radius:14px;background:#fff;color:var(--subscription-muted);text-align:center}
  .subscription-loading-preview{display:grid;grid-template-columns:minmax(230px,380px) minmax(0,1fr);gap:28px;padding:26px;border:1px solid var(--subscription-border);border-radius:22px;background:#fff}
  .subscription-skeleton-image{width:100%;aspect-ratio:4/5;border-radius:16px;background:linear-gradient(105deg,#eff1e8 15%,#f8f9f3 40%,#eff1e8 65%);background-size:200% 100%;animation:subscription-skeleton-wave 1.35s ease-in-out infinite}
  .subscription-skeleton-copy{display:flex;flex-direction:column;gap:15px;justify-content:center}
  .subscription-skeleton-line{height:19px;width:75%;border-radius:10px;background:#eff1e8}
  .subscription-skeleton-line:first-child{height:34px;width:90%}
  .subscription-skeleton-line.short{width:45%}
  @keyframes subscription-skeleton-wave{to{background-position-x:-200%}}
  @media(max-width:700px){.subscription-loading-preview{grid-template-columns:1fr;padding:15px;gap:14px}.subscription-skeleton-image{aspect-ratio:13/8}}
  @media(prefers-reduced-motion:reduce){.subscription-skeleton-image{animation:none}}
  @media(max-width:1120px) and (min-width:861px){
    .subscription-product-overview{grid-template-columns:minmax(300px,360px) minmax(0,1fr);gap:34px;padding:30px 32px}
    .subscription-calendar-layout{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .subscription-calendar-layout > .subscription-plan-panel{grid-column:1/-1}
    .subscription-calendar-day{min-height:39px}
    .subscription-calendar-layout > .subscription-date-list{max-height:330px}
  }
  @media(max-width:860px){
    .subscription-detail{padding:24px 0 64px}
    .subscription-detail-container{padding-left:18px;padding-right:18px}
    .subscription-detail-top{padding:0}
    .subscription-detail-layout{width:100%}
    .subscription-form{padding:0 0 24px}
    .subscription-product-overview{grid-template-columns:minmax(260px,320px) minmax(0,1fr);gap:26px;padding:24px;margin-bottom:20px}
    .subscription-product-overview .subscription-detail-media{max-width:320px;aspect-ratio:4/5;border-radius:18px}
    .subscription-product-overview .subscription-detail-copy{padding:6px 0;max-width:760px}
  }
  @media(max-width:700px){
    .subscription-calendar-layout{grid-template-columns:1fr;gap:10px}
    .subscription-calendar-layout > .subscription-calendar{order:1}
    .subscription-calendar-layout > .subscription-date-list{order:2}
    .subscription-calendar-layout > .subscription-plan-panel{order:3}
    .subscription-detail-top{margin-bottom:12px}
    .subscription-calendar{max-width:100%}
    .subscription-calendar-day{min-height:40px;padding:3px}
    .subscription-calendar-weekdays span{padding:5px 2px}
    .subscription-calendar-layout > .subscription-date-list{max-height:260px;padding:10px}
    .subscription-date-choice{grid-template-columns:28px minmax(0,1fr) auto;gap:8px;padding:8px}
    .subscription-date-edit{min-width:58px}
    .subscription-plan-panel{padding:14px}
  }
  @media(max-width:560px){
    .subscription-detail{padding:14px 0 54px}
    .subscription-detail-container{padding-left:12px;padding-right:12px}
    .subscription-form-grid,.subscription-dates,.subscription-price-grid{grid-template-columns:1fr}
    .subscription-detail-top{padding:0;margin-bottom:10px}
    .subscription-detail-card{border-radius:0}
    .subscription-form{padding:0 0 18px}
    .subscription-product-overview{grid-template-columns:1fr;gap:18px;padding:0;margin-bottom:18px;border:0;border-radius:0;background:transparent;box-shadow:none}
    .subscription-product-overview .subscription-detail-media{width:calc(100% - 8px);max-width:none;margin:0 4px;aspect-ratio:4/5;border-radius:16px}
    .subscription-product-overview .subscription-detail-copy{padding:0 4px}
    .subscription-detail-carousel-caption{left:13px;right:13px;bottom:34px}
    .subscription-detail-carousel-caption strong{font-size:1.05rem}
    .subscription-detail-carousel-caption p{font-size:.72rem}
    .subscription-detail-carousel-days{top:9px;left:9px;right:9px;gap:4px}
    .subscription-detail-carousel-day{min-height:24px;padding:4px 7px;font-size:.56rem}
    .subscription-detail-carousel-dots{bottom:11px}
    .subscription-detail-copy h1{font-size:2rem;line-height:1.05;margin-bottom:12px}
    .subscription-detail-copy p{margin:7px 0 14px;font-size:.9rem;line-height:1.48}
    .subscription-detailed-description{margin:12px 0;padding:11px 12px}
    .subscription-product-overview .subscription-price-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px;max-width:none}
    .subscription-product-overview .subscription-price{padding:9px 10px}
    .subscription-plan-panel-grid{grid-template-columns:1fr 1fr}
    .subscription-plan-panel-total{grid-column:1/-1}
  }


  /* Mobile-only product heading. Desktop keeps the existing title in the copy column. */
  .subscription-mobile-heading{display:none}

  /* Detail page schedule card: carousel on the left, Daily menu on the right.
     Product title/description/pricing remain in the existing page copy. */
  .subscription-product-overview{
    grid-template-columns:minmax(560px,650px) minmax(0,1fr);
    align-items:center;
    gap:48px;
  }
  .subscription-schedule-card{
    width:100%;
    max-width:650px;
    aspect-ratio:13/8;
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    overflow:hidden;
    border:1px solid var(--subscription-border);
    border-radius:18px;
    background:#fff;
    box-shadow:0 8px 20px rgba(51,55,27,.065);
  }
  .subscription-schedule-card .subscription-detail-media{
    width:100%;
    max-width:none;
    height:100%;
    min-height:0;
    aspect-ratio:auto;
    margin:0;
    border:0;
    border-right:1px solid var(--subscription-border);
    border-radius:0;
    box-shadow:none;
    background:var(--subscription-olive-soft);
  }
  .subscription-detail-carousel-badge{
    position:absolute;
    z-index:4;
    top:11px;
    right:11px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-height:29px;
    padding:5px 11px;
    border:1px solid rgba(82,104,24,.22);
    border-radius:999px;
    background:rgba(255,255,255,.94);
    color:#526818;
    font-size:.72rem;
    font-weight:900;
    line-height:1;
    box-shadow:0 3px 10px rgba(0,0,0,.12);
  }
  .subscription-schedule-card .subscription-detail-carousel-caption{
    left:12px;
    right:12px;
    bottom:27px;
    gap:2px;
  }
  .subscription-schedule-card .subscription-detail-carousel-caption strong{
    display:block;
    overflow:visible;
    color:#fff;
    font-size:clamp(.82rem,1.05vw,1rem);
    font-weight:900;
    line-height:1.12;
    white-space:normal;
    text-overflow:clip;
    overflow-wrap:anywhere;
  }
  .subscription-schedule-card .subscription-detail-carousel-label{
    font-size:.62rem;
    line-height:1.1;
  }
  .subscription-schedule-card .subscription-detail-carousel-dots{
    bottom:9px;
    gap:5px;
  }
  .subscription-schedule-card .subscription-detail-carousel-dot{
    width:6px;
    height:6px;
  }
  .subscription-daily-menu{
    min-width:0;
    min-height:0;
    display:flex;
    flex-direction:column;
    padding:15px 12px 14px;
    background:#fff;
  }
  .subscription-daily-menu-heading{
    display:block;
    margin:0 0 7px;
    color:var(--subscription-ink);
    font-size:.9rem;
    font-weight:900;
    line-height:1.15;
  }
  .subscription-daily-menu-list{
    min-height:0;
    flex:1 1 auto;
    display:flex;
    flex-direction:column;
    gap:5px;
  }
  .subscription-daily-menu-row{
    min-width:0;
    min-height:0;
    flex:1 1 0;
    display:grid;
    grid-template-columns:minmax(62px,.72fr) minmax(0,1.75fr);
    align-items:center;
    gap:7px;
    width:100%;
    padding:5px 7px;
    border:1px solid #e1e4d7;
    border-radius:9px;
    background:#fbfcf8;
    color:var(--subscription-ink);
    font:inherit;
    text-align:left;
    cursor:pointer;
    transition:border-color .2s ease,background .2s ease,box-shadow .2s ease,transform .2s ease;
  }
  .subscription-daily-menu-row:hover{
    border-color:#c9cfb4;
    background:#f6f8ef;
  }
  .subscription-daily-menu-row.active{
    border-color:#b9c28d;
    background:#f0f4df;
    box-shadow:inset 3px 0 0 #a12632;
    animation:subscription-detail-day-pop .32s ease both;
  }
  .subscription-daily-menu-day{
    min-width:0;
    color:var(--subscription-ink);
    font-size:clamp(.62rem,.7vw,.73rem);
    font-weight:900;
    line-height:1.1;
    overflow-wrap:anywhere;
  }
  .subscription-daily-menu-row.active .subscription-daily-menu-day{
    color:#a12632;
  }
  .subscription-daily-menu-title{
    min-width:0;
    display:block;
    overflow:visible;
    color:#555c49;
    font-size:clamp(.56rem,.62vw,.66rem);
    font-weight:760;
    line-height:1.08;
    white-space:normal;
    overflow-wrap:anywhere;
    word-break:normal;
    text-overflow:clip;
  }
  .subscription-daily-menu-row:focus-visible{
    outline:3px solid rgba(51,55,27,.22);
    outline-offset:2px;
  }

  @media(max-width:1220px){
    .subscription-product-overview{
      grid-template-columns:minmax(500px,560px) minmax(0,1fr);
      gap:30px;
      padding:30px 32px;
    }
    .subscription-schedule-card{max-width:560px}
    .subscription-daily-menu{padding:12px 10px}
    .subscription-daily-menu-list{gap:4px}
    .subscription-daily-menu-row{grid-template-columns:minmax(56px,.7fr) minmax(0,1.7fr);gap:5px;padding:4px 6px}
  }

  @media(max-width:980px){
    .subscription-product-overview{
      grid-template-columns:1fr;
      align-items:start;
      gap:24px;
    }
    .subscription-schedule-card{
      width:min(100%,650px);
      max-width:650px;
      margin:0 auto;
    }
    .subscription-product-overview .subscription-detail-copy{
      width:min(100%,760px);
      margin:0 auto;
    }
  }

  @media(max-width:700px){
    .subscription-product-overview{
      padding:16px;
      border-radius:18px;
      row-gap:12px;
    }
    .subscription-mobile-heading{
      display:block;
      width:100%;
      min-width:0;
      margin:0 0 2px;
      padding:0 2px;
    }
    .subscription-mobile-heading .subscription-detail-eyebrow{
      display:block;
      margin:0 0 6px;
      color:var(--subscription-olive);
      font-size:.68rem;
      font-weight:900;
      line-height:1.1;
      letter-spacing:.09em;
      text-transform:uppercase;
    }
    .subscription-mobile-heading h1{
      margin:0;
      color:var(--subscription-ink);
      font-size:clamp(1.55rem,6.8vw,2rem);
      font-weight:900;
      line-height:1.04;
      letter-spacing:-.035em;
      overflow-wrap:anywhere;
    }
    .subscription-product-overview .subscription-detail-copy > .subscription-detail-eyebrow,
    .subscription-product-overview .subscription-detail-copy > h1{
      display:none;
    }
    .subscription-schedule-card{
      width:100%;
      max-width:none;
      height:330px;
      aspect-ratio:auto;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      border-radius:14px;
    }
    .subscription-daily-menu{
      padding:10px 7px 9px;
    }
    .subscription-daily-menu-heading{
      margin-bottom:5px;
      font-size:.74rem;
    }
    .subscription-daily-menu-list{gap:4px}
    .subscription-daily-menu-row{
      grid-template-columns:minmax(48px,.7fr) minmax(0,1.55fr);
      gap:4px;
      padding:4px 5px;
      border-radius:7px;
    }
    .subscription-daily-menu-day{
      font-size:.57rem;
      line-height:1.05;
    }
    .subscription-daily-menu-title{
      font-size:.52rem;
      line-height:1.05;
    }
    .subscription-detail-carousel-badge{
      top:7px;
      right:7px;
      min-height:23px;
      padding:4px 7px;
      font-size:.57rem;
    }
    .subscription-schedule-card .subscription-detail-carousel-caption{
      left:8px;
      right:8px;
      bottom:22px;
    }
    .subscription-schedule-card .subscription-detail-carousel-caption strong{
      font-size:.68rem;
      line-height:1.08;
    }
    .subscription-schedule-card .subscription-detail-carousel-label{
      font-size:.52rem;
    }
  }

  @media(max-width:560px){
    .subscription-product-overview{
      grid-template-columns:1fr;
      gap:15px;
      padding:0;
      margin-bottom:18px;
      border:0;
      border-radius:0;
      background:transparent;
      box-shadow:none;
    }
    .subscription-schedule-card{
      height:320px;
      margin:0;
    }
    .subscription-product-overview .subscription-detail-copy{
      padding:0 4px;
    }
  }

  @media(max-width:390px){
    .subscription-schedule-card{height:338px}
    .subscription-daily-menu{padding-left:6px;padding-right:6px}
    .subscription-daily-menu-row{grid-template-columns:minmax(45px,.68fr) minmax(0,1.5fr);padding-left:4px;padding-right:4px}
    .subscription-daily-menu-day{font-size:.54rem}
    .subscription-daily-menu-title{font-size:.49rem}
  }


  /* Same delivery-type conflict popup used by the HomePage */
  .subscription-delivery-conflict-backdrop {
    position: fixed;
    z-index: 10050;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(28, 32, 18, .58);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .subscription-delivery-conflict-modal {
    position: relative;
    width: min(520px, 100%);
    overflow: hidden;
    border: 1px solid rgba(103, 119, 55, .28);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, rgba(223, 232, 193, .70), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #fbfcf7 100%);
    box-shadow:
      0 30px 90px rgba(25, 31, 12, .28),
      0 0 0 1px rgba(255,255,255,.72) inset;
    color: var(--subscription-ink);
    animation: subscriptionDeliveryConflictIn .22s ease-out both;
  }

  @keyframes subscriptionDeliveryConflictIn {
    from { opacity: 0; transform: translateY(12px) scale(.975); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .subscription-delivery-conflict-accent {
    height: 6px;
    background: linear-gradient(90deg, #2f3d16 0%, #647a2f 54%, #a6b56d 100%);
  }

  .subscription-delivery-conflict-body {
    padding: 24px 24px 18px;
  }

  .subscription-delivery-conflict-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    margin-bottom: 14px;
    border: 1px solid #cfd9ad;
    border-radius: 15px;
    background: #eef2df;
    color: #33421a;
    font-size: 1.55rem;
    font-weight: 950;
    box-shadow: 0 8px 20px rgba(55, 71, 25, .10);
  }

  .subscription-delivery-conflict-title {
    margin: 0;
    color: #263314;
    font-size: clamp(1.35rem, 4vw, 1.75rem);
    font-weight: 900;
    line-height: 1.12;
  }

  .subscription-delivery-conflict-copy {
    margin: 10px 0 0;
    color: #5c6450;
    font-size: .94rem;
    font-weight: 650;
    line-height: 1.55;
  }

  .subscription-delivery-conflict-rule {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    padding: 13px 14px;
    border: 1px solid #dde4c8;
    border-radius: 14px;
    background: #f4f6ec;
    color: #465225;
    font-size: .82rem;
    font-weight: 750;
    line-height: 1.45;
  }

  .subscription-delivery-conflict-rule-mark {
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #dfe7c7;
    color: #344319;
    font-size: .78rem;
    font-weight: 950;
  }

  .subscription-delivery-conflict-error {
    margin: 12px 0 0;
    padding: 10px 12px;
    border: 1px solid #ebc9c5;
    border-radius: 11px;
    background: #fff5f3;
    color: #9a3428;
    font-size: .78rem;
    font-weight: 750;
    line-height: 1.4;
  }

  .subscription-delivery-conflict-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.18fr);
    gap: 10px;
    padding: 16px 24px 24px;
    border-top: 1px solid #e5e9d8;
    background: rgba(248, 249, 243, .92);
  }

  .subscription-delivery-conflict-button {
    min-height: 48px;
    padding: 11px 14px;
    border-radius: 12px;
    font: inherit;
    font-size: .82rem;
    font-weight: 900;
    cursor: pointer;
    transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
  }

  .subscription-delivery-conflict-button:disabled {
    cursor: wait;
    opacity: .65;
  }

  .subscription-delivery-conflict-button.secondary {
    border: 1px solid #cfd6bb;
    background: #ffffff;
    color: #36421e;
  }

  .subscription-delivery-conflict-button.secondary:hover:not(:disabled) {
    background: #f1f4e8;
  }

  .subscription-delivery-conflict-button.primary {
    border: 1px solid #2e3b16;
    background: linear-gradient(180deg, #4b5d24 0%, #303c17 100%);
    color: #ffffff;
    box-shadow: 0 9px 20px rgba(48, 60, 23, .24);
  }

  .subscription-delivery-conflict-button.primary:hover:not(:disabled) {
    transform: translateY(-1px);
    background: linear-gradient(180deg, #586d29 0%, #36451a 100%);
    box-shadow: 0 12px 24px rgba(48, 60, 23, .29);
  }

  .subscription-delivery-conflict-close {
    position: absolute;
    z-index: 2;
    top: 16px;
    right: 16px;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(73, 89, 38, .16);
    border-radius: 10px;
    background: rgba(255,255,255,.82);
    color: #465225;
    font: inherit;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }

  .subscription-delivery-conflict-close:hover {
    background: #eef2df;
  }

  @media (max-width: 520px) {
    .subscription-delivery-conflict-backdrop {
      align-items: flex-end;
      padding: 12px;
    }

    .subscription-delivery-conflict-modal {
      width: 100%;
      border-radius: 22px;
    }

    .subscription-delivery-conflict-body {
      padding: 22px 18px 16px;
    }

    .subscription-delivery-conflict-copy {
      font-size: .88rem;
    }

    .subscription-delivery-conflict-actions {
      grid-template-columns: 1fr;
      padding: 14px 18px 18px;
    }

    .subscription-delivery-conflict-button.primary {
      order: 0;
    }

    .subscription-delivery-conflict-button.secondary {
      order: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-delivery-conflict-modal { animation: none; }
  }

  /* Unified subscription detail typography */
  .subscription-detail,
  .subscription-detail *,
  .subscription-detail *::before,
  .subscription-detail *::after {
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }
`;

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrow(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + 1);
  return value;
}

function planDays(plan: SubscriptionPlanCode, customDays: number): number {
  if (plan === "weekly") return 7;
  if (plan === "monthly") return 30;
  if (plan === "three_months") return 90;
  return customDays;
}

const DELIVERY_WEEKDAY_CODES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function deliveryExclusionSettings(item?: SubscriptionItemWithSchedule | null) {
  const configured = item?.delivery_exclusions;
  const excludedWeekdays = new Set(
    configured
      ? configured.excluded_weekdays || []
      : ["sunday"],
  );
  const excludedDates = new Map<string, string>(
    (configured?.excluded_dates || []).map((entry) => [
      entry.date,
      entry.reason || "No delivery",
    ] as [string, string]),
  );
  return { excludedWeekdays, excludedDates };
}

function deliveryDateExclusionReason(
  value: string,
  item?: SubscriptionItemWithSchedule | null,
): string {
  const { excludedWeekdays, excludedDates } = deliveryExclusionSettings(item);
  const exactReason = excludedDates.get(value);
  if (exactReason) return exactReason;
  const parsed = new Date(`${value}T00:00:00`);
  const weekday = DELIVERY_WEEKDAY_CODES[parsed.getDay()];
  return excludedWeekdays.has(weekday)
    ? `No delivery on ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
    : "";
}

function deliveryDateAllowed(
  value: string,
  item?: SubscriptionItemWithSchedule | null,
): boolean {
  return !deliveryDateExclusionReason(value, item);
}

function generatedDates(
  calendarDays: number,
  item?: SubscriptionItemWithSchedule | null,
): string[] {
  const dates: string[] = [];
  const current = tomorrow();
  const { excludedWeekdays, excludedDates } = deliveryExclusionSettings(item);
  let normalDeliveryCount = 0;
  for (let offset = 0; offset < calendarDays; offset += 1) {
    const value = isoDate(current);
    const weekday = DELIVERY_WEEKDAY_CODES[current.getDay()];
    if (!excludedWeekdays.has(weekday)) {
      normalDeliveryCount += 1;
      if (!excludedDates.has(value)) dates.push(value);
    }
    current.setDate(current.getDate() + 1);
  }
  for (
    let scanned = 0;
    dates.length < normalDeliveryCount && scanned < 4000;
    scanned += 1
  ) {
    const value = isoDate(current);
    if (deliveryDateAllowed(value, item)) dates.push(value);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function money(symbol: string, value: unknown): string {
  const number = Number(value || 0);
  return `${symbol}${Number.isFinite(number) ? number.toFixed(2) : "0.00"}`;
}

function choiceId(item: SubscriptionIncludedItem): string {
  return String(item.id || item.item_id || "");
}

function includedItems(
  combination: SubscriptionCombination | undefined,
): SubscriptionIncludedItem[] {
  return (
    combination?.included_catalog_items ||
    combination?.sub_items ||
    combination?.item_details ||
    []
  );
}

function scheduleEntries(
  item: SubscriptionItemWithSchedule,
): SubscriptionScheduleEntry[] {
  const schedule = item.content_schedule;
  const weekdays = (schedule?.weekday_entries || [])
    .filter((entry) => entry.is_active)
    .sort(
      (left, right) =>
        Number(left.weekday_index ?? 99) - Number(right.weekday_index ?? 99),
    );
  const exactDates = (schedule?.date_entries || [])
    .filter((entry) => entry.is_active && entry.schedule_date)
    .sort((left, right) =>
      String(left.schedule_date).localeCompare(String(right.schedule_date)),
    );
  return [...weekdays, ...exactDates];
}

function scheduleLabel(entry: SubscriptionScheduleEntry): string {
  if (entry.scope === "date" && entry.schedule_date) {
    const value = new Date(`${entry.schedule_date}T00:00:00`);
    return `Special date · ${value.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  const weekday = String(entry.weekday || "Weekly delivery");
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

const SubscriptionHeroCarousel = memo(function SubscriptionHeroCarousel({
  item,
}: {
  item: SubscriptionItemWithSchedule;
}) {
  const scheduleSlides = useMemo(() => scheduleEntries(item), [item]);
  const weekdaySlides = useMemo(
    () => scheduleSlides.filter((entry) => entry.scope === "weekday"),
    [scheduleSlides],
  );
  const fallbackSlide: SubscriptionScheduleEntry = {
    id: `${item.id}-subscription-image`,
    scope: "weekday",
    title: item.name,
    description: item.description,
    image_url: item.image_url,
    is_active: true,
  };

  const slides = weekdaySlides.length
    ? weekdaySlides
    : scheduleSlides.length
      ? scheduleSlides
      : [fallbackSlide];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [item.id]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [item.id, slides.length]);

  const visibleIndex = Math.min(activeIndex, slides.length - 1);
  const active = slides[visibleIndex];
  const imageUrl = active.image_url || item.image_url;

  return (
    <div className="subscription-schedule-card">
      <div
        className="subscription-detail-media"
        aria-label={`${item.name} schedule carousel`}
        aria-live="polite"
      >
        {imageUrl ? (
          <img
            key={`${active.id}-${visibleIndex}`}
            className="subscription-detail-carousel-image"
            src={subscriptionAssetUrl(imageUrl)}
            alt={active.title || item.name}
            loading={visibleIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={visibleIndex === 0 ? "high" : "low"}
          />
        ) : (
          <span
            className="subscription-detail-carousel-placeholder"
            aria-hidden="true"
          >
            🥤
          </span>
        )}

        <span className="subscription-detail-carousel-badge">Subscription</span>

        <div className="subscription-detail-carousel-caption">
          <span className="subscription-detail-carousel-label">
            {scheduleLabel(active)}
          </span>
          <strong>{active.title || item.name}</strong>
        </div>

        {slides.length > 1 ? (
          <div
            className="subscription-detail-carousel-dots"
            aria-label="Subscription schedule position"
          >
            {slides.map((slide, index) => (
              <button
                className={`subscription-detail-carousel-dot ${index === visibleIndex ? "active" : ""}`}
                type="button"
                aria-label={`Show ${scheduleLabel(slide)}`}
                aria-current={index === visibleIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                key={`dot-${slide.id}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="subscription-daily-menu" aria-label="Daily menu">
        <strong className="subscription-daily-menu-heading">Daily menu</strong>
        <div className="subscription-daily-menu-list">
          {slides.map((slide, index) => (
            <button
              className={`subscription-daily-menu-row ${index === visibleIndex ? "active" : ""}`}
              type="button"
              aria-label={`Show ${scheduleLabel(slide)} image`}
              aria-current={index === visibleIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              key={`menu-${slide.id}`}
            >
              <strong className="subscription-daily-menu-day">
                {scheduleLabel(slide)}
              </strong>
              <span className="subscription-daily-menu-title">
                {slide.title || item.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateFromIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const CalendarDateEditor = memo(function CalendarDateEditor({
  dates,
  minimumDate,
  exclusionReason,
  onReplace,
  activeDate,
  onActiveDateChange,
}: {
  dates: string[];
  minimumDate: string;
  exclusionReason: (value: string) => string;
  onReplace: (currentDate: string, nextDate: string) => void;
  activeDate: string | null;
  onActiveDateChange: (value: string | null) => void;
}) {
  const [viewDate, setViewDate] = useState(() =>
    dateFromIso(dates[0] || minimumDate),
  );

  useEffect(() => {
    if (activeDate && !dates.includes(activeDate)) {
      onActiveDateChange(null);
    }
  }, [activeDate, dates, onActiveDateChange]);

  useEffect(() => {
    if (activeDate) {
      setViewDate(dateFromIso(activeDate));
    }
  }, [activeDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const selectedDates = useMemo(() => new Set(dates), [dates]);
  const minimumMonth = dateFromIso(minimumDate);
  const canGoPrevious =
    viewYear > minimumMonth.getFullYear() ||
    (viewYear === minimumMonth.getFullYear() &&
      viewMonth > minimumMonth.getMonth());
  const calendarStart = new Date(viewYear, viewMonth, 1);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const value = new Date(calendarStart);
    value.setDate(calendarStart.getDate() + index);
    return value;
  });
  const minimumYear = dateFromIso(minimumDate).getFullYear();
  const maximumSelectedYear = dates.reduce(
    (maximum, value) => Math.max(maximum, dateFromIso(value).getFullYear()),
    Math.max(minimumYear, viewYear),
  );
  const years = Array.from(
    { length: Math.max(6, maximumSelectedYear - minimumYear + 3) },
    (_, index) => minimumYear + index,
  );

  function changeMonth(offset: number) {
    setViewDate(new Date(viewYear, viewMonth + offset, 1));
  }

  function chooseDate(value: Date) {
    if (!activeDate) return;
    const nextDate = isoDate(value);
    if (nextDate < minimumDate) return;
    if (exclusionReason(nextDate)) return;
    if (selectedDates.has(nextDate) && nextDate !== activeDate) return;
    onReplace(activeDate, nextDate);
    onActiveDateChange(null);
    setViewDate(new Date(value.getFullYear(), value.getMonth(), 1));
  }

  return (
    <section className="subscription-calendar">
        <div className="subscription-calendar-header">
          <button
            className="subscription-calendar-nav"
            type="button"
            aria-label="Previous month"
            disabled={!canGoPrevious}
            onClick={() => changeMonth(-1)}
          >
            ‹
          </button>
          <div className="subscription-calendar-title">
            <select
              className="subscription-calendar-select"
              aria-label="Calendar month"
              value={viewMonth}
              onChange={(event) =>
                setViewDate(
                  new Date(viewYear, Number(event.target.value), 1),
                )
              }
            >
              {MONTH_NAMES.map((name, index) => (
                <option value={index} key={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="subscription-calendar-select"
              aria-label="Calendar year"
              value={viewYear}
              onChange={(event) =>
                setViewDate(
                  new Date(Number(event.target.value), viewMonth, 1),
                )
              }
            >
              {years.map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button
            className="subscription-calendar-nav"
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            ›
          </button>
        </div>
        {activeDate ? (
          <div className="subscription-calendar-edit-banner" role="status">
            <div className="subscription-calendar-edit-copy">
              <strong>
                Editing delivery #{dates.indexOf(activeDate) + 1}
              </strong>
              <span>
                Current date: {activeDate} · Select the replacement below
              </span>
            </div>
            <button
              className="subscription-calendar-cancel"
              type="button"
              onClick={() => onActiveDateChange(null)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="subscription-calendar-idle">
            Select Edit beside a delivery date to make a change.
          </div>
        )}
        <div className="subscription-calendar-weekdays">
          {WEEK_DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="subscription-calendar-grid">
          {cells.map((date) => {
            const value = isoDate(date);
            const selected = selectedDates.has(value);
            const active = value === activeDate;
            const duplicate = selected && !active;
            const unavailableReason = exclusionReason(value);
            const disabled =
              !activeDate ||
              value < minimumDate ||
              duplicate ||
              Boolean(unavailableReason);
            return (
              <button
                className={[
                  "subscription-calendar-day",
                  date.getMonth() !== viewMonth ? "other" : "",
                  selected && !activeDate ? "selected" : "",
                  active ? "edit-target" : "",
                  unavailableReason ? "excluded" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="button"
                key={value}
                disabled={disabled}
                aria-label={
                  unavailableReason
                    ? `${value} unavailable: ${unavailableReason}`
                    : `${active ? "Current date being edited" : selected ? "Existing delivery date" : "Choose"} ${value}`
                }
                title={unavailableReason || undefined}
                onClick={() => chooseDate(date)}
              >
                <span className="subscription-calendar-day-number">
                  {date.getDate()}
                </span>
                {selected && !activeDate ? (
                  <span className="subscription-calendar-dot" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="subscription-calendar-help">
          Choose a delivery from the list, then select its replacement date in
          the calendar. Dates before tomorrow, dates already used, excluded
          weekdays and admin-blocked festival or holiday dates are disabled.
        </div>
    </section>
  );
});

const DeliveryDateList = memo(function DeliveryDateList({
  dates,
  activeDate,
  onEdit,
}: {
  dates: string[];
  activeDate: string | null;
  onEdit: (date: string) => void;
}) {
  return (
    <section className="subscription-date-list">
      <p className="subscription-date-list-title">
        Delivery dates ({dates.length}) — choose a delivery to edit.
      </p>

      {dates.map((date, index) => (
        <div
          className={[
            "subscription-date-choice",
            date === activeDate ? "active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={`${date}-${index}`}
        >
          <span className="subscription-date-number">{index + 1}</span>
          <strong className="subscription-date-value">{date}</strong>
          <button
            className="subscription-date-edit"
            type="button"
            aria-pressed={date === activeDate}
            onClick={() => onEdit(date)}
          >
            {date === activeDate ? "Editing" : "Edit"}
          </button>
        </div>
      ))}
    </section>
  );
});


type SubscriptionCartLineLike = {
  is_subscription?: boolean;
  item_type?: string;
  quantity?: number;
};

function cartLineIsSubscription(row: SubscriptionCartLineLike): boolean {
  return (
    Boolean(row.is_subscription) ||
    String(row.item_type || "").trim().toLowerCase() === "subscription"
  );
}

function cartHasNonSubscriptionItems(cart: unknown): boolean {
  const items =
    cart &&
    typeof cart === "object" &&
    Array.isArray((cart as { items?: unknown[] }).items)
      ? (cart as { items: unknown[] }).items
      : [];

  return items.some((rawRow) => {
    if (!rawRow || typeof rawRow !== "object") return false;
    const row = rawRow as SubscriptionCartLineLike;
    const quantity = Number(row.quantity ?? 1);
    if (Number.isFinite(quantity) && quantity <= 0) return false;
    return !cartLineIsSubscription(row);
  });
}

function isMixedDeliveryTypeConflict(error: unknown): boolean {
  const code =
    error instanceof SubscriptionApiError
      ? String((error as SubscriptionApiError).code || "").trim().toUpperCase()
      : error instanceof ApiRequestError
        ? String((error as ApiRequestError).code || "").trim().toUpperCase()
        : "";

  const message =
    error instanceof Error ? String(error.message || "").toLowerCase() : "";

  return (
    code === "MIXED_FULFILLMENT_NOT_ALLOWED" ||
    code.includes("DELIVERY_TYPE") ||
    code.includes("CART_TYPE") ||
    message.includes("one delivery type at a time") ||
    message.includes("different delivery type") ||
    message.includes("another delivery type") ||
    message.includes("clear the current cart") ||
    (message.includes("delivery type") && message.includes("cart"))
  );
}

export function SubscriptionItemPage() {
  const { itemId = "" } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const cacheKey = useMemo(() => safeItemId(itemId), [itemId]);
  const firstCached = useMemo(
    () => readSubscriptionDetailCache(cacheKey),
    [cacheKey],
  );
  const [detailState, setDetailState] = useState<{
    key: string;
    data: SubscriptionDetailResponse;
    verified: boolean;
  } | null>(() => firstCached ? {
    key: cacheKey,
    data: firstCached.data,
    verified: firstCached.verified && Date.now() - firstCached.savedAt < SUBSCRIPTION_DETAIL_FRESH_MS,
  } : null);
  const activeDetail = detailState?.key === cacheKey ? detailState : null;
  const payload: SubscriptionCatalogPayload | null = activeDetail?.data.payload || null;
  const category: SubscriptionCategory | null = activeDetail?.data.category || null;
  const item: SubscriptionItem | null = activeDetail?.data.item || null;
  const readyToAdd = Boolean(activeDetail?.verified);
  const [loading, setLoading] = useState(!firstCached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [deliveryTypeConflictOpen, setDeliveryTypeConflictOpen] = useState(false);
  const [deliveryTypeConflictBusy, setDeliveryTypeConflictBusy] = useState(false);
  const [deliveryTypeConflictError, setDeliveryTypeConflictError] = useState("");

  const initialItem = firstCached?.data.item;
  const initialMinDays = Math.max(1, Number(initialItem?.minimum_custom_days || 1));
  const initialPlan = initialItem?.allowed_plan_codes?.[0] || "weekly";
  const [sellerId, setSellerId] = useState(initialItem?.available_sellers?.[0]?.seller_id || "");
  const [combinationId, setCombinationId] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlanCode>(initialPlan);
  const [customDays, setCustomDays] = useState(initialMinDays);
  const [customDaysInput, setCustomDaysInput] = useState(String(initialMinDays));
  const [quantity, setQuantity] = useState(1);
  const [dates, setDates] = useState<string[]>(() => initialItem
    ? generatedDates(planDays(initialPlan, initialMinDays), initialItem as SubscriptionItemWithSchedule)
    : []);
  const [complimentaryIds, setComplimentaryIds] = useState<string[]>([]);
  const [activeDeliveryDate, setActiveDeliveryDate] = useState<string | null>(null);
  // Avoid resetting the customer's dates/quantity when a background refresh completes.
  const formInitializedKeyRef = useRef(firstCached ? cacheKey : "");

  const initializeFormFor = useCallback((key: string, response: SubscriptionDetailResponse) => {
    if (formInitializedKeyRef.current === key) return;
    formInitializedKeyRef.current = key;
    const freshItem = response.item;
    const minimum = Math.max(1, Number(freshItem.minimum_custom_days || 1));
    const firstPlan = freshItem.allowed_plan_codes?.[0] || "weekly";
    setCustomDays(minimum);
    setCustomDaysInput(String(minimum));
    setPlan(firstPlan);
    setSellerId(freshItem.available_sellers?.[0]?.seller_id || "");
    setCombinationId("");
    setComplimentaryIds([]);
    setActiveDeliveryDate(null);
    setQuantity(1);
    setDates(generatedDates(planDays(firstPlan, minimum), freshItem as SubscriptionItemWithSchedule));
  }, []);

  useEffect(() => {
    if (!deliveryTypeConflictOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deliveryTypeConflictBusy) {
        setDeliveryTypeConflictOpen(false);
        setDeliveryTypeConflictError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deliveryTypeConflictOpen, deliveryTypeConflictBusy]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    const cached = readSubscriptionDetailCache(cacheKey);
    const fresh = Boolean(cached?.verified && Date.now() - cached.savedAt < SUBSCRIPTION_DETAIL_FRESH_MS);
    if (cached) {
      setDetailState({ key: cacheKey, data: cached.data, verified: fresh });
      initializeFormFor(cacheKey, cached.data);
      setLoading(false);
    } else {
      setDetailState(null);
      setLoading(true);
    }
    if (fresh) { setRefreshing(false); return () => { cancelled = true; }; }
    setRefreshing(Boolean(cached));
    void requestSubscriptionDetailOnce(cacheKey)
      .then((result) => {
        if (cancelled) return;
        initializeFormFor(cacheKey, result);
        setDetailState({ key: cacheKey, data: result, verified: true });
        setError("");
      })
      .catch((unknownError) => {
        if (cancelled) return;
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unable to load this subscription. Please try again.",
        );
        // Cached pricing remains visible, but buying is disabled until verified.
        if (cached) setDetailState({ key: cacheKey, data: cached.data, verified: false });
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setRefreshing(false); }
      });
    return () => { cancelled = true; };
  }, [cacheKey, initializeFormFor]);

  const availableCombinations = useMemo(
    () =>
      (item?.catalog_combinations || []).filter((combination) =>
        (combination.available_seller_ids || []).includes(sellerId),
      ),
    [item, sellerId],
  );

  useEffect(() => {
    if (!availableCombinations.length) {
      setCombinationId("");
      return;
    }
    if (
      !availableCombinations.some(
        (combination) => combination.id === combinationId,
      )
    ) {
      setCombinationId(availableCombinations[0].id);
    }
  }, [availableCombinations, combinationId]);

  useEffect(() => {
    setComplimentaryIds((current) =>
      current.filter((id) => {
        const choice = (item?.complimentary_choices || []).find(
          (candidate) => choiceId(candidate) === id,
        );
        return (
          choice &&
          (!choice.available_seller_ids?.length ||
            choice.available_seller_ids.includes(sellerId))
        );
      }),
    );
  }, [item, sellerId]);

  const minimumCustomDays = Math.max(
    1,
    Number(item?.minimum_custom_days || 1),
  );
  const parsedCustomDays = /^\d+$/.test(customDaysInput)
    ? Number(customDaysInput)
    : Number.NaN;
  const customDaysInputValid =
    plan !== "custom" ||
    (Number.isFinite(parsedCustomDays) &&
      parsedCustomDays >= minimumCustomDays &&
      parsedCustomDays <= 365);
  const customDaysControlValue = Number.isFinite(parsedCustomDays)
    ? parsedCustomDays
    : customDays;
  const subscriptionCalendarDays = planDays(plan, customDays);
  const expectedDeliveryCount = useMemo(
    () => generatedDates(subscriptionCalendarDays, item as SubscriptionItemWithSchedule | null).length,
    [subscriptionCalendarDays, item],
  );
  const minimumDate = useMemo(() => isoDate(tomorrow()), [cacheKey]);
  const exclusionSettings = useMemo(
    () => deliveryExclusionSettings(item as SubscriptionItemWithSchedule | null),
    [item],
  );
  const exclusionReason = useCallback((value: string): string => {
    const excluded = exclusionSettings.excludedDates.get(value);
    if (excluded) return excluded;
    const date = new Date(`${value}T00:00:00`);
    const weekday = DELIVERY_WEEKDAY_CODES[date.getDay()];
    return exclusionSettings.excludedWeekdays.has(weekday)
      ? `No delivery on ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
      : "";
  }, [exclusionSettings]);
  const symbol = payload?.currency_symbol || "₹";
  const selectedCombination = availableCombinations.find(
    (combination) => combination.id === combinationId,
  );
  const complimentaryConfig = item?.complimentary_config || {
    max_items: 0,
    budget: 0,
  };
  const complimentaryChoices = (item?.complimentary_choices || []).filter(
    (choice) =>
      !choice.available_seller_ids?.length ||
      choice.available_seller_ids.includes(sellerId),
  );
  const complimentaryValue = complimentaryIds.reduce((total, id) => {
    const choice = complimentaryChoices.find(
      (candidate) => choiceId(candidate) === id,
    );
    return total + Number(choice?.catalog_price || 0);
  }, 0);
  const complimentaryValid =
    complimentaryIds.length <= Number(complimentaryConfig.max_items || 0) &&
    complimentaryValue <= Number(complimentaryConfig.budget || 0);
  const uniqueDates = new Set(dates);
  const datesValid =
    dates.length === expectedDeliveryCount &&
    dates.length > 0 &&
    uniqueDates.size === dates.length &&
    dates.every(
      (date) =>
        date >= minimumDate && !exclusionReason(date),
    );
  const unitPrice =
    plan === "custom"
      ? Number(item?.plan_prices?.custom_per_day || 0) * dates.length
      : Number(item?.plan_prices?.[plan] || 0);
  const total = unitPrice * quantity;

  function commitCustomDays(nextCustom: number) {
    const safeCustom = Math.max(
      minimumCustomDays,
      Math.min(365, Number.isFinite(nextCustom) ? nextCustom : minimumCustomDays),
    );
    setCustomDays(safeCustom);
    setCustomDaysInput(String(safeCustom));
    setDates(
      generatedDates(
        safeCustom,
        item as SubscriptionItemWithSchedule | null,
      ),
    );
  }

  function regenerate(nextPlan: SubscriptionPlanCode, nextCustom = customDays) {
    const safeCustom = Math.max(
      minimumCustomDays,
      Math.min(365, nextCustom || minimumCustomDays),
    );
    setPlan(nextPlan);
    setCustomDays(safeCustom);
    if (nextPlan === "custom") {
      setCustomDaysInput(String(safeCustom));
    }
    setDates(
      generatedDates(
        planDays(nextPlan, safeCustom),
        item as SubscriptionItemWithSchedule | null,
      ),
    );
  }

  function handleCustomDaysChange(rawValue: string) {
    // Keep the field editable while the user clears/retypes the number.
    // Do not immediately force the configured minimum back into the input.
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 3);
    setCustomDaysInput(digitsOnly);

    if (!digitsOnly) return;

    const nextValue = Number(digitsOnly);
    if (nextValue < minimumCustomDays || nextValue > 365) return;

    setCustomDays(nextValue);
    setDates(
      generatedDates(
        nextValue,
        item as SubscriptionItemWithSchedule | null,
      ),
    );
  }

  function finishCustomDaysEditing() {
    commitCustomDays(parsedCustomDays);
  }

  function adjustCustomDays(change: number) {
    if (Number.isFinite(parsedCustomDays) && parsedCustomDays < minimumCustomDays) {
      commitCustomDays(minimumCustomDays);
      return;
    }

    const base = Number.isFinite(parsedCustomDays)
      ? parsedCustomDays
      : customDays;
    commitCustomDays(base + change);
  }

  const editDate = useCallback((currentDate: string, value: string) => {
    setDates((current) => current.map((date) =>
      date === currentDate ? value : date,
    ).sort());
  }, []);

  function toggleComplimentary(id: string) {
    setComplimentaryIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function currentSubscriptionCartRequest(csrfToken: string) {
    if (!item || !payload) return null;

    return {
      item_id: item.id,
      combination_id: combinationId,
      seller_id: sellerId,
      plan_code: plan,
      custom_days: plan === "custom" ? customDays : undefined,
      start_date: isoDate(tomorrow()),
      quantity,
      selected_delivery_dates: [...dates].sort(),
      complimentary_item_ids: [...complimentaryIds],
      csrf_token: csrfToken,
      subscription_csrf_token: payload.subscription_csrf_token,
    };
  }

  function finishSubscriptionCartAdd(message?: string) {
    const successMessage = message || "Subscription added to cart.";
    setDeliveryTypeConflictOpen(false);
    setDeliveryTypeConflictError("");
    setSuccess(successMessage);
    window.dispatchEvent(new Event("cart-updated"));
    navigate("/cart", {
      state: { message: successMessage },
    });
  }

  function keepExistingCart() {
    if (deliveryTypeConflictBusy) return;
    setDeliveryTypeConflictOpen(false);
    setDeliveryTypeConflictError("");
  }

  async function clearCartAndAddSubscription() {
    if (!item || !payload || !readyToAdd || deliveryTypeConflictBusy) return;

    setDeliveryTypeConflictBusy(true);
    setDeliveryTypeConflictError("");
    setError("");
    setSuccess("");

    try {
      let liveCart = await getCart();
      let csrfToken = String(liveCart.csrf_token || payload.csrf_token || "");

      let clearedCart;
      try {
        clearedCart = await clearCart(csrfToken);
      } catch (clearError) {
        if (
          clearError instanceof ApiRequestError &&
          String(clearError.code || "").toUpperCase() === "CSRF_FAILED"
        ) {
          liveCart = await getCart();
          csrfToken = String(liveCart.csrf_token || payload.csrf_token || "");
          clearedCart = await clearCart(csrfToken);
        } else {
          throw clearError;
        }
      }

      const request = currentSubscriptionCartRequest(
        String(clearedCart.csrf_token || csrfToken),
      );
      if (!request) {
        throw new Error("Subscription information is unavailable.");
      }

      const result = await addSubscriptionToCart(request);
      finishSubscriptionCartAdd(result.message);
    } catch (unknownError) {
      setDeliveryTypeConflictError(
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to clear the cart and add this subscription. Please try again.",
      );
    } finally {
      setDeliveryTypeConflictBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !payload || !readyToAdd) {
      setError("Checking the latest subscription details. Please try again when the refresh completes.");
      return;
    }

    setError("");
    setSuccess("");
    setDeliveryTypeConflictError("");

    if (plan === "custom" && !customDaysInputValid) {
      setError(
        `Enter custom days between ${minimumCustomDays} and 365.`,
      );
      return;
    }

    if (!datesValid) {
      setError(
        `Select exactly ${expectedDeliveryCount} available delivery dates. Administrator-excluded weekdays and dates cannot be selected.`,
      );
      return;
    }

    if (!complimentaryValid) {
      setError("Complimentary selection exceeds the allowed count or value.");
      return;
    }

    if (availableCombinations.length && !combinationId) {
      setError("Select a subscription combination.");
      return;
    }

    setBusy(true);
    try {
      // Subscription cart writes use a different API route than HomePage product
      // writes. Check the authoritative commerce cart first so a subscription can
      // never silently create a mixed One-Day / Instant / Subscription cart.
      const liveCart = await getCart();

      if (cartHasNonSubscriptionItems(liveCart)) {
        setDeliveryTypeConflictOpen(true);
        return;
      }

      const request = currentSubscriptionCartRequest(
        String(liveCart.csrf_token || payload.csrf_token || ""),
      );
      if (!request) return;

      const result = await addSubscriptionToCart(request);
      finishSubscriptionCartAdd(result.message);
    } catch (unknownError) {
      // Backend guard remains the source-of-truth fallback for race conditions
      // where the cart changes after the pre-check.
      if (isMixedDeliveryTypeConflict(unknownError)) {
        setError("");
        setDeliveryTypeConflictOpen(true);
        return;
      }

      setError(
        unknownError instanceof SubscriptionApiError
          ? unknownError.message
          : unknownError instanceof Error
            ? unknownError.message
            : "Unable to add this subscription to the cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  if ((loading || !error) && !item) {
    return (
      <>
        <style>{STYLES}</style>
        <main className="subscription-detail">
          <div className="subscription-detail-container" role="status" aria-label="Loading subscription details">
            <div className="subscription-loading-preview">
              <div className="subscription-skeleton-image" aria-hidden="true" />
              <div className="subscription-skeleton-copy" aria-hidden="true">
                <div className="subscription-skeleton-line" />
                <div className="subscription-skeleton-line short" />
                <div className="subscription-skeleton-line" />
                <div className="subscription-skeleton-line short" />
              </div>
            </div>
            <div className="subscription-loading">Loading subscription details…</div>
          </div>
        </main>
      </>
    );
  }

  if (!item || !category) {
    return (
      <>
        <style>{STYLES}</style>
        <main className="subscription-detail">
          <div className="subscription-alert">{error}</div>
          <Link className="subscription-detail-link" to="/subscriptions">
            ← Back to subscriptions
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <main className="subscription-detail">
        <div className="subscription-detail-container">
          <div className="subscription-detail-top">
            <Link className="subscription-detail-link" to="/subscriptions">
              ← Back to subscriptions
            </Link>
            <Link className="subscription-detail-link" to="/cart">
              View cart
            </Link>
          </div>
          <div className="subscription-detail-layout">
            <form
              className="subscription-detail-card subscription-form"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <section
                className="subscription-product-overview"
                aria-label={`${item.name} subscription overview`}
              >
                <div className="subscription-mobile-heading">
                  <span className="subscription-detail-eyebrow">
                    {category.name}
                  </span>
                  <h1>{item.name}</h1>
                </div>

                <SubscriptionHeroCarousel
                  item={item as SubscriptionItemWithSchedule}
                />

                <div className="subscription-detail-copy">
                  <span className="subscription-detail-eyebrow">
                    {category.name}
                  </span>
                  <h1>{item.name}</h1>
                  <p>{item.description}</p>

                  {(item as SubscriptionItemWithSchedule).detailed_description ? (
                    <div className="subscription-detailed-description">
                      {(item as SubscriptionItemWithSchedule).detailed_description}
                    </div>
                  ) : null}

                  <p>
                    <strong>{item.unit_label}</strong>
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>

                  <div className="subscription-price-grid">
                    <div className="subscription-price">
                      Weekly
                      <strong>{money(symbol, item.plan_prices.weekly)}</strong>
                    </div>
                    <div className="subscription-price">
                      Monthly
                      <strong>{money(symbol, item.plan_prices.monthly)}</strong>
                    </div>
                  </div>
                </div>

              </section>
              {refreshing ? (
                <div className="subscription-loading" role="status" aria-live="polite">
                  Checking current availability and prices…
                </div>
              ) : null}
              {error ? <div className="subscription-alert" role="alert">{error}</div> : null}
              {success ? (
                <div className="subscription-alert subscription-success">
                  {success}
                </div>
              ) : null}

              <div className="subscription-form-grid">
                {availableCombinations.length ? (
                  <div className="subscription-field subscription-full">
                    <span className="subscription-label">
                      Included subscription combination
                    </span>
                    <div className="subscription-option-list">
                      {availableCombinations.map((combination) => (
                        <label
                          className="subscription-option"
                          key={combination.id}
                        >
                          <input
                            type="radio"
                            name="combination"
                            value={combination.id}
                            checked={combinationId === combination.id}
                            onChange={() => setCombinationId(combination.id)}
                          />
                          <span>
                            <strong>{combination.name}</strong>
                            <small>{combination.description}</small>
                            <span className="subscription-items">
                              {includedItems(combination).map(
                                (included, index) => (
                                  <span
                                    className="subscription-item-row"
                                    key={`${choiceId(included)}-${index}`}
                                  >
                                    <span>{included.name}</span>
                                    <strong>
                                      {included.unit_label || "Item"}
                                      {Number(included.quantity || 1) > 1
                                        ? ` × ${included.quantity}`
                                        : ""}
                                    </strong>
                                  </span>
                                ),
                              )}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="subscription-field">
                  <label htmlFor="subscription-plan">Plan</label>
                  <select
                    id="subscription-plan"
                    className="subscription-input"
                    value={plan}
                    onChange={(event) =>
                      regenerate(event.target.value as SubscriptionPlanCode)
                    }
                  >
                    {item.allowed_plan_codes.map((code) => (
                      <option value={code} key={code}>
                        {code === "three_months"
                          ? "Three months"
                          : code[0].toUpperCase() +
                          code.slice(1).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {plan === "custom" ? (
                  <div className="subscription-field">
                    <label htmlFor="custom-days">
                      Custom subscription period in calendar days (minimum {minimumCustomDays})
                    </label>
                    <div className="subscription-number-stepper">
                      <button
                        className="subscription-number-stepper-button"
                        type="button"
                        aria-label="Decrease custom subscription days"
                        disabled={customDaysControlValue <= minimumCustomDays}
                        onClick={() => adjustCustomDays(-1)}
                      >
                        −
                      </button>
                      <input
                        id="custom-days"
                        className="subscription-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={customDaysInput}
                        aria-invalid={!customDaysInputValid}
                        onChange={(event) =>
                          handleCustomDaysChange(event.target.value)
                        }
                        onBlur={finishCustomDaysEditing}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            adjustCustomDays(1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            adjustCustomDays(-1);
                          } else if (event.key === "Enter") {
                            event.preventDefault();
                            finishCustomDaysEditing();
                          }
                        }}
                      />
                      <button
                        className="subscription-number-stepper-button"
                        type="button"
                        aria-label="Increase custom subscription days"
                        disabled={customDaysControlValue >= 365}
                        onClick={() => adjustCustomDays(1)}
                      >
                        +
                      </button>
                    </div>
                    <span
                      className={`subscription-custom-days-help ${
                        customDaysInputValid ? "" : "invalid"
                      }`}
                    >
                      {customDaysInputValid
                        ? `Choose ${minimumCustomDays}–365 days. You can type a number or use − / +.`
                        : `Enter at least ${minimumCustomDays} days and no more than 365.`}
                    </span>
                  </div>
                ) : null}

                <div className="subscription-field">
                  <label htmlFor="subscription-quantity">Quantity</label>
                  <input
                    id="subscription-quantity"
                    className="subscription-input"
                    type="number"
                    min={1}
                    max={25}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Math.max(1, Math.min(25, Number(event.target.value || 1))),
                      )
                    }
                  />
                </div>

                <div className="subscription-field subscription-full">
                  <span className="subscription-label">
                    Delivery calendar ({dates.length} selected dates)
                  </span>

                  <div className="subscription-calendar-layout">
                    <CalendarDateEditor
                      dates={dates}
                      minimumDate={minimumDate}
                      exclusionReason={exclusionReason}
                      onReplace={editDate}
                      activeDate={activeDeliveryDate}
                      onActiveDateChange={setActiveDeliveryDate}
                    />

                    <DeliveryDateList
                      dates={dates}
                      activeDate={activeDeliveryDate}
                      onEdit={setActiveDeliveryDate}
                    />

                    <aside
                      className="subscription-plan-panel"
                      aria-label="Delivery and pricing summary"
                    >
                      <span className="subscription-plan-panel-eyebrow">
                        Delivery & pricing
                      </span>
                      <h3>Your plan at a glance</h3>
                      <p className="subscription-plan-panel-description">
                        Review the plan, deliveries, quantity and total.
                      </p>

                      <div className="subscription-plan-panel-grid">
                        <div className="subscription-plan-panel-item">
                          <span>Plan</span>
                          <strong>{plan.replace("_", " ")}</strong>
                        </div>
                        <div className="subscription-plan-panel-item">
                          <span>Deliveries</span>
                          <strong>{dates.length}</strong>
                        </div>
                        <div className="subscription-plan-panel-item">
                          <span>Plan price</span>
                          <strong>{money(symbol, unitPrice)}</strong>
                        </div>
                        <div className="subscription-plan-panel-item">
                          <span>Quantity</span>
                          <strong>{quantity}</strong>
                        </div>
                        <div className="subscription-plan-panel-item subscription-plan-panel-total">
                          <span>Total</span>
                          <strong>{money(symbol, total)}</strong>
                        </div>
                      </div>

                      <button
                        className="subscription-submit"
                        type="submit"
                        disabled={
                          busy ||
                          !readyToAdd ||
                          !sellerId ||
                          !customDaysInputValid ||
                          !datesValid ||
                          !complimentaryValid ||
                          (availableCombinations.length > 0 && !combinationId)
                        }
                      >
                        {busy ? "Adding subscription…" : !readyToAdd ? "Checking availability…" : "Add subscription to cart"}
                      </button>
                    </aside>
                  </div>
                </div>

                {Number(complimentaryConfig.max_items || 0) > 0 ? (
                  <div className="subscription-field subscription-full">
                    <span className="subscription-label">
                      Choose complimentary items — up to{" "}
                      {complimentaryConfig.max_items}, maximum value{" "}
                      {money(symbol, complimentaryConfig.budget)}
                    </span>
                    <div className="subscription-option-list">
                      {complimentaryChoices.map((choice) => {
                        const id = choiceId(choice);
                        return (
                          <label className="subscription-option" key={id}>
                            <input
                              type="checkbox"
                              checked={complimentaryIds.includes(id)}
                              onChange={() => toggleComplimentary(id)}
                            />
                            <span>
                              <strong>{choice.name}</strong>
                              <small>
                                {choice.unit_label || "Item"} · value{" "}
                                {money(symbol, choice.catalog_price)}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

            </form>
          </div>
        </div>
      </main>

      {deliveryTypeConflictOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="subscription-delivery-conflict-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  !deliveryTypeConflictBusy
                ) {
                  keepExistingCart();
                }
              }}
            >
              <section
                className="subscription-delivery-conflict-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="subscription-delivery-conflict-title"
                aria-describedby="subscription-delivery-conflict-copy"
              >
                <div
                  className="subscription-delivery-conflict-accent"
                  aria-hidden="true"
                />

                <button
                  className="subscription-delivery-conflict-close"
                  type="button"
                  aria-label="Close"
                  disabled={deliveryTypeConflictBusy}
                  onClick={keepExistingCart}
                >
                  ×
                </button>

                <div className="subscription-delivery-conflict-body">
                  <div
                    className="subscription-delivery-conflict-icon"
                    aria-hidden="true"
                  >
                    !
                  </div>

                  <h2
                    className="subscription-delivery-conflict-title"
                    id="subscription-delivery-conflict-title"
                  >
                    Different delivery type
                  </h2>

                  <p
                    className="subscription-delivery-conflict-copy"
                    id="subscription-delivery-conflict-copy"
                  >
                    Your cart already contains items from another delivery type.
                    To add this subscription, clear the current cart first.
                  </p>

                  <div className="subscription-delivery-conflict-rule">
                    <span
                      className="subscription-delivery-conflict-rule-mark"
                      aria-hidden="true"
                    >
                      i
                    </span>
                    <span>
                      Subscription, One-Day Delivery, and Instant Delivery are
                      checked out separately. Items from the same delivery type
                      can still be added together.
                    </span>
                  </div>

                  {deliveryTypeConflictError ? (
                    <p
                      className="subscription-delivery-conflict-error"
                      role="alert"
                    >
                      {deliveryTypeConflictError}
                    </p>
                  ) : null}
                </div>

                <div className="subscription-delivery-conflict-actions">
                  <button
                    className="subscription-delivery-conflict-button secondary"
                    type="button"
                    disabled={deliveryTypeConflictBusy}
                    onClick={keepExistingCart}
                  >
                    Keep Existing Cart
                  </button>

                  <button
                    className="subscription-delivery-conflict-button primary"
                    type="button"
                    disabled={deliveryTypeConflictBusy}
                    onClick={() => void clearCartAndAddSubscription()}
                  >
                    {deliveryTypeConflictBusy
                      ? "Clearing Cart…"
                      : "Clear Cart & Add Subscription"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default SubscriptionItemPage;
