import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  isSellerSubscriptionAuthenticationError,
  loadSellerSubscriptionBookings,
  type SellerSubscriptionBookingsPayload,
  type SellerSubscriptionDelivery,
} from "../services/sellerSubscriptionBookingsApi";
import { sellerSubscriptionAssetUrl } from "../lib/sellerSubscriptionsApi";
import "../styles/seller-subscription-bookings.css";

const SCHEDULE_STYLES = `
  .subscription-delivery-card{display:grid!important;grid-template-columns:96px minmax(0,1fr) auto!important;align-items:start!important;gap:16px!important}
  .subscription-delivery-schedule-image{position:relative;width:96px;aspect-ratio:4/5;overflow:hidden;border-radius:13px;background:linear-gradient(145deg,#e8f8ed,#fff5cf)}
  .subscription-delivery-schedule-image img{display:block;width:100%;height:100%;object-fit:cover}
  .subscription-delivery-schedule-placeholder{display:grid;width:100%;height:100%;place-items:center;font-size:2rem}
  .subscription-delivery-schedule-badge{position:absolute;right:6px;bottom:6px;left:6px;padding:5px 6px;border-radius:7px;background:rgba(8,34,17,.82);color:#fff;font-size:.6rem;font-weight:900;line-height:1.2;text-align:center;text-transform:uppercase}
  .subscription-scheduled-content{margin:9px 0 3px;padding:10px 11px;border-left:3px solid #1a9a58;border-radius:0 10px 10px 0;background:#f1faf4}
  .subscription-scheduled-content span{display:block;margin-bottom:2px;color:#16834a;font-size:.65rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .subscription-scheduled-content strong{display:block;color:#183f27;font-size:.84rem}.subscription-scheduled-content p{margin:3px 0 0;color:#607167;font-size:.75rem;line-height:1.4}
  @media(max-width:760px){.subscription-delivery-card{grid-template-columns:76px minmax(0,1fr)!important}.subscription-delivery-schedule-image{width:76px}.subscription-delivery-side{grid-column:1/-1!important}.subscription-delivery-schedule-badge{font-size:.52rem}}
`;

type ScheduledContent = {
  title?: string;
  description?: string;
  image_url?: string;
  weekday?: string;
  schedule_date?: string;
  resolved_from?: "weekday" | "date";
};

type ScheduleAwareDelivery = SellerSubscriptionDelivery & {
  scheduled_content?: ScheduledContent | null;
  image_url?: string;
  schedule_image_url?: string;
};

function title(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableDate(value: string): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function deliveryContent(
  delivery: SellerSubscriptionDelivery,
): ScheduledContent | null {
  const content = (delivery as ScheduleAwareDelivery).scheduled_content;
  return content && typeof content === "object" ? content : null;
}

function deliveryContentLabel(content: ScheduledContent | null): string {
  if (!content) return "Delivery schedule";
  if (content.resolved_from === "date") return "Date-specific schedule";
  return content.weekday
    ? `${title(content.weekday)} schedule`
    : "Delivery schedule";
}

function DeliveryScheduleImage({
  delivery,
}: {
  delivery: SellerSubscriptionDelivery;
}) {
  const content = deliveryContent(delivery);
  const deliveryWithImage = delivery as ScheduleAwareDelivery;
  const imageUrl =
    content?.image_url ||
    deliveryWithImage.schedule_image_url ||
    deliveryWithImage.image_url;
  return (
    <div className="subscription-delivery-schedule-image">
      {imageUrl ? (
        <img
          src={sellerSubscriptionAssetUrl(imageUrl)}
          alt={content?.title || delivery.item_name || "Scheduled delivery"}
          loading="lazy"
        />
      ) : (
        <span
          className="subscription-delivery-schedule-placeholder"
          aria-hidden="true"
        >
          🗓️
        </span>
      )}
      <span className="subscription-delivery-schedule-badge">
        {deliveryContentLabel(content)}
      </span>
    </div>
  );
}

function ScheduledContentDetails({
  delivery,
}: {
  delivery: SellerSubscriptionDelivery;
}) {
  const content = deliveryContent(delivery);
  if (!content?.title && !content?.description) return null;
  return (
    <div className="subscription-scheduled-content">
      <span>{deliveryContentLabel(content)}</span>
      <strong>{content.title || delivery.item_name}</strong>
      {content.description ? <p>{content.description}</p> : null}
    </div>
  );
}

function PreparationItems({
  delivery,
}: {
  delivery: SellerSubscriptionDelivery;
}) {
  return (
    <>
      {(delivery.included_catalog_items || []).length > 0 ? (
        <div className="subscription-prep-block">
          <strong>Prepare subscription items</strong>
          {(delivery.included_catalog_items || []).map((item, index) => (
            <div
              className="subscription-prep-row"
              key={`${item.item_id || item.id || item.name}-${index}`}
            >
              <span>{item.name}</span>
              <strong>
                {item.unit_label || "Item"}
                {Number(item.quantity || 1) > 1
                  ? ` × ${item.quantity}`
                  : ""}
              </strong>
            </div>
          ))}
        </div>
      ) : null}

      {(delivery.complimentary_items || []).length > 0 ? (
        <div className="subscription-prep-block">
          <strong>Complimentary items</strong>
          {(delivery.complimentary_items || []).map((item, index) => (
            <div
              className="subscription-prep-row"
              key={`${item.item_id || item.id || item.name}-${index}`}
            >
              <span>{item.name}</span>
              <strong>
                {item.unit_label || "Item"}
                {Number(item.quantity || 1) > 1
                  ? ` × ${item.quantity}`
                  : ""}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function SellerSubscriptionBookingsPage() {
  const [data, setData] =
    useState<SellerSubscriptionBookingsPayload | null>(null);
  const [scope, setScope] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(
    nextScope = scope,
    date = selectedDate,
    showLoading = true,
  ) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setData(await loadSellerSubscriptionBookings(nextScope, date));
    } catch (requestError) {
      if (isSellerSubscriptionAuthenticationError(requestError)) {
        window.location.assign(
          "/react/login?next=/seller/subscription-bookings",
        );
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load subscription bookings.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    void load(scope, selectedDate);
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void load(scope, selectedDate, false);
      }
    };
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    // Refresh the currently selected date/scope without resetting the filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedDate]);

  const grouped = useMemo(() => {
    const output = new Map<string, SellerSubscriptionDelivery[]>();
    for (const delivery of data?.deliveries || []) {
      const key = delivery.scheduled_date || "unscheduled";
      const rows = output.get(key) || [];
      rows.push(delivery);
      output.set(key, rows);
    }
    return Array.from(output.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [data]);

  const summary = data?.summary || {
    today: 0,
    upcoming: 0,
    overdue: 0,
    total_orders: 0,
    total_deliveries: 0,
  };

  return (
    <>
      <style>{SCHEDULE_STYLES}</style>
      <main className="subscription-bookings-page">
      <div className="subscription-bookings-container">
        <section className="subscription-bookings-heading">
          <div>
            <span className="subscription-bookings-eyebrow">
              Seller subscription preparation
            </span>
            <h1>Subscription Bookings</h1>
            <p>
              Review today’s preparation list and every upcoming recurring
              delivery. Each delivery shows the subscription items,
              complimentary items, quantity, customer, and exact date.
            </p>
          </div>
          <Link
            className="subscription-bookings-link"
            to="/seller/bookings"
          >
            Normal Bookings
          </Link>
        </section>

        <section className="subscription-bookings-summary">
          <div className="subscription-summary-card">
            <span>Today</span>
            <strong>{summary.today}</strong>
          </div>
          <div className="subscription-summary-card">
            <span>Upcoming deliveries</span>
            <strong>{summary.upcoming}</strong>
          </div>
          <div className="subscription-summary-card">
            <span>Overdue</span>
            <strong>{summary.overdue}</strong>
          </div>
          <div className="subscription-summary-card">
            <span>Subscriptions</span>
            <strong>{summary.total_orders}</strong>
          </div>
          <div className="subscription-summary-card">
            <span>Total deliveries</span>
            <strong>{summary.total_deliveries}</strong>
          </div>
        </section>

        <section className="subscription-bookings-toolbar">
          <div className="subscription-bookings-filters">
            {(data?.allowed_scopes || [
              "today",
              "upcoming",
              "overdue",
              "past",
              "all",
            ]).map((filter) => (
              <button
                className={`subscription-bookings-button${scope === filter && !selectedDate ? " active" : ""}`}
                type="button"
                key={filter}
                onClick={() => {
                  setScope(filter);
                  setSelectedDate("");
                }}
              >
                {title(filter)}
              </button>
            ))}
          </div>
          <label className="subscription-date-filter">
            Select exact delivery date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
              }}
            />
          </label>
        </section>

        {error ? (
          <div className="subscription-bookings-notice error">{error}</div>
        ) : null}

        {loading ? (
          <div className="subscription-bookings-loading">
            Loading subscription deliveries…
          </div>
        ) : grouped.length ? (
          grouped.map(([scheduledDate, deliveries]) => (
            <section
              className="subscription-date-group"
              key={scheduledDate}
            >
              <div className="subscription-date-heading">
                <h2>
                  {scheduledDate === data?.today
                    ? `Today — ${readableDate(scheduledDate)}`
                    : readableDate(scheduledDate)}
                </h2>
                <span>
                  {deliveries.length}{" "}
                  {deliveries.length === 1 ? "delivery" : "deliveries"}
                </span>
              </div>
              <div className="subscription-delivery-list">
                {deliveries.map((delivery) => (
                  <article
                    className={`subscription-delivery-card${scheduledDate === data?.today ? " today" : ""}`}
                    key={delivery.id}
                  >
                    <DeliveryScheduleImage delivery={delivery} />
                    <div>
                      <div className="subscription-delivery-title">
                        <h3>{delivery.item_name || "Subscription item"}</h3>
                        <span className="subscription-status">
                          {title(delivery.status || "scheduled")}
                        </span>
                      </div>
                      <p className="subscription-delivery-meta">
                        {delivery.customer?.name || "Customer"} · Quantity{" "}
                        {delivery.quantity || 1}
                        {delivery.combination_name
                          ? ` · ${delivery.combination_name}`
                          : ""}
                      </p>
                      <ScheduledContentDetails delivery={delivery} />
                      <PreparationItems delivery={delivery} />
                    </div>
                    <div className="subscription-delivery-side">
                      <span className="subscription-sequence">
                        Delivery {delivery.sequence} of{" "}
                        {delivery.delivery_count || "—"}
                      </span>
                      <Link
                        className="subscription-bookings-link primary"
                        to={`/seller/subscription-bookings/${delivery.subscription_order_id}`}
                      >
                        View schedule
                      </Link>
                      <Link
                        className="subscription-bookings-link"
                        to={`/seller/subscription-bookings/${delivery.subscription_order_id}#support`}
                      >
                        Raise Issue
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="subscription-bookings-empty">
            No subscription deliveries match this date or filter.
          </div>
        )}
      </div>
      </main>
    </>
  );
}
