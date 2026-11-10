import type { CatalogCategory, CatalogItem } from "../services/coreCommerceApi";

/** One resolver for stable ID links and pre-existing category/product slug URLs. */
export function findCatalogDetail(
  categories: CatalogCategory[],
  route: { itemId?: string; categorySlug?: string; itemSlug?: string },
): { category: CatalogCategory; item: CatalogItem } | undefined {
  const { itemId, categorySlug, itemSlug } = route;
  if (itemId) {
    for (const category of categories) {
      const item = (category.items || []).find(product =>
        (product.id === itemId || product.variants?.some(v => v.id === itemId)) &&
        product.is_active !== false,
      );
      if (item) return { category, item };
    }
    return undefined;
  }
  if (!itemSlug) return undefined;
  const category = categories.find(c => c.slug === categorySlug || c.id === categorySlug);
  if (category) {
    const item = (category.items || []).find(product =>
      (product.slug === itemSlug || product.id === itemSlug) && product.is_active !== false,
    );
    if (item) return { category, item };
  }
  // Legacy slugs can outlive a category rename. Do not guess if ambiguous.
  const matches = categories.flatMap(c => (c.items || [])
    .filter(product => (product.slug === itemSlug || product.id === itemSlug) && product.is_active !== false)
    .map(item => ({ category: c, item })));
  return matches.length === 1 ? matches[0] : undefined;
}
