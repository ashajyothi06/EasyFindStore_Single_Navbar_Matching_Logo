import { Link } from "react-router-dom";

import type { ProductItem } from "../types/storefront";

interface ProductCardProps {
  item: ProductItem;
  currencySymbol: string;
  authenticated: boolean;
  loginUrl: string;
  busy: boolean;
  onAdd: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
}

function finiteNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function optionalFiniteNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function firstPositiveNumber(
  ...values: unknown[]
): number {
  let validFallback = 0;

  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      continue;
    }

    if (parsed > 0) {
      return parsed;
    }

    validFallback = Math.max(
      0,
      parsed,
    );
  }

  return validFallback;
}

function safeText(
  value: unknown,
  fallback = "",
): string {
  const text = String(
    value ?? "",
  ).trim();

  return text || fallback;
}

export function ProductCard({
  item,
  currencySymbol,
  authenticated,
  loginUrl,
  busy,
  onAdd,
  onIncrease,
  onDecrease,
}: ProductCardProps) {
  const source =
    item && typeof item === "object"
      ? item
      : ({} as ProductItem);

  const extendedSource = source as ProductItem & {
    admin_price?: unknown;
    price?: unknown;
    selling_price?: unknown;
    sale_price?: unknown;
    unit_price?: unknown;
    nearby_available_quantity?: unknown;
    stock_quantity?: unknown;
    quantity?: unknown;
    seller_count?: unknown;
    group_name?: unknown;
  };

  const itemId = safeText(
    source.id,
  );
  const itemName = safeText(
    source.name,
    "Product",
  );
  const categoryName = safeText(
    source.category_name,
    "Products",
  );
  const groupName = safeText(
    extendedSource.group_name,
    "Popular Choices",
  );
  const categorySlug = safeText(
    source.category_slug,
  );
  const itemSlug = safeText(
    source.slug,
  );
  const safeCurrencySymbol =
    safeText(
      currencySymbol,
      "₹",
    );

  // A zero compatibility field must not override a positive administrator
  // catalogue price. Zero remains a valid fallback and does not hide stock.
  const displayPrice = Math.max(
    0,
    firstPositiveNumber(
      source.display_price,
      extendedSource.price,
      extendedSource.admin_price,
      extendedSource.selling_price,
      extendedSource.sale_price,
      extendedSource.unit_price,
    ),
  );

  const rawComparePrice =
    optionalFiniteNumber(
      source.compare_price,
    );
  const comparePrice =
    rawComparePrice === null
      ? null
      : Math.max(
          0,
          rawComparePrice,
        );

  const availableQuantity = Math.max(0, Math.trunc(finiteNumber(
    extendedSource.stock_quantity ?? source.available_quantity ?? extendedSource.nearby_available_quantity ?? extendedSource.quantity,
    0,
  )));

  // A cart created before the admin reduced stock must never show more
  // purchasable units than the live inventory.
  const cartQuantity = Math.min(availableQuantity, 99, Math.max(
    0,
    Math.trunc(finiteNumber(source.cart_quantity, 0)),
  ));

  const calculatedDiscount =
    comparePrice !== null &&
    comparePrice > displayPrice &&
    comparePrice > 0
      ? Math.round(
          (
            (
              comparePrice -
              displayPrice
            ) /
            comparePrice
          ) *
            100,
        )
      : 0;

  const discount = Math.max(
    0,
    Math.min(
      99,
      Math.trunc(
        finiteNumber(
          source.discount_percentage,
          calculatedDiscount,
        ),
      ),
    ),
  );

  const detailUrl =
    safeText(
      source.react_detail_url,
    ) ||
    (
      categorySlug &&
      itemSlug
        ? `/item/${encodeURIComponent(
            categorySlug,
          )}/${encodeURIComponent(
            itemSlug,
          )}`
        : "/categories"
    );

  // Show central administrator stock, including an intentional zero.
  const isAvailable = availableQuantity > 0;

  const maximumReached = cartQuantity >= Math.min(availableQuantity, 99);

  const imageUrl = safeText(
    source.image_url,
  );
  const unitLabel = safeText(
    source.unit_label,
    "item",
  );

  return (
    <article className="html-product-card">
      <Link
        className="html-product-image-link"
        to={detailUrl}
        aria-label={`View ${itemName}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={itemName}
            loading="lazy"
          />
        ) : (
          <span className="html-product-placeholder">
            🥤
          </span>
        )}

        {discount > 0 ? (
          <span className="html-product-badge html-product-discount">
            {discount}% Off
          </span>
        ) : null}

        {Boolean(
          source.is_featured,
        ) ? (
          <span className="html-product-badge html-product-featured">
            Featured
          </span>
        ) : null}
      </Link>

      <div className="html-product-body">
        <span className="html-product-kicker">
          {categoryName}
          {groupName &&
          groupName !== categoryName
            ? ` · ${groupName}`
            : ""}
        </span>

        <h3>
          <Link to={detailUrl}>
            {itemName}
          </Link>
        </h3>

        <p className="html-product-size">
          {safeText(
            source.size,
            "Fresh serving",
          )}
          {source.unit_label
            ? ` · ${unitLabel}`
            : ""}
        </p>

        <p className="html-product-description">
          {safeText(
            source.description,
            "Freshly prepared with carefully selected ingredients.",
          )}
        </p>

        <div className="html-product-footer">
          <div className="html-product-price">
            {comparePrice !== null &&
            comparePrice >
              displayPrice ? (
              <del>
                {safeCurrencySymbol}
                {comparePrice.toFixed(
                  0,
                )}
              </del>
            ) : null}

            <strong>
              {safeCurrencySymbol}
              {displayPrice.toFixed(
                0,
              )}
            </strong>
          </div>

          <span className="html-product-stock">
            {availableQuantity > 0
              ? `${availableQuantity} in stock`
              : "Out of stock"}
          </span>



          <div className="html-product-actions">
            <Link
              className="button button-primary"
              to={detailUrl}
            >
              View Details
            </Link>

            {!authenticated ? (
              <a
                className="button button-light"
                href={loginUrl}
              >
                Login to Order
              </a>
            ) : cartQuantity >
              0 ? (
              <div
                className="html-product-cart-control"
                aria-label={`${itemName} cart quantity`}
              >
                <button
                  type="button"
                  disabled={
                    busy ||
                    !itemId
                  }
                  aria-label={`Decrease ${itemName} quantity`}
                  onClick={() =>
                    onDecrease(
                      itemId,
                    )
                  }
                >
                  −
                </button>

                <span
                  className="html-product-cart-value"
                  aria-live="polite"
                >
                  {busy
                    ? "…"
                    : cartQuantity}
                </span>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !itemId ||
                    maximumReached
                  }
                  aria-label={`Increase ${itemName} quantity`}
                  onClick={() =>
                    onIncrease(
                      itemId,
                    )
                  }
                >
                  +
                </button>
              </div>
            ) : (
              <button
                className="button button-light"
                type="button"
                disabled={
                  busy ||
                  !itemId ||
                  !isAvailable
                }
                onClick={() =>
                  onAdd(itemId)
                }
              >
                {busy
                  ? "Adding…"
                  : isAvailable
                    ? "Add to Cart"
                    : "Unavailable"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
