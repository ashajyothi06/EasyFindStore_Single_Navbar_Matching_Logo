import { useEffect, useMemo, useState } from "react";

import {
  getSellerSubscriptionCatalog,
  saveSellerSubscriptionSelection,
  sellerSubscriptionAssetUrl,
  type SellerSubscriptionCategory,
  type SellerSubscriptionItem,
} from "../lib/sellerSubscriptionsApi";

const STYLES = `
  .seller-subscriptions{width:100%;padding:40px 0 80px;color:#15251a}
  .seller-subscriptions-container{ width:100%;padding-left:clamp(18px,4vw,64px);padding-right:clamp(18px,4vw,64px);}
  .seller-subscriptions-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:24px}
  .seller-subscriptions-eyebrow{display:block;margin-bottom:7px;color:#16834a;font-size:.74rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
  .seller-subscriptions h1{margin:0;font-size:clamp(2rem,4vw,3rem);letter-spacing:-.045em}
  .seller-subscriptions-intro{max-width:680px;margin:9px 0 0;color:#65746a;line-height:1.6}
  .seller-subscriptions-count{flex:0 0 auto;padding:11px 14px;border:1px solid #cfe4d5;border-radius:13px;background:#eef9f1;color:#17663a;font-size:.82rem;font-weight:900}
  .seller-subscriptions-alert{margin-bottom:18px;padding:13px 15px;border-radius:13px;background:#fff0f0;color:#a22c38;font-weight:750}
  .seller-subscriptions-alert.success{background:#eafaf0;color:#136d3a}
  .seller-subscriptions-category{margin-bottom:19px;padding:18px;border:1px solid #dce9df;border-radius:20px;background:#fff;box-shadow:0 16px 40px rgba(22,67,39,.06)}
  .seller-subscriptions-category-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:13px}
  .seller-subscriptions-category h2{margin:0;font-size:1.18rem}.seller-subscriptions-category p{margin:4px 0 0;color:#6a796f;font-size:.84rem}
  .seller-subscriptions-category-actions{display:flex;gap:7px}.seller-subscriptions-small-button{padding:7px 10px;border:1px solid #cbded1;border-radius:9px;background:#f8fcf9;color:#245c38;font:inherit;font-size:.72rem;font-weight:850;cursor:pointer}
  .seller-subscriptions-grid{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:16px}
  .seller-subscription-card{position:relative;display:flex;min-width:0;max-width:360px;flex-direction:column;overflow:hidden;border:1px solid #dbe7de;border-radius:18px;background:#fff;transition:.18s ease}
  .seller-subscription-card:hover{border-color:#77a98a;box-shadow:0 9px 22px rgba(35,83,55,.09);transform:translateY(-1px)}
  .seller-subscription-card.selected{border-color:#179457;background:linear-gradient(145deg,#f2fcf5,#fff);box-shadow:0 0 0 2px rgba(23,148,87,.12)}
  .seller-subscription-check{position:absolute;z-index:5;top:12px;right:12px;width:22px;height:22px;margin:0;accent-color:#168a4e;filter:drop-shadow(0 2px 4px rgba(0,0,0,.24))}
  .seller-schedule-carousel{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:#edf5ef}
  .seller-schedule-carousel img{display:block;width:100%;height:100%;object-fit:cover}
  .seller-schedule-placeholder{display:flex;width:100%;height:100%;align-items:center;justify-content:center;background:linear-gradient(145deg,#e8f8ed,#fff5cf);font-size:3.2rem}
  .seller-schedule-caption{position:absolute;right:0;bottom:0;left:0;padding:45px 13px 12px;background:linear-gradient(transparent,rgba(8,29,16,.88));color:#fff}
  .seller-schedule-label{display:block;margin-bottom:3px;color:#c9f5d6;font-size:.67rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .seller-schedule-caption strong{display:block;font-size:.95rem;line-height:1.25}.seller-schedule-caption small{display:-webkit-box;overflow:hidden;margin-top:3px;color:#e8f3eb;font-size:.72rem;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  .seller-schedule-arrow{position:absolute;z-index:4;top:50%;display:grid;width:30px;height:30px;place-items:center;transform:translateY(-50%);border:0;border-radius:50%;background:rgba(255,255,255,.9);color:#174a2c;font-size:1.15rem;font-weight:900;cursor:pointer}.seller-schedule-arrow.previous{left:9px}.seller-schedule-arrow.next{right:9px}
  .seller-schedule-dots{position:absolute;z-index:4;top:12px;left:12px;display:flex;max-width:calc(100% - 58px);flex-wrap:wrap;gap:5px}.seller-schedule-dot{width:7px;height:7px;padding:0;border:0;border-radius:99px;background:rgba(255,255,255,.62);box-shadow:0 1px 3px rgba(0,0,0,.22);cursor:pointer}.seller-schedule-dot.active{width:18px;background:#fff}
  .seller-subscription-body{display:block;min-width:0;padding:14px}.seller-subscription-name{display:block;margin-bottom:4px;font-size:1rem}.seller-subscription-description{margin:0;color:#627268;font-size:.8rem;line-height:1.5}
  .seller-subscription-block{display:block;margin-top:10px;padding:10px;border-radius:12px;background:#f5faf6}
  .seller-subscription-block-title{font-size:.75rem;font-weight:900;color:#244f33}.seller-subscription-items{display:grid;gap:4px;margin-top:7px;color:#425769;font-size:.76rem;line-height:1.45}
  .seller-subscription-item-line{display:flex;justify-content:space-between;gap:10px}.seller-subscription-item-line strong{text-align:right;color:#1e3c29}
  .seller-subscription-prices{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}.seller-subscription-price{padding:5px 8px;border-radius:8px;background:#edf6f0;color:#31573d;font-size:.7rem;font-weight:800}
  .seller-subscriptions-footer{position:sticky;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:22px;padding:14px 16px;border:1px solid #cfe3d5;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 15px 40px rgba(20,60,35,.14);backdrop-filter:blur(12px)}
  .seller-subscriptions-save{min-width:240px;min-height:47px;padding:11px 18px;border:0;border-radius:12px;background:#159a58;color:#fff;font:inherit;font-weight:900;cursor:pointer}.seller-subscriptions-save:disabled{cursor:not-allowed;opacity:.6}
  .seller-subscriptions-loading{padding:40px;border:1px dashed #c9dccf;border-radius:18px;text-align:center;color:#65746a}
  @media(max-width:1050px){.seller-subscriptions-grid{grid-template-columns:repeat(2,minmax(240px,1fr))}}
  @media(max-width:700px){.seller-subscriptions-grid{grid-template-columns:1fr}.seller-subscription-card{max-width:340px}}
  @media(max-width:620px){.seller-subscriptions-header,.seller-subscriptions-category-head,.seller-subscriptions-footer{align-items:stretch;flex-direction:column}.seller-subscriptions-save{width:100%;min-width:0}}
`;

type SubscriptionScheduleEntry = {
  id?: string;
  scope?: "weekday" | "date";
  weekday?: string;
  schedule_date?: string;
  title?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
};

type ScheduleAwareSubscriptionItem = SellerSubscriptionItem & {
  content_schedule?: {
    weekday_entries?: SubscriptionScheduleEntry[];
    date_entries?: SubscriptionScheduleEntry[];
  };
  delivery_exclusions?: {
    excluded_weekdays?: string[];
    excluded_dates?: Array<{ date: string; reason?: string }>;
  };
};

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function scheduleEntries(item: SellerSubscriptionItem): SubscriptionScheduleEntry[] {
  const scheduleAwareItem = item as ScheduleAwareSubscriptionItem;
  const schedule = scheduleAwareItem.content_schedule;
  const excludedWeekdays = new Set(
    scheduleAwareItem.delivery_exclusions?.excluded_weekdays || ["sunday"],
  );
  const excludedDates = new Set(
    (scheduleAwareItem.delivery_exclusions?.excluded_dates || []).map(
      (row) => row.date,
    ),
  );
  const weekdays = [...(schedule?.weekday_entries || [])]
    .filter(
      (entry) =>
        entry.is_active !== false &&
        !excludedWeekdays.has(String(entry.weekday || "").toLowerCase()),
    )
    .sort(
      (left, right) =>
        WEEKDAY_ORDER.indexOf(String(left.weekday || "").toLowerCase()) -
        WEEKDAY_ORDER.indexOf(String(right.weekday || "").toLowerCase()),
    );
  const dates = [...(schedule?.date_entries || [])]
    .filter(
      (entry) =>
        entry.is_active !== false &&
        !excludedDates.has(String(entry.schedule_date || "")),
    )
    .sort((left, right) =>
      String(left.schedule_date || "").localeCompare(
        String(right.schedule_date || ""),
      ),
    );
  const entries = [...weekdays, ...dates];
  return entries.length
    ? entries
    : [
        {
          id: `${item.id}-default`,
          title: item.name,
          description: item.description || "Subscription item",
          image_url: item.image_url,
          is_active: true,
        },
      ];
}

function scheduleLabel(entry: SubscriptionScheduleEntry): string {
  if (entry.scope === "date" && entry.schedule_date) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
    }).format(new Date(`${entry.schedule_date}T00:00:00`));
  }
  return entry.weekday
    ? entry.weekday.charAt(0).toUpperCase() + entry.weekday.slice(1)
    : "Subscription schedule";
}

function ScheduleCarousel({ item }: { item: SellerSubscriptionItem }) {
  const entries = useMemo(() => scheduleEntries(item), [item]);
  const [activeIndex, setActiveIndex] = useState(0);
  const index = Math.min(activeIndex, Math.max(0, entries.length - 1));
  const entry = entries[index];
  const imageUrl = entry.image_url || item.image_url;

  function select(nextIndex: number) {
    setActiveIndex((nextIndex + entries.length) % entries.length);
  }

  return (
    <span
      className="seller-schedule-carousel"
      aria-label={`${item.name} delivery schedule`}
    >
      {imageUrl ? (
        <img
          src={sellerSubscriptionAssetUrl(imageUrl)}
          alt={entry.title || `${scheduleLabel(entry)} delivery`}
          loading="lazy"
        />
      ) : (
        <span className="seller-schedule-placeholder" aria-hidden="true">
          🧃
        </span>
      )}
      {entries.length > 1 ? (
        <>
          <button
            className="seller-schedule-arrow previous"
            type="button"
            aria-label="Previous schedule image"
            onClick={() => select(index - 1)}
          >
            ‹
          </button>
          <button
            className="seller-schedule-arrow next"
            type="button"
            aria-label="Next schedule image"
            onClick={() => select(index + 1)}
          >
            ›
          </button>
          <span className="seller-schedule-dots">
            {entries.map((candidate, dotIndex) => (
              <button
                className={`seller-schedule-dot${dotIndex === index ? " active" : ""}`}
                type="button"
                aria-label={`Show ${scheduleLabel(candidate)} schedule`}
                key={candidate.id || `${scheduleLabel(candidate)}-${dotIndex}`}
                onClick={() => select(dotIndex)}
              />
            ))}
          </span>
        </>
      ) : null}
      <span className="seller-schedule-caption">
        <span className="seller-schedule-label">{scheduleLabel(entry)}</span>
        <strong>{entry.title || item.name}</strong>
        {entry.description ? <small>{entry.description}</small> : null}
      </span>
    </span>
  );
}

function money(symbol: string, value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? `${symbol}${number.toFixed(2)}` : "—";
}

function itemIds(category: SellerSubscriptionCategory): string[] {
  return (category.items || []).map((item) => item.id);
}

function PriceList({
  item,
  symbol,
}: {
  item: SellerSubscriptionItem;
  symbol: string;
}) {
  const prices = item.plan_prices || {};
  return (
    <div className="seller-subscription-prices">
      <span className="seller-subscription-price">
        Weekly {money(symbol, prices.weekly ?? item.base_price)}
      </span>
      <span className="seller-subscription-price">
        Monthly {money(symbol, prices.monthly)}
      </span>
      <span className="seller-subscription-price">
        3 months {money(symbol, prices.three_months)}
      </span>
      {(prices.custom_tiers || []).map((tier, index) => (
        <span
          className="seller-subscription-price"
          key={`${tier.days}-${index}`}
        >
          Custom {tier.days} days {money(symbol, tier.price)}
        </span>
      ))}
    </div>
  );
}

export function SellerSubscriptionsPage() {
  const [categories, setCategories] = useState<SellerSubscriptionCategory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [subscriptionCsrfToken, setSubscriptionCsrfToken] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getSellerSubscriptionCatalog()
      .then((payload) => {
        if (cancelled) return;
        setCategories(payload.categories || []);
        setSelectedIds(payload.selected_item_ids || []);
        setCsrfToken(payload.csrf_token || "");
        setSubscriptionCsrfToken(payload.subscription_csrf_token || "");
        setCurrencySymbol(payload.currency_symbol || "₹");
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load subscription items.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableIds = useMemo(
    () =>
      new Set(
        categories.flatMap((category) =>
          (category.items || []).map((item) => item.id),
        ),
      ),
    [categories],
  );
  const selectedCount = selectedIds.filter((id) => availableIds.has(id)).length;

  function toggleItem(itemId: string) {
    setSuccess("");
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
  }

  function setCategory(category: SellerSubscriptionCategory, checked: boolean) {
    const categoryIds = itemIds(category);
    setSuccess("");
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, ...categoryIds]))
        : current.filter((id) => !categoryIds.includes(id)),
    );
  }

  async function saveSelection() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = await saveSellerSubscriptionSelection({
        selected_item_ids: selectedIds.filter((id) => availableIds.has(id)),
        csrf_token: csrfToken,
        subscription_csrf_token: subscriptionCsrfToken,
      });
      setCategories(payload.categories || categories);
      setSelectedIds(payload.selected_item_ids || []);
      setCsrfToken(payload.csrf_token || csrfToken);
      setSubscriptionCsrfToken(
        payload.subscription_csrf_token || subscriptionCsrfToken,
      );
      setSuccess(
        payload.message ||
          "Seller subscription selection saved successfully.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the subscription selection.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <main className="seller-subscriptions">
        <div className="seller-subscriptions-container">
        <header className="seller-subscriptions-header">
          <div>
            <span className="seller-subscriptions-eyebrow">
              Seller catalogue
            </span>
            <h1>Subscription items</h1>
            <p className="seller-subscriptions-intro">
              Select the admin-created subscriptions that you can prepare and
              deliver. Each card shows its included items, complimentary
              allowance, and complete plan pricing.
            </p>
          </div>
          <div className="seller-subscriptions-count">
            {selectedCount} selected
          </div>
        </header>

        {error ? (
          <div className="seller-subscriptions-alert" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="seller-subscriptions-alert success" role="status">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="seller-subscriptions-loading">
            Loading subscription items…
          </div>
        ) : (
          categories.map((category) => {
            const categoryIds = itemIds(category);
            const allSelected =
              categoryIds.length > 0 &&
              categoryIds.every((id) => selectedIds.includes(id));
            return (
              <section
                className="seller-subscriptions-category"
                key={category.id}
              >
                <div className="seller-subscriptions-category-head">
                  <div>
                    <h2>{category.name}</h2>
                    {category.description ? (
                      <p>{category.description}</p>
                    ) : null}
                  </div>
                  <div className="seller-subscriptions-category-actions">
                    <button
                      className="seller-subscriptions-small-button"
                      type="button"
                      onClick={() => setCategory(category, !allSelected)}
                    >
                      {allSelected ? "Clear category" : "Select category"}
                    </button>
                  </div>
                </div>

                <div className="seller-subscriptions-grid">
                  {(category.items || []).map((item) => {
                    const selected = selectedIds.includes(item.id);
                    const complimentary = item.complimentary_config || {
                      max_items: 0,
                      budget: 0,
                    };
                    return (
                      <article
                        className={`seller-subscription-card${selected ? " selected" : ""}`}
                        key={item.id}
                      >
                        <input
                          className="seller-subscription-check"
                          type="checkbox"
                          checked={selected}
                          aria-label={`Offer ${item.name}`}
                          onChange={() => toggleItem(item.id)}
                        />
                        <ScheduleCarousel item={item} />
                        <span className="seller-subscription-body">
                          <strong className="seller-subscription-name">
                            {item.name}
                          </strong>
                          <p className="seller-subscription-description">
                            {item.description || "Subscription item"}
                          </p>

                          {(item.catalog_combinations || []).map(
                            (combination) => (
                              <span
                                className="seller-subscription-block"
                                key={combination.id}
                              >
                                <span className="seller-subscription-block-title">
                                  {combination.name}
                                </span>
                                <span className="seller-subscription-items">
                                  {(combination.sub_items || []).map(
                                    (subItem, index) => (
                                      <span
                                        className="seller-subscription-item-line"
                                        key={`${subItem.id || subItem.name}-${index}`}
                                      >
                                        <span>{subItem.name}</span>
                                        <strong>
                                          {subItem.unit_label || "Item"}
                                          {Number(subItem.quantity || 1) > 1
                                            ? ` × ${subItem.quantity}`
                                            : ""}
                                        </strong>
                                      </span>
                                    ),
                                  )}
                                </span>
                              </span>
                            ),
                          )}

                          {Number(complimentary.max_items || 0) > 0 ? (
                            <span className="seller-subscription-block">
                              <span className="seller-subscription-block-title">
                                Complimentary choices
                              </span>
                              <span className="seller-subscription-items">
                                <span className="seller-subscription-item-line">
                                  <span>Number to select</span>
                                  <strong>{complimentary.max_items}</strong>
                                </span>
                                <span className="seller-subscription-item-line">
                                  <span>Maximum value</span>
                                  <strong>
                                    {money(
                                      currencySymbol,
                                      complimentary.budget,
                                    )}
                                  </strong>
                                </span>
                                {(item.complimentary_choices || []).map(
                                  (choice, index) => (
                                    <span
                                      className="seller-subscription-item-line"
                                      key={`${choice.id || choice.name}-${index}`}
                                    >
                                      <span>{choice.name}</span>
                                      <strong>
                                        {money(
                                          currencySymbol,
                                          choice.catalog_price,
                                        )}
                                      </strong>
                                    </span>
                                  ),
                                )}
                              </span>
                            </span>
                          ) : null}

                          <PriceList item={item} symbol={currencySymbol} />
                        </span>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {!loading ? (
          <footer className="seller-subscriptions-footer">
            <strong>
              {selectedCount} subscription item
              {selectedCount === 1 ? "" : "s"} selected
            </strong>
            <button
              className="seller-subscriptions-save"
              type="button"
              disabled={saving || !csrfToken || !subscriptionCsrfToken}
              onClick={() => void saveSelection()}
            >
              {saving ? "Saving selection…" : "Save subscription selection"}
            </button>
          </footer>
        ) : null}
        </div>
      </main>
    </>
  );
}
