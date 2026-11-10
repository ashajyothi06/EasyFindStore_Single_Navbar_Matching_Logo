import {
  memo,
  startTransition,
  type ChangeEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";


import { rememberCatalogLocation, setCurrentLocation } from "../lib/api";
import { getJwtAuthIdentity, notifyJwtAuthChanged } from "../lib/jwtAuth";
import {
  getBrowserCoordinates,
  getDeliveryLocationState,
  LocationApiError,
  setSavedDeliveryLocation,
} from "../lib/locationApi";
import {
  getSubscriptionCatalog,
  subscriptionAssetUrl,
  SubscriptionApiError,
  type SubscriptionCatalogPayload,
  type SubscriptionItem,
} from "../lib/subscriptionApi";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  MapPin,
  Search,
} from "lucide-react";

// Self-contained page styles. No separate SubscriptionsPage.css file is needed.
// Declared once at module scope, so React reuses the same style text on re-renders.
const SUBSCRIPTIONS_PAGE_STYLES = String.raw`@import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .subscriptions-page{--subscriptions-olive:#33371b;--subscriptions-olive-hover:#454b24;--subscriptions-olive-soft:#eef0e6;--subscriptions-accent:#a12632;--subscriptions-accent-soft:#fff2f2;--subscriptions-unit:#526818;--subscriptions-unit-soft:#f0f4df;--subscriptions-ink:#242815;--subscriptions-muted:#626856;--subscriptions-border:#d9ddcc;width:100%;padding:40px 0 80px;background:#f7f7f2;color:var(--subscriptions-ink);font-family:"Nunito",Arial,Helvetica,sans-serif}
  .subscriptions-page-container{   width:100%;padding-left:clamp(18px,4vw,64px);padding-right:clamp(18px,4vw,64px);}
  .subscriptions-mode-selector{
    position:fixed;
    top:102px;
    left:clamp(18px,4vw,64px);
    right:clamp(18px,4vw,64px);
    z-index:950;
    width:auto;
    margin:0;
    /* REAL desktop spacing above the filter/tabs line */
    padding:12px 0 0;
    border:0;
    background:#fff;
    box-shadow:0 5px 14px rgba(51,55,27,.08);
  }
  .subscriptions-mode-selector::before{
    content:"";
    position:absolute;
    left:calc(-1 * clamp(18px,4vw,64px));
    right:calc(-1 * clamp(18px,4vw,64px));
    bottom:100%;
    height:12px;
    background:#fff;
    pointer-events:none;
  }
  .subscriptions-mode-selector + .subscriptions-location{
    margin-top:90px;
  }
  .subscriptions-mode-tabs{display:flex;width:100%;align-items:flex-end;justify-content:center;gap:20px;overflow-x:auto;border-bottom:2px solid var(--subscriptions-olive);scrollbar-width:none}
  .subscriptions-mode-tabs::-webkit-scrollbar{display:none}
  .subscriptions-mode-tab{display:flex;min-height:46px;flex:0 0 auto;align-items:center;justify-content:center;margin:0 0 -2px;padding:10px 22px 12px;border:2px solid transparent;border-bottom-color:var(--subscriptions-olive);border-radius:18px 18px 0 0;background:transparent;color:var(--subscriptions-muted);font:inherit;font-size:.92rem;font-weight:800;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .2s ease,color .2s ease}
  .subscriptions-mode-tab:hover{border-color:transparent;border-bottom-color:var(--subscriptions-olive);background:var(--subscriptions-olive-soft);color:var(--subscriptions-olive)}
  .subscriptions-mode-tab.active,.subscriptions-mode-tab.active:hover{position:relative;z-index:1;border-color:var(--subscriptions-olive);border-bottom-color:#fff;background:#fff;color:var(--subscriptions-olive)}
  .subscriptions-mode-tab:focus-visible{outline:3px solid rgba(51,55,27,.22);outline-offset:2px}
  .subscriptions-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 17px;border:1px solid var(--subscriptions-border);border-radius:12px;background:#fff;color:var(--subscriptions-ink);font-weight:800;text-decoration:none;cursor:pointer;transition:background .2s ease,border-color .2s ease,color .2s ease,transform .2s ease}
  .subscriptions-button.primary{border-color:var(--subscriptions-olive);background:var(--subscriptions-olive);color:#fff}
  .subscriptions-button:not(.primary):hover{border-color:var(--subscriptions-olive);background:var(--subscriptions-olive-soft);color:var(--subscriptions-olive)}
  .subscriptions-button.primary:hover{border-color:var(--subscriptions-olive-hover);background:var(--subscriptions-olive-hover)}
  .subscriptions-button:focus-visible,.subscriptions-location-select:focus-visible{outline:3px solid rgba(51,55,27,.22);outline-offset:2px}
  .subscriptions-button:disabled{cursor:not-allowed;opacity:.6}
  .subscriptions-location{display:block;margin:18px 0;padding:16px 18px;border:1px solid var(--subscriptions-border);border-radius:16px;background:#fff}
  .subscriptions-location strong{display:block;margin-bottom:4px}.subscriptions-location span{color:var(--subscriptions-muted);font-size:.87rem}
  .subscriptions-location-controls{display:flex;width:100%;min-width:0;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}
  .subscriptions-location-select{min-width:min(330px,34vw);min-height:44px;padding:9px 36px 9px 12px;border:1px solid var(--subscriptions-border);border-radius:11px;background:#f7f7f2;color:var(--subscriptions-ink);font:inherit;font-size:.82rem;font-weight:730}
  .subscriptions-location-select:disabled{cursor:wait;opacity:.65}
  .subscriptions-location-message{display:block!important;margin-top:5px;color:var(--subscriptions-olive)!important;font-size:.75rem!important;font-weight:720}
  .subscriptions-location-message.error{color:#b42332!important}
  .subscriptions-alert{margin:18px 0;padding:14px 16px;border-radius:13px;background:#fff1f1;color:#a12632}
  .subscriptions-category{margin-top:26px;content-visibility:auto;contain-intrinsic-size:auto 760px}.subscriptions-category-heading{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:12px}
  .subscriptions-category h2{margin:0;font-size:1.45rem}.subscriptions-category p{margin:3px 0 0;color:var(--subscriptions-muted);font-size:.88rem}
  .subscriptions-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;justify-content:start;gap:18px}
  .subscription-card{container-type:inline-size;content-visibility:auto;contain-intrinsic-size:auto 500px;display:grid;width:100%;max-width:590px;min-width:0;height:100%;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"media body" "bottom bottom";grid-template-rows:auto auto;align-content:start;justify-self:start;overflow:hidden;border:1px solid var(--subscriptions-border);border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(51,55,27,.065)}
  .subscription-card-media{position:relative;grid-area:media;width:100%;min-width:0;aspect-ratio:4/5;align-self:start;overflow:hidden;border-right:1px solid var(--subscriptions-border);background:linear-gradient(145deg,#f7f7f2,var(--subscriptions-olive-soft));font-size:4rem;isolation:isolate}
  .subscription-card-carousel{position:absolute;inset:0;overflow:hidden;background:linear-gradient(145deg,#f7f7f2,var(--subscriptions-olive-soft))}
  .subscription-card-carousel-image{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;animation:subscription-card-carousel-enter .42s ease both}
  .subscription-card-carousel-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .subscription-card-carousel::after{content:"";position:absolute;inset:42% 0 0;background:linear-gradient(180deg,transparent,rgba(20,24,10,.88));pointer-events:none}
  .subscription-card-carousel-caption{position:absolute;z-index:2;left:12px;right:12px;bottom:30px;display:grid;gap:2px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.45)}
  .subscription-card-carousel-label{font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .subscription-card-carousel-title{overflow:hidden;font-size:.9rem;font-weight:900;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}
  .subscription-card-carousel-control{position:absolute;z-index:3;top:50%;width:30px;height:30px;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(25,29,14,.62);color:#fff;font:inherit;font-size:.88rem;font-weight:900;cursor:pointer;transform:translateY(-50%);backdrop-filter:blur(5px)}
  .subscription-card-carousel-control:hover{background:rgba(25,29,14,.84)}
  .subscription-card-carousel-control.previous{left:8px}.subscription-card-carousel-control.next{right:8px}
  .subscription-card-carousel-dots{position:absolute;z-index:3;left:9px;right:9px;bottom:10px;display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
  .subscription-card-carousel-dot{width:6px;height:6px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer}
  .subscription-card-carousel-dot.active{background:#fff;transform:scale(1.25)}
  .subscription-card-carousel-control:focus-visible,.subscription-card-carousel-dot:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}
  @keyframes subscription-card-carousel-enter{from{opacity:.15;transform:translateY(-16px) scale(1.012)}to{opacity:1;transform:translateY(0) scale(1)}}
  @media(prefers-reduced-motion:reduce){.subscription-card-carousel-image{animation:none}}
  .subscription-card-media-unit{position:absolute;z-index:5;top:10px;right:10px;display:inline-flex;max-width:calc(100% - 20px);align-items:center;justify-content:center;padding:5px 10px;border:1px solid rgba(82,104,24,.28);border-radius:999px;background:rgba(255,255,255,.94);color:var(--subscriptions-unit);font-size:clamp(.72rem,2.5cqw,.9rem);font-weight:900;line-height:1.1;letter-spacing:.01em;box-shadow:0 2px 8px rgba(20,24,10,.18);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);pointer-events:none;white-space:nowrap}
  .subscription-card-body{grid-area:body;display:flex;min-width:0;min-height:100%;flex-direction:column;justify-content:flex-start;gap:9px;padding:18px 16px}
  .subscription-card-body h3{display:block;overflow:visible;margin:0 0 3px;color:var(--subscriptions-accent);font-size:clamp(1.08rem,4.2cqw,1.3rem);font-weight:900;line-height:1.1;letter-spacing:-.02em;overflow-wrap:anywhere;word-break:normal}
  .subscription-card-body>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--subscriptions-muted);font-size:clamp(.72rem,2.3cqw,.82rem);line-height:1.32;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  .subscription-card-schedule-note{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--subscriptions-border);border-radius:9px;background:var(--subscriptions-olive-soft);color:var(--subscriptions-olive);font-size:clamp(.66rem,2cqw,.76rem);font-weight:820;line-height:1.25}
  .subscription-card-top{display:block}
  .subscription-card-top>div{min-width:0;flex:1}
  .subscription-card-prices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}
  .subscription-card-price{display:flex;min-width:0;min-height:38px;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;border:1px solid rgba(161,38,50,.16);border-radius:8px;background:var(--subscriptions-accent-soft);color:var(--subscriptions-muted);font-size:clamp(.66rem,2.1cqw,.76rem);font-weight:800;line-height:1.15}
  .subscription-card-price span{min-width:0;overflow-wrap:anywhere}
  .subscription-card-price strong{flex:0 0 auto;margin:0;color:var(--subscriptions-accent);font-size:clamp(.82rem,2.7cqw,.98rem);font-weight:900;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
  .subscription-card-product-info{margin:0}
  .subscription-card-unit{display:inline-flex;max-width:100%;width:fit-content;align-items:center;margin:0 0 5px;padding:4px 8px;border:1px solid rgba(82,104,24,.22);border-radius:999px;background:var(--subscriptions-unit-soft);color:var(--subscriptions-unit);font-size:clamp(.82rem,3cqw,1rem);font-weight:900;line-height:1.15;letter-spacing:.01em;overflow-wrap:anywhere}
  .subscription-card-content-heading{margin:5px 0 3px;color:var(--subscriptions-ink);font-size:clamp(.74rem,2.4cqw,.86rem);font-weight:850;line-height:1.2}
  .subscription-card-inline-items{display:flex;flex-direction:column;gap:5px}
  .subscription-card-inline-group{min-width:0}
  .subscription-card-inline-group strong{display:block;margin-bottom:2px;color:var(--subscriptions-ink);font-size:clamp(.72rem,2.2cqw,.82rem);line-height:1.2}
  .subscription-card-inline-values{display:flex;flex-wrap:wrap;gap:3px 6px}
  .subscription-card-inline-value{color:var(--subscriptions-muted);font-size:clamp(.66rem,2cqw,.76rem);font-weight:760;line-height:1.2}
  .subscription-card-day-menu{margin:1px 0 0}
  .subscription-card-day-list{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none}
  .subscription-card-day-row{display:grid;grid-template-columns:minmax(68px,.38fr) minmax(0,1fr);align-items:start;gap:7px;padding:5px 7px;border:1px solid rgba(51,55,27,.09);border-radius:8px;background:#fbfcf8}
  .subscription-card-day-label{min-width:0;color:var(--subscriptions-olive);font-size:clamp(.66rem,2.05cqw,.76rem);font-weight:900;line-height:1.2;overflow-wrap:anywhere}
  .subscription-card-day-items{min-width:0;color:var(--subscriptions-muted);font-size:clamp(.66rem,2cqw,.76rem);font-weight:760;line-height:1.22;overflow-wrap:anywhere}
  .subscription-card-complimentary{margin:0}
  .subscription-card-complimentary-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
  .subscription-card-complimentary-item{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;color:var(--subscriptions-muted);font-size:clamp(.68rem,2cqw,.78rem);font-weight:760;line-height:1.22}
  .subscription-card-complimentary-item span{min-width:0;overflow-wrap:anywhere}
  .subscription-card-complimentary-item strong{flex:0 0 auto;color:var(--subscriptions-ink);font-size:inherit}
  .subscription-card-bottom{grid-area:bottom;padding:11px 14px 14px;border-top:1px solid var(--subscriptions-border)}
  .subscription-card-actions{display:flex;min-width:0;align-items:stretch}
  .subscription-card-actions .subscriptions-button{width:100%;min-height:100%;padding:6px 9px;border-radius:8px;font-size:clamp(.68rem,2.1cqw,.78rem)}
  .subscriptions-empty,.subscriptions-loading{margin-top:20px;padding:30px;border:1px dashed var(--subscriptions-border);border-radius:18px;text-align:center;background:#fff}

  /* Desktop: make the active Subscriptions tab match the One-Day Delivery tab style. */
  @media (min-width: 701px) {
    .subscriptions-mode-selector {
      padding-top: 12px;
      background: #f7f7f2;
    }

    .subscriptions-mode-tabs {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 20px;
      padding: 0;
      border-bottom: 2px solid var(--subscriptions-olive);
      background: #f7f7f2;
    }

    .subscriptions-mode-tab {
      min-height: 46px;
      margin: 0 0 -2px;
      padding: 10px 22px 12px;
      border: 2px solid transparent;
      border-bottom-color: var(--subscriptions-olive);
      border-radius: 18px 18px 0 0;
      background: transparent;
      color: var(--subscriptions-muted);
    }

    .subscriptions-mode-tab.active,
    .subscriptions-mode-tab.active:hover {
      position: relative;
      z-index: 2;
      border: 2px solid var(--subscriptions-olive);
      border-bottom-color: #ffffff;
      border-radius: 18px 18px 0 0;
      background: #ffffff;
      color: var(--subscriptions-olive);
      box-shadow: none;
    }
  }

  @media(max-width:1260px){.subscriptions-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:900px){
    .subscriptions-location{display:block}
    .subscriptions-location-controls{justify-content:flex-start;margin-top:0}
    .subscriptions-location-select{min-width:min(100%,420px)}
  }
  @media(max-width:820px){
    .subscriptions-mode-selector{
      top:84px;
      left:18px;
      right:18px;
      background:#fff;
    }
    .subscriptions-mode-selector::before{
      left:-18px;
      right:-18px;
      height:12px;
      background:#fff;
    }
  }
  @media(max-width:700px){
    .subscriptions-page{padding:26px 0 54px}
    .subscriptions-page-container{padding-left:12px;padding-right:12px}
    .subscriptions-mode-selector{
      width:auto;
      left:12px;
      right:12px;
      margin:0;
      background:#fff;
    }
    .subscriptions-mode-selector::before{
      left:-12px;
      right:-12px;
      background:#fff;
    }
    .subscriptions-mode-selector + .subscriptions-location{
      margin-top:70px;
    }
    .subscriptions-mode-tabs{
      width:100%;
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      align-items:stretch;
      justify-content:stretch;
      gap:2px;
      overflow:visible;
      padding:0;
    }
    .subscriptions-mode-tab{
      box-sizing:border-box;
      width:100%;
      min-width:0;
      min-height:40px;
      margin-bottom:-2px;
      padding:8px 2px 10px;
      border-radius:12px 12px 0 0;
      overflow:hidden;
      font-size:clamp(.62rem,3vw,.72rem);
      line-height:1.08;
      letter-spacing:-.01em;
      white-space:nowrap;
    }
    .subscriptions-grid{grid-template-columns:1fr;gap:14px}
    .subscription-card{max-width:420px;grid-template-columns:minmax(0,1fr);grid-template-areas:"media" "body" "bottom";grid-template-rows:auto 1fr auto;justify-self:center;border-radius:16px}
    .subscription-card-media{
      width:100%;
      min-height:0;
      height:auto;
      aspect-ratio:4/5;
      border-right:0;
      border-bottom:1px solid var(--subscriptions-border);
      background:#fff;
      font-size:3rem;
    }
    .subscription-card-carousel-image{
      width:100%;
      height:100%;
      object-fit:cover;
      object-position:center;
    }
    .subscription-card-media-unit{
      top:8px;
      right:8px;
      display:inline-flex;
      max-width:calc(100% - 16px);
      padding:4px 8px;
      font-size:.72rem;
      box-shadow:0 2px 7px rgba(20,24,10,.18);
    }
    .subscription-card-product-info>.subscription-card-unit{
      display:none;
    }
    .subscription-card-body{
      min-height:0;
      justify-content:flex-start;
      gap:6px;
      padding:12px 11px 9px;
    }
    .subscription-card-body h3{
      margin-bottom:2px;
      font-size:clamp(.98rem,4.7vw,1.18rem);
      line-height:1.08;
    }
    .subscription-card-body>p{
      display:block;
      overflow:visible;
      font-size:.82rem;
      line-height:1.32;
      overflow-wrap:anywhere;
    }
    .subscription-card-unit{
      margin-bottom:5px;
      padding:4px 7px;
      font-size:.8rem;
    }
    .subscription-card-content-heading{
      margin:5px 0 3px;
      font-size:.72rem;
    }
    .subscription-card-inline-items{gap:4px}
    .subscription-card-inline-group strong{
      margin-bottom:2px;
      font-size:.7rem;
    }
    .subscription-card-inline-values{gap:2px 5px}
    .subscription-card-inline-value,
    .subscription-card-complimentary-item{
      font-size:.66rem;
      line-height:1.2;
    }
    .subscription-card-bottom{
      padding:9px 10px 11px;
      border-top:1px solid var(--subscriptions-border);
    }
    .subscription-card-prices{
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
    }
    .subscription-card-price{
      min-height:42px;
      gap:8px;
      padding:8px 10px;
      border-radius:8px;
      font-size:.72rem;
      white-space:nowrap;
    }
    .subscription-card-price span{white-space:nowrap}
    .subscription-card-price strong{font-size:.94rem}
    .subscription-card-actions .subscriptions-button{
      min-height:38px;
      padding:6px 8px;
      font-size:.72rem;
    }
  }
  @media(max-width:380px){
    .subscriptions-mode-tab{
      min-height:38px;
      padding-inline:1px;
      font-size:.61rem;
    }
    .subscription-card{
      grid-template-columns:minmax(0,1fr);
      grid-template-rows:auto 1fr auto;
    }
    .subscription-card-body{min-height:0}
    .subscription-card-body{padding:10px 8px 6px}
    .subscription-card-bottom{padding:8px 7px 10px}
    .subscription-card-prices{gap:6px}
    .subscription-card-price{gap:5px;padding:7px 8px;font-size:.67rem}
    .subscription-card-price strong{font-size:.86rem}
    .subscription-card-actions .subscriptions-button{padding:7px 8px;font-size:.74rem}
  }

.subscriptions-search {
  width: 100%;
  margin-top: 18px;
  margin-bottom: 42px;
}

.subscriptions-search-inner {
  width: 100%;
  max-width: 100%;
  min-height: 58px;

  display: flex;
  align-items: center;
  gap: 14px;

  padding: 0 20px;

  background: #ffffff;

  border: 1px solid #dce6d8;
  border-radius: 18px;

  color: #33371b;

  box-shadow: 0 8px 24px rgba(38, 56, 36, 0.05);

  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;
}

.subscriptions-search-inner:focus-within {
  border-color: #718141;

  box-shadow:
    0 0 0 3px rgba(113, 129, 65, 0.10),
    0 10px 28px rgba(38, 56, 36, 0.08);
}

.subscriptions-search-inner svg {
  flex-shrink: 0;
  color: #718141;
}

.subscriptions-search-inner input {
  width: 100%;
  min-width: 0;

  border: 0;
  outline: 0;

  background: transparent;

  color: #242815;

  font-family: "Nunito", Arial, Helvetica, sans-serif;
  font-size: 15px;
  font-weight: 500;
}

.subscriptions-search-inner input::placeholder {
  color: #8a9282;
}

.subscriptions-search-clear {
  width: 30px;
  height: 30px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 0;
  border-radius: 50%;

  background: #eef2e9;
  color: #33371b;

  font-size: 20px;
  line-height: 1;

  cursor: pointer;

  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.subscriptions-search-clear:hover {
  background: #dce6d8;
  transform: scale(1.05);
}

.subscriptions-search.subscriptions-search-inline {
  flex: 1 1 360px;
  width: min(460px, 32vw);
  min-width: 240px;
  margin: 0;
}

.subscriptions-search-inline .subscriptions-search-inner {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 11px;
  box-shadow: none;
}

.subscriptions-search-inline .subscriptions-search-inner:focus-within {
  box-shadow: 0 0 0 3px rgba(113, 129, 65, 0.10);
}

@media (max-width: 992px) {
  .subscriptions-search {
    margin-top: 16px;
    margin-bottom: 36px;
  }

  .subscriptions-search-inner {
    min-height: 56px;
    padding: 0 18px;
    border-radius: 16px;
  }
}

@media (max-width: 768px) {
  .subscriptions-location-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 9px;
  }

  .subscriptions-location-select {
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    min-width: 0;
    padding-right: 28px;
    font-size: .74rem;
  }

  .subscriptions-current-location-button {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
    min-width: 0;
    padding: 8px 7px;
    font-size: .74rem;
    white-space: nowrap;
  }

  .subscriptions-search.subscriptions-search-inline {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    min-width: 0;
  }

  .subscriptions-search {
    margin-top: 14px;
    margin-bottom: 30px;
  }

  .subscriptions-search-inner {
    min-height: 54px;
    gap: 12px;
    padding: 0 16px;
    border-radius: 15px;
  }

  .subscriptions-search-inner input {
    font-size: 14px;
  }

  .subscriptions-search-inner svg {
    width: 19px;
    height: 19px;
  }
}

@media (max-width: 480px) {
  .subscriptions-mode-selector {
    top:80px;
    left:8px;
    right:8px;
    background:#fff;
  }

  .subscriptions-mode-selector::before {
    left:-8px;
    right:-8px;
    height:12px;
    background:#fff;
  }

  .subscriptions-location {
    padding: 12px;
  }

  .subscriptions-location-select,
  .subscriptions-current-location-button {
    font-size: .7rem;
  }

  .subscriptions-search {
    margin-top: 12px;
    margin-bottom: 26px;
  }

  .subscriptions-search-inner {
    min-height: 50px;
    padding: 0 14px;
    gap: 10px;
    border-radius: 14px;
  }

  .subscriptions-search-inner input {
    font-size: 13px;
  }

  .subscriptions-search-clear {
    width: 27px;
    height: 27px;
    font-size: 18px;
  }
}
  /* React Native parity: compact two-column subscription cards on mobile. */
  .subscriptions-mobile-search,
  .subscription-card-mobile-summary,
  .subscription-card-media-toggle,
  .subscription-card-collapse,
  .subscription-card-mobile-meta,
  .subscription-card-plan-heading {
    display: none;
  }

  @media (max-width: 700px) {
    /* This page owns the mobile top header. Keep the shared desktop header
       untouched, but hide its logo/hamburger while SubscriptionsPage is mounted. */
    .site-header {
      display: none !important;
    }

    .header-mobile-backdrop {
      display: none !important;
    }

    .subscriptions-page {
      padding: 0 0 72px;
      background: #f7f7f2;
    }

    .subscriptions-page-container {
      padding-left: 6px;
      padding-right: 6px;
    }

    .subscriptions-mode-selector {
      position: fixed;
      top: 80px;
      left: 0;
      right: 0;
      z-index: 960;
      width: 100%;
      margin: 0;
      padding: 2px 0 0;
      border: 0;
      background: var(--subscriptions-olive);
      box-shadow: 0 5px 14px rgba(24, 29, 13, .16);
    }

    .subscriptions-mode-selector::before {
      left: 0;
      right: 0;
      height: 0;
      background: var(--subscriptions-olive);
    }

    .subscriptions-mode-tabs {
      width: 100%;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      gap: 0;
      overflow: visible;
      padding: 0;
      border: 0;
      background: var(--subscriptions-olive);
    }

    .subscriptions-mode-tab {
      width: auto;
      min-width: 0;
      min-height: 48px;
      flex: 1 1 0;
      margin: 0;
      padding: 7px 3px;
      border: 0;
      border-bottom: 3px solid transparent;
      border-radius: 0;
      background: var(--subscriptions-olive);
      color: rgba(255,255,255,.72);
      font-size: 11px;
      font-weight: 700;
      line-height: 14px;
      text-align: center;
      white-space: normal;
    }

    .subscriptions-mode-tab:hover {
      border-color: transparent;
      border-bottom-color: transparent;
      background: var(--subscriptions-olive);
      color: rgba(255,255,255,.88);
    }

    .subscriptions-mode-tab.active,
    .subscriptions-mode-tab.active:hover {
      border: 0;
      border-bottom: 3px solid #fff;
      background: rgba(255,255,255,.10);
      color: #fff;
    }

    .subscriptions-mobile-search {
      position: sticky;
      top: 128px;
      z-index: 945;
      display: block;
      width: calc(100% + 12px);
      margin: 58px -6px 0;
      padding: 7px 6px 2px;
      background: #f7f7f2;
    }

    .subscriptions-mobile-search .subscriptions-search-inner {
      min-height: 42px;
      gap: 0;
      padding: 0 4px 0 10px;
      border: 1px solid #dfe3d4;
      border-radius: 11px;
      background: #fff;
      box-shadow: none;
    }

    .subscriptions-mobile-search .subscriptions-search-inner input {
      min-height: 38px;
      padding: 5px 7px;
      font-size: 11.5px;
      font-weight: 500;
    }

    .subscriptions-mobile-search .subscriptions-search-clear {
      width: 28px;
      height: 32px;
      background: transparent;
      font-size: 20px;
    }

    .subscriptions-mobile-search-button {
      min-width: 50px;
      min-height: 32px;
      padding: 0 10px;
      border: 0;
      border-radius: 8px;
      background: var(--subscriptions-olive);
      color: #fff;
      font: inherit;
      font-size: 9.5px;
      font-weight: 900;
      cursor: pointer;
    }

    .subscriptions-location {
      margin: 5px 0 7px;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }

    .subscriptions-mode-selector + .subscriptions-mobile-search + .subscriptions-location {
      margin-top: 5px;
    }

    .subscriptions-location-controls {
      display: grid;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr);
      gap: 7px;
      align-items: stretch;
    }

    .subscriptions-location .subscriptions-search-inline {
      display: none;
    }

    .subscriptions-location-select,
    .subscriptions-current-location-button {
      width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 7px 8px;
      border-radius: 9px;
      font-size: 10.5px;
    }

    .subscriptions-location-select {
      padding-right: 26px;
      background: #fff;
    }

    .subscriptions-current-location-button {
      white-space: nowrap;
    }

    .subscriptions-location-message {
      margin-top: 5px;
      padding: 0 2px;
      font-size: 10px !important;
    }

    .subscriptions-alert {
      margin: 7px 0;
      padding: 10px;
      border-radius: 11px;
      font-size: 12px;
    }

    .subscriptions-category {
      margin-top: 6px;
    }

    .subscriptions-category-heading {
      align-items: end;
      gap: 7px;
      margin-bottom: 7px;
      padding: 11px 1px 0;
    }

    .subscriptions-category h2 {
      font-size: 17px;
      line-height: 21px;
    }

    .subscriptions-category p {
      margin-top: 1px;
      font-size: 10.5px;
      line-height: 14px;
    }

    .subscriptions-category-heading > span {
      flex: 0 0 auto;
      margin-bottom: 2px;
      color: var(--subscriptions-olive);
      font-size: 9.5px;
      font-weight: 900;
    }

    .subscriptions-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      align-items: start;
      justify-content: stretch;
      gap: 10px;
    }

    .subscription-card {
      width: 100%;
      max-width: none;
      min-width: 0;
      height: auto;
      margin: 0;
      border: 1px solid rgba(51,55,27,.12);
      background: #fff;
      box-shadow: 0 1px 3px rgba(36,40,21,.035);
    }

    .subscription-card.mobile-compact {
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "media"
        "summary";
      grid-template-rows: auto auto;
      align-content: start;
      border-radius: 12px;
    }

    .subscription-card.mobile-expanded {
      grid-column: 1 / -1;
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "media"
        "body"
        "bottom";
      grid-template-rows: auto auto auto;
      border-radius: 17px;
      box-shadow: 0 3px 7px rgba(36,40,21,.055);
    }

    .subscription-card-media {
      position: relative;
      grid-area: media;
      width: 100%;
      min-height: 0;
      height: auto;
      aspect-ratio: 4 / 5;
      border-right: 0;
      border-bottom: 1px solid var(--subscriptions-border);
      background: var(--subscriptions-olive-soft);
    }

    .subscription-card-media-toggle {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: block;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .subscription-card-carousel-control,
    .subscription-card-carousel-dots {
      z-index: 4;
    }

    /* Mobile: use the exact same carousel control dimensions as desktop/web. */
    .subscription-card-carousel-control {
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 0;
      border-radius: 50%;
      font-size: .88rem;
      line-height: 1;
      text-align: center;
      text-indent: 0;
    }

    .subscription-card-carousel-control.previous {
      left: 8px;
    }

    .subscription-card-carousel-control.next {
      right: 8px;
    }

    .subscription-card-carousel-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transform: none;
    }

    .subscription-card-carousel-dots {
      bottom: 5px;
      gap: 3px;
    }

    .subscription-card-carousel-dot {
      width: 5px;
      height: 5px;
    }

    .mobile-compact .subscription-card-carousel::after {
      inset: 62% 0 0;
      background: linear-gradient(180deg,transparent,rgba(18,22,8,.62));
    }

    .mobile-compact .subscription-card-carousel-caption {
      left: 7px;
      right: 7px;
      bottom: 18px;
      gap: 2px;
    }

    .mobile-compact .subscription-card-carousel-label {
      font-size: clamp(1rem,5.4vw,1.35rem);
      font-weight: 900;
      line-height: 1;
      letter-spacing: .02em;
      text-shadow: 0 2px 8px rgba(0,0,0,.52);
    }

    .mobile-compact .subscription-card-carousel-title {
      display: block;
      width: 100%;
      overflow: visible;
      color: #ffd36a;
      font-size: clamp(.62rem,3.15vw,.8rem);
      font-weight: 900;
      line-height: 1.08;
      letter-spacing: 0;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: normal;
      text-overflow: clip;
      -webkit-box-orient: initial;
      -webkit-line-clamp: unset;
      text-shadow: 0 2px 8px rgba(0,0,0,.66);
    }

    .subscription-card-mobile-summary {
      grid-area: summary;
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
      padding: 5px 7px 6px;
      border: 0;
      background: #fff;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .mobile-expanded .subscription-card-mobile-summary {
      display: none;
    }

    .subscription-card-mobile-name {
      min-height: 27px;
      overflow: hidden;
      color: var(--subscriptions-accent);
      font-size: 11px;
      font-weight: 900;
      line-height: 13.5px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .subscription-card-mobile-price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-top: 1px;
      padding-top: 5px;
      border-top: 1px solid rgba(51,55,27,.08);
      color: var(--subscriptions-muted);
      font-size: 12.5px;
      font-weight: 900;
      line-height: 15px;
    }

    .subscription-card-mobile-price-row strong {
      min-width: 0;
      overflow: hidden;
      color: var(--subscriptions-olive);
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-compact .subscription-card-body,
    .mobile-compact .subscription-card-bottom {
      display: none;
    }

    .mobile-expanded .subscription-card-body {
      grid-area: body;
      display: flex;
      min-height: 0;
      flex-direction: column;
      justify-content: flex-start;
      gap: 7px;
      padding: 10px 11px 11px;
    }

    .mobile-expanded .subscription-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .mobile-expanded .subscription-card-top > div {
      flex: 1;
      min-width: 0;
    }

    .mobile-expanded .subscription-card-body h3 {
      margin: 0;
      color: var(--subscriptions-accent);
      font-size: 18px;
      font-weight: 900;
      line-height: 21px;
    }

    .subscription-card-collapse {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 14px;
      background: var(--subscriptions-olive-soft);
      color: var(--subscriptions-olive);
      font: inherit;
      font-size: 21px;
      line-height: 22px;
      cursor: pointer;
    }

    .subscription-card-mobile-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .subscription-card-mobile-unit {
      max-width: 38%;
      overflow: hidden;
      padding: 4px 8px;
      border: 1px solid rgba(82,104,24,.16);
      border-radius: 999px;
      background: var(--subscriptions-unit-soft);
      color: var(--subscriptions-unit);
      font-size: 10px;
      font-weight: 900;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscription-card-mobile-weekly {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 8px;
      border: 1px solid rgba(161,38,50,.14);
      border-radius: 9px;
      background: var(--subscriptions-accent-soft);
      font-size: 12px;
      font-weight: 900;
    }

    .subscription-card-mobile-weekly span {
      color: var(--subscriptions-muted);
    }

    .subscription-card-mobile-weekly strong {
      color: var(--subscriptions-accent);
      font-size: 13px;
    }

    .mobile-expanded .subscription-card-body > p {
      display: block;
      overflow: visible;
      margin: 0;
      color: var(--subscriptions-muted);
      font-size: 11.5px;
      font-weight: 500;
      line-height: 16px;
    }

    .mobile-expanded .subscription-card-schedule-note {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 8px;
      border: 1px solid rgba(82,104,24,.14);
      border-radius: 10px;
      background: #f5f7ed;
      color: var(--subscriptions-olive);
      font-size: 10px;
      font-weight: 800;
      line-height: 13.5px;
    }

    .mobile-expanded .subscription-card-product-info,
    .mobile-expanded .subscription-card-complimentary {
      margin: 1px 0 0;
      padding: 8px 9px;
      border: 1px solid rgba(51,55,27,.10);
      border-radius: 10px;
      background: #fbfcf8;
    }

    .mobile-expanded .subscription-card-product-info > .subscription-card-unit {
      display: none;
    }

    .mobile-expanded .subscription-card-content-heading {
      margin: 0 0 4px;
      font-size: 11px;
      line-height: 14px;
    }

    .mobile-expanded .subscription-card-inline-items {
      gap: 3px;
    }

    .mobile-expanded .subscription-card-inline-group strong {
      margin-bottom: 1px;
      font-size: 12px;
    }

    .mobile-expanded .subscription-card-inline-value,
    .mobile-expanded .subscription-card-complimentary-item {
      font-size: 10.5px;
      font-weight: 700;
      line-height: 15px;
    }

    .mobile-expanded .subscription-card-day-menu {
      margin-top: 1px;
      padding: 8px 9px;
      border: 1px solid rgba(51,55,27,.10);
      border-radius: 10px;
      background: #fbfcf8;
    }

    .mobile-expanded .subscription-card-day-list {
      gap: 4px;
    }

    .mobile-expanded .subscription-card-day-row {
      grid-template-columns: 66px minmax(0,1fr);
      gap: 6px;
      padding: 5px 6px;
      border-radius: 8px;
      background: #fff;
    }

    .mobile-expanded .subscription-card-day-label,
    .mobile-expanded .subscription-card-day-items {
      font-size: 10.5px;
      line-height: 14px;
    }

    .mobile-expanded .subscription-card-bottom {
      grid-area: bottom;
      display: block;
      padding: 9px 10px 10px;
      border-top: 1px solid rgba(51,55,27,.10);
      background: #fcfdf9;
    }

    .subscription-card-plan-heading {
      display: block;
      margin: 0 0 7px;
      color: var(--subscriptions-ink);
      font-size: 11px;
      font-weight: 900;
    }

    .mobile-expanded .subscription-card-prices {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 6px;
      margin: 0;
    }

    .mobile-expanded .subscription-card-price {
      min-width: 0;
      min-height: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 6px 5px;
      border: 1px solid rgba(161,38,50,.15);
      border-radius: 9px;
      background: var(--subscriptions-accent-soft);
      font-size: 9.5px;
      line-height: 1.1;
      text-align: center;
      white-space: normal;
    }

    .mobile-expanded .subscription-card-price span {
      color: var(--subscriptions-muted);
      font-weight: 800;
      white-space: nowrap;
    }

    .mobile-expanded .subscription-card-price strong {
      color: var(--subscriptions-accent);
      font-size: 14.5px;
      font-weight: 900;
      text-align: center;
      white-space: nowrap;
    }

    .mobile-expanded .subscription-card-actions {
      grid-column: 1 / -1;
      margin-top: 2px;
    }

    .mobile-expanded .subscription-card-actions .subscriptions-button {
      width: 100%;
      min-height: 43px;
      padding: 7px 9px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 900;
    }

    .subscriptions-empty,
    .subscriptions-loading {
      margin-top: 8px;
      padding: 24px 14px;
      border-radius: 16px;
    }
  }

  @media (max-width: 380px) {
    .subscriptions-page-container {
      padding-left: 5px;
      padding-right: 5px;
    }

    .subscriptions-mobile-search {
      width: calc(100% + 10px);
      margin-left: -5px;
      margin-right: -5px;
      padding-left: 5px;
      padding-right: 5px;
    }

    .subscriptions-grid {
      gap: 7px;
    }

    .subscription-card-mobile-summary {
      padding-left: 6px;
      padding-right: 6px;
    }

    .subscription-card-mobile-name {
      font-size: 10.5px;
    }

    .subscription-card-mobile-price-row {
      font-size: 11.5px;
    }

    .subscription-card-mobile-price-row strong {
      font-size: 12px;
    }

    .mobile-expanded .subscription-card-body {
      padding-left: 9px;
      padding-right: 9px;
    }

    .mobile-expanded .subscription-card-price {
      padding-left: 3px;
      padding-right: 3px;
    }

    .mobile-expanded .subscription-card-price strong {
      font-size: 13px;
    }
  }


  /* FINAL DESKTOP NAV GAP FIX
     The old ::before spacer was positioned ABOVE a selector that started at
     the navbar edge, so the spacer was hidden behind the navbar.
     Move the entire filter selector down, then use the light background to fill
     that intentional space. */
  @media (min-width: 821px) {
    .subscriptions-mode-selector {
      top: 116px !important;
      padding-top: 0 !important;
      background: #f7f7f2 !important;
    }

    .subscriptions-mode-selector::before {
      content: "";
      position: absolute;
      top: -14px !important;
      bottom: auto !important;
      height: 14px !important;
      left: calc(-1 * clamp(18px,4vw,64px)) !important;
      right: calc(-1 * clamp(18px,4vw,64px)) !important;
      background: #f7f7f2 !important;
      pointer-events: none;
    }

    .subscriptions-mode-tabs {
      background: #f7f7f2 !important;
    }

    .subscriptions-mode-selector + .subscriptions-location {
      margin-top: 104px !important;
    }
  }


  /* FINAL DESKTOP FIXED CONTROLS
     Keep the complete top block fixed:
     1) delivery tabs
     2) search + saved address + current-location row
     Only the subscription catalogue below it scrolls. */
  @media (min-width: 821px) {
    .subscriptions-mode-selector {
      position: fixed !important;
      top: 116px !important;
      left: clamp(18px,4vw,64px) !important;
      right: clamp(18px,4vw,64px) !important;
      z-index: 980 !important;
    }

    .subscriptions-location {
      position: fixed !important;
      top: 176px !important;
      left: clamp(18px,4vw,64px) !important;
      right: clamp(18px,4vw,64px) !important;
      z-index: 979 !important;
      width: auto !important;
      margin: 0 !important;
      padding: 16px 18px !important;
      border: 1px solid var(--subscriptions-border) !important;
      border-radius: 16px !important;
      background: #f7f7f2 !important;
      box-shadow: 0 10px 26px rgba(51,55,27,.08);
    }

    /* Solid backdrop prevents scrolling cards/images from showing through
       the small area between the fixed tabs and fixed search/location row. */
    .subscriptions-location::before {
      content: "";
      position: absolute;
      left: calc(-1 * clamp(18px,4vw,64px));
      right: calc(-1 * clamp(18px,4vw,64px));
      top: -16px;
      height: 16px;
      background: #f7f7f2;
      pointer-events: none;
    }

    /* Reserve document space for both fixed rows so catalogue content
       starts below them instead of sliding underneath. */
    .subscriptions-page-container::before {
      content: "";
      display: block;
      width: 100%;
      height: 154px;
      pointer-events: none;
    }

    /* The desktop inline search belongs inside the fixed location row. */
    .subscriptions-location .subscriptions-search-inline {
      display: block;
      margin: 0 !important;
    }

    .subscriptions-location-controls {
      flex-wrap: nowrap;
    }
  }


  /* ================================================================
     MOBILE LOCATION HEADER + FULL-SCREEN LOCATION PICKER
     Desktop keeps the existing search/saved-address/current-location row.
     ================================================================ */
  .subscriptions-mobile-location-header,
  .subscriptions-mobile-location-picker {
    display: none;
  }

  @media (max-width: 700px) {
    .subscriptions-page {
      --subscriptions-mobile-location-header-height: 64px;
      --subscriptions-mobile-tabs-height: 48px;
    }

    .subscriptions-mobile-location-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1405;
      min-height: var(--subscriptions-mobile-location-header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: env(safe-area-inset-top, 0px) 10px 0 0;
      background: var(--subscriptions-olive);
      box-shadow: 0 2px 7px rgba(29,34,15,.16);
    }

    .subscriptions-mobile-location-trigger {
      min-width: 0;
      min-height: var(--subscriptions-mobile-location-header-height);
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 7px 8px 7px 12px;
      border: 0;
      background: transparent;
      color: #fff;
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .subscriptions-mobile-location-trigger:active {
      background: rgba(255,255,255,.06);
    }

    .subscriptions-mobile-location-icon {
      width: 31px;
      height: 31px;
      flex: 0 0 31px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(255,255,255,.10);
      color: #fff;
    }

    .subscriptions-mobile-location-copy {
      min-width: 0;
      flex: 1;
      display: grid;
      gap: 2px;
    }

    .subscriptions-mobile-location-title-row {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .subscriptions-mobile-location-title-row strong {
      min-width: 0;
      max-width: calc(100vw - 142px);
      overflow: hidden;
      color: #fff;
      font-size: .84rem;
      font-weight: 850;
      line-height: 1.05;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscriptions-mobile-location-title-row svg {
      flex: 0 0 auto;
    }

    .subscriptions-mobile-location-copy small {
      max-width: calc(100vw - 142px);
      overflow: hidden;
      color: rgba(255,255,255,.76);
      font-size: .64rem;
      font-weight: 650;
      line-height: 1.12;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscriptions-mobile-profile-trigger {
      width: 38px;
      height: 38px;
      min-width: 38px;
      flex: 0 0 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 2px solid rgba(255,255,255,.95);
      border-radius: 999px;
      background: #fff;
      color: var(--subscriptions-olive);
      box-shadow: 0 2px 7px rgba(0,0,0,.16);
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .subscriptions-mobile-profile-trigger:active {
      transform: scale(.96);
      background: #f4f5ef;
    }

    .subscriptions-mobile-profile-trigger[aria-expanded="true"] {
      background: #eef0e6;
      box-shadow: 0 0 0 3px rgba(255,255,255,.14);
    }

    .subscriptions-mobile-menu-icon {
      position: relative;
      width: 20px;
      height: 15px;
      display: block;
    }

    .subscriptions-mobile-menu-icon span {
      position: absolute;
      left: 0;
      width: 20px;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      transform-origin: center;
      transition: top .25s ease, transform .25s ease, opacity .18s ease;
    }

    .subscriptions-mobile-menu-icon span:nth-child(1) { top: 0; }
    .subscriptions-mobile-menu-icon span:nth-child(2) { top: 6.5px; }
    .subscriptions-mobile-menu-icon span:nth-child(3) { top: 13px; }

    .subscriptions-mobile-profile-trigger[aria-expanded="true"]
      .subscriptions-mobile-menu-icon span:nth-child(1) {
      top: 6.5px;
      transform: rotate(45deg);
    }

    .subscriptions-mobile-profile-trigger[aria-expanded="true"]
      .subscriptions-mobile-menu-icon span:nth-child(2) {
      opacity: 0;
      transform: scaleX(.25);
    }

    .subscriptions-mobile-profile-trigger[aria-expanded="true"]
      .subscriptions-mobile-menu-icon span:nth-child(3) {
      top: 6.5px;
      transform: rotate(-45deg);
    }

    .subscriptions-mobile-navigation-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147481800;
      display: block;
      padding: 0;
      border: 0;
      background: rgba(15,23,42,.34);
      cursor: default;
      animation: subscriptions-mobile-old-header-backdrop-in .2s ease both;
    }

    @keyframes subscriptions-mobile-old-header-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .subscriptions-mobile-navigation-menu {
      position: fixed;
      top: calc(var(--subscriptions-mobile-location-header-height, 64px) + env(safe-area-inset-top, 0px) + 1px);
      left: 10px;
      right: 10px;
      z-index: 2147481900;
      width: auto;
      max-height: calc(100dvh - var(--subscriptions-mobile-location-header-height, 64px) - env(safe-area-inset-top, 0px) - 14px);
      display: flex;
      align-items: stretch;
      flex-direction: column;
      justify-content: flex-start;
      gap: 7px;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 14px 12px 16px;
      border: 1px solid rgba(51,55,27,.18);
      border-radius: 18px;
      background: #f7f7f2;
      box-shadow: 0 20px 45px rgba(51,55,27,.20);
      overscroll-behavior: contain;
      animation: subscriptions-mobile-old-header-menu-in .22s ease both;
    }

    @keyframes subscriptions-mobile-old-header-menu-in {
      from { opacity: 0; transform: translateY(-10px) scale(.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .subscriptions-mobile-navigation-link,
    .subscriptions-mobile-navigation-submenu-link {
      position: relative;
      width: 100%;
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 7px;
      padding: 12px 14px;
      border: 1px solid #e6e7df;
      border-radius: 13px;
      background: #fff;
      color: #4b5260;
      font: inherit;
      font-size: .95rem;
      font-weight: 700;
      line-height: 1.25;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background-color .2s ease, border-color .2s ease, color .2s ease, transform .2s ease;
    }

    .subscriptions-mobile-navigation-link:active,
    .subscriptions-mobile-navigation-submenu-link:active {
      transform: scale(.99);
    }

    .subscriptions-mobile-navigation-link.active {
      border-color: rgba(51,55,27,.30);
      background: rgba(51,55,27,.08);
      color: var(--subscriptions-olive);
      font-weight: 800;
    }

    .subscriptions-mobile-navigation-link.active::after {
      content: "";
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: 4px;
      width: 3px;
      border-radius: 999px;
      background: var(--subscriptions-olive);
    }

    .subscriptions-mobile-navigation-link-label {
      min-width: 0;
      flex: 1;
    }

    .subscriptions-mobile-navigation-count {
      min-width: 21px;
      height: 21px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      margin-left: auto;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--subscriptions-olive);
      color: #fff;
      box-shadow: 0 3px 8px rgba(51,55,27,.22);
      font-size: .71rem;
      font-weight: 800;
      line-height: 1;
    }

    .subscriptions-mobile-navigation-user-menu {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin: 3px 0 0;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }

    .subscriptions-mobile-navigation-account {
      width: 100%;
      min-height: 54px;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #f8fafc;
      color: var(--subscriptions-olive);
      font: inherit;
      cursor: pointer;
    }

    .subscriptions-mobile-navigation-account-icon {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 36px;
      border-radius: 50%;
      background: var(--subscriptions-olive);
      color: #fff;
    }

    .subscriptions-mobile-navigation-account-copy {
      min-width: 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      text-align: left;
    }

    .subscriptions-mobile-navigation-account-copy strong {
      width: 100%;
      overflow: hidden;
      color: #17211b;
      font-size: .90rem;
      font-weight: 750;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscriptions-mobile-navigation-account-copy small {
      color: #64748b;
      font-size: .74rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .subscriptions-mobile-navigation-account-chevron {
      width: 18px;
      height: 18px;
      display: inline-flex;
      flex: 0 0 auto;
      transition: transform .2s ease;
    }

    .subscriptions-mobile-navigation-account[aria-expanded="true"]
      .subscriptions-mobile-navigation-account-chevron {
      transform: rotate(180deg);
    }

    .subscriptions-mobile-navigation-user-dropdown {
      position: static;
      width: 100%;
      min-width: 0;
      max-width: none;
      margin-top: 7px;
      padding: 7px;
      border: 1px solid rgba(51,55,27,.18);
      border-radius: 13px;
      background: #f8fafc;
      box-shadow: none;
    }

    .subscriptions-mobile-navigation-user-name {
      display: block;
      overflow: hidden;
      padding: 9px 10px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #17211b;
      font-size: .82rem;
      font-weight: 750;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscriptions-mobile-navigation-submenu-link {
      min-height: 44px;
      margin-top: 5px;
      padding: 9px 11px;
      background: #fff;
      font-size: .90rem;
    }

    button.subscriptions-mobile-navigation-submenu-link {
      font-family: inherit;
    }

    .subscriptions-mobile-navigation-submenu-link.logout {
      color: #b91c1c;
    }

    .subscriptions-mobile-navigation-submenu-link.logout:disabled {
      cursor: wait;
      opacity: .65;
    }

    .subscriptions-mobile-navigation-logout-error {
      width: 100%;
      padding: 9px 11px;
      border-radius: 9px;
      background: #fef2f2;
      color: #991b1b;
      font-size: .78rem;
      font-weight: 650;
      line-height: 1.4;
    }

    @media (max-width: 480px) {
      .subscriptions-mobile-navigation-menu {
        left: 8px;
        right: 8px;
        max-height: calc(100dvh - var(--subscriptions-mobile-location-header-height, 64px) - env(safe-area-inset-top, 0px) - 10px);
        padding: 12px 10px 14px;
      }
    }

    .subscriptions-mobile-location-spinner,
    .subscriptions-mobile-location-action-spinner {
      width: 16px;
      height: 16px;
      display: inline-block;
      border: 2px solid rgba(255,255,255,.40);
      border-top-color: #fff;
      border-radius: 999px;
      animation: subscriptions-mobile-location-spin .7s linear infinite;
    }

    @keyframes subscriptions-mobile-location-spin {
      to { transform: rotate(360deg); }
    }

    /* Put delivery tabs immediately under the new custom mobile header. */
    .subscriptions-mode-selector {
      top: var(--subscriptions-mobile-location-header-height) !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 1400 !important;
      width: 100% !important;
    }

    /* Search remains directly below the header + delivery tabs. */
    .subscriptions-mobile-search {
      top: calc(
        var(--subscriptions-mobile-location-header-height) +
        var(--subscriptions-mobile-tabs-height)
      ) !important;
      margin-top: calc(
        var(--subscriptions-mobile-location-header-height) +
        var(--subscriptions-mobile-tabs-height) +
        8px
      ) !important;
    }

    /* Location selection has moved to the header picker on mobile only. */
    .subscriptions-location {
      display: none !important;
    }

    .subscriptions-mobile-location-picker.subscriptions-mobile-location-picker--open {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483000 !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      flex-direction: column;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: #f5f6fa;
      color: #202938;
      font-family: inherit;
      overflow: hidden;
    }

    .subscriptions-mobile-location-picker-header {
      min-height: 55px;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      background: #f5f6fa;
    }

    .subscriptions-mobile-location-picker-header h2 {
      margin: 0;
      color: #202938;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.15;
    }

    .subscriptions-mobile-location-picker-back {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #1f2937;
      cursor: pointer;
    }

    .subscriptions-mobile-location-picker-back:active {
      background: rgba(15,23,42,.06);
    }

    .subscriptions-mobile-location-picker-search {
      min-height: 50px;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 2px 10px 16px;
      padding: 0 13px;
      border: 1px solid #e1e4ea;
      border-radius: 12px;
      background: #fff;
      color: #ef4f63;
    }

    .subscriptions-mobile-location-picker-search input {
      width: 100%;
      min-width: 0;
      padding: 10px 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: #202938;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
    }

    .subscriptions-mobile-location-picker-search input::placeholder {
      color: #6b7280;
    }

    .subscriptions-mobile-location-picker-scroll {
      min-height: 0;
      flex: 1;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      padding: 0 10px 28px;
      -webkit-overflow-scrolling: touch;
    }

    .subscriptions-mobile-location-action-card {
      overflow: hidden;
      margin-bottom: 17px;
      border: 1px solid #eef0f3;
      border-radius: 15px;
      background: #fff;
    }

    .subscriptions-mobile-location-action-row,
    .subscriptions-mobile-saved-address-card {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 0;
      background: #fff;
      color: #202938;
      text-align: left;
      cursor: pointer;
    }

    .subscriptions-mobile-location-action-row {
      min-height: 72px;
      padding: 11px 13px;
    }

    .subscriptions-mobile-location-action-row:active,
    .subscriptions-mobile-saved-address-card:active {
      background: #f8fafc;
    }

    .subscriptions-mobile-location-action-row:disabled,
    .subscriptions-mobile-saved-address-card:disabled {
      cursor: wait;
      opacity: .58;
    }

    .subscriptions-mobile-location-action-icon,
    .subscriptions-mobile-saved-address-icon {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #fff0f2;
      color: #ef4f63;
    }

    .subscriptions-mobile-location-action-spinner {
      border-color: rgba(239,79,99,.25);
      border-top-color: #ef4f63;
    }

    .subscriptions-mobile-location-action-copy,
    .subscriptions-mobile-saved-address-copy {
      min-width: 0;
      flex: 1;
      display: grid;
      gap: 4px;
    }

    .subscriptions-mobile-location-action-copy strong,
    .subscriptions-mobile-saved-address-title-row strong {
      color: #202938;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.15;
    }

    .subscriptions-mobile-location-action-copy small,
    .subscriptions-mobile-saved-address-copy small {
      color: #64748b;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }

    .subscriptions-mobile-location-action-row > svg,
    .subscriptions-mobile-saved-address-card > svg {
      flex: 0 0 auto;
      color: #94a3b8;
    }

    .subscriptions-mobile-location-picker-feedback {
      margin: -5px 2px 13px;
      padding: 9px 10px;
      border-radius: 9px;
      background: #eef0e6;
      color: var(--subscriptions-olive);
      font-size: 12px;
      font-weight: 700;
    }

    .subscriptions-mobile-location-picker-feedback.error {
      background: #fff0f1;
      color: #b42332;
    }

    .subscriptions-mobile-saved-addresses h3 {
      margin: 4px 2px 9px;
      color: #7c8797;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
    }

    .subscriptions-mobile-saved-address-card {
      min-height: 74px;
      margin-bottom: 8px;
      padding: 11px 12px;
      border: 1px solid #e7eaf0;
      border-radius: 13px;
    }

    .subscriptions-mobile-saved-address-card.selected {
      border-color: #87945a;
      background: #f7f9ef;
    }

    .subscriptions-mobile-saved-address-title-row {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .subscriptions-mobile-saved-address-title-row strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscriptions-mobile-saved-address-check {
      width: 19px;
      height: 19px;
      flex: 0 0 19px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--subscriptions-olive);
      color: #fff;
    }

    .subscriptions-mobile-saved-address-empty {
      min-height: 118px;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      padding: 18px 14px;
      border: 1px dashed #d9dee8;
      border-radius: 14px;
      background: #fff;
      color: #94a3b8;
      text-align: center;
    }

    .subscriptions-mobile-saved-address-empty strong {
      color: #475569;
      font-size: 13px;
      font-weight: 800;
    }

    .subscriptions-mobile-saved-address-empty span {
      max-width: 290px;
      color: #64748b;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }
  }


  /* Unified subscription typography: Nunito across desktop, mobile and portals. */
  .subscriptions-page,
  .subscriptions-page *,
  [class^="subscriptions-"],
  [class*=" subscriptions-"],
  [class^="subscription-"],
  [class*=" subscription-"] {
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }

  /* ================================================================
     FIXED SUBSCRIPTION CARD MAIN AREA
     The image and Daily menu always share one fixed-height row.
     Menu content is compressed/aligned inside that row instead of
     increasing the overall card height.
     ================================================================ */
  @media (min-width: 701px) {
    .subscription-card {
      height: auto;
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "main"
        "bottom";
      grid-template-rows: auto auto;
      align-content: start;
    }

    .subscription-card-main {
      grid-area: main;
      display: grid;
      width: 100%;
      min-width: 0;
      min-height: 0;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr);
      grid-template-areas: "media body";
      /* Two equal columns; each image half remains exactly 4:5. */
      aspect-ratio: 8 / 5;
      overflow: hidden;
      background: #fff;
    }

    .subscription-card-main > .subscription-card-media {
      grid-area: media;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      aspect-ratio: auto;
      align-self: stretch;
    }

    .subscription-card-main > .subscription-card-body {
      grid-area: body;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      box-sizing: border-box;
    }

    .subscription-card-bottom {
      grid-area: bottom;
    }

    .subscription-card-body h3 {
      flex: 0 0 auto;
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .subscription-card-day-menu {
      display: flex;
      min-height: 0;
      flex: 1 1 auto;
      flex-direction: column;
      margin: 0;
      overflow: hidden;
    }

    .subscription-card-day-menu .subscription-card-content-heading {
      flex: 0 0 auto;
      margin: 2px 0 4px;
    }

    .subscription-card-day-list {
      display: grid;
      min-height: 0;
      flex: 1 1 auto;
      gap: clamp(2px, .55cqw, 5px);
      overflow: hidden;
    }

    .subscription-card-day-row {
      min-height: 0;
      height: 100%;
      align-items: center;
      gap: clamp(4px, 1cqw, 7px);
      padding: clamp(2px, .65cqw, 5px) clamp(5px, 1cqw, 7px);
      overflow: hidden;
    }

    .subscription-card-day-label {
      align-self: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subscription-card-day-items {
      align-self: center;
      display: block;
      min-width: 0;
      overflow: visible;
      color: var(--subscriptions-muted);
      font-size: clamp(.58rem, 1.78cqw, .70rem);
      font-weight: 760;
      line-height: 1.06;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: normal;
      -webkit-box-orient: initial;
      -webkit-line-clamp: unset;
    }

    /* Longer day-menu titles receive slightly tighter type while still
       remaining completely visible inside the same fixed-height card. */
    .subscription-card-day-items.is-long {
      font-size: clamp(.55rem, 1.62cqw, .66rem);
      line-height: 1.03;
    }

    .subscription-card-day-items.is-very-long {
      font-size: clamp(.51rem, 1.48cqw, .61rem);
      line-height: 1;
    }

    /* Keep optional complimentary content from forcing the fixed main row taller. */
    .subscription-card-complimentary {
      min-height: 0;
      flex: 0 1 auto;
      overflow: hidden;
    }
  }

  /* Animated Monday-Saturday schedule sync.
     The carousel advances automatically from top to bottom through the day list.
     Clicking any day immediately switches the carousel image to that day's slide. */
  .subscription-card-carousel-control {
    display: none !important;
  }

  .subscription-card-day-row {
    position: relative;
    cursor: pointer;
    transition:
      background .28s ease,
      border-color .28s ease,
      box-shadow .28s ease,
      transform .28s ease;
    outline: none;
    isolation: isolate;
  }

  .subscription-card-day-row::before {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(82,104,24,.13), rgba(82,104,24,.04));
    opacity: 0;
    transform: scaleY(.06);
    transform-origin: top;
  }

  .subscription-card-day-row:hover {
    border-color: rgba(82,104,24,.28);
    background: #f7f9f1;
  }

  .subscription-card-day-row:focus-visible {
    border-color: rgba(82,104,24,.42);
    box-shadow: 0 0 0 3px rgba(82,104,24,.12);
  }

  .subscription-card-day-row.active {
    border-color: rgba(82,104,24,.34);
    background: #f2f5e7;
    box-shadow: 0 2px 8px rgba(51,55,27,.07);
    transform: translateX(2px);
  }

  .subscription-card-day-row.active::before {
    opacity: 1;
    animation: subscription-day-fill 3.6s linear both;
  }

  .subscription-card-day-row.active .subscription-card-day-label {
    color: var(--subscriptions-accent);
  }

  .subscription-card-day-row.active .subscription-card-day-items {
    color: var(--subscriptions-ink);
  }

  @keyframes subscription-day-fill {
    from { transform: scaleY(.05); }
    to { transform: scaleY(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-card-day-row,
    .subscription-card-day-row.active::before {
      animation: none !important;
      transition: none !important;
    }
  }

  /* The mobile card keeps its existing image-first expand/collapse layout. */
  @media (max-width: 700px) {
    .subscription-card.mobile-compact,
    .subscription-card.mobile-expanded {
      height: auto;
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "main"
        "bottom";
      grid-template-rows: auto auto;
    }

    .subscription-card-main {
      grid-area: main;
      display: grid;
      width: 100%;
      min-width: 0;
      min-height: 0;
      aspect-ratio: auto;
      overflow: visible;
    }

    .subscription-card.mobile-compact .subscription-card-main {
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "media"
        "summary";
      grid-template-rows: auto auto;
    }

    .subscription-card.mobile-expanded .subscription-card-main {
      grid-template-columns: minmax(0,1fr);
      grid-template-areas:
        "media"
        "body";
      grid-template-rows: auto auto;
    }

    .subscription-card-main > .subscription-card-media {
      grid-area: media;
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 5;
    }

    .subscription-card-main > .subscription-card-mobile-summary {
      grid-area: summary;
    }

    .subscription-card-main > .subscription-card-body {
      grid-area: body;
      width: 100%;
      height: auto;
      min-height: 0;
      overflow: visible;
    }

    .subscription-card.mobile-compact > .subscription-card-bottom {
      display: none;
    }

    .subscription-card.mobile-expanded > .subscription-card-bottom {
      grid-area: bottom;
      display: block;
    }

    .mobile-expanded .subscription-card-day-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: visible;
    }

    .mobile-expanded .subscription-card-day-row {
      height: auto;
      min-height: 0;
    }
  }


  /* ================================================================
     MOBILE CARD = DESKTOP CARD
     Keep the same image-left / Daily-menu-right layout on phones.
     The main row has a fixed 8:5 ratio so menu text never changes the
     card height. Existing Monday-Saturday carousel sync is preserved.
     ================================================================ */
  @media (max-width: 700px) {
    .subscriptions-grid {
      grid-template-columns: 1fr !important;
      align-items: start !important;
      gap: 12px !important;
    }

    .subscription-card.mobile-compact,
    .subscription-card.mobile-expanded {
      grid-column: auto !important;
      width: 100% !important;
      max-width: 590px !important;
      min-width: 0 !important;
      height: auto !important;
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "main"
        "bottom" !important;
      grid-template-rows: auto auto !important;
      align-content: start !important;
      justify-self: center !important;
      overflow: hidden !important;
      border-radius: 16px !important;
      background: #fff !important;
      box-shadow: 0 4px 12px rgba(36,40,21,.055) !important;
    }

    .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
      grid-template-areas: "media body" !important;
      grid-template-rows: 1fr !important;
      aspect-ratio: 8 / 5 !important;
      overflow: hidden !important;
      background: #fff !important;
    }

    .subscription-card-main > .subscription-card-media {
      grid-area: media !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      aspect-ratio: auto !important;
      align-self: stretch !important;
      overflow: hidden !important;
      border-right: 1px solid var(--subscriptions-border) !important;
      border-bottom: 0 !important;
    }

    /* Mobile should show the complete desktop card immediately. */
    .subscription-card-mobile-summary,
    .subscription-card-media-toggle,
    .subscription-card-collapse,
    .subscription-card-mobile-meta {
      display: none !important;
    }

    .subscription-card-main > .subscription-card-body,
    .mobile-compact .subscription-card-body,
    .mobile-expanded .subscription-card-body {
      grid-area: body !important;
      display: flex !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      gap: 4px !important;
      padding: 9px 8px 8px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      background: #fff !important;
    }

    .subscription-card-body h3,
    .mobile-expanded .subscription-card-body h3 {
      flex: 0 0 auto !important;
      display: -webkit-box !important;
      margin: 0 0 1px !important;
      overflow: hidden !important;
      color: var(--subscriptions-accent) !important;
      font-size: clamp(.84rem, 3.7vw, 1rem) !important;
      font-weight: 900 !important;
      line-height: 1.06 !important;
      letter-spacing: -.015em !important;
      overflow-wrap: anywhere !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-day-menu,
    .mobile-expanded .subscription-card-day-menu {
      display: flex !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      flex-direction: column !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }

    .subscription-card-day-menu .subscription-card-content-heading,
    .mobile-expanded .subscription-card-content-heading {
      flex: 0 0 auto !important;
      margin: 1px 0 4px !important;
      color: var(--subscriptions-ink) !important;
      font-size: clamp(.63rem, 2.8vw, .72rem) !important;
      font-weight: 900 !important;
      line-height: 1.05 !important;
    }

    .subscription-card-day-list,
    .mobile-expanded .subscription-card-day-list {
      display: grid !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      flex-direction: initial !important;
      gap: 3px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      list-style: none !important;
    }

    .subscription-card-day-row,
    .mobile-expanded .subscription-card-day-row {
      min-height: 0 !important;
      height: 100% !important;
      display: grid !important;
      grid-template-columns: minmax(47px,.40fr) minmax(0,1fr) !important;
      align-items: center !important;
      gap: 4px !important;
      padding: 2px 4px !important;
      overflow: hidden !important;
      border: 1px solid rgba(51,55,27,.10) !important;
      border-radius: 7px !important;
      background: #fbfcf8;
    }

    .subscription-card-day-row.active {
      background: #f2f5e7 !important;
      transform: translateX(1px) !important;
    }

    .subscription-card-day-label,
    .mobile-expanded .subscription-card-day-label {
      min-width: 0 !important;
      align-self: center !important;
      overflow: hidden !important;
      color: var(--subscriptions-olive);
      font-size: clamp(.50rem, 2.15vw, .61rem) !important;
      font-weight: 900 !important;
      line-height: 1.02 !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
    }

    .subscription-card-day-items,
    .mobile-expanded .subscription-card-day-items {
      align-self: center !important;
      display: block !important;
      min-width: 0 !important;
      overflow: visible !important;
      color: var(--subscriptions-muted);
      font-size: clamp(.48rem, 2.05vw, .59rem) !important;
      font-weight: 760 !important;
      line-height: 1.01 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
      text-overflow: clip !important;
      -webkit-box-orient: initial !important;
      -webkit-line-clamp: unset !important;
    }

    .subscription-card-day-items.is-long {
      font-size: clamp(.45rem, 1.92vw, .56rem) !important;
      line-height: .99 !important;
    }

    .subscription-card-day-items.is-very-long {
      font-size: clamp(.42rem, 1.78vw, .53rem) !important;
      line-height: .97 !important;
    }

    /* Match desktop carousel caption/dots instead of the old mobile compact style. */
    .mobile-compact .subscription-card-carousel::after,
    .mobile-expanded .subscription-card-carousel::after {
      inset: 42% 0 0 !important;
      background: linear-gradient(180deg,transparent,rgba(20,24,10,.88)) !important;
    }

    .mobile-compact .subscription-card-carousel-caption,
    .mobile-expanded .subscription-card-carousel-caption {
      left: 10px !important;
      right: 10px !important;
      bottom: 25px !important;
      gap: 2px !important;
    }

    .mobile-compact .subscription-card-carousel-label,
    .mobile-expanded .subscription-card-carousel-label {
      font-size: clamp(.52rem, 2.25vw, .64rem) !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      letter-spacing: .06em !important;
    }

    .mobile-compact .subscription-card-carousel-title,
    .mobile-expanded .subscription-card-carousel-title {
      display: block !important;
      width: 100% !important;
      overflow: hidden !important;
      color: #fff !important;
      font-size: clamp(.66rem, 2.9vw, .82rem) !important;
      font-weight: 900 !important;
      line-height: 1.08 !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      text-shadow: 0 2px 8px rgba(0,0,0,.55) !important;
    }

    .subscription-card-carousel-dots {
      bottom: 8px !important;
      gap: 4px !important;
    }

    .subscription-card-carousel-dot {
      width: 5px !important;
      height: 5px !important;
    }

    .subscription-card-media-unit {
      top: 8px !important;
      right: 8px !important;
      max-width: calc(100% - 16px) !important;
      padding: 4px 7px !important;
      font-size: clamp(.56rem, 2.35vw, .70rem) !important;
    }

    .subscription-card.mobile-compact > .subscription-card-bottom,
    .subscription-card.mobile-expanded > .subscription-card-bottom,
    .mobile-compact .subscription-card-bottom,
    .mobile-expanded .subscription-card-bottom {
      grid-area: bottom !important;
      display: block !important;
      padding: 9px 10px 10px !important;
      border-top: 1px solid var(--subscriptions-border) !important;
      background: #fcfdf9 !important;
    }

    .subscription-card-plan-heading {
      display: none !important;
    }

    .subscription-card-prices,
    .mobile-expanded .subscription-card-prices {
      display: grid !important;
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
      gap: 7px !important;
      margin: 0 !important;
    }

    .subscription-card-price,
    .mobile-expanded .subscription-card-price {
      min-width: 0 !important;
      min-height: 38px !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 5px !important;
      padding: 7px 8px !important;
      border-radius: 8px !important;
      font-size: clamp(.63rem, 2.8vw, .72rem) !important;
      line-height: 1.08 !important;
      text-align: left !important;
      white-space: nowrap !important;
    }

    .subscription-card-price span,
    .mobile-expanded .subscription-card-price span {
      min-width: 0 !important;
      color: var(--subscriptions-muted) !important;
      font-weight: 800 !important;
      white-space: nowrap !important;
    }

    .subscription-card-price strong,
    .mobile-expanded .subscription-card-price strong {
      flex: 0 0 auto !important;
      color: var(--subscriptions-accent) !important;
      font-size: clamp(.76rem, 3.4vw, .90rem) !important;
      font-weight: 900 !important;
      text-align: right !important;
      white-space: nowrap !important;
    }

    .subscription-card-actions,
    .mobile-expanded .subscription-card-actions {
      grid-column: auto !important;
      display: flex !important;
      min-width: 0 !important;
      margin-top: 0 !important;
      align-items: stretch !important;
    }

    .subscription-card-actions .subscriptions-button,
    .mobile-expanded .subscription-card-actions .subscriptions-button {
      width: 100% !important;
      min-height: 38px !important;
      padding: 6px 8px !important;
      border-radius: 8px !important;
      font-size: clamp(.63rem, 2.8vw, .72rem) !important;
      font-weight: 900 !important;
    }
  }

  @media (max-width: 380px) {
    .subscription-card-main > .subscription-card-body,
    .mobile-compact .subscription-card-body,
    .mobile-expanded .subscription-card-body {
      gap: 3px !important;
      padding: 7px 6px 6px !important;
    }

    .subscription-card-body h3,
    .mobile-expanded .subscription-card-body h3 {
      font-size: .78rem !important;
      line-height: 1.02 !important;
    }

    .subscription-card-day-menu .subscription-card-content-heading,
    .mobile-expanded .subscription-card-content-heading {
      margin-bottom: 3px !important;
      font-size: .60rem !important;
    }

    .subscription-card-day-list,
    .mobile-expanded .subscription-card-day-list {
      gap: 2px !important;
    }

    .subscription-card-day-row,
    .mobile-expanded .subscription-card-day-row {
      grid-template-columns: minmax(43px,.40fr) minmax(0,1fr) !important;
      gap: 3px !important;
      padding: 2px 3px !important;
    }

    .subscription-card-day-label,
    .mobile-expanded .subscription-card-day-label {
      font-size: .47rem !important;
    }

    .subscription-card-day-items,
    .mobile-expanded .subscription-card-day-items {
      font-size: .45rem !important;
      line-height: .98 !important;
    }

    .subscription-card-day-items.is-long {
      font-size: .42rem !important;
    }

    .subscription-card-day-items.is-very-long {
      font-size: .39rem !important;
    }

    .subscription-card-price,
    .mobile-expanded .subscription-card-price {
      padding-left: 6px !important;
      padding-right: 6px !important;
    }
  }


  /* ================================================================
     FINAL HORIZONTAL ALIGNMENT — MATCH SITE HEADER
     ---------------------------------------------------------------
     The shared SiteHeader uses a different responsive page gutter.
     Also reset max-width/margins here because an older/global
     .subscriptions-page-container rule can otherwise keep the catalogue
     centered in a narrower ~1520px column while the fixed controls span
     nearly the full viewport.
     ================================================================ */

  .subscriptions-page {
    --subscriptions-page-gutter: clamp(10px, 2vw, 36px);
  }

  @media (min-width: 1700px) {
    .subscriptions-page {
      --subscriptions-page-gutter: clamp(32px, 2.5vw, 96px);
    }
  }

  @media (min-width: 901px) and (max-width: 1439px) {
    .subscriptions-page {
      --subscriptions-page-gutter: clamp(12px, 1.8vw, 24px);
    }
  }

  @media (min-width: 701px) and (max-width: 900px) {
    .subscriptions-page {
      --subscriptions-page-gutter: clamp(10px, 2vw, 18px);
    }
  }

  @media (min-width: 701px) {
    /* Remove any inherited centered/max-width wrapper so the catalogue,
       headings and cards start on the exact same horizontal line as the
       fixed tabs/location controls and the SiteHeader. */
    .subscriptions-page-container {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: var(--subscriptions-page-gutter) !important;
      padding-right: var(--subscriptions-page-gutter) !important;
      box-sizing: border-box !important;
    }

    /* Fixed delivery tabs use the same page gutter. */
    .subscriptions-mode-selector {
      left: var(--subscriptions-page-gutter) !important;
      right: var(--subscriptions-page-gutter) !important;
      width: auto !important;
      max-width: none !important;
      box-sizing: border-box !important;
    }

    .subscriptions-mode-selector::before {
      left: calc(-1 * var(--subscriptions-page-gutter)) !important;
      right: calc(-1 * var(--subscriptions-page-gutter)) !important;
    }

    /* Fixed desktop search/address row uses the same page gutter. */
    .subscriptions-location {
      left: var(--subscriptions-page-gutter) !important;
      right: var(--subscriptions-page-gutter) !important;
      width: auto !important;
      max-width: none !important;
      box-sizing: border-box !important;
    }

    .subscriptions-location::before {
      left: calc(-1 * var(--subscriptions-page-gutter)) !important;
      right: calc(-1 * var(--subscriptions-page-gutter)) !important;
    }

    /* Explicitly neutralize any global content-width rules that can indent
       only the catalogue section while leaving the fixed controls wider. */
    .subscriptions-category,
    .subscriptions-category-heading,
    .subscriptions-grid,
    .subscriptions-alert,
    .subscriptions-loading,
    .subscriptions-empty {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      box-sizing: border-box !important;
    }
  }

  /* ================================================================
     SINGLE-ITEM CATEGORY ROWS
     ---------------------------------------------------------------
     Keep each category name as its own subscription section.
     When a category contains only one package, show up to THREE such
     categories in one desktop row. Categories with 2+ packages keep
     the original full-width layout.
     ================================================================ */
  @media (min-width: 901px) {
    .subscriptions-categories-layout {
      display: flex;
      width: 100%;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 26px 18px;
    }

    .subscriptions-categories-layout > .subscriptions-category {
      margin-top: 0 !important;
      min-width: 0;
    }

    .subscriptions-categories-layout > .subscriptions-category-single {
      flex: 0 0 calc((100% - 36px) / 3);
      width: calc((100% - 36px) / 3) !important;
      max-width: none !important;
    }

    .subscriptions-category-single .subscriptions-grid {
      grid-template-columns: minmax(0,1fr) !important;
      width: 100%;
    }

    .subscriptions-category-single .subscription-card {
      width: 100%;
      max-width: none;
    }

    .subscriptions-categories-layout > .subscriptions-category-multi {
      flex: 0 0 100%;
      width: 100% !important;
      max-width: none !important;
    }
  }

  @media (max-width: 900px) {
    .subscriptions-categories-layout {
      display: block;
      width: 100%;
    }
  }

  /* ================================================================
     OFFERS CATEGORY HIGHLIGHT
     Mirrors the Home page behaviour: the visual treatment activates from
     the actual category identity (Offer / Offers), not from hard-coded IDs.
     ================================================================ */
  .subscriptions-offers-category-section {
    position: relative;
    isolation: isolate;
    flex: 0 0 100% !important;
    width: 100% !important;
    max-width: none !important;
    margin-top: 10px !important;
    padding: clamp(12px,1.8vw,20px);
    overflow: hidden;
    border: 1px solid #d8dcc8;
    border-radius: 22px;
    background: #f8f9f3;
    box-shadow: 0 16px 42px rgba(51,55,27,.10);
    box-sizing: border-box;
  }

  .subscriptions-offers-category-section::after {
    content: "%";
    position: absolute;
    z-index: 0;
    right: -18px;
    bottom: -48px;
    color: rgba(51,55,27,.045);
    font-size: clamp(8rem,18vw,15rem);
    font-weight: 950;
    line-height: .8;
    transform: rotate(10deg);
    pointer-events: none;
  }

  .subscriptions-offers-category-section > * {
    position: relative;
    z-index: 1;
  }

  .subscriptions-offers-hero {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(0,1.35fr) minmax(180px,.65fr);
    align-items: center;
    gap: clamp(16px,3vw,34px);
    min-height: clamp(190px,19vw,260px);
    margin-bottom: 14px;
    padding: clamp(20px,3vw,36px);
    overflow: hidden;
    border: 1px solid rgba(231,222,181,.48);
    border-radius: 20px;
    background-color: #33371b;
    background-image:
      radial-gradient(circle at 88% 24%, rgba(229,210,126,.18), transparent 26%),
      linear-gradient(118deg,#2b3016 0%,#33371b 58%,#444b22 100%);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    box-shadow: 0 16px 36px rgba(51,55,27,.18);
    color: #fff;
  }

  .subscriptions-offers-hero::before {
    content: "";
    position: absolute;
    z-index: 0;
    inset: 0;
    background: linear-gradient(90deg,rgba(33,37,18,.84) 0%,rgba(40,45,21,.61) 42%,rgba(51,55,27,.26) 70%,rgba(51,55,27,.10) 100%);
    pointer-events: none;
  }

  .subscriptions-offers-hero::after {
    content: "";
    position: absolute;
    z-index: 1;
    top: -55%;
    bottom: -55%;
    left: -24%;
    width: 13%;
    transform: skewX(-18deg);
    background: linear-gradient(90deg,transparent,rgba(255,255,255,.03),rgba(225,207,132,.22),rgba(255,255,255,.07),transparent);
    pointer-events: none;
  }

  .subscriptions-offers-hero > * {
    position: relative;
    z-index: 2;
  }

  .subscriptions-offers-hero-copy {
    min-width: 0;
  }

  .subscriptions-offers-hero-eyebrow {
    display: inline-flex;
    min-height: 25px;
    align-items: center;
    padding: 5px 10px;
    border: 1px solid rgba(232,219,163,.48);
    border-radius: 999px;
    background: rgba(247,242,216,.10);
    color: #f4e9b5;
    font-size: .66rem;
    font-weight: 850;
    letter-spacing: .10em;
  }

  .subscriptions-offers-hero-copy > strong {
    display: block;
    margin-top: 12px;
    color: #fff;
    font-size: clamp(1.9rem,3.3vw,3rem);
    font-weight: 900;
    letter-spacing: -.035em;
    line-height: .98;
  }

  .subscriptions-offers-hero-copy > p {
    max-width: 520px;
    margin: 12px 0 0;
    color: rgba(255,255,255,.82);
    font-size: clamp(.76rem,.95vw,.9rem);
    font-weight: 650;
    line-height: 1.48;
  }

  .subscriptions-offers-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 14px;
  }

  .subscriptions-offers-hero-pills span {
    display: inline-flex;
    min-height: 27px;
    align-items: center;
    padding: 5px 9px;
    border: 1px solid rgba(240,231,193,.28);
    border-radius: 999px;
    background: rgba(247,242,216,.10);
    color: #f8f4df;
    font-size: .58rem;
    font-weight: 820;
    letter-spacing: .04em;
    white-space: nowrap;
  }

  .subscriptions-offers-hero-badge {
    justify-self: center;
    width: min(100%,210px);
    min-height: 132px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    padding: 18px 20px;
    border: 1px solid rgba(246,240,212,.58);
    border-radius: 22px;
    background:
      linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.045)),
      rgba(45,49,24,.58);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22),0 16px 34px rgba(23,26,11,.20);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    text-align: center;
  }

  .subscriptions-offers-hero-badge span {
    color: #f5edc9;
    font-size: .68rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  .subscriptions-offers-hero-badge strong {
    color: #fff;
    font-size: clamp(1.8rem,3vw,2.8rem);
    font-weight: 950;
    letter-spacing: -.04em;
    line-height: 1;
  }

  .subscriptions-offers-hero-badge small {
    color: rgba(255,255,255,.70);
    font-size: .62rem;
    font-weight: 700;
  }

  .subscriptions-offers-category-section > .subscriptions-category-heading {
    margin-bottom: 12px;
    padding: 10px 12px;
    border: 1px solid #e0e3d4;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 8px 22px rgba(51,55,27,.055);
  }

  .subscriptions-offers-category-section .subscriptions-category-heading h2 {
    color: var(--subscriptions-ink);
    font-size: clamp(1.18rem,1.8vw,1.5rem);
    font-weight: 900;
  }

  .subscriptions-offers-category-kicker {
    display: block;
    margin-bottom: 3px;
    color: #7a6120;
    font-size: .68rem;
    font-weight: 900;
    letter-spacing: .07em;
  }

  .subscriptions-offers-count-chip {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 5px 10px;
    border: 1px solid #dfe3ce;
    border-radius: 999px;
    background: #eef0e6;
    color: #33371b;
    font-size: .68rem;
    font-weight: 900;
    white-space: nowrap;
  }

  .subscription-card.subscription-card-offer-highlight {
    position: relative;
    isolation: isolate;
    border: 1px solid #cfd5b7;
    background: #fff;
    box-shadow: 0 10px 28px rgba(51,55,27,.10);
    transition: transform .2s ease,border-color .2s ease,box-shadow .2s ease;
  }

  .subscription-card-offer-highlight .subscription-card-media::after {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    background: linear-gradient(115deg,transparent 28%,rgba(255,255,255,.20) 49%,transparent 70%);
    pointer-events: none;
  }

  .subscription-card-offer-badge {
    position: absolute;
    z-index: 6;
    top: 10px;
    left: 10px;
    display: inline-flex;
    min-height: 26px;
    align-items: center;
    padding: 5px 9px;
    border: 1px solid rgba(255,255,255,.72);
    border-radius: 999px;
    background: #a42b1d;
    color: #fff;
    box-shadow: 0 6px 16px rgba(118,35,25,.24);
    font-size: .58rem;
    font-weight: 900;
    letter-spacing: .055em;
    line-height: 1;
    pointer-events: none;
  }

  .subscription-card-offer-highlight .subscription-card-price {
    border-color: #d9ddcc;
    background: #f1f3e9;
  }

  .subscription-card-offer-highlight .subscription-card-price strong {
    color: #33371b;
  }

  .subscription-card-offer-highlight .subscriptions-button.primary {
    border-color: #33371b;
    background: #33371b;
    box-shadow: 0 7px 16px rgba(51,55,27,.18);
  }

  @media (hover:hover) {
    .subscription-card.subscription-card-offer-highlight:hover {
      transform: translateY(-3px);
      border-color: #99a36f;
      box-shadow: 0 18px 38px rgba(51,55,27,.14);
    }
  }

  @media (min-width: 901px) {
    .subscriptions-offers-category-section.subscriptions-category-single .subscriptions-grid {
      grid-template-columns: minmax(0,590px) !important;
      justify-content: start;
    }

    .subscriptions-offers-category-section.subscriptions-category-single .subscription-card {
      width: 100%;
      max-width: 590px;
    }
  }

  @media (max-width: 700px) {
    .subscriptions-offers-category-section {
      margin-top: 8px !important;
      padding: 7px;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(51,55,27,.09);
    }

    .subscriptions-offers-hero {
      grid-template-columns: minmax(0,1fr) 92px;
      gap: 9px;
      min-height: 142px;
      margin-bottom: 9px;
      padding: 14px 10px 15px;
      border-radius: 13px;
    }

    .subscriptions-offers-hero-eyebrow {
      min-height: 21px;
      padding: 4px 7px;
      font-size: .47rem;
      letter-spacing: .07em;
    }

    .subscriptions-offers-hero-copy > strong {
      margin-top: 8px;
      font-size: clamp(1.36rem,7vw,1.9rem);
    }

    .subscriptions-offers-hero-copy > p {
      margin-top: 7px;
      font-size: .63rem;
      line-height: 1.35;
    }

    .subscriptions-offers-hero-pills {
      gap: 4px;
      margin-top: 8px;
    }

    .subscriptions-offers-hero-pills span {
      min-height: 21px;
      padding: 3px 5px;
      font-size: .39rem;
    }

    .subscriptions-offers-hero-badge {
      width: 82px;
      min-height: 82px;
      gap: 1px;
      padding: 9px 7px;
      border-radius: 13px;
    }

    .subscriptions-offers-hero-badge span { font-size: .40rem; }
    .subscriptions-offers-hero-badge strong { font-size: 1.15rem; }
    .subscriptions-offers-hero-badge small { font-size: .40rem; }

    .subscriptions-offers-category-section > .subscriptions-category-heading {
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 8px 9px;
      border-radius: 10px;
    }

    .subscriptions-offers-category-section .subscriptions-category-heading h2 {
      font-size: 1.06rem;
    }

    .subscriptions-offers-category-section .subscriptions-category-heading p {
      font-size: .72rem;
      line-height: 1.3;
    }

    .subscriptions-offers-category-kicker {
      font-size: .52rem;
    }

    .subscriptions-offers-count-chip {
      min-height: 25px;
      padding: 4px 7px;
      font-size: .54rem;
    }

    .subscription-card-offer-badge {
      top: 7px;
      left: 7px;
      min-height: 22px;
      padding: 4px 6px;
      font-size: .43rem;
    }

    .subscription-card.subscription-card-offer-highlight.mobile-compact,
    .subscription-card.subscription-card-offer-highlight.mobile-expanded {
      border-color: #cfd5b7;
      box-shadow: 0 7px 20px rgba(51,55,27,.10);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscriptions-offers-hero::after,
    .subscription-card.subscription-card-offer-highlight {
      transition: none;
    }
  }


  /* ================================================================
     DAILY MENU VIEW DETAILS
     Keep the Monday-Saturday list visually unchanged, but replace the
     long right-side menu text with a compact "View details" action.
     The original menu text opens in a lightweight detail card.
     ================================================================ */
  .subscription-card-day-row {
    grid-template-columns: minmax(68px,.38fr) minmax(0,1fr);
    cursor: default;
  }

  .subscription-card-day-view-button {
    justify-self: end;
    display: inline-flex;
    min-width: 82px;
    min-height: 27px;
    align-items: center;
    justify-content: center;
    padding: 4px 9px;
    border: 1px solid rgba(82,104,24,.22);
    border-radius: 7px;
    background: #ffffff;
    color: #526818;
    font: inherit;
    font-size: clamp(.58rem,1.72cqw,.69rem);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background .18s ease,
      border-color .18s ease,
      color .18s ease,
      transform .18s ease;
  }

  .subscription-card-day-view-button:hover {
    border-color: rgba(82,104,24,.42);
    background: #f0f4df;
    color: #33371b;
  }

  .subscription-card-day-view-button:active {
    transform: translateY(1px);
  }

  .subscription-card-day-view-button:focus-visible {
    outline: 3px solid rgba(82,104,24,.16);
    outline-offset: 2px;
  }

  .subscription-card-day-row.active .subscription-card-day-view-button {
    border-color: rgba(161,38,50,.20);
    background: #fff;
    color: #a12632;
  }

  .subscription-card-day-label-button {
    min-width: 0;
    justify-self: stretch;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--subscriptions-olive);
    font: inherit;
    font-size: clamp(.66rem,2.05cqw,.76rem);
    font-weight: 900;
    line-height: 1.2;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .subscription-card-day-label-button:hover {
    color: var(--subscriptions-accent);
  }

  .subscription-card-day-label-button:focus-visible {
    outline: 3px solid rgba(82,104,24,.16);
    outline-offset: 3px;
    border-radius: 4px;
  }

  .subscription-card-day-row.active .subscription-card-day-label-button {
    color: var(--subscriptions-accent);
  }

  .subscription-schedule-detail-overlay {
    position: fixed;
    z-index: 9999;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(22,25,13,.48);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    font-family: "Nunito", Arial, Helvetica, sans-serif;
  }

  .subscription-schedule-detail-card {
    width: min(760px,100%);
    max-height: min(86vh,680px);
    overflow: auto;
    padding: 0;
    border: 1px solid #d9ddcc;
    border-radius: 18px;
    background: #fff;
    color: #242815;
    box-shadow: 0 22px 55px rgba(20,24,10,.22);
  }

  .subscription-schedule-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 16px 16px 13px;
    border-bottom: 1px solid #e4e7db;
  }

  .subscription-schedule-detail-header > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .subscription-schedule-detail-header span {
    color: #626856;
    font-size: .72rem;
    font-weight: 800;
  }

  .subscription-schedule-detail-header strong {
    color: #a12632;
    font-size: 1.05rem;
    font-weight: 900;
    line-height: 1.15;
  }

  .subscription-schedule-detail-close {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #eef0e6;
    color: #33371b;
    font: inherit;
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
  }

  .subscription-schedule-detail-close:hover {
    background: #e3e7d6;
  }

  .subscription-schedule-detail-close:focus-visible {
    outline: 3px solid rgba(82,104,24,.18);
    outline-offset: 2px;
  }

  .subscription-schedule-detail-body {
    display: grid;
    grid-template-columns: minmax(220px,.82fr) minmax(0,1.18fr);
    gap: 14px;
    align-items: stretch;
    padding: 14px;
  }

  .subscription-schedule-detail-media {
    position: relative;
    width: 100%;
    min-width: 0;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border: 1px solid #e4e7db;
    border-radius: 14px;
    background: linear-gradient(145deg,#f7f7f2,#eef0e6);
  }

  .subscription-schedule-detail-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .subscription-schedule-detail-image-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
  }

  .subscription-schedule-detail-media-label {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 10px;
    z-index: 2;
    padding: 7px 9px;
    border-radius: 9px;
    background: rgba(25,29,14,.72);
    color: #fff;
    font-size: .72rem;
    font-weight: 900;
    line-height: 1.2;
    text-align: center;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .subscription-schedule-detail-content {
    margin: 0;
    padding: 16px;
    border: 1px solid rgba(82,104,24,.16);
    border-radius: 13px;
    background: #f7f9f1;
  }

  .subscription-schedule-detail-content > span {
    display: block;
    margin-bottom: 6px;
    color: #526818;
    font-size: .72rem;
    font-weight: 900;
  }

  .subscription-schedule-detail-content > p {
    margin: 0;
    color: #242815;
    font-size: .93rem;
    font-weight: 800;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .subscription-schedule-detail-content > .subscription-schedule-detail-description {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(82,104,24,.14);
    color: #626856;
    font-size: .82rem;
    font-weight: 650;
    line-height: 1.5;
  }

  @media (max-width: 700px) {
    .subscription-card-day-view-button {
      min-width: 70px;
      min-height: 24px;
      padding: 3px 6px;
      border-radius: 6px;
      font-size: 9px;
    }

    .subscription-card-day-label-button {
      font-size: 10.5px;
      line-height: 14px;
    }

    .subscription-schedule-detail-card {
      width: min(430px,100%);
      max-height: min(86vh,680px);
    }

    .subscription-schedule-detail-body {
      grid-template-columns: minmax(0,1fr);
      gap: 10px;
      padding: 10px;
    }

    .subscription-schedule-detail-media {
      width: min(100%,320px);
      justify-self: center;
    }

    .subscription-schedule-detail-overlay {
      display: block;
      padding: 0;
    }

    .subscription-schedule-detail-card {
      position: absolute;
      left: 12px;
      right: 12px;
      top: 50%;
      width: auto;
      max-height: min(62vh, 430px);
      border-radius: 17px;
      transform: translateY(-50%);
      animation: subscription-mobile-detail-pop .18s ease-out both;
    }

    .subscription-schedule-detail-header {
      padding: 14px 14px 12px;
    }

    .subscription-schedule-detail-content {
      margin: 12px;
      padding: 13px;
    }

    .subscription-schedule-detail-content > p {
      font-size: .88rem;
    }
  }

  @keyframes subscription-mobile-detail-pop {
    from {
      opacity: 0;
      transform: translateY(-48%) scale(.985);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-schedule-detail-card {
      animation: none !important;
    }
  }


  /* ================================================================
     CARD FONT VISIBILITY BOOST
     Increase text sizes inside the mobile subscription card while
     keeping the existing image-left / Daily-menu-right layout.
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-card-body h3,
    .mobile-expanded .subscription-card-body h3 {
      font-size: 15px !important;
      line-height: 1.08 !important;
    }

    .subscription-card-day-menu .subscription-card-content-heading,
    .mobile-expanded .subscription-card-content-heading {
      font-size: 12px !important;
      line-height: 1.1 !important;
    }

    .subscription-card-day-row,
    .mobile-expanded .subscription-card-day-row {
      grid-template-columns: minmax(56px,.42fr) minmax(0,1fr) !important;
      gap: 5px !important;
    }

    .subscription-card-day-label,
    .mobile-expanded .subscription-card-day-label {
      font-size: 10.5px !important;
      line-height: 1.08 !important;
    }

    .subscription-card-day-view-button {
      min-width: 74px !important;
      min-height: 25px !important;
      padding: 4px 7px !important;
      font-size: 10px !important;
      line-height: 1 !important;
    }

    .mobile-compact .subscription-card-carousel-label,
    .mobile-expanded .subscription-card-carousel-label {
      font-size: 10px !important;
      line-height: 1.05 !important;
    }

    .mobile-compact .subscription-card-carousel-title,
    .mobile-expanded .subscription-card-carousel-title {
      font-size: 12.5px !important;
      line-height: 1.1 !important;
    }

    .subscription-card-media-unit {
      font-size: 10.5px !important;
      padding: 4px 8px !important;
    }

    .subscription-card-price,
    .mobile-expanded .subscription-card-price {
      font-size: 12px !important;
      line-height: 1.12 !important;
    }

    .subscription-card-price strong,
    .mobile-expanded .subscription-card-price strong {
      font-size: 14px !important;
    }

    .subscription-card-actions .subscriptions-button,
    .mobile-expanded .subscription-card-actions .subscriptions-button {
      font-size: 12px !important;
      line-height: 1.1 !important;
    }
  }

  @media (max-width: 380px) {
    .subscription-card-body h3,
    .mobile-expanded .subscription-card-body h3 {
      font-size: 14px !important;
    }

    .subscription-card-day-menu .subscription-card-content-heading,
    .mobile-expanded .subscription-card-content-heading {
      font-size: 11px !important;
    }

    .subscription-card-day-row,
    .mobile-expanded .subscription-card-day-row {
      grid-template-columns: minmax(52px,.42fr) minmax(0,1fr) !important;
      gap: 4px !important;
    }

    .subscription-card-day-label,
    .mobile-expanded .subscription-card-day-label {
      font-size: 9.5px !important;
    }

    .subscription-card-day-view-button {
      min-width: 70px !important;
      font-size: 9.5px !important;
    }

    .mobile-compact .subscription-card-carousel-label,
    .mobile-expanded .subscription-card-carousel-label {
      font-size: 9.5px !important;
    }

    .mobile-compact .subscription-card-carousel-title,
    .mobile-expanded .subscription-card-carousel-title {
      font-size: 12px !important;
    }

    .subscription-card-media-unit {
      font-size: 10px !important;
    }

    .subscription-card-price,
    .mobile-expanded .subscription-card-price,
    .subscription-card-actions .subscriptions-button,
    .mobile-expanded .subscription-card-actions .subscriptions-button {
      font-size: 11.5px !important;
    }

    .subscription-card-price strong,
    .mobile-expanded .subscription-card-price strong {
      font-size: 13.5px !important;
    }
  }


  /* ================================================================
     WEIGHT BADGE VISIBILITY BOOST
     Make the media weight badge larger and red for better readability.
     ================================================================ */
  .subscription-card-media-unit{
    color: var(--subscriptions-accent) !important;
    border: 1px solid rgba(161,38,50,.28) !important;
    background: rgba(255,255,255,.97) !important;
    font-size: clamp(.84rem,2.9cqw,1.02rem) !important;
    padding: 6px 12px !important;
    line-height: 1.1 !important;
    box-shadow: 0 3px 10px rgba(20,24,10,.20) !important;
  }

  .subscription-card-mobile-unit{
    color: var(--subscriptions-accent) !important;
    border: 1px solid rgba(161,38,50,.20) !important;
    background: #fff6f7 !important;
    font-size: 11px !important;
  }

  @media (max-width: 700px) {
    .subscription-card-media-unit{
      top: 8px !important;
      right: 8px !important;
      max-width: calc(100% - 16px) !important;
      font-size: 12px !important;
      padding: 5px 10px !important;
    }

    .subscription-card-mobile-unit{
      font-size: 11px !important;
    }
  }

  @media (max-width: 380px) {
    .subscription-card-media-unit{
      font-size: 11px !important;
      padding: 4px 9px !important;
    }

    .subscription-card-mobile-unit{
      font-size: 10.5px !important;
    }
  }


  /* ================================================================
     FINAL RESPONSIVE NAV / DELIVERY-MENU ALIGNMENT
     Use one continuous light filter background from the main header down
     through the delivery tabs. The search/address section is positioned
     from the ACTUAL measured selector height so there is no visible gap
     at any desktop/tablet width or browser zoom ratio.
     ================================================================ */
  @media (min-width: 701px) {
    .subscriptions-mode-selector {
      top: var(--subscriptions-site-header-height, 80px) !important;
      padding-top: 16px !important;
      background: #f7f7f2 !important;
      box-shadow: none !important;
    }

    .subscriptions-mode-selector::before {
      content: none !important;
      display: none !important;
      height: 0 !important;
    }

    .subscriptions-mode-tabs {
      background: #f7f7f2 !important;
    }

    .subscriptions-location {
      position: fixed !important;
      top: calc(
        var(--subscriptions-site-header-height, 80px) +
        var(--subscriptions-mode-selector-height, 64px)
      ) !important;
      left: clamp(18px,4vw,64px) !important;
      right: clamp(18px,4vw,64px) !important;
      z-index: 979 !important;
      width: auto !important;
      margin: 0 !important;
      border-top: 0 !important;
      border-radius: 0 0 16px 16px !important;
      background: #f7f7f2 !important;
      box-shadow: 0 10px 26px rgba(51,55,27,.06) !important;
    }

    .subscriptions-location::before {
      content: none !important;
      display: none !important;
      height: 0 !important;
    }
  }


  /* ================================================================
     FINAL DESKTOP HORIZONTAL ALIGNMENT — MATCH THE SHARED HEADER
     The header uses --header-page-gutter values equivalent to the
     responsive --subscriptions-page-gutter defined above.
     Do NOT use the older clamp(18px,4vw,64px) here because it makes
     the subscription controls narrower than the header on wide screens.
     ================================================================ */
  @media (min-width: 701px) {
    .subscriptions-mode-selector,
    .subscriptions-location {
      left: var(--subscriptions-page-gutter) !important;
      right: var(--subscriptions-page-gutter) !important;
      width: auto !important;
      max-width: none !important;
      box-sizing: border-box !important;
    }

    /* Keep the actual controls flush with the same content edges as the
       filter underline and the SiteHeader. */
    .subscriptions-location {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .subscriptions-location-controls {
      width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    .subscriptions-location .subscriptions-search-inline {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    .subscriptions-current-location-button {
      margin-right: 0 !important;
    }
  }

  /* ================================================================
     PROFESSIONAL SUBSCRIPTION SKELETON LOADER
     Mirrors the final subscription cards to reduce layout shift.
     ================================================================ */
  .subscriptions-skeleton {
    width: 100%;
    margin-top: 20px;
  }

  .subscriptions-skeleton-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }

  .subscriptions-skeleton-heading {
    display: grid;
    gap: 7px;
    width: min(320px, 62%);
  }

  .subscriptions-skeleton-line,
  .subscriptions-skeleton-block,
  .subscriptions-skeleton-pill {
    position: relative;
    overflow: hidden;
    background: linear-gradient(
      110deg,
      #eceee5 8%,
      #f7f8f3 18%,
      #eceee5 33%
    );
    background-size: 220% 100%;
    animation: subscriptions-skeleton-shimmer 1.35s linear infinite;
  }

  .subscriptions-skeleton-title {
    width: 48%;
    height: 22px;
    border-radius: 7px;
  }

  .subscriptions-skeleton-subtitle {
    width: 78%;
    height: 11px;
    border-radius: 999px;
  }

  .subscriptions-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: 18px;
    width: 100%;
  }

  .subscriptions-skeleton-card {
    display: grid;
    width: 100%;
    max-width: 590px;
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "media body"
      "bottom bottom";
    grid-template-rows: auto auto;
    align-content: start;
    justify-self: start;
    overflow: hidden;
    border: 1px solid var(--subscriptions-border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 20px rgba(51, 55, 27, .055);
  }

  .subscriptions-skeleton-media {
    grid-area: media;
    width: 100%;
    aspect-ratio: 4 / 5;
    border-right: 1px solid var(--subscriptions-border);
    background: linear-gradient(
      110deg,
      #e8ebdf 8%,
      #f7f8f3 18%,
      #e8ebdf 33%
    );
    background-size: 220% 100%;
    animation: subscriptions-skeleton-shimmer 1.35s linear infinite;
  }

  .subscriptions-skeleton-body {
    grid-area: body;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 10px;
    padding: 18px 16px;
  }

  .subscriptions-skeleton-name {
    width: 78%;
    height: 20px;
    border-radius: 7px;
  }

  .subscriptions-skeleton-description {
    width: 100%;
    height: 10px;
    border-radius: 999px;
  }

  .subscriptions-skeleton-description.short {
    width: 72%;
  }

  .subscriptions-skeleton-note {
    width: 100%;
    height: 34px;
    margin-top: 2px;
    border-radius: 9px;
  }

  .subscriptions-skeleton-price-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .subscriptions-skeleton-price {
    height: 40px;
    border-radius: 8px;
  }

  .subscriptions-skeleton-menu {
    display: grid;
    gap: 6px;
    margin-top: 2px;
  }

  .subscriptions-skeleton-menu-row {
    width: 100%;
    height: 25px;
    border-radius: 8px;
  }

  .subscriptions-skeleton-bottom {
    grid-area: bottom;
    padding: 11px 14px 14px;
    border-top: 1px solid var(--subscriptions-border);
  }

  .subscriptions-skeleton-button {
    width: 100%;
    height: 40px;
    border-radius: 8px;
  }

  @keyframes subscriptions-skeleton-shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -20% 0;
    }
  }

  @media (max-width: 1260px) and (min-width: 701px) {
    .subscriptions-skeleton-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .subscriptions-skeleton {
      margin-top: 8px;
    }

    .subscriptions-skeleton-header {
      margin-bottom: 7px;
      padding: 11px 1px 0;
    }

    .subscriptions-skeleton-heading {
      width: 62%;
      gap: 5px;
    }

    .subscriptions-skeleton-title {
      width: 70%;
      height: 17px;
      border-radius: 5px;
    }

    .subscriptions-skeleton-subtitle {
      width: 100%;
      height: 9px;
    }

    .subscriptions-skeleton-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .subscriptions-skeleton-card {
      display: grid;
      width: 100%;
      max-width: none;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "media"
        "summary";
      grid-template-rows: auto auto;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(36, 40, 21, .035);
    }

    .subscriptions-skeleton-media {
      grid-area: media;
      width: 100%;
      aspect-ratio: 4 / 5;
      border-right: 0;
      border-bottom: 1px solid var(--subscriptions-border);
    }

    .subscriptions-skeleton-body {
      grid-area: summary;
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 5px;
      padding: 7px 7px 8px;
    }

    .subscriptions-skeleton-name {
      width: 86%;
      height: 12px;
      border-radius: 4px;
    }

    .subscriptions-skeleton-description {
      width: 68%;
      height: 9px;
    }

    .subscriptions-skeleton-description.short,
    .subscriptions-skeleton-note,
    .subscriptions-skeleton-menu {
      display: none;
    }

    .subscriptions-skeleton-price-row {
      grid-template-columns: minmax(0, 1fr);
      margin-top: 3px;
      padding-top: 5px;
      border-top: 1px solid rgba(51, 55, 27, .08);
    }

    .subscriptions-skeleton-price {
      width: 72%;
      height: 12px;
      border-radius: 4px;
    }

    .subscriptions-skeleton-price:nth-child(2) {
      display: none;
    }

    .subscriptions-skeleton-bottom {
      display: none;
    }
  }

  @media (max-width: 380px) {
    .subscriptions-skeleton-grid {
      gap: 7px;
    }

    .subscriptions-skeleton-body {
      padding-left: 6px;
      padding-right: 6px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscriptions-skeleton-line,
    .subscriptions-skeleton-block,
    .subscriptions-skeleton-pill,
    .subscriptions-skeleton-media {
      animation: none;
    }
  }


  /* =================================================================
     2026 SUBSCRIPTION CARD REFRESH
     Premium plan-card treatment while preserving the current data,
     schedule carousel, detail modal, offer behavior and subscribe routes.
     ================================================================= */

  .subscription-card {
    position: relative !important;
    isolation: isolate;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    overflow: hidden !important;
    border: 1px solid #dfe3d2 !important;
    border-radius: 24px !important;
    background:
      radial-gradient(circle at 100% 0, rgba(238,240,230,.88), transparent 34%),
      #ffffff !important;
    box-shadow:
      0 1px 1px rgba(51,55,27,.03),
      0 12px 34px rgba(51,55,27,.075) !important;
    transition:
      transform .22s ease,
      box-shadow .22s ease,
      border-color .22s ease !important;
  }

  @media (hover:hover) {
    .subscription-card:hover {
      transform: translateY(-4px);
      border-color: #b8c19b !important;
      box-shadow:
        0 2px 2px rgba(51,55,27,.03),
        0 20px 46px rgba(51,55,27,.12) !important;
    }
  }

  .subscription-card-main {
    min-width: 0;
    overflow: hidden;
  }

  .subscription-card-media {
    position: relative;
    isolation: isolate;
    overflow: hidden !important;
    background: #eef0e6 !important;
  }

  .subscription-card-carousel {
    background:
      radial-gradient(circle at 18% 16%, rgba(255,255,255,.72), transparent 28%),
      linear-gradient(145deg,#f7f7f2,#e9ecdf) !important;
  }

  .subscription-card-carousel::after {
    inset: 48% 0 0 !important;
    background:
      linear-gradient(180deg,transparent 0%,rgba(20,24,10,.16) 28%,rgba(20,24,10,.76) 100%) !important;
  }

  .subscription-card-carousel-image {
    transform: scale(1.001);
    transition: transform .5s ease, opacity .35s ease;
  }

  @media (hover:hover) {
    .subscription-card:hover .subscription-card-carousel-image {
      transform: scale(1.035);
    }
  }

  .subscription-card-media-unit {
    top: 12px !important;
    right: 12px !important;
    max-width: calc(100% - 24px) !important;
    padding: 6px 10px !important;
    border: 1px solid rgba(255,255,255,.72) !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.90) !important;
    color: #465719 !important;
    box-shadow: 0 7px 18px rgba(20,24,10,.14) !important;
    font-size: .7rem !important;
    font-weight: 900 !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .subscription-card-plan-float {
    position: absolute;
    z-index: 7;
    left: 12px;
    bottom: 12px;
    display: inline-flex;
    min-width: 106px;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
    padding: 8px 10px;
    border: 1px solid rgba(255,255,255,.30);
    border-radius: 13px;
    background: rgba(38,44,19,.90);
    color: #fff;
    box-shadow: 0 9px 24px rgba(16,20,7,.28);
    backdrop-filter: blur(9px);
    -webkit-backdrop-filter: blur(9px);
    pointer-events: none;
  }

  .subscription-card-plan-float small {
    color: rgba(255,255,255,.72);
    font-size: .62rem;
    font-weight: 800;
    line-height: 1;
  }

  .subscription-card-plan-float strong {
    color: #fff;
    font-size: .92rem;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
  }

  .subscription-card-carousel-caption {
    left: 13px !important;
    right: 13px !important;
    bottom: 55px !important;
  }

  .subscription-card-carousel-label {
    color: #dfe8ba !important;
    font-size: .58rem !important;
    letter-spacing: .09em !important;
  }

  .subscription-card-carousel-title {
    font-size: .9rem !important;
    line-height: 1.15 !important;
  }

  .subscription-card-carousel-dots {
    bottom: 6px !important;
  }

  .subscription-card-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 6px;
    color: #718141;
    font-size: .62rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: .075em;
    text-transform: uppercase;
  }

  .subscription-card-kicker::before {
    content: "";
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: #718141;
    box-shadow: 0 0 0 4px rgba(113,129,65,.11);
  }

  .subscription-card-body {
    background:
      linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,251,246,.98)) !important;
  }

  .subscription-card-body h3 {
    margin: 0 !important;
    color: #922f28 !important;
    font-weight: 950 !important;
    letter-spacing: -.025em !important;
  }

  .subscription-card-schedule-note {
    border-color: rgba(113,129,65,.15) !important;
    background: #f4f6ec !important;
  }

  .subscription-card-day-menu {
    min-width: 0;
    padding: 9px !important;
    border: 1px solid rgba(51,55,27,.09) !important;
    border-radius: 13px !important;
    background: #fbfcf8 !important;
  }

  .subscription-card-day-list {
    gap: 4px !important;
  }

  .subscription-card-day-row {
    min-height: 32px;
    align-items: center !important;
    padding: 5px 7px !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    box-shadow: inset 0 0 0 1px rgba(51,55,27,.065);
  }

  .subscription-card-day-row.active {
    background: #f5f7ed !important;
    box-shadow: inset 0 0 0 1px rgba(113,129,65,.18);
  }

  .subscription-card-day-label-button {
    font-weight: 900 !important;
  }

  .subscription-card-day-view-button {
    min-width: 70px !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: #eef1e4 !important;
    color: #465719 !important;
    box-shadow: none !important;
  }

  .subscription-card-day-view-button:hover {
    background: #dfe6ca !important;
  }

  .subscription-card-complimentary {
    padding: 9px 10px !important;
    border: 1px dashed rgba(113,129,65,.25) !important;
    border-radius: 12px !important;
    background: #f9faF4 !important;
  }

  .subscription-card-bottom {
    position: relative;
    padding: 13px 14px 14px !important;
    border-top: 1px solid #e7e9df !important;
    background:
      linear-gradient(180deg,#ffffff 0%,#fbfcf8 100%) !important;
  }

  .subscription-card-plan-heading {
    margin: 0 0 9px !important;
    color: #33371b !important;
    font-size: .68rem !important;
    font-weight: 950 !important;
    letter-spacing: .055em;
    text-transform: uppercase;
  }

  .subscription-card-prices {
    display: grid !important;
    grid-template-columns: repeat(3,minmax(0,1fr)) !important;
    gap: 7px !important;
    margin: 0 !important;
  }

  .subscription-card-price {
    min-width: 0 !important;
    min-height: 54px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 8px 9px !important;
    border: 1px solid #e4e7da !important;
    border-radius: 11px !important;
    background: #ffffff !important;
    color: #727767 !important;
    box-shadow: 0 2px 6px rgba(51,55,27,.025);
  }

  .subscription-card-price span {
    color: #7a8070 !important;
    font-size: .61rem !important;
    font-weight: 800 !important;
    line-height: 1.05 !important;
  }

  .subscription-card-price strong {
    color: #33371b !important;
    font-size: .93rem !important;
    font-weight: 950 !important;
    line-height: 1 !important;
  }

  .subscription-card-actions {
    grid-column: 1 / -1 !important;
    margin-top: 2px !important;
  }

  .subscription-card-actions .subscriptions-button.primary {
    position: relative;
    width: 100% !important;
    min-height: 44px !important;
    gap: 8px;
    padding: 9px 14px !important;
    border: 1px solid #33371b !important;
    border-radius: 12px !important;
    background:
      linear-gradient(135deg,#33371b 0%,#4b5227 100%) !important;
    color: #fff !important;
    box-shadow: 0 9px 20px rgba(51,55,27,.16) !important;
    font-size: .76rem !important;
    font-weight: 950 !important;
    letter-spacing: .02em;
  }

  .subscription-card-actions .subscriptions-button.primary::after {
    content: "→";
    font-size: 1rem;
    line-height: 1;
    transition: transform .18s ease;
  }

  .subscription-card-actions .subscriptions-button.primary:hover::after {
    transform: translateX(3px);
  }

  .subscription-card-offer-highlight {
    border-color: #d4d9bd !important;
    background:
      radial-gradient(circle at 100% 0,rgba(242,225,177,.35),transparent 34%),
      #fff !important;
  }

  .subscription-card-offer-highlight .subscription-card-plan-float {
    background: rgba(118,35,25,.92);
  }

  .subscription-card-offer-highlight .subscriptions-button.primary {
    border-color: #7b291f !important;
    background: linear-gradient(135deg,#7b291f,#a43b2f) !important;
    box-shadow: 0 9px 20px rgba(123,41,31,.18) !important;
  }

  /* Desktop/tablet: keep the efficient image-left, information-right format,
     but give it a stronger visual hierarchy and cleaner proportions. */
  @media (min-width: 701px) {
    .subscription-card {
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "main"
        "bottom" !important;
      grid-template-rows: auto auto !important;
    }

    .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      grid-template-columns: minmax(0,.90fr) minmax(0,1.10fr) !important;
      grid-template-areas: "media body" !important;
      width: 100% !important;
      min-height: 330px;
      aspect-ratio: auto !important;
      background: #fff;
    }

    .subscription-card-main > .subscription-card-media {
      grid-area: media !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 330px !important;
      aspect-ratio: auto !important;
      border-right: 1px solid #e6e8df !important;
      border-bottom: 0 !important;
    }

    .subscription-card-main > .subscription-card-body {
      grid-area: body !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      padding: 18px 16px 14px !important;
      gap: 8px !important;
    }

    .subscription-card-body h3 {
      font-size: clamp(1rem,2.7cqw,1.23rem) !important;
      line-height: 1.08 !important;
    }

    .subscription-card-day-menu .subscription-card-content-heading,
    .subscription-card-content-heading {
      margin: 0 0 6px !important;
      font-size: .68rem !important;
    }

    .subscription-card-day-label-button {
      font-size: .68rem !important;
    }

    .subscription-card-day-view-button {
      min-height: 26px !important;
      padding: 4px 8px !important;
      font-size: .60rem !important;
    }

    .subscription-card-bottom {
      grid-area: bottom !important;
    }
  }

  /* Mobile: compact cards stay browse-friendly, while expanded cards
     use the same premium visual language. */
  @media (max-width: 700px) {
    .subscription-card {
      border-radius: 16px !important;
      box-shadow: 0 6px 18px rgba(51,55,27,.065) !important;
    }

    .subscription-card.mobile-compact {
      display: block !important;
      overflow: hidden !important;
    }

    .mobile-compact .subscription-card-main {
      display: grid !important;
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "media"
        "summary" !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      aspect-ratio: auto !important;
      overflow: hidden !important;
    }

    .mobile-compact .subscription-card-media {
      grid-area: media !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      border: 0 !important;
    }

    .mobile-compact .subscription-card-mobile-summary {
      grid-area: summary !important;
      display: flex !important;
      min-width: 0;
      flex-direction: column;
      gap: 5px !important;
      padding: 8px 8px 9px !important;
      border: 0 !important;
      background: #fff !important;
    }

    .mobile-compact .subscription-card-mobile-name {
      min-height: 30px !important;
      color: #922f28 !important;
      font-size: 11.5px !important;
      font-weight: 950 !important;
      line-height: 14px !important;
    }

    .mobile-compact .subscription-card-mobile-price-row {
      min-height: 26px;
      margin: 0 !important;
      padding: 5px 7px !important;
      border: 0 !important;
      border-radius: 8px;
      background: #f4f6ec;
      color: #6f7564 !important;
      font-size: 9.5px !important;
      line-height: 12px !important;
    }

    .mobile-compact .subscription-card-mobile-price-row strong {
      color: #33371b !important;
      font-size: 11px !important;
    }

    .mobile-compact .subscription-card-body,
    .mobile-compact .subscription-card-bottom {
      display: none !important;
    }

    .subscription-card-plan-float {
      left: 7px;
      bottom: 7px;
      min-width: 84px;
      gap: 6px;
      padding: 6px 7px;
      border-radius: 9px;
    }

    .subscription-card-plan-float small {
      font-size: 8px;
    }

    .subscription-card-plan-float strong {
      font-size: 10.5px;
    }

    .subscription-card-media-unit {
      top: 7px !important;
      right: 7px !important;
      max-width: calc(100% - 14px) !important;
      padding: 4px 7px !important;
      font-size: 8px !important;
    }

    .mobile-compact .subscription-card-carousel-caption {
      left: 7px !important;
      right: 7px !important;
      bottom: 38px !important;
    }

    .mobile-compact .subscription-card-carousel-label {
      font-size: 7px !important;
    }

    .mobile-compact .subscription-card-carousel-title {
      display: -webkit-box !important;
      overflow: hidden !important;
      color: #fff !important;
      font-size: 9px !important;
      line-height: 11px !important;
      white-space: normal !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card.mobile-expanded {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "main"
        "bottom" !important;
      grid-template-rows: auto auto !important;
      border-radius: 20px !important;
    }

    .mobile-expanded .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "media"
        "body" !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      aspect-ratio: auto !important;
    }

    .mobile-expanded .subscription-card-media {
      grid-area: media !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 16 / 10 !important;
      border: 0 !important;
      border-bottom: 1px solid #e6e8df !important;
    }

    .mobile-expanded .subscription-card-body {
      grid-area: body !important;
      display: flex !important;
      gap: 8px !important;
      padding: 13px 12px 12px !important;
    }

    .mobile-expanded .subscription-card-kicker {
      margin-bottom: 5px;
      font-size: 8.5px;
    }

    .mobile-expanded .subscription-card-body h3 {
      color: #922f28 !important;
      font-size: 17px !important;
      line-height: 20px !important;
    }

    .mobile-expanded .subscription-card-mobile-meta {
      justify-content: flex-start !important;
    }

    .mobile-expanded .subscription-card-mobile-weekly {
      border: 0 !important;
      border-radius: 9px !important;
      background: #f4f6ec !important;
      color: #33371b !important;
    }

    .mobile-expanded .subscription-card-day-menu {
      padding: 8px !important;
      border-radius: 12px !important;
    }

    .mobile-expanded .subscription-card-day-row {
      min-height: 34px;
      padding: 5px 6px !important;
    }

    .mobile-expanded .subscription-card-day-label-button {
      font-size: 10.5px !important;
      line-height: 13px !important;
    }

    .mobile-expanded .subscription-card-day-view-button {
      min-width: 68px !important;
      min-height: 25px !important;
      font-size: 9px !important;
    }

    .mobile-expanded .subscription-card-bottom {
      grid-area: bottom !important;
      display: block !important;
      padding: 11px 10px 12px !important;
    }

    .mobile-expanded .subscription-card-plan-heading {
      display: block !important;
      margin-bottom: 8px !important;
      font-size: 9px !important;
    }

    .mobile-expanded .subscription-card-prices {
      grid-template-columns: repeat(3,minmax(0,1fr)) !important;
      gap: 6px !important;
    }

    .mobile-expanded .subscription-card-price {
      min-height: 50px !important;
      align-items: center !important;
      padding: 6px 4px !important;
      text-align: center !important;
    }

    .mobile-expanded .subscription-card-price span {
      font-size: 8.5px !important;
      text-align: center !important;
    }

    .mobile-expanded .subscription-card-price strong {
      font-size: 12px !important;
      text-align: center !important;
    }

    .mobile-expanded .subscription-card-actions .subscriptions-button.primary {
      min-height: 42px !important;
      border-radius: 10px !important;
      font-size: 11px !important;
    }
  }

  @media (max-width: 380px) {
    .mobile-compact .subscription-card-mobile-name {
      font-size: 10.5px !important;
      line-height: 13px !important;
    }

    .subscription-card-plan-float {
      min-width: 76px;
      padding: 5px 6px;
    }

    .subscription-card-plan-float small {
      font-size: 7.5px;
    }

    .subscription-card-plan-float strong {
      font-size: 9.5px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-card,
    .subscription-card-carousel-image,
    .subscription-card-actions .subscriptions-button.primary::after {
      transition: none !important;
    }
  }


  /* ==================================================================
     PRODUCT-STYLE SUBSCRIPTION CARD
     Inspired by the compact catalogue card:
     square carousel -> floating Subscribe -> price -> detail row ->
     title -> compact metadata. Full schedule/plans expand only on demand.
     ================================================================== */

  .subscriptions-grid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    align-items: start !important;
    gap: 18px !important;
  }

  .subscription-card,
  .subscription-card.mobile-compact,
  .subscription-card.mobile-expanded {
    position: relative !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-areas:
      "main"
      "bottom" !important;
    grid-template-rows: auto auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    height: auto !important;
    align-content: start !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .subscription-card-main,
  .subscription-card.mobile-compact .subscription-card-main,
  .subscription-card.mobile-expanded .subscription-card-main {
    grid-area: main !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-areas:
      "media"
      "summary"
      "body" !important;
    grid-template-rows: auto auto auto !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    aspect-ratio: auto !important;
    overflow: visible !important;
    background: transparent !important;
  }

  .subscription-card-media,
  .subscription-card-main > .subscription-card-media,
  .mobile-compact .subscription-card-media,
  .mobile-expanded .subscription-card-media {
    position: relative !important;
    grid-area: media !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 4 / 5 !important;
    overflow: hidden !important;
    border: 1px solid #e4e7dc !important;
    border-radius: 18px !important;
    background: #f2f4ec !important;
    box-shadow: 0 5px 16px rgba(44, 51, 24, .055) !important;
  }

  .subscription-card-carousel {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    border-radius: inherit !important;
    background: #f2f4ec !important;
  }

  .subscription-card-carousel-image {
    position: absolute !important;
    inset: 0 !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  .subscription-card-carousel::after {
    inset: 62% 0 0 !important;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(21, 25, 11, .08) 36%,
      rgba(21, 25, 11, .48)
    ) !important;
  }

  .subscription-card-carousel-caption {
    left: 10px !important;
    right: 10px !important;
    bottom: 13px !important;
    gap: 1px !important;
    padding-right: 74px;
  }

  .subscription-card-carousel-label {
    color: rgba(255,255,255,.78) !important;
    font-size: .56rem !important;
    font-weight: 900 !important;
    letter-spacing: .07em !important;
  }

  .subscription-card-carousel-title {
    display: -webkit-box !important;
    overflow: hidden !important;
    color: #fff !important;
    font-size: .74rem !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
    white-space: normal !important;
    text-overflow: clip !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .subscription-card-media-unit {
    top: 9px !important;
    right: 9px !important;
    max-width: calc(100% - 18px) !important;
    padding: 5px 8px !important;
    border: 1px solid rgba(255,255,255,.72) !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.92) !important;
    color: #526818 !important;
    box-shadow: 0 4px 12px rgba(20,24,10,.10) !important;
    font-size: .61rem !important;
    font-weight: 900 !important;
  }

  .subscription-card-offer-badge {
    z-index: 9 !important;
    top: 9px !important;
    left: 9px !important;
    max-width: 55% !important;
    padding: 5px 7px !important;
    border-radius: 999px !important;
    box-shadow: 0 4px 12px rgba(20,24,10,.12) !important;
    font-size: .54rem !important;
    line-height: 1 !important;
  }

  .subscription-card-media-toggle {
    z-index: 2 !important;
  }

  .subscription-card-carousel-control,
  .subscription-card-carousel-dots {
    z-index: 6 !important;
  }

  .subscription-card-media-subscribe {
    position: absolute;
    z-index: 10;
    right: 8px;
    bottom: -13px;
    display: inline-flex;
    min-width: 92px;
    min-height: 39px;
    align-items: center;
    justify-content: center;
    padding: 7px 14px;
    border: 2px solid #ec0b57;
    border-radius: 11px;
    background: #fff;
    color: #df0a50;
    box-shadow: 0 4px 10px rgba(223,10,80,.10);
    font: inherit;
    font-size: .72rem;
    font-weight: 950;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
    transition:
      background .18s ease,
      color .18s ease,
      transform .18s ease,
      box-shadow .18s ease;
  }

  .subscription-card-media-subscribe:hover {
    background: #ec0b57;
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 7px 16px rgba(223,10,80,.18);
  }

  .subscription-card-commerce-summary {
    grid-area: summary !important;
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 5px !important;
    padding: 20px 4px 7px !important;
    background: transparent !important;
  }

  .subscription-card-commerce-price-row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 7px;
    min-height: 31px;
  }

  .subscription-card-commerce-price-row strong {
    display: inline-flex;
    min-height: 31px;
    align-items: center;
    justify-content: center;
    padding: 4px 9px;
    border-radius: 8px;
    background: #288d3e;
    color: #fff;
    font-size: 1rem;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
  }

  .subscription-card-commerce-price-row span {
    min-width: 0;
    overflow: hidden;
    color: #6f7568;
    font-size: .72rem;
    font-weight: 760;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subscription-card-commerce-detail-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .subscription-card-commerce-detail-row > span {
    min-width: 0;
    overflow: hidden;
    color: #288d3e;
    font-size: .70rem;
    font-weight: 900;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subscription-card-commerce-detail-row > button {
    flex: 0 0 auto;
    margin: 0;
    padding: 0;
    border: 0;
    border-bottom: 1px solid currentColor;
    background: transparent;
    color: #2e6e44;
    font: inherit;
    font-size: .68rem;
    font-weight: 900;
    line-height: 1.15;
    cursor: pointer;
    white-space: nowrap;
  }

  .subscription-card-commerce-summary > h3 {
    display: -webkit-box;
    min-height: 39px;
    overflow: hidden;
    margin: 1px 0 0;
    color: #262c18;
    font-size: .90rem;
    font-weight: 900;
    line-height: 1.28;
    letter-spacing: -.015em;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .subscription-card-commerce-meta {
    display: flex;
    min-width: 0;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }

  .subscription-card-commerce-meta > span {
    display: inline-flex;
    min-width: 0;
    max-width: 100%;
    align-items: center;
    padding: 5px 8px;
    border-radius: 7px;
    background: #f4f6ec;
    color: #66704b;
    font-size: .64rem;
    font-weight: 800;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }

  .subscription-card-commerce-meta > span:last-child {
    background: #fff0d5;
    color: #9c6513;
  }

  /* The old mobile-only summary is superseded by the universal summary. */
  .subscription-card-mobile-summary {
    display: none !important;
  }

  /* Details remain available, but they are no longer permanently consuming
     card space. */
  .subscription-card-body,
  .subscription-card-main > .subscription-card-body,
  .subscription-card-bottom,
  .mobile-compact .subscription-card-body,
  .mobile-compact .subscription-card-bottom {
    display: none !important;
  }

  .subscription-card.mobile-expanded {
    grid-column: 1 / -1 !important;
    padding: 12px !important;
    border: 1px solid #e1e4d8 !important;
    border-radius: 20px !important;
    background: #fff !important;
    box-shadow: 0 14px 36px rgba(51,55,27,.09) !important;
  }

  .subscription-card.mobile-expanded .subscription-card-main {
    grid-template-columns: minmax(230px, .75fr) minmax(0, 1.25fr) !important;
    grid-template-areas:
      "media summary"
      "body body" !important;
    gap: 14px !important;
    align-items: start !important;
  }

  .subscription-card.mobile-expanded .subscription-card-media {
    grid-area: media !important;
  }

  .subscription-card.mobile-expanded .subscription-card-commerce-summary {
    grid-area: summary !important;
    align-self: center !important;
    padding: 18px 8px !important;
  }

  .subscription-card.mobile-expanded .subscription-card-commerce-summary > h3 {
    min-height: 0 !important;
    font-size: 1.18rem !important;
    line-height: 1.18 !important;
    -webkit-line-clamp: 3 !important;
  }

  .subscription-card.mobile-expanded .subscription-card-body {
    grid-area: body !important;
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 14px !important;
    border: 1px solid #e7e9df !important;
    border-radius: 14px !important;
    background: #fbfcf8 !important;
  }

  .subscription-card.mobile-expanded .subscription-card-bottom {
    grid-area: bottom !important;
    display: block !important;
    margin-top: 10px !important;
    padding: 13px !important;
    border: 1px solid #e7e9df !important;
    border-radius: 14px !important;
    background: #fff !important;
  }

  .subscription-card.mobile-expanded .subscription-card-kicker {
    display: none !important;
  }

  .subscription-card.mobile-expanded .subscription-card-top h3 {
    font-size: 1.05rem !important;
  }

  .subscription-card.mobile-expanded .subscription-card-prices {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .subscription-card.mobile-expanded .subscription-card-actions .subscriptions-button.primary {
    min-height: 41px !important;
  }

  @media (max-width: 1260px) {
    .subscriptions-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 16px !important;
    }
  }

  @media (max-width: 900px) {
    .subscriptions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 13px !important;
    }
  }

  @media (max-width: 700px) {
    .subscriptions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media,
    .mobile-expanded .subscription-card-media {
      border-radius: 14px !important;
    }

    .subscription-card-media-subscribe {
      right: 6px;
      bottom: -11px;
      min-width: 78px;
      min-height: 35px;
      padding: 6px 10px;
      border-radius: 9px;
      font-size: 10px;
    }

    .subscription-card-commerce-summary {
      gap: 4px !important;
      padding: 17px 2px 5px !important;
    }

    .subscription-card-commerce-price-row {
      gap: 5px;
      min-height: 27px;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 27px;
      padding: 4px 7px;
      border-radius: 7px;
      font-size: 12px;
    }

    .subscription-card-commerce-price-row span {
      font-size: 9.5px;
    }

    .subscription-card-commerce-detail-row {
      gap: 4px;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8.8px;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 31px;
      font-size: 11.5px;
      line-height: 15px;
    }

    .subscription-card-commerce-meta {
      gap: 4px;
    }

    .subscription-card-commerce-meta > span {
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 8.5px;
    }

    .subscription-card-carousel-caption {
      left: 7px !important;
      right: 7px !important;
      bottom: 9px !important;
      padding-right: 62px;
    }

    .subscription-card-carousel-label {
      font-size: 7px !important;
    }

    .subscription-card-carousel-title {
      font-size: 8.5px !important;
      line-height: 10px !important;
    }

    .subscription-card-media-unit {
      top: 6px !important;
      right: 6px !important;
      max-width: calc(100% - 12px) !important;
      padding: 4px 6px !important;
      font-size: 8px !important;
    }

    .subscription-card-offer-badge {
      top: 6px !important;
      left: 6px !important;
      padding: 4px 6px !important;
      font-size: 7px !important;
    }

    .subscription-card.mobile-expanded {
      padding: 8px !important;
      border-radius: 16px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-main {
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "media"
        "summary"
        "body" !important;
      gap: 8px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-commerce-summary {
      padding: 15px 4px 4px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-commerce-summary > h3 {
      font-size: 15px !important;
      line-height: 18px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-body {
      padding: 10px !important;
      border-radius: 11px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-bottom {
      margin-top: 7px !important;
      padding: 10px !important;
      border-radius: 11px !important;
    }

    .subscription-card.mobile-expanded .subscription-card-prices {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 5px !important;
    }
  }

  @media (max-width: 360px) {
    .subscriptions-grid {
      gap: 7px !important;
    }

    .subscription-card-media-subscribe {
      min-width: 70px;
      min-height: 32px;
      padding-inline: 8px;
      font-size: 9px;
    }

    .subscription-card-commerce-price-row strong {
      font-size: 11px;
    }

    .subscription-card-commerce-price-row span {
      font-size: 8.5px;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8px;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 10.5px;
      line-height: 13.5px;
    }

    .subscription-card-commerce-meta > span {
      font-size: 7.8px;
    }
  }


  /* ==================================================================
     FINAL COMPACT SUBSCRIPTION GRID
     Match the compact HomePage catalogue density on desktop:
     6 cards per row, smaller controls/text, same 1:1 carousel design.
     ================================================================== */

  @media (min-width: 1201px) {
    .subscriptions-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media {
      border-radius: 13px !important;
    }

    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -10px !important;
      min-width: 68px !important;
      min-height: 31px !important;
      padding: 5px 8px !important;
      border-width: 1.5px !important;
      border-radius: 8px !important;
      font-size: 9px !important;
      box-shadow: 0 3px 8px rgba(223,10,80,.10) !important;
    }

    .subscription-card-commerce-summary {
      gap: 3px !important;
      padding: 14px 2px 4px !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 25px !important;
      gap: 4px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 25px !important;
      padding: 3px 6px !important;
      border-radius: 6px !important;
      font-size: 10.5px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 8px !important;
    }

    .subscription-card-commerce-detail-row {
      gap: 3px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 7.6px !important;
      line-height: 9px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 27px !important;
      margin-top: 1px !important;
      font-size: 10px !important;
      line-height: 13px !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-commerce-meta {
      gap: 3px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 3px 5px !important;
      border-radius: 5px !important;
      font-size: 7.4px !important;
    }

    .subscription-card-media-unit {
      top: 5px !important;
      right: 5px !important;
      max-width: calc(100% - 10px) !important;
      padding: 3px 5px !important;
      font-size: 7px !important;
      box-shadow: 0 2px 7px rgba(20,24,10,.08) !important;
    }

    .subscription-card-offer-badge {
      top: 5px !important;
      left: 5px !important;
      max-width: 54% !important;
      padding: 3px 5px !important;
      font-size: 6.5px !important;
      box-shadow: 0 2px 7px rgba(20,24,10,.08) !important;
    }

    .subscription-card-carousel-caption {
      left: 6px !important;
      right: 6px !important;
      bottom: 7px !important;
      padding-right: 52px !important;
    }

    .subscription-card-carousel-label {
      font-size: 6px !important;
    }

    .subscription-card-carousel-title {
      font-size: 7.2px !important;
      line-height: 8.5px !important;
    }

    .subscription-card-carousel-control {
      width: 22px !important;
      height: 22px !important;
      font-size: .68rem !important;
    }

    .subscription-card-carousel-control.previous {
      left: 5px !important;
    }

    .subscription-card-carousel-control.next {
      right: 5px !important;
    }

    .subscription-card-carousel-dots {
      bottom: 3px !important;
      gap: 2px !important;
    }

    .subscription-card-carousel-dot {
      width: 4px !important;
      height: 4px !important;
    }
  }

  /* Keep the same visual density as the HomePage across intermediate widths. */
  @media (min-width: 901px) and (max-width: 1200px) {
    .subscriptions-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    .subscription-card-commerce-summary {
      padding-top: 15px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 10.5px !important;
      line-height: 13.5px !important;
    }

    .subscription-card-media-subscribe {
      min-width: 72px !important;
      min-height: 33px !important;
      padding: 5px 9px !important;
      font-size: 9.5px !important;
    }
  }

  /* Mobile remains compact and browse-friendly. */
  @media (max-width: 700px) {
    .subscriptions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .subscription-card-commerce-summary {
      gap: 3px !important;
      padding: 15px 2px 4px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 25px !important;
      padding: 3px 6px !important;
      font-size: 11px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 8.8px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8px !important;
      line-height: 9.5px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 28px !important;
      font-size: 10.5px !important;
      line-height: 13.5px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 3px 5px !important;
      font-size: 7.8px !important;
    }

    .subscription-card-media-subscribe {
      min-width: 70px !important;
      min-height: 32px !important;
      padding: 5px 8px !important;
      font-size: 9px !important;
    }
  }


  /* ==================================================================
     FINAL WEB = MOBILE CARD PARITY
     Desktop uses the exact same compact card anatomy as mobile:
     square carousel + floating Subscribe + price + details + title + chips.
     Keep six cards in one row on web.
     ================================================================== */

  @media (min-width: 1100px) {
    .subscriptions-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      align-items: start !important;
      gap: 9px !important;
    }

    .subscription-card,
    .subscription-card.mobile-compact {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "main"
        "bottom" !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      transform: none !important;
    }

    .subscription-card-main,
    .subscription-card.mobile-compact .subscription-card-main {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "media"
        "summary"
        "body" !important;
      grid-template-rows: auto auto auto !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      aspect-ratio: auto !important;
      overflow: visible !important;
      background: transparent !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      grid-area: media !important;
      position: relative !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      overflow: hidden !important;
      border: 1px solid #e4e7dc !important;
      border-radius: 13px !important;
      background: #f2f4ec !important;
      box-shadow: 0 4px 12px rgba(44,51,24,.045) !important;
    }

    .subscription-card-carousel,
    .subscription-card-carousel-image {
      width: 100% !important;
      height: 100% !important;
    }

    .subscription-card-carousel-image {
      object-fit: cover !important;
      object-position: center !important;
    }

    .subscription-card-carousel::after {
      inset: 64% 0 0 !important;
      background: linear-gradient(
        180deg,
        transparent,
        rgba(21,25,11,.07) 34%,
        rgba(21,25,11,.40)
      ) !important;
    }

    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -10px !important;
      min-width: 70px !important;
      min-height: 32px !important;
      padding: 5px 8px !important;
      border: 1.5px solid #ec0b57 !important;
      border-radius: 8px !important;
      background: #fff !important;
      color: #df0a50 !important;
      box-shadow: 0 3px 8px rgba(223,10,80,.10) !important;
      font-size: 9px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
    }

    .subscription-card-media-subscribe:hover {
      background: #ec0b57 !important;
      color: #fff !important;
    }

    .subscription-card-commerce-summary {
      grid-area: summary !important;
      display: flex !important;
      min-width: 0 !important;
      flex-direction: column !important;
      gap: 3px !important;
      padding: 14px 2px 4px !important;
      background: transparent !important;
    }

    .subscription-card-commerce-price-row {
      display: flex !important;
      min-width: 0 !important;
      min-height: 25px !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .subscription-card-commerce-price-row strong {
      display: inline-flex !important;
      min-height: 25px !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 3px 6px !important;
      border-radius: 6px !important;
      background: #288d3e !important;
      color: #fff !important;
      font-size: 10.5px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-price-row span {
      min-width: 0 !important;
      overflow: hidden !important;
      color: #6f7568 !important;
      font-size: 8px !important;
      font-weight: 760 !important;
      line-height: 1.05 !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-detail-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 3px !important;
      min-width: 0 !important;
    }

    .subscription-card-commerce-detail-row > span {
      min-width: 0 !important;
      overflow: hidden !important;
      color: #288d3e !important;
      font-size: 7.6px !important;
      font-weight: 900 !important;
      line-height: 9px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-detail-row > button {
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-bottom: 1px solid currentColor !important;
      background: transparent !important;
      color: #2e6e44 !important;
      font: inherit !important;
      font-size: 7.6px !important;
      font-weight: 900 !important;
      line-height: 9px !important;
      cursor: pointer !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-summary > h3 {
      display: -webkit-box !important;
      min-height: 27px !important;
      overflow: hidden !important;
      margin: 1px 0 0 !important;
      color: #262c18 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      line-height: 13px !important;
      letter-spacing: -.01em !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-commerce-meta {
      display: flex !important;
      min-width: 0 !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 3px !important;
    }

    .subscription-card-commerce-meta > span {
      display: inline-flex !important;
      max-width: 100% !important;
      align-items: center !important;
      padding: 3px 5px !important;
      border-radius: 5px !important;
      background: #f4f6ec !important;
      color: #66704b !important;
      font-size: 7.4px !important;
      font-weight: 800 !important;
      line-height: 1.05 !important;
    }

    .subscription-card-commerce-meta > span:last-child {
      background: #fff0d5 !important;
      color: #9c6513 !important;
    }

    .subscription-card-media-unit {
      top: 5px !important;
      right: 5px !important;
      max-width: calc(100% - 10px) !important;
      padding: 3px 5px !important;
      border-radius: 999px !important;
      font-size: 7px !important;
      box-shadow: 0 2px 7px rgba(20,24,10,.08) !important;
    }

    .subscription-card-offer-badge {
      top: 5px !important;
      left: 5px !important;
      max-width: 54% !important;
      padding: 3px 5px !important;
      border-radius: 999px !important;
      font-size: 6.5px !important;
      line-height: 1 !important;
      box-shadow: 0 2px 7px rgba(20,24,10,.08) !important;
    }

    .subscription-card-carousel-caption {
      left: 6px !important;
      right: 6px !important;
      bottom: 7px !important;
      gap: 1px !important;
      padding-right: 52px !important;
    }

    .subscription-card-carousel-label {
      font-size: 6px !important;
      line-height: 7px !important;
    }

    .subscription-card-carousel-title {
      display: -webkit-box !important;
      overflow: hidden !important;
      color: #fff !important;
      font-size: 7.2px !important;
      font-weight: 900 !important;
      line-height: 8.5px !important;
      white-space: normal !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-carousel-control {
      width: 22px !important;
      height: 22px !important;
      padding: 0 !important;
      font-size: .68rem !important;
    }

    .subscription-card-carousel-control.previous {
      left: 5px !important;
    }

    .subscription-card-carousel-control.next {
      right: 5px !important;
    }

    .subscription-card-carousel-dots {
      bottom: 3px !important;
      gap: 2px !important;
    }

    .subscription-card-carousel-dot {
      width: 4px !important;
      height: 4px !important;
    }

    /* Closed web cards stay exactly as compact as mobile cards. */
    .subscription-card.mobile-compact .subscription-card-body,
    .subscription-card.mobile-compact .subscription-card-bottom {
      display: none !important;
    }
  }

  /* Slightly smaller web/tablet widths keep the same design, only the
     number of columns changes so cards do not become cramped. */
  @media (min-width: 701px) and (max-width: 1099px) {
    .subscriptions-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      aspect-ratio: 4 / 5 !important;
      border-radius: 13px !important;
    }

    .subscription-card-commerce-summary {
      padding: 14px 2px 4px !important;
    }

    .subscription-card-media-subscribe {
      min-width: 70px !important;
      min-height: 32px !important;
      font-size: 9px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 10px !important;
      line-height: 13px !important;
    }
  }


  /* ==================================================================
     FINAL DESKTOP CATEGORY-LAYOUT FIX
     The previous page-level layout grouped single-item categories into
     THREE large columns. That made each otherwise-compact card stretch
     to ~1/3 of the viewport. Make the category wrappers themselves use
     the same six-column density as the cards.
     ================================================================== */

  @media (min-width: 1100px) {
    .subscriptions-categories-layout {
      display: grid !important;
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      width: 100% !important;
      align-items: start !important;
      gap: 22px 9px !important;
    }

    /* A category containing one subscription becomes one compact grid cell. */
    .subscriptions-categories-layout > .subscriptions-category-single {
      grid-column: span 1 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      flex: none !important;
      margin: 0 !important;
    }

    /* The compact card already contains the item name underneath the carousel.
       Remove the duplicate large category title that was sitting above it. */
    .subscriptions-categories-layout
      > .subscriptions-category-single
      > .subscriptions-category-heading {
      display: none !important;
    }

    .subscriptions-category-single .subscriptions-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      width: 100% !important;
      min-width: 0 !important;
      gap: 0 !important;
    }

    .subscriptions-category-single .subscription-card {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      justify-self: stretch !important;
    }

    /* Categories containing multiple subscription items still span the whole
       catalogue width, and their products themselves use six compact columns. */
    .subscriptions-categories-layout > .subscriptions-category-multi,
    .subscriptions-categories-layout > .subscriptions-offers-category-section {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      flex: none !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid {
      display: grid !important;
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }

    /* Keep every closed card exactly as compact as the HomePage-style card. */
    .subscriptions-category-single .subscription-card-main,
    .subscriptions-category-multi .subscription-card-main,
    .subscriptions-offers-category-section .subscription-card-main {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      aspect-ratio: auto !important;
    }

    .subscriptions-category-single .subscription-card-media,
    .subscriptions-category-multi .subscription-card-media,
    .subscriptions-offers-category-section .subscription-card-media {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
    }

    .subscriptions-category-single .subscription-card-commerce-summary,
    .subscriptions-category-multi .subscription-card-commerce-summary,
    .subscriptions-offers-category-section .subscription-card-commerce-summary {
      width: 100% !important;
      min-width: 0 !important;
    }
  }

  /* Medium web/tablet: same card design, four category cells per row. */
  @media (min-width: 901px) and (max-width: 1099px) {
    .subscriptions-categories-layout {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      width: 100% !important;
      align-items: start !important;
      gap: 18px 9px !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-single {
      grid-column: span 1 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      flex: none !important;
      margin: 0 !important;
    }

    .subscriptions-categories-layout
      > .subscriptions-category-single
      > .subscriptions-category-heading {
      display: none !important;
    }

    .subscriptions-category-single .subscriptions-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-multi,
    .subscriptions-categories-layout > .subscriptions-offers-category-section {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      flex: none !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }
  }

  /* Expanded details should span the complete catalogue row rather than
     stretching only one tiny compact cell. */
  @media (min-width: 901px) {
    .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
      grid-column: 1 / -1 !important;
    }

    .subscriptions-category-single:has(.subscription-card.mobile-expanded)
      > .subscriptions-grid {
      width: 100% !important;
    }

    .subscriptions-category-single:has(.subscription-card.mobile-expanded)
      .subscription-card.mobile-expanded {
      width: 100% !important;
      max-width: none !important;
    }
  }


  /* ==================================================================
     FINAL WEB GRID + IMAGE RATIO
     8 compact subscription cards per desktop row.
     Carousel/image area uses a strict 4:5 portrait ratio.
     ================================================================== */

  @media (min-width: 1200px) {
    .subscriptions-categories-layout {
      display: grid !important;
      grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
      width: 100% !important;
      align-items: start !important;
      gap: 20px 8px !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-single {
      grid-column: span 1 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .subscriptions-category-single .subscriptions-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      width: 100% !important;
      min-width: 0 !important;
      gap: 0 !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-multi,
    .subscriptions-categories-layout > .subscriptions-offers-category-section {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      display: grid !important;
      grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
      gap: 8px !important;
      align-items: start !important;
    }

    .subscription-card,
    .subscription-card.mobile-compact {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      border-radius: 12px !important;
    }

    .subscription-card-carousel,
    .subscription-card-carousel-image {
      width: 100% !important;
      height: 100% !important;
    }

    .subscription-card-carousel-image {
      object-fit: cover !important;
      object-position: center !important;
    }

    .subscription-card-media-subscribe {
      right: 4px !important;
      bottom: -9px !important;
      min-width: 62px !important;
      min-height: 29px !important;
      padding: 4px 7px !important;
      border-radius: 7px !important;
      font-size: 8px !important;
    }

    .subscription-card-commerce-summary {
      gap: 3px !important;
      padding: 13px 1px 3px !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 23px !important;
      gap: 3px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 23px !important;
      padding: 3px 5px !important;
      border-radius: 6px !important;
      font-size: 9.5px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 7.3px !important;
    }

    .subscription-card-commerce-detail-row {
      gap: 2px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 7px !important;
      line-height: 8.5px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 25px !important;
      font-size: 9px !important;
      line-height: 12px !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-commerce-meta {
      gap: 2px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 3px 4px !important;
      border-radius: 5px !important;
      font-size: 6.8px !important;
    }

    .subscription-card-media-unit {
      top: 4px !important;
      right: 4px !important;
      max-width: calc(100% - 8px) !important;
      padding: 3px 4px !important;
      font-size: 6.4px !important;
    }

    .subscription-card-offer-badge {
      top: 4px !important;
      left: 4px !important;
      max-width: 52% !important;
      padding: 3px 4px !important;
      font-size: 6px !important;
    }

    .subscription-card-carousel-caption {
      left: 5px !important;
      right: 5px !important;
      bottom: 6px !important;
      padding-right: 45px !important;
    }

    .subscription-card-carousel-label {
      font-size: 5.5px !important;
      line-height: 6.5px !important;
    }

    .subscription-card-carousel-title {
      font-size: 6.6px !important;
      line-height: 8px !important;
    }

    .subscription-card-carousel-control {
      width: 20px !important;
      height: 20px !important;
      font-size: .62rem !important;
    }

    .subscription-card-carousel-control.previous {
      left: 4px !important;
    }

    .subscription-card-carousel-control.next {
      right: 4px !important;
    }

    .subscription-card-carousel-dots {
      bottom: 2px !important;
      gap: 2px !important;
    }

    .subscription-card-carousel-dot {
      width: 3.5px !important;
      height: 3.5px !important;
    }
  }

  /* Keep a similar compact progression on smaller web widths. */
  @media (min-width: 1000px) and (max-width: 1199px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      gap: 18px 8px !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      aspect-ratio: 4 / 5 !important;
    }
  }

  @media (min-width: 701px) and (max-width: 999px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      aspect-ratio: 4 / 5 !important;
    }
  }

  /* Mobile also keeps the same 4:5 carousel ratio. */
  @media (max-width: 700px) {
    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media,
    .mobile-expanded .subscription-card-media {
      aspect-ratio: 4 / 5 !important;
    }
  }


  /* ==================================================================
     FINAL CARD LOOK — MATCH HOMEPAGE PRODUCT CARD
     4:5 carousel, floating green SUBSCRIBE button, larger readable text.
     ================================================================== */

  .subscription-card-media,
  .subscription-card-main > .subscription-card-media,
  .mobile-compact .subscription-card-media,
  .mobile-expanded .subscription-card-media {
    aspect-ratio: 4 / 5 !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    background: #f4f6ee !important;
    box-shadow: 0 4px 12px rgba(44, 51, 24, .055) !important;
  }

  .subscription-card-carousel-image {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  /* Floating button styled like the HomePage ADD control, but green. */
  .subscription-card-media-subscribe {
    right: 6px !important;
    bottom: -14px !important;
    min-width: 86px !important;
    min-height: 38px !important;
    padding: 7px 12px !important;
    border: 2px solid #2f8f46 !important;
    border-radius: 11px !important;
    background: #ffffff !important;
    color: #2f8f46 !important;
    box-shadow: 0 4px 10px rgba(47, 143, 70, .12) !important;
    font-size: 11px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  .subscription-card-media-subscribe:hover {
    background: #2f8f46 !important;
    color: #ffffff !important;
    box-shadow: 0 7px 16px rgba(47, 143, 70, .18) !important;
  }

  .subscription-card-commerce-summary {
    gap: 6px !important;
    padding: 20px 4px 7px !important;
  }

  /* Price row — same visual hierarchy as HomePage product price. */
  .subscription-card-commerce-price-row {
    min-height: 31px !important;
    gap: 7px !important;
  }

  .subscription-card-commerce-price-row strong {
    min-height: 31px !important;
    padding: 5px 9px !important;
    border-radius: 8px !important;
    background: #288d3e !important;
    color: #ffffff !important;
    font-size: 15px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
  }

  .subscription-card-commerce-price-row span {
    color: #72786c !important;
    font-size: 11px !important;
    font-weight: 760 !important;
  }

  /* Left info + right View details, same as OFF + View More. */
  .subscription-card-commerce-detail-row {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }

  .subscription-card-commerce-detail-row > span {
    color: #288d3e !important;
    font-size: 10.5px !important;
    font-weight: 950 !important;
    line-height: 1.15 !important;
  }

  .subscription-card-commerce-detail-row > button {
    color: #2e6e44 !important;
    font-size: 10.5px !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
  }

  .subscription-card-commerce-summary > h3 {
    min-height: 38px !important;
    margin: 1px 0 0 !important;
    color: #202516 !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    line-height: 1.32 !important;
    letter-spacing: -.01em !important;
    -webkit-line-clamp: 2 !important;
  }

  .subscription-card-commerce-meta {
    gap: 5px !important;
    margin-top: 1px !important;
  }

  .subscription-card-commerce-meta > span {
    padding: 5px 8px !important;
    border-radius: 7px !important;
    background: #f4f6ec !important;
    color: #67704d !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    line-height: 1.1 !important;
  }

  .subscription-card-commerce-meta > span:last-child {
    background: #fff0d5 !important;
    color: #9c6513 !important;
  }

  .subscription-card-media-unit {
    top: 7px !important;
    right: 7px !important;
    padding: 4px 7px !important;
    font-size: 9px !important;
  }

  .subscription-card-offer-badge {
    top: 7px !important;
    left: 7px !important;
    padding: 4px 7px !important;
    font-size: 8.5px !important;
  }

  .subscription-card-carousel-caption {
    left: 8px !important;
    right: 8px !important;
    bottom: 9px !important;
    padding-right: 68px !important;
  }

  .subscription-card-carousel-label {
    font-size: 7.5px !important;
    line-height: 9px !important;
  }

  .subscription-card-carousel-title {
    font-size: 9.5px !important;
    line-height: 11px !important;
  }

  /* Keep 8 cards per row on desktop. */
  @media (min-width: 1200px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
      gap: 22px 8px !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .subscription-card-commerce-summary {
      padding-top: 19px !important;
    }

    .subscription-card-commerce-price-row strong {
      font-size: 13px !important;
      padding-inline: 7px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 9.5px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 9px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 32px !important;
      font-size: 11.5px !important;
      line-height: 15px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 4px 6px !important;
      font-size: 8.5px !important;
    }

    .subscription-card-media-subscribe {
      min-width: 78px !important;
      min-height: 35px !important;
      padding: 6px 10px !important;
      font-size: 10px !important;
    }
  }

  /* Mobile: use the exact same visual design, only scale it slightly. */
  @media (max-width: 700px) {
    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media,
    .mobile-expanded .subscription-card-media {
      border-radius: 14px !important;
    }

    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -12px !important;
      min-width: 74px !important;
      min-height: 34px !important;
      padding: 6px 9px !important;
      border-radius: 9px !important;
      font-size: 9.5px !important;
    }

    .subscription-card-commerce-summary {
      gap: 4px !important;
      padding: 17px 2px 5px !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 28px !important;
      gap: 5px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 28px !important;
      padding: 4px 7px !important;
      font-size: 12px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 9px !important;
    }

    .subscription-card-commerce-detail-row {
      gap: 4px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8.5px !important;
      line-height: 10px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 31px !important;
      font-size: 11px !important;
      line-height: 14px !important;
    }

    .subscription-card-commerce-meta {
      gap: 4px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 4px 6px !important;
      font-size: 8px !important;
    }

    .subscription-card-media-unit {
      top: 5px !important;
      right: 5px !important;
      padding: 3px 5px !important;
      font-size: 7.5px !important;
    }

    .subscription-card-offer-badge {
      top: 5px !important;
      left: 5px !important;
      padding: 3px 5px !important;
      font-size: 7px !important;
    }

    .subscription-card-carousel-caption {
      left: 6px !important;
      right: 6px !important;
      bottom: 7px !important;
      padding-right: 58px !important;
    }

    .subscription-card-carousel-label {
      font-size: 6.5px !important;
      line-height: 8px !important;
    }

    .subscription-card-carousel-title {
      font-size: 8px !important;
      line-height: 9.5px !important;
    }
  }


  /* ==================================================================
     FINAL HOME-PAGE STYLE SUBSCRIPTION CARD FIX
     - Keep 8 cards per row on desktop
     - Keep 4:5 carousel
     - Remove tiny text overlay from carousel
     - Increase all visible card content sizes
     - Green floating Subscribe button like HomePage ADD
     ================================================================== */

  /* Clean image area: keep carousel behavior, remove the tiny day/title
     overlay that was making the image look crowded and unreadable. */
  .subscription-card-carousel-caption {
    display: none !important;
  }

  .subscription-card-carousel::after {
    display: none !important;
  }

  .subscription-card-carousel-image {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  .subscription-card-media,
  .subscription-card-main > .subscription-card-media,
  .mobile-compact .subscription-card-media,
  .mobile-expanded .subscription-card-media {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 4 / 5 !important;
    overflow: hidden !important;
    border: 1px solid #e4e7dc !important;
    border-radius: 15px !important;
    background: #f4f6ee !important;
    box-shadow: 0 5px 14px rgba(44,51,24,.055) !important;
  }

  /* Keep only subtle carousel navigation over the image. */
  .subscription-card-carousel-control {
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    border: 1px solid rgba(255,255,255,.86) !important;
    background: rgba(38,44,19,.58) !important;
    font-size: .72rem !important;
  }

  .subscription-card-carousel-control.previous {
    left: 5px !important;
  }

  .subscription-card-carousel-control.next {
    right: 5px !important;
  }

  .subscription-card-carousel-dots {
    bottom: 5px !important;
    gap: 3px !important;
  }

  .subscription-card-carousel-dot {
    width: 5px !important;
    height: 5px !important;
  }

  /* Same floating-button look as HomePage ADD, using subscription green. */
  .subscription-card-media-subscribe {
    right: 6px !important;
    bottom: -13px !important;
    min-width: 82px !important;
    min-height: 36px !important;
    padding: 6px 10px !important;
    border: 2px solid #288d3e !important;
    border-radius: 10px !important;
    background: #ffffff !important;
    color: #288d3e !important;
    box-shadow: 0 4px 10px rgba(40,141,62,.14) !important;
    font-size: 10px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
    z-index: 12 !important;
  }

  .subscription-card-media-subscribe:hover {
    background: #288d3e !important;
    color: #ffffff !important;
    box-shadow: 0 7px 16px rgba(40,141,62,.20) !important;
  }

  /* Make the weight/unit badge readable but unobtrusive. */
  .subscription-card-media-unit {
    top: 6px !important;
    right: 6px !important;
    max-width: calc(100% - 12px) !important;
    padding: 4px 7px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.94) !important;
    color: #526818 !important;
    font-size: 8.5px !important;
    font-weight: 900 !important;
    box-shadow: 0 2px 8px rgba(20,24,10,.10) !important;
  }

  .subscription-card-offer-badge {
    top: 6px !important;
    left: 6px !important;
    padding: 4px 6px !important;
    border-radius: 999px !important;
    font-size: 7.5px !important;
  }

  /* Content block below the image — match HomePage hierarchy. */
  .subscription-card-commerce-summary {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 5px !important;
    padding: 19px 3px 6px !important;
  }

  .subscription-card-commerce-price-row {
    display: flex !important;
    min-width: 0 !important;
    min-height: 30px !important;
    align-items: center !important;
    gap: 6px !important;
  }

  .subscription-card-commerce-price-row strong {
    display: inline-flex !important;
    min-height: 30px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 8px !important;
    border-radius: 8px !important;
    background: #288d3e !important;
    color: #ffffff !important;
    font-size: 13.5px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-price-row span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6e7467 !important;
    font-size: 9.5px !important;
    font-weight: 760 !important;
    line-height: 1.1 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /* Same structure as OFF on left + View More on right. */
  .subscription-card-commerce-detail-row {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) auto !important;
    align-items: center !important;
    gap: 5px !important;
    min-width: 0 !important;
  }

  .subscription-card-commerce-detail-row > span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #288d3e !important;
    font-size: 9.5px !important;
    font-weight: 950 !important;
    line-height: 11px !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-detail-row > button {
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-bottom: 1px solid currentColor !important;
    background: transparent !important;
    color: #2e6e44 !important;
    font: inherit !important;
    font-size: 9.5px !important;
    font-weight: 900 !important;
    line-height: 11px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-summary > h3 {
    display: -webkit-box !important;
    min-height: 34px !important;
    overflow: hidden !important;
    margin: 1px 0 0 !important;
    color: #202516 !important;
    font-size: 12.5px !important;
    font-weight: 900 !important;
    line-height: 16px !important;
    letter-spacing: -.01em !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .subscription-card-commerce-meta {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    margin-top: 1px !important;
  }

  .subscription-card-commerce-meta > span {
    display: inline-flex !important;
    min-width: 0 !important;
    max-width: 100% !important;
    align-items: center !important;
    padding: 4px 6px !important;
    border-radius: 6px !important;
    background: #f4f6ec !important;
    color: #67704d !important;
    font-size: 8.5px !important;
    font-weight: 800 !important;
    line-height: 1.1 !important;
    overflow-wrap: anywhere !important;
  }

  .subscription-card-commerce-meta > span:last-child {
    background: #fff0d5 !important;
    color: #9c6513 !important;
  }

  /* Large web: exactly 8 cards per row, but keep text readable. */
  @media (min-width: 1200px) {
    .subscriptions-categories-layout {
      display: grid !important;
      grid-template-columns: repeat(8, minmax(0,1fr)) !important;
      width: 100% !important;
      align-items: start !important;
      gap: 22px 10px !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-single {
      grid-column: span 1 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .subscriptions-category-single .subscriptions-grid {
      grid-template-columns: minmax(0,1fr) !important;
      gap: 0 !important;
    }

    .subscriptions-categories-layout > .subscriptions-category-multi,
    .subscriptions-categories-layout > .subscriptions-offers-category-section {
      grid-column: 1 / -1 !important;
      width: 100% !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(8, minmax(0,1fr)) !important;
      gap: 10px !important;
    }
  }

  /* Tablet / smaller web */
  @media (min-width: 901px) and (max-width: 1199px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(6, minmax(0,1fr)) !important;
      gap: 18px 9px !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(6, minmax(0,1fr)) !important;
      gap: 9px !important;
    }
  }

  /* Mobile: same exact visual hierarchy with slightly smaller sizing. */
  @media (max-width: 700px) {
    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -12px !important;
      min-width: 72px !important;
      min-height: 33px !important;
      padding: 5px 8px !important;
      border-radius: 9px !important;
      font-size: 9px !important;
    }

    .subscription-card-commerce-summary {
      gap: 4px !important;
      padding: 17px 2px 5px !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 27px !important;
      gap: 5px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 27px !important;
      padding: 4px 7px !important;
      font-size: 12px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 8.8px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8.2px !important;
      line-height: 10px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 30px !important;
      font-size: 11px !important;
      line-height: 14px !important;
    }

    .subscription-card-commerce-meta > span {
      padding: 4px 5px !important;
      font-size: 7.8px !important;
    }
  }


  /* ==================================================================
     FINAL HOMEPAGE PRODUCT-CARD PARITY
     Use the same content stack as the second reference:
     image -> floating action -> price -> green info/View details ->
     large name -> plain gray unit -> one soft-yellow tag.
     ================================================================== */

  /* Image/carousel stays clean and uncluttered. */
  .subscription-card-carousel-caption,
  .subscription-card-carousel::after {
    display: none !important;
  }

  .subscription-card-media,
  .subscription-card-main > .subscription-card-media,
  .mobile-compact .subscription-card-media,
  .mobile-expanded .subscription-card-media {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 4 / 5 !important;
    overflow: hidden !important;
    border: 1px solid #e3e6dc !important;
    border-radius: 16px !important;
    background: #f5f6ef !important;
    box-shadow: 0 5px 14px rgba(44,51,24,.05) !important;
  }

  .subscription-card-carousel,
  .subscription-card-carousel-image {
    width: 100% !important;
    height: 100% !important;
  }

  .subscription-card-carousel-image {
    object-fit: cover !important;
    object-position: center !important;
  }

  /* Floating SUBSCRIBE = HomePage ADD visual language, green variant. */
  .subscription-card-media-subscribe {
    position: absolute !important;
    z-index: 12 !important;
    right: 6px !important;
    bottom: -14px !important;
    display: inline-flex !important;
    min-width: 88px !important;
    min-height: 39px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px 12px !important;
    border: 2px solid #288d3e !important;
    border-radius: 11px !important;
    background: #fff !important;
    color: #288d3e !important;
    box-shadow: 0 4px 10px rgba(40,141,62,.14) !important;
    font-size: 11px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
    text-decoration: none !important;
    white-space: nowrap !important;
  }

  .subscription-card-media-subscribe:hover {
    background: #288d3e !important;
    color: #fff !important;
    box-shadow: 0 7px 16px rgba(40,141,62,.20) !important;
  }

  .subscription-card-commerce-summary {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 6px !important;
    padding: 21px 4px 8px !important;
    background: transparent !important;
    text-align: left !important;
  }

  /* PRICE + plan label */
  .subscription-card-commerce-price-row {
    display: flex !important;
    min-width: 0 !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 8px !important;
  }

  .subscription-card-commerce-price-row strong {
    display: inline-flex !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 9px !important;
    border-radius: 8px !important;
    background: #288d3e !important;
    color: #fff !important;
    font-size: 15px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-price-row span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6e7467 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
    line-height: 1.1 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /* Same composition as OFF on left + View More on right. */
  .subscription-card-commerce-detail-row {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) auto !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 8px !important;
  }

  .subscription-card-commerce-detail-row > span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #288d3e !important;
    font-size: 10.5px !important;
    font-weight: 950 !important;
    line-height: 12px !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-detail-row > button {
    justify-self: end !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-bottom: 1px solid currentColor !important;
    background: transparent !important;
    color: #2e6e44 !important;
    font: inherit !important;
    font-size: 10.5px !important;
    font-weight: 900 !important;
    line-height: 12px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
  }

  /* Product/subscription name: large and readable like the second image. */
  .subscription-card-commerce-summary > h3 {
    display: -webkit-box !important;
    min-height: 40px !important;
    overflow: hidden !important;
    margin: 1px 0 0 !important;
    color: #202516 !important;
    font-size: 15px !important;
    font-weight: 900 !important;
    line-height: 19px !important;
    letter-spacing: -.015em !important;
    text-align: left !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  /* Weight/unit is a normal gray line, not a chip. */
  .subscription-card-commerce-unit {
    display: block !important;
    min-height: 18px !important;
    margin: 0 !important;
    color: #747a6f !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    line-height: 15px !important;
    text-align: left !important;
  }

  /* One soft-yellow tag, matching the HomePage Offers tag. */
  .subscription-card-commerce-tags {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    margin-top: 1px !important;
  }

  .subscription-card-commerce-tags > span {
    display: inline-flex !important;
    width: fit-content !important;
    align-items: center !important;
    padding: 6px 9px !important;
    border-radius: 8px !important;
    background: #fff0d5 !important;
    color: #9c6513 !important;
    font-size: 10px !important;
    font-weight: 750 !important;
    line-height: 1 !important;
  }

  /* Old two-chip layout is no longer used. */
  .subscription-card-commerce-meta {
    display: none !important;
  }

  /* Weight badge on image remains small and readable. */
  .subscription-card-media-unit {
    top: 7px !important;
    right: 7px !important;
    max-width: calc(100% - 14px) !important;
    padding: 4px 7px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.95) !important;
    color: #526818 !important;
    font-size: 8.5px !important;
    font-weight: 900 !important;
    box-shadow: 0 2px 8px rgba(20,24,10,.09) !important;
  }

  /* Carousel controls remain visible without covering content. */
  .subscription-card-carousel-control {
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    font-size: .72rem !important;
  }

  .subscription-card-carousel-control.previous {
    left: 5px !important;
  }

  .subscription-card-carousel-control.next {
    right: 5px !important;
  }

  .subscription-card-carousel-dots {
    bottom: 5px !important;
    gap: 3px !important;
  }

  .subscription-card-carousel-dot {
    width: 5px !important;
    height: 5px !important;
  }

  /* Large web keeps 8 cards in one row. */
  @media (min-width: 1200px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(8,minmax(0,1fr)) !important;
      gap: 22px 10px !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      grid-template-columns: repeat(8,minmax(0,1fr)) !important;
      gap: 10px !important;
    }

    /* Keep the reference look readable even with 8 columns. */
    .subscription-card-media-subscribe {
      min-width: 78px !important;
      min-height: 36px !important;
      padding: 6px 9px !important;
      font-size: 10px !important;
    }

    .subscription-card-commerce-summary {
      gap: 5px !important;
      padding: 19px 3px 7px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 30px !important;
      padding: 5px 8px !important;
      font-size: 13.5px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 10px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 9.5px !important;
      line-height: 11px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 36px !important;
      font-size: 13px !important;
      line-height: 17px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 10.5px !important;
      line-height: 14px !important;
    }

    .subscription-card-commerce-tags > span {
      padding: 5px 7px !important;
      font-size: 9px !important;
    }
  }

  /* Mobile follows the SAME structure and visual hierarchy. */
  @media (max-width: 700px) {
    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -12px !important;
      min-width: 75px !important;
      min-height: 34px !important;
      padding: 6px 9px !important;
      border-radius: 9px !important;
      font-size: 9.5px !important;
    }

    .subscription-card-commerce-summary {
      gap: 4px !important;
      padding: 18px 2px 6px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 28px !important;
      padding: 4px 7px !important;
      font-size: 12px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 9px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 8.5px !important;
      line-height: 10px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 32px !important;
      font-size: 11.5px !important;
      line-height: 15px !important;
    }

    .subscription-card-commerce-unit {
      min-height: 15px !important;
      font-size: 9.5px !important;
      line-height: 12px !important;
    }

    .subscription-card-commerce-tags > span {
      padding: 4px 6px !important;
      font-size: 8.2px !important;
    }
  }


  /* ================================================================
     FINAL SUBSCRIBE BUTTON STYLE
     Transparent/white background with olive-green border and text.
     ================================================================ */
  .subscription-card-media-subscribe {
    border-color: var(--subscriptions-olive) !important;
    background: rgba(255,255,255,.94) !important;
    color: var(--subscriptions-olive) !important;
    box-shadow: 0 4px 10px rgba(51,55,27,.10) !important;
  }

  .subscription-card-media-subscribe:hover,
  .subscription-card-media-subscribe:focus-visible {
    border-color: var(--subscriptions-olive-hover) !important;
    background: rgba(255,255,255,.98) !important;
    color: var(--subscriptions-olive-hover) !important;
    box-shadow: 0 6px 14px rgba(51,55,27,.14) !important;
  }


  /* ==================================================================
     FINAL IMAGE DESIGN — MATCH HOMEPAGE PRODUCT CARD
     Square image/card area, clean rounded image, subtle carousel controls,
     floating olive-outline SUBSCRIBE button on the lower-right edge.
     ================================================================== */

  .subscription-card-media,
  .subscription-card-main > .subscription-card-media,
  .mobile-compact .subscription-card-media,
  .mobile-expanded .subscription-card-media {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 4 / 5 !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 16px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .subscription-card-carousel {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    border: 1px solid #e4e7dc !important;
    border-radius: 16px !important;
    background: #f3f5ed !important;
    box-shadow: 0 4px 12px rgba(44,51,24,.055) !important;
  }

  .subscription-card-carousel-image {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    object-fit: cover !important;
    object-position: center !important;
    border-radius: 16px !important;
  }

  /* Remove old dark gradient/caption so the carousel looks like a normal
     catalogue product image instead of a banner. */
  .subscription-card-carousel::after,
  .subscription-card-carousel-caption {
    display: none !important;
  }

  /* Keep the image clean like HomePage; unit remains available below the card. */
  .subscription-card-media-unit,
  .subscription-card-offer-badge {
    display: none !important;
  }

  /* Floating action — exact same placement language as the HomePage ADD button. */
  .subscription-card-media-subscribe {
    position: absolute !important;
    z-index: 20 !important;
    right: 6px !important;
    bottom: -18px !important;
    display: inline-flex !important;
    min-width: 86px !important;
    min-height: 40px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px 13px !important;
    border: 2px solid var(--subscriptions-olive) !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.98) !important;
    color: var(--subscriptions-olive) !important;
    box-shadow: 0 4px 10px rgba(51,55,27,.12) !important;
    font-size: 11px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
    text-decoration: none !important;
    white-space: nowrap !important;
  }

  .subscription-card-media-subscribe:hover,
  .subscription-card-media-subscribe:focus-visible {
    border-color: var(--subscriptions-olive-hover) !important;
    background: #ffffff !important;
    color: var(--subscriptions-olive-hover) !important;
    box-shadow: 0 6px 14px rgba(51,55,27,.16) !important;
    transform: translateY(-1px) !important;
  }

  /* Give the content enough space for the overlapping action button. */
  .subscription-card-commerce-summary {
    padding-top: 25px !important;
  }

  /* Carousel navigation remains functional but visually quiet. */
  .subscription-card-carousel-control {
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    border: 1px solid rgba(255,255,255,.86) !important;
    background: rgba(51,55,27,.56) !important;
    color: #fff !important;
    font-size: .72rem !important;
  }

  .subscription-card-carousel-control.previous {
    left: 6px !important;
  }

  .subscription-card-carousel-control.next {
    right: 6px !important;
  }

  .subscription-card-carousel-dots {
    bottom: 6px !important;
    gap: 3px !important;
  }

  .subscription-card-carousel-dot {
    width: 5px !important;
    height: 5px !important;
    background: rgba(255,255,255,.70) !important;
  }

  .subscription-card-carousel-dot.active {
    background: #fff !important;
  }

  /* Preserve the same square image treatment on all responsive sizes. */
  @media (max-width: 700px) {
    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media,
    .mobile-expanded .subscription-card-media {
      aspect-ratio: 4 / 5 !important;
      border-radius: 14px !important;
    }

    .subscription-card-carousel,
    .subscription-card-carousel-image {
      border-radius: 14px !important;
    }

    .subscription-card-media-subscribe {
      right: 5px !important;
      bottom: -16px !important;
      min-width: 76px !important;
      min-height: 36px !important;
      padding: 6px 10px !important;
      border-radius: 10px !important;
      font-size: 10px !important;
    }

    .subscription-card-commerce-summary {
      padding-top: 22px !important;
    }
  }


  /* ================================================================
     FINAL TEXT SIZE UPDATE
     Increase visible subscription-card content to match the HomePage
     product-card reference while keeping the existing 4:5 image design.
     ================================================================ */

  .subscription-card-commerce-summary {
    gap: 7px !important;
    padding-top: 24px !important;
  }

  .subscription-card-commerce-price-row {
    min-height: 34px !important;
    gap: 8px !important;
  }

  .subscription-card-commerce-price-row strong {
    min-height: 34px !important;
    padding: 6px 10px !important;
    border-radius: 8px !important;
    font-size: 16px !important;
    font-weight: 950 !important;
  }

  .subscription-card-commerce-price-row span {
    font-size: 12px !important;
    font-weight: 650 !important;
  }

  .subscription-card-commerce-detail-row {
    gap: 8px !important;
  }

  .subscription-card-commerce-detail-row > span {
    font-size: 11.5px !important;
    font-weight: 950 !important;
    line-height: 14px !important;
  }

  .subscription-card-commerce-detail-row > button {
    font-size: 11.5px !important;
    font-weight: 900 !important;
    line-height: 14px !important;
  }

  .subscription-card-commerce-summary > h3 {
    min-height: 44px !important;
    font-size: 16px !important;
    font-weight: 900 !important;
    line-height: 20px !important;
    letter-spacing: -.01em !important;
  }

  .subscription-card-commerce-unit {
    min-height: 19px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    line-height: 16px !important;
  }

  .subscription-card-commerce-tags > span {
    padding: 6px 9px !important;
    border-radius: 8px !important;
    font-size: 10.5px !important;
    font-weight: 750 !important;
  }

  /* Keep the content readable even with 8 cards per row on desktop. */
  @media (min-width: 1200px) {
    .subscription-card-commerce-summary {
      gap: 6px !important;
      padding-top: 22px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 32px !important;
      padding: 5px 9px !important;
      font-size: 14.5px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 10.5px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 10px !important;
      line-height: 12px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 39px !important;
      font-size: 14px !important;
      line-height: 18px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 11px !important;
      line-height: 14px !important;
    }

    .subscription-card-commerce-tags > span {
      padding: 5px 8px !important;
      font-size: 9.5px !important;
    }
  }

  /* Mobile should also keep the larger readable text hierarchy. */
  @media (max-width: 700px) {
    .subscription-card-commerce-summary {
      gap: 5px !important;
      padding-top: 21px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 30px !important;
      padding: 5px 8px !important;
      font-size: 13.5px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 9.8px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 9px !important;
      line-height: 11px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 34px !important;
      font-size: 12.5px !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-unit {
      min-height: 16px !important;
      font-size: 10px !important;
      line-height: 13px !important;
    }

    .subscription-card-commerce-tags > span {
      padding: 5px 7px !important;
      font-size: 8.8px !important;
    }
  }


  /* ================================================================
     FINAL HOME CARD TEXT PARITY
     Match the reference card's visible text hierarchy and spacing:
     price -> green info/View More -> large title -> gray unit -> yellow tag.
     ================================================================ */

  .subscription-card-commerce-summary {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 7px !important;
    padding: 23px 5px 9px !important;
    text-align: left !important;
  }

  .subscription-card-commerce-price-row {
    display: flex !important;
    min-width: 0 !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 10px !important;
    margin: 0 !important;
  }

  .subscription-card-commerce-price-row strong {
    display: inline-flex !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 9px !important;
    border-radius: 8px !important;
    background: #288d3e !important;
    color: #ffffff !important;
    font-size: 16px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-price-row span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #73786e !important;
    font-size: 12.5px !important;
    font-weight: 650 !important;
    line-height: 1 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-detail-row {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 !important;
  }

  .subscription-card-commerce-detail-row > span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #23863a !important;
    font-size: 12.5px !important;
    font-weight: 950 !important;
    line-height: 15px !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-detail-row > button {
    justify-self: end !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-bottom: 1px solid currentColor !important;
    background: transparent !important;
    color: #2f6e45 !important;
    font: inherit !important;
    font-size: 12.5px !important;
    font-weight: 900 !important;
    line-height: 15px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-summary > h3 {
    display: -webkit-box !important;
    min-height: 44px !important;
    overflow: hidden !important;
    margin: 0 !important;
    color: #202516 !important;
    font-size: 16.5px !important;
    font-weight: 900 !important;
    line-height: 20.5px !important;
    letter-spacing: -.012em !important;
    text-align: left !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .subscription-card-commerce-unit {
    display: block !important;
    min-height: 18px !important;
    margin: 0 !important;
    color: #777d72 !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    line-height: 17px !important;
    text-align: left !important;
  }

  .subscription-card-commerce-tags {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    margin: 0 !important;
  }

  .subscription-card-commerce-tags > span {
    display: inline-flex !important;
    width: fit-content !important;
    min-height: 29px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 6px 10px !important;
    border-radius: 8px !important;
    background: #fff0d5 !important;
    color: #94600f !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
  }

  /* Keep the same reference-style typography on large web cards too. */
  @media (min-width: 1200px) {
    .subscription-card-commerce-summary {
      gap: 6px !important;
      padding: 22px 4px 8px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 31px !important;
      font-size: 15px !important;
      padding-inline: 8px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 11.5px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 11.5px !important;
      line-height: 14px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 41px !important;
      font-size: 15px !important;
      line-height: 19px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 12.5px !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-tags > span {
      min-height: 27px !important;
      padding: 5px 9px !important;
      font-size: 11px !important;
    }
  }

  /* Mobile follows the same proportions, not the previously shrunken version. */
  @media (max-width: 700px) {
    .subscription-card-commerce-summary {
      gap: 6px !important;
      padding: 21px 4px 8px !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 31px !important;
      gap: 8px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 31px !important;
      padding: 5px 8px !important;
      font-size: 15px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 11.5px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 11px !important;
      line-height: 13px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 40px !important;
      font-size: 15px !important;
      line-height: 19px !important;
    }

    .subscription-card-commerce-unit {
      min-height: 17px !important;
      font-size: 12.5px !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-tags > span {
      min-height: 27px !important;
      padding: 5px 9px !important;
      font-size: 11px !important;
    }
  }


  /* ================================================================
     EXACT HOMEPAGE CARD TYPOGRAPHY
     These values mirror the HomePage product card directly.
     ================================================================ */

  .subscription-card-commerce-summary,
  .subscription-card-commerce-summary *,
  .subscription-card-media-subscribe {
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-style: normal !important;
    font-synthesis: none;
  }

  .subscription-card-commerce-summary {
    gap: 0 !important;
    padding: 22px 4px 5px !important;
  }

  /* Price row — matches HomePage selling price + MRP sizing. */
  .subscription-card-commerce-price-row {
    min-height: 34px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 0 5px !important;
  }

  .subscription-card-commerce-price-row strong {
    min-height: 32px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 10px !important;
    border-radius: 8px !important;
    background: #238b3b !important;
    color: #ffffff !important;
    font-size: 18px !important;
    font-weight: 900 !important;
    line-height: 24px !important;
    letter-spacing: 0 !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-price-row span {
    color: #70766f !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    line-height: 18px !important;
    letter-spacing: 0 !important;
    white-space: nowrap !important;
  }

  /* Matches OFF on left + View More on right. */
  .subscription-card-commerce-detail-row {
    width: 100% !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    column-gap: 8px !important;
    margin: 0 0 8px !important;
  }

  .subscription-card-commerce-detail-row > span {
    min-width: 0 !important;
    overflow: hidden !important;
    color: #238b3b !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    line-height: 18px !important;
    letter-spacing: 0 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .subscription-card-commerce-detail-row > button {
    justify-self: end !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-bottom: 1px solid currentColor !important;
    background: transparent !important;
    color: #2f6e3d !important;
    font: inherit !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 13.5px !important;
    font-weight: 800 !important;
    line-height: 17px !important;
    letter-spacing: 0 !important;
    text-underline-offset: 3px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
  }

  /* Exact HomePage product-name appearance. */
  .subscription-card-commerce-summary > h3 {
    display: -webkit-box !important;
    min-height: 43px !important;
    overflow: hidden !important;
    margin: 0 0 9px !important;
    color: #1d211e !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    line-height: 21.5px !important;
    letter-spacing: -.08px !important;
    text-align: left !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  /* Exact HomePage weight/size line appearance. */
  .subscription-card-commerce-unit {
    display: block !important;
    min-height: 17px !important;
    margin: 0 0 10px !important;
    color: #70766f !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    line-height: 17px !important;
    letter-spacing: 0 !important;
    text-align: left !important;
  }

  /* Exact HomePage Offers-style tag typography. */
  .subscription-card-commerce-tags {
    display: flex !important;
    align-items: center !important;
    margin: 0 !important;
  }

  .subscription-card-commerce-tags > span {
    display: inline-flex !important;
    width: fit-content !important;
    min-height: 28px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 9px !important;
    border-radius: 7px !important;
    background: #fff0d5 !important;
    color: #94600f !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
    line-height: 17px !important;
    letter-spacing: 0 !important;
  }

  /* Keep identical typography on desktop too instead of shrinking it for
     the 8-column layout. */
  @media (min-width: 701px) {
    .subscription-card-commerce-price-row strong {
      font-size: 18px !important;
      line-height: 24px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 14px !important;
      line-height: 18px !important;
    }

    .subscription-card-commerce-detail-row > span {
      font-size: 14px !important;
      line-height: 18px !important;
    }

    .subscription-card-commerce-detail-row > button {
      font-size: 13.5px !important;
      line-height: 17px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 17px !important;
      line-height: 21.5px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 13.5px !important;
      line-height: 17px !important;
    }

    .subscription-card-commerce-tags > span {
      font-size: 12.5px !important;
      line-height: 17px !important;
    }
  }


  /* ================================================================
     VIEW MORE => DAILY MENU ONLY
     Expanded state replaces the normal catalogue card with a dedicated
     full-width schedule card. No image, price, product info or plans.
     ================================================================ */

  .subscription-schedule-open-card {
    display: none;
  }

  .subscription-card.mobile-expanded {
    grid-column: 1 / -1 !important;
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 4px 0 10px !important;
    padding: 0 !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  /* Hide every normal card section when View More is open. */
  .subscription-card.mobile-expanded > .subscription-card-main,
  .subscription-card.mobile-expanded > .subscription-card-bottom {
    display: none !important;
  }

  .subscription-card.mobile-expanded > .subscription-schedule-open-card {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    padding: 10px 10px 12px !important;
    border: 1px solid #dfe3d6 !important;
    border-radius: 15px !important;
    background: #fbfcf8 !important;
    box-shadow: 0 5px 18px rgba(51,55,27,.055) !important;
  }

  .subscription-schedule-open-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    margin: 0 0 9px !important;
  }

  .subscription-schedule-open-header h3 {
    margin: 0 !important;
    color: #202516 !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 15px !important;
    font-weight: 900 !important;
    line-height: 19px !important;
  }

  .subscription-schedule-open-close {
    width: 30px !important;
    height: 30px !important;
    flex: 0 0 30px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    border: 1px solid #d9ddcc !important;
    border-radius: 50% !important;
    background: #eef0e6 !important;
    color: #33371b !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 20px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    cursor: pointer !important;
  }

  .subscription-schedule-open-close:hover {
    background: #e3e7d7 !important;
  }

  .subscription-schedule-open-empty {
    margin: 0 !important;
    padding: 18px 10px !important;
    color: #73786e !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 13px !important;
    text-align: center !important;
  }

  /* Schedule layout styled like the reference screenshot. */
  .subscription-schedule-open-card .subscription-card-day-menu {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }

  .subscription-schedule-open-card .subscription-card-content-heading {
    display: none !important;
  }

  .subscription-schedule-open-card .subscription-card-day-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 5px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .subscription-schedule-open-card .subscription-card-day-row {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 10px !important;
    min-height: 39px !important;
    padding: 6px 7px !important;
    border: 1px solid #e6e8df !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    box-shadow: none !important;
  }

  .subscription-schedule-open-card .subscription-card-day-row.active {
    border-color: #d6ddc5 !important;
    background: #eef1e5 !important;
  }

  .subscription-schedule-open-card .subscription-card-day-label,
  .subscription-schedule-open-card .subscription-card-day-label-button {
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    color: #202516 !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    line-height: 15px !important;
    text-align: left !important;
  }

  .subscription-schedule-open-card .subscription-card-day-row.active
  .subscription-card-day-label,
  .subscription-schedule-open-card .subscription-card-day-row.active
  .subscription-card-day-label-button {
    color: #a12632 !important;
  }

  .subscription-schedule-open-card .subscription-card-day-items {
    display: none !important;
  }

  .subscription-schedule-open-card .subscription-card-day-view-button {
    min-width: 76px !important;
    min-height: 28px !important;
    padding: 5px 9px !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: #eef0e6 !important;
    color: #33371b !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 10px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    cursor: pointer !important;
  }

  .subscription-schedule-open-card .subscription-card-day-view-button:hover {
    background: #e2e7d5 !important;
  }

  /* Ensure a single-item category also opens across the complete catalogue. */
  .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
    grid-column: 1 / -1 !important;
    width: 100% !important;
  }

  .subscriptions-category-single:has(.subscription-card.mobile-expanded)
  > .subscriptions-grid {
    width: 100% !important;
    grid-template-columns: minmax(0,1fr) !important;
  }

  @media (max-width: 700px) {
    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      padding: 9px 8px 10px !important;
      border-radius: 13px !important;
    }

    .subscription-schedule-open-header h3 {
      font-size: 14px !important;
      line-height: 18px !important;
    }

    .subscription-schedule-open-close {
      width: 28px !important;
      height: 28px !important;
      flex-basis: 28px !important;
      font-size: 19px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 38px !important;
      padding: 6px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 11px !important;
      line-height: 14px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 72px !important;
      min-height: 27px !important;
      padding: 5px 8px !important;
      font-size: 9px !important;
    }
  }


  /* ================================================================
     VIEW MORE SIDE-CARD LAYOUT
     Keep the normal subscription card visible and open the Daily menu
     beside it as one additional compact catalogue card.
     ================================================================ */

  /* Undo the previous full-width replacement behavior. */
  .subscription-card.mobile-expanded {
    grid-column: span 2 !important;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-areas: "main schedule" !important;
    align-items: start !important;
    gap: 10px !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  /* Keep the original compact card fully visible. */
  .subscription-card.mobile-expanded > .subscription-card-main {
    grid-area: main !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-areas:
      "media"
      "summary"
      "body" !important;
    grid-template-rows: auto auto auto !important;
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    aspect-ratio: auto !important;
    overflow: visible !important;
  }

  .subscription-card.mobile-expanded > .subscription-card-main
    .subscription-card-body {
    display: none !important;
  }

  .subscription-card.mobile-expanded > .subscription-card-bottom {
    display: none !important;
  }

  /* Side schedule card */
  .subscription-card.mobile-expanded > .subscription-schedule-open-card {
    grid-area: schedule !important;
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 10px !important;
    border: 1px solid #e1e4d8 !important;
    border-radius: 16px !important;
    background: #fbfcf8 !important;
    box-shadow: 0 5px 15px rgba(51,55,27,.055) !important;
  }

  .subscription-schedule-open-header {
    margin-bottom: 8px !important;
  }

  .subscription-schedule-open-header h3 {
    font-size: 14px !important;
    line-height: 18px !important;
  }

  .subscription-schedule-open-close {
    width: 27px !important;
    height: 27px !important;
    flex-basis: 27px !important;
    font-size: 18px !important;
  }

  .subscription-schedule-open-card .subscription-card-day-list {
    gap: 4px !important;
  }

  .subscription-schedule-open-card .subscription-card-day-row {
    min-height: 35px !important;
    padding: 5px 6px !important;
    border-radius: 8px !important;
  }

  .subscription-schedule-open-card .subscription-card-day-label,
  .subscription-schedule-open-card .subscription-card-day-label-button {
    font-size: 10.5px !important;
    line-height: 13px !important;
  }

  .subscription-schedule-open-card .subscription-card-day-view-button {
    min-width: 67px !important;
    min-height: 25px !important;
    padding: 4px 7px !important;
    font-size: 8.5px !important;
  }

  /* Do not make the parent category span the full catalogue anymore.
     The expanded article itself simply consumes two normal card columns. */
  .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
    grid-column: span 2 !important;
    width: auto !important;
    min-width: 0 !important;
  }

  .subscriptions-category-single:has(.subscription-card.mobile-expanded)
    > .subscriptions-grid {
    width: 100% !important;
    grid-template-columns: minmax(0, 1fr) !important;
  }

  /* On the desktop 8-card catalogue, opening View More uses exactly
     two card slots: original card + schedule card. */
  @media (min-width: 1200px) {
    .subscriptions-categories-layout
      > .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
      grid-column: span 2 !important;
    }

    .subscription-card.mobile-expanded {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
  }

  /* Medium web also opens beside the card when two slots are available. */
  @media (min-width: 701px) and (max-width: 1199px) {
    .subscriptions-categories-layout
      > .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
      grid-column: span 2 !important;
    }

    .subscription-card.mobile-expanded {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }
  }

  /* Mobile: keep it compact. On normal phones the schedule opens directly
     below the card instead of creating a huge full-width panel. */
  @media (max-width: 700px) {
    .subscription-card.mobile-expanded {
      grid-column: 1 / -1 !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "main"
        "schedule" !important;
      gap: 8px !important;
    }

    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      padding: 8px !important;
      border-radius: 13px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 34px !important;
      padding: 5px 6px !important;
    }
  }


  /* ================================================================
     CAROUSEL DAY LABEL
     Shows the current schedule day (Monday-Saturday) on the image.
     Clicking it opens the compact side Daily Menu card for that day.
     ================================================================ */

  .subscription-card-carousel-day-button {
    position: absolute !important;
    z-index: 30 !important;
    top: 8px !important;
    left: 8px !important;
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 9px !important;
    border: 1px solid rgba(255,255,255,.78) !important;
    border-radius: 999px !important;
    background: rgba(51,55,27,.88) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(20,24,10,.18) !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 10px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    text-transform: capitalize !important;
    white-space: nowrap !important;
    cursor: pointer !important;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .subscription-card-carousel-day-button:hover,
  .subscription-card-carousel-day-button:focus-visible {
    background: var(--subscriptions-olive) !important;
    color: #ffffff !important;
    border-color: #ffffff !important;
    outline: none !important;
    box-shadow:
      0 0 0 2px rgba(255,255,255,.78),
      0 5px 14px rgba(20,24,10,.22) !important;
  }

  /* The full-image card toggle must stay below the clickable day badge. */
  .subscription-card-media-toggle {
    z-index: 2 !important;
  }

  /* Keep day label readable in the compact 8-column web layout. */
  @media (min-width: 1200px) {
    .subscription-card-carousel-day-button {
      top: 6px !important;
      left: 6px !important;
      min-height: 24px !important;
      padding: 4px 7px !important;
      font-size: 8.5px !important;
    }
  }

  @media (max-width: 700px) {
    .subscription-card-carousel-day-button {
      top: 6px !important;
      left: 6px !important;
      min-height: 25px !important;
      padding: 4px 7px !important;
      font-size: 9px !important;
    }
  }


  /* ==================================================================
     VERTICAL MONDAY-SATURDAY CAROUSEL RAIL
     Right side of image shows all six days. The active indicator glides
     vertically as the carousel auto-advances from Monday to Saturday.
     ================================================================== */

  .subscription-card-carousel-day-button {
    display: none !important;
  }

  .subscription-card-carousel-day-rail {
    position: absolute !important;
    z-index: 24 !important;
    top: 10px !important;
    right: 7px !important;
    bottom: 18px !important;
    width: 45% !important;
    max-width: 116px !important;
    min-width: 82px !important;
    overflow: hidden !important;
    border: 1px solid rgba(255,255,255,.52) !important;
    border-radius: 14px !important;
    background:
      linear-gradient(
        180deg,
        rgba(25,30,14,.70),
        rgba(25,30,14,.48)
      ) !important;
    box-shadow: 0 8px 22px rgba(20,24,10,.18) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .subscription-card-carousel-day-list {
    position: absolute !important;
    inset: 5px !important;
    z-index: 2 !important;
    display: grid !important;
    grid-template-rows: repeat(6, minmax(0,1fr)) !important;
    gap: 2px !important;
  }

  .subscription-card-carousel-day-option {
    position: relative !important;
    z-index: 2 !important;
    display: grid !important;
    grid-template-columns: 18px minmax(0,1fr) !important;
    align-items: center !important;
    gap: 4px !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 3px 5px !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: transparent !important;
    color: rgba(255,255,255,.72) !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
    text-align: left !important;
    cursor: pointer !important;
    transition:
      color .28s ease,
      background .28s ease,
      transform .28s ease,
      opacity .28s ease !important;
  }

  .subscription-card-carousel-day-option:hover {
    background: rgba(255,255,255,.10) !important;
    color: #fff !important;
  }

  .subscription-card-carousel-day-option.active {
    color: #fff !important;
    background: rgba(255,255,255,.14) !important;
    transform: translateX(-2px) !important;
    text-shadow: 0 1px 5px rgba(0,0,0,.30);
  }

  .subscription-card-carousel-day-option:disabled {
    cursor: default !important;
    opacity: .35 !important;
  }

  .subscription-card-carousel-day-number {
    color: rgba(255,255,255,.48) !important;
    font-size: 7px !important;
    font-weight: 900 !important;
    letter-spacing: .03em !important;
  }

  .subscription-card-carousel-day-option.active
    .subscription-card-carousel-day-number {
    color: #dbe7b4 !important;
  }

  /* One persistent marker moves smoothly from Monday through Saturday. */
  .subscription-card-carousel-day-indicator {
    position: absolute !important;
    z-index: 1 !important;
    left: 4px !important;
    width: 4px !important;
    height: 12% !important;
    border-radius: 999px !important;
    background: #dbe7b4 !important;
    box-shadow:
      0 0 0 2px rgba(219,231,180,.15),
      0 2px 9px rgba(0,0,0,.20) !important;
    transform: translateY(-50%) !important;
    transition:
      top .46s cubic-bezier(.22,.8,.32,1),
      height .32s ease !important;
    pointer-events: none !important;
  }

  .subscription-card-carousel-day-rail::after {
    content: "";
    position: absolute;
    z-index: 0;
    top: 7px;
    bottom: 7px;
    left: 5px;
    width: 1px;
    background:
      linear-gradient(
        180deg,
        transparent,
        rgba(219,231,180,.30) 12%,
        rgba(219,231,180,.30) 88%,
        transparent
      );
    pointer-events: none;
  }

  /* The rail itself replaces the image text caption. */
  .subscription-card-carousel-caption {
    display: none !important;
  }

  /* Keep arrows on the left side so they don't collide with the day rail. */
  .subscription-card-carousel-control.previous {
    left: 6px !important;
  }

  .subscription-card-carousel-control.next {
    left: 36px !important;
    right: auto !important;
  }

  .subscription-card-carousel-dots {
    left: 8px !important;
    right: auto !important;
    max-width: 42% !important;
    justify-content: flex-start !important;
  }

  /* 8-card desktop layout: compact but all six days remain readable. */
  @media (min-width: 1200px) {
    .subscription-card-carousel-day-rail {
      top: 7px !important;
      right: 5px !important;
      bottom: 14px !important;
      width: 47% !important;
      min-width: 70px !important;
      max-width: 96px !important;
      border-radius: 11px !important;
    }

    .subscription-card-carousel-day-list {
      inset: 4px !important;
      gap: 1px !important;
    }

    .subscription-card-carousel-day-option {
      grid-template-columns: 14px minmax(0,1fr) !important;
      gap: 2px !important;
      padding: 2px 3px !important;
      border-radius: 6px !important;
      font-size: 7.4px !important;
    }

    .subscription-card-carousel-day-number {
      font-size: 5.8px !important;
    }

    .subscription-card-carousel-day-indicator {
      left: 3px !important;
      width: 3px !important;
    }
  }

  @media (max-width: 700px) {
    .subscription-card-carousel-day-rail {
      top: 7px !important;
      right: 5px !important;
      bottom: 14px !important;
      width: 46% !important;
      min-width: 72px !important;
      max-width: 102px !important;
      border-radius: 11px !important;
    }

    .subscription-card-carousel-day-list {
      inset: 4px !important;
    }

    .subscription-card-carousel-day-option {
      grid-template-columns: 15px minmax(0,1fr) !important;
      gap: 2px !important;
      padding: 2px 4px !important;
      font-size: 7.8px !important;
    }

    .subscription-card-carousel-day-number {
      font-size: 6px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-card-carousel-day-indicator,
    .subscription-card-carousel-day-option {
      transition: none !important;
    }
  }


  /* ==================================================================
     FINAL SIMPLE WEEKDAY OVERLAY
     No glass/card background. All weekdays sit directly on the image.
     Normal = black text. Active carousel day = white text.
     ================================================================== */

  .subscription-card-carousel-day-rail {
    position: absolute !important;
    z-index: 24 !important;
    top: 12px !important;
    right: 8px !important;
    bottom: 20px !important;
    width: 43% !important;
    max-width: 110px !important;
    min-width: 76px !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    pointer-events: auto !important;
  }

  .subscription-card-carousel-day-rail::after,
  .subscription-card-carousel-day-indicator {
    display: none !important;
  }

  .subscription-card-carousel-day-list {
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    grid-template-rows: repeat(6, minmax(0, 1fr)) !important;
    gap: 0 !important;
  }

  .subscription-card-carousel-day-option {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: 2px 3px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #111111 !important;
    box-shadow: none !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 9.5px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    text-align: left !important;
    text-shadow:
      0 1px 2px rgba(255,255,255,.85),
      0 0 4px rgba(255,255,255,.55) !important;
    cursor: pointer !important;
    transform: none !important;
    opacity: 1 !important;
    transition:
      color .34s ease,
      text-shadow .34s ease,
      transform .34s ease !important;
  }

  .subscription-card-carousel-day-option:hover {
    color: #111111 !important;
    background: transparent !important;
    transform: translateX(-1px) !important;
  }

  .subscription-card-carousel-day-option.active {
    color: #ffffff !important;
    background: transparent !important;
    transform: translateX(-2px) !important;
    text-shadow:
      0 1px 4px rgba(0,0,0,.88),
      0 0 7px rgba(0,0,0,.56) !important;
  }

  .subscription-card-carousel-day-option:disabled {
    color: rgba(17,17,17,.36) !important;
    opacity: 1 !important;
    cursor: default !important;
  }

  .subscription-card-carousel-day-number {
    display: none !important;
  }

  /* Keep arrows/dots away from weekday labels. */
  .subscription-card-carousel-control.previous {
    left: 6px !important;
  }

  .subscription-card-carousel-control.next {
    left: 36px !important;
    right: auto !important;
  }

  .subscription-card-carousel-dots {
    left: 8px !important;
    right: auto !important;
    max-width: 40% !important;
    justify-content: flex-start !important;
  }

  @media (min-width: 1200px) {
    .subscription-card-carousel-day-rail {
      top: 10px !important;
      right: 6px !important;
      bottom: 16px !important;
      width: 44% !important;
      min-width: 66px !important;
      max-width: 92px !important;
    }

    .subscription-card-carousel-day-option {
      padding: 1px 2px !important;
      font-size: 7.8px !important;
    }
  }

  @media (max-width: 700px) {
    .subscription-card-carousel-day-rail {
      top: 10px !important;
      right: 6px !important;
      bottom: 16px !important;
      width: 44% !important;
      min-width: 70px !important;
      max-width: 98px !important;
    }

    .subscription-card-carousel-day-option {
      padding: 1px 2px !important;
      font-size: 8.2px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-card-carousel-day-option {
      transition: none !important;
    }
  }


  /* ================================================================
     FINAL WEEKDAY POSITION + SIZE
     Keep all day names aligned to the RIGHT edge of the carousel image
     and make them large enough to read clearly.
     ================================================================ */

  .subscription-card-carousel-day-rail {
    top: 12px !important;
    right: 8px !important;
    bottom: 20px !important;
    width: 40% !important;
    min-width: 84px !important;
    max-width: 118px !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .subscription-card-carousel-day-list {
    inset: 0 !important;
    display: grid !important;
    grid-template-rows: repeat(6, minmax(0,1fr)) !important;
    gap: 0 !important;
  }

  .subscription-card-carousel-day-option {
    display: flex !important;
    width: 100% !important;
    align-items: center !important;
    justify-content: flex-end !important;
    padding: 2px 3px !important;
    color: #111111 !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 11.5px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    text-align: right !important;
    text-shadow:
      0 1px 2px rgba(255,255,255,.95),
      0 0 5px rgba(255,255,255,.72) !important;
    white-space: nowrap !important;
    transform: none !important;
    transition:
      color .30s ease,
      text-shadow .30s ease,
      transform .30s ease !important;
  }

  .subscription-card-carousel-day-option:hover {
    color: #111111 !important;
    transform: translateX(-2px) !important;
  }

  .subscription-card-carousel-day-option.active {
    color: #ffffff !important;
    transform: translateX(-4px) !important;
    text-shadow:
      0 1px 4px rgba(0,0,0,.95),
      0 0 8px rgba(0,0,0,.66) !important;
  }

  .subscription-card-carousel-day-option:disabled {
    color: rgba(17,17,17,.38) !important;
    opacity: 1 !important;
  }

  /* Larger desktop cards: keep text readable in 8-column layout. */
  @media (min-width: 1200px) {
    .subscription-card-carousel-day-rail {
      top: 10px !important;
      right: 6px !important;
      bottom: 16px !important;
      width: 42% !important;
      min-width: 76px !important;
      max-width: 108px !important;
    }

    .subscription-card-carousel-day-option {
      padding: 2px 2px !important;
      font-size: 10px !important;
      line-height: 1 !important;
    }
  }

  /* Mobile: keep the same right alignment and make labels clearly visible. */
  @media (max-width: 700px) {
    .subscription-card-carousel-day-rail {
      top: 10px !important;
      right: 6px !important;
      bottom: 16px !important;
      width: 42% !important;
      min-width: 78px !important;
      max-width: 110px !important;
    }

    .subscription-card-carousel-day-option {
      padding: 2px 2px !important;
      font-size: 10.5px !important;
      line-height: 1 !important;
    }
  }


  /* ================================================================
     FINAL WEEKDAY FONT UPDATE
     Match the bold item-title font appearance from the reference.
     ================================================================ */

  .subscription-card-carousel-day-option {
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    line-height: 18px !important;
    letter-spacing: 0 !important;
    text-align: right !important;
  }

  .subscription-card-carousel-day-option.active {
    font-size: 14px !important;
    font-weight: 900 !important;
  }

  @media (min-width: 1200px) {
    .subscription-card-carousel-day-option {
      font-size: 12.5px !important;
      line-height: 16px !important;
      font-weight: 900 !important;
    }

    .subscription-card-carousel-day-option.active {
      font-size: 12.5px !important;
    }
  }

  @media (max-width: 700px) {
    .subscription-card-carousel-day-option {
      font-size: 13px !important;
      line-height: 17px !important;
      font-weight: 900 !important;
    }

    .subscription-card-carousel-day-option.active {
      font-size: 13px !important;
    }
  }


  /* ==================================================================
     FINAL MOBILE = WEB DESIGN PARITY
     Keep the same card composition, typography, 4:5 carousel, weekday
     labels, Subscribe button and metadata treatment used on web.
     Only the grid column count changes for phone width.
     ================================================================== */

  @media (max-width: 700px) {
    .subscriptions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
      align-items: start !important;
    }

    .subscription-card,
    .subscription-card.mobile-compact {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card-main,
    .subscription-card.mobile-compact .subscription-card-main {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "media"
        "summary"
        "body" !important;
      grid-template-rows: auto auto auto !important;
      width: 100% !important;
      min-width: 0 !important;
      aspect-ratio: auto !important;
      overflow: visible !important;
    }

    /* Same 4:5 image design as web. */
    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 16px !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card-carousel {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      border: 1px solid #e4e7dc !important;
      border-radius: 16px !important;
      background: #f3f5ed !important;
      box-shadow: 0 4px 12px rgba(44,51,24,.055) !important;
    }

    .subscription-card-carousel-image {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      object-position: center !important;
      border-radius: 16px !important;
    }

    /* Same olive outline Subscribe button sizing/appearance as web. */
    .subscription-card-media-subscribe {
      right: 6px !important;
      bottom: -14px !important;
      min-width: 82px !important;
      min-height: 38px !important;
      padding: 7px 11px !important;
      border: 2px solid var(--subscriptions-olive) !important;
      border-radius: 11px !important;
      background: rgba(255,255,255,.98) !important;
      color: var(--subscriptions-olive) !important;
      box-shadow: 0 4px 10px rgba(51,55,27,.12) !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 10.5px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
    }

    /* Match desktop text hierarchy instead of shrinking mobile text. */
    .subscription-card-commerce-summary {
      gap: 0 !important;
      padding: 22px 4px 6px !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    }

    .subscription-card-commerce-price-row {
      min-height: 34px !important;
      gap: 8px !important;
      margin: 0 0 5px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 32px !important;
      padding: 4px 9px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 900 !important;
      line-height: 22px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 12.5px !important;
      font-weight: 600 !important;
      line-height: 17px !important;
    }

    .subscription-card-commerce-detail-row {
      column-gap: 7px !important;
      margin: 0 0 7px !important;
    }

    .subscription-card-commerce-detail-row > span {
      font-size: 12.5px !important;
      font-weight: 900 !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-detail-row > button {
      font-size: 12px !important;
      font-weight: 800 !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-summary > h3 {
      min-height: 41px !important;
      margin: 0 0 8px !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      line-height: 20px !important;
      letter-spacing: -.08px !important;
    }

    .subscription-card-commerce-unit {
      min-height: 17px !important;
      margin: 0 0 9px !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-tags > span {
      min-height: 27px !important;
      padding: 5px 8px !important;
      border-radius: 7px !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      line-height: 16px !important;
    }

    /* Same weekday presentation as web: right-aligned, bold and readable. */
    .subscription-card-carousel-day-rail {
      top: 10px !important;
      right: 7px !important;
      bottom: 18px !important;
      width: 43% !important;
      min-width: 76px !important;
      max-width: 108px !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .subscription-card-carousel-day-option {
      justify-content: flex-end !important;
      padding: 2px 2px !important;
      color: #111111 !important;
      background: transparent !important;
      border: 0 !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      line-height: 17px !important;
      text-align: right !important;
      text-shadow:
        0 1px 2px rgba(255,255,255,.95),
        0 0 5px rgba(255,255,255,.72) !important;
    }

    .subscription-card-carousel-day-option.active {
      color: #ffffff !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      transform: translateX(-4px) !important;
      text-shadow:
        0 1px 4px rgba(0,0,0,.95),
        0 0 8px rgba(0,0,0,.66) !important;
    }

    /* Same subtle carousel controls/dots used by web. */
    .subscription-card-carousel-control {
      width: 24px !important;
      height: 24px !important;
      font-size: .72rem !important;
    }

    .subscription-card-carousel-dots {
      bottom: 6px !important;
      gap: 3px !important;
    }

    .subscription-card-carousel-dot {
      width: 5px !important;
      height: 5px !important;
    }

    /* View More on mobile keeps the card visible and shows the schedule
       directly beneath it in the same visual style as web. */
    .subscription-card.mobile-expanded {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "main"
        "schedule" !important;
      gap: 10px !important;
      width: 100% !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card.mobile-expanded > .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
    }

    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      grid-area: schedule !important;
      display: block !important;
      padding: 10px !important;
      border: 1px solid #e1e4d8 !important;
      border-radius: 16px !important;
      background: #fbfcf8 !important;
      box-shadow: 0 5px 15px rgba(51,55,27,.055) !important;
    }
  }

  /* Very narrow phones keep the same design with two columns and slightly
     tighter gaps only; no separate visual redesign. */
  @media (max-width: 380px) {
    .subscriptions-grid {
      gap: 7px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 15px !important;
      line-height: 19px !important;
    }

    .subscription-card-carousel-day-option,
    .subscription-card-carousel-day-option.active {
      font-size: 12px !important;
      line-height: 16px !important;
    }
  }


  /* ==================================================================
     FINAL MOBILE CARD — EXACT COMPACT DESIGN
     Every subscription category uses the same card:
     4:5 carousel + weekdays + floating Subscribe + price/plan +
     schedule/View More + title + unit + plan tag.
     Two cards per row. All legacy mobile card content is removed.
     ================================================================== */

  @media (max-width: 700px) {
    /* Every category uses the same 2-column catalogue grid. */
    .subscriptions-category,
    .subscriptions-category-single,
    .subscriptions-category-multi,
    .subscriptions-offers-category-section {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      margin-top: 8px !important;
    }

    .subscriptions-grid,
    .subscriptions-category-single .subscriptions-grid,
    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      align-items: start !important;
      justify-content: stretch !important;
      gap: 9px !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    /* Use only the compact catalogue-card anatomy. */
    .subscription-card,
    .subscription-card.mobile-compact {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas: "main" !important;
      grid-template-rows: auto !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card-main,
    .subscription-card.mobile-compact .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "media"
        "summary" !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: transparent !important;
      aspect-ratio: auto !important;
    }

    /* Remove all legacy/extra mobile sections. */
    .subscription-card-mobile-summary,
    .subscription-card-body,
    .subscription-card-bottom,
    .subscription-card-kicker,
    .subscription-card-mobile-meta,
    .subscription-card-mobile-weekly,
    .subscription-card-collapse,
    .subscription-card-product-info,
    .subscription-card-complimentary,
    .subscription-card-prices,
    .subscription-card-actions,
    .subscription-card-plan-heading {
      display: none !important;
    }

    /* Keep exact 4:5 carousel/image shape from the reference. */
    .subscription-card-media,
    .subscription-card-main > .subscription-card-media,
    .mobile-compact .subscription-card-media {
      grid-area: media !important;
      position: relative !important;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 15px !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card-carousel {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      border: 1px solid #e3e6dc !important;
      border-radius: 15px !important;
      background: #f4f5ee !important;
      box-shadow: 0 4px 12px rgba(44,51,24,.055) !important;
    }

    .subscription-card-carousel-image {
      position: absolute !important;
      inset: 0 !important;
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      object-position: center !important;
      border-radius: 15px !important;
    }

    .subscription-card-carousel-caption,
    .subscription-card-carousel::after,
    .subscription-card-media-unit,
    .subscription-card-offer-badge {
      display: none !important;
    }

    /* Weekday labels: exactly on the image, right-aligned. */
    .subscription-card-carousel-day-rail {
      position: absolute !important;
      z-index: 24 !important;
      top: 10px !important;
      right: 7px !important;
      bottom: 20px !important;
      width: 45% !important;
      min-width: 76px !important;
      max-width: 112px !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .subscription-card-carousel-day-rail::after,
    .subscription-card-carousel-day-indicator,
    .subscription-card-carousel-day-number {
      display: none !important;
    }

    .subscription-card-carousel-day-list {
      position: absolute !important;
      inset: 0 !important;
      display: grid !important;
      grid-template-rows: repeat(6, minmax(0, 1fr)) !important;
      gap: 0 !important;
    }

    .subscription-card-carousel-day-option {
      display: flex !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      align-items: center !important;
      justify-content: flex-end !important;
      padding: 1px 2px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #111111 !important;
      box-shadow: none !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      line-height: 17px !important;
      letter-spacing: 0 !important;
      text-align: right !important;
      text-shadow:
        0 1px 2px rgba(255,255,255,.96),
        0 0 5px rgba(255,255,255,.72) !important;
      white-space: nowrap !important;
      cursor: pointer !important;
      transform: none !important;
      opacity: 1 !important;
      transition:
        color .30s ease,
        text-shadow .30s ease,
        transform .30s ease !important;
    }

    .subscription-card-carousel-day-option.active {
      color: #ffffff !important;
      transform: translateX(-4px) !important;
      text-shadow:
        0 1px 4px rgba(0,0,0,.95),
        0 0 8px rgba(0,0,0,.66) !important;
    }

    .subscription-card-carousel-day-option:disabled {
      color: rgba(17,17,17,.36) !important;
      opacity: 1 !important;
    }

    /* Floating Subscribe button exactly like the reference position. */
    .subscription-card-media-subscribe {
      position: absolute !important;
      z-index: 30 !important;
      right: 5px !important;
      bottom: -18px !important;
      display: inline-flex !important;
      min-width: 82px !important;
      min-height: 38px !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 7px 10px !important;
      border: 2px solid var(--subscriptions-olive) !important;
      border-radius: 11px !important;
      background: rgba(255,255,255,.98) !important;
      color: var(--subscriptions-olive) !important;
      box-shadow: 0 4px 10px rgba(51,55,27,.12) !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 10.5px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
      text-transform: uppercase !important;
      text-decoration: none !important;
      white-space: nowrap !important;
    }

    /* Small carousel dots remain at the lower-left. */
    .subscription-card-carousel-control {
      display: none !important;
    }

    .subscription-card-carousel-dots {
      z-index: 8 !important;
      left: 8px !important;
      right: auto !important;
      bottom: 6px !important;
      max-width: 44% !important;
      display: flex !important;
      justify-content: flex-start !important;
      gap: 3px !important;
    }

    .subscription-card-carousel-dot {
      width: 5px !important;
      height: 5px !important;
      background: rgba(255,255,255,.70) !important;
    }

    .subscription-card-carousel-dot.active {
      background: #ffffff !important;
    }

    /* Exact visible information stack under the image. */
    .subscription-card-commerce-summary {
      grid-area: summary !important;
      display: flex !important;
      min-width: 0 !important;
      flex-direction: column !important;
      gap: 0 !important;
      padding: 25px 4px 6px !important;
      background: transparent !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      text-align: left !important;
    }

    .subscription-card-commerce-price-row {
      display: flex !important;
      min-width: 0 !important;
      min-height: 34px !important;
      align-items: center !important;
      gap: 8px !important;
      margin: 0 0 5px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 32px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 4px 9px !important;
      border-radius: 8px !important;
      background: #238b3b !important;
      color: #ffffff !important;
      font-size: 16px !important;
      font-weight: 900 !important;
      line-height: 22px !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-price-row span {
      min-width: 0 !important;
      overflow: hidden !important;
      color: #70766f !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      line-height: 17px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-detail-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      width: 100% !important;
      min-width: 0 !important;
      align-items: center !important;
      column-gap: 7px !important;
      margin: 0 0 7px !important;
    }

    .subscription-card-commerce-detail-row > span {
      min-width: 0 !important;
      overflow: hidden !important;
      color: #238b3b !important;
      font-size: 12.5px !important;
      font-weight: 900 !important;
      line-height: 16px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-detail-row > button {
      justify-self: end !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-bottom: 1px solid currentColor !important;
      background: transparent !important;
      color: #2f6e3d !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      line-height: 16px !important;
      cursor: pointer !important;
      white-space: nowrap !important;
    }

    .subscription-card-commerce-summary > h3 {
      display: -webkit-box !important;
      min-height: 41px !important;
      overflow: hidden !important;
      margin: 0 0 8px !important;
      color: #1d211e !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      line-height: 20px !important;
      letter-spacing: -.08px !important;
      text-align: left !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .subscription-card-commerce-unit {
      display: block !important;
      min-height: 17px !important;
      margin: 0 0 9px !important;
      color: #70766f !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      line-height: 16px !important;
      text-align: left !important;
    }

    .subscription-card-commerce-tags {
      display: flex !important;
      align-items: center !important;
      margin: 0 !important;
    }

    .subscription-card-commerce-tags > span {
      display: inline-flex !important;
      width: fit-content !important;
      min-height: 27px !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 5px 8px !important;
      border-radius: 7px !important;
      background: #fff0d5 !important;
      color: #94600f !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      line-height: 16px !important;
    }

    /* View More still opens the schedule, but no old expanded card sections
       are allowed to reappear. */
    .subscription-card.mobile-expanded {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "main"
        "schedule" !important;
      gap: 9px !important;
      width: 100% !important;
      min-width: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subscription-card.mobile-expanded > .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      grid-template-areas:
        "media"
        "summary" !important;
    }

    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      grid-area: schedule !important;
      display: block !important;
      width: 100% !important;
      padding: 9px !important;
      border: 1px solid #e1e4d8 !important;
      border-radius: 14px !important;
      background: #fbfcf8 !important;
      box-shadow: 0 5px 15px rgba(51,55,27,.055) !important;
    }
  }

  /* Very narrow phones still remain 2 per row; only text is tightened slightly. */
  @media (max-width: 360px) {
    .subscriptions-grid,
    .subscriptions-category-single .subscriptions-grid,
    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 7px !important;
    }

    .subscription-card-carousel-day-option,
    .subscription-card-carousel-day-option.active {
      font-size: 12px !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-price-row strong {
      font-size: 15px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 15px !important;
      line-height: 19px !important;
    }
  }


  /* ==================================================================
     FINAL MOBILE CATEGORY GRID FIX
     Two cards from DIFFERENT categories can sit side-by-side.
     Single-item category wrappers become one grid cell instead of a full row.
     ================================================================== */

  @media (max-width: 700px) {

    /* The OUTER category container itself must be two columns. */
    .subscriptions-categories-layout {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      align-items: start !important;
      gap: 12px 8px !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    /* Single-item categories occupy exactly one column. */
    .subscriptions-categories-layout > .subscriptions-category-single {
      grid-column: span 1 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* The item name is already shown in the compact card.
       Hide the duplicate large category title above the card. */
    .subscriptions-categories-layout
      > .subscriptions-category-single
      > .subscriptions-category-heading {
      display: none !important;
    }

    /* A single category contains exactly one compact card. */
    .subscriptions-category-single .subscriptions-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      width: 100% !important;
      min-width: 0 !important;
      gap: 0 !important;
    }

    .subscriptions-category-single .subscription-card {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      justify-self: stretch !important;
    }

    /* Multi-item categories still span both columns,
       but their products remain 2 cards per row. */
    .subscriptions-categories-layout > .subscriptions-category-multi,
    .subscriptions-categories-layout > .subscriptions-offers-category-section {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    /* Reduce the visible item name a little so both columns stay balanced. */
    .subscription-card-commerce-summary > h3 {
      min-height: 34px !important;
      margin-bottom: 7px !important;
      font-size: 14px !important;
      line-height: 17px !important;
      font-weight: 700 !important;
      -webkit-line-clamp: 2 !important;
    }

    /* Slightly tighten supporting content without changing the design. */
    .subscription-card-commerce-summary {
      padding-left: 2px !important;
      padding-right: 2px !important;
    }

    .subscription-card-commerce-price-row strong {
      font-size: 14px !important;
      padding-left: 7px !important;
      padding-right: 7px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 10.5px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 10px !important;
      line-height: 12px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 10.5px !important;
      line-height: 13px !important;
    }

    .subscription-card-commerce-tags > span {
      font-size: 9.5px !important;
    }

    /* If View More is open, let that selected category temporarily
       span both columns so the side/below schedule has enough space. */
    .subscriptions-categories-layout
      > .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
      grid-column: 1 / -1 !important;
    }
  }

  /* Very small phones still keep two categories per row. */
  @media (max-width: 360px) {
    .subscriptions-categories-layout {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px 6px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 13px !important;
      line-height: 16px !important;
    }

    .subscription-card-commerce-price-row strong {
      font-size: 13px !important;
    }
  }


  /* ==================================================================
     FINAL MOBILE VIEW MORE / DAY CLICK
     Expanded mobile layout matches web:
     LEFT  = original compact subscription card
     RIGHT = compact Monday-Saturday schedule card
     ================================================================== */

  @media (max-width: 700px) {
    /* The selected single-item category temporarily consumes both outer
       catalogue columns so we have room for card + schedule side-by-side. */
    .subscriptions-categories-layout
      > .subscriptions-category-single:has(.subscription-card.mobile-expanded) {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    .subscriptions-category-single:has(.subscription-card.mobile-expanded)
      > .subscriptions-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      width: 100% !important;
      min-width: 0 !important;
      gap: 0 !important;
    }

    /* Multi-item categories already span the page. An expanded card takes
       the complete two-column row, then divides itself into two equal cards. */
    .subscription-card.mobile-expanded {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-areas: "main schedule" !important;
      align-items: start !important;
      gap: 8px !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* LEFT: keep exactly the normal compact subscription card design. */
    .subscription-card.mobile-expanded > .subscription-card-main {
      grid-area: main !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-areas:
        "media"
        "summary" !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      overflow: visible !important;
      aspect-ratio: auto !important;
      background: transparent !important;
    }

    /* Never bring back the old expanded subscription content. */
    .subscription-card.mobile-expanded
      > .subscription-card-main
      > .subscription-card-body,
    .subscription-card.mobile-expanded > .subscription-card-bottom {
      display: none !important;
    }

    /* RIGHT: compact schedule card. */
    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      grid-area: schedule !important;
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 8px !important;
      overflow: hidden !important;
      border: 1px solid #dfe3d6 !important;
      border-radius: 15px !important;
      background: #fbfcf8 !important;
      box-shadow: 0 4px 12px rgba(51,55,27,.055) !important;
      align-self: start !important;
    }

    .subscription-schedule-open-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 5px !important;
      margin: 0 0 6px !important;
    }

    .subscription-schedule-open-header h3 {
      min-width: 0 !important;
      margin: 0 !important;
      color: #202516 !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      line-height: 14px !important;
      white-space: nowrap !important;
    }

    .subscription-schedule-open-close {
      width: 23px !important;
      height: 23px !important;
      flex: 0 0 23px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      border: 1px solid #d9ddcc !important;
      border-radius: 50% !important;
      background: #eef0e6 !important;
      color: #33371b !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      line-height: 1 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-menu {
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    .subscription-schedule-open-card .subscription-card-content-heading {
      display: none !important;
    }

    .subscription-schedule-open-card .subscription-card-day-list {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 4px !important;
      min-height: 31px !important;
      padding: 4px 5px !important;
      border: 1px solid #e5e8df !important;
      border-radius: 7px !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row.active {
      border-color: #d3dac0 !important;
      background: #eef1e5 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-items {
      display: none !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      min-width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: #202516 !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 8.8px !important;
      font-weight: 900 !important;
      line-height: 11px !important;
      text-align: left !important;
      white-space: nowrap !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row.active
      .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-row.active
      .subscription-card-day-label-button {
      color: #a12632 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 54px !important;
      min-height: 23px !important;
      padding: 4px 5px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: #eef0e6 !important;
      color: #33371b !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 7px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      cursor: pointer !important;
    }

    /* View More shows Hide while open; clicking a weekday already dispatches
       the existing selected-day event, so the matching row is highlighted. */
    .subscription-card.mobile-expanded
      .subscription-card-commerce-detail-row > button {
      white-space: nowrap !important;
    }
  }

  /* Very small phones still keep the side-by-side interaction. */
  @media (max-width: 360px) {
    .subscription-card.mobile-expanded {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 6px !important;
    }

    .subscription-card.mobile-expanded > .subscription-schedule-open-card {
      padding: 6px !important;
      border-radius: 12px !important;
    }

    .subscription-schedule-open-header h3 {
      font-size: 10px !important;
      line-height: 13px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 29px !important;
      padding: 3px 4px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 8px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 48px !important;
      font-size: 6.5px !important;
      padding-inline: 4px !important;
    }
  }


  /* ==================================================================
     FINAL MOBILE TYPOGRAPHY = WEB TYPOGRAPHY
     Keep the same Nunito font appearance/weights used on web,
     but enlarge the mobile card text for better readability.
     ================================================================== */

  @media (max-width: 700px) {
    .subscription-card-commerce-summary,
    .subscription-card-commerce-summary *,
    .subscription-card-media-subscribe {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-style: normal !important;
      font-synthesis: none !important;
    }

    .subscription-card-commerce-summary {
      gap: 0 !important;
      padding: 24px 4px 8px !important;
    }

    /* Price badge */
    .subscription-card-commerce-price-row {
      min-height: 35px !important;
      gap: 9px !important;
      margin: 0 0 6px !important;
    }

    .subscription-card-commerce-price-row strong {
      min-height: 34px !important;
      padding: 5px 10px !important;
      border-radius: 8px !important;
      font-size: 17px !important;
      font-weight: 900 !important;
      line-height: 23px !important;
      letter-spacing: 0 !important;
    }

    /* Weekly / plan label */
    .subscription-card-commerce-price-row span {
      font-size: 13px !important;
      font-weight: 600 !important;
      line-height: 18px !important;
      letter-spacing: 0 !important;
    }

    /* Schedule + View More */
    .subscription-card-commerce-detail-row {
      column-gap: 8px !important;
      margin: 0 0 8px !important;
    }

    .subscription-card-commerce-detail-row > span {
      font-size: 12.5px !important;
      font-weight: 900 !important;
      line-height: 16px !important;
      letter-spacing: 0 !important;
    }

    .subscription-card-commerce-detail-row > button {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 12.5px !important;
      font-weight: 800 !important;
      line-height: 16px !important;
      letter-spacing: 0 !important;
    }

    /* Item / subscription name */
    .subscription-card-commerce-summary > h3 {
      min-height: 42px !important;
      margin: 0 0 9px !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 16.5px !important;
      font-weight: 700 !important;
      line-height: 21px !important;
      letter-spacing: -.08px !important;
      -webkit-line-clamp: 2 !important;
    }

    /* Weight / unit */
    .subscription-card-commerce-unit {
      min-height: 18px !important;
      margin: 0 0 10px !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      line-height: 17px !important;
      letter-spacing: 0 !important;
    }

    /* Plan tag */
    .subscription-card-commerce-tags > span {
      min-height: 29px !important;
      padding: 6px 9px !important;
      border-radius: 8px !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 16px !important;
      letter-spacing: 0 !important;
    }

    /* Keep Subscribe typography consistent with web. */
    .subscription-card-media-subscribe {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 11px !important;
      font-weight: 950 !important;
      letter-spacing: 0 !important;
    }

    /* Schedule side-card also uses the same web font family. */
    .subscription-schedule-open-card,
    .subscription-schedule-open-card * {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
    }

    .subscription-schedule-open-header h3 {
      font-size: 12px !important;
      font-weight: 900 !important;
      line-height: 15px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 9.5px !important;
      font-weight: 900 !important;
      line-height: 12px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      font-size: 7.5px !important;
      font-weight: 900 !important;
    }
  }

  @media (max-width: 360px) {
    .subscription-card-commerce-price-row strong {
      font-size: 16px !important;
    }

    .subscription-card-commerce-price-row span {
      font-size: 12px !important;
    }

    .subscription-card-commerce-detail-row > span,
    .subscription-card-commerce-detail-row > button {
      font-size: 11.5px !important;
      line-height: 15px !important;
    }

    .subscription-card-commerce-summary > h3 {
      font-size: 15.5px !important;
      line-height: 20px !important;
    }

    .subscription-card-commerce-unit {
      font-size: 12px !important;
    }

    .subscription-card-commerce-tags > span {
      font-size: 11px !important;
    }
  }


  /* ================================================================
     FINAL MOBILE BOTTOM-SPACE FIX
     Remove the unused blank area below the plan tag.
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-card,
    .subscription-card.mobile-compact,
    .subscription-card-main,
    .subscription-card.mobile-compact .subscription-card-main,
    .subscription-card-commerce-summary {
      height: auto !important;
      min-height: 0 !important;
      align-self: start !important;
      align-content: start !important;
    }

    .subscription-card-commerce-summary {
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
    }

    .subscription-card-commerce-tags {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }

    .subscription-card-commerce-tags > span {
      margin-bottom: 0 !important;
    }

    .subscriptions-category-single .subscription-card,
    .subscriptions-category-multi .subscription-card,
    .subscriptions-offers-category-section .subscription-card {
      height: fit-content !important;
      align-self: start !important;
    }

    .subscriptions-category-single .subscriptions-grid,
    .subscriptions-category-multi .subscriptions-grid,
    .subscriptions-offers-category-section .subscriptions-grid,
    .subscriptions-grid {
      align-items: start !important;
      grid-auto-rows: max-content !important;
    }
  }


  /* ==================================================================
     MOBILE VIEW DETAILS — FULL CONTENT CARD
     Open the complete day details in one large mobile card:
     image + day label + full item title + full description.
     No small anchored popup / clipped 62vh card.
     ================================================================== */
  @media (max-width: 700px) {
    .subscription-schedule-detail-overlay {
      position: fixed !important;
      inset: 0 !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 12px !important;
      overflow: hidden !important;
      background: rgba(22,25,13,.48) !important;
      backdrop-filter: blur(4px) !important;
      -webkit-backdrop-filter: blur(4px) !important;
    }

    .subscription-schedule-detail-card {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      width: 100% !important;
      max-width: 430px !important;
      max-height: calc(100dvh - 24px) !important;
      margin: 0 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      border: 1px solid #d9ddcc !important;
      border-radius: 18px !important;
      background: #ffffff !important;
      box-shadow: 0 22px 55px rgba(20,24,10,.24) !important;
      transform: none !important;
      animation: subscription-mobile-detail-full-pop .18s ease-out both !important;
      scrollbar-width: thin;
    }

    /* Keep only a compact close row so the content gets maximum space. */
    .subscription-schedule-detail-header {
      position: sticky !important;
      top: 0 !important;
      z-index: 8 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      min-height: 42px !important;
      padding: 6px 8px !important;
      border-bottom: 0 !important;
      background: rgba(255,255,255,.94) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
    }

    .subscription-schedule-detail-header > div {
      display: none !important;
    }

    .subscription-schedule-detail-close {
      width: 32px !important;
      height: 32px !important;
      flex: 0 0 32px !important;
      font-size: 20px !important;
    }

    .subscription-schedule-detail-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      width: 100% !important;
      padding: 0 12px 14px !important;
    }

    /* Large full day image, matching the mobile reference. */
    .subscription-schedule-detail-media {
      position: relative !important;
      width: 100% !important;
      max-width: none !important;
      aspect-ratio: 4 / 5 !important;
      justify-self: auto !important;
      overflow: hidden !important;
      border: 1px solid #e4e7db !important;
      border-radius: 15px !important;
      background: #f7f7f2 !important;
    }

    .subscription-schedule-detail-image {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      object-position: center !important;
    }

    .subscription-schedule-detail-media-label {
      left: 10px !important;
      right: 10px !important;
      bottom: 10px !important;
      padding: 8px 10px !important;
      border-radius: 9px !important;
      background: rgba(51,55,27,.86) !important;
      color: #ffffff !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      line-height: 15px !important;
      text-align: center !important;
    }

    /* Full text block below the image — do not clamp or clip anything. */
    .subscription-schedule-detail-content {
      width: 100% !important;
      margin: 0 !important;
      padding: 14px !important;
      border: 1px solid rgba(82,104,24,.18) !important;
      border-radius: 13px !important;
      background: #f7f9f1 !important;
    }

    .subscription-schedule-detail-content > span {
      display: block !important;
      margin: 0 0 7px !important;
      color: #526818 !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      line-height: 14px !important;
    }

    .subscription-schedule-detail-content > p {
      display: block !important;
      overflow: visible !important;
      margin: 0 !important;
      color: #242815 !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      line-height: 1.45 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      -webkit-line-clamp: unset !important;
      -webkit-box-orient: initial !important;
    }

    .subscription-schedule-detail-content
      > .subscription-schedule-detail-description {
      display: block !important;
      overflow: visible !important;
      margin-top: 10px !important;
      padding-top: 10px !important;
      border-top: 1px solid rgba(82,104,24,.14) !important;
      color: #626856 !important;
      font-size: 12px !important;
      font-weight: 650 !important;
      line-height: 1.5 !important;
      white-space: normal !important;
      -webkit-line-clamp: unset !important;
    }
  }

  @keyframes subscription-mobile-detail-full-pop {
    from {
      opacity: 0;
      transform: scale(.985);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 380px) {
    .subscription-schedule-detail-overlay {
      padding: 8px !important;
    }

    .subscription-schedule-detail-card {
      max-height: calc(100dvh - 16px) !important;
      border-radius: 16px !important;
    }

    .subscription-schedule-detail-body {
      gap: 10px !important;
      padding: 0 9px 11px !important;
    }

    .subscription-schedule-detail-content {
      padding: 12px !important;
    }

    .subscription-schedule-detail-content > p {
      font-size: 13px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .subscription-schedule-detail-card {
      animation: none !important;
    }
  }


  /* ================================================================
     MOBILE DAILY MENU — LARGER, MORE READABLE TEXT
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-schedule-open-header h3 {
      font-size: 15px !important;
      font-weight: 900 !important;
      line-height: 19px !important;
    }

    .subscription-schedule-open-close {
      width: 30px !important;
      height: 30px !important;
      flex-basis: 30px !important;
      font-size: 20px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 42px !important;
      padding: 7px 8px !important;
      gap: 7px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 12.5px !important;
      font-weight: 900 !important;
      line-height: 16px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 74px !important;
      min-height: 30px !important;
      padding: 6px 9px !important;
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
    }
  }

  @media (max-width: 360px) {
    .subscription-schedule-open-header h3 {
      font-size: 14px !important;
      line-height: 18px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 40px !important;
      padding: 6px 7px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 11.5px !important;
      line-height: 15px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 68px !important;
      min-height: 28px !important;
      font-size: 9px !important;
    }
  }


  /* ================================================================
     FINAL MOBILE DAILY MENU TYPOGRAPHY
     Match the Daily menu/day labels to the same font appearance and
     size used by the subscription item name.
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-schedule-open-card,
    .subscription-schedule-open-card * {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-style: normal !important;
      font-synthesis: none !important;
    }

    .subscription-schedule-open-header {
      margin-bottom: 9px !important;
    }

    .subscription-schedule-open-header h3 {
      margin: 0 !important;
      color: #1d211e !important;
      font-size: 16.5px !important;
      font-weight: 700 !important;
      line-height: 21px !important;
      letter-spacing: -.08px !important;
    }

    .subscription-schedule-open-close {
      width: 32px !important;
      height: 32px !important;
      flex-basis: 32px !important;
      font-size: 21px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-list {
      gap: 6px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      grid-template-columns: minmax(0, 1fr) auto !important;
      min-height: 48px !important;
      padding: 8px 8px !important;
      gap: 7px !important;
      border-radius: 9px !important;
    }

    /* Same typography as the item name. */
    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      min-width: 0 !important;
      color: #1d211e !important;
      font-size: 16.5px !important;
      font-weight: 700 !important;
      line-height: 21px !important;
      letter-spacing: -.08px !important;
      white-space: nowrap !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row.active
      .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-row.active
      .subscription-card-day-label-button {
      color: #a12632 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 72px !important;
      min-height: 31px !important;
      padding: 6px 8px !important;
      border-radius: 999px !important;
      font-size: 10.5px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }
  }

  @media (max-width: 360px) {
    .subscription-schedule-open-header h3 {
      font-size: 15.5px !important;
      line-height: 20px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 46px !important;
      padding: 7px 7px !important;
      gap: 5px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 15.5px !important;
      line-height: 20px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 66px !important;
      min-height: 29px !important;
      padding-inline: 7px !important;
      font-size: 9.5px !important;
    }
  }


  /* ================================================================
     MOBILE DAILY MENU — MEDIUM TEXT SIZE
     Keep the same Nunito font style, but reduce the heading/day labels
     from the large item-name size to a cleaner medium size.
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-schedule-open-header h3 {
      font-size: 14px !important;
      font-weight: 800 !important;
      line-height: 18px !important;
      letter-spacing: 0 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 42px !important;
      padding: 7px 8px !important;
      gap: 7px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 13px !important;
      font-weight: 800 !important;
      line-height: 17px !important;
      letter-spacing: 0 !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 70px !important;
      min-height: 29px !important;
      padding: 5px 8px !important;
      font-size: 10px !important;
      font-weight: 900 !important;
    }
  }

  @media (max-width: 360px) {
    .subscription-schedule-open-header h3 {
      font-size: 13px !important;
      line-height: 17px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 40px !important;
      padding: 6px 7px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 12px !important;
      line-height: 16px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-view-button {
      min-width: 66px !important;
      min-height: 28px !important;
      font-size: 9px !important;
    }
  }


  /* ================================================================
     MOBILE DAILY MENU — SMALLER DAY NAMES
     Keep the Daily menu heading unchanged; reduce only Monday-Saturday.
     ================================================================ */
  @media (max-width: 700px) {
    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 11.5px !important;
      font-weight: 800 !important;
      line-height: 15px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 39px !important;
      padding: 6px 8px !important;
    }
  }

  @media (max-width: 360px) {
    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-size: 10.5px !important;
      line-height: 14px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 37px !important;
      padding: 5px 7px !important;
    }
  }


  /* ================================================================
     WEB DAILY MENU — SMALLER DAY NAMES
     Apply the same reduced Monday-Saturday sizing used on mobile.
     Keep the Daily menu heading and View details styling unchanged.
     ================================================================ */
  @media (min-width: 701px) {
    .subscription-schedule-open-card .subscription-card-day-label,
    .subscription-schedule-open-card .subscription-card-day-label-button {
      font-family: "Nunito", Arial, Helvetica, sans-serif !important;
      font-size: 11.5px !important;
      font-weight: 800 !important;
      line-height: 15px !important;
    }

    .subscription-schedule-open-card .subscription-card-day-row {
      min-height: 39px !important;
      padding: 6px 8px !important;
    }
  }

/* Progressive catalog keeps the initial DOM small; scroll loads the next batch. */
.subscriptions-progressive-load { padding: 20px; margin: 10px 0 20px; text-align: center; color: #626856; font: 700 13px/1.4 "Nunito",Arial,sans-serif; }
`;

const PUBLIC_ORDER_CATALOG_URL = `${(
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "")}/react/api/public-order/catalog`;

const MOBILE_HEADER_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");
const MOBILE_HEADER_AUTH_SESSION_API =
  `${MOBILE_HEADER_API_BASE_URL}/react/api/auth/session`;
const MOBILE_HEADER_CART_COUNT_API =
  `${MOBILE_HEADER_API_BASE_URL}/react/api/commerce/cart/count`;
const MOBILE_HEADER_LOGOUT_API =
  `${MOBILE_HEADER_API_BASE_URL}/react/api/auth/logout`;

// Reuse the same Offers artwork convention as the Home page when offer.png
// already exists in src/assets or src/assets/images. The category still works
// without the image because the CSS has an olive fallback.
const SUBSCRIPTION_OFFER_BACKGROUND_IMAGE_MODULES = import.meta.glob(
  [
    "../assets/offer.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP}",
    "../assets/images/offer.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP}",
  ],
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const SUBSCRIPTION_OFFER_BACKGROUND_IMAGE =
  Object.values(SUBSCRIPTION_OFFER_BACKGROUND_IMAGE_MODULES)[0] || "";

type MobileHeaderUser = {
  id: string;
  full_name?: string;
  email: string;
  role: string;
};

type MobileHeaderSessionPayload = {
  success?: boolean;
  authenticated?: boolean;
  user?: MobileHeaderUser | null;
  current_user?: MobileHeaderUser | null;
  csrf_token?: string;
  cart_count?: number;
  storefront_enabled?: boolean;
  commerce_checkout_enabled?: boolean;
};

let latestLocationRevision = 0;

function nextLocationRevision(): number {
  const timeRevision = Date.now() * 1000;
  latestLocationRevision = Math.max(timeRevision, latestLocationRevision + 1);
  return latestLocationRevision;
}

function broadcastLocationUpdate(detail: Record<string, unknown>): void {
  window.dispatchEvent(
    new CustomEvent("delivery-location-updated", { detail }),
  );
}

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
    excluded_dates?: Array<{ date: string; reason?: string }>;
  };
};

type SubscriptionOfferCategoryCandidate = {
  name?: unknown;
  slug?: unknown;
  product_type?: unknown;
};

function isSubscriptionOffersCategory(
  category: SubscriptionOfferCategoryCandidate,
): boolean {
  const candidates = [category.name, category.slug, category.product_type];

  return candidates.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");

    return normalized
      .split(/\s+/)
      .some((part) => part === "offer" || part === "offers");
  });
}

function subscriptionScheduleSlides(
  item: SubscriptionItemWithSchedule,
): SubscriptionScheduleEntry[] {
  const schedule = item.content_schedule;
  const excludedWeekdays = new Set(
    item.delivery_exclusions?.excluded_weekdays || ["sunday"],
  );
  const excludedDates = new Set(
    (item.delivery_exclusions?.excluded_dates || []).map((row) => row.date),
  );
  const weekdays = (schedule?.weekday_entries || [])
    .filter(
      (entry) =>
        entry.is_active &&
        !excludedWeekdays.has(String(entry.weekday || "").toLowerCase()),
    )
    .sort(
      (left, right) =>
        Number(left.weekday_index ?? 99) - Number(right.weekday_index ?? 99),
    );
  const exactDates = (schedule?.date_entries || [])
    .filter(
      (entry) =>
        entry.is_active &&
        entry.schedule_date &&
        !excludedDates.has(entry.schedule_date),
    )
    .sort((left, right) =>
      String(left.schedule_date).localeCompare(String(right.schedule_date)),
    );
  return [...weekdays, ...exactDates];
}

function subscriptionScheduleLabel(entry: SubscriptionScheduleEntry): string {
  if (entry.scope === "date" && entry.schedule_date) {
    const value = new Date(`${entry.schedule_date}T00:00:00`);
    return `Special · ${value.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  const weekday = String(entry.weekday || "Weekly menu");
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

const SUBSCRIPTION_CAROUSEL_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const SUBSCRIPTION_SCHEDULE_SELECT_EVENT = "subscription-schedule-select";
const SUBSCRIPTION_SCHEDULE_ACTIVE_EVENT = "subscription-schedule-active";

type SubscriptionScheduleEventDetail = {
  itemId: string;
  entryId: string;
};

function SubscriptionDayMenu({
  item,
  scheduleEntries,
}: {
  item: SubscriptionItemWithSchedule;
  scheduleEntries: SubscriptionScheduleEntry[];
}) {
  const firstEntryId = scheduleEntries[0]?.id || "";
  const [activeEntryId, setActiveEntryId] = useState(firstEntryId);
  const [detailEntry, setDetailEntry] =
    useState<SubscriptionScheduleEntry | null>(null);
  const [detailAnchorTop, setDetailAnchorTop] = useState<number | null>(null);

  useEffect(() => {
    setActiveEntryId(firstEntryId);
    setDetailEntry(null);
    setDetailAnchorTop(null);
  }, [firstEntryId, item.id]);

  useEffect(() => {
    const handleActiveSchedule = (event: Event) => {
      const detail = (event as CustomEvent<SubscriptionScheduleEventDetail>).detail;
      if (!detail || String(detail.itemId) !== String(item.id)) return;
      setActiveEntryId(detail.entryId);
    };

    window.addEventListener(
      SUBSCRIPTION_SCHEDULE_ACTIVE_EVENT,
      handleActiveSchedule,
    );
    return () =>
      window.removeEventListener(
        SUBSCRIPTION_SCHEDULE_ACTIVE_EVENT,
        handleActiveSchedule,
      );
  }, [item.id]);

  useEffect(() => {
    if (!detailEntry || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailEntry(null);
        setDetailAnchorTop(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailEntry]);

  const selectEntry = (entry: SubscriptionScheduleEntry) => {
    setActiveEntryId(entry.id);
    window.dispatchEvent(
      new CustomEvent<SubscriptionScheduleEventDetail>(
        SUBSCRIPTION_SCHEDULE_SELECT_EVENT,
        {
          detail: {
            itemId: String(item.id),
            entryId: entry.id,
          },
        },
      ),
    );
  };

  const openEntryDetails = (
    entry: SubscriptionScheduleEntry,
    trigger?: HTMLElement | null,
  ) => {
    selectEntry(entry);

    if (typeof window !== "undefined" && trigger) {
      const rect = trigger.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const desiredCenter = rect.top + rect.height / 2;

      // Keep the floating card close to the tapped day while ensuring the
      // whole card stays comfortably inside the mobile viewport.
      const minimumCenter = 185;
      const maximumCenter = Math.max(minimumCenter, viewportHeight - 185);
      setDetailAnchorTop(
        Math.min(Math.max(desiredCenter, minimumCenter), maximumCenter),
      );
    } else {
      setDetailAnchorTop(null);
    }

    setDetailEntry(entry);
  };

  return (
    <>
      <div className="subscription-card-day-menu">
        <h4 className="subscription-card-content-heading">Daily menu</h4>
        <ul
          className="subscription-card-day-list"
          style={{
            gridTemplateRows: `repeat(${Math.max(
              scheduleEntries.length,
              1,
            )}, minmax(0, 1fr))`,
          }}
        >
          {scheduleEntries.map((entry) => {
            const menuText = (entry.title || item.name).trim();
            const dayLabel = subscriptionScheduleLabel(entry);
            const isActive = entry.id === activeEntryId;

            return (
              <li
                className={`subscription-card-day-row${isActive ? " active" : ""}`}
                key={`schedule-${entry.id}`}
                aria-current={isActive ? "true" : undefined}
              >
                <button
                  className="subscription-card-day-label-button"
                  type="button"
                  aria-label={`Show ${dayLabel} image in carousel`}
                  aria-pressed={isActive}
                  onClick={() => selectEntry(entry)}
                >
                  {dayLabel}
                </button>

                <button
                  className="subscription-card-day-view-button"
                  type="button"
                  aria-label={`View ${dayLabel} menu details`}
                  aria-haspopup="dialog"
                  onClick={(event) =>
                    openEntryDetails(entry, event.currentTarget)
                  }
                  title={menuText}
                >
                  View details
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {detailEntry && typeof document !== "undefined"
        ? createPortal(
            <div
              className="subscription-schedule-detail-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setDetailEntry(null);
                  setDetailAnchorTop(null);
                }
              }}
            >
              <section
                className="subscription-schedule-detail-card"
                style={
                  detailAnchorTop !== null
                    ? { top: `${detailAnchorTop}px` }
                    : undefined
                }
                role="dialog"
                aria-modal="true"
                aria-label={`${subscriptionScheduleLabel(detailEntry)} menu details`}
              >
                <div className="subscription-schedule-detail-header">
                  <div>
                    <span>Daily menu</span>
                    <strong>{subscriptionScheduleLabel(detailEntry)}</strong>
                  </div>

                  <button
                    className="subscription-schedule-detail-close"
                    type="button"
                    aria-label="Close menu details"
                    onClick={() => {
                      setDetailEntry(null);
                      setDetailAnchorTop(null);
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className="subscription-schedule-detail-body">
                  <div className="subscription-schedule-detail-media">
                    {detailEntry.image_url || item.image_url ? (
                      <img
                        className="subscription-schedule-detail-image"
                        src={subscriptionAssetUrl(
                          detailEntry.image_url || item.image_url || "",
                        )}
                        alt={`${subscriptionScheduleLabel(detailEntry)} - ${
                          detailEntry.title || item.name
                        }`}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className="subscription-schedule-detail-image-placeholder"
                        aria-hidden="true"
                      >
                        🥤
                      </span>
                    )}
                    <span className="subscription-schedule-detail-media-label">
                      {subscriptionScheduleLabel(detailEntry)}
                    </span>
                  </div>

                  <div className="subscription-schedule-detail-content">
                    <span>Included on {subscriptionScheduleLabel(detailEntry)}</span>
                    <p>{(detailEntry.title || item.name).trim()}</p>
                    {detailEntry.description ? (
                      <p className="subscription-schedule-detail-description">
                        {detailEntry.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SubscriptionCardCarousel({
  item,
  eager,
  highPriority,
  onOpenSchedule,
}: {
  item: SubscriptionItemWithSchedule;
  eager: boolean;
  highPriority: boolean;
  onOpenSchedule?: (entry: SubscriptionScheduleEntry) => void;
}) {
  const scheduleSlides = useMemo(() => subscriptionScheduleSlides(item), [item]);
  const fallbackSlide = useMemo<SubscriptionScheduleEntry>(() => ({
    id: `${item.id}-subscription-image`,
    scope: "weekday",
    title: item.name,
    description: item.description,
    image_url: item.image_url,
    is_active: true,
  }), [item.id, item.name, item.description, item.image_url]);
  const slides = useMemo(
    () => scheduleSlides.length ? scheduleSlides : [fallbackSlide],
    [scheduleSlides, fallbackSlide],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setIsNearViewport(Boolean(entries[0]?.isIntersecting)),
      { rootMargin: "200px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setIsPaused(false);
  }, [item.id]);

  const autoSlideIndexes = useMemo(() => {
    const weekdayIndexes = slides
      .map((slide, index) => (slide.scope === "weekday" ? index : -1))
      .filter((index) => index >= 0);
    return weekdayIndexes.length
      ? weekdayIndexes
      : slides.map((_, index) => index);
  }, [slides]);

  useEffect(() => {
    // Off-screen cards must not wake up every 3.6 seconds or fetch new slides.
    if (autoSlideIndexes.length < 2 || isPaused || !isNearViewport) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setActiveIndex((current) => {
        const currentPosition = autoSlideIndexes.indexOf(current);
        const nextPosition =
          currentPosition >= 0
            ? (currentPosition + 1) % autoSlideIndexes.length
            : 0;
        return autoSlideIndexes[nextPosition];
      });
    }, 3_600);
    return () => window.clearInterval(intervalId);
  }, [autoSlideIndexes, isPaused, isNearViewport, item.id]);

  useEffect(() => {
    const handleScheduleSelect = (event: Event) => {
      const detail = (event as CustomEvent<SubscriptionScheduleEventDetail>).detail;
      if (!detail || String(detail.itemId) !== String(item.id)) return;
      const nextIndex = slides.findIndex((slide) => slide.id === detail.entryId);
      if (nextIndex >= 0) {
        setActiveIndex(nextIndex);
      }
    };

    window.addEventListener(
      SUBSCRIPTION_SCHEDULE_SELECT_EVENT,
      handleScheduleSelect,
    );
    return () =>
      window.removeEventListener(
        SUBSCRIPTION_SCHEDULE_SELECT_EVENT,
        handleScheduleSelect,
      );
  }, [item.id, slides]);

  const visibleIndex = Math.min(activeIndex, slides.length - 1);
  const active = slides[visibleIndex];
  const imageUrl = active.image_url || item.image_url;

  const carouselWeekdays = useMemo(
    () =>
      SUBSCRIPTION_CAROUSEL_WEEKDAYS.map((weekday) => {
        const slideIndex = slides.findIndex(
          (slide) =>
            slide.scope === "weekday" &&
            String(slide.weekday || "").trim().toLowerCase() === weekday,
        );

        return {
          weekday,
          label: weekday.charAt(0).toUpperCase() + weekday.slice(1),
          slideIndex,
          slide: slideIndex >= 0 ? slides[slideIndex] : null,
        };
      }),
    [slides],
  );

  const activeWeekdayRailIndex = Math.max(
    0,
    carouselWeekdays.findIndex(
      ({ slideIndex }) => slideIndex === visibleIndex,
    ),
  );

  useEffect(() => {
    if (!active?.id) return;
    window.dispatchEvent(
      new CustomEvent<SubscriptionScheduleEventDetail>(
        SUBSCRIPTION_SCHEDULE_ACTIVE_EVENT,
        {
          detail: {
            itemId: String(item.id),
            entryId: active.id,
          },
        },
      ),
    );
  }, [active?.id, item.id]);

  return (
    <div
      ref={carouselRef}
      className="subscription-card-carousel"
      aria-label={`${item.name} schedule carousel`}
      aria-live={isPaused ? "polite" : "off"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      {imageUrl ? (
        <img
          key={active.id}
          className="subscription-card-carousel-image"
          src={subscriptionAssetUrl(imageUrl)}
          alt={active.title || item.name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={highPriority ? "high" : "auto"}
        />
      ) : (
        <span className="subscription-card-carousel-placeholder" aria-hidden="true">
          🥤
        </span>
      )}
      <span className="subscription-card-media-unit">
        {item.unit_label || "Subscription"}
      </span>

      {scheduleSlides.length ? (
        <div
          className="subscription-card-carousel-day-rail"
          aria-label={`${item.name} Monday to Saturday schedule`}
          onClick={(event) => event.stopPropagation()}
        >
          <span
            className="subscription-card-carousel-day-indicator"
            aria-hidden="true"
            style={{
              top: `${((activeWeekdayRailIndex + 0.5) / carouselWeekdays.length) * 100}%`,
            }}
          />

          <div className="subscription-card-carousel-day-list">
            {carouselWeekdays.map(
              ({ weekday, label, slideIndex, slide }) => {
                const isActive = slideIndex === visibleIndex;
                const available = Boolean(slide && slideIndex >= 0);

                return (
                  <button
                    key={weekday}
                    type="button"
                    className={`subscription-card-carousel-day-option ${
                      isActive ? "active" : ""
                    }`}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={
                      available
                        ? `Open ${label} schedule for ${item.name}`
                        : `${label} schedule unavailable`
                    }
                    disabled={!available}
                    onClick={() => {
                      if (!slide || slideIndex < 0) return;

                      setActiveIndex(slideIndex);
                      setIsPaused(true);
                      onOpenSchedule?.(slide);
                    }}
                  >
                    <span>{label}</span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      <div className="subscription-card-carousel-caption">
        <span className="subscription-card-carousel-label">
          {subscriptionScheduleLabel(active)}
        </span>
        <span className="subscription-card-carousel-title">
          {active.title || item.name}
        </span>
      </div>
      {slides.length > 1 ? (
        <>
          <div
            className="subscription-card-carousel-dots"
            aria-label={`Choose an image for ${item.name}`}
          >
            {slides.map((slide, index) => (
              <button
                className={`subscription-card-carousel-dot ${index === visibleIndex ? "active" : ""}`}
                type="button"
                aria-label={`Show ${subscriptionScheduleLabel(slide)}`}
                aria-current={index === visibleIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                key={slide.id}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function amount(symbol: string, value: unknown): string {
  const number = Number(value || 0);
  return `${symbol}${Number.isFinite(number) ? number.toFixed(2) : "0.00"}`;
}

function combinationItems(combination: {
  included_catalog_items?: Array<{
    name: string;
    unit_label?: string;
    quantity?: number;
  }>;
  sub_items?: Array<{
    name: string;
    unit_label?: string;
    quantity?: number;
  }>;
  item_details?: Array<{
    name: string;
    unit_label?: string;
    quantity?: number;
  }>;
}) {
  return (
    combination.included_catalog_items ||
    combination.sub_items ||
    combination.item_details ||
    []
  );
}

type DisplayComplimentaryChoice = {
  id?: string | number;
  item_id?: string | number;
  name: string;
  unit_label?: string;
  catalog_price?: unknown;
};

type PublicSubscriptionItem = {
  id?: unknown;
  slug?: unknown;
  sku?: unknown;
  name?: unknown;
  complimentary_choices?: unknown;
  complimentary_config?: unknown;
};

type PublicOrderCatalogResponse = {
  success?: boolean;
  subscription_categories?: Array<{
    items?: PublicSubscriptionItem[];
  }>;
};

const CATALOG_CACHE_KEY = "fruveto:subscriptions-catalog:v3";
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const CATALOG_PREVIEW_CACHE_TTL_MS = 20 * 60 * 1000;
const CATALOG_RETRY_COOLDOWN_MS = 30 * 1000;
// Keep rendering from the 5-minute cache, but silently check for newly added
// subscription items once per minute while this page/tab is active.
const CATALOG_BACKGROUND_REVALIDATE_MS = 60 * 1000;
const PUBLIC_ITEMS_CACHE_TTL_MS = 10 * 60 * 1000;

type CatalogCacheEntry = {
  fetchedAt: number;
  payload: SubscriptionCatalogPayload;
};

type CatalogRequestState = {
  generation: number;
  promise: Promise<SubscriptionCatalogPayload>;
};

let catalogMemoryCache: CatalogCacheEntry | null | undefined;
let catalogGeneration = 0;
let catalogRequest: CatalogRequestState | null = null;
let catalogAppInitialized = false;
let lastCatalogRequestAt = 0;
let publicItemsCache: {
  fetchedAt: number;
  items: Map<string, PublicSubscriptionItem>;
} | null = null;
let publicItemsRequest: Promise<Map<string, PublicSubscriptionItem>> | null =
  null;

function isFresh(timestamp: number, ttl: number): boolean {
  return Number.isFinite(timestamp) && Date.now() - timestamp < ttl;
}

function readCatalogCache(): CatalogCacheEntry | null {
  if (catalogMemoryCache !== undefined) return catalogMemoryCache;
  if (typeof window === "undefined") {
    catalogMemoryCache = null;
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!storedValue) {
      catalogMemoryCache = null;
      return null;
    }

    const parsed = JSON.parse(storedValue) as CatalogCacheEntry;
    catalogMemoryCache =
      parsed &&
      Number.isFinite(parsed.fetchedAt) &&
      parsed.payload &&
      Array.isArray(parsed.payload.categories)
        ? parsed
        : null;
  } catch {
    catalogMemoryCache = null;
  }

  return catalogMemoryCache;
}

function writeCatalogCache(
  payload: SubscriptionCatalogPayload,
  fetchedAt = Date.now(),
): void {
  const entry: CatalogCacheEntry = { fetchedAt, payload };
  catalogMemoryCache = entry;

  if (typeof window === "undefined") return;

  try {
    const browserEntry: CatalogCacheEntry = {
      fetchedAt,
      payload: {
        ...payload,
        saved_addresses: [],
        selected_saved_address_id: "",
        csrf_token: "",
        subscription_csrf_token: "",
      },
    };
    window.sessionStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify(browserEntry),
    );
  } catch {
    // In-memory caching still works if browser storage is restricted or full.
  }
}

function invalidateCatalogCache(): void {
  catalogGeneration += 1;
  catalogMemoryCache = null;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    // The next network result will replace the in-memory cache.
  }
}

function getFreshCatalogCache(): CatalogCacheEntry | null {
  const cached = readCatalogCache();
  return cached && isFresh(cached.fetchedAt, CATALOG_CACHE_TTL_MS)
    ? cached
    : null;
}

function getPreviewCatalogCache(): CatalogCacheEntry | null {
  const cached = readCatalogCache();
  return cached && isFresh(cached.fetchedAt, CATALOG_PREVIEW_CACHE_TTL_MS)
    ? cached
    : null;
}

function catalogRenderSignature(payload: SubscriptionCatalogPayload): string {
  // Background checks should not re-render every card when the server returned
  // the same catalog. Complimentary choices are excluded because they can be
  // enriched separately from PUBLIC_ORDER_CATALOG_URL.
  const categories = (payload.categories || []).map((category) => ({
    ...category,
    items: (category.items || []).map((item) => {
      const itemRecord = {
        ...(item as unknown as Record<string, unknown>),
      };
      delete itemRecord.complimentary_choices;
      delete itemRecord.complimentary_items;
      delete itemRecord.complementary_choices;
      delete itemRecord.complementary_items;
      delete itemRecord.available_complimentary_items;
      delete itemRecord.available_complementary_items;
      return itemRecord;
    }),
  }));

  return JSON.stringify({
    categories,
    location_required: payload.location_required,
    nearby_radius_km: payload.nearby_radius_km,
    nearby_seller_count: payload.nearby_seller_count,
    currency_symbol: payload.currency_symbol,
  });
}

async function getCatalogOnce(): Promise<SubscriptionCatalogPayload> {
  const generation = catalogGeneration;

  if (catalogRequest?.generation === generation) {
    return catalogRequest.promise;
  }

  const promise = getSubscriptionCatalog();
  lastCatalogRequestAt = Date.now();
  const request: CatalogRequestState = { generation, promise };
  catalogRequest = request;

  try {
    const result = await promise;
    if (generation === catalogGeneration) writeCatalogCache(result);
    return result;
  } finally {
    if (catalogRequest === request) catalogRequest = null;
  }
}

function lookupText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().toLowerCase()
    : "";
}

function subscriptionLookupKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const fields: Array<[string, unknown]> = [
    ["id", record.id],
    ["slug", record.slug],
    ["sku", record.sku],
    ["name", record.name],
  ];
  return fields.flatMap(([field, rawValue]) => {
    const normalized = lookupText(rawValue);
    return normalized ? [`${field}:${normalized}`] : [];
  });
}

async function loadPublicSubscriptionItems(): Promise<
  Map<string, PublicSubscriptionItem>
> {
  if (
    publicItemsCache &&
    isFresh(publicItemsCache.fetchedAt, PUBLIC_ITEMS_CACHE_TTL_MS)
  ) {
    return publicItemsCache.items;
  }

  if (publicItemsRequest) return publicItemsRequest;

  const request = (async () => {
  try {
    const response = await fetch(PUBLIC_ORDER_CATALOG_URL, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const emptyItems = new Map<string, PublicSubscriptionItem>();
      publicItemsCache = { fetchedAt: Date.now(), items: emptyItems };
      return emptyItems;
    }

    const payload = (await response.json()) as PublicOrderCatalogResponse;
    const lookup = new Map<string, PublicSubscriptionItem>();
    const categories = Array.isArray(payload.subscription_categories)
      ? payload.subscription_categories
      : [];

    categories.forEach((category) => {
      const items = Array.isArray(category.items) ? category.items : [];
      items.forEach((item) => {
        subscriptionLookupKeys(item).forEach((key) => {
          if (!lookup.has(key)) lookup.set(key, item);
        });
      });
    });

    publicItemsCache = { fetchedAt: Date.now(), items: lookup };
    return lookup;
  } catch {
    // The subscription catalog remains usable if the public catalog is
    // temporarily unavailable; only complimentary choices use this fallback.
    const emptyItems = new Map<string, PublicSubscriptionItem>();
    publicItemsCache = { fetchedAt: Date.now(), items: emptyItems };
    return emptyItems;
  }
  })();

  publicItemsRequest = request;

  try {
    return await request;
  } finally {
    if (publicItemsRequest === request) publicItemsRequest = null;
  }
}

function mergePublicComplimentaryItems(
  catalog: SubscriptionCatalogPayload,
  publicItems: Map<string, PublicSubscriptionItem>,
): SubscriptionCatalogPayload {
  if (!publicItems.size) return catalog;

  let catalogChanged = false;
  const categories = (catalog.categories || []).map((category) => {
    let categoryChanged = false;
    const items = (category.items || []).map((item) => {
      const publicItem = subscriptionLookupKeys(item)
        .map((key) => publicItems.get(key))
        .find((entry): entry is PublicSubscriptionItem => Boolean(entry));

      if (!publicItem) return item;

      const publicChoices = complimentaryChoices(
        publicItem.complimentary_choices,
      );
      if (!publicChoices.length) return item;

      categoryChanged = true;
      catalogChanged = true;
      return {
        ...item,
        complimentary_choices: publicChoices,
        complimentary_config:
          publicItem.complimentary_config ?? item.complimentary_config,
      } as typeof item;
    });

    return categoryChanged ? { ...category, items } : category;
  });

  return catalogChanged ? { ...catalog, categories } : catalog;
}

function normalizeComplimentaryChoice(
  value: unknown,
): DisplayComplimentaryChoice | null {
  if (typeof value === "string") {
    const name = value.trim();
    return name ? { name } : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { id: value, name: String(value) };
  }
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const nestedValue =
    record.item ||
    record.product ||
    record.catalog_item ||
    record.choice ||
    record.details;
  const nested =
    nestedValue && typeof nestedValue === "object"
      ? (nestedValue as Record<string, unknown>)
      : {};
  const rawName =
    record.name ||
    record.item_name ||
    record.product_name ||
    record.display_name ||
    record.label ||
    record.title ||
    nested.name ||
    nested.item_name ||
    nested.product_name ||
    nested.display_name ||
    nested.label ||
    nested.title;

  if (typeof rawName !== "string" || !rawName.trim()) return null;

  const rawUnit =
    record.unit_label ||
    record.unit ||
    record.size ||
    nested.unit_label ||
    nested.unit ||
    nested.size;

  return {
    id: (record.id || record.choice_id || nested.id) as
      | string
      | number
      | undefined,
    item_id: (record.item_id || record.product_id || nested.item_id) as
      | string
      | number
      | undefined,
    name: rawName.trim(),
    unit_label: typeof rawUnit === "string" ? rawUnit : undefined,
    catalog_price:
      record.catalog_price ??
      record.price ??
      nested.catalog_price ??
      nested.price,
  };
}

const COMPLIMENTARY_NESTED_KEYS = [
  "choices",
  "items",
  "options",
  "complimentary_choices",
  "complimentary_items",
  "complementary_choices",
  "complementary_items",
  "allowed_items",
  "available_items",
  "available_choices",
  "eligible_items",
  "selected_items",
  "catalog_items",
  "complimentary_item_ids",
  "complementary_item_ids",
];

function extractComplimentaryChoices(
  source: unknown,
  depth = 0,
  seen = new Set<object>(),
): DisplayComplimentaryChoice[] {
  if (source == null || depth > 5) return [];

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return extractComplimentaryChoices(
          JSON.parse(trimmed) as unknown,
          depth + 1,
          seen,
        );
      } catch {
        // Treat non-JSON text as a complimentary item name.
      }
    }
    return [{ name: trimmed }];
  }

  if (typeof source === "number") {
    const choice = normalizeComplimentaryChoice(source);
    return choice ? [choice] : [];
  }

  if (Array.isArray(source)) {
    return source.flatMap((entry) =>
      extractComplimentaryChoices(entry, depth + 1, seen),
    );
  }

  if (typeof source !== "object") return [];
  if (seen.has(source)) return [];
  seen.add(source);

  const record = source as Record<string, unknown>;
  const nestedChoices = COMPLIMENTARY_NESTED_KEYS.flatMap((key) =>
    key in record
      ? extractComplimentaryChoices(record[key], depth + 1, seen)
      : [],
  );
  if (nestedChoices.length) return nestedChoices;

  const singleChoice = normalizeComplimentaryChoice(record);
  if (singleChoice) return [singleChoice];

  const metadataKeys = new Set([
    "max_items",
    "budget",
    "max_value",
    "enabled",
    "mode",
    "type",
  ]);
  const mapValues = Object.entries(record)
    .filter(
      ([key, value]) =>
        !metadataKeys.has(key) &&
        value != null &&
        (typeof value === "object" ||
          typeof value === "string" ||
          typeof value === "number"),
    )
    .map(([, value]) => value);
  return mapValues.flatMap((value) =>
    extractComplimentaryChoices(value, depth + 1, seen),
  );
}

function complimentaryChoices(
  ...sources: unknown[]
): DisplayComplimentaryChoice[] {
  try {
    const uniqueChoices = new Map<string, DisplayComplimentaryChoice>();
    sources
      .flatMap((source) => extractComplimentaryChoices(source))
      .forEach((choice, index) => {
        const key = String(
          choice.id ||
          choice.item_id ||
          `${choice.name.toLowerCase()}-${choice.unit_label || ""}-${index}`,
        );
        if (!uniqueChoices.has(key)) uniqueChoices.set(key, choice);
      });
    return Array.from(uniqueChoices.values());
  } catch {
    return [];
  }
}

const EMPTY_COMPLIMENTARY_CHOICES: DisplayComplimentaryChoice[] = [];

interface SubscriptionProductCardProps {
  item: SubscriptionItem;
  itemIndex: number;
  categoryIndex: number;
  isOffer: boolean;
  mobileExpanded: boolean;
  symbol: string;
  choices: DisplayComplimentaryChoice[];
  onToggle: (item: SubscriptionItem) => void;
}

// Memoizing each product stops unrelated header/search/location state changes
// from repainting every image carousel and the expanded daily-menu DOM.
const SubscriptionProductCard = memo(function SubscriptionProductCard({
  item, itemIndex, categoryIndex, isOffer, mobileExpanded,
  symbol, choices, onToggle,
}: SubscriptionProductCardProps) {
                  const planConfig = item as unknown as {
                    allowed_plan_codes?: string[];
                    plan_prices?: Record<string, unknown>;
                  };
                  const configuredPlanCodes = Array.isArray(
                    planConfig.allowed_plan_codes,
                  )
                    ? planConfig.allowed_plan_codes
                        .map((code) => String(code || "").trim().toLowerCase())
                        .filter(Boolean)
                    : [];
                  const allowedPlanCodes = new Set(
                    configuredPlanCodes.length
                      ? configuredPlanCodes
                      : ["weekly", "monthly", "three_months"],
                  );
                  const planPrices = planConfig.plan_prices || {};
                  const planOptions = [
                    {
                      code: "weekly",
                      label: "Weekly",
                      price: amount(symbol, planPrices.weekly),
                    },
                    {
                      code: "monthly",
                      label: "Monthly",
                      price: amount(symbol, planPrices.monthly),
                    },
                    {
                      code: "three_months",
                      label: "3 months",
                      price: amount(symbol, planPrices.three_months),
                    },
                    {
                      code: "custom",
                      label: "Custom days",
                      price: `${amount(symbol, planPrices.custom_per_day)}/day`,
                    },
                  ].filter((plan) => allowedPlanCodes.has(plan.code));
                  const visiblePlanOptions = planOptions.length
                    ? planOptions
                    : [
                        {
                          code: "weekly",
                          label: "Weekly",
                          price: amount(symbol, planPrices.weekly),
                        },
                      ];
                  const primaryPlan = visiblePlanOptions[0];
                  const scheduleEntries = useMemo(
                    () => subscriptionScheduleSlides(item as SubscriptionItemWithSchedule),
                    [item],
                  );

                  return (
                    <article
                      className={`subscription-card ${
                        isOffer
                          ? "subscription-card-offer-highlight "
                          : ""
                      }${
                        mobileExpanded ? "mobile-expanded" : "mobile-compact"
                      }`}
                      key={item.id}
                    >
                      <div className="subscription-schedule-open-card">
                        <div className="subscription-schedule-open-header">
                          <h3>Daily menu</h3>
                          <button
                            type="button"
                            className="subscription-schedule-open-close"
                            aria-label={`Close ${item.name} daily menu`}
                            onClick={() => onToggle(item)}
                          >
                            ×
                          </button>
                        </div>

                        {scheduleEntries.length ? (
                          <SubscriptionDayMenu
                            item={item as SubscriptionItemWithSchedule}
                            scheduleEntries={scheduleEntries}
                          />
                        ) : (
                          <p className="subscription-schedule-open-empty">
                            Schedule details are not available.
                          </p>
                        )}
                      </div>

                      <div className="subscription-card-main">
                        <div className="subscription-card-media">
                        {isOffer ? (
                          <span className="subscription-card-offer-badge">
                            SPECIAL OFFER
                          </span>
                        ) : null}
                        <SubscriptionCardCarousel
                          item={item as SubscriptionItemWithSchedule}
                          eager={categoryIndex === 0 && itemIndex < 3}
                          highPriority={categoryIndex === 0 && itemIndex === 0}
                          onOpenSchedule={(entry) => {
                            if (!mobileExpanded) {
                              onToggle(item);
                            }

                            window.setTimeout(() => {
                              window.dispatchEvent(
                                new CustomEvent<SubscriptionScheduleEventDetail>(
                                  SUBSCRIPTION_SCHEDULE_SELECT_EVENT,
                                  {
                                    detail: {
                                      itemId: String(item.id),
                                      entryId: entry.id,
                                    },
                                  },
                                ),
                              );
                            }, 0);
                          }}
                        />
                        <Link
                          className="subscription-card-media-subscribe"
                          to={`/subscriptions/item/${encodeURIComponent(item.id)}`}
                          aria-label={`Subscribe to ${item.name}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Subscribe
                        </Link>
                        <button
                          type="button"
                          className="subscription-card-media-toggle"
                          aria-label={`${
                            mobileExpanded ? "Collapse" : "Open"
                          } ${item.name}`}
                          aria-expanded={mobileExpanded}
                          onClick={() => onToggle(item)}
                        />
                      </div>

                      <div className="subscription-card-commerce-summary">
                        <div className="subscription-card-commerce-price-row">
                          <strong>{primaryPlan.price}</strong>
                          <span>{primaryPlan.label}</span>
                        </div>

                        <div className="subscription-card-commerce-detail-row">
                          <span>
                            {scheduleEntries.length
                              ? `${scheduleEntries.length} days`
                              : "Flexible"}
                          </span>
                          <button
                            type="button"
                            aria-expanded={mobileExpanded}
                            onClick={() => onToggle(item)}
                          >
                            {mobileExpanded ? "Hide" : "View More"}
                          </button>
                        </div>

                        <h3>{item.name}</h3>

                        <p className="subscription-card-commerce-unit">
                          {item.unit_label || "Subscription"}
                        </p>

                        <div className="subscription-card-commerce-tags">
                          <span>
                            {visiblePlanOptions.length}{" "}
                            {visiblePlanOptions.length === 1 ? "plan" : "plans"}
                          </span>
                        </div>
                      </div>

                      <div className="subscription-card-body">
                        <div className="subscription-card-top">
                          <div>
                            <span className="subscription-card-kicker">
                              Subscription plan
                            </span>
                            <h3>{item.name}</h3>
                          </div>
                          <button
                            type="button"
                            className="subscription-card-collapse"
                            aria-label={`Collapse ${item.name}`}
                            onClick={() => onToggle(item)}
                          >
                            ×
                          </button>
                        </div>

                        <div className="subscription-card-mobile-meta">
                          <span className="subscription-card-mobile-weekly">
                            <span>{primaryPlan.label}</span>
                            <strong>{primaryPlan.price}</strong>
                          </span>
                        </div>

                        {scheduleEntries.length ? (
                          <SubscriptionDayMenu
                            item={item as SubscriptionItemWithSchedule}
                            scheduleEntries={scheduleEntries}
                          />
                        ) : null}

                        {(() => {
                          if (!choices.length) return null;

                          return (
                            <div className="subscription-card-complimentary">
                              <h4 className="subscription-card-content-heading">
                                Complimentary choices
                              </h4>
                              <ul className="subscription-card-complimentary-list">
                                {choices.map((choice, index) => (
                                  <li
                                    className="subscription-card-complimentary-item"
                                    key={`${choice.id || choice.item_id || choice.name}-${index}`}
                                  >
                                    <span>
                                      {choice.name}
                                      {choice.unit_label
                                        ? ` · ${choice.unit_label}`
                                        : ""}
                                    </span>
                                    <strong>
                                      {Number(choice.catalog_price || 0) > 0
                                        ? amount(symbol, choice.catalog_price)
                                        : "Free"}
                                    </strong>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>
                      </div>

                      <div className="subscription-card-bottom">
                        <h4 className="subscription-card-plan-heading">
                          Choose your plan
                        </h4>
                        <div className="subscription-card-prices">
                          {visiblePlanOptions.map((plan) => (
                            <div
                              className="subscription-card-price"
                              key={plan.code}
                            >
                              <span>{plan.label}</span>
                              <strong>{plan.price}</strong>
                            </div>
                          ))}
                          <div className="subscription-card-actions">
                            <Link
                              className="subscriptions-button primary"
                              to={`/subscriptions/item/${encodeURIComponent(item.id)}`}
                            >
                              Subscribe
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                });

export function SubscriptionsPage() {
  const initialCatalog = getPreviewCatalogCache();
  const [payload, setPayload] = useState<SubscriptionCatalogPayload | null>(
    initialCatalog?.payload ?? null,
  );
  const [loading, setLoading] = useState(!initialCatalog);
  const [error, setError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(
    initialCatalog?.payload.selected_saved_address_id || "",
  );
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [mobileLocationPickerOpen, setMobileLocationPickerOpen] = useState(false);
  const [mobileLocationSearch, setMobileLocationSearch] = useState("");
  const [mobileCurrentLocationName, setMobileCurrentLocationName] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [mobileLoggingOut, setMobileLoggingOut] = useState(false);
  const [mobileLogoutError, setMobileLogoutError] = useState("");
  const [mobileHeaderUser, setMobileHeaderUser] = useState<MobileHeaderUser | null>(null);
  const [mobileHeaderCartCount, setMobileHeaderCartCount] = useState(0);
  const [mobileHeaderStorefrontEnabled, setMobileHeaderStorefrontEnabled] = useState(true);
  const [mobileHeaderCheckoutEnabled, setMobileHeaderCheckoutEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [expandedItemKeys, setExpandedItemKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleItemLimit, setVisibleItemLimit] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const locationCsrfRef = useRef("");
  const locationOperationRef = useRef(0);
  const catalogRequestRef = useRef(0);
  const payloadRef = useRef<SubscriptionCatalogPayload | null>(
    initialCatalog?.payload ?? null,
  );

  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header");
    const modeSelector = document.querySelector<HTMLElement>(
      ".subscriptions-mode-selector",
    );

    const syncFixedControlHeights = () => {
      const headerHeight = header
        ? Math.max(0, Math.round(header.getBoundingClientRect().height))
        : 80;

      const selectorHeight = modeSelector
        ? Math.max(0, Math.round(modeSelector.getBoundingClientRect().height))
        : 64;

      root.style.setProperty(
        "--subscriptions-site-header-height",
        `${headerHeight || 80}px`,
      );
      root.style.setProperty(
        "--subscriptions-mode-selector-height",
        `${selectorHeight || 64}px`,
      );
    };

    syncFixedControlHeights();
    window.addEventListener("resize", syncFixedControlHeights);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncFixedControlHeights)
        : null;

    if (header) resizeObserver?.observe(header);
    if (modeSelector) resizeObserver?.observe(modeSelector);

    return () => {
      window.removeEventListener("resize", syncFixedControlHeights);
      resizeObserver?.disconnect();
      root.style.removeProperty("--subscriptions-site-header-height");
      root.style.removeProperty("--subscriptions-mode-selector-height");
    };
  }, []);

  const applyCatalog = useCallback((result: SubscriptionCatalogPayload) => {
    payloadRef.current = result;
    setPayload(result);
    setSelectedAddressId(result.selected_saved_address_id || "");
  }, []);

  const loadCatalog = useCallback(
    async (forceRefresh = false, silentRefresh = false) => {
    const requestId = ++catalogRequestRef.current;
    const cachedCatalog = getFreshCatalogCache();
    const matchingRequestInFlight =
      catalogRequest?.generation === catalogGeneration;

    if (!forceRefresh && !matchingRequestInFlight && cachedCatalog) {
      applyCatalog(cachedCatalog.payload);
      setLoading(false);
      return cachedCatalog.payload;
    }

    if (!payloadRef.current) setLoading(true);
    setError("");

    // A second, optional public-order request previously competed for
    // bandwidth with the primary catalog and above-the-fold images.
    try {
      const result = await getCatalogOnce();
      if (requestId !== catalogRequestRef.current) return null;

      const currentPayload = payloadRef.current;
      const catalogChanged =
        !currentPayload ||
        catalogRenderSignature(currentPayload) !== catalogRenderSignature(result);

      if (!silentRefresh || catalogChanged) {
        if (silentRefresh && currentPayload) {
          payloadRef.current = result;
          startTransition(() => {
            setPayload(result);
            setSelectedAddressId(result.selected_saved_address_id || "");
          });
        } else {
          applyCatalog(result);
        }
      } else if (currentPayload) {
        // getCatalogOnce() refreshed the cache with the raw server response.
        // Keep any already-enriched complimentary data while preserving the
        // new fetchedAt timestamp from this successful freshness check.
        const refreshedCache = readCatalogCache();
        writeCatalogCache(currentPayload, refreshedCache?.fetchedAt ?? Date.now());
      }

      // Complimentary choices from the public catalog are an enhancement.
      // Merge them when ready without delaying the first usable render.
      // Enrich after the first usable paint without blocking the page.
      window.setTimeout(() => {
        if (requestId !== catalogRequestRef.current) return;
        void loadPublicSubscriptionItems().then((publicItems) => {
          if (requestId !== catalogRequestRef.current || !publicItems.size) return;
          const enrichedResult = mergePublicComplimentaryItems(result, publicItems);
          if (enrichedResult === result) return;
          if (payloadRef.current === result) {
            payloadRef.current = enrichedResult;
            startTransition(() => setPayload(enrichedResult));
            const cached = readCatalogCache();
            if (cached?.payload === result) {
              writeCatalogCache(enrichedResult, cached.fetchedAt);
            }
          }
        });
      }, 350);

      return result;
    } catch (unknownError) {
      if (requestId === catalogRequestRef.current) {
        if (!payloadRef.current) {
          setError(
            unknownError instanceof SubscriptionApiError
              ? unknownError.message
              : "Unable to load nearby subscriptions.",
          );
        }
      }
      return null;
    } finally {
      if (requestId === catalogRequestRef.current) {
        setLoading(false);
      }
    }
    },
    [applyCatalog],
  );

  const getLocationCsrf = useCallback(async (force = false) => {
    if (!force && locationCsrfRef.current) {
      return locationCsrfRef.current;
    }
    const state = await getDeliveryLocationState();
    locationCsrfRef.current = state.csrf_token;
    return state.csrf_token;
  }, []);

  useEffect(
    () => () => {
      catalogRequestRef.current += 1;
      locationOperationRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const forceInitialRefresh = !catalogAppInitialized;
    catalogAppInitialized = true;
    void loadCatalog(forceInitialRefresh, Boolean(payloadRef.current));
  }, [loadCatalog]);

  useEffect(() => {
    function refreshCatalogInBackground() {
      if (document.visibilityState !== "visible") return;
      if (catalogRequest) return;

      const hasCatalogOnScreen = Boolean(payloadRef.current);
      const minimumInterval = hasCatalogOnScreen
        ? CATALOG_BACKGROUND_REVALIDATE_MS
        : CATALOG_RETRY_COOLDOWN_MS;

      if (Date.now() - lastCatalogRequestAt < minimumInterval) return;

      // Existing cards stay visible. This request only updates React state when
      // the catalog actually changed (for example, an admin added a new item).
      void loadCatalog(true, hasCatalogOnScreen);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshCatalogInBackground();
      }
    }

    const intervalId = window.setInterval(
      refreshCatalogInBackground,
      CATALOG_BACKGROUND_REVALIDATE_MS,
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", refreshCatalogInBackground);
    window.addEventListener("focus", refreshCatalogInBackground);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", refreshCatalogInBackground);
      window.removeEventListener("focus", refreshCatalogInBackground);
    };
  }, [loadCatalog]);

  const activateSavedAddress = useCallback(
    async (addressId: string): Promise<boolean> => {
      if (!addressId) return false;

      const operation = ++locationOperationRef.current;
      const revision = Date.now() * 1000 + operation;
      setLocationBusy(true);
      setLocationError("");
      setLocationMessage("Selecting saved delivery location…");

      try {
        let csrfToken = await getLocationCsrf();
        let result;
        try {
          result = await setSavedDeliveryLocation(
            addressId,
            revision,
            csrfToken,
          );
        } catch (unknownError) {
          if (
            unknownError instanceof LocationApiError &&
            unknownError.code === "CSRF_FAILED"
          ) {
            csrfToken = await getLocationCsrf(true);
            result = await setSavedDeliveryLocation(
              addressId,
              revision,
              csrfToken,
            );
          } else {
            throw unknownError;
          }
        }

        if (operation !== locationOperationRef.current) return false;

        locationCsrfRef.current = result.csrf_token || csrfToken;
        setSelectedAddressId(addressId);
        setMobileCurrentLocationName("");
        invalidateCatalogCache();
        await loadCatalog(true);
        if (operation !== locationOperationRef.current) return false;

        setLocationMessage(
          result.message ||
          "Saved location selected. Nearby subscriptions updated.",
        );
        window.dispatchEvent(
          new CustomEvent("delivery-location-updated", {
            detail: {
              source: "saved",
              addressId,
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              revision: result.location.revision,
            },
          }),
        );
        return true;
      } catch (unknownError) {
        if (operation === locationOperationRef.current) {
          setLocationMessage("");
          setLocationError(
            unknownError instanceof Error
              ? unknownError.message
              : "Unable to select the saved address.",
          );
        }
        return false;
      } finally {
        if (operation === locationOperationRef.current) {
          setLocationBusy(false);
        }
      }
    },
    [getLocationCsrf, loadCatalog],
  );

  const handleSavedAddressChange = useCallback(
    async (event: ChangeEvent<HTMLSelectElement>) => {
      const addressId = event.target.value;
      if (!addressId) return;
      await activateSavedAddress(addressId);
    },
    [activateSavedAddress],
  );

  const activateCurrentLocation = useCallback(async () => {
    const operationId = ++locationOperationRef.current;
    const revision = nextLocationRevision();

    setLocationBusy(true);
    setLocationLoading(true);
    setLocationError("");
    setError("");
    setLocationMessage("Detecting current location…");

    try {
      const coordinates = await getBrowserCoordinates();
      if (operationId !== locationOperationRef.current) return false;

      const location = await setCurrentLocation({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        name: "Current location",
      });
      if (operationId !== locationOperationRef.current) return false;

      rememberCatalogLocation({
        ...location,
        source: location.source || "current",
      });

      setMobileCurrentLocationName(location.name || "Current location");
      setSelectedAddressId("");
      setLocationMessage(
        "Current location detected. Loading nearby subscriptions…",
      );

      invalidateCatalogCache();
      const refreshedCatalog = await loadCatalog(true);
      if (operationId !== locationOperationRef.current || !refreshedCatalog) {
        return false;
      }

      broadcastLocationUpdate({
        source: "current",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        revision,
      });
      setLocationMessage(
        "Current location selected. Nearby subscriptions loaded.",
      );
      return true;
    } catch (unknownError) {
      if (operationId === locationOperationRef.current) {
        setLocationMessage("");
        setLocationError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unable to detect the current location.",
        );
        setLoading(false);
      }
      return false;
    } finally {
      if (operationId === locationOperationRef.current) {
        setLocationLoading(false);
        setLocationBusy(false);
      }
    }
  }, [loadCatalog]);

  const itemCount = useMemo(
    () =>
      (payload?.categories || []).reduce(
        (total, category) => total + (category.items || []).length,
        0,
      ),
    [payload],
  );

  const hasDeferredSearch = deferredSearchQuery.trim().length > 0;

  const searchableCategories = useMemo(
    () => {
      if (!hasDeferredSearch) return [];

      return (payload?.categories || []).map((category) => ({
        category,
        items: (category.items || []).map((item) => {
          const productText = [
            item.name,
            item.description,
            (item as unknown as Record<string, unknown>).detailed_description,
            JSON.stringify(
              (item as unknown as Record<string, unknown>).content_schedule || {},
            ),
            item.unit_label,
            category.name,
            category.description,
          ]
            .filter(Boolean)
            .join(" ");

          const combinationText = (item.catalog_combinations || [])
            .map((combination) => {
              const includedItems = combinationItems(combination);
              return [
                combination.name,
                ...includedItems.map((included) => included.name),
                ...includedItems.map((included) => included.unit_label),
              ]
                .filter(Boolean)
                .join(" ");
            })
            .join(" ");

          return {
            item,
            searchText: `${productText} ${combinationText}`.toLowerCase(),
          };
        }),
      }));
    },
    [hasDeferredSearch, payload],
  );

  const filteredCategories = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    if (!hasDeferredSearch || !query) {
      return payload?.categories || [];
    }

    return searchableCategories
      .map(({ category, items }) => {
        const filteredItems = items
          .filter(({ searchText }) => searchText.includes(query))
          .map(({ item }) => item);
        return {
          ...category,
          items: filteredItems,
        };
      })
      .filter((category) => category.items.length > 0);
  }, [
    deferredSearchQuery,
    hasDeferredSearch,
    payload,
    searchableCategories,
  ]);

  const orderedFilteredCategories = useMemo(() => {
    const categories = [...filteredCategories];

    return categories.sort((left, right) => {
      const leftIsOffers = isSubscriptionOffersCategory(left);
      const rightIsOffers = isSubscriptionOffersCategory(right);

      if (leftIsOffers !== rightIsOffers) {
        return leftIsOffers ? -1 : 1;
      }

      return 0;
    });
  }, [filteredCategories]);

  // Keep all categories searchable, but mount only the first batch of cards.
  // An intersection observer brings in more as the customer scrolls.
  const totalFilteredItems = useMemo(
    () => orderedFilteredCategories.reduce(
      (sum, category) => sum + (category.items || []).length, 0,
    ),
    [orderedFilteredCategories],
  );
  const visibleCategories = useMemo(() => {
    let remaining = visibleItemLimit;
    return orderedFilteredCategories.flatMap((category) => {
      if (remaining <= 0) return [];
      const visibleItems = category.items.slice(0, remaining);
      remaining -= visibleItems.length;
      return visibleItems.length ? [{ ...category, items: visibleItems }] : [];
    });
  }, [orderedFilteredCategories, visibleItemLimit]);

  useEffect(() => {
    setVisibleItemLimit(12);
  }, [deferredSearchQuery, payload]);

  useEffect(() => {
    if (visibleItemLimit >= totalFilteredItems) return;
    const node = loadMoreRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisibleItemLimit(totalFilteredItems);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();
      startTransition(() => {
        setVisibleItemLimit((current) => Math.min(totalFilteredItems, current + 12));
      });
    }, { rootMargin: "650px 0px", threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleItemLimit, totalFilteredItems, deferredSearchQuery]);

  const complimentaryChoicesByItem = useMemo(() => {
    const choicesByItem = new WeakMap<object, DisplayComplimentaryChoice[]>();

    (payload?.categories || []).forEach((category) => {
      (category.items || []).forEach((item) => {
        const itemRecord = item as unknown as Record<string, unknown>;
        choicesByItem.set(
          item,
          complimentaryChoices(
            item.complimentary_choices,
            itemRecord.complimentary_items,
            itemRecord.complementary_choices,
            itemRecord.complementary_items,
            itemRecord.available_complimentary_items,
            itemRecord.available_complementary_items,
            itemRecord.complimentary_selection,
            itemRecord.complementary_selection,
          ),
        );
      });
    });

    return choicesByItem;
  }, [payload]);

  const subscriptionItemKey = useCallback(
    (item: SubscriptionItem) => String(item.id || item.name),
    [],
  );

  const toggleSubscriptionCard = useCallback(
    (item: SubscriptionItem) => {
      const key = subscriptionItemKey(item);
      setExpandedItemKeys((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [subscriptionItemKey],
  );

  useEffect(() => {
    let cancelled = false;

    const loadMobileHeaderSession = async () => {
      try {
        const response = await fetch(MOBILE_HEADER_AUTH_SESSION_API, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        const session = (await response.json().catch(() => ({}))) as MobileHeaderSessionPayload;
        if (cancelled || !response.ok || !session.success) return;

        // The JWT endpoint, not the compatibility CSRF state, decides who is signed in.
        const identity = await getJwtAuthIdentity();
        if (cancelled) return;
        const user = identity.authenticated ? identity.user : null;
        setMobileHeaderUser(user);
        setMobileHeaderStorefrontEnabled(session.storefront_enabled !== false);
        setMobileHeaderCheckoutEnabled(session.commerce_checkout_enabled !== false);
        setMobileHeaderCartCount(Math.max(0, Number(session.cart_count || 0)));

        if (user?.role === "user") {
          const cartResponse = await fetch(MOBILE_HEADER_CART_COUNT_API, {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
            cache: "no-store",
          });
          const cartPayload = (await cartResponse.json().catch(() => ({}))) as {
            success?: boolean;
            count?: number;
          };
          if (!cancelled && cartResponse.ok && cartPayload.success) {
            const count = Number(cartPayload.count);
            if (Number.isFinite(count) && count >= 0) {
              setMobileHeaderCartCount(Math.trunc(count));
            }
          }
        }
      } catch {
        // Navigation remains usable even if session refresh temporarily fails.
      }
    };

    void loadMobileHeaderSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mobileHeaderUser || mobileHeaderUser.role !== "user") return;

    const handleCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{
        count?: unknown;
        itemCount?: unknown;
        quantityCount?: unknown;
        quantities?: Record<string, unknown>;
      }>).detail;

      let count = Number(detail?.quantityCount);
      if ((!Number.isFinite(count) || count < 0) && detail?.quantities) {
        count = Object.values(detail.quantities).reduce<number>(
          (total, quantity) => total + Math.max(0, Number(quantity || 0)),
          0,
        );
      }
      if (!Number.isFinite(count) || count < 0) {
        count = Number(detail?.itemCount ?? detail?.count);
      }
      if (Number.isFinite(count) && count >= 0) {
        setMobileHeaderCartCount(Math.trunc(count));
      }
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    return () => window.removeEventListener("cart-updated", handleCartUpdated);
  }, [mobileHeaderUser]);

  useEffect(() => {
    if (!mobileNavigationOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileProfileMenuOpen(false);
        setMobileNavigationOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavigationOpen]);

  const handleMobileLogout = useCallback(async () => {
    if (mobileLoggingOut) return;

    setMobileLoggingOut(true);
    setMobileLogoutError("");

    try {
      const sessionResponse = await fetch(MOBILE_HEADER_AUTH_SESSION_API, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as {
        success?: boolean;
        csrf_token?: string;
      };
      const token = String(sessionPayload.csrf_token || "").trim();

      if (!sessionResponse.ok || !sessionPayload.success || !token) {
        throw new Error(
          "Unable to create a logout security token. Refresh the page and try again.",
        );
      }

      const formBody = new URLSearchParams();
      formBody.set("csrf_token", token);

      const response = await fetch(MOBILE_HEADER_LOGOUT_API, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRF-Token": token,
        },
        body: formBody.toString(),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        code?: string;
        redirect_url?: string;
      };

      if (!response.ok || !payload.success) {
        if (response.status === 400) {
          throw new Error(
            "Logout was rejected by CSRF validation. Refresh the page and try again.",
          );
        }
        if (payload.code === "csrf_failed") {
          throw new Error(
            "Your login session changed. Refresh the page and try logout again.",
          );
        }
        throw new Error(payload.message || `Logout failed (${response.status}).`);
      }

      notifyJwtAuthChanged();
      setMobileHeaderUser(null);
      setMobileHeaderCartCount(0);
      setMobileProfileMenuOpen(false);
      setMobileNavigationOpen(false);
      window.location.assign(payload.redirect_url || "/react/login");
    } catch (error) {
      setMobileLogoutError(
        error instanceof Error ? error.message : "Unable to log out.",
      );
    } finally {
      setMobileLoggingOut(false);
    }
  }, [mobileLoggingOut]);

  const selectedMobileAddress = useMemo(
    () =>
      (payload?.saved_addresses || []).find(
        (address) => address.id === selectedAddressId,
      ),
    [payload?.saved_addresses, selectedAddressId],
  );

  const filteredMobileSavedAddresses = useMemo(() => {
    const query = mobileLocationSearch.trim().toLowerCase();
    const addresses = payload?.saved_addresses || [];
    if (!query) return addresses;

    return addresses.filter((address) =>
      `${address.label} ${address.is_default ? "default" : ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [mobileLocationSearch, payload?.saved_addresses]);

  const mobileLocationTitle = selectedMobileAddress
    ? selectedMobileAddress.label
    : locationLoading
      ? "Locating…"
      : payload?.location_required
        ? "Use current location"
        : mobileCurrentLocationName || "Current location";

  const mobileLocationSubtitle = selectedMobileAddress
    ? selectedMobileAddress.is_default
      ? "Saved delivery location · Default"
      : "Saved delivery location"
    : payload?.location_required
      ? "Tap to detect your nearby location"
      : "Current location selected";

  useEffect(() => {
    if (!mobileLocationPickerOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileLocationPickerOpen]);

  const symbol = payload?.currency_symbol || "₹";
  return (
    <>
      <style>{SUBSCRIPTIONS_PAGE_STYLES}</style>
      <main
        className="subscriptions-page"
        aria-busy={loading || searchQuery !== deferredSearchQuery}
      >
        <div className="subscriptions-page-container">
          <header
            className="subscriptions-mobile-location-header"
            aria-label="Delivery location"
          >
            <button
              className="subscriptions-mobile-location-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={mobileLocationPickerOpen}
              onClick={() => {
                setMobileProfileMenuOpen(false);
                setMobileNavigationOpen(false);
                setMobileLocationSearch("");
                setMobileLocationPickerOpen(true);
              }}
            >
              <span className="subscriptions-mobile-location-icon" aria-hidden="true">
                {locationLoading ? (
                  <span className="subscriptions-mobile-location-spinner" />
                ) : (
                  <MapPin size={18} strokeWidth={2.4} />
                )}
              </span>
              <span className="subscriptions-mobile-location-copy">
                <span className="subscriptions-mobile-location-title-row">
                  <strong>{mobileLocationTitle}</strong>
                  <ChevronDown size={15} strokeWidth={2.6} aria-hidden="true" />
                </span>
                <small>{mobileLocationSubtitle}</small>
              </span>
            </button>

            <button
              className="subscriptions-mobile-profile-trigger"
              type="button"
              aria-label={mobileNavigationOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-controls="subscriptions-mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              onClick={() => {
                setMobileLocationPickerOpen(false);
                setMobileProfileMenuOpen(false);
                setMobileLogoutError("");
                setMobileNavigationOpen((open) => !open);
              }}
            >
              <span className="subscriptions-mobile-menu-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </header>

          <nav
            className="subscriptions-mode-selector"
            aria-label="Choose shopping option"
          >
            <div className="subscriptions-mode-tabs">
              <Link
                className="subscriptions-mode-tab"
                to="/juice?delivery=one_day_delivery"
              >
                One-Day Delivery
              </Link>

              <Link
                className="subscriptions-mode-tab"
                to="/juice?delivery=instant_delivery"
              >
                Instant Delivery
              </Link>

              <Link
                className="subscriptions-mode-tab active"
                to="/subscriptions"
                aria-current="page"
              >
                Subscriptions
              </Link>
            </div>
          </nav>

          <div className="subscriptions-mobile-search" aria-label="Search subscriptions">
            <div className="subscriptions-search-inner">
              <Search size={17} strokeWidth={2.1} />
              <input
                type="search"
                placeholder="Search juice, fruit boxes, smoothies…"
                aria-label="Search subscriptions"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="subscriptions-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
              <button
                type="button"
                className="subscriptions-mobile-search-button"
                onClick={(event) => {
                  const input = event.currentTarget
                    .closest(".subscriptions-search-inner")
                    ?.querySelector("input");
                  input?.blur();
                }}
              >
                Search
              </button>
            </div>
          </div>

          <section className="subscriptions-location">
            <div className="subscriptions-location-controls">
              <div className="subscriptions-search subscriptions-search-inline">
                <div className="subscriptions-search-inner">
                  <Search size={20} strokeWidth={2} />

                  <input
                    type="text"
                    placeholder="Search juice subscriptions..."
                    aria-label="Search subscriptions"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      className="subscriptions-search-clear"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <select
                className="subscriptions-location-select"
                value={selectedAddressId}
                disabled={locationBusy || locationLoading}
                aria-label="Select saved delivery address"
                onChange={(event) => void handleSavedAddressChange(event)}
              >
                <option value="" disabled>
                  {payload?.saved_addresses?.length
                    ? "Select saved address"
                    : "No saved addresses"}
                </option>
                {(payload?.saved_addresses || []).map((address) => (
                  <option value={address.id} key={address.id}>
                    {address.label}
                    {address.is_default ? " · Default" : ""}
                  </option>
                ))}
              </select>
              <button
                className="subscriptions-button subscriptions-current-location-button"
                type="button"
                disabled={locationBusy || locationLoading}
                onClick={() => void activateCurrentLocation()}
              >
                {locationLoading ? "Detecting…" : "Use Current Location"}
              </button>
            </div>
            {locationMessage ? (
              <span className="subscriptions-location-message">
                {locationMessage}
              </span>
            ) : null}
            {locationError ? (
              <span className="subscriptions-location-message error">
                {locationError}
              </span>
            ) : null}
          </section>

          {error ? <div className="subscriptions-alert">{error}</div> : null}
          {loading ? (
            <section
              className="subscriptions-skeleton"
              aria-label="Loading subscriptions"
              aria-busy="true"
            >
              <div className="subscriptions-skeleton-header" aria-hidden="true">
                <div className="subscriptions-skeleton-heading">
                  <span className="subscriptions-skeleton-line subscriptions-skeleton-title" />
                  <span className="subscriptions-skeleton-line subscriptions-skeleton-subtitle" />
                </div>
              </div>

              <div className="subscriptions-skeleton-grid" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <article
                    className="subscriptions-skeleton-card"
                    key={`subscription-skeleton-${index}`}
                  >
                    <div className="subscriptions-skeleton-media" />

                    <div className="subscriptions-skeleton-body">
                      <span className="subscriptions-skeleton-line subscriptions-skeleton-name" />
                      <span className="subscriptions-skeleton-line subscriptions-skeleton-description" />
                      <span className="subscriptions-skeleton-line subscriptions-skeleton-description short" />

                      <span className="subscriptions-skeleton-block subscriptions-skeleton-note" />

                      <div className="subscriptions-skeleton-price-row">
                        <span className="subscriptions-skeleton-block subscriptions-skeleton-price" />
                        <span className="subscriptions-skeleton-block subscriptions-skeleton-price" />
                      </div>

                      <div className="subscriptions-skeleton-menu">
                        <span className="subscriptions-skeleton-block subscriptions-skeleton-menu-row" />
                        <span className="subscriptions-skeleton-block subscriptions-skeleton-menu-row" />
                      </div>
                    </div>

                    <div className="subscriptions-skeleton-bottom">
                      <div className="subscriptions-skeleton-block subscriptions-skeleton-button" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {!loading && payload?.location_required ? (
            <div className="subscriptions-alert">
              Select a saved address or current location on the Juice catalog
              before choosing a subscription.
            </div>
          ) : null}

          {!loading && !itemCount && !error ? (
            <div className="subscriptions-empty">
              No subscription packages are currently available near this
              location.
            </div>
          ) : null}

          {!loading &&
            deferredSearchQuery.trim() !== "" &&
            filteredCategories.length === 0 && (
              <div className="subscriptions-empty">
                <Search size={30} strokeWidth={1.8} />

                <h3>No subscriptions found</h3>

                <p>
                  No subscriptions match "{deferredSearchQuery}".
                </p>

                <button
                  type="button"
                  className="subscriptions-button"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </button>
              </div>
            )}

          <div className="subscriptions-categories-layout">
          {visibleCategories.map((category, categoryIndex) => (
            <section
              className={`subscriptions-category ${
                isSubscriptionOffersCategory(category)
                  ? "subscriptions-offers-category-section "
                  : ""
              }${
                category.items.length === 1
                  ? "subscriptions-category-single"
                  : "subscriptions-category-multi"
              }`}
              key={category.id}
            >
              {isSubscriptionOffersCategory(category) ? (
                <div
                  className="subscriptions-offers-hero"
                  aria-label="Fruveto subscription offers"
                  style={
                    SUBSCRIPTION_OFFER_BACKGROUND_IMAGE
                      ? {
                          backgroundImage: `url(${SUBSCRIPTION_OFFER_BACKGROUND_IMAGE})`,
                        }
                      : undefined
                  }
                >
                  <div className="subscriptions-offers-hero-copy">
                    <span className="subscriptions-offers-hero-eyebrow">
                      FRUVETO SUBSCRIPTIONS
                    </span>
                    <strong>Special Offers</strong>
                    <p>
                      Save more with selected subscription plans and limited-time
                      value packs.
                    </p>
                    <div className="subscriptions-offers-hero-pills">
                      <span>LIMITED-TIME VALUE</span>
                      <span>SUBSCRIPTION DEALS</span>
                      <span>
                        {category.items.length}{" "}
                        {category.items.length === 1 ? "OFFER" : "OFFERS"}
                      </span>
                    </div>
                  </div>

                  <div className="subscriptions-offers-hero-badge" aria-hidden="true">
                    <span>SAVE</span>
                    <strong>MORE</strong>
                    <small>with plans</small>
                  </div>
                </div>
              ) : null}

              <div className="subscriptions-category-heading">
                <div>
                  {isSubscriptionOffersCategory(category) ? (
                    <span className="subscriptions-offers-category-kicker">
                      CURATED SAVINGS
                    </span>
                  ) : null}
                  <h2>{category.name}</h2>
                  <p>{category.description}</p>
                </div>
                {isSubscriptionOffersCategory(category) ? (
                  <span className="subscriptions-offers-count-chip">
                    {category.items.length}{" "}
                    {category.items.length === 1 ? "offer" : "offers"}
                  </span>
                ) : null}
              </div>
              <div className="subscriptions-grid">
                {category.items.map((item, itemIndex) => (
                  <SubscriptionProductCard
                    key={String(item.id || item.name)}
                    item={item}
                    itemIndex={itemIndex}
                    categoryIndex={categoryIndex}
                    isOffer={isSubscriptionOffersCategory(category)}
                    mobileExpanded={expandedItemKeys.has(subscriptionItemKey(item))}
                    symbol={symbol}
                    choices={complimentaryChoicesByItem.get(item) || EMPTY_COMPLIMENTARY_CHOICES}
                    onToggle={toggleSubscriptionCard}
                  />
                ))}
              </div>
            </section>
          ))}
          </div>
          {visibleItemLimit < totalFilteredItems ? (
            <div ref={loadMoreRef} className="subscriptions-progressive-load" role="status" aria-live="polite">
              Loading more subscriptions…
            </div>
          ) : null}

        </div>
      </main>

      {mobileNavigationOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                className="subscriptions-mobile-navigation-backdrop"
                type="button"
                aria-label="Close navigation menu"
                onClick={() => {
                  setMobileProfileMenuOpen(false);
                  setMobileNavigationOpen(false);
                }}
              />

              <nav
                id="subscriptions-mobile-navigation"
                className="subscriptions-mobile-navigation-menu"
                aria-label="Main navigation"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) {
                    setMobileProfileMenuOpen(false);
                    setMobileNavigationOpen(false);
                  }
                }}
              >
                {mobileLogoutError ? (
                  <span className="subscriptions-mobile-navigation-logout-error">
                    {mobileLogoutError}
                  </span>
                ) : null}

                <Link className="subscriptions-mobile-navigation-link" to="/">
                  Home
                </Link>

                {mobileHeaderUser ? (
                  <>
                    {mobileHeaderUser.role === "user" && mobileHeaderStorefrontEnabled ? (
                      <Link className="subscriptions-mobile-navigation-link" to="/juice">
                        GreenMart
                      </Link>
                    ) : null}

                    {mobileHeaderUser.role === "user" && mobileHeaderCheckoutEnabled ? (
                      <>
                        <Link className="subscriptions-mobile-navigation-link" to="/orders">
                          Orders
                        </Link>
                        <Link className="subscriptions-mobile-navigation-link" to="/addresses">
                          Addresses
                        </Link>
                        <Link
                          className="subscriptions-mobile-navigation-link"
                          to="/cart"
                          aria-label={`Open shopping cart. ${mobileHeaderCartCount} items.`}
                        >
                          <span aria-hidden="true" style={{ width: 20, height: 20, display: "inline-flex", flex: "0 0 auto" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                              <circle cx="9" cy="20" r="1" />
                              <circle cx="18" cy="20" r="1" />
                              <path d="M3 4h2l2.3 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" />
                            </svg>
                          </span>
                          <span className="subscriptions-mobile-navigation-link-label">Basket</span>
                          <span className="subscriptions-mobile-navigation-count">
                            {mobileHeaderCartCount}
                          </span>
                        </Link>
                      </>
                    ) : null}

                    {mobileHeaderUser.role === "user" ? (
                      <Link
                        className="subscriptions-mobile-navigation-link"
                        to="/support/tickets"
                      >
                        Support
                      </Link>
                    ) : null}

                    <div className="subscriptions-mobile-navigation-user-menu">
                      <button
                        className="subscriptions-mobile-navigation-account"
                        type="button"
                        aria-label={mobileProfileMenuOpen ? "Close user menu" : "Open user menu"}
                        aria-haspopup="menu"
                        aria-expanded={mobileProfileMenuOpen}
                        onClick={() => setMobileProfileMenuOpen((open) => !open)}
                      >
                        <span className="subscriptions-mobile-navigation-account-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="18"
                            height="18"
                          >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21a8 8 0 0 1 16 0" />
                          </svg>
                        </span>
                        <span className="subscriptions-mobile-navigation-account-copy">
                          <strong>{mobileHeaderUser.full_name || mobileHeaderUser.email}</strong>
                          <small>Account options</small>
                        </span>
                        <span className="subscriptions-mobile-navigation-account-chevron" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </button>

                      {mobileProfileMenuOpen ? (
                        <div className="subscriptions-mobile-navigation-user-dropdown" role="menu">
                          <span className="subscriptions-mobile-navigation-user-name">
                            {mobileHeaderUser.full_name || mobileHeaderUser.email}
                          </span>
                          {mobileHeaderUser.role !== "admin" ? (
                            <Link
                              className="subscriptions-mobile-navigation-submenu-link"
                              role="menuitem"
                              to="/dashboard"
                            >
                              My Profile
                            </Link>
                          ) : null}
                          {mobileHeaderUser.role === "user" ? (
                            <Link
                              className="subscriptions-mobile-navigation-submenu-link"
                              role="menuitem"
                              to="/support/tickets"
                            >
                              My Support Tickets
                            </Link>
                          ) : null}
                          <button
                            className="subscriptions-mobile-navigation-submenu-link logout"
                            type="button"
                            role="menuitem"
                            onClick={() => void handleMobileLogout()}
                            disabled={mobileLoggingOut}
                          >
                            {mobileLoggingOut ? "Logging out..." : "Logout"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <Link className="subscriptions-mobile-navigation-link" to="/about-us">
                      About Us
                    </Link>
                    <Link className="subscriptions-mobile-navigation-link" to="/contact-us">
                      Contact Us
                    </Link>
                    <Link className="subscriptions-mobile-navigation-link" to="/react/login">
                      Login
                    </Link>
                    <Link className="subscriptions-mobile-navigation-link" to="/register/user">
                      Create Account
                    </Link>
                  </>
                )}
              </nav>
            </>,
            document.body,
          )
        : null}

      {mobileLocationPickerOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="subscriptions-mobile-location-picker subscriptions-mobile-location-picker--open"
              role="dialog"
              aria-modal="true"
              aria-label="Select a location"
            >
              <div className="subscriptions-mobile-location-picker-header">
                <button
                  className="subscriptions-mobile-location-picker-back"
                  type="button"
                  aria-label="Close location selector"
                  onClick={() => setMobileLocationPickerOpen(false)}
                >
                  <ChevronLeft size={25} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <h2>Select a location</h2>
              </div>

              <div className="subscriptions-mobile-location-picker-search">
                <Search size={20} strokeWidth={2.3} aria-hidden="true" />
                <input
                  autoFocus
                  type="search"
                  value={mobileLocationSearch}
                  onChange={(event) => setMobileLocationSearch(event.target.value)}
                  placeholder="Search saved locations..."
                  aria-label="Search saved locations"
                />
              </div>

              <div className="subscriptions-mobile-location-picker-scroll">
                <div className="subscriptions-mobile-location-action-card">
                  <button
                    className="subscriptions-mobile-location-action-row"
                    type="button"
                    disabled={locationBusy || locationLoading}
                    onClick={() => {
                      void (async () => {
                        const selected = await activateCurrentLocation();
                        if (selected) setMobileLocationPickerOpen(false);
                      })();
                    }}
                  >
                    <span
                      className="subscriptions-mobile-location-action-icon"
                      aria-hidden="true"
                    >
                      {locationLoading ? (
                        <span className="subscriptions-mobile-location-action-spinner" />
                      ) : (
                        <LocateFixed size={20} strokeWidth={2.3} />
                      )}
                    </span>
                    <span className="subscriptions-mobile-location-action-copy">
                      <strong>Use current location</strong>
                      <small>Detect your nearby area and refresh subscriptions</small>
                    </span>
                    <ChevronRight size={17} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>

                {locationError ? (
                  <p className="subscriptions-mobile-location-picker-feedback error">
                    {locationError}
                  </p>
                ) : locationMessage ? (
                  <p className="subscriptions-mobile-location-picker-feedback">
                    {locationMessage}
                  </p>
                ) : null}

                <section
                  className="subscriptions-mobile-saved-addresses"
                  aria-label="Saved addresses"
                >
                  <h3>SAVED ADDRESSES</h3>

                  {filteredMobileSavedAddresses.length ? (
                    filteredMobileSavedAddresses.map((address) => {
                      const selected = address.id === selectedAddressId;
                      return (
                        <button
                          className={`subscriptions-mobile-saved-address-card${
                            selected ? " selected" : ""
                          }`}
                          type="button"
                          key={address.id}
                          disabled={locationBusy || locationLoading}
                          onClick={() => {
                            void (async () => {
                              const success = await activateSavedAddress(address.id);
                              if (success) setMobileLocationPickerOpen(false);
                            })();
                          }}
                        >
                          <span
                            className="subscriptions-mobile-saved-address-icon"
                            aria-hidden="true"
                          >
                            <MapPin size={20} strokeWidth={2.1} />
                          </span>
                          <span className="subscriptions-mobile-saved-address-copy">
                            <span className="subscriptions-mobile-saved-address-title-row">
                              <strong>{address.label}</strong>
                              {selected ? (
                                <span className="subscriptions-mobile-saved-address-check">
                                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                                </span>
                              ) : null}
                            </span>
                            <small>
                              {address.is_default
                                ? "Saved delivery location · Default"
                                : "Saved delivery location"}
                            </small>
                          </span>
                          <ChevronRight size={17} strokeWidth={2.1} aria-hidden="true" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="subscriptions-mobile-saved-address-empty">
                      <MapPin size={22} strokeWidth={2} aria-hidden="true" />
                      <strong>
                        {mobileLocationSearch.trim()
                          ? "No saved addresses match your search"
                          : "No saved addresses yet"}
                      </strong>
                      <span>Use your current location to continue.</span>
                    </div>
                  )}
                </section>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
