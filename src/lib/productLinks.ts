/** Use immutable catalogue IDs for detail URLs, not editable category/product slugs. */
export function productDetailHref(id: string, variantId?: string): string {
  const base = `/item/id/${encodeURIComponent(id)}`;
  return variantId ? `${base}?variant=${encodeURIComponent(variantId)}` : base;
}
