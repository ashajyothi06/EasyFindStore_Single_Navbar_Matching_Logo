import {
  type FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  ApiRequestError,
  getCart,
  getCachedCartSnapshot,
  removeCartItem,
  updateCartItem,
} from "../lib/api";
import type { CartItem, CartPayload } from "../types/commerce";

const EMPTY_CART: CartPayload = {
  success: true,
  authenticated: true,
  items: [],
  count: 0,
  totals: {
    subtotal: 0,
    delivery_fee: 0,
    total: 0,
  },
  currency_symbol: "₹",
  currency_code: "INR",
  csrf_token: "",
};

interface SubscriptionCartItem extends CartItem {
  cart_line_id?: string;
  is_subscription?: boolean;
  item_type?: string;
  seller_id?: string;
  subscription_plan_code?: string;
  subscription_days?: number;
  subscription_start_date?: string;
  delivery_schedule_label?: string;
  delivery_dates?: string[];
  delivery_count?: number;
  subscription_combination_name?: string;
  included_catalog_items?: Array<{
    item_id?: string;
    name?: string;
    unit_label?: string;
    quantity?: number;
  }>;
  complimentary_items?: Array<{
    item_id?: string;
    name?: string;
    unit_label?: string;
    quantity?: number;
  }>;
  product_type?: string;
  delivery_time_slot?: "morning" | "evening" | "both" | string;
  available_delivery_time_slot?: "morning" | "evening" | "both" | string;
  available_delivery_time_slots?: DeliveryTimeSlot[];
  selected_delivery_time_slots?: DeliveryTimeSlot[];
  customer_selected_delivery_time_slots?: DeliveryTimeSlot[];
  delivery_type?: "instant_delivery" | "one_day_delivery" | string;
  promised_delivery_date?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  delivery_schedule_timezone?: string;
}

interface DeliveryChargeBreakdown {
  delivery_distance_km?: number | null;
  delivery_base_fee?: number;
  delivery_distance_fee?: number;
  delivery_extra_distance_km?: number;
  delivery_charged_extra_km?: number;
  delivery_base_radius_km?: number;
  delivery_small_order_limit?: number;
  delivery_small_order_base_fee?: number;
  delivery_extra_per_km?: number;
  delivery_pricing_mode?: "standard" | "subscription_per_delivery" | "mixed_invalid" | string;
  subscription_delivery_count?: number;
  delivery_fee_per_delivery?: number;
  delivery_free_threshold?: number;
  delivery_product_surcharge?: number;
  delivery_regular_discount?: number;
}

type DeliveryTimeSlot = "morning" | "evening";

const CART_PAGE_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .react-cart-page {
    --cart-maroon: #55111f;
    --cart-maroon-hover: #76243a;
    --cart-maroon-soft: #f8edf0;
    --cart-ink: #351620;
    --cart-muted: #766369;
    --cart-border: #e8d7da;
    --cart-gold: #d8a949;
    --cart-cream: #fffaf4;
    --cart-page-gutter: clamp(18px, 2.4vw, 48px);
    width: 100%;
    padding: 32px var(--cart-page-gutter) 56px;
    box-sizing: border-box;
    min-width: 0;
    overflow-x: clip;
    background: #fffaf4;
    color: var(--cart-ink);
    font-family: "Nunito", Arial, Helvetica, sans-serif;
  }

  .react-cart-page *,
  .react-cart-page *::before,
  .react-cart-page *::after {
    box-sizing: border-box;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }

  .cart-page-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .cart-page-eyebrow {
    display: block;
    margin-bottom: 8px;
    color: #946921;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .cart-page-heading h1 {
    margin: 0;
    color: var(--cart-maroon);
    font-size: clamp(2rem, 4vw, 3.3rem);
    line-height: 1.05;
    letter-spacing: -0.045em;
    font-weight: 600;
  }

  .cart-page-heading p {
    margin: 10px 0 0;
    color: var(--cart-muted);
    font-size: 1rem;
  }

  .cart-page-button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 18px;
    border: 1px solid transparent;
    border-radius: 12px;
    font: inherit;
    font-size: 0.92rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
  }

  .cart-page-button:hover {
    transform: translateY(-1px);
  }

  .cart-page-button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
    transform: none;
  }

  .cart-page-checkout-warning {
    margin: 10px 0 0;
    color: #9a3412;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.4;
    text-align: center;
  }

  .cart-checkout-type-note {
    display: grid;
    gap: 5px;
    margin: 0 0 16px;
    padding: 12px 13px;
    border: 1px solid var(--cart-border);
    border-radius: 12px;
    background: #fff8f1;
    color: var(--cart-muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .cart-checkout-type-note strong {
    color: var(--cart-ink);
  }

  .cart-checkout-type-note.invalid {
    border-color: #fed7aa;
    background: #fff7ed;
    color: #9a3412;
  }

  .cart-subscription-expired {
    margin: 0 0 3px;
    padding: 9px 10px;
    border: 1px solid #fecaca;
    border-radius: 9px;
    background: #fff1f2;
    color: #a01828;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.35;
  }

  .cart-page-button:focus-visible,
  .cart-page-quantity-controls button:focus-visible,
  .cart-page-quantity-controls input:focus-visible,
  .cart-page-update-button:focus-visible,
  .cart-page-remove:focus-visible {
    outline: 3px solid rgba(216, 169, 73, 0.48);
    outline-offset: 3px;
  }

  .cart-page-button-primary {
    border-color: var(--cart-maroon);
    background: var(--cart-maroon);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(85, 17, 31, 0.17);
  }

  .cart-page-button-primary:hover {
    border-color: var(--cart-maroon-hover);
    background: var(--cart-maroon-hover);
    color: #ffffff;
  }

  .cart-page-button-secondary {
    border-color: var(--cart-border);
    background: #ffffff;
    color: var(--cart-maroon);
  }

  .cart-page-button-secondary:hover {
    border-color: var(--cart-maroon);
    background: var(--cart-maroon-soft);
  }

  .cart-page-button-full {
    width: 100%;
  }

  .cart-page-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 390px);
    align-items: start;
    gap: 24px;
  }

  .cart-page-card {
    border: 1px solid var(--cart-border);
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(85, 17, 31, 0.07);
  }

  .cart-page-list {
    overflow: hidden;
  }

  .cart-page-row {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr) minmax(235px, 275px) 130px;
    align-items: center;
    gap: 22px;
    padding: 24px 22px 24px 24px;
    border-bottom: 1px solid var(--cart-border);
  }

  .cart-page-row:last-of-type {
    border-bottom: 0;
  }

  .cart-page-image {
    width: 190px;
    aspect-ratio: 4 / 5;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    overflow: hidden;
    border: 1px solid var(--cart-border);
    border-radius: 22px;
    background: #fffaf4;
    box-shadow: 0 16px 34px rgba(85, 17, 31, 0.1);
    font-size: 2.7rem;
  }

  .cart-page-image img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
  }

  .cart-page-product {
    min-width: 0;
  }

  .cart-subscription-badge {
    display: inline-flex;
    width: fit-content;
    margin-bottom: 7px;
    padding: 5px 9px;
    border-radius: 999px;
    background: var(--cart-maroon-soft);
    color: var(--cart-maroon);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cart-subscription-details {
    display: grid;
    gap: 7px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid var(--cart-border);
    border-radius: 12px;
    background: #fff8f1;
  }

  .cart-fulfillment-details {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 12px 0 0;
  }

  .cart-fulfillment-details > div {
    min-width: 0;
    min-height: 54px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 8px 10px;
    border: 1px solid var(--cart-border);
    border-radius: 11px;
    background: var(--cart-maroon-soft);
  }

  .cart-fulfillment-details dt {
    margin: 0 0 3px;
    color: var(--cart-muted);
    font-size: 0.61rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .cart-fulfillment-details dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--cart-ink);
    font-size: 0.73rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .cart-delivery-time-checklist {
    min-width: 0;
    margin: 12px 0 0;
    padding: 12px;
    border: 1px solid var(--cart-border);
    border-radius: 12px;
    background: #ffffff;
  }

  .cart-global-delivery-time {
    margin: 0 0 18px;
    padding: 14px;
    border: 1px solid var(--cart-border);
    border-radius: 12px;
    background: #fff8f1;
  }

  .cart-global-delivery-time .cart-delivery-time-help {
    max-width: none;
  }

  .cart-global-delivery-time .cart-delivery-time-options {
    max-width: none;
  }

  .cart-delivery-time-checklist legend {
    padding: 0 5px;
    color: var(--cart-ink);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .cart-delivery-time-help {
    margin: 0 0 9px !important;
    color: var(--cart-muted) !important;
    font-size: 0.73rem !important;
  }

  .cart-delivery-time-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cart-delivery-time-option {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 38px;
    padding: 8px 11px;
    border: 1px solid var(--cart-border);
    border-radius: 10px;
    background: var(--cart-maroon-soft);
    color: var(--cart-ink);
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
  }

  .cart-delivery-time-option.selected {
    border-color: var(--cart-maroon);
    background: var(--cart-maroon);
    color: #ffffff;
  }

  .cart-delivery-time-option.unavailable {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .cart-delivery-time-option input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--cart-maroon);
  }

  .cart-delivery-time-save-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .cart-delivery-time-save {
    min-height: 38px;
    padding: 8px 16px;
    border: 1px solid var(--cart-maroon);
    border-radius: 10px;
    background: var(--cart-maroon);
    color: #ffffff;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      opacity 150ms ease;
  }

  .cart-delivery-time-save:hover:not(:disabled) {
    border-color: var(--cart-maroon-hover);
    background: var(--cart-maroon-hover);
  }

  .cart-delivery-time-save:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .cart-delivery-time-saving {
    color: var(--cart-maroon);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .cart-subscription-line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--cart-muted);
    font-size: 0.78rem;
  }

  .cart-subscription-line strong {
    color: var(--cart-ink);
    text-align: right;
  }

  .cart-subscription-items,
  .cart-subscription-dates {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 3px;
  }

  .cart-subscription-chip {
    padding: 5px 8px;
    border-radius: 8px;
    background: var(--cart-maroon-soft);
    color: var(--cart-muted);
    font-size: 0.7rem;
    font-weight: 600;
  }

  .cart-page-product small {
    color: var(--cart-maroon);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.055em;
    text-transform: uppercase;
  }

  .cart-page-product h2 {
    margin: 6px 0 5px;
    overflow-wrap: anywhere;
    color: var(--cart-maroon);
    font-size: 1.23rem;
    font-weight: 600;
    line-height: 1.25;
  }

  .cart-page-product p {
    margin: 0 0 9px;
    color: var(--cart-muted);
    font-size: 0.88rem;
  }

  .cart-page-product > strong {
    color: var(--cart-ink);
    font-size: 1.02rem;
  }

  .cart-page-quantity {
    min-width: 0;
    width: 100%;
    max-width: 275px;
    align-self: center;
    justify-self: end;
  }

  .cart-page-quantity > label {
    display: block;
    margin-bottom: 8px;
    color: var(--cart-muted);
    font-size: 0.76rem;
    font-weight: 600;
  }

  .cart-page-quantity-controls {
    display: grid;
    grid-template-columns: 42px minmax(58px, 1fr) 42px;
    gap: 7px;
  }

  .cart-page-quantity-controls button,
  .cart-page-quantity-controls input {
    width: 100%;
    min-height: 42px;
    border: 1px solid var(--cart-border);
    border-radius: 10px;
    background: #ffffff;
    color: var(--cart-ink);
    font: inherit;
    font-weight: 600;
    text-align: center;
  }

  .cart-page-quantity-controls button {
    cursor: pointer;
  }

  .cart-page-quantity-controls button:hover:not(:disabled) {
    border-color: var(--cart-maroon);
    background: var(--cart-maroon-soft);
    color: var(--cart-maroon);
  }

  .cart-page-quantity-controls button:disabled,
  .cart-page-quantity-controls input:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .cart-page-update-button {
    width: 100%;
    min-height: 37px;
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px solid var(--cart-border);
    border-radius: 10px;
    background: var(--cart-maroon-soft);
    color: var(--cart-maroon);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .cart-page-update-button:hover:not(:disabled) {
    border-color: var(--cart-maroon);
    background: var(--cart-maroon);
    color: #ffffff;
  }

  .cart-page-total {
    min-width: 118px;
    display: flex;
    align-items: center;
    align-self: center;
    justify-self: end;
    flex-direction: column;
    gap: 6px;
    padding: 8px 2px;
    text-align: center;
  }

  .cart-page-total span {
    color: var(--cart-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .cart-page-total strong {
    color: var(--cart-ink);
    font-size: 1.1rem;
  }

  .cart-page-remove {
    width: 36px;
    height: 36px;
    min-width: 36px;
    margin-top: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid #e4c5bf;
    border-radius: 9px;
    background: #fff8f6;
    color: #a63325;
    cursor: pointer;
    transition:
      background .18s ease,
      border-color .18s ease,
      transform .18s ease;
  }

  .cart-page-remove:hover:not(:disabled) {
    border-color: #a63325;
    background: #fff0ec;
    transform: translateY(-1px);
  }

  .cart-page-remove:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  .cart-page-remove svg {
    width: 17px;
    height: 17px;
    display: block;
  }


  .cart-page-summary {
    position: sticky;
    top: 94px;
    padding: 24px;
  }

  .cart-page-summary h2 {
    margin: 0 0 20px;
    color: var(--cart-maroon);
    font-size: 1.35rem;
    font-weight: 600;
  }

  .cart-page-summary-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 12px 0;
    color: var(--cart-muted);
    border-bottom: 1px solid var(--cart-border);
  }

  .cart-page-summary-line strong {
    color: var(--cart-ink);
  }

  .cart-page-summary-line-grand {
    margin-bottom: 20px;
    padding: 18px 0;
    border-bottom: 0;
    color: var(--cart-ink);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .cart-page-summary-line-grand strong {
    color: var(--cart-maroon);
    font-size: 1.35rem;
  }

  .cart-delivery-pricing-note {
    display: grid;
    gap: 7px;
    margin: 2px 0 18px;
    padding: 13px 14px;
    border: 1px solid var(--cart-border);
    border-radius: 12px;
    background: var(--cart-maroon-soft);
    color: var(--cart-muted);
    font-size: 0.76rem;
    line-height: 1.42;
  }

  .cart-delivery-pricing-note strong {
    color: var(--cart-ink);
  }

  .cart-delivery-pricing-breakdown {
    display: grid;
    gap: 5px;
    padding-top: 2px;
  }

  .cart-delivery-pricing-breakdown > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .cart-delivery-pricing-breakdown b {
    flex: 0 0 auto;
    color: var(--cart-ink);
  }

  .cart-page-alert {
    margin-bottom: 20px;
    padding: 14px 16px;
    border: 1px solid;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 650;
  }

  .cart-page-alert-error {
    border-color: #fecaca;
    background: #fff1f2;
    color: #a01828;
  }

  .cart-page-alert-success {
    border-color: var(--cart-border);
    background: var(--cart-maroon-soft);
    color: var(--cart-maroon);
  }

  .cart-page-loading,
  .cart-page-empty {
    padding: 58px 24px;
    border: 1px solid var(--cart-border);
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(85, 17, 31, 0.07);
    text-align: center;
  }

  .cart-page-loading {
    color: var(--cart-muted);
    font-weight: 600;
  }

  .cart-page-empty > div {
    font-size: 4rem;
  }

  .cart-page-empty h2 {
    margin: 14px 0 8px;
    color: var(--cart-ink);
    font-size: 1.7rem;
    font-weight: 600;
  }

  .cart-page-empty p {
    margin: 0 auto 24px;
    max-width: 520px;
    color: var(--cart-muted);
  }

  @media (max-width: 1180px) {
    .react-cart-page {
      width: 100%;
      max-width: none;
      padding-top: 28px;
      padding-right: var(--cart-page-gutter);
      padding-bottom: 50px;
      padding-left: var(--cart-page-gutter);
    }

    .cart-page-layout {
      grid-template-columns: 1fr 330px;
    }

    .cart-page-row {
      grid-template-columns: 142px minmax(180px, 1fr) 210px 120px;
      gap: 18px;
      padding: 18px;
    }

    .cart-page-image {
      width: 142px;
      aspect-ratio: 4 / 5;
      height: auto;
    }

    .cart-page-quantity {
      max-width: 210px;
    }

    .cart-fulfillment-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 940px) {
    .cart-page-layout {
      grid-template-columns: 1fr;
    }

    .cart-page-summary {
      position: static;
    }

    .cart-page-row {
      grid-template-columns: 126px minmax(0, 1fr) 190px;
    }

    .cart-page-image {
      width: 126px;
    }

    .cart-page-quantity {
      max-width: 190px;
    }

    .cart-page-total {
      grid-column: 2 / -1;
      align-items: center;
      flex-direction: row;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px dashed var(--cart-border);
      text-align: left;
    }
  }

  @media (max-width: 700px) {
    .react-cart-page {
      padding-top: 14px;
      padding-right: var(--cart-page-gutter);
      padding-bottom: 34px;
      padding-left: var(--cart-page-gutter);
    }

    .cart-page-heading {
      align-items: stretch;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 14px;
    }

    .cart-page-heading .cart-page-button {
      width: 100%;
    }

    .cart-page-layout {
      gap: 14px;
    }

    .cart-page-card {
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(85, 17, 31, 0.06);
    }

    /* Mobile product card: keep the image and basic product copy together at
       the top, then let delivery details use the full card width. */
    .cart-page-row {
      grid-template-columns: 104px minmax(0, 1fr);
      align-items: start;
      gap: 10px 12px;
      padding: 14px;
    }

    .cart-page-image {
      grid-column: 1;
      grid-row: 1 / span 4;
      width: 104px;
      aspect-ratio: 4 / 5;
      height: auto;
      align-self: start;
      border-radius: 14px;
      box-shadow: 0 10px 22px rgba(85, 17, 31, 0.09);
    }

    /* Flatten the product wrapper only on mobile so its children can be placed
       cleanly in the two-column card grid without changing desktop markup. */
    .cart-page-product {
      display: contents;
    }

    .cart-page-product > small,
    .cart-page-product > h2,
    .cart-page-product > p,
    .cart-page-product > strong,
    .cart-subscription-badge {
      grid-column: 2;
      min-width: 0;
    }

    .cart-page-product > small {
      align-self: end;
      margin-top: 1px;
      font-size: 0.66rem;
      line-height: 1.1;
    }

    .cart-page-product h2 {
      margin: 0;
      font-size: 1.10rem;
      line-height: 1.12;
    }

    .cart-page-product p {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.25;
    }

    .cart-page-product > strong {
      margin-top: 1px;
      font-size: 1rem;
      line-height: 1.1;
    }

    .cart-fulfillment-details,
    .cart-delivery-time-checklist,
    .cart-subscription-details {
      grid-column: 1 / -1;
      width: 100%;
      margin-top: 4px;
    }

    .cart-fulfillment-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
    }

    .cart-fulfillment-details > div {
      min-height: 56px;
      padding: 8px 9px;
      border-radius: 10px;
    }

    .cart-fulfillment-details dt {
      font-size: 0.56rem;
      letter-spacing: 0.045em;
    }

    .cart-fulfillment-details dd {
      font-size: 0.70rem;
      line-height: 1.2;
    }

    .cart-delivery-time-checklist {
      padding: 11px;
      border-radius: 12px;
    }

    .cart-global-delivery-time {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 12px;
    }

    .cart-delivery-time-checklist legend {
      font-size: 0.82rem;
    }

    .cart-delivery-time-help {
      margin-bottom: 9px !important;
      font-size: 0.70rem !important;
      line-height: 1.3;
    }

    .cart-delivery-time-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .cart-delivery-time-option {
      width: 100%;
      min-height: 40px;
      justify-content: center;
      padding: 8px 7px;
      border-radius: 9px;
      font-size: 0.76rem;
    }

    .cart-delivery-time-save-row {
      display: block;
      margin-top: 9px;
    }

    .cart-delivery-time-save {
      width: 100%;
      min-height: 41px;
      padding: 9px 12px;
      border-radius: 9px;
      font-size: 0.78rem;
    }

    .cart-delivery-time-saving {
      display: block;
      margin-top: 6px;
      text-align: center;
    }

    .cart-page-quantity,
    .cart-page-total {
      grid-column: 1 / -1;
      max-width: none;
      width: 100%;
      justify-self: stretch;
    }

    .cart-page-quantity {
      margin-top: 2px;
    }

    .cart-page-quantity > label {
      margin-bottom: 6px;
      font-size: 0.73rem;
    }

    .cart-page-quantity-controls {
      grid-template-columns: 42px minmax(70px, 1fr) 42px;
      gap: 6px;
    }

    .cart-page-quantity-controls button,
    .cart-page-quantity-controls input {
      min-height: 40px;
      border-radius: 9px;
    }

    .cart-page-update-button {
      min-height: 39px;
      margin-top: 7px;
      border-radius: 9px;
    }

    .cart-page-total {
      align-items: center;
      flex-direction: row;
      justify-content: space-between;
      padding: 11px 0 0;
      border-top: 1px dashed var(--cart-border);
      text-align: left;
    }

  }

  @media (max-width: 460px) {
    .react-cart-page {
      --cart-page-gutter: 16px;
    }

    .cart-page-row {
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 9px 11px;
      padding: 12px;
    }

    .cart-page-image {
      width: 96px;
      border-radius: 13px;
    }

    .cart-page-product h2 {
      font-size: 1.04rem;
    }

    .cart-fulfillment-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }

    .cart-fulfillment-details > div {
      min-height: 54px;
      padding: 7px 8px;
    }

    .cart-fulfillment-details dd {
      font-size: 0.66rem;
    }

    .cart-delivery-time-checklist {
      padding: 10px;
    }
  }

  /* ================================================================
     CART PAGE — SAME HORIZONTAL GUTTER AS PUBLIC ORDER PAGE
     ================================================================ */
  @media (min-width: 1700px) {
    .react-cart-page {
      --cart-page-gutter: clamp(32px, 2.4vw, 48px);
    }
  }

  @media (max-width: 1439px) {
    .react-cart-page {
      --cart-page-gutter: clamp(20px, 2.4vw, 36px);
    }
  }

  @media (max-width: 900px) {
    .react-cart-page {
      --cart-page-gutter: 20px;
    }
  }

  @media (max-width: 700px) {
    .react-cart-page {
      --cart-page-gutter: 16px;
    }
  }

  @media (max-width: 460px) {
    .react-cart-page {
      --cart-page-gutter: 16px;
    }
  }

  .react-cart-page,
  .cart-page-heading,
  .cart-page-layout,
  .cart-page-alert,
  .cart-page-loading,
  .cart-page-empty {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .cart-page-heading,
  .cart-page-layout,
  .cart-page-alert,
  .cart-page-loading,
  .cart-page-empty {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

`;

type ItemBusyAction =
  | "increase"
  | "decrease"
  | "update"
  | "remove"
  | "delivery_time";

interface BusyItem {
  itemId: string;
  action: ItemBusyAction;
}

function backendPageUrl(path: string): string {
  const baseUrl = String(
    import.meta.env.VITE_BACKEND_PAGE_BASE_URL ||
      import.meta.env.VITE_DEV_BACKEND_URL ||
      "",
  ).replace(/\/$/, "");

  return `${baseUrl}${path}`;
}

function imageUrl(value?: string): string {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";
  if (
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("data:") ||
    cleanValue.startsWith("//")
  ) {
    return cleanValue;
  }

  const path = cleanValue.startsWith("/") ? cleanValue : `/${cleanValue}`;
  return backendPageUrl(path);
}

function money(symbol: string, value: number): string {
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

function humanize(value: string): string {
  return String(value || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deliveryTimeLabel(value: string): string {
  if (value === "both") return "Morning & Evening";
  if (value === "morning") return "Morning";
  if (value === "evening") return "Evening";
  return humanize(value);
}

function isInstantDelivery(item: CartItem): boolean {
  return String(
    (item as SubscriptionCartItem).delivery_type || "",
  ).toLowerCase() === "instant_delivery";
}

type FulfillmentGroup = "subscription" | "standard";

function isSubscriptionItem(item: CartItem): boolean {
  const subscription = item as SubscriptionCartItem;
  return Boolean(
    subscription.is_subscription || subscription.item_type === "subscription",
  );
}

function fulfillmentGroup(item: CartItem): FulfillmentGroup {
  if (isSubscriptionItem(item)) return "subscription";
  return "standard";
}

function fulfillmentGroupLabel(group: FulfillmentGroup): string {
  if (group === "subscription") return "Subscription";
  return "Product delivery timeline";
}

// Reuse ICU formatters: constructing them for each cart row is expensive.
const INDIA_DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const INDIA_DELIVERY_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function indiaTodayDateKey(): string {
  const parts = INDIA_DATE_KEY_FORMATTER.formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function subscriptionDateKey(value: string | undefined): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const direct = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = INDIA_DATE_KEY_FORMATTER.formatToParts(parsed);
  const valueMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueMap.year}-${valueMap.month}-${valueMap.day}`;
}

function subscriptionScheduleIsStale(item: CartItem): boolean {
  if (!isSubscriptionItem(item)) return false;
  const subscription = item as SubscriptionCartItem;
  const today = indiaTodayDateKey();

  const scheduledDates = Array.isArray(subscription.delivery_dates)
    ? subscription.delivery_dates
        .map((value) => subscriptionDateKey(value))
        .filter(Boolean)
    : [];
  if (scheduledDates.some((date) => date < today)) return true;

  const startDate = subscriptionDateKey(subscription.subscription_start_date);
  return Boolean(startDate && startDate < today);
}

function formatPromisedDeliveryDate(value: string | undefined): string {
  const clean = String(value || "").trim();
  if (!clean) return "";

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

  return INDIA_DELIVERY_DATE_FORMATTER.format(parsed);
}

function availableDeliveryTimeSlots(item: CartItem): DeliveryTimeSlot[] {
  const deliveryItem = item as SubscriptionCartItem;
  const supplied = Array.isArray(deliveryItem.available_delivery_time_slots)
    ? deliveryItem.available_delivery_time_slots
    : [];
  const normalized = supplied.filter(
    (slot): slot is DeliveryTimeSlot =>
      slot === "morning" || slot === "evening",
  );
  if (normalized.length) return [...new Set(normalized)];

  const availability = String(
    deliveryItem.available_delivery_time_slot ||
      deliveryItem.delivery_time_slot ||
      "both",
  ).toLowerCase();
  if (availability === "morning") return ["morning"];
  if (availability === "evening") return ["evening"];
  return ["morning", "evening"];
}

function selectedDeliveryTimeSlots(item: CartItem): DeliveryTimeSlot[] {
  const deliveryItem = item as SubscriptionCartItem;
  const available = availableDeliveryTimeSlots(item);

  // A customer selection is the only authoritative saved choice. Keep the
  // selection exclusive: Morning OR Evening. An explicit empty array means the
  // user has not selected a delivery time yet.
  if (Array.isArray(deliveryItem.customer_selected_delivery_time_slots)) {
    const customerSelection =
      deliveryItem.customer_selected_delivery_time_slots.filter(
        (slot): slot is DeliveryTimeSlot =>
          (slot === "morning" || slot === "evening") &&
          available.includes(slot),
      );

    return customerSelection.length === 1 ? [customerSelection[0]] : [];
  }

  // Some older cart responses expose selected_delivery_time_slots. Honour a
  // single saved value, but never treat a legacy/default [morning, evening]
  // value as a user choice. That is what previously selected both by default.
  if (Array.isArray(deliveryItem.selected_delivery_time_slots)) {
    const savedSelection = deliveryItem.selected_delivery_time_slots.filter(
      (slot): slot is DeliveryTimeSlot =>
        (slot === "morning" || slot === "evening") &&
        available.includes(slot),
    );

    return savedSelection.length === 1 ? [savedSelection[0]] : [];
  }

  // A product-level `both` value describes availability, not customer intent.
  // Start with no selection and require the user to choose Morning or Evening.
  const current = String(deliveryItem.delivery_time_slot || "").toLowerCase();
  if (current === "morning" && available.includes("morning")) {
    return ["morning"];
  }
  if (current === "evening" && available.includes("evening")) {
    return ["evening"];
  }

  return [];
}

function itemFulfillmentDetails(item: CartItem) {
  const deliveryItem = item as SubscriptionCartItem;
  return [
    { label: "Product type", value: deliveryItem.product_type ? humanize(deliveryItem.product_type) : "" },
    { label: "Estimated delivery", value: formatPromisedDeliveryDate(deliveryItem.promised_delivery_date) },
  ].filter((detail) => detail.value);
}

function cartItemIdentifier(item: CartItem): string {
  const subscription = item as SubscriptionCartItem;
  return String(subscription.cart_line_id || item.item_id);
}

/**
 * During a delete, render an optimistic cart without claiming its delivery
 * charge is final. The next API response always replaces these estimates.
 */
function projectPendingCartRemovals(
  confirmed: CartPayload,
  pending: ReadonlySet<string>,
): CartPayload {
  if (!pending.size) return confirmed;
  const removed = confirmed.items.filter((item) =>
    pending.has(cartItemIdentifier(item)),
  );
  if (!removed.length) return confirmed;
  const items = confirmed.items.filter((item) =>
    !pending.has(cartItemIdentifier(item)),
  );
  const removedSubtotal = removed.reduce(
    (sum, item) => sum + Number(item.subtotal || item.price * item.quantity || 0),
    0,
  );
  const count = Math.max(
    0,
    Number(confirmed.count || 0) - removed.reduce(
      (sum, item) => sum + Number(item.quantity || 0), 0,
    ),
  );
  const subtotal = Math.max(0, Number(confirmed.totals.subtotal || 0) - removedSubtotal);
  const deliveryFee = items.length ? Number(confirmed.totals.delivery_fee || 0) : 0;
  return {
    ...confirmed,
    items,
    count,
    totals: {
      ...confirmed.totals,
      subtotal,
      delivery_fee: deliveryFee,
      total: Math.max(0, subtotal + deliveryFee),
    },
  };
}

function asSubscription(item: CartItem): SubscriptionCartItem {
  return item as SubscriptionCartItem;
}

function commonSavedDeliveryTime(items: CartItem[]): DeliveryTimeSlot | "" {
  const deliveryItems = items.filter((item) => !isInstantDelivery(item));
  if (!deliveryItems.length) return "";

  const firstSelection = selectedDeliveryTimeSlots(deliveryItems[0]);
  if (firstSelection.length !== 1) return "";

  const slot = firstSelection[0];
  const allMatch = deliveryItems.every((item) => {
    const saved = selectedDeliveryTimeSlots(item);
    return saved.length === 1 && saved[0] === slot;
  });

  return allMatch ? slot : "";
}

type CartRowProps = {
  item: CartItem;
  currencySymbol: string;
  quantity: number;
  busyAction: ItemBusyAction | null;
  anyBusy: boolean;
  removingItems: boolean;
  onQuantityAction: (item: CartItem, action: "increase" | "decrease") => void;
  onSetQuantity: (event: FormEvent<HTMLFormElement>, item: CartItem) => void;
  onDraftChange: (itemId: string, quantity: number) => void;
  onRemove: (item: CartItem) => void;
};

// A quantity change in one product no longer rebuilds every other row.
// All CSS classes and markup remain the same as the original cart.
const CartItemRow = memo(function CartItemRow({
  item, currencySymbol, quantity, busyAction, anyBusy, removingItems,
  onQuantityAction, onSetQuantity, onDraftChange, onRemove,
}: CartRowProps) {
  const productImage = imageUrl(item.image_url);
  const itemIdentifier = cartItemIdentifier(item);
  const subscription = asSubscription(item);
  const isSubscription = isSubscriptionItem(item);
  const staleSubscriptionSchedule = subscriptionScheduleIsStale(item);
  const fulfillmentDetails = itemFulfillmentDetails(item);
  const busy = busyAction !== null;
  return (
                  <article className="cart-page-row">
                    <div className="cart-page-image">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span aria-hidden="true">📦</span>
                      )}
                    </div>

                    <div className="cart-page-product">
                      {isSubscription ? (
                        <span className="cart-subscription-badge">
                          Subscription
                        </span>
                      ) : null}
                      <small>{item.category_name}</small>
                      <h2>{item.name}</h2>
                      <p>
                        {item.size || "Standard"} ·{" "}
                        {item.unit_label || "item"}
                      </p>
                      <strong>{money(currencySymbol, item.price)}</strong>

                      {fulfillmentDetails.length ? (
                        <dl
                          className="cart-fulfillment-details"
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

                      {isSubscription ? (
                        <div className="cart-subscription-details">
                          {staleSubscriptionSchedule ? (
                            <div className="cart-subscription-expired" role="alert">
                              This saved subscription schedule contains a past date.
                              Remove this item and add the subscription again before checkout.
                            </div>
                          ) : null}
                          <div className="cart-subscription-line">
                            <span>Plan</span>
                            <strong>
                              {String(
                                subscription.subscription_plan_code ||
                                  "subscription",
                              ).replace("_", " ")}
                            </strong>
                          </div>
                          <div className="cart-subscription-line">
                            <span>Deliveries</span>
                            <strong>
                              {subscription.delivery_count ||
                                subscription.delivery_dates?.length ||
                                subscription.subscription_days ||
                                0}
                            </strong>
                          </div>
                          <div className="cart-subscription-line">
                            <span>Starts</span>
                            <strong>
                              {subscription.subscription_start_date || "—"}
                            </strong>
                          </div>
                          {subscription.subscription_combination_name ? (
                            <div className="cart-subscription-line">
                              <span>Combination</span>
                              <strong>
                                {subscription.subscription_combination_name}
                              </strong>
                            </div>
                          ) : null}

                          {subscription.included_catalog_items?.length ? (
                            <div>
                              <span className="cart-subscription-line">
                                <span>Included items</span>
                              </span>
                              <div className="cart-subscription-items">
                                {subscription.included_catalog_items.map(
                                  (included, index) => (
                                    <span
                                      className="cart-subscription-chip"
                                      key={`${included.item_id || included.name}-${index}`}
                                    >
                                      {included.name}
                                      {included.unit_label
                                        ? ` · ${included.unit_label}`
                                        : ""}
                                      {Number(included.quantity || 1) > 1
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
                              <span className="cart-subscription-line">
                                <span>Complimentary items</span>
                              </span>
                              <div className="cart-subscription-items">
                                {subscription.complimentary_items.map(
                                  (complimentary, index) => (
                                    <span
                                      className="cart-subscription-chip"
                                      key={`${complimentary.item_id || complimentary.name}-${index}`}
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
                                View all {subscription.delivery_dates.length}{" "}
                                delivery dates
                              </summary>
                              <div className="cart-subscription-dates">
                                {subscription.delivery_dates.map(
                                  (date, index) => (
                                    <span
                                      className="cart-subscription-chip"
                                      key={`${date}-${index}`}
                                    >
                                      {index + 1}. {date}
                                    </span>
                                  ),
                                )}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <form
                      className="cart-page-quantity"
                      onSubmit={(event) => void onSetQuantity(event, item)}
                    >
                      <label htmlFor={`quantity-${itemIdentifier}`}>
                        Quantity
                      </label>

                      <div className="cart-page-quantity-controls">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          disabled={busy || anyBusy || removingItems}
                          onClick={() =>
                            void onQuantityAction(item, "decrease")
                          }
                        >
                          −
                        </button>

                        <input
                          id={`quantity-${itemIdentifier}`}
                          type="number"
                          min="1"
                          max={item.available_quantity !== undefined ? Math.min(99, item.available_quantity) : 99}
                          value={quantity}
                          disabled={busy || anyBusy || removingItems}
                          inputMode="numeric"
                          onChange={(event) =>
                            onDraftChange(
                              itemIdentifier,
                              Number(event.target.value),
                            )
                          }
                        />

                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          disabled={busy || anyBusy || removingItems || quantity >= Math.min(99, item.available_quantity ?? 99)}
                          onClick={() =>
                            void onQuantityAction(item, "increase")
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="cart-page-update-button"
                        type="submit"
                        disabled={busy || anyBusy || removingItems || quantity === item.quantity}
                      >
                        {busyAction === "update"
                          ? "Updating…"
                          : "Update Quantity"}
                      </button>
                    </form>

                    <div className="cart-page-total">
                      <span>Subtotal</span>
                      <strong>
                        {money(currencySymbol, item.subtotal)}
                      </strong>

                      <button
                        className="cart-page-remove"
                        type="button"
                        disabled={busy || anyBusy}
                        onClick={() => onRemove(item)}
                        aria-label={
                          busyAction === "remove"
                            ? `Removing ${item.name}`
                            : `Delete ${item.name} from cart`
                        }
                        title={
                          busyAction === "remove"
                            ? "Removing…"
                            : "Delete item"
                        }
                      >
                        {busyAction === "remove" ? (
                          <span aria-hidden="true">…</span>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </article>
  );
});

export function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // The home page already fetches the cart. Reuse that snapshot instantly on
  // navigation; a background request verifies it with the backend.
  const [initialCartSnapshot] = useState(() => getCachedCartSnapshot());
  const [confirmedCart, setConfirmedCart] = useState<CartPayload>(
    () => initialCartSnapshot || EMPTY_CART,
  );
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries((initialCartSnapshot?.items || []).map((item) => [
      cartItemIdentifier(item),
      Math.max(1, Math.min(99, Number(item.quantity || 1))),
    ])),
  );
  const [globalDeliveryTimeDraft, setGlobalDeliveryTimeDraft] = useState<
    DeliveryTimeSlot | ""
  >(() => commonSavedDeliveryTime(initialCartSnapshot?.items || []));
  const [loading, setLoading] = useState(() => !initialCartSnapshot);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyItem, setBusyItem] = useState<BusyItem | null>(null);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const pendingRemovalsRef = useRef(new Set<string>());
  const removeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pageMutationRevisionRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  const csrfTokenRef = useRef(confirmedCart.csrf_token || "");

  // A row disappears on click without waiting for a slow response, while the
  // confirmed cart remains untouched for safe rollback/reconciliation.
  const cart = useMemo(
    () => projectPendingCartRemovals(confirmedCart, pendingRemovals),
    [confirmedCart, pendingRemovals],
  );
  const removingItems = pendingRemovals.size > 0;

  const applyCart = useCallback((payload: CartPayload, announce = true) => {
    setConfirmedCart(payload);
    csrfTokenRef.current = payload.csrf_token || csrfTokenRef.current;
    const nextDrafts = Object.fromEntries(payload.items.map((item) => [
      cartItemIdentifier(item),
      Math.max(1, Math.min(99, Number(item.quantity || 1))),
    ]));
    setDraftQuantities((current) => {
      const keys = Object.keys(nextDrafts);
      if (keys.length === Object.keys(current).length &&
          keys.every((key) => current[key] === nextDrafts[key])) {
        return current;
      }
      return nextDrafts;
    });
    setGlobalDeliveryTimeDraft(commonSavedDeliveryTime(payload.items));
    // Do not trigger another cart fetch via header listeners just because
    // the page has hydrated its initial GET response.
    if (announce) window.dispatchEvent(new Event("cart-updated"));
  }, []);

  const setRemovalPending = useCallback((itemId: string, pending: boolean) => {
    const next = new Set(pendingRemovalsRef.current);
    if (pending) next.add(itemId);
    else next.delete(itemId);
    pendingRemovalsRef.current = next;
    setPendingRemovals(next);
  }, []);

  const handleApiError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiRequestError) {
        if (error.status === 401 || error.code === "AUTH_REQUIRED") {
          const next = encodeURIComponent(
            `${location.pathname}${location.search}`,
          );
          navigate(`${error.loginUrl || "/react/login"}?next=${next}`, {
            replace: true,
          });
          return;
        }

        if (error.csrfToken) {
          csrfTokenRef.current = error.csrfToken;
        }

        const validationDetails = error.errors.length
          ? ` ${error.errors.join(" ")}`
          : "";

        setPageError(`${error.message}${validationDetails}`);
        return;
      }

      setPageError(
        error instanceof Error ? error.message : "Unable to update your cart.",
      );
    },
    [location.pathname, location.search, navigate],
  );

  useEffect(() => {
    let cancelled = false;
    const startRevision = pageMutationRevisionRef.current;

    // Always revalidate when entering the cart, but never blank out a recent
    // cached snapshot while the real HTTP request is in flight.
    void getCart()
      .then((payload) => {
        if (!cancelled && pageMutationRevisionRef.current === startRevision) {
          applyCart(payload, false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && pageMutationRevisionRef.current === startRevision) {
          handleApiError(error);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [applyCart, handleApiError]);

  async function runMutation(
    operation: (csrfToken: string) => Promise<CartPayload>,
    successFallback: string,
  ): Promise<void> {
    if (pendingRemovalsRef.current.size) return;
    pageMutationRevisionRef.current += 1;
    setPageError("");
    setSuccessMessage("");

    try {
      let csrfToken = csrfTokenRef.current;

      if (!csrfToken) {
        const freshCart = await getCart();
        applyCart(freshCart, false);
        csrfToken = freshCart.csrf_token;
      }

      try {
        const payload = await operation(csrfToken);
        applyCart(payload);
        setSuccessMessage(payload.message || successFallback);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "CSRF_FAILED") {
          const freshCart = await getCart();
          applyCart(freshCart);

          const payload = await operation(freshCart.csrf_token);
          applyCart(payload);
          setSuccessMessage(payload.message || successFallback);
          return;
        }

        throw error;
      }
    } catch (error) {
      handleApiError(error);
    }
  }

  const stockByItemId = useMemo(() => new Map(
    cart.items.map((line) => [cartItemIdentifier(line), line.available_quantity] as const),
  ), [cart.items]);

  function currentDraft(item: CartItem): number {
    return draftQuantities[cartItemIdentifier(item)] ?? item.quantity;
  }

  function changeDraft(itemId: string, quantity: number) {
    const stock = stockByItemId.get(itemId);
    const upper = Number.isFinite(Number(stock)) && stock !== undefined
      ? Math.min(99, Math.max(1, Number(stock))) : 99;
    const nextQuantity = Math.max(1, Math.min(upper, quantity || 1));
    setDraftQuantities((current) => current[itemId] === nextQuantity
      ? current : { ...current, [itemId]: nextQuantity });
  }

  async function handleQuantityAction(
    item: CartItem,
    action: "increase" | "decrease",
  ) {
    if (busyItem || mutationInFlightRef.current || pendingRemovalsRef.current.size) return;
    mutationInFlightRef.current = true;
    setBusyItem({
      itemId: cartItemIdentifier(item),
      action,
    });

    try {
      await runMutation(
      (csrfToken) =>
        updateCartItem(cartItemIdentifier(item), { action }, csrfToken),
      "Cart quantity updated.",
      );
    } finally {
      mutationInFlightRef.current = false;
      setBusyItem(null);
    }
  }

  async function handleSetQuantity(
    event: FormEvent<HTMLFormElement>,
    item: CartItem,
  ) {
    event.preventDefault();
    if (busyItem || mutationInFlightRef.current || pendingRemovalsRef.current.size) return;
    // Submitting the same saved quantity need not contact the server.
    if (currentDraft(item) === item.quantity) return;
    mutationInFlightRef.current = true;
    setBusyItem({
      itemId: cartItemIdentifier(item),
      action: "update",
    });

    try {
      await runMutation(
      (csrfToken) =>
        updateCartItem(
          cartItemIdentifier(item),
          {
            action: "set",
            quantity: currentDraft(item),
          },
          csrfToken,
        ),
      "Cart quantity updated.",
      );
    } finally {
      mutationInFlightRef.current = false;
      setBusyItem(null);
    }
  }

  function handleGlobalDeliveryTimeChange(slot: DeliveryTimeSlot) {
    setPageError("");
    setSuccessMessage("");
    setGlobalDeliveryTimeDraft(slot);
  }

  async function handleSaveGlobalDeliveryTime() {
    if (busyItem || mutationInFlightRef.current || pendingRemovalsRef.current.size) return;
    pageMutationRevisionRef.current += 1;
    const slot = globalDeliveryTimeDraft;
    const deliveryItems = cart.items.filter((item) => !isInstantDelivery(item));

    if (!slot) {
      setSuccessMessage("");
      setPageError("Select either Morning or Evening before saving.");
      return;
    }

    if (!deliveryItems.length) return;

    const unsupportedItems = deliveryItems.filter(
      (item) => !availableDeliveryTimeSlots(item).includes(slot),
    );

    if (unsupportedItems.length) {
      setSuccessMessage("");
      setPageError(
        `${deliveryTimeLabel(slot)} is not available for every item in this cart. Choose a delivery time that is available for all items.`,
      );
      return;
    }

    const globalBusyId = "__global_delivery_time__";
    mutationInFlightRef.current = true;
    setBusyItem({ itemId: globalBusyId, action: "delivery_time" });
    setPageError("");
    setSuccessMessage("");

    try {
      let csrfToken = csrfTokenRef.current;
      let latestCart = cart;

      if (!csrfToken) {
        latestCart = await getCart();
        csrfToken = latestCart.csrf_token;
      }

      for (const item of deliveryItems) {
        const saved = selectedDeliveryTimeSlots(item);
        if (saved.length === 1 && saved[0] === slot) continue;

        const itemId = cartItemIdentifier(item);

        try {
          latestCart = await updateCartItem(
            itemId,
            {
              action: "delivery_time",
              delivery_time_slots: [slot],
            } as any,
            csrfToken,
          );
        } catch (error) {
          if (error instanceof ApiRequestError && error.code === "CSRF_FAILED") {
            const freshCart = await getCart();
            csrfToken = freshCart.csrf_token;

            latestCart = await updateCartItem(
              itemId,
              {
                action: "delivery_time",
                delivery_time_slots: [slot],
              } as any,
              csrfToken,
            );
          } else {
            throw error;
          }
        }

        csrfToken = latestCart.csrf_token || csrfToken;
      }

      applyCart(latestCart);
      setGlobalDeliveryTimeDraft(slot);
      setSuccessMessage(
        `${deliveryTimeLabel(slot)} delivery selected for all applicable cart items.`,
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      mutationInFlightRef.current = false;
      setBusyItem(null);
    }
  }

  function handleRemove(item: CartItem) {
    const itemId = cartItemIdentifier(item);
    if (!itemId || pendingRemovalsRef.current.has(itemId) || busyItem || mutationInFlightRef.current) return;

    pageMutationRevisionRef.current += 1;
    setPageError("");
    setSuccessMessage("");
    // Remove the row on this very click, not after the POST response.
    setRemovalPending(itemId, true);

    const removeOne = async (): Promise<void> => {
      try {
        let token = csrfTokenRef.current;
        if (!token) {
          const refreshed = await getCart();
          applyCart(refreshed, false);
          token = refreshed.csrf_token;
        }

        let result: CartPayload;
        try {
          result = await removeCartItem(itemId, token);
        } catch (error) {
          if (!(error instanceof ApiRequestError) || error.code !== "CSRF_FAILED") {
            throw error;
          }
          // Only retry a positively identified CSRF rejection; timeouts may
          // already have executed on the server and MUST NOT be replayed.
          const refreshed = await getCart();
          applyCart(refreshed, false);
          result = await removeCartItem(itemId, refreshed.csrf_token);
        }
        applyCart(result);
        setSuccessMessage(result.message || "Item removed from your cart.");
      } catch (error) {
        // The server may have completed an operation despite a network error.
        // Check the real cart before restoring a row to the screen.
        try {
          applyCart(await getCart(), false);
        } catch {
          // Retain the last confirmed cart if reconciliation is unavailable.
        }
        handleApiError(error);
      } finally {
        setRemovalPending(itemId, false);
      }
    };

    // Two fast taps on different items should be registered immediately,
    // but server writes execute in order so older whole-cart API responses
    // cannot resurrect an item deleted by a newer request.
    const next = removeQueueRef.current.then(removeOne, removeOne);
    removeQueueRef.current = next.catch(() => {});
  }

  // Stable callbacks ensure editing one quantity only re-renders that row.
  // The current handlers are referenced at invocation time so auth/cart state
  // and validation cannot become stale inside a memoized product card.
  const rowActionsRef = useRef({
    handleQuantityAction, handleSetQuantity, changeDraft, handleRemove,
  });
  rowActionsRef.current = {
    handleQuantityAction, handleSetQuantity, changeDraft, handleRemove,
  };
  const onRowQuantityAction = useCallback((item: CartItem, action: "increase" | "decrease") => {
    void rowActionsRef.current.handleQuantityAction(item, action);
  }, []);
  const onRowSetQuantity = useCallback((event: FormEvent<HTMLFormElement>, item: CartItem) => {
    void rowActionsRef.current.handleSetQuantity(event, item);
  }, []);
  const onRowDraftChange = useCallback((itemId: string, quantity: number) => {
    rowActionsRef.current.changeDraft(itemId, quantity);
  }, []);
  const onRowRemove = useCallback((item: CartItem) => {
    rowActionsRef.current.handleRemove(item);
  }, []);

  // Derive catalogue metadata only if actual cart lines change.
  const deliveryTimeItems = useMemo(
    () => cart.items.filter((item) => !isInstantDelivery(item)), [cart.items],
  );
  const globalAvailableDeliveryTimeSlots = useMemo(
    () => (["morning", "evening"] as DeliveryTimeSlot[]).filter((slot) =>
      deliveryTimeItems.every((item) => availableDeliveryTimeSlots(item).includes(slot)),
    ), [deliveryTimeItems],
  );
  const savedGlobalDeliveryTime = useMemo(
    () => commonSavedDeliveryTime(cart.items), [cart.items],
  );
  const globalDeliveryTimeChanged = false;
  const hasMissingDeliveryTime = false; // Standard products no longer require a delivery slot.
  const hasInconsistentDeliveryTime = false;
  const globalDeliveryBusy =
    busyItem?.itemId === "__global_delivery_time__" &&
    busyItem.action === "delivery_time";

  const fulfillmentGroups = useMemo(() => Array.from(
    new Set(cart.items.map((item) => fulfillmentGroup(item))),
  ), [cart.items]);
  const mixedFulfillment = fulfillmentGroups.length > 1;
  const staleSubscriptionItems = useMemo(
    () => cart.items.filter(subscriptionScheduleIsStale), [cart.items],
  );
  const hasStaleSubscription = staleSubscriptionItems.length > 0;
  const activeFulfillmentGroup = fulfillmentGroups[0] as FulfillmentGroup | undefined;

  const checkoutBlocked =
    mixedFulfillment ||
    hasStaleSubscription ||
    hasMissingDeliveryTime ||
    hasInconsistentDeliveryTime ||
    globalDeliveryTimeChanged ||
    Boolean(busyItem) ||
    removingItems;

  const checkoutWarning = mixedFulfillment
    ? "Historical subscription orders and regular products need separate checkouts. All regular products can be ordered together."
    : hasStaleSubscription
      ? "A historical subscription date has passed. Remove the item and start a new schedule."
      : "";

  const deliveryTotals = cart.totals as CartPayload["totals"] &
    DeliveryChargeBreakdown;
  const deliveryDistanceKm =
    deliveryTotals.delivery_distance_km === null ||
    deliveryTotals.delivery_distance_km === undefined
      ? null
      : Number(deliveryTotals.delivery_distance_km);
  const deliveryDistanceKnown =
    deliveryDistanceKm !== null && Number.isFinite(deliveryDistanceKm);
  return (
    <>
      <style>{CART_PAGE_STYLES}</style>

      <main className="react-cart-page">
        {pageError ? (
          <div className="cart-page-alert cart-page-alert-error" role="alert">
            {pageError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            className="cart-page-alert cart-page-alert-success"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}

        {removingItems ? (
          <div className="cart-page-alert cart-page-alert-success" role="status">
            Removing {pendingRemovals.size === 1 ? "item" : "items"}…
            Recalculating totals. Checkout will be available when saved.
          </div>
        ) : null}

        {loading ? (
          <section className="cart-page-loading">Loading your cart…</section>
        ) : cart.items.length ? (
          <div className="cart-page-layout">
            <section className="cart-page-card cart-page-list">
              {cart.items.map((item) => {
                const itemIdentifier = cartItemIdentifier(item);
                return (
                  <CartItemRow
                    key={itemIdentifier}
                    item={item}
                    currencySymbol={cart.currency_symbol}
                    quantity={draftQuantities[itemIdentifier] ?? item.quantity}
                    busyAction={busyItem?.itemId === itemIdentifier ? busyItem.action : null}
                    anyBusy={Boolean(busyItem)}
                    removingItems={removingItems}
                    onQuantityAction={onRowQuantityAction}
                    onSetQuantity={onRowSetQuantity}
                    onDraftChange={onRowDraftChange}
                    onRemove={onRowRemove}
                  />
                );
              })}

            </section>

            <aside className="cart-page-card cart-page-summary">
              <h2>Order Summary</h2>

              <div
                className={`cart-checkout-type-note${mixedFulfillment ? " invalid" : ""}`}
              >
                <strong>Delivery</strong>
                <span>
                  {mixedFulfillment
                    ? fulfillmentGroups.map(fulfillmentGroupLabel).join(" + ")
                    : activeFulfillmentGroup
                      ? fulfillmentGroupLabel(activeFulfillmentGroup)
                      : "—"}
                </span>
                {mixedFulfillment ? (
                  <span>Remove the other delivery types to continue.</span>
                ) : null}
              </div>

              <div className="cart-page-summary-line">
                <span>Subtotal</span>
                <strong>
                  {money(cart.currency_symbol, cart.totals.subtotal)}
                </strong>
              </div>

              <div className="cart-page-summary-line">
                <span>Delivery</span>
                <strong>
                  {cart.totals.delivery_fee > 0
                    ? money(cart.currency_symbol, cart.totals.delivery_fee)
                    : "Free"}
                </strong>
              </div>

              <div className="cart-delivery-pricing-note" aria-label="Delivery charges">
                <strong>Delivery charges</strong>
                <span>
                  {deliveryTotals.delivery_free_threshold && deliveryTotals.delivery_free_threshold > 0
                    ? `Free standard delivery on orders of ${money(cart.currency_symbol, deliveryTotals.delivery_free_threshold)} or more.`
                    : "Delivery charges are calculated from the store's current rates."}
                  {Number(deliveryTotals.delivery_product_surcharge || 0) > 0
                    ? ` Special handling: ${money(cart.currency_symbol, Number(deliveryTotals.delivery_product_surcharge || 0))}.`
                    : ""}
                  {Number(deliveryTotals.delivery_regular_discount || 0) > 0
                    ? ` Shipping discount: ${money(cart.currency_symbol, Number(deliveryTotals.delivery_regular_discount || 0))}.`
                    : ""}
                </span>
                {Number(deliveryTotals.delivery_distance_fee || 0) > 0 ?
                  <span>Extra distance fee: {money(cart.currency_symbol, Number(deliveryTotals.delivery_distance_fee || 0))}</span> : null}
                {!deliveryDistanceKnown && Number(deliveryTotals.delivery_extra_per_km || 0) > 0 ?
                  <span>Any applicable distance charges are confirmed after address selection.</span> : null}
              </div>

              <div className="cart-page-summary-line cart-page-summary-line-grand">
                <span>{removingItems ? "Recalculating total…" : deliveryDistanceKnown ? "Total" : "Estimated total"}</span>
                <strong>
                  {money(cart.currency_symbol, cart.totals.total)}
                </strong>
              </div>

              {false && deliveryTimeItems.length > 0 ? (
                <fieldset
                  className="cart-delivery-time-checklist cart-global-delivery-time"
                  disabled={Boolean(busyItem) || removingItems}
                >
                  <legend>Delivery time for all items</legend>
                  <p className="cart-delivery-time-help">
                    Choose one delivery window for this cart. The same Morning or
                    Evening selection will be applied to every applicable item, so
                    you do not need to select and save delivery time item by item.
                  </p>

                  <div className="cart-delivery-time-options">
                    {(["morning", "evening"] as DeliveryTimeSlot[]).map(
                      (slot) => {
                        const isAvailable =
                          globalAvailableDeliveryTimeSlots.includes(slot);
                        const isSelected = globalDeliveryTimeDraft === slot;

                        return (
                          <label
                            className={`cart-delivery-time-option${
                              isSelected ? " selected" : ""
                            }${!isAvailable ? " unavailable" : ""}`}
                            key={slot}
                          >
                            <input
                              type="radio"
                              name="cart-global-delivery-time"
                              checked={isSelected}
                              disabled={Boolean(busyItem) || removingItems || !isAvailable}
                              onChange={() =>
                                handleGlobalDeliveryTimeChange(slot)
                              }
                            />
                            <span>{deliveryTimeLabel(slot)}</span>
                            {!isAvailable ? <small>Unavailable</small> : null}
                          </label>
                        );
                      },
                    )}
                  </div>

                  <div className="cart-delivery-time-save-row">
                    <button
                      className="cart-delivery-time-save"
                      type="button"
                      disabled={
                        Boolean(busyItem) ||
                        removingItems ||
                        !globalDeliveryTimeDraft ||
                        !globalAvailableDeliveryTimeSlots.includes(
                          globalDeliveryTimeDraft,
                        ) ||
                        !globalDeliveryTimeChanged
                      }
                      onClick={() => void handleSaveGlobalDeliveryTime()}
                    >
                      {globalDeliveryBusy
                        ? "Saving for all items…"
                        : savedGlobalDeliveryTime === globalDeliveryTimeDraft &&
                            Boolean(savedGlobalDeliveryTime)
                          ? "Saved for All Items"
                          : "Save for All Items"}
                    </button>

                    {globalDeliveryBusy ? (
                      <span className="cart-delivery-time-saving">
                        Applying {deliveryTimeLabel(globalDeliveryTimeDraft)} to
                        all items…
                      </span>
                    ) : savedGlobalDeliveryTime ? (
                      <span className="cart-delivery-time-saving">
                        Current cart delivery: {deliveryTimeLabel(savedGlobalDeliveryTime)}
                      </span>
                    ) : null}
                  </div>
                </fieldset>
              ) : null}

              <button
                className="cart-page-button cart-page-button-primary cart-page-button-full"
                type="button"
                disabled={checkoutBlocked}
                aria-describedby={checkoutWarning ? "cart-checkout-warning" : undefined}
                onClick={() => navigate("/store/checkout?mode=cart")}
              >
                Proceed to Checkout
              </button>

              {checkoutWarning ? (
                <p
                  className="cart-page-checkout-warning"
                  id="cart-checkout-warning"
                  role="status"
                >
                  {checkoutWarning}
                </p>
              ) : null}
            </aside>
          </div>
        ) : (
          <section className="cart-page-empty">
            <div aria-hidden="true">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Explore our products and add your favourites.</p>

            <Link className="cart-page-button cart-page-button-primary" to="/">
              Browse Products
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
