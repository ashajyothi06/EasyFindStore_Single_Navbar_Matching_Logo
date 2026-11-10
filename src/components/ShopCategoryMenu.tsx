import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CatalogCategory } from "../services/coreCommerceApi";

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function getChildren(categories: CatalogCategory[], parentId: string) {
  return categories.filter((category) => (category.parent_id || "") === parentId);
}

function groupNames(category: CatalogCategory): string[] {
  const names = new Map<string, string>();
  for (const item of category.items || []) {
    const group = (item.group_name || "").trim();
    if (group) names.set(group.toLocaleLowerCase(), group);
  }
  return [...names.values()];
}

function CategoryBranch({ category, categories, close, visited = [] }: {
  category: CatalogCategory;
  categories: CatalogCategory[];
  close: () => void;
  visited?: string[];
}) {
  if (visited.includes(category.id)) return null;
  const descendants = getChildren(categories, category.id);
  const groups = groupNames(category);
  const nextVisited = [...visited, category.id];
  return <div className="ec-shop-branch">
    <Link className="ec-shop-category-name" onClick={close} to={`/categories/${encodeURIComponent(category.slug)}`}>
      {category.name}
    </Link>
    {(descendants.length > 0 || groups.length > 0) && <div className="ec-shop-children">
      {descendants.map((child) => <CategoryBranch key={child.id} category={child} categories={categories} close={close} visited={nextVisited} />)}
      {groups.map((group) => <Link key={group} onClick={close} to={`/categories/${encodeURIComponent(category.slug)}?group=${encodeURIComponent(group)}`}>{group}</Link>)}
    </div>}
  </div>;
}

export function ShopCategoryMenu({ close }: { close: () => void }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${BASE}/react/api/catalog/categories`, { credentials: "include", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Category menu is unavailable");
        return response.json();
      })
      .then((result) => setCategories(Array.isArray(result.categories) ? result.categories : []))
      .catch(() => { /* Show the All Products link as a fallback. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => { setOpened(false); }, [location.pathname, location.search]);
  const categoryIds = new Set(categories.map((category) => category.id));
  const roots = categories.filter((category) => !category.parent_id || !categoryIds.has(category.parent_id) || category.parent_id === category.id);
  function go() { setOpened(false); close(); }
  return <div className="ec-shop-menu">
    <button type="button" className="ec-shop-trigger" aria-expanded={opened} aria-controls="ec-shop-contents" onClick={() => setOpened((current) => !current)}>Shop Categories <span aria-hidden="true">▾</span></button>
    {opened && <div id="ec-shop-contents" className="ec-shop-dropdown" role="navigation" aria-label="Product categories and subcategories">
      <Link className="ec-shop-all" to="/categories" onClick={go}>All Products</Link>
      {roots.map((category) => <CategoryBranch category={category} categories={categories} close={go} key={category.id} />)}
      {!roots.length && <p className="ec-shop-empty">Categories will appear after products are added.</p>}
    </div>}
  </div>;
}
