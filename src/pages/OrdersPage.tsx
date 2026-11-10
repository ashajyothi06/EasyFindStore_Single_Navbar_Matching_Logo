import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";

import { Link, useLocation, useNavigate } from "react-router-dom";



import { ApiRequestError, getOrders } from "../lib/api";

import type {

  CommerceOrder,

  OrderItem,

  OrdersPayload,

} from "../types/commerce";



const EMPTY_ORDERS: OrdersPayload = {

  success: true,

  authenticated: true,

  orders: [],

  count: 0,

  currency_symbol: "₹",

  csrf_token: "",

};



interface SubscriptionOrderItem extends OrderItem {

  is_subscription?: boolean;

  item_type?: string;

  subscription_plan_code?: string;

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

  delivery_type?: "instant_delivery" | "one_day_delivery" | string;

}



interface ProcessingCommerceOrder extends CommerceOrder {

  can_delete_processing?: boolean;

  delete_processing_api_url?: string;

}



interface DeleteProcessingOrderPayload {

  success?: boolean;

  message?: string;

  deleted_order_id?: string;

  csrf_token?: string;

  login_url?: string;

}



class DeleteProcessingOrderError extends Error {

  status: number;

  loginUrl: string;

  csrfToken: string;



  constructor(message: string, status: number, loginUrl = "", csrfToken = "") {

    super(message);

    this.name = "DeleteProcessingOrderError";

    this.status = status;

    this.loginUrl = loginUrl;

    this.csrfToken = csrfToken;

  }

}



async function deleteProcessingOrder(

  order: ProcessingCommerceOrder,

  csrfToken: string,

): Promise<DeleteProcessingOrderPayload> {

  const apiUrl =

    String(order.delete_processing_api_url || "").trim() ||

    `/react/api/commerce/orders/${encodeURIComponent(order.id)}/delete-processing`;

  const body = new URLSearchParams({

    csrf_token: csrfToken,

  });



  const response = await fetch(apiUrl, {

    method: "POST",

    credentials: "include",

    headers: {

      Accept: "application/json",

      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",

      "X-CSRF-Token": csrfToken,

    },

    body: body.toString(),

  });



  const result = (await response

    .json()

    .catch(() => ({}))) as DeleteProcessingOrderPayload;



  if (!response.ok || result.success !== true) {

    throw new DeleteProcessingOrderError(

      result.message || "Unable to delete the processing order.",

      response.status,

      result.login_url || "",

      result.csrf_token || "",

    );

  }



  return result;

}



const ORDERS_PAGE_STYLES = `

  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

  .react-orders-page {

    --orders-maroon: #55111f;

    --orders-maroon-hover: #701b2e;

    --orders-maroon-soft: #fff1f2;

    --orders-ink: #32171f;

    --orders-muted: #79666a;

    --orders-border: #ead8d8;
    --orders-gold: #bd8c36;
    --orders-gold-soft: #fff6e5;
    --orders-page-gutter: clamp(16px, 2.4vw, 48px);

    width:100%;

    padding: 32px var(--orders-page-gutter) 56px;

    box-sizing: border-box;
    min-width: 0;
    overflow-x: clip;

    background: #fbf7f0;

    color: var(--orders-ink);

    font-family: "Nunito", Arial, Helvetica, sans-serif;

  }



  .react-orders-page *,

  .react-orders-page *::before,

  .react-orders-page *::after {

    box-sizing: border-box;

    font-family: "Nunito", Arial, Helvetica, sans-serif !important;

  }



  .orders-page-heading {

    display: flex;

    align-items: flex-end;

    justify-content: space-between;

    gap: 24px;

    margin-bottom: 24px;

  }



  .orders-page-eyebrow {

    display: block;

    margin-bottom: 8px;

    color: var(--orders-gold);

    font-size: 0.78rem;

    font-weight: 850;

    letter-spacing: 0.09em;

    text-transform: uppercase;

  }



  .orders-page-heading h1 {

    margin: 0;

    color: var(--orders-ink);

    font-size: clamp(2rem, 4vw, 3.2rem);

    line-height: 1.05;

    letter-spacing: -0.04em;

  }



  .orders-page-heading p {

    margin: 10px 0 0;

    color: var(--orders-muted);

  }



  .orders-page-heading-actions {

    display: flex;

    align-items: center;

    justify-content: flex-end;

    flex-wrap: wrap;

    gap: 9px;

  }



  .orders-page-button {

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



  .orders-page-button:hover {

    transform: translateY(-1px);

  }



  .orders-page-button-primary {

    border-color: var(--orders-maroon);

    background: var(--orders-maroon);

    color: #ffffff;

    box-shadow: 0 10px 24px rgba(85, 17, 31, 0.2);

  }



  .orders-page-button-primary:hover {

    border-color: var(--orders-maroon-hover);

    background: var(--orders-maroon-hover);

    color: #ffffff;

  }



  .orders-page-button:focus-visible {

    outline: 3px solid rgba(85, 17, 31, 0.22);

    outline-offset: 2px;

  }



  .orders-page-button-secondary {

    border-color: var(--orders-border);

    background: #ffffff;

    color: var(--orders-ink);

  }



  .orders-page-button-secondary:hover {

    border-color: var(--orders-maroon);

    background: var(--orders-maroon-soft);

  }



  .orders-page-button-danger {

    border-color: #fecaca;

    background: #fff7f7;

    color: #b42318;

  }



  .orders-page-button-danger:hover {

    border-color: #fca5a5;

    background: #fee2e2;

    color: #991b1b;

  }



  .orders-page-raise-issue {

    border-color: #b42318;

    background: #b42318;

    color: #ffffff;

    box-shadow: 0 8px 18px rgba(180, 35, 24, 0.16);

  }



  .orders-page-raise-issue:hover {

    border-color: #991b1b;

    background: #991b1b;

    color: #ffffff;

  }



  .orders-page-button:disabled {

    cursor: wait;

    opacity: 0.62;

    transform: none;

  }



  .orders-page-summary-strip {

    display: grid;

    grid-template-columns: repeat(3, minmax(0, 1fr));

    gap: 14px;

    margin-bottom: 22px;

  }



  .orders-page-stat {

    padding: 18px;

    border: 1px solid var(--orders-border);

    border-top: 2px solid var(--orders-gold);

    border-radius: 17px;

    background: #ffffff;

    box-shadow: 0 12px 30px rgba(85, 17, 31, 0.05);

  }



  .orders-page-stat span {

    display: block;

    color: var(--orders-muted);

    font-size: 0.76rem;

    font-weight: 740;

    text-transform: uppercase;

  }



  .orders-page-stat strong {

    display: block;

    margin-top: 7px;

    color: var(--orders-maroon);

    font-size: 1.4rem;

  }



  .orders-page-list {

    display: grid;

    gap: 18px;

  }



  .orders-page-card {

    display: grid;

    grid-template-columns:

      minmax(390px, 1.65fr)

      minmax(150px, 0.55fr)

      minmax(180px, 0.65fr)

      auto;

    align-items: center;

    gap: 24px;

    padding: 20px 22px;

    border: 1px solid var(--orders-border);

    border-radius: 22px;

    background: #ffffff;

    box-shadow: 0 15px 38px rgba(85, 17, 31, 0.06);

  }



  .orders-page-products {

    min-width: 0;

    display: grid;

    grid-template-columns: 112px minmax(0, 1fr);

    align-items: center;

    gap: 18px;

  }



  .orders-page-products > .orders-page-fulfillment-details,

  .orders-page-products > .orders-page-extra-items,

  .orders-page-products > .orders-page-order-reference-wide {

    grid-column: 1 / -1;

  }



  .orders-page-products > .orders-page-order-reference-wide {

    margin: 0;

    color: #967f82;

    font-size: 0.72rem;

    line-height: 1.35;

  }



  .orders-page-products > .orders-page-order-reference-wide strong {

    color: var(--orders-muted);

    font-weight: 760;

  }



  .orders-page-image-stack {

    position: relative;

    width: 112px;

    height: 104px;

  }



  .orders-page-product-image {

    position: absolute;

    overflow: hidden;

    display: flex;

    align-items: center;

    justify-content: center;

    border: 3px solid #ffffff;

    border-radius: 18px;

    background:

      linear-gradient(

        145deg,

        #fbf7f0,

        var(--orders-maroon-soft)

      );

    box-shadow:

      0 10px 24px rgba(85, 17, 31, 0.12);

  }



  .orders-page-product-image.primary {

    inset: 0 auto auto 0;

    z-index: 3;

    width: 88px;

    height: 96px;

  }



  .orders-page-product-image.secondary {

    right: 0;

    bottom: 0;

    z-index: 4;

    width: 54px;

    height: 58px;

    border-radius: 14px;

  }



  .orders-page-product-image.tertiary {

    right: 4px;

    top: 0;

    z-index: 2;

    width: 45px;

    height: 48px;

    border-radius: 13px;

  }



  .orders-page-product-image img {

    width: 100%;

    height: 100%;

    object-fit: cover;

  }



  .orders-page-product-image span {

    font-size: 2rem;

  }



  .orders-page-more-images {

    position: absolute;

    right: -2px;

    bottom: -4px;

    z-index: 6;

    min-width: 30px;

    height: 30px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    padding: 0 7px;

    border: 2px solid #ffffff;

    border-radius: 999px;

    background: var(--orders-maroon);

    color: #ffffff;

    font-size: 0.68rem;

    font-weight: 850;

  }



  .orders-page-product-copy {

    min-width: 0;

  }



  .orders-page-product-copy > small {

    display: block;

    margin-bottom: 5px;

    color: var(--orders-maroon);

    font-size: 0.7rem;

    font-weight: 850;

    letter-spacing: 0.06em;

    text-transform: uppercase;

  }



  .orders-page-product-copy h2 {

    margin: 0;

    overflow: hidden;

    color: var(--orders-ink);

    font-size: 1.15rem;

    line-height: 1.25;

    text-overflow: ellipsis;

    white-space: nowrap;

  }



  .orders-page-product-copy p {

    margin: 6px 0 0;

    color: var(--orders-muted);

    font-size: 0.84rem;

    line-height: 1.45;

  }



  .orders-page-product-copy .orders-page-order-reference {

    margin-top: 8px;

    color: #967f82;

    font-size: 0.72rem;

  }



  .orders-page-product-copy .orders-page-order-reference strong {

    color: var(--orders-muted);

    font-weight: 760;

  }



  .orders-page-item-chips {

    display: flex;

    flex-wrap: wrap;

    gap: 7px;

    margin-top: 10px;

  }



  .orders-page-item-chip {

    display: inline-flex;

    align-items: center;

    padding: 5px 9px;

    border: 1px solid var(--orders-border);

    border-radius: 999px;

    background: #fbf7f0;

    color: var(--orders-muted);

    font-size: 0.7rem;

    font-weight: 720;

  }



  .orders-page-fulfillment-details {

    display: grid;

    grid-template-columns: repeat(3, minmax(0, 1fr));

    gap: 7px;

    margin: 11px 0 0;

  }



  .orders-page-fulfillment-details > div {

    min-width: 0;

    padding: 8px 9px;

    border: 1px solid var(--orders-border);

    border-radius: 10px;

    background: var(--orders-maroon-soft);

  }



  .orders-page-fulfillment-details dt {

    margin: 0 0 3px;

    color: var(--orders-muted);

    font-size: 0.61rem;

    font-weight: 800;

    letter-spacing: 0.05em;

    text-transform: uppercase;

  }



  .orders-page-fulfillment-details dd {

    margin: 0;

    overflow-wrap: anywhere;

    color: var(--orders-ink);

    font-size: 0.73rem;

    font-weight: 820;

    line-height: 1.3;

  }



  .orders-page-meta strong {

    display: block;

    margin-bottom: 7px;

    color: var(--orders-ink);

    font-size: 0.96rem;

  }



  .orders-page-meta p {

    margin: 0;

    color: var(--orders-muted);

    font-size: 0.84rem;

    line-height: 1.5;

  }



  .orders-page-payment-status {

    text-transform: capitalize;

  }



  .orders-page-actions {

    display: flex;

    min-width: 132px;

    flex-direction: column;

    gap: 9px;

  }



  .orders-page-status {

    display: inline-flex;

    width: fit-content;

    align-items: center;

    padding: 7px 11px;

    border-radius: 999px;

    background: #fbf7f0;

    color: var(--orders-muted);

    font-size: 0.74rem;

    font-weight: 820;

    text-transform: capitalize;

  }



  .orders-page-status.placed,

  .orders-page-status.paid,

  .orders-page-status.completed,

  .orders-page-status.delivered {

    background: #eaf6ee;

    color: #22673c;

  }



  .orders-page-status.pending,

  .orders-page-status.payment-pending,

  .orders-page-status.processing {

    background: var(--orders-maroon-soft);

    color: var(--orders-maroon);

  }



  .orders-page-status.failed,

  .orders-page-status.cancelled,

  .orders-page-status.verification-failed {

    background: #fee2e2;

    color: #991b1b;

  }



  .orders-page-total {

    color: var(--orders-maroon) !important;

    font-size: 1.15rem !important;

  }



  .orders-page-alert,

  .orders-page-loading,

  .orders-page-empty {

    padding: 30px 24px;

    border-radius: 20px;

    text-align: center;

  }



  .orders-page-alert {

    border: 1px solid #fecaca;

    background: #fff1f2;

    color: #9f1d2d;

    font-weight: 650;

  }



  .orders-page-alert-success {

    margin-bottom: 18px;

    border-color: var(--orders-border);

    background: var(--orders-maroon-soft);

    color: var(--orders-maroon);

  }



  .orders-page-loading,

  .orders-page-empty {

    border: 1px solid var(--orders-border);

    background: #ffffff;

    box-shadow: 0 18px 46px rgba(85, 17, 31, 0.07);

  }



  .orders-page-empty > div {

    font-size: 4rem;

  }



  .orders-page-empty h2 {

    margin: 14px 0 8px;

    color: var(--orders-ink);

  }



  .orders-page-empty p {

    margin: 0 auto 22px;

    max-width: 520px;

    color: var(--orders-muted);

  }




  /* Match the PublicOrderPage horizontal gutter exactly. */
  @media (min-width: 1700px) {
    .react-orders-page {
      --orders-page-gutter: clamp(16px, 2.4vw, 48px);
    }
  }

  @media (max-width: 1439px) {
    .react-orders-page {
      --orders-page-gutter: clamp(16px, 2.4vw, 48px);
    }
  }

  @media (max-width: 900px) {
    .react-orders-page {
      --orders-page-gutter: clamp(16px, 2.4vw, 48px);
    }
  }

  @media (max-width: 700px) {
    .react-orders-page {
      --orders-page-gutter: 16px;
    }
  }

  @media (max-width: 390px) {
    .react-orders-page {
      --orders-page-gutter: 16px;
    }
  }

  .orders-page-heading,
  .orders-page-summary-strip,
  .orders-page-list,
  .orders-page-alert,
  .orders-page-loading,
  .orders-page-empty {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
    box-sizing: border-box;
  }

  @media (max-width: 1180px) {

    .react-orders-page {

      width: 100%;

      max-width: none;

      padding-top: 28px;
      padding-right: var(--orders-page-gutter);
      padding-bottom: 50px;
      padding-left: var(--orders-page-gutter);

    }



    .orders-page-card {

      grid-template-columns:

        minmax(340px, 1.4fr)

        minmax(145px, 0.55fr)

        auto;

    }



    .orders-page-card .orders-page-payment-column {

      grid-column: 2;

      grid-row: 2;

    }



    .orders-page-card > .orders-page-actions {

      grid-column: 3;

      grid-row: 1 / 3;

    }

  }



  @media (max-width: 820px) {

    .react-orders-page {
      min-height: 100dvh;

      padding-top: 12px;
      padding-right: var(--orders-page-gutter);
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      padding-left: var(--orders-page-gutter);

      background: #fbf7f0;

    }



    /* Compact mobile page header. */

    .orders-page-heading {

      width: 100%;

      display: grid;

      grid-template-columns: minmax(0, 1fr);

      align-items: stretch;

      gap: 10px;

      margin: 0 0 12px;

      padding: 2px 0 0;

    }



    .orders-page-eyebrow,

    .orders-page-heading p {

      display: none;

    }



    .orders-page-heading h1 {

      margin: 0;

      font-size: clamp(1.55rem, 7vw, 1.9rem);

      line-height: 1;

      letter-spacing: -0.035em;

    }



    .orders-page-heading-actions {

      width: 100%;

      display: grid;

      grid-template-columns: repeat(2, minmax(0, 1fr));

      gap: 7px;

    }



    .orders-page-heading-actions .orders-page-button {

      width: 100%;

      min-width: 0;

      min-height: 38px;

      padding: 8px 7px;

      border-radius: 9px;

      box-shadow: none;

      font-size: .72rem;

      line-height: 1.05;

      white-space: normal;

      text-align: center;

    }



    /* Keep order counters visible without taking three full rows. */

    .orders-page-summary-strip {

      grid-template-columns: repeat(3, minmax(0, 1fr));

      gap: 6px;

      margin-bottom: 10px;

    }



    .orders-page-stat {

      min-width: 0;

      padding: 10px 7px;

      border-radius: 12px;

      box-shadow: 0 6px 16px rgba(85, 17, 31, .04);

      text-align: center;

    }



    .orders-page-stat span {

      font-size: .58rem;

      line-height: 1.1;

      letter-spacing: .02em;

    }



    .orders-page-stat strong {

      margin-top: 4px;

      font-size: 1.12rem;

      line-height: 1;

    }



    .orders-page-alert,

    .orders-page-loading,

    .orders-page-empty {

      padding: 14px 12px;

      border-radius: 14px;

      font-size: .84rem;

    }



    .orders-page-alert-success {

      margin-bottom: 10px;

    }



    .orders-page-list {

      gap: 9px;

    }



    /* Mobile order card: product first, then status/payment, then actions. */

    .orders-page-card {

      width: 100%;

      min-width: 0;

      display: grid;

      grid-template-columns: repeat(2, minmax(0, 1fr));

      align-items: start;

      gap: 10px 8px;

      padding: 12px;

      border-radius: 15px;

      box-shadow: 0 8px 22px rgba(85, 17, 31, .055);

    }



    .orders-page-products {

      grid-column: 1 / -1;

      grid-template-columns: 108px minmax(0, 1fr);

      align-items: start;

      gap: 8px 12px;

    }



    .orders-page-products > .orders-page-fulfillment-details,

    .orders-page-products > .orders-page-extra-items,

    .orders-page-products > .orders-page-order-reference-wide {

      grid-column: 1 / -1;

      width: 100%;

    }



    .orders-page-products > .orders-page-fulfillment-details {

      margin-top: 1px;

    }



    .orders-page-products > .orders-page-extra-items {

      margin-top: 0;

    }



    .orders-page-products > .orders-page-order-reference-wide {

      margin-top: -1px;

      font-size: .62rem;

      line-height: 1.25;

      overflow-wrap: anywhere;

    }



    .orders-page-image-stack {

      width: 108px;

      height: 108px;

    }



    .orders-page-product-image {

      border-width: 2px;

      border-radius: 13px;

    }



    .orders-page-product-image.primary {

      width: 88px;

      height: 98px;

      border-radius: 14px;

    }



    .orders-page-product-image.secondary {

      width: 50px;

      height: 54px;

      border-radius: 11px;

    }



    .orders-page-product-image.tertiary {

      width: 43px;

      height: 47px;

      border-radius: 10px;

    }



    .orders-page-product-image span {

      font-size: 1.45rem;

    }



    .orders-page-more-images {

      min-width: 24px;

      height: 24px;

      padding-inline: 5px;

      font-size: .58rem;

    }



    .orders-page-product-copy > small {

      margin-bottom: 3px;

      font-size: .59rem;

      letter-spacing: .04em;

    }



    .orders-page-product-copy h2 {

      font-size: .98rem;

      line-height: 1.18;

      white-space: normal;

      display: -webkit-box;

      -webkit-line-clamp: 2;

      -webkit-box-orient: vertical;

    }



    .orders-page-product-copy p {

      margin-top: 4px;

      font-size: .72rem;

      line-height: 1.3;

    }



    .orders-page-product-copy .orders-page-order-reference {

      margin-top: 6px;

      font-size: .62rem;

      line-height: 1.25;

      overflow-wrap: anywhere;

    }



    .orders-page-item-chips {

      gap: 5px;

      margin-top: 7px;

    }



    .orders-page-item-chip {

      padding: 4px 6px;

      font-size: .6rem;

      line-height: 1.15;

    }



    .orders-page-fulfillment-details {

      display: grid;

      grid-template-columns: repeat(2, minmax(0, 1fr));

      gap: 0;

      margin-top: 8px;

      padding: 3px 0;

      border-top: 1px solid var(--orders-border);

      border-bottom: 1px solid var(--orders-border);

      background: transparent;

    }



    /* Plain professional delivery details — no individual cards. */

    .orders-page-fulfillment-details > div {

      min-width: 0;

      padding: 8px 9px;

      border: 0;

      border-radius: 0;

      background: transparent;

    }



    .orders-page-fulfillment-details > div:nth-child(odd) {

      border-right: 1px solid var(--orders-border);

    }



    .orders-page-fulfillment-details > div:nth-child(n + 3) {

      border-top: 1px solid rgba(234, 216, 216, .72);

    }



    .orders-page-fulfillment-details dt {

      margin: 0 0 3px;

      color: var(--orders-muted);

      font-size: .52rem;

      font-weight: 800;

      letter-spacing: .02em;

      line-height: 1.1;

      text-transform: uppercase;

    }



    .orders-page-fulfillment-details dd {

      margin: 0;

      color: var(--orders-ink);

      font-size: .65rem;

      font-weight: 760;

      line-height: 1.22;

      overflow-wrap: anywhere;

    }



    .orders-page-meta {

      min-width: 0;

      padding: 9px;

      border: 1px solid var(--orders-border);

      border-radius: 10px;

      background: #fffaf5;

    }



    .orders-page-meta strong {

      margin-bottom: 5px;

      font-size: .8rem;

    }



    .orders-page-meta p {

      font-size: .67rem;

      line-height: 1.25;

      overflow-wrap: anywhere;

    }



    .orders-page-status {

      max-width: 100%;

      padding: 5px 7px;

      font-size: .62rem;

      line-height: 1.1;

      white-space: normal;

    }



    .orders-page-total {

      font-size: .98rem !important;

    }



    .orders-page-card .orders-page-payment-column {

      grid-column: auto;

      grid-row: auto;

    }



    .orders-page-card > .orders-page-actions {

      grid-column: 1 / -1;

      grid-row: auto;

      width: 100%;

      min-width: 0;

      display: grid;

      grid-template-columns: repeat(2, minmax(0, 1fr));

      gap: 6px;

      padding-top: 1px;

    }



    .orders-page-card > .orders-page-actions .orders-page-button {

      width: 100%;

      min-width: 0;

      min-height: 37px;

      padding: 7px 5px;

      border-radius: 9px;

      box-shadow: none;

      font-size: .7rem;

      line-height: 1.05;

      white-space: normal;

      text-align: center;

    }



    .orders-page-card > .orders-page-actions .orders-page-raise-issue {

      border-color: #b42318;

      background: #b42318;

      color: #ffffff;

      font-weight: 820;

    }



    .orders-page-card > .orders-page-actions .orders-page-button-danger {

      grid-column: 1 / -1;

    }



    .orders-page-empty {

      padding: 24px 16px;

    }



    .orders-page-empty > div {

      font-size: 2.8rem;

    }



    .orders-page-empty h2 {

      margin: 10px 0 5px;

      font-size: 1.3rem;

    }



    .orders-page-empty p {

      margin-bottom: 14px;

      font-size: .82rem;

      line-height: 1.4;

    }



    .orders-page-empty .orders-page-button {

      width: 100%;

    }

  }



  @media (max-width: 480px) {

    .react-orders-page {
    }



    .orders-page-heading-actions {

      gap: 5px;

    }



    .orders-page-heading-actions .orders-page-button {

      min-height: 36px;

      padding-inline: 5px;

      font-size: .67rem;

    }



    .orders-page-summary-strip {

      gap: 5px;

    }



    .orders-page-stat {

      padding: 9px 5px;

    }



    .orders-page-stat span {

      font-size: .54rem;

    }



    .orders-page-stat strong {

      font-size: 1.04rem;

    }



    .orders-page-card {

      padding: 10px;

      gap: 8px 6px;

      border-radius: 13px;

    }



    .orders-page-products {

      grid-template-columns: 98px minmax(0, 1fr);

      gap: 7px 10px;

    }



    .orders-page-image-stack {

      width: 98px;

      height: 98px;

    }



    .orders-page-product-image.primary {

      width: 80px;

      height: 90px;

    }



    .orders-page-product-image.secondary {

      width: 46px;

      height: 50px;

    }



    .orders-page-product-image.tertiary {

      width: 39px;

      height: 43px;

    }



    .orders-page-meta {

      padding: 8px;

    }



    .orders-page-card > .orders-page-actions {

      gap: 5px;

    }



    .orders-page-card > .orders-page-actions .orders-page-button {

      min-height: 35px;

      font-size: .66rem;

    }

  }


  /* ================================================
     Orders page – refined desktop & responsive mobile
     Scoped to this component. No shared CSS changes.
     ================================================ */
  .react-orders-page .orders-page-heading,
  .react-orders-page .orders-page-summary-strip,
  .react-orders-page .orders-page-list,
  .react-orders-page .orders-page-card,
  .react-orders-page .orders-page-products,
  .react-orders-page .orders-page-timeline-cell,
  .react-orders-page .orders-page-meta,
  .react-orders-page .orders-page-actions {
    min-width: 0;
    max-width: 100%;
  }

  .react-orders-page .orders-page-list {
    gap: 14px;
  }
  .react-orders-page .orders-page-card {
    grid-template-columns:
      minmax(265px, 1.8fr)
      minmax(165px, .9fr)
      minmax(110px, .58fr)
      minmax(120px, .62fr)
      minmax(128px, .62fr);
    align-items: start;
    gap: 16px;
    padding: 18px;
    border-color: #ead5b7;
    border-radius: 17px;
    box-shadow: 0 7px 22px rgba(85,17,31,.055);
  }
  .react-orders-page .orders-page-products {
    align-items: start;
    gap: 10px 14px;
  }
  .react-orders-page .orders-page-product-copy h2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    overflow: hidden;
    overflow-wrap: anywhere;
    line-height: 1.3;
  }
  .react-orders-page .orders-page-product-copy p {
    margin-top: 4px;
  }
  .react-orders-page .orders-page-fulfillment-details {
    margin-top: 7px;
  }
  .react-orders-page .orders-page-timeline-cell {
    align-self: start;
    width: 100%;
  }
  .react-orders-page .orders-page-timeline-cell > * {
    max-width: 100%;
    min-width: 0;
  }
  .react-orders-page .orders-page-actions {
    min-width: 0;
    gap: 8px;
  }
  .react-orders-page .orders-page-actions .orders-page-button {
    width: 100%;
    min-width: 0;
    white-space: normal;
    line-height: 1.2;
    text-align: center;
  }
  .react-orders-page .orders-page-product-image img {
    object-fit: contain;
    background: #fff;
  }
  .react-orders-page .orders-page-payment-column p {
    overflow-wrap: anywhere;
  }
  .react-orders-page .orders-page-status {
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  /* Wide desktop: show each order's five sections across one row. */
  @media (min-width: 1400px) {
    .react-orders-page .orders-page-card {
      grid-template-columns:
        minmax(270px, 1.8fr)
        minmax(170px, .9fr)
        minmax(120px, .6fr)
        minmax(120px, .65fr)
        minmax(130px, .68fr) !important;
    }
    .react-orders-page .orders-page-card > .orders-page-products,
    .react-orders-page .orders-page-card > .orders-page-timeline-cell,
    .react-orders-page .orders-page-card > .orders-page-meta,
    .react-orders-page .orders-page-card > .orders-page-actions {
      grid-column: auto !important;
      grid-row: auto !important;
    }
  }

  /* Laptop and tablet landscape: ordered, space-efficient two-row layout. */
  @media (min-width: 821px) and (max-width: 1399px) {
    .react-orders-page .orders-page-card {
      grid-template-columns: minmax(245px, 1.5fr) minmax(165px, 1fr) minmax(125px, .7fr) !important;
      align-items: start;
      gap: 12px 16px;
      padding: 17px;
    }
    .react-orders-page .orders-page-card > .orders-page-products {
      grid-column: 1 !important;
      grid-row: 1 / span 2 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-timeline-cell {
      grid-column: 2 !important;
      grid-row: 1 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-meta:not(.orders-page-payment-column) {
      grid-column: 3 !important;
      grid-row: 1 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-payment-column {
      grid-column: 2 !important;
      grid-row: 2 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-actions {
      grid-column: 3 !important;
      grid-row: 2 !important;
    }
  }

  @media (max-width: 820px) {
    .react-orders-page {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      padding: 16px 14px calc(34px + env(safe-area-inset-bottom, 0px)) !important;
      overflow-x: clip;
    }
    .react-orders-page .orders-page-heading {
      display: flex !important;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 14px;
    }
    .react-orders-page .orders-page-heading h1 {
      font-size: clamp(1.55rem, 6vw, 2rem);
      line-height: 1.15;
    }
    .react-orders-page .orders-page-heading-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .react-orders-page .orders-page-heading-actions .orders-page-button {
      min-height: 40px;
      padding: 9px 8px;
      font-size: .78rem;
      line-height: 1.2;
      border-radius: 10px;
    }
    .react-orders-page .orders-page-summary-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin: 0 0 13px;
    }
    .react-orders-page .orders-page-stat {
      padding: 12px 6px;
      border-radius: 12px;
      text-align: center;
    }
    .react-orders-page .orders-page-stat span {
      font-size: .67rem;
      line-height: 1.25;
      letter-spacing: 0;
      text-transform: none;
    }
    .react-orders-page .orders-page-stat strong {
      margin-top: 5px;
      font-size: 1.2rem;
      line-height: 1.2;
    }
    .react-orders-page .orders-page-list {
      gap: 12px;
    }
    .react-orders-page .orders-page-card {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      align-items: start !important;
      gap: 10px !important;
      width: 100% !important;
      min-width: 0 !important;
      padding: 13px !important;
      border: 1px solid #ead4b3 !important;
      border-radius: 15px !important;
      background: #fff !important;
      box-shadow: 0 5px 18px rgba(85, 17, 31, .055) !important;
    }
    .react-orders-page .orders-page-card > .orders-page-products {
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
      display: grid;
      grid-template-columns: 91px minmax(0, 1fr);
      align-items: start;
      gap: 7px 11px;
      width: 100%;
    }
    .react-orders-page .orders-page-image-stack {
      width: 91px;
      height: 94px;
    }
    .react-orders-page .orders-page-product-image.primary {
      width: 75px;
      height: 84px;
    }
    .react-orders-page .orders-page-product-image.secondary {
      width: 42px;
      height: 46px;
    }
    .react-orders-page .orders-page-product-image.tertiary {
      width: 38px;
      height: 41px;
    }
    .react-orders-page .orders-page-product-copy > small {
      font-size: .69rem;
      line-height: 1.25;
    }
    .react-orders-page .orders-page-product-copy h2 {
      font-size: .97rem;
      line-height: 1.25;
    }
    .react-orders-page .orders-page-product-copy p {
      margin: 4px 0 0;
      font-size: .77rem;
      line-height: 1.35;
    }
    .react-orders-page .orders-page-products > .orders-page-fulfillment-details,
    .react-orders-page .orders-page-products > .orders-page-extra-items,
    .react-orders-page .orders-page-products > .orders-page-order-reference-wide {
      grid-column: 1 / -1;
    }
    .react-orders-page .orders-page-fulfillment-details {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
      margin: 4px 0 0;
      padding: 2px 0;
      border-top: 1px solid #f0e3d9;
      border-bottom: 1px solid #f0e3d9;
    }
    .react-orders-page .orders-page-fulfillment-details > div {
      padding: 7px 8px;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .react-orders-page .orders-page-fulfillment-details > div:nth-child(odd) {
      border-right: 1px solid #f0e3d9;
    }
    .react-orders-page .orders-page-fulfillment-details dt {
      font-size: .66rem;
      line-height: 1.25;
      letter-spacing: 0;
    }
    .react-orders-page .orders-page-fulfillment-details dd {
      font-size: .75rem;
      line-height: 1.3;
    }
    .react-orders-page .orders-page-products > .orders-page-order-reference-wide {
      font-size: .72rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .react-orders-page .orders-page-item-chip {
      font-size: .69rem;
      line-height: 1.2;
    }
    .react-orders-page .orders-page-card > .orders-page-timeline-cell {
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
      min-width: 0;
      width: 100%;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      padding: 9px 2px;
      border-top: 1px solid #efe2d9;
      border-bottom: 1px solid #efe2d9;
      scrollbar-width: thin;
    }
    .react-orders-page .orders-page-card > .orders-page-meta {
      grid-column: 1 !important;
      grid-row: auto !important;
      width: 100%;
      min-width: 0;
      min-height: 75px;
      padding: 10px !important;
      border: 1px solid #f0e3d9 !important;
      border-radius: 11px !important;
      background: #fffaf7 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-payment-column {
      grid-column: 2 !important;
      grid-row: auto !important;
    }
    .react-orders-page .orders-page-meta strong {
      margin-bottom: 6px;
      font-size: .86rem;
      line-height: 1.25;
    }
    .react-orders-page .orders-page-meta p {
      font-size: .74rem;
      line-height: 1.3;
    }
    .react-orders-page .orders-page-status {
      font-size: .7rem;
      padding: 6px 9px;
    }
    .react-orders-page .orders-page-total {
      font-size: 1.04rem !important;
    }
    .react-orders-page .orders-page-card > .orders-page-actions {
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      width: 100%;
      gap: 8px !important;
      margin: 0;
      padding: 2px 0 0 !important;
    }
    .react-orders-page .orders-page-card > .orders-page-actions .orders-page-button {
      min-height: 42px !important;
      padding: 10px 7px !important;
      border-radius: 10px !important;
      font-size: .78rem !important;
      line-height: 1.2 !important;
      font-weight: 800;
      box-shadow: none !important;
    }
    .react-orders-page .orders-page-card > .orders-page-actions .orders-page-button-danger {
      grid-column: 1 / -1;
    }
    .react-orders-page .orders-page-empty,
    .react-orders-page .orders-page-alert,
    .react-orders-page .orders-page-loading {
      padding: 22px 15px;
      border-radius: 14px;
    }
  }

  /* Very small phones: keep prices and buttons readable without side-scrolling. */
  @media (max-width: 390px) {
    .react-orders-page {
      padding-inline: 11px !important;
    }
    .react-orders-page .orders-page-card {
      padding: 10px !important;
      gap: 8px !important;
    }
    .react-orders-page .orders-page-summary-strip {
      gap: 5px;
    }
    .react-orders-page .orders-page-stat span {
      font-size: .62rem;
    }
    .react-orders-page .orders-page-card > .orders-page-products {
      grid-template-columns: 80px minmax(0, 1fr);
      gap: 7px 9px;
    }
    .react-orders-page .orders-page-image-stack {
      width: 80px;
      height: 88px;
    }
    .react-orders-page .orders-page-product-image.primary {
      width: 69px;
      height: 77px;
    }
    .react-orders-page .orders-page-product-image.secondary {
      width: 40px;
      height: 43px;
    }
    .react-orders-page .orders-page-product-image.tertiary {
      width: 35px;
      height: 38px;
    }
    .react-orders-page .orders-page-card > .orders-page-actions .orders-page-button {
      font-size: .74rem !important;
    }
  }

`;



function money(symbol: string, value: number | undefined): string {

  return `${symbol}${Number(value || 0).toFixed(2)}`;

}



function humanize(value: string | undefined): string {

  return String(value || "pending")

    .trim()

    .replace(/[-_]+/g, " ")

    .replace(/\b\w/g, (letter) => letter.toUpperCase());

}



function orderFulfillmentDetails(items: OrderItem[], expectedDate?: string) {
  const names=[...new Set(items.map(item=>String((item as DeliveryAwareOrderItem).product_type||'').trim()).filter(Boolean))];
  return [
    {label: names.length>1 ? "Product types" : "Product type", value:names.map(humanize).join(", ")},
    {label:"Expected delivery date",value:expectedDate ? new Date(`${expectedDate}T12:00:00+05:30`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}):""},
  ].filter(detail=>detail.value);
}

function statusClass(value: string | undefined): string {

  return String(value || "pending")

    .trim()

    .toLowerCase()

    .replace(/_/g, "-")

    .replace(/[^a-z0-9-]/g, "");

}



function formatOrderDate(value: string | undefined): string {

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



function itemCount(order: CommerceOrder): number {

  if (typeof order.item_count === "number" && order.item_count > 0) {

    return order.item_count;

  }



  return (order.items || []).reduce(

    (total, item) => total + Math.max(0, Number(item.quantity || 0)),

    0,

  );

}



function itemSubtitle(item: OrderItem): string {

  const parts = [

    item.size,

    item.unit_label,

    `Qty ${Math.max(1, Number(item.quantity || 1))}`,

  ].filter(Boolean);



  return parts.join(" · ");

}



function subscriptionOrderItem(

  item: OrderItem | undefined,

): SubscriptionOrderItem | null {

  if (!item) return null;

  const candidate = item as SubscriptionOrderItem;

  return candidate.is_subscription || candidate.item_type === "subscription"

    ? candidate

    : null;

}



function OrderItemImage({

  item,

  className,

}: {

  item: OrderItem | undefined;

  className: string;

}) {

  return (

    <div

      className={`orders-page-product-image ${className}`}

      aria-hidden="true"

    >

      {item?.image_url ? (

        <img src={item.image_url} alt="" loading="lazy" />

      ) : (

        <span>📦</span>

      )}

    </div>

  );

}



function OrderProductSummary({ order }: { order: CommerceOrder }) {

  const items = Array.isArray(order.items) ? order.items : [];

  const fulfillmentDetails = orderFulfillmentDetails(items, order.estimated_delivery_date);



  const primaryItem = items[0];

  const primarySubscription = subscriptionOrderItem(primaryItem);

  const previewItems = items.slice(0, 3);



  const extraItemCount = Math.max(0, items.length - 3);



  return (

    <div className="orders-page-products">

      <div

        className="orders-page-image-stack"

        aria-label={`${items.length} ordered product image${items.length === 1 ? "" : "s"}`}

      >

        <OrderItemImage item={previewItems[0]} className="primary" />



        {previewItems[1] ? (

          <OrderItemImage item={previewItems[1]} className="secondary" />

        ) : null}



        {previewItems[2] ? (

          <OrderItemImage item={previewItems[2]} className="tertiary" />

        ) : null}



        {extraItemCount > 0 ? (

          <span className="orders-page-more-images">+{extraItemCount}</span>

        ) : null}

      </div>



      <div className="orders-page-product-copy">

        <small>

          {items.length === 1

            ? "Ordered product"

            : `${items.length} ordered products`}

        </small>



        <h2>{primaryItem?.name || "Order products"}</h2>



        <p>

          {primaryItem

            ? itemSubtitle(primaryItem)

            : `${itemCount(order)} item(s)`}

        </p>



        {primarySubscription ? (

          <div className="orders-page-item-chips">

            <span className="orders-page-item-chip">

              Subscription ·{" "}

              {String(

                primarySubscription.subscription_plan_code || "plan",

              ).replace("_", " ")}

            </span>

            <span className="orders-page-item-chip">

              {primarySubscription.delivery_count ||

                primarySubscription.delivery_dates?.length ||

                0}{" "}

              deliveries

            </span>

            {primarySubscription.subscription_combination_name ? (

              <span className="orders-page-item-chip">

                {primarySubscription.subscription_combination_name}

              </span>

            ) : null}

            {primarySubscription.included_catalog_items?.map(

              (included, index) => (

                <span

                  className="orders-page-item-chip"

                  key={`included-${included.name}-${index}`}

                >

                  {included.name}

                  {included.unit_label ? ` · ${included.unit_label}` : ""}

                </span>

              ),

            )}

            {primarySubscription.complimentary_items?.map(

              (complimentary, index) => (

                <span

                  className="orders-page-item-chip"

                  key={`complimentary-${complimentary.name}-${index}`}

                >

                  Complimentary: {complimentary.name}

                </span>

              ),

            )}

          </div>

        ) : null}



      </div>



      {fulfillmentDetails.length ? (

        <dl

          className="orders-page-fulfillment-details"

          aria-label="Product and delivery details"

        >

          {fulfillmentDetails.map((detail) => (

            <div key={detail.label}>

              <dt>{detail.label}</dt>

              <dd>{detail.value}</dd>

            </div>

          ))}

        </dl>

      ) : null}



      {items.length > 1 ? (

        <div className="orders-page-item-chips orders-page-extra-items">

          {items.slice(1, 3).map((item) => (

            <span

              className="orders-page-item-chip"

              key={`${item.item_id}-${item.name}`}

            >

              {item.name}

              {" × "}

              {Math.max(1, Number(item.quantity || 1))}

            </span>

          ))}



          {items.length > 3 ? (

            <span className="orders-page-item-chip">

              +{items.length - 3} more

            </span>

          ) : null}

        </div>

      ) : null}



      <p className="orders-page-order-reference orders-page-order-reference-wide">

        Placed {formatOrderDate(order.created_at)}

        {" · "}

        <strong>{order.order_number}</strong>

      </p>

    </div>

  );

}



export function OrdersPage() {

  const navigate = useNavigate();

  const location = useLocation();



  const [payload, setPayload] = useState<OrdersPayload>(EMPTY_ORDERS);



  const [loading, setLoading] = useState(true);



  const [pageError, setPageError] = useState("");



  const [pageNotice, setPageNotice] = useState("");



  const [deletingOrderId, setDeletingOrderId] = useState("");



  const loadOrders = useCallback(async () => {

    setLoading(true);

    setPageError("");

    setPageNotice("");



    try {

      const result = await getOrders();



      setPayload(result);

    } catch (error) {

      if (error instanceof ApiRequestError && error.status === 401) {

        const next = encodeURIComponent(

          `${location.pathname}${location.search}`,

        );



        navigate(`${error.loginUrl || "/react/login"}?next=${next}`, {

          replace: true,

        });



        return;

      }



      setPageError(

        error instanceof Error ? error.message : "Unable to load your orders.",

      );

    } finally {

      setLoading(false);

    }

  }, [location.pathname, location.search, navigate]);



  useEffect(() => {

    const timer = window.setTimeout(() => {

      void loadOrders();

    }, 0);



    return () => {

      window.clearTimeout(timer);

    };

  }, [loadOrders]);



  const handleDeleteProcessingOrder = useCallback(

    async (order: ProcessingCommerceOrder) => {

      if (order.can_delete_processing !== true) {

        return;

      }



      const confirmed = window.confirm(

        `Delete processing order ${order.order_number || order.id}? Reserved stock and coupon usage will be released.`,

      );

      if (!confirmed) {

        return;

      }



      setDeletingOrderId(order.id);

      setPageError("");

      setPageNotice("");



      try {

        const result = await deleteProcessingOrder(order, payload.csrf_token);



        setPayload((current) => {

          const orders = current.orders.filter(

            (currentOrder) => currentOrder.id !== order.id,

          );



          return {

            ...current,

            orders,

            count: orders.length,

            csrf_token: result.csrf_token || current.csrf_token,

          };

        });

        setPageNotice(result.message || "The processing order was deleted.");

      } catch (error) {

        if (error instanceof DeleteProcessingOrderError) {

          if (error.csrfToken) {

            setPayload((current) => ({

              ...current,

              csrf_token: error.csrfToken,

            }));

          }



          if (error.status === 401) {

            const next = encodeURIComponent(

              `${location.pathname}${location.search}`,

            );

            navigate(`${error.loginUrl || "/react/login"}?next=${next}`, {

              replace: true,

            });

            return;

          }

        }



        setPageError(

          error instanceof Error

            ? error.message

            : "Unable to delete the processing order.",

        );

      } finally {

        setDeletingOrderId("");

      }

    },

    [location.pathname, location.search, navigate, payload.csrf_token],

  );



  const orderStats = useMemo(() => {

    const paid = payload.orders.filter(

      (order) => String(order.payment_status || "").toLowerCase() === "paid",

    ).length;



    const active = payload.orders.filter(

      (order) =>

        !["delivered", "completed", "cancelled", "failed"].includes(

          String(order.status || "").toLowerCase(),

        ),

    ).length;



    return {

      total: payload.orders.length,

      active,

      paid,

    };

  }, [payload.orders]);



  return (

    <>

      <style>{ORDERS_PAGE_STYLES}</style>



      <main className="react-orders-page">

        <section className="orders-page-heading">

          <div>

            <span className="orders-page-eyebrow">Order history</span>



            <h1>Your Orders</h1>



            <p>

              Review purchased products, delivery status, payment information,

              and order details.

            </p>

          </div>



          <div className="orders-page-heading-actions">

            <Link

              className="orders-page-button orders-page-button-primary"

              to="/support/tickets"

            >

              Help & My Tickets

            </Link>



            <Link

              className="orders-page-button orders-page-button-secondary"

              to="/"

            >

              Continue Shopping

            </Link>

          </div>

        </section>



        {pageNotice ? (

          <section

            className="orders-page-alert orders-page-alert-success"

            role="status"

          >

            {pageNotice}

          </section>

        ) : null}



        {pageError ? (

          <section className="orders-page-alert" role="alert">

            {pageError}

          </section>

        ) : loading ? (

          <section className="orders-page-loading">

            Loading your orders…

          </section>

        ) : payload.orders.length ? (

          <>

            <section className="orders-page-summary-strip">

              <article className="orders-page-stat">

                <span>Total Orders</span>



                <strong>{orderStats.total}</strong>

              </article>



              <article className="orders-page-stat">

                <span>Active Orders</span>



                <strong>{orderStats.active}</strong>

              </article>



              <article className="orders-page-stat">

                <span>Paid Orders</span>



                <strong>{orderStats.paid}</strong>

              </article>

            </section>



            <section className="orders-page-list">

              {payload.orders.map((order: CommerceOrder) => {

                const processingOrder = order as ProcessingCommerceOrder;

                const canDeleteProcessing =

                  processingOrder.can_delete_processing === true;

                const isDeleting = deletingOrderId === order.id;



                return (

                  <article className="orders-page-card" key={order.id}>

                    <OrderProductSummary order={order} />
                    <div className="orders-page-timeline-cell">
                      <OrderStatusTimeline order={order} compact />
                    </div>



                    <div className="orders-page-meta">

                      <strong>{itemCount(order)} item(s)</strong>



                      <span

                        className={`orders-page-status ${statusClass(

                          order.status,

                        )}`}

                      >

                        {humanize(order.status)}

                      </span>

                    </div>



                    <div className="orders-page-meta orders-page-payment-column">

                      <strong className="orders-page-total">

                        {money(payload.currency_symbol, order.total)}

                      </strong>



                      <p className="orders-page-payment-status">

                        {humanize(order.payment_method)}

                        {" · "}

                        {humanize(order.payment_status)}

                      </p>

                    </div>



                    <div className="orders-page-actions">

                      <Link

                        className="orders-page-button orders-page-button-primary"

                        to={`/orders/${encodeURIComponent(order.id)}`}

                      >

                        View Details

                      </Link>



                      <Link

                        className="orders-page-button orders-page-raise-issue"

                        to={`/support/tickets/new?orderId=${encodeURIComponent(

                          order.id,

                        )}&orderNumber=${encodeURIComponent(

                          String(order.order_number || order.id),

                        )}&issueType=delivery_issue`}

                      >

                        Raise Issue

                      </Link>



                      {canDeleteProcessing ? (

                        <button

                          className="orders-page-button orders-page-button-danger"

                          type="button"

                          disabled={isDeleting}

                          onClick={() => {

                            void handleDeleteProcessingOrder(processingOrder);

                          }}

                        >

                          {isDeleting ? "Deleting…" : "Delete"}

                        </button>

                      ) : null}

                    </div>

                  </article>

                );

              })}

            </section>

          </>

        ) : (

          <section className="orders-page-empty">

            <div aria-hidden="true">📦</div>



            <h2>No orders yet</h2>



            <p>

              Your completed and pending orders will appear here after you place

              an order.

            </p>



            <Link

              className="orders-page-button orders-page-button-primary"

              to="/"

            >

              Browse Products

            </Link>

          </section>

        )}

      </main>

    </>

  );

}
