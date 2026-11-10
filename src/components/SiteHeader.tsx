import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
} from "react-icons/fi";
import { fetchCatalog, guestCartCount } from "../lib/guestCart";
import { productDetailHref } from "../lib/productLinks";
import { JWT_AUTH_CHANGED_EVENT, notifyJwtAuthChanged } from "../lib/jwtAuth";
import { loadAdminOrders } from "../services/adminOrdersApi";
import type { CatalogCategory } from "../services/coreCommerceApi";
import "../styles/site-header-ecommerce.css";
import "../styles/easyfindstore-reference.css";
import { StoreBrand } from "./StoreBrand";

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

type CurrentUser = {
  id: string;
  full_name?: string;
  email: string;
  role: string;
};
type Session = {
  authenticated?: boolean;
  user?: CurrentUser | null;
  csrf_token?: string;
};
/** Same active/parent_id catalog structure used by HomePage. */
const CATALOG_TTL_MS = 45_000;
let categoryCache: { data: CatalogCategory[]; at: number } | null = null;
let pendingCatalog: Promise<CatalogCategory[]> | null = null;

function currentCatalog(): CatalogCategory[] | null {
  if (!categoryCache || Date.now() - categoryCache.at >= CATALOG_TTL_MS) return null;
  return categoryCache.data;
}

function loadCategories(force = false): Promise<CatalogCategory[]> {
  if (!force) {
    const cached = currentCatalog();
    if (cached) return Promise.resolve(cached);
  }
  if (!pendingCatalog) {
    pendingCatalog = fetchCatalog()
      .then((data) => {
        const active = data.filter((category) => category.is_active !== false && /fashion|clothing|apparel|electronic|tech|gadget|home|kitchen|decor|beauty|personal|sport|fitness|outdoor|toy|kid|game|book|stationery|lifestyle|watch|jewel|accessor/i.test(category.name) && !/pooja|puja|samagri|camphor|agarbatti|dhoop|diya|idol|murti|frame/i.test(category.name));
        categoryCache = { data: active, at: Date.now() };
        return active;
      })
      .finally(() => { pendingCatalog = null; });
  }
  return pendingCatalog;
}

const categoryHref = (slug: string) => `/categories/${encodeURIComponent(slug)}`;

type HeaderProduct = { id: string; name: string };

/** Use the same root-category/product grouping as CategoriesPage's sidebar. */
function createCategoryTree(categories: CatalogCategory[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const roots: CatalogCategory[] = [];
  const children = new Map<string, CatalogCategory[]>();
  for (const category of categories) {
    if (!category.parent_id || !byId.has(category.parent_id)) {
      roots.push(category);
    } else {
      const group = children.get(category.parent_id) ?? [];
      group.push(category);
      children.set(category.parent_id, group);
    }
  }

  const cachedRoots = new Map<string, string>();
  function rootIdOf(category: CatalogCategory): string {
    const cached = cachedRoots.get(category.id);
    if (cached) return cached;
    const trail: string[] = [];
    const seen = new Set<string>();
    let current = category;
    while (current.parent_id && !seen.has(current.id)) {
      trail.push(current.id);
      seen.add(current.id);
      const parent = byId.get(current.parent_id);
      if (!parent) break;
      current = parent;
    }
    for (const id of trail) cachedRoots.set(id, current.id);
    cachedRoots.set(category.id, current.id);
    return current.id;
  }

  const productsByRoot = new Map<string, HeaderProduct[]>();
  for (const category of categories) {
    const rootId = rootIdOf(category);
    const productList = productsByRoot.get(rootId) ?? [];
    for (const product of category.items || []) {
      if (product.is_active === false) continue;
      productList.push({ id: product.id, name: product.name });
    }
    productsByRoot.set(rootId, productList);
  }
  return { roots, children, productsByRoot };
}

function CategorySidebarItem({
  category,
  childrenByParent,
  productsByRoot,
  expandedIds,
  onToggle,
  onNavigate,
}: {
  category: CatalogCategory;
  childrenByParent: Map<string, CatalogCategory[]>;
  productsByRoot: Map<string, HeaderProduct[]>;
  expandedIds: string[];
  onToggle: (categoryId: string) => void;
  onNavigate: () => void;
}) {
  const products = productsByRoot.get(category.id) ?? [];
  const expanded = expandedIds.includes(category.id);
  const panelId = `rsh-cat-child-${category.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const subcategories = childrenByParent.get(category.id) ?? [];

  return (
    <div className="rsh-side-group rsh-side-root">
      <div className="rsh-side-row">
        <Link to={categoryHref(category.slug)} className="rsh-side-label" onClick={onNavigate} title={category.name}>
          {category.name}
        </Link>
        <span className="rsh-side-count">({products.length})</span>
        <button
          type="button"
          className="rsh-side-expander"
          aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name} products`}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(category.id)}
        >
          {expanded ? <FiMinus aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
        </button>
      </div>
      {expanded && (
        <div id={panelId} className="rsh-side-children">
          {subcategories.map((child) => (
            <div key={child.id}>
              <Link className="rsh-side-product-link" to={categoryHref(child.slug)} onClick={onNavigate}>{child.name}</Link>
              {(childrenByParent.get(child.id) ?? []).map((grandchild) => (
                <Link className="rsh-side-product-link rsh-side-grandchild" key={grandchild.id}
                  to={categoryHref(grandchild.slug)} onClick={onNavigate}>{grandchild.name}</Link>
              ))}
            </div>
          ))}
          <div className={`rsh-side-products${products.length > 15 ? " rsh-side-products--scrollable" : ""}`}>
            {products.map((product) => (
              <Link key={product.id} className="rsh-side-product-link" to={productDetailHref(product.id)}
                onClick={onNavigate} title={product.name}>{product.name}</Link>
            ))}
          </div>
          {products.length > 15 && (
            <Link to={categoryHref(category.slug)} className="rsh-side-product-link rsh-side-view-all"
              onClick={onNavigate}>View all {products.length} products →</Link>
          )}
          {!products.length && <span className="rsh-side-state">No products added yet</span>}
        </div>
      )}
    </div>
  );
}

function CategorySidebar({
  roots,
  childrenByParent,
  productsByRoot,
  expandedIds,
  onToggle,
  onNavigate,
  loading,
  error,
}: {
  roots: CatalogCategory[];
  childrenByParent: Map<string, CatalogCategory[]>;
  productsByRoot: Map<string, HeaderProduct[]>;
  expandedIds: string[];
  onToggle: (categoryId: string) => void;
  onNavigate: () => void;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="rsh-category-sidebar">
      <h3 className="rsh-sidebar-heading">Shop by Category</h3>
      <Link to="/categories" onClick={onNavigate} className="rsh-all-products">
        <span>All products</span>
        <FiChevronRight aria-hidden="true" />
      </Link>
      <div className="rsh-side-categories">
        {roots.map((category) => (
          <CategorySidebarItem
            key={category.id}
            category={category}
            childrenByParent={childrenByParent}
            productsByRoot={productsByRoot}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onNavigate={onNavigate}
          />
        ))}
        {loading && roots.length === 0 && <p className="rsh-side-state">Loading categories…</p>}
        {error && roots.length === 0 && <p className="rsh-side-state">Categories are temporarily unavailable.</p>}
        {!loading && !error && roots.length === 0 && <p className="rsh-side-state">No categories available.</p>}
      </div>
    </div>
  );
}

/**
 * A self-contained replacement for SiteHeader.tsx. The existing global
 * ecommerce stylesheet remains imported, but these page-scoped rules take
 * priority so no additional CSS file needs to be edited.
 */
const HEADER_STYLES = `
  .ec-site-header.rsh-header {
    position: sticky !important;
    top: 0 !important;
    z-index: 1200 !important;
    width: 100% !important;
    max-width: none !important;
    overflow: visible !important;
    box-sizing: border-box !important;
    isolation: isolate;
  }
  .rsh-header, .rsh-header * { box-sizing: border-box; }
  .rsh-header a { text-decoration: none; }
  .ec-site-header.rsh-header > .ec-site-inner.rsh-main-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-wrap: nowrap !important;
    gap: clamp(10px, 1.2vw, 21px) !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    min-height: 78px !important;
    padding: 10px clamp(16px, 2.3vw, 44px) !important;
  }
  .rsh-header .ec-site-brand {
    flex: 0 0 auto !important;
    margin: 0 !important;
    text-transform: none !important;
    white-space: nowrap;
  }
  .rsh-header .ec-site-nav.rsh-main-nav {
    position: static !important;
    display: flex !important;
    flex: 0 0 auto !important;
    flex-direction: row !important;
    justify-content: flex-end !important;
    align-items: center !important;
    gap: clamp(8px, .9vw, 16px) !important;
    width: auto !important;
    max-width: none !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 0 0 auto !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    overflow: visible !important;
  }
  .rsh-header .ec-site-nav.rsh-main-nav > a,
  .rsh-header .ec-site-nav.rsh-main-nav > button,
  .rsh-header .rsh-catalog-toggle {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    width: auto !important;
    min-height: 37px !important;
    padding: 5px 3px !important;
    margin: 0 !important;
    border: none !important;
    background: transparent !important;
    color: #fff9f5 !important;
    white-space: nowrap !important;
    font: inherit;
    font-size: 12.5px !important;
    font-weight: 500 !important;
    letter-spacing: normal !important;
    line-height: 1.25;
    text-transform: none !important;
    cursor: pointer;
    box-shadow: none !important;
  }
  /* High contrast on the existing dark maroon navigation background. */
  .rsh-header .ec-site-nav.rsh-main-nav > a:hover,
  .rsh-header .ec-site-nav.rsh-main-nav > a:focus-visible,
  .rsh-header .ec-site-nav.rsh-main-nav > button:hover,
  .rsh-header .rsh-catalog-toggle:hover,
  .rsh-header .rsh-catalog-toggle[aria-expanded="true"] {
    color: #ffe5b0 !important;
  }
  /* An active page gets an underline, not larger/bolder text. */
  .rsh-header .ec-site-nav.rsh-main-nav .rsh-active-link {
    color: #fff9f5 !important;
    font-weight: 500 !important;
  }
  .rsh-header .ec-site-nav.rsh-main-nav .rsh-active-link:hover,
  .rsh-header .ec-site-nav.rsh-main-nav .rsh-active-link:focus-visible {
    color: #ffe5b0 !important;
  }
  /* A slim gold underline slides in on hover and remains on the current page.
     This is only for the top-level links, not nested category/product links. */
  .rsh-header .ec-site-nav.rsh-main-nav > a,
  .rsh-header .ec-site-nav.rsh-main-nav > button,
  .rsh-header .rsh-catalog-toggle { position: relative !important; text-decoration: none !important; }
  .rsh-header .ec-site-nav.rsh-main-nav > a::after,
  .rsh-header .ec-site-nav.rsh-main-nav > button::after,
  .rsh-header .rsh-catalog-toggle::after {
    content: "" !important;
    position: absolute !important;
    bottom: 1px !important;
    left: 3px !important;
    right: 3px !important;
    height: 2px !important;
    border-radius: 2px !important;
    background: #f1c879 !important;
    opacity: 1 !important;
    transform: scaleX(0) !important;
    transform-origin: center !important;
    transition: transform .18s ease !important;
    pointer-events: none !important;
  }
  .rsh-header .ec-site-nav.rsh-main-nav > a:hover::after,
  .rsh-header .ec-site-nav.rsh-main-nav > a:focus-visible::after,
  .rsh-header .ec-site-nav.rsh-main-nav > a.rsh-active-link::after,
  .rsh-header .ec-site-nav.rsh-main-nav > button:hover::after,
  .rsh-header .rsh-catalog-toggle:hover::after,
  .rsh-header .rsh-catalog-toggle:focus-visible::after,
  .rsh-header .rsh-catalog-toggle[aria-expanded="true"]::after,
  .rsh-header .rsh-catalog-toggle.rsh-active-link::after { transform: scaleX(1) !important; }
  .rsh-header .ec-site-nav.rsh-main-nav > a:focus-visible,
  .rsh-header .ec-site-nav.rsh-main-nav > button:focus-visible,
  .rsh-header .rsh-catalog-toggle:focus-visible { outline: 2px solid #f1c879 !important; outline-offset: 3px !important; }
  .rsh-header .ec-site-nav.rsh-main-nav > a.ec-site-signup {
    padding: 8px 12px !important;
    border-radius: 6px !important;
    background: #fff0dc !important;
    color: #691b2b !important;
    font-weight: 800 !important;
  }
  .rsh-header .ec-site-nav.rsh-main-nav > a.ec-site-signup:hover,
  .rsh-header .ec-site-nav.rsh-main-nav > a.ec-site-signup.rsh-active-link { background: #f8dab0 !important; color: #561222 !important; }
  .rsh-header .ec-site-nav.rsh-main-nav > a.ec-site-signup::after { display: none !important; }
  .rsh-header .ec-site-cart-link { display: inline-flex !important; align-items: center; gap: 5px; }
  .rsh-header .ec-site-cart-icon { display: block; flex: 0 0 18px; width: 18px; height: 18px; }
  /* The screenshot's vertical, scrollable Shop by Category menu. */
  .rsh-header .rsh-catalog-nav { position: relative; flex: 0 0 auto; min-width: 0; }
  /* Match Home and Cart exactly; the category button must not inherit a
     larger/bolder button style from site-header-ecommerce.css. */
  .rsh-header .rsh-catalog-toggle {
    gap: 5px !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
    line-height: 1.25 !important;
    letter-spacing: normal !important;
  }
  .rsh-header .rsh-catalog-toggle > svg { width: 14px; height: 14px; transition: transform .15s ease; }
  .rsh-header .rsh-catalog-toggle[aria-expanded="true"] > svg { transform: rotate(180deg); }
  .rsh-header .rsh-catalog-popover {
    position: absolute !important;
    top: calc(100% + 12px);
    left: 0;
    z-index: 210;
    display: block !important;
    width: 282px;
    max-width: min(340px, calc(100vw - 32px));
    max-height: min(70vh, 640px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-color: #bc9496 #fbf6f0;
    scrollbar-width: thin;
    border: 1px solid #ecd7bf;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 40px rgba(52, 19, 29, .2);
  }
  .rsh-header .rsh-catalog-popover::-webkit-scrollbar { width: 7px; }
  .rsh-header .rsh-catalog-popover::-webkit-scrollbar-thumb { background: #bc9496; border-radius: 9px; }
  .rsh-header .rsh-category-sidebar {
    width: 100%;
    padding: 16px 12px 18px;
    background: #fff;
    color: #312d38;
    font-size: 13px;
  }
  .rsh-header .rsh-sidebar-heading {
    margin: 2px 8px 12px !important;
    color: #58222c !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    line-height: 1.35;
  }
  .rsh-header .rsh-all-products {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 38px;
    padding: 9px 9px;
    margin: 0 0 4px;
    border: 0;
    border-radius: 6px;
    background: #fdf0ed;
    color: #7a2632 !important;
    font-size: 12.5px;
    font-weight: 500;
  }
  .rsh-header .rsh-all-products:hover { background: #fae7e2; }
  .rsh-header .rsh-all-products svg { flex: 0 0 13px; width: 13px; height: 13px; }
  .rsh-header .rsh-side-categories { padding: 0; }
  .rsh-header .rsh-side-root { padding: 0; }
  .rsh-header .rsh-side-root + .rsh-side-root { margin-top: 2px; }
  .rsh-header .rsh-side-row {
    display: flex;
    align-items: center;
    gap: 5px;
    min-height: 36px;
    width: 100%;
    padding: 0 4px 0 8px;
    border-radius: 5px;
  }
  .rsh-header .rsh-side-row:hover { background: #fff6f2; }
  .rsh-header .rsh-side-label {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    padding: 7px 0;
    color: #344153 !important;
    font-size: 12.5px;
    font-weight: 700;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .rsh-header .rsh-side-label:hover { color: #862e3f !important; }
  .rsh-header .rsh-side-count {
    flex: 0 0 auto;
    color: #8c7980;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
  }
  .rsh-header .rsh-side-expander {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 25px;
    width: 25px !important;
    height: 30px !important;
    min-height: 30px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 5px;
    background: transparent !important;
    color: #842f40 !important;
    cursor: pointer;
    box-shadow: none !important;
  }
  .rsh-header .rsh-side-expander:hover { background: #f9e7e0 !important; }
  .rsh-header .rsh-side-expander svg { width: 13px; height: 13px; stroke-width: 2; }
  .rsh-header .rsh-side-children {
    padding: 2px 0 7px 11px;
    margin: 0 0 7px 9px;
    border-left: 1px solid #ead1bc;
  }
  .rsh-header .rsh-side-subgroup > .rsh-side-row { min-height: 28px; padding: 0 2px 0 7px; }
  .rsh-header .rsh-side-subgroup > .rsh-side-row .rsh-side-label {
    padding: 5px 0;
    color: #654b50 !important;
    font-size: 12px;
    font-weight: 450;
    line-height: 1.4;
  }
  .rsh-header .rsh-side-subgroup > .rsh-side-row .rsh-side-label:hover { color: #862e3f !important; }
  .rsh-header .rsh-side-subgroup > .rsh-side-children { margin-left: 9px; padding-left: 9px; }

  /* Indented actual product names; identical navigation data to CategoriesPage. */
  .rsh-header .rsh-side-children > div { min-width: 0; }
  .rsh-header .rsh-side-product-link {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 6px 7px !important;
    border: 0 !important;
    border-radius: 4px;
    background: transparent !important;
    color: #684e52 !important;
    font-size: 12px !important;
    font-weight: 450 !important;
    line-height: 1.36 !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
    text-align: left !important;
    text-decoration: none !important;
  }
  .rsh-header .rsh-side-product-link:hover { color: #8d283c !important; background: #fff4ef !important; }
  .rsh-header .rsh-side-grandchild { padding-left: 17px !important; }
  .rsh-header .rsh-side-products { display: flex; flex-direction: column; min-width: 0; }
  .rsh-header .rsh-side-products--scrollable {
    max-height: 420px;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-color: #c29b9c #fff7f3;
    scrollbar-width: thin;
  }
  .rsh-header .rsh-side-view-all { color: #862638 !important; font-weight: 700 !important; }
  .rsh-header .rsh-side-state { margin: 12px 6px; color: #725d65; font-size: 12px; line-height: 1.5; }
  .rsh-header .ec-site-toggle.rsh-mobile-toggle { display: none !important; }

  /* Admin has more links; allow a second row on medium desktops. */
  @media (min-width: 1051px) and (max-width: 1550px) {
    .ec-site-header.rsh-header.rsh-header--admin > .ec-site-inner.rsh-main-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 3px !important;
    }
    .rsh-header--admin .ec-site-brand { grid-row: 1; }
    .rsh-header--admin .ec-site-nav.rsh-main-nav {
      grid-row: 2;
      justify-self: end;
      flex-wrap: wrap !important;
      margin: 0 !important;
      gap: 4px 15px !important;
    }
  }
  @media (max-width: 1050px) {
    .ec-site-header.rsh-header > .ec-site-inner.rsh-main-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 9px 10px !important;
      padding: 11px 16px !important;
    }
    .rsh-header .ec-site-brand { grid-row: 1; grid-column: 1; min-width: 0; white-space: normal; }
    .rsh-header .ec-site-toggle.rsh-mobile-toggle {
      display: inline-flex !important;
      grid-row: 1;
      grid-column: 2;
      align-items: center;
      justify-content: center;
      justify-self: end;
      width: 40px !important;
      height: 40px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 1px solid #e6d3c5;
      border-radius: 7px;
      background: #fff !important;
      color: #752c3b !important;
      cursor: pointer;
    }
    .rsh-header .ec-site-toggle.rsh-mobile-toggle svg { width: 20px; height: 20px; }
    .rsh-header .ec-site-nav.rsh-main-nav {
      display: none !important;
      grid-row: 2;
      grid-column: 1 / -1;
      flex-direction: column !important;
      justify-content: flex-start !important;
      align-items: stretch !important;
      gap: 2px !important;
      width: 100% !important;
      max-width: 100% !important;
      max-height: min(72vh, 700px) !important;
      margin: 3px 0 0 !important;
      padding: 5px 0 !important;
      border-top: 1px solid #ead9d0 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain;
    }
    .rsh-header .ec-site-nav.rsh-main-nav.is-open { display: flex !important; }
    .rsh-header .ec-site-nav.rsh-main-nav > a,
    .rsh-header .ec-site-nav.rsh-main-nav > button,
    .rsh-header .rsh-catalog-toggle {
      justify-content: flex-start !important;
      width: 100% !important;
      min-height: 39px !important;
      padding: 9px 11px !important;
      text-align: left;
      font-size: 13px !important;
    }
    .rsh-header .rsh-catalog-nav { width: 100%; }
    .rsh-header .rsh-catalog-toggle { justify-content: space-between !important; }
    .rsh-header .rsh-catalog-popover {
      position: static !important;
      width: 100%;
      max-width: 100%;
      max-height: min(58vh, 480px);
      margin: 0 0 8px;
      border: 1px solid #ebd7c9;
      border-radius: 7px;
      box-shadow: none;
    }
    .rsh-header .rsh-category-sidebar { padding: 13px 12px; }
  }
  @media (max-width: 480px) {
    .rsh-header .rsh-sidebar-heading { font-size: 14px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rsh-header *, .rsh-header *::before, .rsh-header *::after { transition: none !important; scroll-behavior: auto !important; }
  }
  /* EasyFindStore retail navbar: filled active/hover states with accessible contrast. */
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle {
    color: #174c72 !important;
    background: #eef7fc !important;
    border: 1px solid #d7eaf5 !important;
    border-radius: 9px !important;
    padding: 10px 14px !important;
    min-height: 40px !important;
    font-weight: 700 !important;
    box-shadow: none !important;
    transition: background .18s, color .18s, box-shadow .18s, transform .18s !important;
  }
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a:hover,
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a:focus-visible,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle:hover,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle:focus-visible,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle[aria-expanded="true"] {
    color: #fff !important;
    background: #0b77b7 !important;
    border-color: #0b77b7 !important;
    box-shadow: 0 5px 14px rgba(0,103,164,.16) !important;
  }
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a.rsh-active-link,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle.rsh-active-link {
    color: #fff !important;
    background: #075e98 !important;
    border-color: #075e98 !important;
    font-weight: 800 !important;
    box-shadow: 0 5px 14px rgba(0,76,137,.17) !important;
  }
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a::after,
  .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle::after { display:none !important; }
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a.ec-site-cart-link {
    background: #e0f2ff !important;
    border-color: #aedafa !important;
  }
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a.ec-site-cart-link:hover,
  .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a.ec-site-cart-link.rsh-active-link {
    color: #fff !important;
    background: #075e98 !important;
  }
  @media (max-width: 740px) {
    .rsh-header:not(.rsh-header--admin) .ec-site-nav.rsh-main-nav > a,
    .rsh-header:not(.rsh-header--admin) .rsh-catalog-toggle {
      width: 100% !important;
      justify-content: flex-start !important;
      padding: 11px 14px !important;
    }
  }

  /* EasyFindStore Luxe: overrides legacy header declarations without changing logic. */
  .efs-luxe-announcement{min-height:34px;background:linear-gradient(105deg,#d9a23e,#fff0b5 47%,#c99432);color:#172237;display:flex;align-items:center;justify-content:center;gap:clamp(12px,3vw,55px);padding:6px 22px;font-size:12px;font-weight:650}
  .efs-luxe-announcement a{color:#152239;font-weight:800;text-decoration:none}
  .rsh-header.efs-luxe-header.ec-site-header{background:#08192d!important;border-color:#20314a!important;box-shadow:0 2px 10px #08152544!important}
  .efs-luxe-header .ec-site-inner.rsh-main-row{min-height:83px!important;gap:20px!important}
  .efs-luxe-header .ec-site-brand{color:#fff!important;letter-spacing:-.045em!important;font-size:clamp(19px,1.9vw,29px)!important;line-height:1.0}
  .efs-luxe-header .ec-site-brand::first-letter{color:#f3c76b}
  .efs-luxe-header .ec-site-brand span{color:#f4ce7b!important;font-size:10px!important;letter-spacing:.14em!important;text-align:right;margin-top:8px}
  .efs-luxe-header .ec-site-nav.rsh-main-nav>a,.efs-luxe-header .rsh-catalog-toggle{color:#fff!important;padding:8px 11px!important;border-radius:6px!important}
  .efs-luxe-header .ec-site-nav.rsh-main-nav>a:hover,.efs-luxe-header .rsh-catalog-toggle:hover{background:#203753!important;color:#f5cd76!important}
  .efs-luxe-header .ec-site-nav.rsh-main-nav .rsh-active-link{color:#1b2735!important;background:#f1c467!important;font-weight:750!important}
  .efs-luxe-header .ec-site-nav.rsh-main-nav .rsh-active-link:hover{background:#f6d997!important;color:#101c2b!important}
  .efs-luxe-header .ec-site-nav.rsh-main-nav>a.ec-site-signup{background:#f1c467!important;color:#102035!important;padding:9px 13px!important}
  .efs-luxe-header .ec-site-badge{background:#f5cb72!important;color:#17243a!important}
  .efs-luxe-search{display:flex;align-items:center;flex:1 1 370px;max-width:610px;min-width:170px;border:1px solid #dfdfe2;border-radius:9px;background:#fff;overflow:hidden;height:43px;margin-left:auto}
  .efs-luxe-search input{border:0;outline:0;min-width:0;width:100%;height:100%;padding:0 15px;color:#243143;font-size:13px;background:white}
  .efs-luxe-search button{display:grid;place-items:center;height:100%;width:55px;flex:none;background:linear-gradient(#fbe3a0,#e4b449);border:0;color:#0e2036;cursor:pointer;font-size:19px}
  .efs-luxe-search button:hover{background:#f4cd6a}
  .efs-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  @media(max-width:1260px){.efs-luxe-header .ec-site-inner.rsh-main-row{flex-wrap:wrap!important}.efs-luxe-search{order:2;max-width:none;flex-basis:100%;margin:0}.efs-luxe-header .ec-site-nav.rsh-main-nav{margin-left:auto!important}}
  @media(max-width:750px){.efs-luxe-announcement{justify-content:space-between;font-size:10px;padding:7px 12px}.efs-luxe-announcement span{display:none}.efs-luxe-header .ec-site-inner.rsh-main-row{min-height:66px!important}.efs-luxe-header .ec-site-toggle{display:block!important;margin-left:auto}.efs-luxe-header .ec-site-nav.rsh-main-nav{display:none!important}.efs-luxe-header .ec-site-nav.rsh-main-nav.is-open{display:flex!important;position:absolute!important;top:100%!important;left:0!important;right:0!important;flex-direction:column!important;background:#10243d!important;padding:15px!important;align-items:stretch!important;max-height:75vh!important;overflow:auto!important}.efs-luxe-header .ec-site-nav.rsh-main-nav>a{width:100%!important;justify-content:flex-start!important}.efs-luxe-search{order:3;flex:1 1 100%;min-height:41px}.efs-luxe-header .ec-site-brand{font-size:22px!important}}

`;

export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const categoryRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [csrf, setCsrf] = useState("");
  const [count, setCount] = useState(() => guestCartCount());
  const [newOrders, setNewOrders] = useState(0);
  const [supportCounts, setSupportCounts] = useState({ complaints: 0, enquiries: 0 });
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>(() => currentCatalog() ?? []);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const isAdmin = user?.role === "admin";

  // Admins should use the admin dashboard, not the customer dashboard.
  // This also handles directly opening /dashboard or refreshing that URL.
  useEffect(() => {
    if (isAdmin && /^\/dashboard\/?$/.test(location.pathname)) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, location.pathname, navigate]);

  const close = useCallback(() => {
    setMobile(false);
    setCategoryOpen(false);
  }, []);

  // Keep authentication, cart badge and admin counters fully functional.
  useEffect(() => {
    let live = true;
    let refreshing = false;
    async function refresh() {
      if (!live || refreshing) return;
      refreshing = true;
      try {
        const response = await fetch(`${BASE}/react/api/auth/session`, {
          credentials: "include", cache: "no-store",
        });
        if (!response.ok) throw new Error("Session unavailable");
        const session = (await response.json()) as Session;
        if (!live) return;
        setUser(session.authenticated ? session.user ?? null : null);
        setCsrf(session.csrf_token || "");

        if (session.authenticated && session.user?.role === "user") {
          try {
            const cartResponse = await fetch(`${BASE}/react/api/commerce/cart/count`, {
              credentials: "include", cache: "no-store",
            });
            if (!cartResponse.ok) throw new Error("Cart count unavailable");
            const result = await cartResponse.json();
            if (live) setCount(Number(result.count || 0) + guestCartCount());
          } catch {
            if (live) setCount(guestCartCount());
          }
        } else if (live) {
          setCount(guestCartCount());
        }

        if (session.authenticated && session.user?.role === "admin") {
          const [orders, support] = await Promise.allSettled([
            loadAdminOrders(),
            fetch(`${BASE}/react/api/admin/support/summary`, {
              credentials: "include", cache: "no-store",
            }).then(async (result) => {
              if (!result.ok) throw new Error("Support summary unavailable");
              return result.json();
            }),
          ]);
          if (!live) return;
          if (orders.status === "fulfilled") setNewOrders(orders.value.summary.new_count || 0);
          if (support.status === "fulfilled" && support.value.success) {
            setSupportCounts({
              complaints: Number(support.value.open_complaints || 0),
              enquiries: Number(support.value.new_enquiries || 0),
            });
          }
        } else if (live) {
          setNewOrders(0);
          setSupportCounts({ complaints: 0, enquiries: 0 });
        }
      } catch {
        if (live) setCount(guestCartCount());
      } finally {
        refreshing = false;
      }
    }
    const onUpdate = () => { void refresh(); };
    const onCartUpdate = () => {
      setCount((value) => Math.max(value, guestCartCount()));
      void refresh();
    };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    window.addEventListener(JWT_AUTH_CHANGED_EVENT, onUpdate);
    window.addEventListener("cart-updated", onCartUpdate);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener(JWT_AUTH_CHANGED_EVENT, onUpdate);
      window.removeEventListener("cart-updated", onCartUpdate);
    };
  }, [location.pathname]);

  // Keep this component in sync with catalog edits without polling on every render.
  useEffect(() => {
    let live = true;
    const refresh = (force = false) => {
      if (!currentCatalog()) setCatalogLoading(true);
      void loadCategories(force)
        .then((data) => {
          if (live) {
            setCategories(data);
            setCatalogError(false);
          }
        })
        .catch(() => { if (live) setCatalogError(true); })
        .finally(() => { if (live) setCatalogLoading(false); });
    };
    refresh();
    const refreshOnUpdate = () => refresh(true);
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 120_000);
    window.addEventListener("catalog-updated", refreshOnUpdate);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("catalog-updated", refreshOnUpdate);
    };
  }, []);

  const { roots, children, productsByRoot } = useMemo(() => createCategoryTree(categories), [categories]);
  // Open the first group automatically, matching the reference screenshot.
  useEffect(() => {
    if (roots.length) {
      setExpandedIds((current) => current.length ? current : [roots[0].id]);
    }
  }, [roots]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }, []);

  useEffect(() => { close(); }, [location.pathname, location.search, close]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setCategoryOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`${BASE}/react/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ csrf_token: csrf }),
      });
      if (!response.ok) throw new Error("Logout failed");
      setUser(null);
      setCsrf("");
      notifyJwtAuthChanged();
      navigate("/");
    } catch {
      window.location.href = "/react/login";
    } finally {
      setBusy(false);
      close();
    }
  };

  // Match nested routes too (e.g. /categories/pooja or /admin/orders/123).
  const isActivePath = (path: string, nested = false) =>
    location.pathname === path || (nested && location.pathname.startsWith(`${path}/`));
  const activeClass = (path: string, nested = false) =>
    isActivePath(path, nested) ? "rsh-active-link" : undefined;
  const categoryPageActive = isActivePath("/categories", true);

  if (!isAdmin) {
    const navItems = [
      { label: "Deals", key: "deal" },
      { label: "Best Sellers", key: "best" },
      { label: "New Arrivals", key: "new" },
      { label: "Fashion", key: "fashion" },
      { label: "Electronics", key: "electronics" },
      { label: "Home Décor", key: "home" },
      { label: "Beauty & Personal Care", key: "beauty" },
      { label: "Sports & Outdoors", key: "sports" },
      { label: "Toys & Games", key: "toys" },
      { label: "Brands", key: "brands" },
    ];
    const navSearch = (key: string) => key === "home" ? "home" : key === "toys" ? "toys" : key === "best" ? "" : key === "new" ? "" : key === "brands" ? "" : key === "deal" ? "" : key;
    const navHref = (key: string) => {
      if (["deal", "best", "new", "brands"].includes(key)) return "/store";
      const terms: Record<string, RegExp> = {
        fashion: /fashion|clothing|apparel/i, electronics: /electronic|tech|gadget/i,
        home: /home|kitchen|decor/i, beauty: /beauty|personal care/i,
        sports: /sport|fitness|outdoor/i, toys: /toy|kid|game/i,
      };
      const root = roots.find(cat => !cat.parent_id && terms[key]?.test(cat.name));
      return root ? categoryHref(root.slug) : `/store?q=${encodeURIComponent(navSearch(key))}`;
    };
    return (
      <>
        <style>{HEADER_STYLES}</style>
        <div className="efs2-announcement">
          <span aria-hidden="true">♔</span><strong>Grand Launch Special</strong><i />
          <span>Discover our newest collections</span><i /><span>Fashion · Tech · Home</span>
          <Link to="/store">Shop now</Link>
        </div>
        <header className="efs2-header">
          <div className="efs2-top-row">
            <StoreBrand to="/" onClick={close} />
            <form className="efs2-search" role="search" onSubmit={event => {event.preventDefault(); navigate(search.trim() ? `/store?q=${encodeURIComponent(search.trim())}` : "/store"); close();}}>
              <label htmlFor="efs2-search-field" className="efs-sr-only">Search store products</label>
              <select aria-label="Search category" defaultValue="all" onChange={event => {if (event.target.value !== "all") navigate(navHref(event.target.value));}}>
                <option value="all">All Categories</option>
                <option value="fashion">Fashion</option><option value="electronics">Electronics</option>
                <option value="home">Home & Kitchen</option><option value="beauty">Beauty</option>
              </select>
              <input id="efs2-search-field" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search for products, brands and more..." />
              <button type="submit" aria-label="Search"><FiSearch /></button>
            </form>
            <div className="efs2-utilities">
              <Link to="/store" className="efs2-utility efs2-deliver" title="Browse available delivery locations"><FiShoppingBag /><span><small>Deliver to</small><strong>Check availability</strong></span></Link>
              <Link to={user ? "/profile" : "/react/login"} className="efs2-utility"><FiUser /><span><small>{user ? `Hello, ${user.full_name?.split(" ")[0] || "Shopper"}` : "Hello, Sign In"}</small><strong>{user ? "My Account" : "Account & Orders"}</strong></span><FiChevronDown className="efs2-chevron" /></Link>
              <Link to="/store/cart" className="efs2-utility efs2-cart" aria-label={`Cart: ${count} items`}><FiShoppingCart /><b>{count}</b><strong>Cart</strong></Link>
              <button className="efs2-mobile-toggle" type="button" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={()=>setMobile(!mobile)}>{mobile ? <FiX /> : <FiMenu />}</button>
            </div>
          </div>
          <nav className={`efs2-nav ${mobile ? "efs2-nav-open" : ""}`} aria-label="Shop departments">
            <div className="efs2-nav-inner">
              <div className="efs2-category-control" ref={categoryRef}>
                <button type="button" className="efs2-category-toggle" onClick={()=>setCategoryOpen(!categoryOpen)} aria-expanded={categoryOpen} aria-controls="efs2-categories-menu"><FiMenu /> All Categories</button>
                {categoryOpen && <div id="efs2-categories-menu" className="efs2-category-popover rsh-header"><CategorySidebar roots={roots} childrenByParent={children} productsByRoot={productsByRoot} expandedIds={expandedIds} onToggle={toggleCategory} onNavigate={close} loading={catalogLoading} error={catalogError}/></div>}
              </div>
              {navItems.map(item => <Link key={item.key} to={navHref(item.key)} onClick={close} className={`efs2-nav-link ${location.pathname.startsWith('/categories/') && navHref(item.key)===location.pathname ? 'is-current' : ''}`}>{item.label}{["fashion","electronics","home","beauty","sports","toys"].includes(item.key) && <FiChevronDown />}</Link>)}
              {user?.role === "user" && <Link className="efs2-nav-link" to="/orders" onClick={close}>Orders</Link>}
            </div>
          </nav>
        </header>
      </>
    );
  }

  return (
    <>
      <style>{HEADER_STYLES}</style>
      <div className="efs-luxe-announcement"><strong>✧ &nbsp; Grand Launch Collection</strong><span>Fashion · Electronics · Home · Everyday essentials</span><Link to="/store">Explore the collection →</Link></div>
      <header className={`ec-site-header rsh-header efs-luxe-header${isAdmin ? " rsh-header--admin" : ""}`}>

        <div className="ec-site-inner rsh-main-row">
          <Link to={isAdmin ? "/admin" : "/"} onClick={close} className="ec-site-brand">
            EasyFindStore
            <span>{isAdmin ? "ADMIN PORTAL" : ""}</span>
          </Link>

          {!isAdmin && <form className="efs-luxe-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(search.trim() ? `/store?q=${encodeURIComponent(search.trim())}` : "/store"); }}>
            <label htmlFor="efs-luxe-search-input" className="efs-sr-only">Search the store</label>
            <input id="efs-luxe-search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for products, brands and more..." />
            <button type="submit" aria-label="Search products"><FiSearch /></button>
          </form>}
          <button
            className="ec-site-toggle rsh-mobile-toggle"
            type="button"
            aria-expanded={mobile}
            aria-controls="rsh-main-menu"
            aria-label={mobile ? "Close menu" : "Open menu"}
            onClick={() => setMobile((current) => !current)}
          >
            {mobile ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>

          <nav id="rsh-main-menu" aria-label="Main menu" className={`ec-site-nav rsh-main-nav ${mobile ? "is-open" : ""}`}>
            {isAdmin ? (
              <>
                <Link to="/admin" onClick={close} className={activeClass("/admin")}>Dashboard</Link>
                <Link to="/admin/orders" onClick={close} className={activeClass("/admin/orders", true)}>
                  Orders {newOrders > 0 && <b className="ec-site-badge alert">{newOrders}</b>}
                </Link>
                <Link to="/admin/catalog" onClick={close} className={activeClass("/admin/catalog", true)}>Products</Link>
                <Link to="/admin/customers" onClick={close} className={activeClass("/admin/customers", true)}>Customers</Link>
                <Link to="/admin/complaints" onClick={close} className={activeClass("/admin/complaints", true)}>
                  Complaints {supportCounts.complaints > 0 && <b className="ec-site-badge alert">{supportCounts.complaints}</b>}
                </Link>
                <Link to="/admin/enquiries" onClick={close} className={activeClass("/admin/enquiries", true)}>
                  Enquiries {supportCounts.enquiries > 0 && <b className="ec-site-badge alert">{supportCounts.enquiries}</b>}
                </Link>
                <Link to="/admin/offers" onClick={close} className={activeClass("/admin/offers", true)}>Offers & Coupons</Link>
                <Link to="/admin/delivery-pricing" onClick={close} className={activeClass("/admin/delivery-pricing", true)}>Delivery Charges</Link>
                <Link to="/admin/service-areas" onClick={close} className={activeClass("/admin/service-areas", true)}>Service Areas</Link>
                <Link to="/admin/payment-transactions" onClick={close} className={activeClass("/admin/payment-transactions", true)}>Payments</Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={close} className={activeClass("/")}>Home</Link>
                <Link to="/store" onClick={close} className={activeClass("/store")}>Shop All</Link>

                <div className="rsh-catalog-nav" ref={categoryRef}>
                  <button
                    type="button"
                    className={`rsh-catalog-toggle${categoryPageActive ? " rsh-active-link" : ""}`}
                    aria-current={categoryPageActive ? "page" : undefined}
                    aria-haspopup="true"
                    aria-expanded={categoryOpen}
                    aria-controls="rsh-catalog-panel"
                    onClick={() => setCategoryOpen((current) => !current)}
                  >
                    Shop Categories <FiChevronDown aria-hidden="true" />
                  </button>
                  {categoryOpen && (
                    <div id="rsh-catalog-panel" className="rsh-catalog-popover">
                      <CategorySidebar
                        roots={roots}
                        childrenByParent={children}
                        productsByRoot={productsByRoot}
                        expandedIds={expandedIds}
                        onToggle={toggleCategory}
                        onNavigate={close}
                        loading={catalogLoading}
                        error={catalogError}
                      />
                    </div>
                  )}
                </div>

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
                <Link
                  to={isAdmin ? "/admin/profile" : "/profile"}
                  onClick={close}
                  className={`ec-site-user ${activeClass(isAdmin ? "/admin/profile" : "/profile") ?? ""}`}
                  aria-label="My Profile"
                >
                  My Profile
                </Link>
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
