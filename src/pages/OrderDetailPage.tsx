import { productDetailHref } from "../lib/productLinks";
import {RefundCustomerPanel} from "../components/RefundCustomerPanel";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ApiRequestError,
  getOrderDetail,
} from "../lib/api";
import type {
  CommerceOrder,
  OrderDeliveryAddress,
  OrderItem,
} from "../types/commerce";

interface SubscriptionOrderItem extends OrderItem {
  is_subscription?: boolean;
  item_type?: string;
  subscription_plan_code?: string;
  subscription_start_date?: string;
  delivery_schedule_label?: string;
  delivery_count?: number;
  delivery_dates?: string[];
  subscription_combination_name?: string;
  included_catalog_items?: Array<{
    name?: string;
    unit_label?: string;
    quantity?: number;
  }>;
  complimentary_items?: Array<{
    name?: string;
    unit_label?: string;
  }>;
}

interface DeliveryAwareOrderItem extends SubscriptionOrderItem {
  product_type?: string;
  delivery_time_slot?: "morning" | "evening" | "both" | string;
  selected_delivery_time_slots?: Array<"morning" | "evening" | string>;
  customer_selected_delivery_time_slots?: Array<
    "morning" | "evening" | string
  >;
  delivery_type?: "instant_delivery" | "one_day_delivery" | string;
  promised_delivery_date?: string;
  promised_delivery_dates?: string[];
  promised_delivery_slot?: string;
  promised_delivery_slot_id?: string;
  promised_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  delivery_tracking_id?: string;
  delivery_delivered_at?: string;
  delivery_admin_note?: string;
}

interface DeliveryWindow {
  slot?: string;
  slot_id?: string;
  label?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  time_label?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;
}

const REACT_COMMERCE_API_PREFIX = "/react/api/commerce";

type UnknownRecord = Record<string, unknown>;

type ExtendedCommerceOrder = CommerceOrder & {
  discount?: number;
  coupon_code?: string;
  coupon?: UnknownRecord | null;
  promised_delivery_date?: string;
  promised_delivery_dates?: string[];
  promised_delivery_slot?: string;
  promised_delivery_slot_id?: string;
  promised_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_status?: string;
  delivery_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_schedule_timezone?: string;
  original_payment_method?: string;
  cod_collection_method?: string;
  cod_collection_reference?: string;
  online_payment_requested_at?: string;
};

type OrderDetailApiPayload = {
  success?: boolean;
  order: CommerceOrder;
  currency_symbol?: string;
  csrf_token?: string;
  coupon_enabled?: boolean;
  coupon_api_url?: string;
  payment_api_url?: string;
};

type CouponUpdatePayload = {
  success?: boolean;
  message?: string;
  order?: CommerceOrder;
  csrf_token?: string;
  payment_api_url?: string;
};

type PaymentPayload = {
  success?: boolean;
  csrf_token: string;
  razorpay: {
    key_id: string;
    order_id: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
  };
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on?: (
    event: "payment.failed",
    callback: (response: RazorpayFailure) => void,
  ) => void;
};

type RazorpayConstructor = new (
  options: UnknownRecord,
) => RazorpayInstance;

class CommerceRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly csrfToken: string;

  constructor(
    message: string,
    status: number,
    code = "REQUEST_FAILED",
    csrfToken = "",
  ) {
    super(message);
    this.name = "CommerceRequestError";
    this.status = status;
    this.code = code;
    this.csrfToken = csrfToken;
  }
}

const ORDER_DETAIL_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .react-order-detail-page {
    --order-detail-olive: #55111f;
    --order-detail-olive-hover: #3d0b17;
    --order-detail-olive-soft: #f8ecef;
    --order-detail-ink: #301920;
    --order-detail-muted: #75646a;
    --order-detail-border: #ead7da;
    --order-detail-page-gutter: clamp(16px, 2.4vw, 48px);
    width: 100%;
    padding: 32px var(--order-detail-page-gutter) 56px;
    box-sizing: border-box;
    min-width: 0;
    overflow-x: clip;
    background: #fbf7f0;
    color: var(--order-detail-ink);
    font-family: "Nunito", Arial, Helvetica, sans-serif;
  }

  .react-order-detail-page *,
  .react-order-detail-page *::before,
  .react-order-detail-page *::after {
    box-sizing: border-box;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }

  .order-detail-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .order-detail-eyebrow {
    display: block;
    margin-bottom: 8px;
    color: var(--order-detail-olive);
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .order-detail-heading h1 {
    margin: 0;
    color: var(--order-detail-ink);
    font-size: clamp(2rem, 4vw, 3.15rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }

  .order-detail-heading p {
    margin: 10px 0 0;
    color: var(--order-detail-muted);
  }

  .order-detail-heading-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 9px;
  }

  .order-detail-button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 11px 18px;
    border: 1px solid transparent;
    border-radius: 12px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 780;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .order-detail-button:hover {
    transform: translateY(-1px);
  }

  .order-detail-button:disabled {
    cursor: wait;
    opacity: 0.62;
    transform: none;
  }

  .order-detail-button-primary {
    border-color: var(--order-detail-olive);
    background: var(--order-detail-olive);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(85, 17, 31, 0.2);
  }

  .order-detail-button-primary:hover {
    border-color: var(--order-detail-olive-hover);
    background: var(--order-detail-olive-hover);
    color: #ffffff;
  }

  .order-detail-button:focus-visible,
  .order-detail-item-media:focus-visible,
  a.order-detail-item-name:focus-visible,
  .order-detail-coupon-form input:focus-visible {
    outline: 3px solid rgba(85, 17, 31, 0.22);
    outline-offset: 2px;
  }

  .order-detail-button-secondary {
    border-color: var(--order-detail-border);
    background: #ffffff;
    color: var(--order-detail-ink);
  }

  .order-detail-button-secondary:hover {
    border-color: var(--order-detail-olive);
    background: var(--order-detail-olive-soft);
  }

  .order-detail-button-full {
    width: 100%;
  }

  .order-detail-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(310px, 390px);
    align-items: start;
    gap: 24px;
  }

  .order-detail-card {
    border: 1px solid var(--order-detail-border);
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(85, 17, 31, 0.07);
  }

  .order-detail-main-card {
    padding: 24px;
    border-top: 2px solid #d8a949;
  }

  .order-detail-main-card h2,
  .order-detail-summary h2 {
    margin: 0 0 18px;
    color: var(--order-detail-ink);
    font-size: 1.35rem;
  }

  .order-detail-items {
    display: grid;
    gap: 14px;
  }

  .order-detail-item {
    display: grid;
    grid-template-columns:
      160px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: start;
    gap: 12px 18px;
    padding: 14px;
    border: 1px solid var(--order-detail-border);
    border-radius: 18px;
    background:
      linear-gradient(
        135deg,
        #ffffff 0%,
        #fbf7f0 100%
      );
    box-shadow:
      0 10px 28px
      rgba(85, 17, 31, 0.055);
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .order-detail-item:hover {
    transform: translateY(-1px);
    border-color: var(--order-detail-olive);
    box-shadow:
      0 15px 34px
      rgba(85, 17, 31, 0.085);
  }

  .order-detail-item-media {
    grid-column: 1;
    grid-row: 1 / span 2;
    width: 160px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--order-detail-border);
    border-radius: 15px;
    background:
      radial-gradient(
        circle at top left,
        #fbf7f0,
        var(--order-detail-olive-soft)
      );
    color: var(--order-detail-olive);
    text-decoration: none;
  }

  .order-detail-item-media img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .order-detail-item-placeholder {
    font-size: 2.65rem;
    line-height: 1;
    filter:
      drop-shadow(
        0 8px 13px
        rgba(85, 17, 31, 0.15)
      );
  }

  .order-detail-item-copy {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }

  .order-detail-item-category {
    display: block;
    margin-bottom: 5px;
    color: var(--order-detail-olive);
    font-size: 0.7rem;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .order-detail-item-name {
    color: var(--order-detail-ink);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  a.order-detail-item-name {
    text-decoration: none;
  }

  a.order-detail-item-name:hover {
    color: var(--order-detail-olive);
  }

  .order-detail-item-copy p {
    margin: 6px 0 0;
    color: var(--order-detail-muted);
    font-size: 0.87rem;
    line-height: 1.45;
  }

  .order-detail-item-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
  }

  .order-detail-item-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 9px;
    border: 1px solid var(--order-detail-border);
    border-radius: 999px;
    background: #fbf7f0;
    color: var(--order-detail-muted);
    font-size: 0.72rem;
    font-weight: 750;
  }

  .order-detail-fulfillment {
    grid-column: 2;
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 11px;
    border: 1px solid var(--order-detail-border);
    border-radius: 12px;
    background: var(--order-detail-olive-soft);
  }

  .order-detail-fulfillment > div {
    min-width: 0;
  }

  .order-detail-fulfillment dt {
    margin: 0 0 4px;
    color: var(--order-detail-muted);
    font-size: 0.63rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .order-detail-fulfillment dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--order-detail-ink);
    font-size: 0.77rem;
    font-weight: 850;
    line-height: 1.35;
  }


  .order-detail-subscription {
    display: grid;
    gap: 8px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid var(--order-detail-border);
    border-radius: 12px;
    background: #fbf7f0;
  }

  .order-detail-subscription-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--order-detail-muted);
    font-size: 0.78rem;
  }

  .order-detail-subscription-row strong {
    color: var(--order-detail-ink);
    text-align: right;
  }

  .order-detail-subscription-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .order-detail-subscription-chip {
    padding: 5px 8px;
    border-radius: 8px;
    background: var(--order-detail-olive-soft);
    color: var(--order-detail-muted);
    font-size: 0.7rem;
    font-weight: 750;
  }

  .order-detail-item-price {
    grid-column: 3;
    grid-row: 1 / span 2;
    min-width: 170px;
    height: 100%;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    text-align: right;
  }

  .order-detail-item-subtotal {
    color: var(--order-detail-olive);
    font-size: 1.08rem;
    font-weight: 900;
  }

  .order-detail-item-price small {
    color: var(--order-detail-muted);
    font-size: 0.76rem;
    line-height: 1.4;
  }

  .order-detail-item-report {
    min-width: 170px;
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding: 11px 18px;
    border: 1px solid #b42318;
    border-radius: 11px;
    background: #b42318;
    color: #ffffff;
    font-size: 0.88rem;
    font-weight: 850;
    line-height: 1.1;
    text-align: center;
    text-decoration: none;
    box-shadow: 0 8px 18px rgba(180, 35, 24, 0.18);
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .order-detail-item-report:hover {
    border-color: #991b1b;
    background: #991b1b;
    color: #ffffff;
    transform: translateY(-1px);
  }

  .order-detail-empty-item {
    display: block;
    padding: 24px;
    border: 1px dashed var(--order-detail-border);
    border-radius: 16px;
    background: #fbf7f0;
    color: var(--order-detail-muted);
    text-align: center;
  }

  .order-detail-address-heading {
    margin-top: 30px !important;
  }

  .order-detail-address {
    padding: 19px;
    border: 1px solid var(--order-detail-border);
    border-radius: 16px;
    background: #fbf7f0;
  }

  .order-detail-address strong {
    color: var(--order-detail-ink);
    font-size: 1rem;
  }

  .order-detail-address p {
    margin: 7px 0 0;
    color: var(--order-detail-muted);
    line-height: 1.55;
  }

  .order-detail-gps {
    display: inline-flex;
    margin-top: 12px;
    padding: 7px 10px;
    border-radius: 999px;
    background: var(--order-detail-olive-soft);
    color: var(--order-detail-olive);
    font-size: 0.76rem;
    font-weight: 750;
  }

  .order-detail-summary {
    position: sticky;
    top: 94px;
    padding: 24px;
    border-top: 2px solid #d8a949;
  }

  .order-detail-status {
    display: inline-flex;
    align-items: center;
    margin-bottom: 18px;
    padding: 7px 11px;
    border-radius: 999px;
    background: #fbf7f0;
    color: var(--order-detail-muted);
    font-size: 0.75rem;
    font-weight: 850;
    text-transform: capitalize;
  }

  .order-detail-status.placed,
  .order-detail-status.paid,
  .order-detail-status.delivered,
  .order-detail-status.completed {
    background: var(--order-detail-olive-soft);
    color: var(--order-detail-olive);
    border: 1px solid #e9c778;
  }

  .order-detail-status.payment-pending,
  .order-detail-status.pending,
  .order-detail-status.processing {
    background: var(--order-detail-olive-soft);
    color: var(--order-detail-olive);
  }

  .order-detail-status.failed,
  .order-detail-status.cancelled,
  .order-detail-status.verification-failed {
    background: #fee2e2;
    color: #991b1b;
  }

  .order-detail-coupon {
    margin: 0 0 16px;
    padding: 15px;
    border: 1px solid var(--order-detail-border);
    border-radius: 15px;
    background: var(--order-detail-olive-soft);
  }

  .order-detail-coupon-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 11px;
  }

  .order-detail-coupon-head strong {
    color: var(--order-detail-ink);
  }

  .order-detail-coupon-head span {
    max-width: 160px;
    color: var(--order-detail-muted);
    font-size: 0.72rem;
    line-height: 1.35;
    text-align: right;
  }

  .order-detail-coupon-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 9px;
  }

  .order-detail-coupon-form input {
    width: 100%;
    min-width: 0;
    min-height: 43px;
    padding: 9px 11px;
    border: 1px solid var(--order-detail-border);
    border-radius: 10px;
    background: #ffffff;
    color: var(--order-detail-ink);
    font: inherit;
    font-weight: 700;
    text-transform: uppercase;
    outline: none;
  }

  .order-detail-coupon-form input:focus {
    border-color: var(--order-detail-olive);
    box-shadow: 0 0 0 3px rgba(85, 17, 31, 0.13);
  }

  .order-detail-coupon-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    padding: 9px 10px;
    border: 1px solid var(--order-detail-border);
    border-radius: 10px;
    background: var(--order-detail-olive-soft);
    color: var(--order-detail-olive);
    font-size: 0.78rem;
    font-weight: 760;
  }

  .order-detail-coupon-current .order-detail-button {
    min-height: 34px;
    padding: 6px 10px;
    font-size: 0.76rem;
  }

  .order-detail-coupon-message {
    margin: 9px 0 0;
    color: var(--order-detail-olive);
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.45;
  }

  .order-detail-coupon-message.error {
    color: #b42332;
  }

  .order-detail-summary-discount,
  .order-detail-summary-discount strong {
    color: var(--order-detail-olive);
  }

  .order-detail-summary-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 12px 0;
    border-bottom: 1px solid var(--order-detail-border);
    color: var(--order-detail-muted);
  }

  .order-detail-summary-line strong {
    color: var(--order-detail-ink);
  }

  .order-detail-summary-grand {
    margin-bottom: 18px;
    padding: 18px 0;
    border-bottom: 0;
    color: var(--order-detail-ink);
    font-size: 1.08rem;
    font-weight: 820;
  }

  .order-detail-summary-grand strong {
    color: var(--order-detail-olive);
    font-size: 1.35rem;
  }

  .order-detail-payment-meta {
    margin: 0 0 18px;
    padding: 16px;
    border-radius: 14px;
    background: #fbf7f0;
  }

  .order-detail-payment-meta p {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin: 0;
    padding: 7px 0;
    color: var(--order-detail-muted);
    font-size: 0.87rem;
  }

  .order-detail-payment-meta p + p {
    border-top: 1px solid var(--order-detail-border);
  }

  .order-detail-payment-meta strong {
    color: var(--order-detail-ink);
  }

  .order-detail-payment-meta span {
    text-align: right;
    text-transform: capitalize;
  }

  .order-detail-cod-online {
    margin: 0 0 16px;
    padding: 14px;
    border: 1px solid #ead7da;
    border-radius: 14px;
    background: #fbf7f0;
  }

  .order-detail-cod-online strong {
    display: block;
    margin-bottom: 5px;
    color: var(--order-detail-ink);
  }

  .order-detail-cod-online p {
    margin: 0;
    color: var(--order-detail-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .order-detail-warning {
    margin: 16px 0 0;
    padding: 13px 14px;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fff1f2;
    color: #9f1d2d;
    font-size: 0.84rem;
    line-height: 1.5;
  }

  .order-detail-alert,
  .order-detail-loading,
  .order-detail-empty {
    padding: 24px;
    border-radius: 18px;
    text-align: center;
  }

  .order-detail-alert {
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #9f1d2d;
    font-weight: 650;
  }

  .order-detail-loading,
  .order-detail-empty {
    border: 1px solid var(--order-detail-border);
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(85, 17, 31, 0.07);
    color: var(--order-detail-muted);
  }

  .order-detail-empty h2 {
    margin: 0 0 8px;
    color: var(--order-detail-ink);
  }

  .order-detail-empty p {
    margin: 0 0 20px;
  }

  @media (max-width: 1100px) {
    .react-order-detail-page {
      width: 100%;
      max-width: none;
      padding-top: 28px;
      padding-right: var(--order-detail-page-gutter);
      padding-bottom: 50px;
      padding-left: var(--order-detail-page-gutter);
    }

    .order-detail-layout {
      grid-template-columns: minmax(0, 1fr) 330px;
    }
  }

  @media (max-width: 850px) {
    .order-detail-layout {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .order-detail-summary {
      position: static;
      top: auto;
    }
  }

  @media (max-width: 620px) {
    .react-order-detail-page {
      min-height: 100dvh;
      padding-top: 12px;
      padding-right: var(--order-detail-page-gutter);
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      padding-left: var(--order-detail-page-gutter);
      background: #fbf7f0;
    }

    /* Compact mobile header. */
    .order-detail-heading {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
      gap: 9px;
      margin: 0 0 12px;
      padding: 2px 0 0;
    }

    .order-detail-eyebrow,
    .order-detail-heading p {
      display: none;
    }

    .order-detail-heading h1 {
      margin: 0;
      font-size: clamp(1.42rem, 6.6vw, 1.72rem);
      line-height: 1.05;
      letter-spacing: -0.035em;
      overflow-wrap: anywhere;
    }

    .order-detail-heading-actions {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }

    .order-detail-heading-actions .order-detail-button {
      width: 100%;
      min-width: 0;
      min-height: 37px;
      padding: 7px 6px;
      border-radius: 9px;
      box-shadow: none;
      font-size: .69rem;
      line-height: 1.05;
      white-space: normal;
      text-align: center;
    }

    .order-detail-alert,
    .order-detail-loading,
    .order-detail-empty {
      padding: 14px 12px;
      border-radius: 13px;
      font-size: .83rem;
      line-height: 1.35;
    }

    .order-detail-layout {
      gap: 9px;
    }

    .order-detail-card {
      border-radius: 14px;
      box-shadow: 0 8px 22px rgba(85, 17, 31, .055);
    }

    .order-detail-main-card,
    .order-detail-summary {
      padding: 11px;
      border-radius: 14px;
    }

    .order-detail-main-card h2,
    .order-detail-summary h2 {
      margin-bottom: 10px;
      font-size: 1.05rem;
      line-height: 1.15;
    }

    .order-detail-items {
      gap: 8px;
    }

    /* Product stays visually dominant without using a tall card. */
    .order-detail-item {
      grid-template-columns: 118px minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      align-items: start;
      gap: 10px;
      padding: 10px;
      border-radius: 14px;
      box-shadow: none;
    }

    .order-detail-item:hover {
      transform: none;
    }

    .order-detail-item-media {
      grid-column: 1;
      grid-row: 1;
      width: 118px;
      height: 148px;
      border-radius: 12px;
    }

    .order-detail-item-copy {
      grid-column: 2;
      grid-row: 1;
      align-self: start;
      min-width: 0;
      padding-top: 1px;
    }

    .order-detail-item-placeholder {
      font-size: 2rem;
    }

    .order-detail-item-category {
      margin-bottom: 3px;
      font-size: .57rem;
      letter-spacing: .035em;
    }

    .order-detail-item-name {
      font-size: .94rem;
      line-height: 1.16;
    }

    .order-detail-item-copy p {
      margin-top: 4px;
      font-size: .72rem;
      line-height: 1.3;
    }

    .order-detail-item-pills {
      gap: 4px;
      margin-top: 6px;
    }

    .order-detail-item-pill {
      padding: 4px 6px;
      font-size: .58rem;
      line-height: 1.1;
    }

    .order-detail-fulfillment {
      grid-column: 1 / -1;
      grid-row: 2;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
      margin: 0;
      padding: 3px 0;
      border: 0;
      border-top: 1px solid var(--order-detail-border);
      border-bottom: 1px solid var(--order-detail-border);
      border-radius: 0;
      background: transparent;
    }

    /* Plain professional detail layout — no individual cards/boxes. */
    .order-detail-fulfillment > div {
      min-width: 0;
      padding: 9px 10px;
      border-radius: 0;
      background: transparent;
    }

    .order-detail-fulfillment > div:nth-child(odd) {
      border-right: 1px solid var(--order-detail-border);
    }

    .order-detail-fulfillment > div:nth-child(n + 3) {
      border-top: 1px solid rgba(234, 215, 218, .72);
    }

    .order-detail-fulfillment dt {
      margin: 0 0 3px;
      color: var(--order-detail-muted);
      font-size: .53rem;
      font-weight: 800;
      letter-spacing: .025em;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .order-detail-fulfillment dd {
      margin: 0;
      color: var(--order-detail-ink);
      font-size: .67rem;
      font-weight: 760;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .order-detail-subscription {
      gap: 5px;
      margin-top: 7px;
      padding: 8px;
      border-radius: 9px;
    }

    .order-detail-subscription-row {
      gap: 8px;
      font-size: .65rem;
      line-height: 1.25;
    }

    .order-detail-subscription-chip {
      padding: 4px 6px;
      font-size: .58rem;
    }

    .order-detail-item-price {
      grid-column: 1 / -1;
      grid-row: 3;
      width: 100%;
      min-width: 0;
      height: auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      justify-items: stretch;
      gap: 7px;
      padding-top: 8px;
      border-top: 1px solid var(--order-detail-border);
      text-align: left;
    }

    .order-detail-item-price small {
      font-size: .66rem;
      line-height: 1.25;
      text-align: left;
    }

    .order-detail-item-subtotal {
      font-size: .94rem;
      text-align: right;
    }

    .order-detail-item-report {
      grid-column: 1 / -1;
      width: 100%;
      min-width: 0;
      min-height: 44px;
      margin-top: 3px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: .78rem;
      box-shadow: none;
    }


    .order-detail-address-heading {
      margin-top: 15px !important;
    }

    .order-detail-address {
      padding: 11px;
      border-radius: 11px;
    }

    .order-detail-address strong {
      font-size: .88rem;
    }

    .order-detail-address p {
      margin-top: 5px;
      font-size: .72rem;
      line-height: 1.35;
    }

    .order-detail-gps {
      margin-top: 7px;
      padding: 5px 7px;
      font-size: .61rem;
      overflow-wrap: anywhere;
    }

    /* Summary is no longer sticky and is kept compact on phones. */
    .order-detail-summary {
      position: static;
    }

    .order-detail-status {
      margin-bottom: 10px;
      padding: 5px 8px;
      font-size: .63rem;
    }

    .order-detail-coupon {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 11px;
    }

    .order-detail-coupon-head {
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 7px;
    }

    .order-detail-coupon-head strong {
      font-size: .82rem;
    }

    .order-detail-coupon-head span {
      max-width: 135px;
      font-size: .61rem;
      line-height: 1.25;
      text-align: right;
    }

    .order-detail-coupon-form {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px;
    }

    .order-detail-coupon-form input {
      min-height: 39px;
      padding: 8px 9px;
      border-radius: 8px;
      font-size: 16px;
    }

    .order-detail-coupon-form .order-detail-button {
      min-height: 39px;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: .68rem;
      box-shadow: none;
    }

    .order-detail-coupon-current {
      margin-top: 7px;
      padding: 7px 8px;
      border-radius: 8px;
      font-size: .67rem;
    }

    .order-detail-coupon-current .order-detail-button {
      min-height: 31px;
      padding: 5px 8px;
      font-size: .65rem;
    }

    .order-detail-coupon-message {
      margin-top: 6px;
      font-size: .66rem;
      line-height: 1.3;
    }

    .order-detail-summary-line {
      gap: 10px;
      padding: 8px 0;
      font-size: .76rem;
    }

    .order-detail-summary-grand {
      margin-bottom: 10px;
      padding: 11px 0;
      font-size: .9rem;
    }

    .order-detail-summary-grand strong {
      font-size: 1.08rem;
    }

    .order-detail-payment-meta {
      margin-bottom: 10px;
      padding: 9px;
      border-radius: 10px;
    }

    .order-detail-payment-meta p {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: .7rem;
    }

    .order-detail-payment-meta span {
      max-width: 58%;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .order-detail-cod-online {
      margin-bottom: 10px;
      padding: 9px;
      border-radius: 10px;
    }

    .order-detail-cod-online strong {
      font-size: .78rem;
    }

    .order-detail-cod-online p {
      font-size: .68rem;
      line-height: 1.3;
    }

    .order-detail-warning {
      margin-top: 9px;
      padding: 9px 10px;
      border-radius: 9px;
      font-size: .7rem;
      line-height: 1.35;
    }

    .order-detail-summary > .order-detail-button,
    .order-detail-button-full {
      min-height: 40px;
      padding: 8px 10px;
      border-radius: 9px;
      box-shadow: none;
      font-size: .75rem;
    }
  }

  @media (max-width: 390px) {
    .react-order-detail-page {
      --order-detail-page-gutter: 16px;
    }

    .order-detail-heading h1 {
      font-size: 1.34rem;
    }

    .order-detail-heading-actions {
      gap: 5px;
    }

    .order-detail-heading-actions .order-detail-button {
      min-height: 35px;
      padding-inline: 4px;
      font-size: .65rem;
    }

    .order-detail-main-card,
    .order-detail-summary {
      padding: 9px;
      border-radius: 12px;
    }

    .order-detail-item {
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 8px;
      padding: 8px;
    }

    .order-detail-item-media {
      width: 104px;
      height: 130px;
    }

    .order-detail-coupon-form .order-detail-button {
      padding-inline: 8px;
      font-size: .64rem;
    }

    .order-detail-payment-meta p {
      font-size: .66rem;
    }
  }
  /* ================================================================
     ORDER DETAIL — SAME HORIZONTAL GUTTER AS PUBLIC ORDER PAGE
     ================================================================ */
  @media (min-width: 1700px) {
    .react-order-detail-page {
      --order-detail-page-gutter: clamp(24px, 2.4vw, 48px);
    }
  }

  @media (max-width: 1439px) {
    .react-order-detail-page {
      --order-detail-page-gutter: clamp(16px, 2vw, 28px);
    }
  }

  @media (max-width: 900px) {
    .react-order-detail-page {
      --order-detail-page-gutter: clamp(16px, 2vw, 22px);
    }
  }

  @media (max-width: 700px) {
    .react-order-detail-page {
      --order-detail-page-gutter: 16px;
    }
  }

  @media (max-width: 390px) {
    .react-order-detail-page {
      --order-detail-page-gutter: 16px;
    }
  }

  .react-order-detail-page,
  .order-detail-heading,
  .order-detail-layout,
  .order-detail-alert,
  .order-detail-loading,
  .order-detail-empty {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .order-detail-heading,
  .order-detail-layout,
  .order-detail-alert,
  .order-detail-loading,
  .order-detail-empty {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

`;


/**
 * Responsive refinements for the existing Order Detail page.
 * Kept page-local to avoid changing the global header, order list, or
 * shared RefundCustomerPanel / OrderStatusTimeline components.
 */
const ORDER_DETAIL_RESPONSIVE_CSS = `
  .react-order-detail-page .order-detail-heading,
  .react-order-detail-page .order-detail-layout,
  .react-order-detail-page .order-detail-main-card,
  .react-order-detail-page .order-detail-summary,
  .react-order-detail-page .order-detail-items,
  .react-order-detail-page .order-detail-item,
  .react-order-detail-page .order-detail-item-copy,
  .react-order-detail-page .order-detail-fulfillment,
  .react-order-detail-page .order-detail-item-price {
    min-width: 0;
    max-width: 100%;
  }

  /* Product photos: show the whole item instead of cropping it. */
  .react-order-detail-page .order-detail-item-media img {
    object-fit: contain !important;
    object-position: center !important;
    background: #ffffff;
  }

  .react-order-detail-page .order-detail-heading h1,
  .react-order-detail-page .order-detail-item-name,
  .react-order-detail-page .order-detail-subscription-row strong,
  .react-order-detail-page .order-detail-summary-line strong,
  .react-order-detail-page .order-detail-payment-meta span {
    overflow-wrap: anywhere;
  }

  @media (max-width: 1000px) {
    /* Avoid squeezed columns and fixed/sticky summary on tablets. */
    .react-order-detail-page .order-detail-layout {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      align-items: stretch !important;
      gap: 14px !important;
    }
    .react-order-detail-page .order-detail-summary {
      position: static !important;
      top: auto !important;
      width: 100% !important;
      max-width: none !important;
    }
    .react-order-detail-page .order-detail-main-card {
      width: 100% !important;
    }
  }

  @media (min-width: 621px) and (max-width: 1000px) {
    .react-order-detail-page .order-detail-item {
      display: grid !important;
      grid-template-columns: 132px minmax(0, 1fr) !important;
      grid-template-rows: auto auto auto !important;
      gap: 12px 16px !important;
    }
    .react-order-detail-page .order-detail-item-media {
      grid-column: 1 !important;
      grid-row: 1 !important;
      width: 132px !important;
      height: 132px !important;
    }
    .react-order-detail-page .order-detail-item-copy {
      grid-column: 2 !important;
      grid-row: 1 !important;
    }
    .react-order-detail-page .order-detail-fulfillment {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
    }
    .react-order-detail-page .order-detail-item-price {
      grid-column: 1 / -1 !important;
      grid-row: 3 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      flex-wrap: wrap !important;
      gap: 10px 14px !important;
      width: 100% !important;
      height: auto !important;
      min-width: 0 !important;
      padding-top: 10px !important;
      border-top: 1px solid var(--order-detail-border);
      text-align: left !important;
    }
    .react-order-detail-page .order-detail-item-report {
      min-width: 150px !important;
      margin: 0 0 0 auto !important;
    }
    .react-order-detail-page .order-detail-item-price small {
      text-align: left !important;
    }
  }

  @media (max-width: 620px) {
    .react-order-detail-page {
      --order-detail-page-gutter: 14px;
      width: 100% !important;
      padding-top: 14px !important;
      padding-bottom: calc(35px + env(safe-area-inset-bottom, 0px)) !important;
      overflow-x: clip;
    }

    /* Header: clean title and readable placement date. */
    .react-order-detail-page .order-detail-heading {
      gap: 11px !important;
      margin-bottom: 14px !important;
    }
    .react-order-detail-page .order-detail-heading h1 {
      font-size: clamp(1.28rem, 5.5vw, 1.75rem) !important;
      line-height: 1.18 !important;
      letter-spacing: -.02em;
    }
    .react-order-detail-page .order-detail-heading > div:first-child p {
      display: block !important;
      margin: 6px 0 0 !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .react-order-detail-page .order-detail-heading-actions {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }
    .react-order-detail-page .order-detail-heading-actions > .order-detail-button {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 42px !important;
      padding: 9px 8px !important;
      font-size: 12px !important;
      font-weight: 750 !important;
      line-height: 1.25 !important;
      overflow-wrap: anywhere;
      text-align: center;
      box-shadow: none !important;
    }
    .react-order-detail-page .order-detail-heading-actions > .order-detail-button:last-child {
      grid-column: 1 / -1 !important;
    }

    .react-order-detail-page .order-detail-layout {
      gap: 12px !important;
    }
    .react-order-detail-page .order-detail-main-card,
    .react-order-detail-page .order-detail-summary {
      min-width: 0 !important;
      width: 100% !important;
      padding: 13px !important;
      border: 1px solid #ead7da !important;
      border-top: 2px solid #d8a949 !important;
      border-radius: 14px !important;
      box-shadow: 0 5px 16px rgba(85, 17, 31, .04) !important;
    }
    .react-order-detail-page .order-detail-main-card h2,
    .react-order-detail-page .order-detail-summary h2 {
      margin: 0 0 12px !important;
      font-size: 16px !important;
      line-height: 1.25 !important;
    }
    .react-order-detail-page .order-detail-items {
      gap: 12px !important;
    }

    /* Each purchased item: image + description, delivery then price/actions. */
    .react-order-detail-page .order-detail-item {
      display: grid !important;
      grid-template-columns: 96px minmax(0, 1fr) !important;
      grid-template-rows: auto auto auto !important;
      gap: 11px 12px !important;
      align-items: start !important;
      padding: 10px !important;
      border: 1px solid #e7d5c5 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }
    .react-order-detail-page .order-detail-item-media {
      grid-column: 1 !important;
      grid-row: 1 !important;
      width: 96px !important;
      height: 105px !important;
      max-width: 100%;
      border-radius: 10px !important;
      background: #fffdfa !important;
    }
    .react-order-detail-page .order-detail-item-copy {
      grid-column: 2 !important;
      grid-row: 1 !important;
      width: 100% !important;
      min-width: 0 !important;
      padding-top: 0 !important;
    }
    .react-order-detail-page .order-detail-item-category {
      margin: 0 0 5px !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
    }
    .react-order-detail-page .order-detail-item-name {
      display: block !important;
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    .react-order-detail-page .order-detail-item-copy p {
      margin: 5px 0 0 !important;
      font-size: 12px !important;
    }
    .react-order-detail-page .order-detail-item-pills {
      margin-top: 8px !important;
      gap: 5px !important;
    }
    .react-order-detail-page .order-detail-item-pill {
      padding: 4px 7px !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
    }
    .react-order-detail-page .order-detail-subscription {
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-subscription-row {
      flex-wrap: wrap;
      font-size: 12px !important;
    }
    .react-order-detail-page .order-detail-fulfillment {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 2px 0 !important;
      gap: 0 !important;
      border: 0 !important;
      border-top: 1px solid #ead7da !important;
      border-bottom: 1px solid #ead7da !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
    .react-order-detail-page .order-detail-fulfillment > div {
      min-width: 0 !important;
      padding: 8px 7px !important;
    }
    .react-order-detail-page .order-detail-fulfillment dt {
      margin-bottom: 4px !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
      letter-spacing: .01em;
    }
    .react-order-detail-page .order-detail-fulfillment dd {
      margin: 0 !important;
      font-size: 12px !important;
      line-height: 1.35 !important;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-item-price {
      grid-column: 1 / -1 !important;
      grid-row: 3 !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 6px 10px !important;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      padding-top: 2px !important;
      border: 0 !important;
      text-align: left !important;
    }
    .react-order-detail-page .order-detail-item-subtotal {
      order: 1;
      font-size: 17px !important;
    }
    .react-order-detail-page .order-detail-item-price small {
      order: 2;
      font-size: 12px !important;
    }
    .react-order-detail-page .order-detail-item-report {
      order: 3;
      flex: 0 0 100%;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 42px !important;
      margin: 6px 0 0 !important;
      padding: 10px 12px !important;
      border-radius: 9px !important;
      font-size: 13px !important;
    }

    /* Delivery address and total panel are visible and easy to read. */
    .react-order-detail-page .order-detail-address-heading {
      margin-top: 20px !important;
    }
    .react-order-detail-page .order-detail-address {
      padding: 12px !important;
      border-radius: 10px !important;
    }
    .react-order-detail-page .order-detail-address strong {
      font-size: 14px !important;
    }
    .react-order-detail-page .order-detail-address p {
      font-size: 12px !important;
      line-height: 1.5 !important;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-gps {
      max-width: 100%;
      font-size: 11px !important;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-status {
      margin-bottom: 12px !important;
      font-size: 12px !important;
    }
    .react-order-detail-page .order-detail-summary-line {
      gap: 10px !important;
      padding: 10px 0 !important;
      font-size: 13px !important;
    }
    .react-order-detail-page .order-detail-summary-line strong {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .react-order-detail-page .order-detail-summary-grand {
      margin-bottom: 12px !important;
      font-size: 15px !important;
    }
    .react-order-detail-page .order-detail-summary-grand strong {
      font-size: 19px !important;
    }
    .react-order-detail-page .order-detail-payment-meta {
      padding: 10px !important;
    }
    .react-order-detail-page .order-detail-payment-meta p {
      display: flex !important;
      flex-wrap: wrap;
      gap: 7px;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .react-order-detail-page .order-detail-payment-meta span {
      min-width: 0;
      max-width: 65%;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-coupon {
      padding: 11px !important;
    }
    .react-order-detail-page .order-detail-coupon-head {
      display: block !important;
      margin-bottom: 10px !important;
    }
    .react-order-detail-page .order-detail-coupon-head span {
      display: block;
      max-width: none !important;
      margin-top: 4px;
      font-size: 11px !important;
      text-align: left !important;
      line-height: 1.35;
    }
    .react-order-detail-page .order-detail-coupon-form {
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 7px !important;
      min-width: 0;
    }
    .react-order-detail-page .order-detail-coupon-form input {
      min-width: 0 !important;
      min-height: 43px !important;
      font-size: 16px !important;
    }
    .react-order-detail-page .order-detail-coupon-form .order-detail-button {
      min-height: 43px !important;
      padding: 9px 11px !important;
      font-size: 12px !important;
    }
    .react-order-detail-page .order-detail-coupon-current {
      flex-wrap: wrap;
      overflow-wrap: anywhere;
    }
    .react-order-detail-page .order-detail-button-full {
      width: 100% !important;
      min-height: 44px !important;
      font-size: 13px !important;
    }
  }

  @media (max-width: 360px) {
    .react-order-detail-page { --order-detail-page-gutter: 10px; }
    .react-order-detail-page .order-detail-item {
      grid-template-columns: 80px minmax(0, 1fr) !important;
      gap: 9px !important;
      padding: 9px !important;
    }
    .react-order-detail-page .order-detail-item-media {
      width: 80px !important;
      height: 90px !important;
    }
    .react-order-detail-page .order-detail-item-name {
      font-size: 13px !important;
    }
    .react-order-detail-page .order-detail-fulfillment > div {
      padding: 7px 5px !important;
    }
  }
`;

function backendPageUrl(path: string): string {
  const baseUrl = String(
    import.meta.env.VITE_BACKEND_PAGE_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "",
  ).replace(/\/$/, "");

  return `${baseUrl}${path}`;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = String(
    import.meta.env.VITE_API_BASE_URL || "",
  ).replace(/\/$/, "");

  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}

async function readJson<T>(
  response: Response,
): Promise<T> {
  const payload = (await response
    .json()
    .catch(() => ({}))) as T & {
    message?: string;
    code?: string;
    csrf_token?: string;
  };

  if (!response.ok) {
    throw new CommerceRequestError(
      payload.message ||
        `Request failed (${response.status}).`,
      response.status,
      payload.code || "REQUEST_FAILED",
      payload.csrf_token || "",
    );
  }

  return payload;
}

async function postForm<T>(
  path: string,
  values: Record<string, string>,
  csrfToken: string,
): Promise<T> {
  const body = new URLSearchParams({
    ...values,
    csrf_token: csrfToken,
  });

  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded;charset=UTF-8",
      "X-CSRF-Token": csrfToken,
    },
    body: body.toString(),
  });

  return readJson<T>(response);
}

function getRazorpay(): RazorpayConstructor | undefined {
  return (
    window as Window & {
      Razorpay?: RazorpayConstructor;
    }
  ).Razorpay;
}

async function ensureRazorpay(): Promise<RazorpayConstructor> {
  const existing = getRazorpay();
  if (existing) {
    return existing;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      "razorpay-checkout-js",
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => resolve(),
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              "Razorpay Checkout could not be loaded.",
            ),
          ),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Razorpay Checkout could not be loaded.",
        ),
      );
    document.head.appendChild(script);
  });

  const Razorpay = getRazorpay();
  if (!Razorpay) {
    throw new Error(
      "Razorpay Checkout is unavailable.",
    );
  }

  return Razorpay;
}

function money(
  symbol: string,
  value: number | undefined,
): string {
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

function humanize(value: string | undefined): string {
  const cleanValue = String(value || "pending")
    .trim()
    .replace(/[-_]+/g, " ");

  return cleanValue.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase(),
  );
}

function formatPromisedDeliveryDate(
  value: string | undefined,
): string {
  const clean = String(value || "").trim();
  if (!clean) return "Date not scheduled";

  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        12,
      )
    : new Date(clean);

  if (Number.isNaN(parsed.getTime())) return clean;

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function formatDeliveryDateTime(
  value: string | undefined,
): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function itemFulfillmentDetails(item: OrderItem, expectedDate?: string, currentStatus?: string) {
  const deliveryItem=item as DeliveryAwareOrderItem;
  return [
    {label:"Product type",value:deliveryItem.product_type ? humanize(deliveryItem.product_type):""},
    {label:"Expected delivery date",value:expectedDate ? formatPromisedDeliveryDate(expectedDate):""},
    {label:"Delivery status",value:currentStatus ? humanize(currentStatus):""},
    {label:"Delivered at",value:formatDeliveryDateTime(deliveryItem.delivery_delivered_at)},
  ].filter(detail=>detail.value);
}

function statusClass(value: string | undefined): string {
  return String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function formatPlacedDate(value: string | undefined): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function hasCoordinates(
  address: OrderDeliveryAddress | undefined,
): boolean {
  return (
    address?.latitude !== null &&
    address?.latitude !== undefined &&
    address?.longitude !== null &&
    address?.longitude !== undefined
  );
}

function orderItemUrl(
  item: OrderItem,
): string {
  const subscription = item as SubscriptionOrderItem;
  if (
    subscription.is_subscription ||
    subscription.item_type === "subscription"
  ) {
    return `/subscriptions/item/${encodeURIComponent(
      String(item.item_id || ""),
    )}`;
  }

  // Order product IDs survive changes to catalogue category names or slugs.
  const savedItemId = String(item.item_id || "").trim();
  if (savedItemId) return productDetailHref(savedItemId);

  const categorySlug = String(
    item.category_slug || "",
  ).trim();

  const itemSlug = String(
    item.slug || "",
  ).trim();

  if (!categorySlug || !itemSlug) {
    return "";
  }

  return `/item/${encodeURIComponent(
    categorySlug,
  )}/${encodeURIComponent(itemSlug)}`;
}

function OrderItemMedia({
  item,
}: {
  item: OrderItem;
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const imageUrl = String(
    item.image_url || "",
  ).trim();

  const detailUrl =
    orderItemUrl(item);

  const content =
    imageUrl && !imageFailed ? (
      <img
        src={imageUrl}
        alt={item.name}
        loading="lazy"
        onError={() =>
          setImageFailed(true)
        }
      />
    ) : (
      <span
        className="order-detail-item-placeholder"
        aria-hidden="true"
      >
        🥤
      </span>
    );

  if (detailUrl) {
    return (
      <Link
        className="order-detail-item-media"
        to={detailUrl}
        aria-label={`Open ${item.name}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="order-detail-item-media">
      {content}
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId = "" } = useParams<{
    orderId: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] =
    useState<CommerceOrder | null>(null);

  const [currencySymbol, setCurrencySymbol] =
    useState("₹");

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [csrfToken, setCsrfToken] =
    useState("");

  const [couponApiPath, setCouponApiPath] =
    useState("");

  const [paymentApiPath, setPaymentApiPath] =
    useState("");

  const [couponInput, setCouponInput] =
    useState("");

  const [couponMessage, setCouponMessage] =
    useState("");

  const [couponError, setCouponError] =
    useState("");

  const [updatingCoupon, setUpdatingCoupon] =
    useState(false);

  const [openingPayment, setOpeningPayment] =
    useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId.trim()) {
      setPageError("Order ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const payload = await getOrderDetail(
        orderId,
      );

      const details =
        payload as OrderDetailApiPayload;
      const loadedOrder =
        details.order as ExtendedCommerceOrder;

      setOrder(details.order);
      setCurrencySymbol(
        details.currency_symbol || "₹",
      );
      setCsrfToken(
        details.csrf_token || "",
      );
      setCouponApiPath(
        details.coupon_api_url ||
          `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
            orderId,
          )}/coupon`,
      );
      setPaymentApiPath(
        details.payment_api_url ||
          `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
            orderId,
          )}/payment`,
      );
      setCouponInput(
        String(loadedOrder.coupon_code || ""),
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 401
      ) {
        const next = encodeURIComponent(
          `${location.pathname}${location.search}`,
        );

        navigate(
          `${error.loginUrl || "/react/login"}?next=${next}`,
          {
            replace: true,
          },
        );

        return;
      }

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load order details.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    location.pathname,
    location.search,
    navigate,
    orderId,
  ]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const paymentCanContinue = useMemo(() => {
    if (!order) {
      return false;
    }

    const method = String(order.payment_method || "").toLowerCase();
    const paymentStatus = String(order.payment_status || "").toLowerCase();
    const orderStatus = String(order.status || "").toLowerCase();

    return (
      ["razorpay", "cash_on_delivery"].includes(method) &&
      paymentStatus !== "paid" &&
      paymentStatus !== "cancelled" &&
      orderStatus !== "cancelled"
    );
  }, [order]);

  const isPendingCod = useMemo(() => {
    if (!order) return false;
    return (
      String(order.payment_method || "").toLowerCase() === "cash_on_delivery" &&
      String(order.payment_status || "").toLowerCase() !== "paid" &&
      String(order.status || "").toLowerCase() !== "cancelled"
    );
  }, [order]);

  const paymentEndedWithoutSuccess =
    useMemo(() => {
      if (!order) {
        return false;
      }

      return [
        "failed",
        "cancelled",
      ].includes(
        String(
          order.payment_status || "",
        ).toLowerCase(),
      );
    }, [order]);

  const canEditCoupon =
    paymentCanContinue &&
    String(order?.payment_method || "").toLowerCase() === "razorpay";

  const currentCouponCode = String(
    (order as ExtendedCommerceOrder | null)
      ?.coupon_code || "",
  );

  const discountAmount = Number(
    (order as ExtendedCommerceOrder | null)
      ?.discount || 0,
  );

  function handleCommerceError(
    error: unknown,
    fallback: string,
  ): string {
    if (error instanceof CommerceRequestError) {
      if (error.csrfToken) {
        setCsrfToken(error.csrfToken);
      }

      if (error.status === 401) {
        const next = encodeURIComponent(
          `${location.pathname}${location.search}`,
        );

        navigate(
          `/react/login?next=${next}`,
          { replace: true },
        );
      }

      return error.message;
    }

    return error instanceof Error
      ? error.message
      : fallback;
  }

  async function updateCoupon(
    code: string,
  ) {
    if (!order) {
      return;
    }

    if (!csrfToken) {
      setCouponError(
        "The security token is unavailable. Refresh the page and try again.",
      );
      return;
    }

    setUpdatingCoupon(true);
    setCouponMessage("");
    setCouponError("");
    setPageError("");

    try {
      const endpoint =
        couponApiPath ||
        `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
          order.id,
        )}/coupon`;

      const payload =
        await postForm<CouponUpdatePayload>(
          endpoint,
          {
            coupon_code: code
              .trim()
              .toUpperCase(),
          },
          csrfToken,
        );

      if (payload.order) {
        setOrder(payload.order);
        setCouponInput(
          String(
            (
              payload.order as ExtendedCommerceOrder
            ).coupon_code || "",
          ),
        );
      }

      if (payload.csrf_token) {
        setCsrfToken(payload.csrf_token);
      }

      if (payload.payment_api_url) {
        setPaymentApiPath(
          payload.payment_api_url,
        );
      }

      const appliedCode = String(
        (
          payload.order as
            | ExtendedCommerceOrder
            | undefined
        )?.coupon_code || "",
      );

      setCouponMessage(
        payload.message ||
          (appliedCode
            ? `Coupon ${appliedCode} applied successfully.`
            : "Coupon removed successfully."),
      );
    } catch (error) {
      setCouponError(
        handleCommerceError(
          error,
          "Unable to update the coupon.",
        ),
      );
    } finally {
      setUpdatingCoupon(false);
    }
  }

  async function reportPaymentFailure(
    reason: string,
    token: string,
  ) {
    try {
      await postForm(
        `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
          orderId,
        )}/razorpay/failed`,
        { reason },
        token,
      );
    } catch {
      // Reporting is best effort. The Razorpay error is still shown.
    }
  }

  async function continuePayment() {
    if (!order || !paymentCanContinue) {
      return;
    }

    setOpeningPayment(true);
    setPageError("");
    setCouponError("");

    try {
      const endpoint =
        paymentApiPath ||
        `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
          order.id,
        )}/payment`;

      const response = await fetch(
        apiUrl(endpoint),
        {
          credentials: "include",
        },
      );

      const payment =
        await readJson<PaymentPayload>(
          response,
        );

      if (payment.csrf_token) {
        setCsrfToken(payment.csrf_token);
      }

      const expectedAmount = Math.round(
        Number(order.total || 0) * 100,
      );
      const gatewayAmount = Number(
        payment.razorpay.amount || 0,
      );

      if (
        expectedAmount > 0 &&
        gatewayAmount !== expectedAmount
      ) {
        throw new Error(
          "The Razorpay amount does not match the displayed order total. Apply the coupon again before continuing.",
        );
      }

      const Razorpay =
        await ensureRazorpay();

      const instance = new Razorpay({
        key: payment.razorpay.key_id,
        amount: gatewayAmount,
        currency: payment.razorpay.currency,
        name: payment.razorpay.name,
        description:
          payment.razorpay.description,
        order_id:
          payment.razorpay.order_id,
        prefill:
          payment.razorpay.prefill,
        theme: {
          color: "#55111f",
        },
        retry: {
          enabled: true,
          max_count: 2,
        },
        modal: {
          ondismiss: () => {
            setOpeningPayment(false);
            setCouponMessage(
              "Payment window closed. You can retry this order.",
            );
          },
        },
        handler: (
          result: RazorpaySuccess,
        ) => {
          void (async () => {
            try {
              const verification =
                await postForm<{
                  success?: boolean;
                  message?: string;
                  order?: CommerceOrder;
                  csrf_token?: string;
                }>(
                  `${REACT_COMMERCE_API_PREFIX}/orders/${encodeURIComponent(
                    order.id,
                  )}/razorpay/verify`,
                  {
                    razorpay_payment_id:
                      result.razorpay_payment_id,
                    razorpay_order_id:
                      result.razorpay_order_id,
                    razorpay_signature:
                      result.razorpay_signature,
                  },
                  payment.csrf_token,
                );

              if (verification.csrf_token) {
                setCsrfToken(
                  verification.csrf_token,
                );
              }

              if (verification.order) {
                setOrder(verification.order);
              } else {
                await loadOrder();
              }

              setCouponMessage(
                verification.message ||
                  "Payment verified successfully.",
              );
            } catch (error) {
              setPageError(
                handleCommerceError(
                  error,
                  "Payment verification failed.",
                ),
              );
            } finally {
              setOpeningPayment(false);
            }
          })();
        },
      });

      instance.on?.(
        "payment.failed",
        (failure) => {
          const reason =
            failure.error?.description ||
            failure.error?.reason ||
            "Razorpay payment attempt failed.";

          void reportPaymentFailure(
            reason,
            payment.csrf_token,
          ).finally(() => {
            setOpeningPayment(false);
            setPageError(reason);
            void loadOrder();
          });
        },
      );

      instance.open();
    } catch (error) {
      setOpeningPayment(false);
      setPageError(
        handleCommerceError(
          error,
          isPendingCod
            ? "Unable to start online payment for this COD order."
            : "Unable to continue Razorpay payment.",
        ),
      );
    }
  }

  return (
    <>
      <style>{ORDER_DETAIL_STYLES}</style>
      <style>{ORDER_DETAIL_RESPONSIVE_CSS}</style>

      <main className="react-order-detail-page">
        {loading ? (
          <section className="order-detail-loading">
            Loading order details…
          </section>
        ) : pageError && !order ? (
          <section
            className="order-detail-alert"
            role="alert"
          >
            {pageError}
          </section>
        ) : order ? (
          <>
            <section className="order-detail-heading">
              <div>
                <span className="order-detail-eyebrow">
                  Order details
                </span>

                <h1>{order.order_number}</h1>

                <p>
                  Placed on{" "}
                  {formatPlacedDate(
                    order.created_at,
                  )}
                </p>
              </div>

              <div className="order-detail-heading-actions">
                <a className="order-detail-button order-detail-button-secondary" href={`/react/api/orders/${encodeURIComponent(order.id)}/invoice`}>⬇ Download Invoice PDF</a>
                <Link
                  className="order-detail-button order-detail-button-primary"
                  to={`/support/tickets/new?orderId=${encodeURIComponent(
                    order.id,
                  )}&orderNumber=${encodeURIComponent(
                    String(order.order_number || order.id),
                  )}&issueType=delivery_issue`}
                >
                  Report Delivery / Order Issue
                </Link>

                <a
                  className="order-detail-button order-detail-button-secondary"
                  href={backendPageUrl("/orders")}
                >
                  Back to Orders
                </a>
              </div>
            </section>

            {pageError ? (
              <section
                className="order-detail-alert"
                role="alert"
                style={{ marginBottom: 18 }}
              >
                {pageError}
              </section>
            ) : null}

            <RefundCustomerPanel orderId={order.id} csrf={csrfToken} refund={order.refund} onUpdate={loadOrder}/>
            <div className="order-detail-layout">
              <section className="order-detail-card order-detail-main-card">
                <h2>
                  Purchased Items
                  {order.item_count
                    ? ` (${order.item_count})`
                    : ""}
                </h2>

                <div className="order-detail-items">
                  {order.items?.length ? (
                    order.items.map(
                      (item, index) => {
                        const subscription =
                          item as SubscriptionOrderItem;
                        const isSubscription = Boolean(
                          subscription.is_subscription ||
                            subscription.item_type === "subscription",
                        );
                        const detailUrl =
                          orderItemUrl(item);
                        const fulfillmentDetails =
                          itemFulfillmentDetails(item,order.estimated_delivery_date,order.status);

                        const unitPrice =
                          Number(
                            item.price || 0,
                          );

                        return (
                          <article
                            className="order-detail-item"
                            key={
                              item.item_id ||
                              `${item.name}-${index}`
                            }
                          >
                            <OrderItemMedia
                              item={item}
                            />

                            <div className="order-detail-item-copy">
                              <span className="order-detail-item-category">
                                {item.category_name ||
                                  "Product"}
                              </span>

                              {detailUrl ? (
                                <Link
                                  className="order-detail-item-name"
                                  to={detailUrl}
                                >
                                  {item.name}
                                </Link>
                              ) : (
                                <strong className="order-detail-item-name">
                                  {item.name}
                                </strong>
                              )}

                              <p>
                                {item.size ||
                                  "Product"}
                                {item.unit_label
                                  ? ` · ${item.unit_label}`
                                  : ""}
                              </p>

                              <div className="order-detail-item-pills">
                                {isSubscription ? (
                                  <span className="order-detail-item-pill">
                                    Subscription
                                  </span>
                                ) : null}
                                <span className="order-detail-item-pill">
                                  Quantity {item.quantity}
                                </span>

                                {item.sku ? (
                                  <span className="order-detail-item-pill">
                                    SKU {item.sku}
                                  </span>
                                ) : null}
                              </div>

                              {isSubscription ? (
                                <div className="order-detail-subscription">
                                  <div className="order-detail-subscription-row">
                                    <span>Plan</span>
                                    <strong>
                                      {String(
                                        subscription.subscription_plan_code ||
                                          "subscription",
                                      ).replace("_", " ")}
                                    </strong>
                                  </div>
                                  <div className="order-detail-subscription-row">
                                    <span>Delivery dates</span>
                                    <strong>
                                      {subscription.delivery_count ||
                                        subscription.delivery_dates?.length ||
                                        0}
                                    </strong>
                                  </div>
                                  <div className="order-detail-subscription-row">
                                    <span>Starts</span>
                                    <strong>
                                      {subscription.subscription_start_date ||
                                        subscription.delivery_dates?.[0] ||
                                        "—"}
                                    </strong>
                                  </div>
                                  {subscription
                                    .subscription_combination_name ? (
                                    <div className="order-detail-subscription-row">
                                      <span>Combination</span>
                                      <strong>
                                        {
                                          subscription.subscription_combination_name
                                        }
                                      </strong>
                                    </div>
                                  ) : null}
                                  {subscription.included_catalog_items?.length ? (
                                    <div>
                                      <div className="order-detail-subscription-row">
                                        <span>Included items</span>
                                      </div>
                                      <div className="order-detail-subscription-list">
                                        {subscription.included_catalog_items.map(
                                          (included, includedIndex) => (
                                            <span
                                              className="order-detail-subscription-chip"
                                              key={`included-${included.name}-${includedIndex}`}
                                            >
                                              {included.name}
                                              {included.unit_label
                                                ? ` · ${included.unit_label}`
                                                : ""}
                                              {Number(
                                                included.quantity || 1,
                                              ) > 1
                                                ? ` × ${included.quantity}`
                                                : ""}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                  {subscription.complimentary_items?.length ? (
                                    <div>
                                      <div className="order-detail-subscription-row">
                                        <span>Complimentary items</span>
                                      </div>
                                      <div className="order-detail-subscription-list">
                                        {subscription.complimentary_items.map(
                                          (
                                            complimentary,
                                            complimentaryIndex,
                                          ) => (
                                            <span
                                              className="order-detail-subscription-chip"
                                              key={`complimentary-${complimentary.name}-${complimentaryIndex}`}
                                            >
                                              {complimentary.name}
                                              {complimentary.unit_label
                                                ? ` · ${complimentary.unit_label}`
                                                : ""}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                  {subscription.delivery_dates?.length ? (
                                    <details>
                                      <summary>
                                        View all delivery dates
                                      </summary>
                                      <div className="order-detail-subscription-list">
                                        {subscription.delivery_dates.map(
                                          (date, dateIndex) => (
                                            <span
                                              className="order-detail-subscription-chip"
                                              key={`${date}-${dateIndex}`}
                                            >
                                              {dateIndex + 1}. {date}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </details>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            {fulfillmentDetails.length ? (
                              <dl
                                className="order-detail-fulfillment"
                                aria-label={`${item.name} product and delivery details`}
                              >
                                {fulfillmentDetails.map((detail) => (
                                  <div key={detail.label}>
                                    <dt>{detail.label}</dt>
                                    <dd>{detail.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : null}

                            <div className="order-detail-item-price">
                              <strong className="order-detail-item-subtotal">
                                {money(
                                  currencySymbol,
                                  item.subtotal,
                                )}
                              </strong>

                              <small>
                                {item.quantity} ×{" "}
                                {money(
                                  currencySymbol,
                                  unitPrice,
                                )}
                              </small>

                              {item.item_id ? (
                                <Link
                                  className="order-detail-item-report"
                                  to={`/support/tickets/new?orderId=${encodeURIComponent(
                                    order.id,
                                  )}&orderNumber=${encodeURIComponent(
                                    String(order.order_number || order.id),
                                  )}&itemId=${encodeURIComponent(
                                    String(item.item_id),
                                  )}&itemName=${encodeURIComponent(
                                    String(item.name || "Item"),
                                  )}&issueType=item_fault`}
                                >
                                  Raise a Complaint
                                </Link>
                              ) : null}
                            </div>
                          </article>
                        );
                      },
                    )
                  ) : (
                    <article className="order-detail-empty-item">
                      No products are attached to this
                      order.
                    </article>
                  )}
                </div>

                <h2 className="order-detail-address-heading">
                  Delivery Address
                </h2>

                <div className="order-detail-address">
                  <strong>
                    {order.delivery_address
                      ?.recipient_name ||
                      order.customer_name ||
                      "Customer"}
                  </strong>

                  <p>
                    {order.delivery_address
                      ?.address_line1 ||
                      "Address unavailable"}

                    {order.delivery_address
                      ?.address_line2
                      ? `, ${order.delivery_address.address_line2}`
                      : ""}
                  </p>

                  {order.delivery_address
                    ?.landmark ? (
                    <p>
                      Landmark:{" "}
                      {
                        order.delivery_address
                          .landmark
                      }
                    </p>
                  ) : null}

                  <p>
                    {order.delivery_address
                      ?.city || ""}
                    {order.delivery_address
                      ?.city &&
                    order.delivery_address?.state
                      ? ", "
                      : ""}
                    {order.delivery_address
                      ?.state || ""}
                    {order.delivery_address
                      ?.postal_code
                      ? ` — ${order.delivery_address.postal_code}`
                      : ""}
                  </p>

                  {order.delivery_address
                    ?.phone ? (
                    <p>
                      Phone:{" "}
                      {
                        order.delivery_address
                          .phone
                      }
                    </p>
                  ) : null}

                  {hasCoordinates(
                    order.delivery_address,
                  ) ? (
                    <span className="order-detail-gps">
                      GPS:{" "}
                      {
                        order.delivery_address
                          .latitude
                      }
                      ,{" "}
                      {
                        order.delivery_address
                          .longitude
                      }
                    </span>
                  ) : null}
                </div>
              </section>

              <aside className="order-detail-card order-detail-summary">
                <span
                  className={`order-detail-status ${statusClass(
                    order.status,
                  )}`}
                >
                  {humanize(order.status)}
                </span>

                <OrderStatusTimeline order={order} />
                <h2>Payment Summary</h2>

                {canEditCoupon ? (
                  <section
                    className="order-detail-coupon"
                    aria-label="Apply coupon to unpaid order"
                  >
                    <div className="order-detail-coupon-head">
                      <strong>Coupon Code</strong>

                      <span>
                        Apply, change, or remove a coupon before retrying payment
                      </span>
                    </div>

                    <div className="order-detail-coupon-form">
                      <input
                        type="text"
                        value={couponInput}
                        placeholder="Enter coupon"
                        autoComplete="off"
                        disabled={
                          updatingCoupon ||
                          openingPayment
                        }
                        onChange={(event) => {
                          setCouponInput(
                            event.target.value.toUpperCase(),
                          );
                          setCouponError("");
                          setCouponMessage("");
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            couponInput.trim()
                          ) {
                            event.preventDefault();
                            void updateCoupon(
                              couponInput,
                            );
                          }
                        }}
                      />

                      <button
                        className="order-detail-button order-detail-button-secondary"
                        type="button"
                        disabled={
                          updatingCoupon ||
                          openingPayment ||
                          !couponInput.trim()
                        }
                        onClick={() =>
                          void updateCoupon(
                            couponInput,
                          )
                        }
                      >
                        {updatingCoupon
                          ? "Updating…"
                          : currentCouponCode
                            ? "Update"
                            : "Apply"}
                      </button>
                    </div>

                    {currentCouponCode ? (
                      <div className="order-detail-coupon-current">
                        <span>
                          {currentCouponCode} applied
                        </span>

                        <button
                          className="order-detail-button order-detail-button-secondary"
                          type="button"
                          disabled={
                            updatingCoupon ||
                            openingPayment
                          }
                          onClick={() =>
                            void updateCoupon("")
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}

                    {couponMessage ? (
                      <p className="order-detail-coupon-message">
                        {couponMessage}
                      </p>
                    ) : null}

                    {couponError ? (
                      <p className="order-detail-coupon-message error">
                        {couponError}
                      </p>
                    ) : null}
                  </section>
                ) : null}

                <div className="order-detail-summary-line">
                  <span>Subtotal</span>

                  <strong>
                    {money(
                      currencySymbol,
                      order.subtotal,
                    )}
                  </strong>
                </div>

                <div className="order-detail-summary-line">
                  <span>Delivery</span>

                  <strong>
                    {Number(
                      order.delivery_fee || 0,
                    ) > 0
                      ? money(
                          currencySymbol,
                          order.delivery_fee,
                        )
                      : "Free"}
                  </strong>
                </div>

                {discountAmount > 0 ? (
                  <div className="order-detail-summary-line order-detail-summary-discount">
                    <span>
                      Coupon discount
                      {currentCouponCode
                        ? ` (${currentCouponCode})`
                        : ""}
                    </span>

                    <strong>
                      -{money(
                        currencySymbol,
                        discountAmount,
                      )}
                    </strong>
                  </div>
                ) : null}

                <div className="order-detail-summary-line order-detail-summary-grand">
                  <span>Total</span>

                  <strong>
                    {money(
                      currencySymbol,
                      order.total,
                    )}
                  </strong>
                </div>

                <div className="order-detail-payment-meta">
                  <p>
                    <strong>
                      Payment Method
                    </strong>

                    <span>
                      {humanize(
                        order.payment_method ||
                          "cash_on_delivery",
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Payment Status
                    </strong>

                    <span>
                      {humanize(
                        order.payment_status ||
                          "pending",
                      )}
                    </span>
                  </p>
                </div>

                {isPendingCod ? (
                  <section className="order-detail-cod-online">
                    <strong>Cash on Delivery or Pay Online</strong>
                    <p>
                      You can still pay this COD order online from this page.
                      If online payment succeeds, your order will be marked
                      as paid and the store will not request COD payment.
                    </p>
                  </section>
                ) : null}

                {paymentCanContinue ? (
                  <button
                    className="order-detail-button order-detail-button-primary order-detail-button-full"
                    type="button"
                    disabled={
                      openingPayment ||
                      updatingCoupon
                    }
                    onClick={() =>
                      void continuePayment()
                    }
                  >
                    {openingPayment
                      ? "Opening Razorpay…"
                      : isPendingCod
                        ? "Pay Online Now"
                        : "Continue Razorpay Payment"}
                  </button>
                ) : null}

                {paymentEndedWithoutSuccess ? (
                  <p className="order-detail-warning">
                    Payment was not completed and
                    reserved product stock was
                    released. Place a new order to
                    try again.
                  </p>
                ) : null}
              </aside>
            </div>
          </>
        ) : (
          <section className="order-detail-empty">
            <h2>Order not found</h2>

            <p>
              The requested order is unavailable.
            </p>

            <Link
              className="order-detail-button order-detail-button-primary"
              to="/"
            >
              Return to Store
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
