import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  clearSellerCatalog,
  isAuthenticationError,
  isCsrfError,
  loadSellerCatalog,
  type SellerCatalogCategory,
  type SellerCatalogPayload,
  updateSellerCatalog,
} from "../services/sellerCatalogApi";
import "../styles/seller-catalog-react.css"; 

type NoticeKind = "success" | "error" | "info";

interface Notice {
  kind: NoticeKind;
  text: string;
}

type DeliveryTimeFilter = "" | "morning" | "evening" | "both";
type DeliveryTypeFilter =
  | ""
  | "instant_delivery"
  | "one_day_delivery";

interface CatalogFilterOption {
  value: string;
  label: string;
}

interface SellerCatalogFilterOptions {
  product_types?: string[];
  delivery_time_slots?: CatalogFilterOption[];
  delivery_types?: CatalogFilterOption[];
}

type FilterableSellerCatalogCategory = SellerCatalogCategory & {
  product_type?: string;
  delivery_time_slot?: Exclude<DeliveryTimeFilter, "">;
  delivery_type?: Exclude<DeliveryTypeFilter, "">;
};

type FilterableSellerCatalogPayload = SellerCatalogPayload & {
  filter_options?: SellerCatalogFilterOptions;
};

interface CategoryMasterCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  categoryId: string;
  onChange: (categoryId: string, checked: boolean) => void;
}

function CategoryMasterCheckbox({
  checked,
  indeterminate,
  categoryId,
  onChange,
}: CategoryMasterCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(categoryId, event.target.checked)}
      aria-label={`Select all items in category ${categoryId}`}
    />
  );
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function deliveryTimeLabel(value: unknown): string {
  const normalized = normalizedText(value);
  if (normalized === "morning") return "Morning";
  if (normalized === "evening") return "Evening";
  return "Morning & Evening";
}

function deliveryTypeLabel(value: unknown): string {
  return normalizedText(value) === "instant_delivery"
    ? "Instant delivery"
    : "One-day delivery";
}

function getMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export function SellerCatalogPage() {
  const [payload, setPayload] =
    useState<FilterableSellerCatalogPayload | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [search, setSearch] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [deliveryTimeFilter, setDeliveryTimeFilter] =
    useState<DeliveryTimeFilter>("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] =
    useState<DeliveryTypeFilter>("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const categories = (payload?.active_categories || []) as
    FilterableSellerCatalogCategory[];
  const csrfToken = payload?.csrf_token || "";
  const currencySymbol = payload?.currency_symbol || "₹";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotice(null);

      try {
        const response = await loadSellerCatalog();

        if (cancelled) return;

        setPayload(response);
        setSelectedItemIds(
          new Set(response.selection?.selected_item_ids || []),
        );
      } catch (error) {
        if (cancelled) return;

        if (isAuthenticationError(error)) {
          window.location.assign(
            "/react/login?next=/seller/catalog-selection",
          );
          return;
        }

        setNotice({
          kind: "error",
          text: getMessage(error, "Unable to load the seller catalogue."),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const productTypeOptions = useMemo(() => {
    const values = new Set<string>();

    (payload?.filter_options?.product_types || []).forEach((value) => {
      const clean = String(value || "").trim();
      if (clean) values.add(clean);
    });

    categories.forEach((category) => {
      const clean = String(category.product_type || "").trim();
      if (clean) values.add(clean);
    });

    return Array.from(values).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [categories, payload?.filter_options?.product_types]);

  const visibleCategories = useMemo(() => {
    const query = normalizedText(search);

    return categories.filter((category) => {
      const categoryProductType = normalizedText(
        category.product_type,
      );
      const categoryDeliveryTime = normalizedText(
        category.delivery_time_slot || "both",
      );
      const categoryDeliveryType = normalizedText(
        category.delivery_type || "one_day_delivery",
      );

      if (
        productTypeFilter &&
        categoryProductType !== normalizedText(productTypeFilter)
      ) {
        return false;
      }

      if (deliveryTimeFilter) {
        const matchesDeliveryTime =
          deliveryTimeFilter === "both"
            ? categoryDeliveryTime === "both"
            : categoryDeliveryTime === deliveryTimeFilter ||
              categoryDeliveryTime === "both";

        if (!matchesDeliveryTime) return false;
      }

      if (
        deliveryTypeFilter &&
        categoryDeliveryType !== deliveryTypeFilter
      ) {
        return false;
      }

      if (!query) return true;

      const categoryText = [
        category.name,
        category.description,
        category.product_type,
        deliveryTimeLabel(category.delivery_time_slot),
        deliveryTypeLabel(category.delivery_type),
        ...category.items.flatMap((item) => [
          item.name,
          item.description,
          item.group_name,
          item.size,
          item.unit_label,
        ]),
      ]
        .map(normalizedText)
        .join(" ");

      return categoryText.includes(query);
    });
  }, [
    categories,
    deliveryTimeFilter,
    deliveryTypeFilter,
    productTypeFilter,
    search,
  ]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      productTypeFilter ||
      deliveryTimeFilter ||
      deliveryTypeFilter,
  );

  function clearFilters() {
    setSearch("");
    setProductTypeFilter("");
    setDeliveryTimeFilter("");
    setDeliveryTypeFilter("");
  }

  const selectionSummary = useMemo(() => {
    const categoryIds = new Set<string>();

    categories.forEach((category) => {
      if (
        category.items.some((item) => selectedItemIds.has(item.id))
      ) {
        categoryIds.add(category.id);
      }
    });

    return {
      categoryCount: categoryIds.size,
      itemCount: selectedItemIds.size,
    };
  }, [categories, selectedItemIds]);

  function categorySelection(category: SellerCatalogCategory) {
    const itemIds = category.items.map((item) => item.id);
    const selectedCount = itemIds.filter((id) =>
      selectedItemIds.has(id),
    ).length;

    return {
      checked: itemIds.length > 0 && selectedCount === itemIds.length,
      indeterminate:
        selectedCount > 0 && selectedCount < itemIds.length,
    };
  }

  function setCategory(categoryId: string, checked: boolean) {
    const category = categories.find(
      (entry) => entry.id === categoryId,
    );

    if (!category) return;

    setSelectedItemIds((current) => {
      const next = new Set(current);

      category.items.forEach((item) => {
        if (checked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      });

      return next;
    });
  }

  function toggleItem(
    itemId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const checked = event.target.checked;

    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });
  }

  function selectAllItems() {
    setSelectedItemIds(
      new Set(
        categories.flatMap((category) =>
          category.items.map((item) => item.id),
        ),
      ),
    );
  }

  function unselectAllItems() {
    setSelectedItemIds(new Set());
  }

  function getFullySelectedCategoryIds(): string[] {
    return categories
      .filter(
        (category) =>
          category.items.length > 0 &&
          category.items.every((item) =>
            selectedItemIds.has(item.id),
          ),
      )
      .map((category) => category.id);
  }

  async function submitSelection(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!csrfToken) {
      setNotice({
        kind: "error",
        text: "The security token is unavailable. Refresh the page.",
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await updateSellerCatalog(
        csrfToken,
        Array.from(selectedItemIds),
        getFullySelectedCategoryIds(),
      );

      setPayload(response);
      setSelectedItemIds(
        new Set(response.selection?.selected_item_ids || []),
      );
      setNotice({
        kind: "success",
        text:
          response.message ||
          "Seller catalogue updated successfully.",
      });
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      if (isAuthenticationError(error)) {
        window.location.assign(
          "/react/login?next=/seller/catalog-selection",
        );
        return;
      }

      setNotice({
        kind: "error",
        text: getMessage(
          error,
          "Unable to update the seller catalogue.",
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearSelection() {
    if (
      !window.confirm(
        "Unselect all categories and items?",
      )
    ) {
      return;
    }

    if (!csrfToken) {
      setNotice({
        kind: "error",
        text: "The security token is unavailable. Refresh the page.",
      });
      return;
    }

    setClearing(true);
    setNotice(null);

    try {
      const response = await clearSellerCatalog(csrfToken);

      setPayload(response);
      setSelectedItemIds(new Set());
      setNotice({
        kind: "success",
        text:
          response.message ||
          "All seller catalogue selections were cleared.",
      });
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      if (isAuthenticationError(error)) {
        window.location.assign(
          "/react/login?next=/seller/catalog-selection",
        );
        return;
      }

      setNotice({
        kind: "error",
        text: getMessage(
          error,
          "Unable to clear the seller catalogue.",
        ),
      });
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <main className="seller-catalog-react-page">
        <section
          className="seller-catalog-loading"
          aria-busy="true"
        >
          <div className="seller-catalog-spinner" />
          <p>Loading seller catalogue…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="seller-catalog-react-page">
      <div className="seller-catalog-container">
      <section className="seller-catalog-heading">
        <div>
          <span className="eyebrow">
            Seller catalogue management
          </span>
          <h1>Select Categories and Sub-items</h1>
          <p>
            Select the active admin products that your business can
            sell. You can update or unselect them at any time.
          </p>
        </div>

        <Link className="button secondary" to="/dashboard">
          Back to Dashboard
        </Link>
      </section>

      {notice && (
        <div
          className={`seller-catalog-notice ${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      <section className="seller-selection-summary">
        <article>
          <strong>{selectionSummary.categoryCount}</strong>
          <span>Selected categories</span>
        </article>
        <article>
          <strong>{selectionSummary.itemCount}</strong>
          <span>Selected items</span>
        </article>
        <article>
          <strong>{categories.length}</strong>
          <span>Active admin categories</span>
        </article>
        <article>
          <strong>
            {payload?.total_active_items ??
              categories.reduce(
                (total, category) =>
                  total + category.items.length,
                0,
              )}
          </strong>
          <span>Active admin items</span>
        </article>
      </section>

      <section className="seller-catalog-toolbar">
        <div className="seller-catalog-filter-grid">
          <label className="seller-catalog-filter-field">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories or items..."
              aria-label="Search seller catalogue"
            />
          </label>

          <label className="seller-catalog-filter-field">
            <span>Product type</span>
            <select
              value={productTypeFilter}
              onChange={(event) =>
                setProductTypeFilter(event.target.value)
              }
            >
              <option value="">All product types</option>
              {productTypeOptions.map((productType) => (
                <option key={productType} value={productType}>
                  {productType}
                </option>
              ))}
            </select>
          </label>

          <label className="seller-catalog-filter-field">
            <span>Delivery time</span>
            <select
              value={deliveryTimeFilter}
              onChange={(event) =>
                setDeliveryTimeFilter(
                  event.target.value as DeliveryTimeFilter,
                )
              }
            >
              <option value="">All delivery times</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="both">Morning & Evening (Both)</option>
            </select>
          </label>

          <label className="seller-catalog-filter-field">
            <span>Delivery type</span>
            <select
              value={deliveryTypeFilter}
              onChange={(event) =>
                setDeliveryTypeFilter(
                  event.target.value as DeliveryTypeFilter,
                )
              }
            >
              <option value="">All delivery types</option>
              <option value="instant_delivery">Instant delivery</option>
              <option value="one_day_delivery">One-day delivery</option>
            </select>
          </label>
        </div>

        <div className="seller-toolbar-actions">
          {hasActiveFilters && (
            <button
              className="button secondary"
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
          <button
            className="button secondary"
            type="button"
            onClick={selectAllItems}
            disabled={!categories.length}
          >
            Select All
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={unselectAllItems}
            disabled={!selectedItemIds.size}
          >
            Unselect All
          </button>
        </div>

        <small className="seller-catalog-result-count" aria-live="polite">
          Showing {visibleCategories.length} of {categories.length} categories
        </small>
      </section>

      {categories.length ? (
        <>
          <form onSubmit={submitSelection}>
            <div className="seller-category-list">
              {visibleCategories.map((category) => {
                const categoryState =
                  categorySelection(category);

                return (
                  <section
                    className="seller-category-card"
                    key={category.id}
                  >
                    <div className="seller-category-header">
                      <label className="seller-category-checkbox">
                        <CategoryMasterCheckbox
                          categoryId={category.id}
                          checked={categoryState.checked}
                          indeterminate={
                            categoryState.indeterminate
                          }
                          onChange={setCategory}
                        />

                        <span>
                          <strong>{category.name}</strong>
                          <small>
                            {category.items.length} active item
                            {category.items.length === 1
                              ? ""
                              : "s"}
                          </small>
                        </span>
                      </label>

                      <div className="seller-category-actions">
                        <button
                          type="button"
                          className="seller-text-button"
                          onClick={() =>
                            setCategory(category.id, true)
                          }
                        >
                          Select category
                        </button>
                        <button
                          type="button"
                          className="seller-text-button danger"
                          onClick={() =>
                            setCategory(category.id, false)
                          }
                        >
                          Unselect category
                        </button>
                      </div>
                    </div>

                    {category.description && (
                      <p className="seller-category-description">
                        {category.description}
                      </p>
                    )}

                    <div className="seller-category-filter-meta">
                      <span>{category.product_type || "Products"}</span>
                      <span>
                        {deliveryTimeLabel(category.delivery_time_slot)}
                      </span>
                      <span>
                        {deliveryTypeLabel(category.delivery_type)}
                      </span>
                    </div>

                    <div className="seller-item-grid">
                      {category.items.map((item) => (
                        <label
                          className="seller-item-card"
                          key={item.id}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.id)}
                            onChange={(event) =>
                              toggleItem(item.id, event)
                            }
                          />

                          <div className="seller-item-checkmark">
                            ✓
                          </div>

                          <div className="seller-item-image">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                              />
                            ) : (
                              <span aria-hidden="true">🥤</span>
                            )}
                          </div>

                          <div className="seller-item-content">
                            <span className="seller-item-group">
                              {item.group_name ||
                                "Available Items"}
                            </span>

                            <h3>{item.name}</h3>

                            {item.description && (
                              <p>{item.description}</p>
                            )}

                            <div className="seller-item-meta">
                              <span>
                                {item.size ||
                                  item.unit_label ||
                                  "Fresh serving"}
                              </span>

                              {safeNumber(item.price) > 0 && (
                                <strong>
                                  {currencySymbol}
                                  {safeNumber(item.price).toFixed(2)}
                                </strong>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {!visibleCategories.length && (
              <section className="seller-catalog-empty">
                <div aria-hidden="true">⌕</div>
                <h2>No matching categories or items</h2>
                <p>Try changing the search or clearing the filters.</p>
              </section>
            )}

            <div className="seller-catalog-savebar">
              <div>
                <strong>
                  {selectionSummary.itemCount} item(s) selected
                </strong>
                <small>
                  Saving replaces the previous seller catalogue
                  selection.
                </small>
              </div>

              <button
                className="button primary"
                type="submit"
                disabled={saving || clearing || !csrfToken}
              >
                {saving ? "Updating…" : "Update Selection"}
              </button>
            </div>
          </form>

          <div className="seller-clear-form">
            <button
              className="button danger"
              type="button"
              onClick={clearSelection}
              disabled={
                clearing ||
                saving ||
                !selectedItemIds.size ||
                !csrfToken
              }
            >
              {clearing
                ? "Clearing…"
                : "Clear Complete Selection"}
            </button>
          </div>
        </>
      ) : (
        <section className="seller-catalog-empty">
          <div aria-hidden="true">🥤</div>
          <h2>No active categories are available</h2>
          <p>
            The administrator must activate at least one category
            and one sub-item.
          </p>
        </section>
      )}
      </div>
    </main>
  );
}
