import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  isSellerSubscriptionAuthenticationError,
  loadSellerSubscriptionBooking,
  updateSellerSubscriptionDeliveryStatus,
  type SellerSubscriptionBookingDetailPayload,
  type SellerSubscriptionDelivery,
  type SubscriptionBookingItem,
} from "../services/sellerSubscriptionBookingsApi";
import { sellerSubscriptionAssetUrl } from "../lib/sellerSubscriptionsApi";
import { RoleSupportTicketCard } from "../components/RoleSupportTicketCard";
import "../styles/seller-subscription-bookings.css";

const DETAIL_SCHEDULE_STYLES = `
  .subscription-calendar-list{display:grid!important;grid-template-columns:repeat(3,minmax(220px,1fr))!important;gap:16px!important}
  .subscription-calendar-entry{display:flex!important;min-width:0;max-width:340px;flex-direction:column!important;align-items:stretch!important;gap:0!important;overflow:hidden;padding:0!important;border:1px solid #dce9df!important;border-radius:17px!important;background:#fff!important;box-shadow:0 9px 24px rgba(24,74,42,.07)}
  .subscription-calendar-entry.today{border-color:#159a58!important;box-shadow:0 0 0 2px rgba(21,154,88,.12),0 10px 26px rgba(24,74,42,.1)}
  .subscription-calendar-image{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:linear-gradient(145deg,#e8f8ed,#fff5cf)}
  .subscription-calendar-image img{display:block;width:100%;height:100%;object-fit:cover}.subscription-calendar-placeholder{display:grid;width:100%;height:100%;place-items:center;font-size:3.2rem}
  .subscription-calendar-image-label{position:absolute;right:10px;bottom:10px;left:10px;padding:7px 9px;border-radius:8px;background:rgba(7,31,15,.84);color:#fff;font-size:.65rem;font-weight:900;letter-spacing:.05em;text-align:center;text-transform:uppercase}
  .subscription-calendar-card-body{display:flex;flex:1;flex-direction:column;align-items:stretch;gap:8px;padding:13px}
  .subscription-calendar-card-body>strong{color:#183f27;font-size:.92rem}.subscription-calendar-date{color:#5f7065;font-size:.76rem;font-weight:750}
  .subscription-calendar-content{padding:9px 10px;border-radius:10px;background:#f0faf3}.subscription-calendar-content strong{display:block;color:#17673a;font-size:.82rem}.subscription-calendar-content p{display:-webkit-box;overflow:hidden;margin:3px 0 0;color:#627268;font-size:.72rem;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:3}
  .subscription-calendar-card-body .subscription-status{align-self:flex-start}.subscription-calendar-card-body .subscription-status-action{width:100%;margin-top:auto}.subscription-calendar-card-body .subscription-status-complete{margin-top:auto}
  @media(max-width:1020px){.subscription-calendar-list{grid-template-columns:repeat(2,minmax(220px,1fr))!important}}
  @media(max-width:650px){.subscription-calendar-list{grid-template-columns:1fr!important}.subscription-calendar-entry{max-width:330px}}
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
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
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

function DeliveryScheduleVisual({
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
    <div className="subscription-calendar-image">
      {imageUrl ? (
        <img
          src={sellerSubscriptionAssetUrl(imageUrl)}
          alt={content?.title || delivery.item_name || "Scheduled delivery"}
          loading="lazy"
        />
      ) : (
        <span className="subscription-calendar-placeholder" aria-hidden="true">
          🗓️
        </span>
      )}
      <span className="subscription-calendar-image-label">
        {deliveryContentLabel(content)}
      </span>
    </div>
  );
}

function ItemList({
  titleText,
  items,
}: {
  titleText: string;
  items: SubscriptionBookingItem[];
}) {
  return (
    <div className="subscription-prep-block">
      <strong>{titleText}</strong>
      {items.map((item, index) => (
        <div
          className="subscription-prep-row"
          key={`${item.item_id || item.id || item.name}-${index}`}
        >
          <span>{item.name}</span>
          <strong>
            {item.unit_label || "Item"}
            {Number(item.quantity || 1) > 1 ? ` × ${item.quantity}` : ""}
          </strong>
        </div>
      ))}
    </div>
  );
}

function nextStatus(
  delivery: SellerSubscriptionDelivery,
): {
  status: "accepted" | "preparing" | "completed";
  label: string;
} | null {
  const current = String(delivery.status || "unassigned").toLowerCase();
  if (["unassigned", "assigned", "pending", "scheduled"].includes(current)) {
    return { status: "accepted", label: "Accept Delivery" };
  }
  if (current === "accepted") {
    return { status: "preparing", label: "Start Preparing" };
  }
  if (current === "preparing") {
    return { status: "completed", label: "Mark Completed" };
  }
  return null;
}

export function SellerSubscriptionBookingDetailPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [data, setData] =
    useState<SellerSubscriptionBookingDetailPayload | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [workingDeliveryId, setWorkingDeliveryId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadSellerSubscriptionBooking(orderId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (isSellerSubscriptionAuthenticationError(requestError)) {
          window.location.assign(
            `/react/login?next=/seller/subscription-bookings/${encodeURIComponent(orderId)}`,
          );
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load this subscription booking.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function updateStatus(
    delivery: SellerSubscriptionDelivery,
    next: NonNullable<ReturnType<typeof nextStatus>>,
  ) {
    if (!data?.csrf_token || workingDeliveryId) return;
    setWorkingDeliveryId(delivery.id);
    setError("");
    setNotice("");
    try {
      const payload = await updateSellerSubscriptionDeliveryStatus(
        orderId,
        delivery.id,
        next.status,
        data.csrf_token,
      );
      setData(payload);
      setNotice(
        payload.message ||
          `Delivery updated to ${title(next.status)}.`,
      );
    } catch (requestError) {
      if (isSellerSubscriptionAuthenticationError(requestError)) {
        window.location.assign(
          `/react/login?next=/seller/subscription-bookings/${encodeURIComponent(orderId)}`,
        );
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update the delivery status.",
      );
    } finally {
      setWorkingDeliveryId("");
    }
  }

  if (!data?.order) {
    return (
      <main className="subscription-bookings-page">
        <div className="subscription-bookings-container">
          <div
            className={`subscription-bookings-notice${error ? " error" : ""}`}
          >
            {error || "Loading subscription booking…"}
          </div>
        </div>
      </main>
    );
  }

  const { order, deliveries } = data;
  const includedItems = order.included_catalog_items || [];
  const complimentaryItems = order.complimentary_items || [];
  const supportOrder = order as typeof order & Record<string, any>;
  const supportItems = [
    ...(supportOrder.item_id || supportOrder.item_name
      ? [
          {
            id: supportOrder.item_id,
            item_id: supportOrder.item_id,
            name: supportOrder.item_name || "Subscription item",
          },
        ]
      : []),
    ...includedItems,
    ...complimentaryItems,
  ];

  return (
    <>
      <style>{DETAIL_SCHEDULE_STYLES}</style>
      <main className="subscription-bookings-page">
      <div className="subscription-bookings-container">
        <section className="subscription-bookings-heading">
          <div>
            <span className="subscription-bookings-eyebrow">
              Seller subscription booking
            </span>
            <h1>{order.item_name || "Subscription booking"}</h1>
            <p>
              {order.customer?.name || "Customer"} ·{" "}
              {title(order.plan_code)} · {deliveries.length} scheduled
              deliveries
            </p>
          </div>
          <Link
            className="subscription-bookings-link"
            to="/seller/subscription-bookings"
          >
            All Subscription Bookings
          </Link>
        </section>

        {error ? (
          <div className="subscription-bookings-notice error">{error}</div>
        ) : null}
        {notice ? (
          <div className="subscription-bookings-notice success">
            {notice}
          </div>
        ) : null}

        <section className="subscription-booking-grid">
          <article className="subscription-booking-panel">
            <h2>Subscription details</h2>
            <dl className="subscription-details">
              <div>
                <dt>Subscription ID</dt>
                <dd>{order.id}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{title(order.plan_code)}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{order.delivery_schedule_label || "Selected dates"}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{readableDate(order.start_date)}</dd>
              </div>
              <div>
                <dt>End date</dt>
                <dd>{readableDate(order.end_date)}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{order.quantity || 1}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{title(order.status)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{title(order.payment_status)}</dd>
              </div>
            </dl>
          </article>

          <article className="subscription-booking-panel">
            <h2>Customer and preparation</h2>
            <dl className="subscription-details">
              <div>
                <dt>Customer</dt>
                <dd>{order.customer?.name || "Customer"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{order.customer?.phone || "—"}</dd>
              </div>
              <div>
                <dt>Combination</dt>
                <dd>{order.combination_name || "Standard subscription"}</dd>
              </div>
            </dl>
            {includedItems.length ? (
              <ItemList
                titleText="Prepare on every delivery"
                items={includedItems}
              />
            ) : null}
            {complimentaryItems.length ? (
              <ItemList
                titleText="Complimentary items"
                items={complimentaryItems}
              />
            ) : null}
          </article>

          <article className="subscription-booking-panel full">
            <h2>Complete delivery calendar</h2>
            <div className="subscription-calendar-list">
              {deliveries.map((delivery) => {
                const action = nextStatus(delivery);
                const working = workingDeliveryId === delivery.id;
                const content = deliveryContent(delivery);
                return (
                  <div
                    className={`subscription-calendar-entry${delivery.scheduled_date === data.today ? " today" : ""}`}
                    key={delivery.id}
                  >
                    <DeliveryScheduleVisual delivery={delivery} />
                    <div className="subscription-calendar-card-body">
                      <strong>
                        Delivery {delivery.sequence} of{" "}
                        {delivery.delivery_count || deliveries.length}
                      </strong>
                      <span className="subscription-calendar-date">
                        {readableDate(delivery.scheduled_date)}
                      </span>
                      {content?.title || content?.description ? (
                        <div className="subscription-calendar-content">
                          <strong>{content.title || delivery.item_name}</strong>
                          {content.description ? (
                            <p>{content.description}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <span className="subscription-status">
                        {title(delivery.status || "scheduled")}
                      </span>
                      {action ? (
                        <button
                          className={`subscription-status-action ${action.status}`}
                          type="button"
                          disabled={Boolean(workingDeliveryId)}
                          onClick={() =>
                            void updateStatus(delivery, action)
                          }
                        >
                          {working ? "Updating…" : action.label}
                        </button>
                      ) : (
                        <span className="subscription-status-complete">
                          {String(delivery.status).toLowerCase() === "completed"
                            ? "Preparation completed"
                            : "No seller action required"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <RoleSupportTicketCard
          role="seller"
          csrfToken={data.csrf_token || ""}
          contextType="seller_subscription"
          contextId={String(order.id || "")}
          orderId={String(order.id || "")}
          orderNumber={String(
            supportOrder.order_number ||
              supportOrder.subscription_number ||
              order.id ||
              "",
          )}
          items={supportItems}
          title="Seller Support"
          description="Raise a ticket for this subscription order, its items, preparation, payment, pickup, or settlement."
        />
      </div>
      </main>
    </>
  );
}
