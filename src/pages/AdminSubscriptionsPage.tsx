import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  adminSubscriptionAssetUrl,
  deleteAdminSubscriptionCategory,
  deleteAdminSubscriptionItem,
  isAdminSubscriptionAuthenticationError,
  loadAdminSubscriptionCatalog,
  seedAdminSubscriptionCatalog,
  type AdminSubscriptionCatalogPayload,
  type AdminSubscriptionItem,
} from "../services/adminSubscriptionsApi";
import "../styles/admin-subscriptions.css";

type AdminCarouselSlide = {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
};

function readableDate(value: string): string {
  if (!value) return "Special date";
  const parsed = new Date(value + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function subscriptionSlides(item: AdminSubscriptionItem): AdminCarouselSlide[] {
  const excludedWeekdays = new Set(
    (item.delivery_exclusions?.excluded_weekdays || []).map((weekday) =>
      String(weekday).toLowerCase(),
    ),
  );
  const excludedDates = new Set(
    (item.delivery_exclusions?.excluded_dates || []).map((row) => row.date),
  );
  const mainImage = item.image_url || "";
  const weekdaySlides = (
    item.content_schedule?.weekday_entries || []
  )
    .filter(
      (entry) =>
        entry.is_active &&
        !excludedWeekdays.has(String(entry.weekday || "").toLowerCase()),
    )
    .sort(
      (first, second) =>
        Number(first.weekday_index ?? 99) -
        Number(second.weekday_index ?? 99),
    )
    .map((entry) => ({
      id: entry.id,
      label: entry.weekday
        ? entry.weekday.charAt(0).toUpperCase() + entry.weekday.slice(1)
        : "Weekly",
      title: entry.title || item.name,
      description: entry.description || "",
      imageUrl: entry.image_url || mainImage,
    }));
  const dateSlides = (item.content_schedule?.date_entries || [])
    .filter(
      (entry) =>
        entry.is_active &&
        Boolean(entry.schedule_date) &&
        !excludedDates.has(String(entry.schedule_date)),
    )
    .sort((first, second) =>
      String(first.schedule_date || "").localeCompare(
        String(second.schedule_date || ""),
      ),
    )
    .map((entry) => ({
      id: entry.id,
      label: readableDate(String(entry.schedule_date || "")),
      title: entry.title || item.name,
      description: entry.description || "",
      imageUrl: entry.image_url || mainImage,
    }));
  const slides = [...weekdaySlides, ...dateSlides];
  if (slides.length) return slides;
  return [
    {
      id: "main-" + item.id,
      label: "Subscription",
      title: item.name,
      description: item.description || "",
      imageUrl: mainImage,
    },
  ];
}

function AdminSubscriptionCarousel({
  item,
}: {
  item: AdminSubscriptionItem;
}) {
  const slides = useMemo(() => subscriptionSlides(item), [item]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [item.id, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const activeSlide = slides[activeIndex] || slides[0];

  function move(direction: number) {
    setActiveIndex(
      (current) => (current + direction + slides.length) % slides.length,
    );
  }

  return (
    <div
      className="sa-admin-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={item.name + " schedule images"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="sa-admin-carousel-stage">
        {activeSlide.imageUrl ? (
          <img
            key={activeSlide.id}
            className="sa-admin-carousel-image"
            src={adminSubscriptionAssetUrl(activeSlide.imageUrl)}
            alt={activeSlide.title || item.name}
          />
        ) : (
          <div className="sa-image-placeholder">4:5</div>
        )}
        <div className="sa-admin-carousel-caption">
          <span>{activeSlide.label}</span>
          <strong>{activeSlide.title}</strong>
          {activeSlide.description && <small>{activeSlide.description}</small>}
        </div>
        {slides.length > 1 && (
          <>
            <button
              className="sa-admin-carousel-arrow previous"
              type="button"
              aria-label="Previous schedule image"
              onClick={() => move(-1)}
            >
              ‹
            </button>
            <button
              className="sa-admin-carousel-arrow next"
              type="button"
              aria-label="Next schedule image"
              onClick={() => move(1)}
            >
              ›
            </button>
            <span className="sa-admin-carousel-count">
              {activeIndex + 1}/{slides.length}
            </span>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="sa-admin-carousel-dots" aria-label="Choose schedule image">
          {slides.map((slide, index) => (
            <button
              className={index === activeIndex ? "active" : ""}
              key={slide.id}
              type="button"
              aria-label={"Show slide " + (index + 1)}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function scheduleCount(payload: AdminSubscriptionCatalogPayload | null): number {
  return (payload?.categories || []).reduce(
    (total, category) =>
      total +
      (category.items || []).reduce(
        (count, item) =>
          count +
          (item.content_schedule?.weekday_entries || []).filter(
            (entry) => entry.is_active && entry.image_url,
          ).length +
          (item.content_schedule?.date_entries || []).filter(
            (entry) => entry.is_active && entry.image_url,
          ).length,
        0,
      ),
    0,
  );
}

export function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payload, setPayload] =
    useState<AdminSubscriptionCatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    String((location.state as { message?: string } | null)?.message || ""),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPayload(await loadAdminSubscriptionCatalog());
    } catch (requestError) {
      if (isAdminSubscriptionAuthenticationError(requestError)) {
        navigate(
          `/react/login?next=${encodeURIComponent(location.pathname)}`,
          { replace: true },
        );
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load subscriptions.",
      );
    } finally {
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const categories = payload?.categories || [];
    const items = categories.flatMap((category) => category.items || []);
    const holidays = items.reduce(
      (count, item) =>
        count + (item.delivery_exclusions?.excluded_dates || []).length,
      0,
    );
    return {
      categories: categories.length,
      activeCategories: categories.filter((category) => category.is_active).length,
      items: items.length,
      activeItems: items.filter((item) => item.is_active).length,
      scheduleImages: scheduleCount(payload),
      holidays,
    };
  }, [payload]);

  async function seed() {
    if (!payload || working) return;
    setWorking("seed");
    setError("");
    try {
      await seedAdminSubscriptionCatalog(payload.subscription_csrf_token);
      setNotice("Default subscription catalogue added.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to seed subscriptions.",
      );
    } finally {
      setWorking("");
    }
  }

  async function removeCategory(categoryId: string, name: string) {
    if (
      !payload ||
      working ||
      !window.confirm(
        `Delete “${name}” and every subscription item inside it?`,
      )
    ) {
      return;
    }
    setWorking(categoryId);
    setError("");
    try {
      await deleteAdminSubscriptionCategory(
        categoryId,
        payload.subscription_csrf_token,
      );
      setNotice("Subscription category deleted.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Delete failed.",
      );
    } finally {
      setWorking("");
    }
  }

  async function removeItem(categoryId: string, itemId: string, name: string) {
    if (
      !payload ||
      working ||
      !window.confirm(`Delete subscription item “${name}”?`)
    ) {
      return;
    }
    setWorking(itemId);
    setError("");
    try {
      await deleteAdminSubscriptionItem(
        categoryId,
        itemId,
        payload.subscription_csrf_token,
      );
      setNotice("Subscription item deleted.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Delete failed.",
      );
    } finally {
      setWorking("");
    }
  }

  if (loading && !payload) {
    return (
      <main className="sa-page">
        <section className="sa-panel sa-loading">Loading subscription manager…</section>
      </main>
    );
  }

  return (
    <main className="sa-page">
      <div className="sa-container">
        <section className="sa-heading">
          <div>
            <span className="sa-eyebrow">React administration</span>
            <h1>Subscription Catalogue</h1>
            <p>
              Manage plans, 4:5 carousel slides, weekly schedules, exact-date
              overrides, Sunday delivery and festival holidays.
            </p>
          </div>
          <div className="sa-actions">
            <Link className="sa-button ghost" to="/admin/dashboard">
              Dashboard
            </Link>
            <button
              className="sa-button secondary"
              type="button"
              disabled={Boolean(working)}
              onClick={() => void seed()}
            >
              {working === "seed" ? "Adding…" : "Add defaults"}
            </button>
            <Link
              className="sa-button primary"
              to="/admin/subscriptions/categories/new"
            >
              Add category
            </Link>
          </div>
        </section>

        {error && <div className="sa-alert error">{error}</div>}
        {notice && (
          <div className="sa-alert success">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>×</button>
          </div>
        )}

        <section className="sa-stats">
          <article><strong>{summary.categories}</strong><span>Categories</span></article>
          <article><strong>{summary.activeCategories}</strong><span>Active categories</span></article>
          <article><strong>{summary.items}</strong><span>Subscription items</span></article>
          <article><strong>{summary.activeItems}</strong><span>Active items</span></article>
          <article><strong>{summary.scheduleImages}</strong><span>Carousel images</span></article>
          <article><strong>{summary.holidays}</strong><span>Holiday dates</span></article>
        </section>

        {(payload?.categories || []).length === 0 ? (
          <section className="sa-panel sa-empty">
            <h2>No subscription categories yet</h2>
            <p>Add a category manually or use the default starter catalogue.</p>
          </section>
        ) : (
          <div className="sa-category-list">
            {(payload?.categories || []).map((category) => (
              <section className="sa-panel" key={category.id}>
                <div className="sa-category-head">
                  <div className="sa-category-title">
                    {category.image_url ? (
                      <img
                        src={adminSubscriptionAssetUrl(category.image_url)}
                        alt=""
                      />
                    ) : (
                      <div className="sa-image-placeholder">SUB</div>
                    )}
                    <div>
                      <span className="sa-order">#{category.serial_number || 1}</span>
                      <h2>{category.name}</h2>
                      <p>{category.description || "No category description."}</p>
                    </div>
                  </div>
                  <div className="sa-actions">
                    <span
                      className={`sa-status ${category.is_active ? "active" : "inactive"}`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                    <Link
                      className="sa-button secondary small"
                      to={`/admin/subscriptions/categories/${category.id}/edit`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="sa-button primary small"
                      to={`/admin/subscriptions/categories/${category.id}/items/new`}
                    >
                      Add item
                    </Link>
                    <button
                      className="sa-button danger small"
                      type="button"
                      disabled={working === category.id}
                      onClick={() =>
                        void removeCategory(category.id, category.name)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="sa-item-grid">
                  {(category.items || []).map((item) => {
                    const slides =
                      (item.content_schedule?.weekday_entries || []).filter(
                        (entry) => entry.is_active && entry.image_url,
                      ).length +
                      (item.content_schedule?.date_entries || []).filter(
                        (entry) => entry.is_active && entry.image_url,
                      ).length;
                    const holidays =
                      item.delivery_exclusions?.excluded_dates?.length || 0;
                    return (
                      <article className="sa-item-card" key={item.id}>
                        <div className="sa-item-media">
                          <AdminSubscriptionCarousel item={item} />
                          <span
                            className={`sa-status ${item.is_active ? "active" : "inactive"}`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="sa-item-body">
                          <span className="sa-order">#{item.serial_number || 1}</span>
                          <h3>{item.name}</h3>
                          <p>{item.description || "No description."}</p>
                          <div className="sa-item-meta">
                            <span>{slides} schedule slide(s)</span>
                            <span>{holidays} holiday(s)</span>
                            <span>
                              {(item.delivery_exclusions?.excluded_weekdays || [])
                                .map((day) => day.slice(0, 3))
                                .join(", ") || "No weekly exclusions"}
                            </span>
                          </div>
                          <div className="sa-actions">
                            <Link
                              className="sa-button primary small"
                              to={`/admin/subscriptions/categories/${category.id}/items/${item.id}/edit`}
                            >
                              Edit schedule
                            </Link>
                            <button
                              className="sa-button danger small"
                              type="button"
                              disabled={working === item.id}
                              onClick={() =>
                                void removeItem(category.id, item.id, item.name)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {(category.items || []).length === 0 && (
                    <div className="sa-empty compact">No subscription items.</div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
