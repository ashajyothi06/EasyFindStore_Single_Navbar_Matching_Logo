import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link,useLocation,useNavigate,useParams } from "react-router-dom";
import type { CatalogCategory,CatalogItem } from "../services/coreCommerceApi";
import { readGuestCart, fetchCatalog, currentSession, setGuestQuantity } from "../lib/guestCart";
import { addCartItem, getCart, updateCartItem, removeCartItem } from "../lib/api";
import { JWT_AUTH_CHANGED_EVENT, notifyJwtAuthChanged } from "../lib/jwtAuth";
import { estimatedDelivery } from "../lib/estimatedDelivery";
import { productDetailHref } from "../lib/productLinks";
import { guestCartCount } from "../lib/guestCart";
import { loadAdminOrders } from "../services/adminOrdersApi";
import { FiShoppingCart, FiSearch, FiChevronLeft, FiChevronRight, FiChevronDown } from "react-icons/fi";
import "../styles/site-header-ecommerce.css";
import {
  FiActivity, FiArrowRight, FiBookOpen, FiCoffee, FiDroplet, FiGift,
  FiHeart, FiHome, FiMonitor, FiPackage, FiShoppingBag, FiGrid,
  FiSmartphone, FiSun, FiWatch,
} from "react-icons/fi";
import "../styles/marketplace.css";
import "../styles/easyfindstore-cosmetic-only.css";


/**
 * Page-owned header: edit this directly in CategoriesPage.tsx.
 * The sitewide SiteHeader is not imported or rendered here.
 * Keep the existing auth, cart and admin links functioning.
 *
 * IMPORTANT: In App.tsx, do not render <SiteHeader /> on /categories routes.
 * A temporary CSS fallback hides the old global header while migrating.
 */
type CategoriesHeaderUser = {
  id: string;
  full_name?: string;
  email: string;
  role: string;
};
type CategoriesHeaderSession = {
  authenticated?: boolean;
  user?: CategoriesHeaderUser | null;
  csrf_token?: string;
};
const CATEGORIES_HEADER_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
// The page publishes one accurate total; the header never needs to refetch the
// entire session and cart in response to every add/remove click.
const CATEGORIES_CART_SYNCED_EVENT = "categories-cart-synced";

const CATALOG_CACHE_WINDOW_MS = 20_000;
let lastCatalogSnapshot: { data: CatalogCategory[]; loadedAt: number } | null = null;
let catalogInFlight: Promise<CatalogCategory[]> | null = null;

function loadCatalogShared(): Promise<CatalogCategory[]> {
  if (catalogInFlight) return catalogInFlight;
  const pending = fetchCatalog()
    .then(data => {
      const active = data.filter(category => category.is_active !== false);
      lastCatalogSnapshot = { data: active, loadedAt: Date.now() };
      return active;
    });
  catalogInFlight = pending;
  void pending.then(
    () => { if (catalogInFlight === pending) catalogInFlight = null; },
    () => { if (catalogInFlight === pending) catalogInFlight = null; },
  );
  return pending;
}

function quantitiesEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}

function publishCategoryCartCount(count: number): void {
  window.dispatchEvent(new CustomEvent<number>(CATEGORIES_CART_SYNCED_EVENT, { detail: count }));
}

const CATEGORIES_LOCAL_HEADER_CSS = `
  /* Migration fallback: hide the app-level header ONLY on this page.
     Once the App layout excludes /categories, this rule is harmless. */
  body:has(.market-store.market-store-wide > .market-page-header)
    .ec-site-header:not(.market-page-header) {
    display: none !important;
  }
  .market-store.market-store-wide > .market-page-header {
    position: sticky !important;
    top: 0 !important;
    left: auto !important;
    z-index: 1200 !important;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
  }
  .market-store.market-store-wide > .market-page-header > .ec-site-inner {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: clamp(16px, 2.3vw, 44px) !important;
    padding-right: clamp(16px, 2.3vw, 44px) !important;
    box-sizing: border-box !important;
  }
  .market-page-header .ec-site-brand {
    text-transform: none !important;
  }
  .market-page-header .ec-site-cart-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .market-page-header .ec-site-cart-icon {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  @media (min-width: 992px) {
    .market-page-header > .ec-site-inner {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 28px;
    }
    .market-page-header .ec-site-nav {
      margin-left: auto;
      margin-right: 0 !important;
    }
  }
  @media (max-width: 767px) {
    .market-page-header > .ec-site-inner {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
  }

  /* Search is positioned after the brand and before the Home navigation. */
  .market-store.market-store-wide > .market-page-header > .ec-site-inner {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: clamp(12px, 1.1vw, 20px) !important;
    min-height: 78px;
  }
  .market-page-header .ec-site-brand {
    flex: 0 0 auto !important;
    min-width: 0;
  }
  .market-page-header .market-header-search {
    display: flex !important;
    flex: 1 1 330px;
    align-items: stretch;
    min-width: 160px;
    max-width: 650px;
    height: 43px;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden;
    border: 1px solid #e4cfae;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(25, 8, 9, 0.08);
    box-sizing: border-box;
  }
  .market-page-header .market-header-search input {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    height: 100%;
    padding: 0 14px;
    outline: none;
    border: 0 !important;
    border-radius: 0 !important;
    background: #fff !important;
    color: #32282b !important;
    font: inherit;
    font-size: 13px;
    box-shadow: none !important;
    box-sizing: border-box;
  }
  .market-page-header .market-header-search input::placeholder {
    color: #806d70;
    opacity: 1;
  }
  .market-page-header .market-header-search:focus-within {
    border-color: #cda363;
    box-shadow: 0 0 0 2px rgba(205, 163, 99, 0.22);
  }
  .market-page-header .market-header-search button {
    display: inline-flex !important;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: auto;
    min-width: 91px;
    height: 100%;
    margin: 0 !important;
    padding: 0 14px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: #7a1d2c !important;
    color: #fff !important;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .market-page-header .market-header-search button:hover {
    background: #92283b !important;
  }
  .market-page-header .market-header-search button svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .market-page-header .market-header-search button:focus-visible {
    outline: 2px solid #d9ad61;
    outline-offset: -3px;
  }
  @media (min-width: 1280px) {
    .market-page-header .ec-site-nav {
      display: flex !important;
      flex: 0 1 auto !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 8px clamp(8px, 0.75vw, 16px) !important;
      min-width: 0;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
  /* Medium viewports: avoid squeezing the search field against the menu. */
  @media (min-width: 768px) and (max-width: 1279px) {
    .market-store.market-store-wide {
      --market-sidebar-sticky-top: 143px;
    }
    .market-store.market-store-wide > .market-page-header > .ec-site-inner {
      display: grid !important;
      grid-template-columns: max-content minmax(0, 1fr);
      grid-template-areas: "brand search" "nav nav";
      row-gap: 6px !important;
      padding-top: 9px;
      padding-bottom: 9px;
    }
    .market-page-header .ec-site-brand { grid-area: brand; }
    .market-page-header .market-header-search {
      grid-area: search;
      width: 100%;
      max-width: none;
    }
    .market-page-header .ec-site-nav {
      grid-area: nav;
      position: static !important;
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: flex-end !important;
      gap: 6px 13px !important;
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
  }
  /* An administrator has additional links. Give their menu its own row. */
  @media (min-width: 1280px) and (max-width: 1750px) {
    .market-store.market-store-wide {
      --market-sidebar-sticky-top: 143px;
    }
    .market-store.market-store-wide > .market-page-header--admin > .ec-site-inner {
      display: grid !important;
      grid-template-columns: max-content minmax(0, 1fr);
      grid-template-areas: "brand search" "nav nav";
      row-gap: 6px !important;
      padding-top: 9px;
      padding-bottom: 9px;
    }
    .market-page-header--admin .ec-site-brand { grid-area: brand; }
    .market-page-header--admin .market-header-search {
      grid-area: search;
      width: 100%;
      max-width: none;
    }
    .market-page-header--admin .ec-site-nav {
      grid-area: nav;
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: flex-end !important;
      width: 100% !important;
      margin: 0 !important;
    }
  }

  /* Category dropdown: exact tree/data used by the CategoriesPage sidebar. */
  .market-page-header { overflow: visible !important; }
  .market-page-header .ec-site-inner { overflow: visible !important; }
  .market-page-header .ec-site-nav { overflow: visible !important; }
  .market-page-header .market-header-category-menu {
    position: relative !important;
    display: flex !important;
    flex: 0 0 auto;
    align-items: center;
    min-width: 0;
  }
  .market-page-header .market-header-category-trigger {
    display: inline-flex !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
    line-height: 1.25 !important;
    letter-spacing: normal !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    min-height: 34px;
    width: auto !important;
    margin: 0 !important;
    padding: 6px 1px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: inherit !important;
    cursor: pointer;
    font: inherit;
    white-space: nowrap;
  }
  .market-page-header .market-header-category-trigger:hover,
  .market-page-header .market-header-category-trigger[aria-expanded="true"] { color: #8c2939 !important; }
  .market-page-header .market-header-category-trigger > svg {
    width: 14px; height: 14px; flex: 0 0 14px; transition: transform .2s ease;
  }
  .market-page-header .market-header-category-trigger[aria-expanded="true"] > svg { transform: rotate(180deg); }
  .market-page-header .market-header-category-panel {
    position: absolute !important;
    top: calc(100% + 11px) !important;
    left: 0 !important;
    z-index: 2500 !important;
    display: block !important;
    width: 296px !important;
    min-width: 0 !important;
    max-width: min(340px, calc(100vw - 32px)) !important;
    max-height: min(72vh, 650px) !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 1px solid #e8d4c6 !important;
    border-radius: 8px !important;
    background: #fff !important;
    box-shadow: 0 16px 35px rgba(49, 19, 23, .17) !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #bc9294 #fff7f2;
    box-sizing: border-box !important;
  }
  .market-page-header .market-header-category-panel::-webkit-scrollbar { width: 7px; }
  .market-page-header .market-header-category-panel::-webkit-scrollbar-thumb { background: #bc9294; border-radius: 8px; }
  .market-page-header .market-header-category-inner {
    padding: 16px 12px 20px !important;
    color: #362b33 !important;
    font-size: 12.5px;
    text-align: left;
  }
  .market-page-header .market-header-category-inner > h2 {
    margin: 2px 7px 12px !important;
    color: #51212b !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    line-height: 1.35 !important;
  }
  .market-page-header .market-header-category-all {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    min-height: 38px !important;
    padding: 8px 9px !important;
    margin: 0 0 5px !important;
    border-radius: 6px !important;
    background: #fff0ed !important;
    color: #812b35 !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
    text-decoration: none !important;
  }
  .market-page-header .market-header-category-all > span { font-size: 18px; line-height: 1; }
  .market-page-header .market-header-category-branch { width: 100%; min-width: 0; }
  .market-page-header .market-header-category-branch + .market-header-category-branch { margin-top: 3px; }
  .market-page-header .market-header-category-root-row {
    display: flex !important;
    align-items: center !important;
    gap: 3px !important;
    width: 100%; min-width: 0; min-height: 37px;
    border-radius: 5px;
  }
  .market-page-header .market-header-category-root-row:hover { background: #fff7f3; }
  .market-page-header .market-header-category-root {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 4px !important;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    padding: 7px 4px 7px 8px !important;
    margin: 0 !important;
    color: #344052 !important;
    background: transparent !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
    line-height: 1.4 !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
    text-decoration: none !important;
  }
  .market-page-header .market-header-category-root:hover,
  .market-page-header .market-header-category-root.is-selected { color: #8d2a3a !important; }
  .market-page-header .market-header-category-count {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 400;
    color: #8d777f;
    white-space: nowrap;
  }
  .market-page-header .market-header-category-expand {
    display: inline-flex !important;
    flex: 0 0 26px !important;
    align-items: center !important;
    justify-content: center !important;
    width: 26px !important;
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 5px !important;
    background: transparent !important;
    color: #752832 !important;
    box-shadow: none !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    cursor: pointer;
  }
  .market-page-header .market-header-category-expand:hover { background: #fcebe5 !important; }
  .market-page-header .market-header-category-children {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    margin: 1px 0 7px 9px !important;
    padding: 2px 0 5px 11px !important;
    border-left: 1px solid #ead0bd !important;
  }
  .market-page-header .market-header-category-children a {
    display: block !important;
    width: 100%;
    min-width: 0;
    padding: 6px 6px !important;
    margin: 0 !important;
    color: #674e52 !important;
    background: transparent !important;
    border: 0 !important;
    font-size: 12px !important;
    font-weight: 450 !important;
    line-height: 1.35 !important;
    white-space: normal !important;
    text-align: left !important;
    overflow-wrap: anywhere;
    text-decoration: none !important;
  }
  .market-page-header .market-header-category-children a:hover,
  .market-page-header .market-header-category-children a.is-selected { color: #8c2939 !important; background: #fff7f4 !important; }
  .market-page-header .market-header-category-grandchild { padding-left: 16px !important; }
  .market-page-header .market-header-category-product-list {
    display: flex !important;
    flex-direction: column !important;
    width: 100%; min-width: 0;
  }
  .market-page-header .market-header-category-product-list.is-scrollable {
    max-height: 420px;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #c49d9e #fff8f3;
  }
  .market-page-header .market-header-category-view-all {
    font-size: 11px !important;
    font-weight: 700 !important;
    color: #8d2638 !important;
  }
  .market-page-header .market-header-category-empty { padding: 6px 8px; font-size: 12px; color: #80666e; }
  @media (max-width: 1279px) {
    /* On narrow desktops the menu must stay inside the available viewport. */
    .market-page-header .market-header-category-panel { left: auto !important; right: 0 !important; }
  }
  @media (max-width: 767px) {
    .market-page-header .ec-site-nav.is-open { overflow-y: auto !important; }
    .market-page-header .market-header-category-menu {
      display: block !important; width: 100% !important;
    }
    .market-page-header .market-header-category-trigger {
      justify-content: space-between !important;
      width: 100% !important;
      padding: 10px 12px !important;
    }
    .market-page-header .market-header-category-panel {
      position: static !important;
      width: 100% !important;
      max-width: 100% !important;
      max-height: min(55vh, 460px) !important;
      margin: 2px 0 8px !important;
      box-shadow: none !important;
    }
  }
  @media (max-width: 767px) {
    .market-store.market-store-wide > .market-page-header > .ec-site-inner {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: "brand toggle" "search search" "nav nav";
      gap: 8px !important;
      padding-top: 10px;
      padding-bottom: 10px;
    }
    .market-page-header .ec-site-brand { grid-area: brand; }
    .market-page-header .ec-site-toggle {
      grid-area: toggle;
      display: inline-flex !important;
      justify-self: end;
      align-self: center;
    }
    .market-page-header .market-header-search {
      grid-area: search;
      width: 100%;
      max-width: none;
      min-width: 0;
      height: 42px;
    }
    .market-page-header .market-header-search input {
      padding-left: 10px;
      padding-right: 8px;
      font-size: 12px;
    }
    .market-page-header .market-header-search button {
      min-width: 80px;
      padding-left: 10px !important;
      padding-right: 10px !important;
      font-size: 12px;
    }
    .market-page-header .ec-site-nav {
      grid-area: nav;
      position: static !important;
      width: 100% !important;
      margin: 0 !important;
    }
    .market-page-header .ec-site-nav:not(.is-open) {
      display: none !important;
    }
    .market-page-header .ec-site-nav.is-open {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      max-height: 60dvh;
      overflow-y: auto;
      padding-block: 8px;
    }
  }
  /* HEADER CONTRAST AND ACTIVE UNDERLINE: on maroon all primary nav text
     must be ivory, never dark burgundy. Submenu remains dark on white. */
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:not(.ec-site-signup),
  .market-store.market-store-wide > .market-page-header .ec-site-nav > button,
  .market-store.market-store-wide > .market-page-header .ec-site-nav .market-header-category-menu > .market-header-category-trigger {
    position: relative !important;
    color: #fff9f5 !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
    letter-spacing: normal !important;
    line-height: 1.25 !important;
    text-decoration: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    text-shadow: none !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:not(.ec-site-signup):hover,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > button:hover,
  .market-store.market-store-wide > .market-page-header .ec-site-nav .market-header-category-trigger:hover,
  .market-store.market-store-wide > .market-page-header .ec-site-nav .market-header-category-trigger[aria-expanded="true"],
  .market-store.market-store-wide > .market-page-header .ec-site-nav .market-nav-current {
    /* Keep normal white text while indicating the active page below. */
    color: #fff9f5 !important;
    font-weight: 500 !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:not(.ec-site-signup)::after,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > button::after,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger::after {
    content: "" !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 2px !important;
    right: 2px !important;
    height: 2px !important;
    background: #f1c879 !important;
    border-radius: 2px !important;
    opacity: 1 !important;
    transform: scaleX(0) !important;
    transform-origin: center !important;
    transition: transform .18s ease !important;
    pointer-events: none !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:hover::after,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:focus-visible::after,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a.market-nav-current::after,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > button:hover::after,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger:hover::after,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger:focus-visible::after,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger[aria-expanded="true"]::after,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger.market-nav-current::after {
    transform: scaleX(1) !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a:focus-visible,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > button:focus-visible,
  .market-store.market-store-wide > .market-page-header .market-header-category-trigger:focus-visible {
    outline: 2px solid #f1c879 !important;
    outline-offset: 3px !important;
  }
  /* Do not apply underline to the filled Create Account button. */
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a.ec-site-signup {
    position: relative !important;
    padding: 8px 12px !important;
    background: #fff0dc !important;
    color: #661b29 !important;
    border-radius: 6px !important;
    font-weight: 800 !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a.ec-site-signup:hover,
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a.ec-site-signup.market-nav-current {
    background: #f6d5a4 !important; color: #511222 !important;
  }
  .market-store.market-store-wide > .market-page-header .ec-site-nav > a.ec-site-signup::after { display: none !important; }
  @media (max-width: 767px) {
    .market-store.market-store-wide > .market-page-header .ec-site-nav.is-open {
      background: #671727 !important;
    }
  }
`;

type CategoriesPageHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  roots: CatalogCategory[];
  productsByRoot: Map<string, CategoryProductEntry[]>;
  getKids: (id: string) => CatalogCategory[];
  activeRootId: string;
  selectedCategoryId?: string;
  loading: boolean;
};


/**
 * The header uses the exact same product index as CategoriesSidebar.
 * In particular, the number beside each main category counts its active
 * products (including those in child categories), NOT its child categories.
 */
function HeaderCategoriesMenu({
  roots,
  productsByRoot,
  getKids,
  activeRootId,
  selectedCategoryId,
  loading,
  onNavigate,
}: {
  roots: CatalogCategory[];
  productsByRoot: Map<string, CategoryProductEntry[]>;
  getKids: (id: string) => CatalogCategory[];
  activeRootId: string;
  selectedCategoryId?: string;
  loading: boolean;
  onNavigate: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const defaultExpandedId = activeRootId || roots[0]?.id || "";
  const navigateAndClose = () => { setOpen(false); onNavigate(); };

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="market-header-category-menu" ref={containerRef}>
      <button
        type="button"
        className={`market-header-category-trigger${location.pathname.startsWith("/categories") ? " market-nav-current" : ""}`}
        aria-current={location.pathname.startsWith("/categories") ? "page" : undefined}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="market-header-category-panel"
        aria-haspopup="true"
      >
        Shop Categories <FiChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div id="market-header-category-panel" className="market-header-category-panel" role="region" aria-label="Shop by Category">
          <div className="market-header-category-inner">
            <h2>Shop by Category</h2>
            <Link to="/categories" className="market-header-category-all" onClick={navigateAndClose}>
              All products <span aria-hidden="true">›</span>
            </Link>
            {roots.map(root => {
              const rootProducts = productsByRoot.get(root.id) || [];
              const isExpanded = expanded[root.id] ?? (root.id === defaultExpandedId);
              return (
                <div className="market-header-category-branch" key={root.id}>
                  <div className="market-header-category-root-row">
                    <Link
                      to={`/categories/${encodeURIComponent(root.slug)}`}
                      className={`market-header-category-root${activeRootId === root.id ? " is-selected" : ""}`}
                      onClick={navigateAndClose}
                    >
                      {root.name}
                      <small className="market-header-category-count">({rootProducts.length})</small>
                    </Link>
                    <button
                      className="market-header-category-expand"
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${root.name} products`}
                      onClick={() => setExpanded(previous => ({
                        ...previous,
                        [root.id]: !(previous[root.id] ?? (root.id === defaultExpandedId)),
                      }))}
                    >{isExpanded ? "−" : "+"}</button>
                  </div>
                  {isExpanded && (
                    <div className="market-header-category-children">
                      {getKids(root.id).map(child => (
                        <div key={child.id}>
                          <Link
                            to={`/categories/${encodeURIComponent(child.slug)}`}
                            className={selectedCategoryId === child.id ? "is-selected" : ""}
                            onClick={navigateAndClose}
                          >{child.name}</Link>
                          {getKids(child.id).map(grandchild => (
                            <Link
                              key={grandchild.id}
                              to={`/categories/${encodeURIComponent(grandchild.slug)}`}
                              className={`market-header-category-grandchild${selectedCategoryId === grandchild.id ? " is-selected" : ""}`}
                              onClick={navigateAndClose}
                            >{grandchild.name}</Link>
                          ))}
                        </div>
                      ))}
                      <div className={`market-header-category-product-list${rootProducts.length > 15 ? " is-scrollable" : ""}`}>
                        {rootProducts.map(({ item }) => (
                          <Link
                            key={item.id}
                            to={productDetailHref(item.id)}
                            title={item.name}
                            onClick={navigateAndClose}
                          >{item.name}</Link>
                        ))}
                      </div>
                      {rootProducts.length > 15 && (
                        <Link
                          className="market-header-category-view-all"
                          to={`/categories/${encodeURIComponent(root.slug)}`}
                          onClick={navigateAndClose}
                        >View all {rootProducts.length} products →</Link>
                      )}
                      {!rootProducts.length && !loading && <span className="market-header-category-empty">No products added yet</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && roots.length === 0 && <p className="market-header-category-empty">Loading categories…</p>}
            {!loading && roots.length === 0 && <p className="market-header-category-empty">No categories available.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesPageHeader({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  roots,
  productsByRoot,
  getKids,
  activeRootId,
  selectedCategoryId,
  loading,
}: CategoriesPageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActivePath = (path: string, nested = false) =>
    location.pathname === path || (nested && location.pathname.startsWith(`${path}/`));
  const activeClass = (path: string, nested = false) =>
    isActivePath(path, nested) ? "market-nav-current" : undefined;
  const [user, setUser] = useState<CategoriesHeaderUser | null>(null);
  const [csrf, setCsrf] = useState("");
  const [count, setCount] = useState(guestCartCount());
  const [newOrders, setNewOrders] = useState(0);
  const [supportCounts, setSupportCounts] = useState({ complaints: 0, enquiries: 0 });
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    let inFlight = false;
    let rerun = false;

    async function refresh() {
      if (!live) return;
      if (inFlight) { rerun = true; return; }
      inFlight = true;
      try {
        const response = await fetch(`${CATEGORIES_HEADER_BASE}/react/api/auth/session`, {
          credentials: "include", cache: "no-store",
        });
        if (!response.ok) throw new Error("Session unavailable");
        const session = (await response.json()) as CategoriesHeaderSession;
        if (!live) return;
        setUser(session.authenticated ? session.user || null : null);
        setCsrf(session.csrf_token || "");

        // Admin counters can load concurrently instead of making visitors wait
        // for two sequential admin requests. Customer cart count comes from
        // CategoriesPage's single cart synchronization request below.
        if (session.authenticated && session.user?.role === "admin") {
          await Promise.all([
            loadAdminOrders()
              .then(orders => { if (live) setNewOrders(orders.summary.new_count); })
              .catch(() => {}),
            fetch(`${CATEGORIES_HEADER_BASE}/react/api/admin/support/summary`, {
              credentials: "include", cache: "no-store",
            })
              .then(response => response.ok ? response.json() : null)
              .then(summary => {
                if (live && summary?.success) setSupportCounts({
                  complaints: Number(summary.open_complaints || 0),
                  enquiries: Number(summary.new_enquiries || 0),
                });
              })
              .catch(() => {}),
          ]);
        } else {
          setNewOrders(0);
          setSupportCounts(previous => previous.complaints || previous.enquiries
            ? { complaints: 0, enquiries: 0 } : previous);
        }
      } catch {
        // A transient session outage must not interrupt the search/navigation.
      } finally {
        inFlight = false;
        if (rerun && live) { rerun = false; void refresh(); }
      }
    }

    void refresh();
    // Refresh session/admin indicators only while the tab is visible; don't
    // turn every cart modification into 2-4 redundant network round trips.
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 60_000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const onCartSynced = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (typeof value === "number" && Number.isFinite(value)) setCount(value);
    };
    window.addEventListener(JWT_AUTH_CHANGED_EVENT, refresh);
    window.addEventListener(CATEGORIES_CART_SYNCED_EVENT, onCartSynced);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener(JWT_AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener(CATEGORIES_CART_SYNCED_EVENT, onCartSynced);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const close = () => setMobile(false);
  const logout = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${CATEGORIES_HEADER_BASE}/react/api/auth/logout`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ csrf_token: csrf }),
      });
      if (!r.ok) throw new Error("Logout failed");
      setUser(null);
      notifyJwtAuthChanged();
      navigate("/");
    } catch {
      window.location.href = "/react/login";
    } finally {
      setBusy(false);
      setMobile(false);
    }
  };
  const isAdmin = user?.role === "admin";
  return (
    <>
      <style>{CATEGORIES_LOCAL_HEADER_CSS}</style>
      <header className={`ec-site-header market-page-header${isAdmin ? " market-page-header--admin" : ""}`}>
        <div className="ec-site-inner">
          <Link to={isAdmin ? "/admin" : "/"} onClick={close} className="ec-site-brand">
            EasyFindStore
            <span>{isAdmin ? "ADMIN PORTAL" : ""}</span>
          </Link>
          {/* Search stays between the brand and Home navigation on desktop. */}
          <form className="market-header-search" role="search" onSubmit={event => {
            event.preventDefault();
            onSearchSubmit();
            close();
          }}>
            <label htmlFor="market-header-search-input" className="market-sr-only">Search products</label>
            <input
              id="market-header-search-input"
              name="q"
              type="search"
              value={searchValue}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search fashion, electronics, home essentials and more"
              autoComplete="off"
            />
            <button type="submit"><FiSearch aria-hidden="true" /><span className="market-search-button-text">Search</span></button>
          </form>
          <button className="ec-site-toggle" type="button" aria-expanded={mobile}
            aria-label="Toggle menu" aria-controls="categories-page-main-navigation"
            onClick={() => setMobile(v => !v)}>
            {mobile ? "✕" : "☰"}
          </button>
          <nav id="categories-page-main-navigation" aria-label="Main menu"
            className={`ec-site-nav ${mobile ? "is-open" : ""}`}>
            {isAdmin ? (
              <>
                <Link to="/admin" onClick={close} className={activeClass("/admin")}>Dashboard</Link>
                <Link to="/admin/orders" onClick={close} className={activeClass("/admin/orders", true)}>Orders {newOrders > 0 && <b className="ec-site-badge alert">{newOrders}</b>}</Link>
                <Link to="/admin/catalog" onClick={close} className={activeClass("/admin/catalog", true)}>Products</Link>
                <Link to="/admin/customers" onClick={close} className={activeClass("/admin/customers", true)}>Customers</Link>
                <Link to="/admin/complaints" onClick={close} className={activeClass("/admin/complaints", true)}>Complaints {supportCounts.complaints > 0 && <b className="ec-site-badge alert">{supportCounts.complaints}</b>}</Link>
                <Link to="/admin/enquiries" onClick={close} className={activeClass("/admin/enquiries", true)}>Enquiries {supportCounts.enquiries > 0 && <b className="ec-site-badge alert">{supportCounts.enquiries}</b>}</Link>
                <Link to="/admin/offers" onClick={close} className={activeClass("/admin/offers", true)}>Offers & Coupons</Link>
                <Link to="/admin/delivery-pricing" onClick={close} className={activeClass("/admin/delivery-pricing", true)}>Delivery Charges</Link>
                <Link to="/admin/service-areas" onClick={close} className={activeClass("/admin/service-areas", true)}>Service Areas</Link>
                <Link to="/admin/payment-transactions" onClick={close} className={activeClass("/admin/payment-transactions", true)}>Payments</Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={close} className={activeClass("/")}>Home</Link>
                <HeaderCategoriesMenu
                  roots={roots}
                  productsByRoot={productsByRoot}
                  getKids={getKids}
                  activeRootId={activeRootId}
                  selectedCategoryId={selectedCategoryId}
                  loading={loading}
                  onNavigate={close}
                />
                {user?.role === "user" && <Link to="/orders" onClick={close} className={activeClass("/orders", true)}>My Orders</Link>}
                <Link to="/store/cart" onClick={close} className={`ec-site-cart-link ${activeClass("/store/cart") ?? ""}`}>
                  <FiShoppingCart className="ec-site-cart-icon" aria-hidden="true" />
                  <span>Cart</span>
                  {count > 0 && <b className="ec-site-badge">{count}</b>}
                </Link>
                <Link to="/about-us" onClick={close} className={activeClass("/about-us")}>About Us</Link>
                <Link to="/contact-us" onClick={close} className={activeClass("/contact-us")}>Contact</Link>
              </>
            )}
            {user ? (
              <>
                <Link to={isAdmin ? "/admin/profile" : "/profile"} onClick={close}
                  className={`ec-site-user ${activeClass(isAdmin ? "/admin/profile" : "/profile") ?? ""}`} aria-label="My Profile">My Profile</Link>
                <button type="button" disabled={busy} onClick={() => void logout()}>
                  {busy ? "Signing out…" : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link to="/react/login" onClick={close} className={activeClass("/react/login")}>Login</Link>
                <Link className={`ec-site-signup ${activeClass("/store/register") ?? ""}`} to="/store/register" onClick={close}>Create Account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

const emojis:Record<string,string>={clothing:"👕",electronics:"🎧","home & kitchen":"🏠","beauty & personal care":"✨","sports & fitness":"🏃","books & stationery":"📚","toys & games":"🧸"};
const categoryIcon=(name:string)=>{
  const key=name.toLowerCase();
  if (/pooja|puja|diya|samagri|ritual|devotion|spiritual|rudraksha/.test(key)) return "🪔";
  if (/agarbatti|agabatti|dhoop|incense/.test(key)) return "🕯️";
  return emojis[key]||"🛍️";
};
// Use the same category imagery and professional fallback icons as HomePage.
function collectionIcon(name: string) {
  const value = name.toLowerCase();
  if (/cloth|shirt|fashion|dress|apparel|wear/.test(value)) return <FiShoppingBag />;
  if (/mobile|smartphone|cell phone/.test(value)) return <FiSmartphone />;
  if (/elect|computer|laptop|camera|television|tv/.test(value)) return <FiMonitor />;
  if (/jewel|ornament|necklace|ring|accessor/.test(value)) return <FiHeart />;
  if (/watch|clock/.test(value)) return <FiWatch />;
  if (/kitchen|home|decor|furniture|interior/.test(value)) return <FiHome />;
  if (/beauty|skin|hair|care|cosmetic|makeup/.test(value)) return <FiDroplet />;
  if (/sport|fitness|gym|exercise|outdoor/.test(value)) return <FiActivity />;
  if (/book|stationery|education|school/.test(value)) return <FiBookOpen />;
  if (/toy|game|gift|kids|children/.test(value)) return <FiGift />;
  if (/pooja|puja|samagri|ritual|diya|devotion|spiritual|rudraksha|agarbatti|dhoop|incense/.test(value)) return <FiSun />;
  if (/food|grocery|beverage|coffee|tea/.test(value)) return <FiCoffee />;
  return <FiPackage />;
}

import fashionRetailImage from "../assets/easyfind/men.jpg";
import electronicsRetailImage from "../assets/easyfind/electronics-category.jpg";
import homeRetailImage from "../assets/easyfind/home-category.jpg";
import beautyRetailImage from "../assets/easyfind/beauty.jpg";
import sportsRetailImage from "../assets/easyfind/sports.jpg";
import kidsRetailImage from "../assets/easyfind/kids.jpg";
import booksRetailImage from "../assets/easyfind/books.jpg";
import lifestyleRetailImage from "../assets/easyfind/women.jpg";
const retailCategoryImage = (name: string) => {
  const label = name.toLowerCase();
  if (/fashion|clothing|apparel|men|women/.test(label)) return fashionRetailImage;
  if (/electronic|computer|phone|gadget/.test(label)) return electronicsRetailImage;
  if (/home|kitchen|decor|furniture/.test(label)) return homeRetailImage;
  if (/beauty|personal|skin|cosmetic/.test(label)) return beautyRetailImage;
  if (/sport|fitness|outdoor/.test(label)) return sportsRetailImage;
  if (/kid|toy|game/.test(label)) return kidsRetailImage;
  if (/book|stationery/.test(label)) return booksRetailImage;
  return lifestyleRetailImage;
};
const CollectionMedia = memo(function CollectionMedia({ category }: { category: CatalogCategory }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [category.image_url]);
  return (
    <span className="market-collection-visual">
      {!failed ? (
        <img
          src={retailCategoryImage(category.name)}
          alt=""
          loading="lazy"
          decoding="async" onError={() => setFailed(true)}
        />
      ) : (
        <span className="market-collection-fallback" aria-hidden="true">
          {collectionIcon(category.name)}
        </span>
      )}
    </span>
  );
});

/** Four decorative pooja icons for the maroon collection banner. */
function PoojaPromoVisual() {
  return (
    <div className="market-promo-visual market-pooja-visual" aria-hidden="true">
      {/* Diya / oil lamp */}
      <div>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 9C36 18 30 22 30 31C30 38 34 42 40 42C46 42 50 38 50 31C50 23 44 18 40 9Z" fill="#F7B64E"/>
          <path d="M40 21C37 26 36 29 36 33C36 36 37.5 38 40 38C42.5 38 44 36 44 33C44 29 42.5 26 40 21Z" fill="#FFF3C8"/>
          <path d="M12 43C17 62 28 69 40 69C52 69 63 62 68 43H12Z" fill="#D89440" stroke="#FFE2A2" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M11 43Q40 54 69 43" stroke="#FFE2A2" strokeWidth="3" strokeLinecap="round"/>
          <path d="M25 68H55" stroke="#FFE2A2" strokeWidth="3" strokeLinecap="round"/>
          <path d="M31 59Q40 65 49 59" stroke="#9B552D" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Temple bell */}
      <div>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 9V21" stroke="#FFE6A3" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M28 12H52" stroke="#FFE6A3" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M40 21C28 21 24 31 24 43V51L17 59H63L56 51V43C56 31 52 21 40 21Z" fill="#D8A346" stroke="#FFE6A3" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M30 38C31 31 34 28 39 27" stroke="#FFF0C6" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M33 64C35 70 45 70 47 64" stroke="#FFE6A3" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M15 60H65" stroke="#FFE6A3" strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Puja kalash with leaves and coconut */}
      <div>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 12C31 18 32 28 40 33C48 28 49 18 40 12Z" fill="#B96E3A" stroke="#F4CB83" strokeWidth="2"/>
          <path d="M39 30C31 22 23 22 16 25C23 34 31 37 40 37" fill="#8DB66C" stroke="#E1EFB4" strokeWidth="1.5"/>
          <path d="M41 30C49 22 57 22 64 25C57 34 49 37 40 37" fill="#8DB66C" stroke="#E1EFB4" strokeWidth="1.5"/>
          <path d="M24 37H56L52 45C59 54 55 66 47 69H33C25 66 21 54 28 45L24 37Z" fill="#C88440" stroke="#FCE0A2" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M24 39H56" stroke="#FCE0A2" strokeWidth="3" strokeLinecap="round"/>
          <path d="M28 59Q40 68 52 59" stroke="#FCE0A2" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M32 72H48" stroke="#FCE0A2" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Lotus flower */}
      <div>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 14C32 24 30 34 40 49C50 34 48 24 40 14Z" fill="#F6B7B0" stroke="#FFE3D7" strokeWidth="2"/>
          <path d="M30 28C21 25 17 26 13 29C16 42 23 49 40 52C36 41 34 33 30 28Z" fill="#E68F9A" stroke="#FFD1D1" strokeWidth="2"/>
          <path d="M50 28C59 25 63 26 67 29C64 42 57 49 40 52C44 41 46 33 50 28Z" fill="#E68F9A" stroke="#FFD1D1" strokeWidth="2"/>
          <path d="M13 42C22 43 32 48 40 55C27 61 15 57 9 48L13 42Z" fill="#D77484" stroke="#FFD1D1" strokeWidth="2"/>
          <path d="M67 42C58 43 48 48 40 55C53 61 65 57 71 48L67 42Z" fill="#D77484" stroke="#FFD1D1" strokeWidth="2"/>
          <path d="M24 63Q40 69 56 63" stroke="#F8DAA6" strokeWidth="3" strokeLinecap="round"/>
          <path d="M40 61V71" stroke="#9BC38A" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

const linkTo=(c:CatalogCategory)=>`/categories/${encodeURIComponent(c.slug)}`;
type PublicProductOffer = {code:string; product_ids:string[];discount_type:string;discount_value:number;minimum_order_amount:number;applicable_to?:string};
const ProductTile = memo(function ProductTile({item,rootName,offer,quantity,onQuantityChange}:{item:CatalogItem;rootName:string;offer?:PublicProductOffer;quantity:number;onQuantityChange:(item:CatalogItem,quantity:number)=>Promise<void>}){
 const stock=Math.max(0,Math.floor(Number(item.stock_quantity)||0));
 const price=Number(item.price)||0;
 const mrp=Math.max(Number(item.compare_price)||0,Number(item.regular_price)||0,price);
 const discount=mrp>price?Math.round((mrp-price)*100/mrp):0;
 const money=(value:number)=>Math.round(value).toLocaleString("en-IN");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 // Render a category fallback only if there is no photo or the photo fails.
 // The previous unconditional emoji rendered a shopping-bag icon alongside
 // otherwise perfectly valid product images on mobile.
 const [imageFailed, setImageFailed] = useState(false);
 useEffect(() => setImageFailed(false), [item.image_url]);
 const showFallback = !item.image_url || imageFailed;
 const change=async(next:number)=>{if(busy)return;setBusy(true);setError("");
   try{await onQuantityChange(item,next)}catch(e){setError(e instanceof Error?e.message:"Unable to update cart")}
   finally{setBusy(false)}
 };
 return <article className="market-product market-amazon-card" data-product-id={item.id}>
  <Link to={productDetailHref(item.id)} className={`market-product-photo${showFallback ? " market-fallback" : " market-has-image"}`}>
   {showFallback ? (
     <span className="market-emoji" aria-hidden="true">{categoryIcon(rootName)}</span>
   ) : (
     <img src={item.image_url!} alt={item.name} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
   )}
   {item.is_featured?<span className="market-choice-badge">Featured</span>:null}
   {item.sku?.startsWith("DEMO-")?<small className="market-demo-tag">Demo</small>:null}
  </Link>
  <div className="market-product-content">
   <Link className="market-product-title" to={productDetailHref(item.id)}>{item.name}</Link>
   <div className="market-rating-placeholder" aria-label="No customer ratings yet"><span aria-hidden="true">☆☆☆☆☆</span> <small>No ratings yet</small></div>
   {discount>0?<div className="market-deal-line"><span className="market-deal-badge">{discount}% off</span> <span className="market-deal-caption">{item.sale_active?"Limited-time sale":"Special price"}</span></div>:null}
   <div className="market-price-line"><span className="market-rupee">₹</span><strong>{money(price)}</strong></div>
   {mrp>price?<div className="market-mrp">M.R.P.: <s>₹{money(mrp)}</s> <span>({discount}% off)</span></div>:null}
   {offer&&<div className="market-product-coupon">Coupon <strong>{offer.code}</strong> · {offer.discount_type==="fixed"?`₹${offer.discount_value}`:`${offer.discount_value}%`} extra off</div>}
   {item.variants?.length ? <div className="rv-card-colors" aria-label="Available product colors">
     {Array.from(new Map(item.variants.filter(v=>v.color).map(v=>[v.color!.toLowerCase(),v])).values()).map(v=><Link key={v.color} to={productDetailHref(item.id, v.id)} title={`${v.color} · from ₹${v.price}`} aria-label={`View ${v.color} color`}><span className="rv-color-dot" style={{backgroundColor:v.color || '#ddd'}} />{v.color}</Link>)}
   </div> : null}
   <p className="market-product-delivery">Estimated delivery <strong>{estimatedDelivery(item.delivery_days)}</strong></p>
   <p className="market-product-stock">{stock?`${stock} in stock`:"Out of stock"}</p>
   {item.variants?.length ? <Link className="market-tile-add" to={productDetailHref(item.id)}>Choose color / size</Link> : quantity>0?<div className="market-tile-qty" aria-label={`Cart quantity for ${item.name}`}><button type="button" aria-label={`Decrease ${item.name}`} disabled={busy} onClick={()=>void change(quantity-1)}>−</button><strong>{quantity}</strong><button type="button" aria-label={`Increase ${item.name}`} disabled={busy||quantity>=stock} onClick={()=>void change(quantity+1)}>+</button></div>:
    <button type="button" className="market-tile-add" disabled={busy||!stock} onClick={()=>void change(1)}>{busy?"Adding…":stock?"Add to Cart":"Out of Stock"}</button>}
   {error&&<small role="alert" className="market-tile-error">{error}</small>}
   <Link to={productDetailHref(item.id)} className="market-card-detail-link">View product details</Link>
  </div>
 </article>
});

type CategoryProductEntry = {
  item: CatalogItem;
  category: CatalogCategory;
  root: CatalogCategory;
  searchText: string;
};
type CategoriesSidebarProps = {
  mobileFiltersOpen: boolean;
  activeRoot: CatalogCategory | null;
  chosen: CatalogCategory | undefined;
  roots: CatalogCategory[];
  productsByRoot: Map<string, CategoryProductEntry[]>;
  defaultExpandedId: string;
  expandedRoots: Record<string, boolean>;
  toggleRoot: (id: string) => void;
  getKids: (id: string) => CatalogCategory[];
  availableGroups: string[];
  loading: boolean;
};

// Isolating this potentially long tree prevents each search keystroke or cart
// counter update from rebuilding hundreds of sidebar links.
const CategoriesSidebar = memo(function CategoriesSidebar({
  mobileFiltersOpen, activeRoot, chosen, roots, productsByRoot,
  defaultExpandedId, expandedRoots, toggleRoot, getKids,
  availableGroups, loading,
}: CategoriesSidebarProps) {
  return (
    <aside id="market-mobile-categories-sidebar"
      className={`market-sidebar${mobileFiltersOpen ? " market-sidebar--mobile-open" : ""}`}
      aria-label="Categories and subcategories">
    <h2>Shop by Category</h2><Link to="/categories" className={!chosen?"market-side-selected":""}>All products <span>›</span></Link>
    {roots.map(root => {
      const rootProducts = productsByRoot.get(root.id) || [];
      const expanded = expandedRoots[root.id] ?? (root.id === defaultExpandedId);
      return <div key={root.id} className="market-side-branch">
        <div className="market-side-root-row">
          <Link to={linkTo(root)} className={`market-side-root ${activeRoot?.id===root.id?"market-side-selected":""}`}>
            {root.name} <small className="market-side-count">({rootProducts.length})</small>
          </Link>
          <button type="button" className="market-side-expand" aria-expanded={expanded}
            aria-label={`${expanded?"Collapse":"Expand"} ${root.name} products`}
            onClick={() => toggleRoot(root.id)}>{expanded ? "−" : "+"}</button>
        </div>
        {expanded && <div className="market-side-list">
          {getKids(root.id).map(child => <div className="market-side-child" key={child.id}>
            <Link className={chosen?.id===child.id?"market-side-selected":""} to={linkTo(child)}>{child.name}</Link>
            {getKids(child.id).map(grand => <Link className="market-side-grand" key={grand.id} to={linkTo(grand)}>{grand.name}</Link>)}
          </div>)}
          <div
            className={`market-side-products${rootProducts.length > 15 ? " market-side-products--scrollable" : ""}`}
            role={rootProducts.length > 15 ? "region" : undefined}
            aria-label={rootProducts.length > 15 ? `${root.name} products — scroll for more` : undefined}
            tabIndex={rootProducts.length > 15 ? 0 : undefined}
          >
            {rootProducts.map(({item}) => <Link className="market-side-item-link"
              key={item.id} to={productDetailHref(item.id)} title={item.name}>{item.name}</Link>)}
          </div>
          {rootProducts.length > 15 && <Link className="market-side-view-all" to={linkTo(root)}>
            View all {rootProducts.length} products →
          </Link>}
          {!rootProducts.length && !loading && <span className="market-side-count">No products added yet</span>}
        </div>}
      </div>;
    })}
    {availableGroups.length>0&&<div className="market-side-extra"><h3>Product groups</h3>{availableGroups.map(x=><Link key={x} to={`${chosen?linkTo(chosen):"/categories"}?group=${encodeURIComponent(x)}`}>{x}</Link>)}</div>}
    <div className="market-side-help">Secure checkout<br/><small>Guest cart is saved on this browser until you sign in.</small></div>
   </aside>
  );
});

/**
 * Same horizontal gutter as the updated homepage/header.
 * Kept inside CategoriesPage.tsx, so marketplace.css can stay unchanged.
 * Scoped to this page only to avoid changing other shop screens.
 */
const CATEGORIES_PAGE_SPACING_CSS = `
  .market-store.market-store-wide {
    --market-page-gutter: clamp(18px, 2.4vw, 48px);
    width: 100%;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
    /* An overflow clipping ancestor disables position: sticky. */
    overflow: visible !important;
    --market-sidebar-sticky-top: 92px;
  }

  /* Override the old narrow centered containers. */
  .market-store.market-store-wide .market-top-inner,
  .market-store.market-store-wide .market-search-row,
  .market-store.market-store-wide .market-layout {
    width: 100% !important;
    max-width: none !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: var(--market-page-gutter) !important;
    padding-right: var(--market-page-gutter) !important;
    box-sizing: border-box;
  }

  /* Give the main product content all remaining space next to the sidebar. */
  .market-store.market-store-wide .market-main {
    min-width: 0;
    max-width: none !important;
    flex: 1 1 auto;
    box-sizing: border-box;
  }

  /* Inner content should not retain its own restrictive max width. */
  .market-store.market-store-wide .market-promo,
  .market-store.market-store-wide .market-quick-categories,
  .market-store.market-store-wide .market-section-title,
  .market-store.market-store-wide .market-grid {
    width: 100% !important;
    max-width: none !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box;
  }

  .market-store.market-store-wide .market-top-inner nav,
  .market-store.market-store-wide .market-grid > * {
    min-width: 0;
  }

  /* Keep the existing angled maroon tiles; use crisp pooja illustrations. */
  .market-store.market-store-wide .market-pooja-visual > div svg {
    display: block;
    width: clamp(52px, 5vw, 74px);
    height: clamp(52px, 5vw, 74px);
    max-width: 85%;
    max-height: 85%;
    margin: auto;
    flex-shrink: 0;
    filter: drop-shadow(0 3px 5px rgba(46, 7, 17, .16));
  }

  /* Category filter cards: visually match the homepage reference. */
  .market-store.market-store-wide .market-collection-section {
    width: 100%;
    max-width: none;
    min-width: 0;
    margin: 24px 0 28px;
    box-sizing: border-box;
  }

  .market-store.market-store-wide .market-collection-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .market-store.market-store-wide .market-collection-heading h2 {
    margin: 0;
    font-size: clamp(19px, 1.65vw, 25px);
    font-weight: 800;
    line-height: 1.3;
    color: #29191b;
  }

  .market-store.market-store-wide .market-collection-heading .market-collection-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #e8d2af;
    border-radius: 999px;
    padding: 8px 13px;
    background: #fffaf5;
    color: #7d202e;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
  }

  .market-store.market-store-wide .market-quick-categories {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 18px !important;
    align-items: stretch !important;
    overflow: visible !important;
    padding: 0 !important;
    background: transparent !important;
  }

  .market-store.market-store-wide .market-quick-categories > .market-collection-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 0 !important;
    width: 100% !important;
    min-height: 238px !important;
    margin: 0 !important;
    padding: 22px 15px !important;
    gap: 0 !important;
    border: 1px solid #ecd5a8 !important;
    border-radius: 16px !important;
    background: #fff !important;
    box-shadow: 0 4px 14px rgba(88, 50, 24, .025) !important;
    box-sizing: border-box !important;
    text-align: center !important;
    text-decoration: none !important;
    transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  }

  .market-store.market-store-wide .market-quick-categories > .market-collection-card:hover {
    border-color: #c89a53 !important;
    box-shadow: 0 9px 24px rgba(89, 41, 33, .09) !important;
    transform: translateY(-2px);
  }

  .market-store.market-store-wide .market-quick-categories > .market-collection-card:focus-visible {
    outline: 2px solid #8c2230;
    outline-offset: 3px;
  }

  .market-store.market-store-wide .market-quick-categories > .market-collection-card[aria-current="page"] {
    border-color: #852231 !important;
    background: #fffaf7 !important;
    box-shadow: 0 0 0 1px rgba(133, 34, 49, .08) !important;
  }

  .market-store.market-store-wide .market-collection-card .market-collection-visual {
    display: flex !important;
    flex: 0 0 94px !important;
    align-items: center !important;
    justify-content: center !important;
    width: 94px !important;
    height: 94px !important;
    min-width: 94px !important;
    min-height: 94px !important;
    margin: 0 auto 16px !important;
    padding: 0 !important;
    border: 1px solid #d5a24a !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    background: #fbf3e9 !important;
    box-sizing: border-box !important;
  }

  .market-store.market-store-wide .market-collection-visual > img {
    position: static !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;
    object-fit: cover !important;
    object-position: center !important;
    transform: none !important;
  }

  .market-store.market-store-wide .market-collection-fallback {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    background: #fbf3e9 !important;
    color: #7f2632 !important;
    font-size: initial !important;
  }

  .market-store.market-store-wide .market-collection-fallback svg {
    width: 40px;
    height: 40px;
    stroke-width: 1.6;
  }

  .market-store.market-store-wide .market-quick-categories .market-collection-name {
    display: block !important;
    width: 100% !important;
    margin: 0 0 13px !important;
    padding: 0 !important;
    color: #271b1c !important;
    font-size: 15px !important;
    font-weight: 800 !important;
    line-height: 1.4 !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
  }

  .market-store.market-store-wide .market-quick-categories .market-collection-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: #841b2a !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    line-height: 1.5 !important;
    white-space: nowrap !important;
  }

  .market-store.market-store-wide .market-collection-action svg {
    width: 13px;
    height: 13px;
  }
  .market-store.market-store-wide .market-collection-details {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    width: 100%;
  }

  @media (max-width: 1100px) {
    .market-store.market-store-wide .market-quick-categories {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 900px) {
    .market-store.market-store-wide .market-quick-categories {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 768px) {
    .market-store.market-store-wide { --market-page-gutter: 20px; }
    .market-store.market-store-wide .market-main { min-width: 0 !important; }
  }

  @media (max-width: 767px) {
    /* A single full-width category card (and product card) on mobile. */
    .market-store.market-store-wide .market-quick-categories,
    .market-store.market-store-wide .market-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .market-store.market-store-wide .market-quick-categories > .market-collection-card {
      min-height: 238px !important;
    }

    .market-store.market-store-wide .market-collection-section {
      margin-top: 18px;
      margin-bottom: 24px;
    }
  }

  @media (max-width: 480px) {
    .market-store.market-store-wide { --market-page-gutter: 16px; }
    .market-store.market-store-wide .market-quick-categories {
      gap: 14px !important;
    }
  }

  /* FIX: always reserve a real product area beside the sidebar. The old
     marketplace.css can otherwise leave the main panel outside the viewport. */
  .market-store.market-store-wide .market-layout {
    display: grid !important;
    grid-template-columns: minmax(215px, 252px) minmax(0, 1fr) !important;
    align-items: start !important;
    column-gap: clamp(16px, 2vw, 28px) !important;
    /* Let the document scroll. This container must not become a scrollport. */
    position: relative !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }
  /* Fixed-in-view sidebar: the PRODUCT page scrolls normally, while the
     entire category panel independently scrolls if multiple groups are open.
     Keep sticky (rather than position: fixed) to reserve its grid column. */
  .market-store.market-store-wide .market-sidebar {
    display: block !important;
    position: -webkit-sticky !important;
    position: sticky !important;
    top: var(--market-sidebar-sticky-top) !important;
    left: auto !important;
    align-self: start !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: fit-content !important;
    min-height: 0 !important;
    /* Keep the bottom of the sidebar inside the visible browser window. */
    max-height: calc(100vh - var(--market-sidebar-sticky-top) - 12px) !important;
    max-height: calc(100dvh - var(--market-sidebar-sticky-top) - 12px) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #b78e8c #fff7f2;
    scrollbar-gutter: stable;
    box-sizing: border-box !important;
    grid-column: 1;
    z-index: 2;
  }
  .market-store.market-store-wide .market-sidebar::-webkit-scrollbar {
    width: 7px;
  }
  .market-store.market-store-wide .market-sidebar::-webkit-scrollbar-track {
    border-radius: 8px;
    background: #fff7f2;
  }
  .market-store.market-store-wide .market-sidebar::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background: #b78e8c;
  }
  .market-store.market-store-wide .market-sidebar::-webkit-scrollbar-thumb:hover {
    background: #872b38;
  }
  .market-store.market-store-wide .market-main {
    display: block !important;
    visibility: visible !important;
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    grid-column: 2;
  }
  /* Desktop catalogue: four equally-sized product cards in every row. */
  .market-store.market-store-wide .market-grid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 16px !important;
    justify-content: stretch !important;
    align-items: stretch !important;
    min-width: 0 !important;
  }
  .market-store.market-store-wide .market-grid > .market-product {
    display: flex !important;
    flex-direction: column !important;
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .market-store.market-store-wide .market-product .market-product-content {
    min-width: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  /* Show the category's actual products beneath its name (up to 15 visible). */
  .market-store.market-store-wide .market-side-branch .market-side-root-row {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 3px;
  }
  .market-store.market-store-wide .market-side-root-row > .market-side-root {
    flex: 1 1 auto;
    min-width: 0;
  }
  .market-store.market-store-wide .market-side-expand {
    display: flex;
    flex: 0 0 28px;
    width: 28px;
    height: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    color: #76232e;
    background: transparent;
    cursor: pointer;
    font-size: 16px;
  }
  .market-store.market-store-wide .market-side-expand:hover {
    background: #fff1ea;
  }
  .market-store.market-store-wide .market-side-list {
    margin: 2px 0 8px 9px;
    padding: 1px 0 3px 12px;
    border-left: 1px solid #ead5ca;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
  }
  /* Product links are in their own scroll region, not the whole sidebar.
     Show up to 15 rows before scrolling. 15 or fewer have no scrollbar. */
  .market-store.market-store-wide .market-side-products {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .market-store.market-store-wide .market-side-products.market-side-products--scrollable {
    max-height: 420px; /* 15 products x 28px each, scroll to see the rest */
    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior-y: contain;
    scrollbar-width: thin;
    scrollbar-color: #c89a9e #fff8f5;
    padding-right: 3px;
  }
  .market-store.market-store-wide .market-side-products--scrollable::-webkit-scrollbar {
    width: 5px;
  }
  .market-store.market-store-wide .market-side-products--scrollable::-webkit-scrollbar-track {
    background: #fff8f5;
    border-radius: 8px;
  }
  .market-store.market-store-wide .market-side-products--scrollable::-webkit-scrollbar-thumb {
    background: #c89a9e;
    border-radius: 8px;
  }
  .market-store.market-store-wide .market-side-products--scrollable:focus-visible {
    outline: 2px solid #9b3542;
    outline-offset: 2px;
  }
  .market-store.market-store-wide .market-side-products > .market-side-item-link {
    display: block;
    flex: 0 0 28px;
    width: 100%;
    height: 28px;
    min-height: 28px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }
  .market-store.market-store-wide .market-side-list .market-side-item-link,
  .market-store.market-store-wide .market-side-list .market-side-view-all {
    display: block;
    padding: 4px 6px;
    border-radius: 5px;
    color: #654d4e;
    font-size: 12px;
    line-height: 1.4;
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .market-store.market-store-wide .market-side-list .market-side-item-link:hover,
  .market-store.market-store-wide .market-side-list .market-side-view-all:hover {
    color: #781c2b;
    background: #fff3ee;
  }
  .market-store.market-store-wide .market-side-list .market-side-view-all {
    color: #842032;
    font-weight: 750;
  }
  .market-store.market-store-wide .market-side-count {
    color: #8e7777;
    font-weight: 500;
    font-size: 11px;
  }
  .market-store.market-store-wide .market-results-summary {
    margin: 0 0 16px;
    color: #6c484b;
    font-size: 13px;
  }

  /* Compact displays still get a fully scrollable sidebar. */
  @media (min-width: 768px) and (max-height: 670px) {
    .market-store.market-store-wide .market-sidebar {
      --market-sidebar-sticky-top: 82px;
    }
  }

  /* Keep 4 cards on wide desktop, step down only on narrower screens. */
  @media (min-width: 1000px) and (max-width: 1199px) {
    .market-store.market-store-wide .market-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
  }
  @media (min-width: 768px) and (max-width: 999px) {
    .market-store.market-store-wide .market-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }
  @media (max-width: 767px) {
    .market-store.market-store-wide .market-layout {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 16px !important;
    }
    .market-store.market-store-wide .market-sidebar,
    .market-store.market-store-wide .market-main {
      grid-column: 1 !important;
      width: 100% !important;
    }
    /* On phones don't pin a tall menu over the product grid; keep the
       navigation above the products and let the menu itself scroll. */
    .market-store.market-store-wide .market-sidebar {
      position: relative !important;
      top: auto !important;
      height: fit-content !important;
      max-height: min(62dvh, 480px) !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
    .market-store.market-store-wide .market-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 14px !important;
    }
    .market-store.market-store-wide .market-product .market-product-photo {
      width: 100% !important;
      min-width: 0 !important;
    }
  }


  /* Hide the collection promotional banner only on mobile.
     Desktop/tablet presentation remains exactly as before. */
  @media (max-width: 767px) {
    .market-store.market-store-wide .market-promo {
      display: none !important;
    }
  }
`;


/**
 * Mobile-only polish for the self-contained Categories page.
 * This style is mounted AFTER the local header styles so the shared site's
 * desktop CSS cannot take precedence on small devices.
 */
const CATEGORIES_MOBILE_CSS = `
  .market-store.market-store-wide .market-mobile-filters-toggle { display: none; }
  /* Separate search lives immediately after the gold-bordered category strip.
     Desktop keeps the original search between the logo and navigation. */
  .market-store.market-store-wide > .market-mobile-search-row {
    display: none !important;
  }
  @media (max-width: 767px) {
    .market-store.market-store-wide {
      --market-page-gutter: clamp(12px, 4vw, 18px);
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    .market-store.market-store-wide > .market-page-header {
      position: sticky !important;
      top: 0 !important;
      z-index: 2500 !important;
      width: 100% !important;
      box-shadow: 0 2px 8px rgba(45, 9, 17, .13) !important;
    }
    .market-store.market-store-wide > .market-page-header > .ec-site-inner {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 44px !important;
      grid-template-areas: "brand toggle" !important;
      align-items: center !important;
      column-gap: 12px !important;
      row-gap: 0 !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 10px var(--market-page-gutter) 12px !important;
    }
    /* Hide the desktop search IN the header on phones. */
    .market-store.market-store-wide .market-page-header .market-header-search {
      display: none !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-brand {
      grid-area: brand !important;
      display: block !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
      font-size: clamp(22px, 6vw, 29px) !important;
      line-height: 1.05 !important;
      letter-spacing: -.035em !important;
      overflow-wrap: anywhere;
      text-decoration: none !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-brand span {
      display: block !important;
      margin-top: 3px !important;
      font-size: 9px !important;
      letter-spacing: .13em !important;
      line-height: 1.3 !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-toggle {
      grid-area: toggle !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      justify-self: end !important;
      width: 44px !important;
      height: 44px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 1px solid rgba(255,255,255,.35) !important;
      border-radius: 8px !important;
      background: rgba(255,255,255,.1) !important;
      color: #fff !important;
      font-size: 22px !important;
      cursor: pointer;
    }
    /* New position: BELOW the yellow category-strip divider, not inside header. */
    .market-store.market-store-wide > .market-mobile-search-row {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 12px var(--market-page-gutter) 14px !important;
      border-bottom: 1px solid #ecddc6 !important;
      background: #fffaf4 !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form {
      display: flex !important;
      align-items: stretch !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      height: 46px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 1px solid #dfc7a7 !important;
      border-radius: 7px !important;
      overflow: hidden !important;
      background: #fff !important;
      box-shadow: 0 1px 3px rgba(25, 8, 9, .06) !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form:focus-within {
      border-color: #cca25e !important;
      box-shadow: 0 0 0 2px rgba(204, 162, 94, .22) !important;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form input {
      display: block !important;
      flex: 1 1 0 !important;
      min-width: 0 !important;
      width: 0 !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 12px !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: none !important;
      background: #fff !important;
      color: #30272a !important;
      box-shadow: none !important;
      font: inherit !important;
      font-size: 12.5px !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form input::placeholder {
      color: #806d70 !important;
      opacity: 1;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form button {
      display: inline-flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      min-width: 86px !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 12px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #7a1d2c !important;
      color: white !important;
      font: inherit !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      cursor: pointer;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form button svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav {
      display: none !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open {
      position: absolute !important;
      top: calc(100% + 4px) !important;
      left: var(--market-page-gutter) !important;
      right: var(--market-page-gutter) !important;
      z-index: 20 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      gap: 0 !important;
      width: auto !important;
      min-width: 0 !important;
      max-height: min(68dvh, 540px) !important;
      margin: 0 !important;
      padding: 8px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      border: 1px solid #ead1bc !important;
      border-radius: 12px !important;
      background: #fffaf7 !important;
      box-shadow: 0 12px 30px rgba(41, 8, 14, .22) !important;
      scrollbar-width: thin;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open > * {
      min-width: 0 !important;
      width: 100% !important;
      flex-shrink: 0 !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open > a,
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open > button {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      min-height: 44px !important;
      padding: 10px 12px !important;
      color: #60232d !important;
      background: transparent !important;
      border: 0 !important;
      border-bottom: 1px solid #f3e7dd !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      text-align: left !important;
      text-decoration: none !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open > a:focus-visible,
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open > button:focus-visible {
      outline: 2px solid #aa8a55 !important;
      outline-offset: -2px !important;
    }
    .market-store.market-store-wide .market-page-header .ec-site-nav.is-open .ec-site-cart-icon {
      color: #7a1d2c !important;
    }
    /* One thin, horizontally swipeable category strip: never widen the page. */
    .market-store.market-store-wide .market-top-strip {
      width: 100% !important;
      max-width: 100% !important;
      overflow: hidden !important;
    }
    .market-store.market-store-wide .market-top-inner {
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 44px !important;
      max-width: 100% !important;
      padding: 0 var(--market-page-gutter) !important;
      margin: 0 !important;
    }
    .market-store.market-store-wide .market-top-inner .market-all,
    .market-store.market-store-wide .market-top-inner .market-top-cart {
      display: none !important;
    }
    .market-store.market-store-wide .market-top-inner nav {
      display: flex !important;
      flex: 1 1 auto !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 14px !important;
      min-width: 0 !important;
      width: 100% !important;
      height: 44px !important;
      max-width: 100% !important;
      padding: 0 0 2px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      white-space: nowrap !important;
      scrollbar-width: none;
    }
    .market-store.market-store-wide .market-top-inner nav::-webkit-scrollbar { display: none; }
    .market-store.market-store-wide .market-top-inner nav > a {
      display: inline-flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      height: 100% !important;
      min-height: 0 !important;
      padding: 0 2px !important;
      font-size: 12px !important;
      white-space: nowrap !important;
    }
    .market-store.market-store-wide .market-layout {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      align-items: start !important;
      gap: 12px !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      padding: 12px var(--market-page-gutter) 24px !important;
      overflow: visible !important;
    }
    .market-store.market-store-wide .market-mobile-filters-toggle {
      grid-column: 1 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 46px !important;
      margin: 0 !important;
      padding: 10px 12px !important;
      border: 1px solid #e6ceb4 !important;
      border-radius: 9px !important;
      background: #fffaf6 !important;
      color: #63202c !important;
      box-shadow: none !important;
      cursor: pointer;
      font: inherit;
      font-size: 13px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      text-align: left !important;
    }
    .market-store.market-store-wide .market-mobile-filter-label,
    .market-store.market-store-wide .market-mobile-filter-right {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      gap: 7px;
    }
    .market-store.market-store-wide .market-mobile-filter-label {
      flex: 0 0 auto;
    }
    .market-store.market-store-wide .market-mobile-filter-label svg { width: 17px; height: 17px; }
    .market-store.market-store-wide .market-mobile-filter-right {
      justify-content: flex-end;
      flex: 1 1 auto;
      font-size: 12px;
      font-weight: 500;
      color: #8b6770;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-mobile-filter-right > span {
      font-size: 18px;
      font-weight: 700;
      color: #772633;
    }
    .market-store.market-store-wide .market-sidebar {
      display: none !important;
      grid-column: 1 !important;
      position: relative !important;
      top: auto !important;
      left: auto !important;
      z-index: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-sidebar.market-sidebar--mobile-open {
      display: block !important;
      max-height: min(58dvh, 480px) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior-y: contain;
      scrollbar-width: thin;
    }
    .market-store.market-store-wide .market-main {
      display: block !important;
      grid-column: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    .market-store.market-store-wide .market-breadcrumb {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 4px 0 12px !important;
      font-size: 12px !important;
      overflow-wrap: anywhere;
    }
    /* Mobile collection hero: compact copy + four balanced square icon tiles. */
    .market-store.market-store-wide .market-promo {
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      aspect-ratio: auto !important;
      margin: 0 0 18px !important;
      padding: 20px 17px 19px !important;
      gap: 16px !important;
      overflow: hidden !important;
      border-radius: 12px !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-promo-content {
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
      transform: none !important;
    }
    .market-store.market-store-wide .market-promo-content > span {
      position: static !important;
      display: block !important;
      margin: 0 0 9px !important;
      font-size: 10px !important;
      font-weight: 750 !important;
      line-height: 1.4 !important;
      letter-spacing: .13em !important;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-promo-content h1 {
      width: 100% !important;
      margin: 0 0 9px !important;
      font-size: clamp(22px, 6.2vw, 27px) !important;
      line-height: 1.2 !important;
      letter-spacing: -.035em !important;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-promo-content p {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 0 15px !important;
      font-size: 12.5px !important;
      line-height: 1.5 !important;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-promo-content > a {
      position: relative !important;
      inset: auto !important;
      display: inline-flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 14px !important;
      width: auto !important;
      min-width: 0 !important;
      min-height: 42px !important;
      height: auto !important;
      margin: 0 !important;
      padding: 10px 17px !important;
      border-radius: 7px !important;
      font-size: 13px !important;
      font-weight: 750 !important;
      line-height: 1.2 !important;
      text-decoration: none !important;
      box-sizing: border-box !important;
      transform: none !important;
    }
    /* Reset inherited absolute positioning / scales: these caused the
       tall, skinny, misaligned icon cards on small screens. */
    .market-store.market-store-wide .market-promo-visual.market-pooja-visual {
      position: static !important;
      inset: auto !important;
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      grid-auto-rows: auto !important;
      flex: 0 0 auto !important;
      align-items: stretch !important;
      justify-content: stretch !important;
      gap: 9px !important;
      width: 100% !important;
      max-width: 336px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: transparent !important;
      transform: none !important;
      transform-origin: center !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-promo-visual.market-pooja-visual > div {
      position: static !important;
      inset: auto !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      aspect-ratio: 1 / 1 !important;
      margin: 0 !important;
      padding: 8px !important;
      border: 1px solid rgba(255, 231, 204, .3) !important;
      border-radius: 12px !important;
      background: rgba(255, 249, 238, .10) !important;
      box-shadow: none !important;
      transform: none !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-promo-visual.market-pooja-visual > div svg {
      position: static !important;
      display: block !important;
      flex: 0 1 auto !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 48px !important;
      max-height: 48px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: auto !important;
      transform: none !important;
      filter: none !important;
    }
    @media (max-width: 360px) {
      .market-store.market-store-wide .market-promo {
        padding: 18px 14px 17px !important;
        gap: 13px !important;
      }
      .market-store.market-store-wide .market-promo-visual.market-pooja-visual {
        gap: 7px !important;
      }
      .market-store.market-store-wide .market-promo-visual.market-pooja-visual > div {
        padding: 6px !important;
        border-radius: 10px !important;
      }
      .market-store.market-store-wide .market-promo-visual.market-pooja-visual > div svg {
        max-width: 42px !important;
        max-height: 42px !important;
      }
    }
    .market-store.market-store-wide .market-collection-section {
      width: 100% !important;
      min-width: 0 !important;
      margin: 16px 0 22px !important;
    }
    .market-store.market-store-wide .market-collection-heading {
      align-items: flex-start !important;
      gap: 10px !important;
      margin-bottom: 12px !important;
    }
    .market-store.market-store-wide .market-collection-heading h2 {
      font-size: 19px !important;
    }
    .market-store.market-store-wide .market-quick-categories {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 11px !important;
      width: 100% !important;
      padding: 0 !important;
    }
    .market-store.market-store-wide .market-quick-categories > .market-collection-card {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 14px !important;
      min-height: 110px !important;
      height: auto !important;
      width: 100% !important;
      padding: 13px !important;
      border-radius: 12px !important;
      text-align: left !important;
    }
    .market-store.market-store-wide .market-collection-card .market-collection-visual {
      display: flex !important;
      flex: 0 0 78px !important;
      width: 78px !important;
      height: 78px !important;
      min-width: 78px !important;
      min-height: 78px !important;
      margin: 0 !important;
    }
    .market-store.market-store-wide .market-collection-fallback svg {
      width: 34px !important;
      height: 34px !important;
    }
    .market-store.market-store-wide .market-collection-details {
      display: flex !important;
      flex: 1 1 auto !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      gap: 5px !important;
      width: auto !important;
      min-width: 0 !important;
      text-align: left !important;
    }
    .market-store.market-store-wide .market-quick-categories .market-collection-name {
      margin: 0 !important;
      font-size: 14px !important;
      line-height: 1.35 !important;
    }
    .market-store.market-store-wide .market-quick-categories .market-collection-action {
      white-space: normal !important;
      font-size: 12px !important;
    }
    .market-store.market-store-wide .market-section-title {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: flex-start !important;
      gap: 8px !important;
      margin: 18px 0 12px !important;
      scroll-margin-top: 145px;
    }
    .market-store.market-store-wide .market-section-title > div {
      min-width: 0 !important;
      width: 100% !important;
    }
    .market-store.market-store-wide .market-section-title h1 {
      margin: 5px 0 !important;
      font-size: clamp(21px, 5.5vw, 27px) !important;
      line-height: 1.25 !important;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-results-summary {
      margin: 0 0 13px !important;
      font-size: 12px !important;
    }
    /* Keep the complete desktop-style product card in a single mobile column. */
    .market-store.market-store-wide .market-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      grid-auto-flow: row !important;
      gap: 16px !important;
      width: 100% !important;
      min-width: 0 !important;
      padding: 0 !important;
      justify-items: stretch !important;
      align-items: start !important;
    }
    .market-store.market-store-wide .market-grid,
    .market-store.market-store-wide .market-grid > .market-product,
    .market-store.market-store-wide .market-grid > .market-product * {
      box-sizing: border-box;
    }
    .market-store.market-store-wide .market-grid > .market-product.market-amazon-card {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 1px solid #ead2ab !important;
      border-radius: 12px !important;
      background: #fff !important;
      box-shadow: none !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    /* Large, light-background, uncropped product photo, as in the reference. */
    .market-store.market-store-wide .market-grid > .market-product .market-product-photo {
      position: relative !important;
      display: flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: clamp(220px, 62vw, 280px) !important;
      min-height: 0 !important;
      max-height: none !important;
      aspect-ratio: auto !important;
      margin: 0 !important;
      padding: 14px 20px !important;
      overflow: hidden !important;
      background: #f8f8f8 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-photo img {
      position: static !important;
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
      margin: 0 !important;
      transform: none !important;
    }
    /* Valid product photographs must never share space with fallback icons. */
    .market-store.market-store-wide .market-grid > .market-product .market-product-photo.market-has-image .market-emoji {
      display: none !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-photo.market-fallback .market-emoji {
      position: static !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      inset: auto !important;
      margin: 0 !important;
      transform: none !important;
      font-size: 58px !important;
      opacity: 1 !important;
    }
    /* Prevent the old catalogue CSS from stretching the body artificially. */
    .market-store.market-store-wide .market-grid > .market-product .market-product-photo,
    .market-store.market-store-wide .market-grid > .market-product .market-product-content {
      overflow-x: hidden !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-content {
      display: flex !important;
      flex: 1 1 auto !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      gap: 7px !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 15px 15px 16px !important;
      background: #fff !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-title {
      display: block !important;
      width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 0 5px !important;
      padding: 0 !important;
      color: #241d20 !important;
      font-size: 15px !important;
      line-height: 1.4 !important;
      font-weight: 700 !important;
      text-decoration: none !important;
      overflow-wrap: anywhere;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-title {
      max-height: none !important;
      -webkit-line-clamp: unset !important;
      text-overflow: clip !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-rating-placeholder,
    .market-store.market-store-wide .market-grid > .market-product .market-deal-line,
    .market-store.market-store-wide .market-grid > .market-product .market-price-line,
    .market-store.market-store-wide .market-grid > .market-product .market-mrp,
    .market-store.market-store-wide .market-grid > .market-product .market-product-delivery,
    .market-store.market-store-wide .market-grid > .market-product .market-product-stock {
      width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      flex: 0 0 auto !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-rating-placeholder {
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      margin-bottom: 4px !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-price-line {
      display: flex !important;
      align-items: baseline !important;
      gap: 2px !important;
      line-height: 1.15 !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-price-line strong {
      font-size: 27px !important;
      line-height: 1.15 !important;
      font-weight: 500 !important;
      color: #431320 !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-delivery {
      margin-top: 5px !important;
      line-height: 1.5 !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-product-stock {
      margin-bottom: 3px !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-tile-add,
    .market-store.market-store-wide .market-grid > .market-product .market-tile-qty {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      min-height: 44px !important;
      height: auto !important;
      margin: 0 !important;
      padding: 10px 16px !important;
      border-radius: 999px !important;
      box-sizing: border-box !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-tile-add {
      background: #771e2e !important;
      border: 1px solid #771e2e !important;
      color: #fff !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      text-align: center !important;
      text-decoration: none !important;
    }
    .market-store.market-store-wide .market-grid > .market-product .market-card-detail-link {
      display: inline-block !important;
      align-self: flex-start !important;
      margin: 3px 0 0 !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .market-store.market-store-wide .market-load-more {
      width: 100% !important;
      min-height: 44px !important;
      margin: 18px 0 0 !important;
    }
  }
  @media (max-width: 370px) {
    .market-store.market-store-wide > .market-mobile-search-row .market-search-button-text {
      display: none !important;
    }
    .market-store.market-store-wide > .market-mobile-search-row .market-mobile-search-form button {
      min-width: 48px !important;
      width: 48px !important;
      padding: 0 !important;
    }
    .market-store.market-store-wide .market-mobile-filter-right { font-size: 11px; }
    .market-store.market-store-wide .market-collection-card .market-collection-visual {
      flex-basis: 68px !important;
      width: 68px !important;
      height: 68px !important;
      min-width: 68px !important;
      min-height: 68px !important;
    }
  }
`;


/**
 * Compact, circular category carousel on both desktop and mobile.
 * This block comes after the legacy layout styles so it wins their overrides.
 */
const CATEGORIES_SHOWCASE_CSS = `
  .market-store.market-store-wide .market-collection-section {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 22px 0 26px !important;
    padding: 0 !important;
  }
  .market-store.market-store-wide .market-collections-carousel {
    display: grid !important;
    grid-template-columns: 28px minmax(0, 1fr) 28px !important;
    gap: 10px !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }
  .market-store.market-store-wide .market-collections-carousel > .market-collection-arrow {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    align-self: center !important;
    width: 28px !important;
    min-width: 28px !important;
    height: 40px !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 7px !important;
    background: transparent !important;
    color: #392427 !important;
    box-shadow: none !important;
    cursor: pointer;
  }
  .market-store.market-store-wide .market-collection-arrow svg {
    width: 20px !important;
    height: 20px !important;
    stroke-width: 1.8;
  }
  .market-store.market-store-wide .market-collection-arrow:not(:disabled):hover {
    background: #f9eee9 !important;
    color: #852331 !important;
  }
  .market-store.market-store-wide .market-collection-arrow:disabled {
    opacity: .27 !important;
    cursor: default;
  }
  .market-store.market-store-wide .market-collection-arrow:focus-visible {
    outline: 2px solid #9c313b !important;
    outline-offset: 2px;
  }
  .market-store.market-store-wide .market-collections-carousel > .market-quick-categories {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    grid-template-columns: none !important;
    gap: 14px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 3px 0 5px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scroll-snap-type: x mandatory !important;
    scroll-behavior: smooth !important;
    overscroll-behavior-x: contain;
    scrollbar-width: none !important;
    -webkit-overflow-scrolling: touch;
    box-sizing: border-box !important;
  }
  .market-store.market-store-wide .market-collections-carousel > .market-quick-categories::-webkit-scrollbar {
    display: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-quick-categories > .market-collection-card {
    display: flex !important;
    flex: 0 0 124px !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 0 !important;
    width: 124px !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    text-decoration: none !important;
    text-align: center !important;
    scroll-snap-align: start !important;
    transform: none !important;
    box-sizing: border-box !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-quick-categories > .market-collection-card:hover,
  .market-store.market-store-wide .market-collections-carousel .market-quick-categories > .market-collection-card[aria-current="page"] {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
  }
  /* The image container itself is the circle: no rectangular backplate. */
  .market-store.market-store-wide .market-collections-carousel .market-collection-card .market-collection-visual {
    position: relative !important;
    display: flex !important;
    flex: 0 0 102px !important;
    align-items: center !important;
    justify-content: center !important;
    width: 102px !important;
    min-width: 102px !important;
    height: 102px !important;
    min-height: 102px !important;
    max-width: 102px !important;
    max-height: 102px !important;
    aspect-ratio: 1 / 1 !important;
    margin: 0 auto 9px !important;
    padding: 0 !important;
    overflow: hidden !important;
    border: 1px solid #e6c68c !important;
    border-radius: 50% !important;
    background: #faf3e9 !important;
    box-sizing: border-box !important;
    transform: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-visual > img {
    position: static !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;
    object-fit: cover !important;
    object-position: center center !important;
    transform: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-fallback {
    position: static !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;
    background: #fbf3e9 !important;
    color: #812634 !important;
    box-shadow: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-fallback svg {
    width: 38px !important;
    height: 38px !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-details {
    position: static !important;
    display: flex !important;
    flex: 0 0 auto !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    padding: 0 2px !important;
    margin: 0 !important;
    text-align: center !important;
    transform: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-quick-categories .market-collection-name {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    color: #27191c !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1.35 !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-action {
    display: none !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-card:hover .market-collection-name,
  .market-store.market-store-wide .market-collections-carousel .market-collection-card[aria-current="page"] .market-collection-name {
    color: #802333 !important;
  }
  .market-store.market-store-wide .market-collections-carousel .market-collection-card[aria-current="page"] .market-collection-visual {
    outline: 2px solid #9b2b41 !important;
    outline-offset: 2px !important;
  }
  @media (min-width: 768px) and (max-width: 1100px) {
    .market-store.market-store-wide .market-collections-carousel .market-quick-categories > .market-collection-card {
      flex-basis: 110px !important;
      width: 110px !important;
    }
    .market-store.market-store-wide .market-collections-carousel .market-collection-card .market-collection-visual {
      flex-basis: 90px !important;
      width: 90px !important;
      min-width: 90px !important;
      height: 90px !important;
      min-height: 90px !important;
      max-width: 90px !important;
      max-height: 90px !important;
    }
  }
  @media (max-width: 767px) {
    .market-store.market-store-wide .market-collection-section {
      margin-top: 15px !important;
      margin-bottom: 20px !important;
    }
    .market-store.market-store-wide .market-collections-carousel {
      grid-template-columns: 18px minmax(0, 1fr) 18px !important;
      gap: 4px !important;
    }
    .market-store.market-store-wide .market-collections-carousel > .market-collection-arrow {
      width: 18px !important;
      min-width: 18px !important;
      height: 32px !important;
    }
    .market-store.market-store-wide .market-collection-arrow svg {
      width: 17px !important;
      height: 17px !important;
    }
    .market-store.market-store-wide .market-collections-carousel > .market-quick-categories {
      gap: 9px !important;
      padding-bottom: 3px !important;
    }
    .market-store.market-store-wide .market-collections-carousel .market-quick-categories > .market-collection-card {
      flex: 0 0 88px !important;
      width: 88px !important;
      min-height: 0 !important;
      padding: 0 !important;
      flex-direction: column !important;
    }
    .market-store.market-store-wide .market-collections-carousel .market-collection-card .market-collection-visual {
      flex: 0 0 72px !important;
      width: 72px !important;
      min-width: 72px !important;
      height: 72px !important;
      min-height: 72px !important;
      max-width: 72px !important;
      max-height: 72px !important;
      margin: 0 auto 7px !important;
      border-radius: 50% !important;
    }
    .market-store.market-store-wide .market-collections-carousel .market-quick-categories .market-collection-name {
      font-size: 11px !important;
      line-height: 1.3 !important;
      text-align: center !important;
    }
    .market-store.market-store-wide .market-collections-carousel .market-collection-fallback svg {
      width: 28px !important;
      height: 28px !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .market-store.market-store-wide .market-collections-carousel > .market-quick-categories {
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * Sticky, swipeable category navigation on phones only.
 * It sits directly BELOW the page's sticky logo/header and ABOVE the search.
 * The header height is measured at runtime, so it works at all mobile widths.
 * On desktop the original navigation behavior is unchanged.
 */
const CATEGORIES_MOBILE_STICKY_CATEGORY_CSS = `
  @media (max-width: 767px) {
    .market-store.market-store-wide > .market-top-strip {
      position: -webkit-sticky !important;
      position: sticky !important;
      top: var(--market-mobile-header-height, 72px) !important;
      z-index: 2400 !important;
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      /* Keep the original maroon/gold design and horizontal category scrolling. */
      overflow: hidden !important;
      box-shadow: 0 2px 8px rgba(51, 15, 25, 0.12);
    }
    .market-store.market-store-wide > .market-top-strip .market-top-inner nav {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
    }
    .market-store.market-store-wide #market-products {
      scroll-margin-top: calc(var(--market-mobile-header-height, 72px) + 58px);
    }
  }
`;

/**
 * DESKTOP: keep the maroon horizontal category strip visible during scrolling,
 * immediately beneath the existing sticky logo/header. The values are measured
 * by ResizeObserver in CategoriesPage, including when the header wraps.
 * Does not change the mobile sticky behavior.
 */
const CATEGORIES_DESKTOP_STICKY_CATEGORY_CSS = `
  @media (min-width: 768px) {
    .market-store.market-store-wide {
      /* The sidebar must sit below BOTH sticky bars, not behind them. */
      --market-sidebar-sticky-top: calc(
        var(--market-sticky-header-height, 78px) +
        var(--market-sticky-strip-height, 52px) + 12px
      );
    }
    .market-store.market-store-wide > .market-page-header {
      position: -webkit-sticky !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 2600 !important;
    }
    .market-store.market-store-wide > .market-top-strip {
      position: -webkit-sticky !important;
      position: sticky !important;
      top: var(--market-sticky-header-height, 78px) !important;
      z-index: 2400 !important;
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      /* Original maroon/gold theme and existing links remain unchanged. */
      background-color: #751f2b;
      box-shadow: 0 3px 10px rgba(42, 12, 19, 0.12);
    }
    .market-store.market-store-wide #market-products {
      scroll-margin-top: calc(
        var(--market-sticky-header-height, 78px) +
        var(--market-sticky-strip-height, 52px) + 16px
      );
    }
  }
`;

/**
 * Final fallback: the promo is not rendered on mobile. Also keep CSS protection
 * for viewport changes before React processes the media-query update.
 * This override comes LAST to avoid the previous equal-specificity CSS conflict.
 */
const CATEGORIES_DESKTOP_PROMO_ONLY_CSS = `
  @media (max-width: 767px) {
    .market-store.market-store-wide .market-main > section.market-promo {
      display: none !important;
    }
  }
`;

/**
 * Final scoped product-card override.
 * The shared marketplace stylesheet gives parts of the card a flex-grow,
 * minimum height or auto margins, which can push the ratings far away from
 * the title on desktop. Keep all product metadata in normal top-to-bottom
 * flow while retaining the existing image, discount and cart controls.
 */
const CATEGORIES_PRODUCT_CARD_GAP_FIX_CSS = `
  .market-store.market-store-wide .market-grid > .market-product.market-amazon-card {
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    min-height: 0 !important;
    height: auto !important;
  }

  .market-store.market-store-wide .market-grid > .market-product.market-amazon-card > .market-product-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    align-content: start !important;
    flex: 0 0 auto !important;
    gap: 6px !important;
    width: 100% !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 12px 13px 14px !important;
    box-sizing: border-box !important;
  }

  /* Neither the product title nor the rating row should grow to occupy
     leftover card height, or inherit margin-top:auto from marketplace.css. */
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-title,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-rating-placeholder {
    position: static !important;
    display: block !important;
    flex: 0 0 auto !important;
    align-self: stretch !important;
    order: initial !important;
    width: 100% !important;
    min-height: 0 !important;
    max-height: none !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-title {
    line-height: 1.35 !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-rating-placeholder {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    line-height: 1.3 !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-deal-line,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-price-line,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-mrp,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-delivery,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-stock,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-coupon,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .rv-card-colors {
    flex: 0 0 auto !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-deal-line {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 6px !important;
    margin-top: 3px !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-price-line {
    display: flex !important;
    align-items: baseline !important;
    gap: 2px !important;
    line-height: 1.1 !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-product-delivery {
    margin-top: 5px !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-tile-add,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-tile-qty,
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-card-detail-link {
    flex-grow: 0 !important;
    flex-shrink: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  .market-store.market-store-wide .market-grid > .market-product .market-product-content > .market-card-detail-link {
    margin-top: 3px !important;
  }
  @media (max-width: 767px) {
    .market-store.market-store-wide .market-grid > .market-product.market-amazon-card > .market-product-content {
      padding: 13px 14px 15px !important;
      gap: 7px !important;
    }
  }
`;

// Keep legacy helpers available for compatibility without rendering another navbar.
void CategoriesPageHeader;
void PoojaPromoVisual;

export function CategoriesPage(){
 // Used to measure/position both sticky category bars under the page header.
 const categoriesPageRef = useRef<HTMLDivElement>(null);
 const {slug}=useParams();const location=useLocation(),navigate=useNavigate();
 const q=new URLSearchParams(location.search).get("q")?.trim().toLowerCase()||"";
 const group=new URLSearchParams(location.search).get("group")?.trim().toLowerCase()||"";
 const [offers,setOffers]=useState<PublicProductOffer[]>([]);
 // Keep expansion state for each category separately so opening another
 // category never collapses the products that are already visible.
 const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
 const collectionRailRef = useRef<HTMLDivElement>(null);
 const [categoryRailPosition, setCategoryRailPosition] = useState({ atStart: true, atEnd: true });
 const railFrameRef = useRef<number | null>(null);
 const updateCategoryRailPosition = useCallback(() => {
   if (railFrameRef.current !== null) return;
   railFrameRef.current = window.requestAnimationFrame(() => {
     railFrameRef.current = null;
     const rail = collectionRailRef.current;
     if (!rail) return;
     const maximumScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
     const next = {
       atStart: rail.scrollLeft <= 2,
       atEnd: rail.scrollLeft >= maximumScroll - 2,
     };
     setCategoryRailPosition(current =>
       current.atStart === next.atStart && current.atEnd === next.atEnd ? current : next
     );
   });
 }, []);
 const scrollCategoryRail = (direction: -1 | 1) => {
   const rail = collectionRailRef.current;
   if (!rail) return;
   const firstCard = rail.querySelector<HTMLElement>(".market-collection-card");
   const cardWidth = firstCard?.getBoundingClientRect().width || 180;
   const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 14;
   const visibleCount = Math.max(1, Math.floor((rail.clientWidth + gap) / (cardWidth + gap)));
   rail.scrollBy({ left: direction * Math.max(1, visibleCount - 1) * (cardWidth + gap), behavior: "smooth" });
 };

 // The promotional banner should exist on desktop only.
 // Track the actual viewport, so it also updates when the window is resized.
 const [isMobileViewport, setIsMobileViewport] = useState(() =>
   typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
 );
 useEffect(() => {
   const mobileQuery = window.matchMedia("(max-width: 767px)");
   const syncViewport = () => setIsMobileViewport(mobileQuery.matches);
   syncViewport();
   mobileQuery.addEventListener("change", syncViewport);
   return () => mobileQuery.removeEventListener("change", syncViewport);
 }, []);

 const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
 const [categories,setCategories]=useState<CatalogCategory[]>(() => lastCatalogSnapshot?.data || []),[loading,setLoading]=useState(() => !lastCatalogSnapshot),[error,setError]=useState(""),[query,setQuery]=useState(q),[viewCount,setViewCount]=useState(24);
 const [guestQuantities,setGuestQuantities]=useState<Record<string,number>>({}),[accountQuantities,setAccountQuantities]=useState<Record<string,number>>({});
 const [auth,setAuth]=useState<{authenticated:boolean;csrf_token:string;user?:{role:string}}>({authenticated:false,csrf_token:""});
 const cartAuthRef = useRef(auth);
 const guestQuantitiesRef = useRef(guestQuantities);
 const accountQuantitiesRef = useRef(accountQuantities);
 cartAuthRef.current = auth;
 guestQuantitiesRef.current = guestQuantities;
 accountQuantitiesRef.current = accountQuantities;
 // Measure both sticky bars. A responsive/admin header can wrap, so a
 // fixed pixel top offset causes the desktop category strip to overlap it.
 // Keep the existing mobile custom property for backward compatibility.
 useEffect(() => {
   const root = categoriesPageRef.current;
   const header = root?.querySelector<HTMLElement>(".market-page-header");
   const strip = root?.querySelector<HTMLElement>(".market-top-strip");
   if (!root || !header) return;

   const updateStickyOffsets = () => {
     const headerHeight = Math.ceil(header.getBoundingClientRect().height);
     root.style.setProperty("--market-mobile-header-height", `${headerHeight}px`);
     root.style.setProperty("--market-sticky-header-height", `${headerHeight}px`);
     if (strip) {
       const stripHeight = Math.ceil(strip.getBoundingClientRect().height);
       root.style.setProperty("--market-sticky-strip-height", `${stripHeight}px`);
     }
   };

   updateStickyOffsets();
   const observer = typeof ResizeObserver !== "undefined"
     ? new ResizeObserver(updateStickyOffsets)
     : null;
   observer?.observe(header);
   if (strip) observer?.observe(strip);
   window.addEventListener("resize", updateStickyOffsets);
   return () => {
     observer?.disconnect();
     window.removeEventListener("resize", updateStickyOffsets);
   };
 }, []);
 // A short-lived in-memory snapshot makes back/forward navigation instant.
 // Fresh catalogue data is still requested as soon as the snapshot expires.
 useEffect(() => {
   let live = true;
   const snapshot = lastCatalogSnapshot;
   if (snapshot) {
     setCategories(snapshot.data);
     setLoading(false);
     if (Date.now() - snapshot.loadedAt < CATALOG_CACHE_WINDOW_MS) {
       return () => { live = false; };
     }
   }
   void loadCatalogShared()
     .then(data => { if (live) { setCategories(data); setError(""); } })
     .catch(error => {
       if (live && !snapshot) setError(error instanceof Error ? error.message : "Could not load catalogue");
     })
     .finally(() => { if (live) setLoading(false); });
   return () => { live = false; };
 }, []);
 useEffect(() => {
   const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
   const controller = new AbortController();
   void fetch(`${base}/react/api/store/product-offers`, { cache: "no-store", signal: controller.signal })
     .then(response => response.ok ? response.json() : {})
     .then(data => { if (!controller.signal.aborted && Array.isArray(data.offers)) setOffers(data.offers); })
     .catch(() => {});
   return () => controller.abort();
 }, []);
 useEffect(() => { setQuery(q); setViewCount(24); setMobileFiltersOpen(false); }, [slug, q, group]);

 // One authenticated cart GET per cart event, not a session lookup + cart
 // lookup in the page AND another session lookup + count GET in the header.
 useEffect(() => {
   let live = true;
   let authGeneration = 0;
   let cartGeneration = 0;

   async function syncCart(session = cartAuthRef.current) {
     const generation = ++cartGeneration;
     const guest = readGuestCart();
     const local = Object.fromEntries(guest.map(line => [line.itemId, line.quantity])) as Record<string, number>;
     const guestTotal = guest.reduce((sum, line) => sum + line.quantity, 0);
     if (!live) return;
     guestQuantitiesRef.current = local;
     setGuestQuantities(previous => quantitiesEqual(previous, local) ? previous : local);

     if (session.authenticated && session.user?.role === "user") {
       try {
         const result = await getCart();
         if (!live || generation !== cartGeneration) return;
         const lines = (result.items || []);
         const remote = Object.fromEntries(lines.map(line => [line.item_id, line.quantity])) as Record<string, number>;
         accountQuantitiesRef.current = remote;
         setAccountQuantities(previous => quantitiesEqual(previous, remote) ? previous : remote);
         const total = guestTotal + lines.reduce((sum, line) => sum + line.quantity, 0);
         publishCategoryCartCount(total);
       } catch {
         if (!live || generation !== cartGeneration) return;
         accountQuantitiesRef.current = {};
         setAccountQuantities(previous => Object.keys(previous).length ? {} : previous);
         publishCategoryCartCount(guestTotal);
       }
     } else {
       accountQuantitiesRef.current = {};
       setAccountQuantities(previous => Object.keys(previous).length ? {} : previous);
       publishCategoryCartCount(guestTotal);
     }
   }

   async function refreshAuth() {
     const generation = ++authGeneration;
     try {
       const session = await currentSession();
       if (!live || generation !== authGeneration) return;
       cartAuthRef.current = session;
       setAuth(session);
       await syncCart(session);
     } catch {
       if (live && generation === authGeneration) void syncCart();
     }
   }

   void refreshAuth();
   const onCartChanged = () => { void syncCart(); };
   const onAuthChanged = () => { void refreshAuth(); };
   const onOtherTabChanged = () => { void refreshAuth(); };
   window.addEventListener("cart-updated", onCartChanged);
   window.addEventListener(JWT_AUTH_CHANGED_EVENT, onAuthChanged);
   window.addEventListener("storage", onOtherTabChanged);
   return () => {
     live = false;
     window.removeEventListener("cart-updated", onCartChanged);
     window.removeEventListener(JWT_AUTH_CHANGED_EVENT, onAuthChanged);
     window.removeEventListener("storage", onOtherTabChanged);
   };
 }, []);

 // Stable callback: changing one product never forces every ProductTile to
 // render again. Mutable refs always expose the latest auth/cart quantities.
 const changeCart = useCallback(async (item: CatalogItem, requested: number) => {
   const stock = Math.max(0, Math.floor(Number(item.stock_quantity) || 0));
   const next = Math.max(0, Math.min(stock, requested));
   const auth = cartAuthRef.current;
   if (auth.authenticated && auth.user?.role !== "user") {
     throw new Error("Please shop using a customer account.");
   }
   if (auth.authenticated) {
     const stored = guestQuantitiesRef.current[item.id] || 0;
     const server = accountQuantitiesRef.current[item.id] || 0;
     if (stored && next >= server) {
       setGuestQuantity(item.id, next - server, stock);
     } else {
       if (!next && server) await removeCartItem(item.id, auth.csrf_token);
       else if (next && !server) await addCartItem(item.id, next, auth.csrf_token);
       else if (next) await updateCartItem(item.id, { action: "set", quantity: next }, auth.csrf_token);
       if (stored) setGuestQuantity(item.id, 0, stock);
       window.dispatchEvent(new Event("cart-updated"));
     }
   } else {
     setGuestQuantity(item.id, next, stock);
   }
 }, []);

 useEffect(() => {
   const rail = collectionRailRef.current;
   if (!rail) return;
   const frame = window.requestAnimationFrame(updateCategoryRailPosition);
   window.addEventListener("resize", updateCategoryRailPosition);
   return () => {
     window.cancelAnimationFrame(frame);
     if (railFrameRef.current !== null) window.cancelAnimationFrame(railFrameRef.current);
     railFrameRef.current = null;
     window.removeEventListener("resize", updateCategoryRailPosition);
   };
 }, [categories.length, slug, updateCategoryRailPosition]);

 // Build category ancestry and the sidebar product index once per catalogue
 // change, rather than repeatedly running array.find/filter for every product.
 const catalogIndex = useMemo(() => {
   const byId = new Map(categories.map(category => [category.id, category]));
   const children = new Map<string, CatalogCategory[]>();
   const roots = categories.filter(category => !category.parent_id || !byId.has(category.parent_id));
   for (const category of categories) {
     if (!category.parent_id) continue;
     const siblings = children.get(category.parent_id) || [];
     siblings.push(category);
     children.set(category.parent_id, siblings);
   }
   const rootById = new Map<string, CatalogCategory>();
   const rootOf = (category: CatalogCategory): CatalogCategory => {
     const memoized = rootById.get(category.id);
     if (memoized) return memoized;
     let current = category;
     const trail: string[] = [];
     const seen = new Set<string>();
     while (current.parent_id && !seen.has(current.id)) {
       trail.push(current.id);
       seen.add(current.id);
       const parent = byId.get(current.parent_id);
       if (!parent) break;
       current = parent;
     }
     rootById.set(current.id, current);
     for (const id of trail) rootById.set(id, current);
     return current;
   };
   const list = categories.flatMap(category => {
     const root = rootOf(category);
     return (category.items || [])
       .filter(item => item.is_active !== false)
       .map(item => ({
         item, category, root,
         searchText: `${item.name} ${category.name} ${item.description || ""}`.toLowerCase(),
       }));
   });
   const productsByRoot = new Map<string, typeof list>();
   for (const entry of list) {
     const existing = productsByRoot.get(entry.root.id);
     if (existing) existing.push(entry);
     else productsByRoot.set(entry.root.id, [entry]);
   }
   return { byId, children, roots, rootById, list, productsByRoot };
 }, [categories]);
 const retailCategoryPattern = /fashion|clothing|apparel|men.?s|women.?s|kids|toy|electronic|phone|mobile|laptop|computer|gadget|home|kitchen|decor|beauty|skin|cosmetic|sport|fitness|outdoor|book|stationery|watch|jewel|accessor|footwear|shoe|bag|luggage|lifestyle/i;
 const oldCategoryPattern = /pooja|puja|samagri|camphor|kapoor|agarbatti|dhoop|incense|diya|idol|murti|god photo|religious|devotional|puja thali|rosar|festival kit|wedding item/i;
 const retailDepartments = ["Fashion", "Electronics", "Home & Kitchen", "Beauty & Personal Care", "Sports & Fitness", "Kids & Toys", "Books & More", "Lifestyle"];
 const genuineRoots = catalogIndex.roots.filter(root => retailCategoryPattern.test(root.name) && !oldCategoryPattern.test(root.name));
 // For a fresh catalogue, category browsing remains useful without inventing products.
 const demoRoots = retailDepartments.map((name, index) => ({id:`efs-retail-${index}`, slug:`efs-retail-${index}`, name, items:[], is_active:true} as unknown as CatalogCategory));
 const roots = genuineRoots.length ? genuineRoots : demoRoots;
 const list = catalogIndex.list.filter(entry => retailCategoryPattern.test(entry.root.name) && !oldCategoryPattern.test(entry.root.name) && !oldCategoryPattern.test(entry.item.name));
 const productsByRoot = catalogIndex.productsByRoot;
 const getKids = useCallback((id: string) => catalogIndex.children.get(id) || [], [catalogIndex]);
 const chosen = useMemo(() => roots.find(category => category.slug === slug) || categories.find(category => category.slug === slug && retailCategoryPattern.test(category.name) && !oldCategoryPattern.test(category.name)), [categories, slug, roots]);
 const activeRoot = chosen ? (catalogIndex.rootById.get(chosen.id) || chosen) : null;
 const selectedCategoryIds = useMemo(() => {
   if (!chosen) return null;
   const descendants = new Set<string>([chosen.id]);
   const queue = [chosen.id];
   for (let index = 0; index < queue.length; index++) {
     for (const child of catalogIndex.children.get(queue[index]) || []) {
       if (descendants.has(child.id)) continue;
       descendants.add(child.id);
       queue.push(child.id);
     }
   }
   return descendants;
 }, [chosen, catalogIndex]);
 const filtered = useMemo(() => list.filter(({ item, category, searchText }) =>
   (!selectedCategoryIds || selectedCategoryIds.has(category.id)) &&
   (!q || searchText.includes(q)) &&
   (!group || (item.group_name || "").trim().toLowerCase() === group)
 ), [list, selectedCategoryIds, q, group]);
 const visibleProducts = useMemo(() => filtered.slice(0, viewCount), [filtered, viewCount]);

 // Preserve first-matching-offer priority, but calculate it only when offers
 // or products change (instead of scanning all offers for every visible card).
 const offersByProduct = useMemo(() => {
   const globalOffers: number[] = [];
   const firstSpecificOfferIndex = new Map<string, number>();
   offers.forEach((offer, index) => {
     if (offer.applicable_to === "all" || offer.applicable_to === "catalogue") globalOffers.push(index);
     for (const id of offer.product_ids || []) {
       if (!firstSpecificOfferIndex.has(id)) firstSpecificOfferIndex.set(id, index);
     }
   });
   const globalIndex = globalOffers.length ? globalOffers[0] : Infinity;
   const result = new Map<string, PublicProductOffer>();
   for (const { item } of list) {
     const index = Math.min(globalIndex, firstSpecificOfferIndex.get(item.id) ?? Infinity);
     if (index !== Infinity) result.set(item.id, offers[index]);
   }
   return result;
 }, [offers, list]);
 // Initially expand the selected category (or the first category).
 // Remember each category's state as users navigate, rather than resetting
 // all other expanded categories on every click or route change.
 const defaultExpandedId = activeRoot?.id || roots[0]?.id || "";
 useEffect(() => {
   if (!defaultExpandedId) return;
   setExpandedRoots(previous =>
     Object.prototype.hasOwnProperty.call(previous, defaultExpandedId)
       ? previous
       : { ...previous, [defaultExpandedId]: true }
   );
 }, [defaultExpandedId]);
 const toggleRoot = useCallback((id: string) => setExpandedRoots(previous => ({
   ...previous,
   [id]: !(previous[id] ?? (id === defaultExpandedId)),
 })), [defaultExpandedId]);
 const availableGroups = useMemo(() => [...new Set(
   list.filter(entry => !selectedCategoryIds || selectedCategoryIds.has(entry.category.id))
     .map(entry => entry.item.group_name?.trim())
     .filter((value): value is string => !!value)
 )], [list, selectedCategoryIds]);
 const rootTitle=chosen?.name||"Discover products from every category";
 return <div className="market-store market-store-wide" ref={categoriesPageRef}>
  <style>{CATEGORIES_PAGE_SPACING_CSS}</style>
  {/* Shared SiteHeader from App.tsx provides the only site navigation. */}
  <style>{CATEGORIES_MOBILE_CSS}</style>
  <style>{CATEGORIES_SHOWCASE_CSS}</style>
  <style>{CATEGORIES_MOBILE_STICKY_CATEGORY_CSS}</style>
  <style>{CATEGORIES_DESKTOP_STICKY_CATEGORY_CSS}</style>
  <style>{CATEGORIES_DESKTOP_PROMO_ONLY_CSS}</style>
  <style>{CATEGORIES_PRODUCT_CARD_GAP_FIX_CSS}</style>
  {/* Legacy sticky category navigation removed: SiteHeader is the single navigation. */}
  {/* On phones, the search starts below the yellow line under category navigation. */}
  <div className="market-mobile-search-row">
    <form className="market-mobile-search-form" role="search" onSubmit={event => {
      event.preventDefault();
      navigate(`/categories${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    }}>
      <label htmlFor="market-mobile-search-input" className="market-sr-only">Search products</label>
      <input
        id="market-mobile-search-input"
        name="q"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search fashion, electronics, home essentials and more"
        autoComplete="off"
      />
      <button type="submit"><FiSearch aria-hidden="true" /><span className="market-search-button-text">Search</span></button>
    </form>
  </div>
  <div className="market-layout">
    <button type="button" className="market-mobile-filters-toggle"
      aria-expanded={mobileFiltersOpen} aria-controls="market-mobile-categories-sidebar"
      onClick={() => setMobileFiltersOpen(value => !value)}>
      <span className="market-mobile-filter-label"><FiGrid aria-hidden="true" /> Browse categories</span>
      <span className="market-mobile-filter-right">{activeRoot?.name || "All products"} <span aria-hidden="true">{mobileFiltersOpen ? "−" : "+"}</span></span>
    </button>
    <CategoriesSidebar
      mobileFiltersOpen={mobileFiltersOpen}
      activeRoot={activeRoot}
      chosen={chosen}
      roots={roots}
      productsByRoot={productsByRoot}
      defaultExpandedId={defaultExpandedId}
      expandedRoots={expandedRoots}
      toggleRoot={toggleRoot}
      getKids={getKids}
      availableGroups={availableGroups}
      loading={loading}
    /><main className="market-main"><div className="market-breadcrumb"><Link to="/categories">Store</Link>{activeRoot&&<> / <Link to={linkTo(activeRoot)}>{activeRoot.name}</Link></>}{chosen&&chosen.id!==activeRoot?.id&&` / ${chosen.name}`}</div>
    {!isMobileViewport && !slug && !q && <section className="market-promo"><div className="market-promo-content"><span>THE EASYFINDSTORE COLLECTION</span><h1>Everything you love.<br/>One place to shop.</h1><p>Discover clothing, electronics, home essentials and everyday finds. Browse collections and shop with confidence.</p><a href="#market-products">Explore products <span>→</span></a></div><div className="market-promo-retail-image" role="img" aria-label="Fashion and lifestyle collection" /></section>}
    {!q && !loading && !error && roots.length > 0 && (
      <section className="market-collection-section" aria-label="Filter products by category">
        <div className="market-collection-heading">
          <h2>Shop by Category</h2>
          {chosen && (
            <Link to="/categories" className="market-collection-reset">
              All products <FiArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="market-collections-carousel">
          <button
            className="market-collection-arrow market-collection-prev"
            type="button"
            aria-label="Scroll categories left"
            disabled={categoryRailPosition.atStart}
            onClick={() => scrollCategoryRail(-1)}
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <div
            className="market-quick-categories"
            ref={collectionRailRef}
            onScroll={updateCategoryRailPosition}
            aria-label="Shop categories — swipe or use arrows to browse"
          >
            {roots.map(category => (
              <Link
                key={category.id}
                to={linkTo(category)}
                className="market-collection-card"
                aria-current={activeRoot?.id === category.id ? "page" : undefined}
                aria-label={`Explore ${category.name}`}
              >
                <CollectionMedia category={category} />
                <span className="market-collection-details">
                  <span className="market-collection-name">{category.name}</span>
                </span>
              </Link>
            ))}
          </div>
          <button
            className="market-collection-arrow market-collection-next"
            type="button"
            aria-label="Scroll categories right"
            disabled={categoryRailPosition.atEnd}
            onClick={() => scrollCategoryRail(1)}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    )}
    <div id="market-products" className="market-section-title"><div><span className="market-kicker">EXPLORE OUR CATALOGUE</span><h1>{q?`Search: ${q}`:rootTitle}</h1><p>{filtered.length} products {chosen?`in ${chosen.name}`:"across our store"}</p></div>{chosen&&<Link to="/categories">Clear category</Link>}</div>
    {!loading && !error && filtered.length > 0 &&
      <p className="market-results-summary" role="status">Showing {Math.min(filtered.length,viewCount)} of {filtered.length} available products</p>}
    {loading?<p className="market-loading">Loading products…</p>:error?<p role="alert" className="market-error">{error}</p>:!filtered.length?<div className="market-empty">No products found. <Link to="/categories">Show all products</Link></div>:<><div className="market-grid">{visibleProducts.map(({item,root})=><ProductTile key={item.id} item={item} rootName={root.name} offer={offersByProduct.get(item.id)} quantity={(guestQuantities[item.id]||0)+(accountQuantities[item.id]||0)} onQuantityChange={changeCart}/>)}</div>{filtered.length>viewCount&&<button type="button" className="market-load-more" onClick={()=>setViewCount(v=>v+24)}>Show more products</button>}</>}
   </main></div>
 </div>
}
