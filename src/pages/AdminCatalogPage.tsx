import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  deleteAdminCategory,
  deleteAdminItem,
  isCoreAuthenticationError,
  isCoreCsrfError,
  loadAdminCatalog,
  type CatalogCategory,
  type CoreApiResponse,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

/** Preserves the existing maroon/gold page theme without changing core-admin.css. */
const ADMIN_CATALOG_PAGE_STYLES = `
  .ca-page.rudra-admin-catalog-page {
    --rudra-maroon: #55111f;
    --rudra-maroon-deep: #3b0a15;
    --rudra-maroon-hover: #6b1d30;
    --rudra-gold: #c89d55;
    --rudra-paper: #fffaf5;
    --rudra-soft: #f9f0e9;
    --rudra-ink: #291b20;
    --rudra-muted: #75646a;
    --rudra-border: #e9d9d0;
    --rudra-gutter: clamp(16px, 2.4vw, 48px);
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    min-height: 100%;
    margin: 0 !important;
    padding: 30px var(--rudra-gutter) 64px !important;
    box-sizing: border-box;
    background: var(--rudra-paper);
    color: var(--rudra-ink);
    overflow-x: clip;
  }
  .ca-page.rudra-admin-catalog-page *,
  .ca-page.rudra-admin-catalog-page *::before,
  .ca-page.rudra-admin-catalog-page *::after {
    box-sizing: border-box;
  }
  .ca-page.rudra-admin-catalog-page .ca-page-container {
    display: block;
    width: 100% !important;
    min-width: 0;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px 24px;
    margin: 0 0 24px;
    padding: 0 0 22px;
    border-bottom: 1px solid var(--rudra-border);
  }
  .ca-page.rudra-admin-catalog-page .ca-eyebrow {
    color: var(--rudra-maroon);
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
  }
  .ca-page.rudra-admin-catalog-page .ca-heading h1 {
    margin: 5px 0 9px;
    color: var(--rudra-maroon-deep);
    font-size: clamp(1.65rem, 2.4vw, 2.55rem);
    line-height: 1.18;
    letter-spacing: -.035em;
    font-weight: 800;
  }
  .ca-page.rudra-admin-catalog-page .ca-heading p,
  .ca-page.rudra-admin-catalog-page .ca-catalog-card p,
  .ca-page.rudra-admin-catalog-page .ca-empty p {
    color: var(--rudra-muted);
    line-height: 1.55;
  }
  .ca-page.rudra-admin-catalog-page .ca-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .ca-page.rudra-admin-catalog-page .ca-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    gap: 6px;
    padding: 9px 15px;
    border-radius: 10px;
    font: inherit;
    font-size: .87rem;
    font-weight: 750;
    line-height: 1.3;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.small {
    min-height: 34px;
    padding: 7px 11px;
    font-size: .78rem;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.primary {
    border: 1px solid var(--rudra-maroon) !important;
    background: var(--rudra-maroon) !important;
    color: #fff !important;
    box-shadow: 0 5px 13px rgba(85,17,31,.14);
  }
  .ca-page.rudra-admin-catalog-page .ca-button.primary:hover {
    background: var(--rudra-maroon-hover) !important;
    border-color: var(--rudra-maroon-hover) !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.secondary {
    border: 1px solid #d7b6ba !important;
    background: #fff !important;
    color: var(--rudra-maroon) !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.secondary:hover {
    border-color: var(--rudra-maroon) !important;
    background: var(--rudra-soft) !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.success {
    border: 1px solid #b58c48 !important;
    background: #e8c98d !important;
    color: var(--rudra-maroon-deep) !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.success:hover {
    background: #dbba7e !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.danger {
    border: 1px solid #e9b5b2 !important;
    background: #fff7f5 !important;
    color: #a12c34 !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button.danger:hover {
    background: #ffe8e5 !important;
    border-color: #ca7977 !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
  .ca-page.rudra-admin-catalog-page :is(button, a, input, select):focus-visible {
    outline: 3px solid rgba(200,157,85,.55);
    outline-offset: 2px;
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-card,
  .ca-page.rudra-admin-catalog-page .ca-stat-grid > article,
  .ca-page.rudra-admin-catalog-page .ca-empty,
  .ca-page.rudra-admin-catalog-page .ca-loading {
    background: #fff !important;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 18px;
    box-shadow: 0 8px 26px rgba(60,19,31,.045);
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-card {
    min-width: 0;
    padding: clamp(16px, 1.5vw, 24px);
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-card h2 {
    color: var(--rudra-maroon-deep);
    font-weight: 800;
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-list {
    display: grid;
    gap: 18px;
    min-width: 0;
    width: 100%;
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    min-width: 0;
    margin-bottom: 16px;
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-title {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    min-width: 0;
    flex: 1 1 350px;
  }
  .ca-page.rudra-admin-catalog-page .ca-catalog-title > div:last-child,
  .ca-page.rudra-admin-catalog-page .ca-item-cell > div:last-child {
    min-width: 0;
  }
  .ca-page.rudra-admin-catalog-page .ca-title-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .ca-page.rudra-admin-catalog-page .ca-title-line h2 {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .ca-page.rudra-admin-catalog-page .ca-category-thumb,
  .ca-page.rudra-admin-catalog-page .ca-item-thumb {
    flex: 0 0 auto;
    overflow: hidden;
    object-fit: cover;
    background: var(--rudra-soft);
    border: 1px solid var(--rudra-border);
    border-radius: 11px;
  }
  .ca-page.rudra-admin-catalog-page .ca-category-thumb.placeholder,
  .ca-page.rudra-admin-catalog-page .ca-item-thumb.placeholder {
    color: var(--rudra-maroon);
    font-weight: 800;
  }
  .ca-page.rudra-admin-catalog-page .ca-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 17px;
    color: var(--rudra-muted);
    font-size: .84rem;
  }
  .ca-page.rudra-admin-catalog-page .ca-meta-row strong { color: var(--rudra-maroon); }
  .ca-page.rudra-admin-catalog-page .ca-stat-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }
  .ca-page.rudra-admin-catalog-page .ca-stat-grid > article {
    min-width: 0;
    padding: 19px;
    border-top: 3px solid var(--rudra-gold) !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-stat-grid strong {
    display: block;
    margin-bottom: 5px;
    color: var(--rudra-maroon);
    font-size: clamp(1.35rem, 1.8vw, 1.85rem);
    font-weight: 850;
  }
  .ca-page.rudra-admin-catalog-page .ca-stat-grid span {
    color: var(--rudra-muted);
    font-weight: 650;
    font-size: .8rem;
  }
  .ca-page.rudra-admin-catalog-page input:not([type="checkbox"]),
  .ca-page.rudra-admin-catalog-page select {
    border: 1px solid var(--rudra-border) !important;
    background-color: #fff !important;
    color: var(--rudra-ink) !important;
    border-radius: 10px;
    accent-color: var(--rudra-maroon);
  }
  .ca-page.rudra-admin-catalog-page input:not([type="checkbox"]):focus,
  .ca-page.rudra-admin-catalog-page select:focus {
    border-color: var(--rudra-maroon) !important;
    box-shadow: 0 0 0 3px rgba(85,17,31,.1);
  }
  .ca-page.rudra-admin-catalog-page .ca-table-wrap {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    scrollbar-color: #d4b4b7 #fbf4ef;
  }
  .ca-page.rudra-admin-catalog-page .ca-table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    background: #fff;
  }
  .ca-page.rudra-admin-catalog-page .ca-table th {
    padding: 13px 14px;
    border-bottom: 1px solid #7c3240;
    background: var(--rudra-maroon) !important;
    color: #fff !important;
    text-align: left;
    white-space: nowrap;
    font-size: .78rem;
    letter-spacing: .02em;
  }
  .ca-page.rudra-admin-catalog-page .ca-table td {
    padding: 13px 14px;
    border-bottom: 1px solid #f0e6e0;
    color: var(--rudra-ink);
    vertical-align: middle;
    font-size: .86rem;
  }
  .ca-page.rudra-admin-catalog-page .ca-table tbody tr:nth-child(even) { background: #fffaf7; }
  .ca-page.rudra-admin-catalog-page .ca-table tbody tr:hover { background: #fcf1eb; }
  .ca-page.rudra-admin-catalog-page .ca-table tbody tr:last-child td { border-bottom: 0; }
  .ca-page.rudra-admin-catalog-page .ca-table td strong { color: var(--rudra-maroon-deep); }
  .ca-page.rudra-admin-catalog-page .ca-table td small { display: block; color: var(--rudra-muted); }
  .ca-page.rudra-admin-catalog-page .ca-item-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .ca-page.rudra-admin-catalog-page .ca-mini-tag {
    display: inline-flex;
    margin-left: 7px;
    padding: 2px 7px;
    border: 1px solid #e5c486;
    border-radius: 999px;
    background: #fff2d4;
    color: var(--rudra-maroon);
    font-size: .67rem;
  }
  .ca-page.rudra-admin-catalog-page .ca-status {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: .74rem;
    font-weight: 750;
    white-space: nowrap;
  }
  .ca-page.rudra-admin-catalog-page .ca-status.success {
    background: #e8f5e8 !important;
    color: #247344 !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-status.danger {
    background: #fff0ed !important;
    color: #ad3943 !important;
  }
  .ca-page.rudra-admin-catalog-page .ca-low-stock { color: #ae4230; font-weight: 800; }
  .ca-page.rudra-admin-catalog-page .ca-alert {
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    padding: 12px 15px;
    margin-bottom: 16px;
  }
  .ca-page.rudra-admin-catalog-page .ca-alert.success { background: #f1faf2; color: #246d44; }
  .ca-page.rudra-admin-catalog-page .ca-alert.warning { background: #fff7e8; color: #86550b; }
  .ca-page.rudra-admin-catalog-page .ca-alert.danger { background: #fff0ef; color: #9c2934; }
  .ca-page.rudra-admin-catalog-page .ca-empty,
  .ca-page.rudra-admin-catalog-page .ca-loading { padding: 30px 20px; text-align: center; }
  .ca-page.rudra-admin-catalog-page .ca-empty.compact { box-shadow: none; background: var(--rudra-paper) !important; }
  .ca-page.rudra-admin-catalog-page .ca-empty h2 { color: var(--rudra-maroon-deep); }
  .ca-page.rudra-admin-catalog-page .ca-coupon-bar {
    margin-bottom: 10px;
    color: var(--rudra-muted);
  }
  .ca-page.rudra-admin-catalog-page a:not(.ca-button) { color: var(--rudra-maroon); }
  .ca-page.rudra-admin-catalog-page a:not(.ca-button):hover { color: var(--rudra-maroon-hover); }
  @media (max-width: 1100px) {
    .ca-page.rudra-admin-catalog-page .ca-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .ca-page.rudra-admin-catalog-page { --rudra-gutter: 20px; padding-top: 20px !important; padding-bottom: 44px !important; }
    .ca-page.rudra-admin-catalog-page .ca-heading { align-items: stretch; }
    .ca-page.rudra-admin-catalog-page .ca-heading .ca-actions { width: 100%; }
    .ca-page.rudra-admin-catalog-page .ca-heading .ca-button { flex: 1 1 auto; }
    .ca-page.rudra-admin-catalog-page .ca-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .ca-page.rudra-admin-catalog-page .ca-stat-grid > article { padding: 13px; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-card { padding: 15px; border-radius: 14px; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-title { flex-basis: 100%; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-header > .ca-actions { width: 100%; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-header > .ca-actions > * { flex: 1 1 auto; }
    .ca-page.rudra-admin-catalog-page .ca-table { min-width: 690px; }
  }
  @media (max-width: 480px) {
    .ca-page.rudra-admin-catalog-page { --rudra-gutter: 16px; }
    .ca-page.rudra-admin-catalog-page .ca-heading h1 { font-size: 1.6rem; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-title { gap: 10px; }
    .ca-page.rudra-admin-catalog-page .ca-catalog-list { gap: 12px; }
    .ca-page.rudra-admin-catalog-page .ca-stat-grid span { font-size: .72rem; }
    .ca-page.rudra-admin-catalog-page .ca-actions .ca-button { white-space: normal; }
  }
  /* Lightweight incremental result controls use the existing button theme. */
  .ca-page.rudra-admin-catalog-page .ca-catalog-more-row,
  .ca-page.rudra-admin-catalog-page .ca-more-categories {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px;
  }
`;


function money(value: unknown): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

// Limit only DOM rendering. Filtering and summary counts still use the full API data.
const CATEGORIES_PER_BATCH = 8;
const ITEMS_PER_BATCH = 25;
type CatalogItem = NonNullable<CatalogCategory["items"]>[number];
type SearchScope = "all" | "categories" | "items";
type Notice = { type: "success" | "warning" | "danger"; text: string };

type IndexedItem = {
  item: CatalogItem;
  searchText: string;
  stock: number;
};
type IndexedCategory = {
  category: CatalogCategory;
  searchText: string;
  items: IndexedItem[];
};
type CategoryView = { indexed: IndexedCategory; items: IndexedItem[] };

const toSearch = (...parts: unknown[]) =>
  parts.filter((part) => part !== null && part !== undefined).join(" ").toLowerCase();

function indexCategories(categories: CatalogCategory[]): IndexedCategory[] {
  return [...categories]
    .sort((left, right) => {
      const a = Number(left.serial_number || 0);
      const b = Number(right.serial_number || 0);
      const first = a > 0 ? a : Number.MAX_SAFE_INTEGER;
      const second = b > 0 ? b : Number.MAX_SAFE_INTEGER;
      if (first !== second) return first - second;
      const fallback = Number(left.sort_order || 0) - Number(right.sort_order || 0);
      return fallback || String(left.name || "").localeCompare(String(right.name || ""));
    })
    .map((category) => ({
      category,
      searchText: toSearch(category.name, category.slug, category.description, category.serial_number),
      items: (category.items || [])
        .filter((item) => !item.parent_product_id)
        .map((item) => ({
          item,
          searchText: toSearch(item.name, item.sku, item.slug, item.group_name, item.size, item.unit_label),
          stock: Number(item.variants?.length
            ? item.variants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
            : item.stock_quantity || 0),
        })),
    }));
}

const ItemRow = memo(function ItemRow({
  indexed,
  categoryId,
  deleting,
  onRemove,
}: {
  indexed: IndexedItem;
  categoryId: string;
  deleting: boolean;
  onRemove: (categoryId: string, itemId: string, itemName: string) => void;
}) {
  const { item, stock } = indexed;
  return (
    <tr>
      <td>
        <div className="ca-item-cell">
          {item.image_url ? (
            <img className="ca-item-thumb" src={item.image_url} alt={item.name || "Product"}
              loading="lazy" decoding="async" />
          ) : (
            <div className="ca-item-thumb placeholder">{String(item.name || "?").charAt(0).toUpperCase()}</div>
          )}
          <div>
            <strong>{item.name}</strong>
            {item.is_featured && <span className="ca-mini-tag">Featured</span>}
            <small>{item.group_name ? `${item.group_name} · ` : ""}/{item.slug}</small>
          </div>
        </div>
      </td>
      <td>{item.sku || "—"}</td>
      <td>{item.size || "—"}{item.unit_label ? ` / ${item.unit_label}` : ""}</td>
      <td>
        <strong>{money(item.price)}</strong>
        {item.compare_price ? <small><s>{money(item.compare_price)}</s></small> : null}
      </td>
      <td><span className={stock <= 5 ? "ca-low-stock" : ""}>{stock}</span></td>
      <td><span className={`ca-status ${item.is_active ? "success" : "danger"}`}>
        {item.is_active ? "Active" : "Inactive"}
      </span></td>
      <td>
        <div className="ca-actions">
          <Link className="ca-button secondary small" to={`/admin/catalog/categories/${categoryId}/items/${item.id}/edit`}>Edit</Link>
          <button className="ca-button danger small" type="button" disabled={deleting}
            onClick={() => onRemove(categoryId, item.id, item.name)}>Delete</button>
        </div>
      </td>
    </tr>
  );
});

const CategoryCard = memo(function CategoryCard({
  view,
  working,
  onRemoveCategory,
  onRemoveItem,
}: {
  view: CategoryView;
  working: string;
  onRemoveCategory: (category: CatalogCategory) => void;
  onRemoveItem: (categoryId: string, itemId: string, itemName: string) => void;
}) {
  const { category } = view.indexed;
  const { items } = view;
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_BATCH);

  // Reset only this category's incremental item list when its search result changes.
  useEffect(() => { setVisibleItems(ITEMS_PER_BATCH); }, [items]);
  const shownItems = useMemo(() => items.slice(0, visibleItems), [items, visibleItems]);

  return (
    <article className="ca-catalog-card">
      <div className="ca-catalog-header">
        <div className="ca-catalog-title">
          {category.image_url ? (
            <img className="ca-category-thumb" src={category.image_url} alt={category.name}
              loading="lazy" decoding="async" />
          ) : (
            <div className="ca-category-thumb placeholder">{String(category.name || "?").charAt(0).toUpperCase()}</div>
          )}
          <div>
            <div className="ca-title-line">
              <h2>{category.name}</h2>
              <span className={`ca-status ${category.is_active ? "success" : "danger"}`}>
                {category.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p>{category.description || "No category description added."}</p>
            <div className="ca-meta-row">
              <span>Slug: {category.slug}</span>
              <span>Serial: <strong>#{Number(category.serial_number || 0) || "—"}</strong></span>
              <span>{items.length} item(s)</span>
            </div>
          </div>
        </div>
        <div className="ca-actions">
          <Link className="ca-button success small" to={`/admin/catalog/categories/${category.id}/items/new`}>Add Item</Link>
          <Link className="ca-button secondary small" to={`/admin/catalog/categories/${category.id}/edit`}>Edit Category</Link>
          <button className="ca-button danger small" type="button"
            onClick={() => onRemoveCategory(category)} disabled={working === `category-${category.id}`}>
            Delete Category
          </button>
        </div>
      </div>

      {items.length ? (
        <>
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead><tr>
                <th>Item</th><th>SKU</th><th>Size</th><th>Price</th>
                <th>Stock</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {shownItems.map((indexed) => (
                  <ItemRow key={indexed.item.id} indexed={indexed} categoryId={category.id}
                    deleting={working === `item-${indexed.item.id}`} onRemove={onRemoveItem} />
                ))}
              </tbody>
            </table>
          </div>
          {items.length > visibleItems && (
            <div className="ca-catalog-more-row">
              <span className="ca-meta-row">Showing {shownItems.length} of {items.length} items</span>
              <button className="ca-button secondary small" type="button"
                onClick={() => setVisibleItems((count) => Math.min(items.length, count + ITEMS_PER_BATCH))}>
                Show more items
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="ca-empty compact">
          <p>No items are available in this category.</p>
          <Link className="ca-button primary small" to={`/admin/catalog/categories/${category.id}/items/new`}>Add First Item</Link>
        </div>
      )}
    </article>
  );
});

const FILTER_GRID_STYLE = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px", alignItems: "end",
} as const;
const FILTER_LABEL_STYLE = { display: "grid", gap: "6px", minWidth: 0 } as const;
const FILTER_INPUT_STYLE = {
  width: "100%", minHeight: "42px", padding: "9px 12px", border: "1px solid #d8dde5",
  borderRadius: "10px", font: "inherit", background: "#fff",
} as const;

export function AdminCatalogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<CoreApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [serialStart, setSerialStart] = useState("");
  const [serialEnd, setSerialEnd] = useState("");
  const [visibleCategories, setVisibleCategories] = useState(CATEGORIES_PER_BATCH);
  const [notice, setNotice] = useState<Notice | null>(null);
  const requestSequence = useRef(0);
  const mounted = useRef(false);
  const mutationBusy = useRef(false);

  const load = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current;
    if (initial) setLoading(true);
    try {
      const result = await loadAdminCatalog();
      if (!mounted.current || sequence !== requestSequence.current) return;
      setData(result);
    } catch (error) {
      if (!mounted.current || sequence !== requestSequence.current) return;
      if (isCoreAuthenticationError(error)) {
        navigate(`/react/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }
      setNotice({
        type: "danger",
        text: error instanceof Error ? error.message : "Unable to load the catalogue.",
      });
    } finally {
      if (mounted.current && sequence === requestSequence.current) setLoading(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    mounted.current = true;
    void load(true);
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [load]);

  const onRemoveCategory = useCallback(async (category: CatalogCategory) => {
    if (!data?.csrf_token || mutationBusy.current) return;
    if (!window.confirm(`Delete "${category.name}" and every item inside it?`)) return;
    mutationBusy.current = true;
    ++requestSequence.current; // Older fetches may not restore deleted data.
    setWorking(`category-${category.id}`);
    setNotice(null);
    try {
      const response = await deleteAdminCategory(category.id, data.csrf_token);
      if (!mounted.current) return;
      setData((current) => current ? ({
        ...current,
        categories: (current.categories || []).filter((entry) => entry.id !== category.id),
      }) : current);
      setNotice({ type: "success", text: response.message || "Category deleted." });
      window.dispatchEvent(new Event("admin-dashboard-updated"));
      await load(); // Silent reconciliation; no full-screen loading state.
    } catch (error) {
      if (!mounted.current) return;
      if (isCoreCsrfError(error)) { window.location.reload(); return; }
      setNotice({ type: "danger", text: error instanceof Error ? error.message : "Unable to delete the category." });
    } finally {
      mutationBusy.current = false;
      if (mounted.current) setWorking("");
    }
  }, [data?.csrf_token, load]);

  const onRemoveItem = useCallback(async (categoryId: string, itemId: string, itemName: string) => {
    if (!data?.csrf_token || mutationBusy.current) return;
    if (!window.confirm(`Delete the product "${itemName}"?`)) return;
    mutationBusy.current = true;
    ++requestSequence.current;
    setWorking(`item-${itemId}`);
    setNotice(null);
    try {
      const response = await deleteAdminItem(categoryId, itemId, data.csrf_token);
      if (!mounted.current) return;
      setData((current) => current ? ({
        ...current,
        categories: (current.categories || []).map((category) => category.id !== categoryId ? category : ({
          ...category,
          items: (category.items || []).filter((item) => item.id !== itemId && item.parent_product_id !== itemId),
        })),
      }) : current);
      setNotice({ type: "success", text: response.message || "Catalogue item deleted." });
      window.dispatchEvent(new Event("admin-dashboard-updated"));
      await load();
    } catch (error) {
      if (!mounted.current) return;
      if (isCoreCsrfError(error)) { window.location.reload(); return; }
      setNotice({ type: "danger", text: error instanceof Error ? error.message : "Unable to delete the item." });
    } finally {
      mutationBusy.current = false;
      if (mounted.current) setWorking("");
    }
  }, [data?.csrf_token, load]);

  // Expensive sorting, stock totals, parent filtering and searchable text are prepared
  // once when the catalogue changes, not every time an input is typed into.
  const indexedCategories = useMemo(
    () => indexCategories((data?.categories || []) as CatalogCategory[]),
    [data?.categories],
  );

  const query = deferredSearch.trim().toLowerCase();
  const start = serialStart.trim() ? Number(serialStart) : null;
  const end = serialEnd.trim() ? Number(serialEnd) : null;
  const serialRangeInvalid = start !== null && end !== null && Number.isFinite(start) && Number.isFinite(end) && start > end;

  const filteredCategories = useMemo<CategoryView[]>(() => {
    const results: CategoryView[] = [];
    for (const indexed of indexedCategories) {
      const serial = Number(indexed.category.serial_number || 0);
      if (start !== null && Number.isFinite(start) && serial < start) continue;
      if (end !== null && Number.isFinite(end) && serial > end) continue;
      if (!query) {
        results.push({ indexed, items: indexed.items });
        continue;
      }
      const categoryMatches = indexed.searchText.includes(query);
      if (searchScope === "categories") {
        if (categoryMatches) results.push({ indexed, items: indexed.items });
        continue;
      }
      if (searchScope === "all" && categoryMatches) {
        results.push({ indexed, items: indexed.items });
        continue;
      }
      const matching = indexed.items.filter((entry) => entry.searchText.includes(query));
      if (matching.length) results.push({ indexed, items: matching });
    }
    return results;
  }, [indexedCategories, query, searchScope, start, end]);

  useEffect(() => { setVisibleCategories(CATEGORIES_PER_BATCH); }, [query, searchScope, serialStart, serialEnd]);
  const shownCategories = useMemo(
    () => filteredCategories.slice(0, visibleCategories),
    [filteredCategories, visibleCategories],
  );
  const visibleItemCount = useMemo(
    () => filteredCategories.reduce((sum, view) => sum + view.items.length, 0),
    [filteredCategories],
  );
  const hasActiveFilters = Boolean(searchTerm.trim() || serialStart.trim() || serialEnd.trim() || searchScope !== "all");
  const summary = (data?.summary || {}) as Record<string, unknown>;

  const clearFilters = useCallback(() => {
    setSearchTerm(""); setSearchScope("all"); setSerialStart(""); setSerialEnd("");
  }, []);

  if (loading && !data) {
    return (
      <main className="ca-page rudra-admin-catalog-page">
        <style>{ADMIN_CATALOG_PAGE_STYLES}</style>
        <div className="ca-coupon-bar"><a href="/admin/catalog/sales">Bulk Product Sales →</a> · <a href="/admin/coupons">Product Coupons →</a></div>
        <div style={{ padding: "12px 24px" }}>
          <Link className="ca-button secondary" to="/admin/service-areas">Manage delivery area / pincode rules</Link>{" "}
          <Link className="ca-button secondary" to="/admin/delivery-pricing">Manage delivery charges</Link>
        </div>
        <div className="ca-page-container"><div className="ca-loading">Loading product catalogue…</div></div>
      </main>
    );
  }

  return (
    <main className="ca-page rudra-admin-catalog-page">
      <style>{ADMIN_CATALOG_PAGE_STYLES}</style>
      <div className="ca-page-container">
        <section className="ca-heading">
          <div>
            <span className="ca-eyebrow">Dynamic catalogue</span>
            <h1>Product Categories &amp; Items</h1>
            <p>Create, edit, activate, deactivate and delete product categories and products.</p>
          </div>
          <div className="ca-actions">
            <Link className="ca-button secondary" to="/admin">Back to Admin</Link>
            <Link className="ca-button primary" to="/admin/catalog/categories/new">Create Category</Link>
          </div>
        </section>
        {notice && <div className={`ca-alert ${notice.type}`} role={notice.type === "danger" ? "alert" : "status"}>{notice.text}</div>}

        <section className="ca-catalog-card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div>
              <span className="ca-eyebrow">Advanced filters</span>
              <h2 style={{ margin: "4px 0 6px" }}>Search &amp; Serial Range</h2>
              <p style={{ margin: 0 }}>Search categories or items and limit the category list to an inclusive serial-number range.</p>
            </div>
            {hasActiveFilters && <button className="ca-button secondary small" type="button" onClick={clearFilters}>Clear Filters</button>}
          </div>

          <div style={FILTER_GRID_STYLE}>
            <label style={FILTER_LABEL_STYLE}>
              <strong>Search</strong>
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Category, item, SKU, slug, group..." style={FILTER_INPUT_STYLE} />
            </label>
            <label style={FILTER_LABEL_STYLE}>
              <strong>Search in</strong>
              <select value={searchScope} onChange={(event) => setSearchScope(event.target.value as SearchScope)} style={FILTER_INPUT_STYLE}>
                <option value="all">Categories + Items</option>
                <option value="categories">Categories only</option>
                <option value="items">Items only</option>
              </select>
            </label>
            <label style={FILTER_LABEL_STYLE}>
              <strong>Start serial</strong>
              <input type="number" min="0" inputMode="numeric" value={serialStart}
                onChange={(event) => setSerialStart(event.target.value)} placeholder="e.g. 10" style={FILTER_INPUT_STYLE} />
            </label>
            <label style={FILTER_LABEL_STYLE}>
              <strong>End serial</strong>
              <input type="number" min="0" inputMode="numeric" value={serialEnd}
                onChange={(event) => setSerialEnd(event.target.value)} placeholder="e.g. 25" style={FILTER_INPUT_STYLE} />
            </label>
          </div>
          {serialRangeInvalid && (
            <div className="ca-alert warning" style={{ marginTop: "12px", marginBottom: 0 }}>
              Start serial must be less than or equal to end serial.
            </div>
          )}
          <div className="ca-meta-row" style={{ marginTop: "14px" }}>
            <span>Showing {filteredCategories.length} of {indexedCategories.length} categories</span>
            <span>{visibleItemCount} visible item(s)</span>
            {(serialStart.trim() || serialEnd.trim()) && <span>Serial range: {serialStart || "first"} → {serialEnd || "last"}</span>}
          </div>
        </section>

        <section className="ca-stat-grid five">
          <article><strong>{Number(summary.category_count || 0)}</strong><span>Total categories</span></article>
          <article><strong>{Number(summary.active_category_count || 0)}</strong><span>Active categories</span></article>
          <article><strong>{Number(summary.item_count || 0)}</strong><span>Total items</span></article>
          <article><strong>{Number(summary.active_item_count || 0)}</strong><span>Active items</span></article>
          <article><strong>{Number(summary.low_stock_count || 0)}</strong><span>Low-stock items</span></article>
        </section>

        {indexedCategories.length > 0 ? (
          filteredCategories.length > 0 && !serialRangeInvalid ? (
            <>
              <section className="ca-catalog-list">
                {shownCategories.map((view) => (
                  <CategoryCard key={view.indexed.category.id} view={view} working={working}
                    onRemoveCategory={onRemoveCategory} onRemoveItem={onRemoveItem} />
                ))}
              </section>
              {filteredCategories.length > visibleCategories && (
                <div className="ca-more-categories">
                  <span className="ca-meta-row">Showing {shownCategories.length} of {filteredCategories.length} categories</span>
                  <button className="ca-button secondary" type="button"
                    onClick={() => setVisibleCategories((count) => Math.min(filteredCategories.length, count + CATEGORIES_PER_BATCH))}>
                    Show more categories
                  </button>
                </div>
              )}
            </>
          ) : (
            <section className="ca-empty">
              <h2>No matching catalogue entries</h2>
              <p>No categories or items match the current search and serial range. Adjust the filters or clear them to show the full catalogue.</p>
              <button className="ca-button secondary" type="button" onClick={clearFilters}>Clear Filters</button>
            </section>
          )
        ) : (
          <section className="ca-empty">
            <h2>No catalogue categories yet</h2>
            <p>Create your first category and add any products you want to sell.</p>
            <div className="ca-actions centered">
              <Link className="ca-button primary" to="/admin/catalog/categories/new">Create First Category</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
