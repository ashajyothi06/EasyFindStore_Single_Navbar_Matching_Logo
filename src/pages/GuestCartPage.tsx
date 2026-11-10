import { memo, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCatalog,
  findCatalogProduct,
  readGuestCart,
  setGuestQuantity,
} from "../lib/guestCart";
import type { CatalogCategory } from "../services/coreCommerceApi";

/**
 * Guest Cart — UI matched to the authenticated CartPage.
 * It retains guest local-storage cart behavior and never sends product prices
 * or inventory decisions to the server as authoritative values.
 *
 * All original CartPage layout rules are embedded here; no shared CSS changes
 * are needed. Only the small guest-specific rules after them are added.
 */
const GUEST_CART_STYLES = `
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
    object-fit: contain;
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



  /* Product image visibility fix: show the COMPLETE item, never crop it.
     A positioned image avoids intrinsic image dimensions enlarging or
     distorting the fixed-ratio thumbnail. This is scoped to the guest cart. */
  .react-cart-page .cart-page-image {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    flex-shrink: 0;
    padding: 0;
    background: #fffaf4;
  }
  .react-cart-page .cart-page-image > img {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 8px !important;
    display: block !important;
    object-fit: contain !important;
    object-position: center center !important;
    transform: none !important;
    border-radius: inherit;
    background: #fffaf4;
  }
  @media (max-width: 700px) {
    .react-cart-page .cart-page-image > img {
      padding: 5px !important;
    }
  }

  /* Guest-only polish; the reference desktop/mobile grid remains unchanged. */
  .react-cart-page .cart-guest-muted {
    margin: 8px 0 0;
    color: var(--cart-muted);
    font-size: .82rem;
    line-height: 1.45;
  }
  .react-cart-page .cart-guest-unavailable {
    display: block;
    margin: 8px 0 0;
    color: #a01828;
    font-size: .78rem;
    font-weight: 700;
  }
  .react-cart-page .cart-page-heading .cart-page-button { flex-shrink: 0; }
  .react-cart-page .cart-page-button:disabled { cursor: not-allowed; }
  @media (max-width: 700px) {
    .react-cart-page .cart-page-heading .cart-page-button { width: 100%; }
  }
`;

type GuestLine = ReturnType<typeof readGuestCart>[number];
type ProductMatch = ReturnType<typeof findCatalogProduct>;
type LineAction = "increase" | "decrease" | "remove";

type ExtraItemFields = {
  size?: string | null;
  unit_label?: string | null;
  delivery_days?: number | null;
  promised_delivery_date?: string | null;
};

const CATALOG_REUSE_MS = 30_000;
let catalogSnapshot: { data: CatalogCategory[]; fetchedAt: number } | null = null;
let catalogRequest: Promise<CatalogCategory[]> | null = null;

/** Reuse a recently fetched catalogue when moving between shop pages. */
function loadGuestCatalog(): Promise<CatalogCategory[]> {
  if (catalogSnapshot && Date.now() - catalogSnapshot.fetchedAt < CATALOG_REUSE_MS) {
    return Promise.resolve(catalogSnapshot.data);
  }
  if (catalogRequest) return catalogRequest;
  catalogRequest = fetchCatalog()
    .then((categories) => {
      catalogSnapshot = { data: categories, fetchedAt: Date.now() };
      return categories;
    })
    .finally(() => {
      catalogRequest = null;
    });
  return catalogRequest;
}

function sameLines(previous: GuestLine[], next: GuestLine[]): boolean {
  if (previous === next) return true;
  if (previous.length !== next.length) return false;
  return previous.every((line, index) => {
    const other = next[index];
    return line.itemId === other.itemId && line.quantity === other.quantity;
  });
}

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

// Match the authenticated CartPage delivery-date format exactly.
// Guest checkout has no confirmed order yet, so fall back to an estimate
// calculated from the product's delivery_days in India Standard Time.
const GUEST_DELIVERY_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const GUEST_TODAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function guestExpectedDeliveryDate(
  promisedDate: string | null | undefined,
  deliveryDays: number | null | undefined,
): string {
  const promised = String(promisedDate || "").trim();
  if (promised) {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(promised);
    // Midday UTC prevents timezone conversions from changing a date-only value.
    const parsed = dateOnly
      ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
      : new Date(promised);
    if (Number.isFinite(parsed.getTime())) {
      return GUEST_DELIVERY_DATE_FORMATTER.format(parsed);
    }
  }

  const days = Number(deliveryDays);
  if (deliveryDays === null || deliveryDays === undefined || !Number.isFinite(days) || days <= 0) {
    return "";
  }
  const todayParts = GUEST_TODAY_FORMATTER.formatToParts(new Date());
  const get = (type: string): number => Number(todayParts.find((part) => part.type === type)?.value);
  const estimated = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + Math.ceil(days), 12));
  return GUEST_DELIVERY_DATE_FORMATTER.format(estimated);
}


function clampQuantity(value: number, stock: number): number {
  return Math.max(0, Math.min(99, Math.floor(stock), Math.floor(value)));
}

function getStock(match: ProductMatch): number {
  return Math.max(0, Math.floor(Number(match?.item.stock_quantity) || 0));
}

type GuestCartRowProps = {
  line: GuestLine;
  match: ProductMatch;
  catalogLoading: boolean;
  onAction: (itemId: string, action: LineAction, stock: number) => void;
  onSetQuantity: (itemId: string, quantity: number, stock: number) => void;
};

/** A draft quantity lives inside its own row, so typing never rerenders siblings. */
const GuestCartItemRow = memo(function GuestCartItemRow({
  line,
  match,
  catalogLoading,
  onAction,
  onSetQuantity,
}: GuestCartRowProps) {
  const product = match?.item;
  const category = match?.category;
  const stock = getStock(match);
  const unavailable = !catalogLoading && (!product || !stock || line.quantity > stock);
  const [draft, setDraft] = useState(line.quantity);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setDraft(line.quantity), [line.quantity]);
  useEffect(() => setImageFailed(false), [product?.image_url]);

  const detail = product as (typeof product & ExtraItemFields) | undefined;
  const expectedDeliveryDate = useMemo(
    () => guestExpectedDeliveryDate(detail?.promised_delivery_date, detail?.delivery_days),
    [detail?.promised_delivery_date, detail?.delivery_days],
  );
  const itemPrice = Number(product?.price) || 0;
  const itemImage = product?.image_url;
  const changed = Number(draft) !== Number(line.quantity);
  const canEdit = Boolean(product && stock > 0);
  const displayedName = product?.name || (catalogLoading ? "Checking product details…" : "Product no longer available");

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !changed) return;
    onSetQuantity(line.itemId, draft, stock);
  }

  return (
    <article className="cart-page-row" data-cart-item-id={line.itemId}>
      <div className="cart-page-image">
        {itemImage && !imageFailed ? (
          <img
            src={itemImage}
            alt={product?.name || "Product"}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span aria-hidden="true">📦</span>
        )}
      </div>

      <div className="cart-page-product">
        <small>{category?.name || (catalogLoading ? "Checking category" : "Product")}</small>
        <h2>{displayedName}</h2>
        <p>{detail?.size || "Standard"} · {detail?.unit_label || "item"}</p>
        <strong>{product ? formatMoney(itemPrice) : "—"}</strong>
        {expectedDeliveryDate && (
          <dl className="cart-fulfillment-details" aria-label={`${displayedName} delivery details`}>
            <div>
              <dt>Estimated delivery</dt>
              <dd>{expectedDeliveryDate}</dd>
            </div>
          </dl>
        )}
        {unavailable && (
          <span className="cart-guest-unavailable">
            {!product
              ? "This product is unavailable. Remove it to continue."
              : stock === 0
                ? "Out of stock. Remove this item to continue."
                : `Only ${stock} in stock. Reduce the quantity.`}
          </span>
        )}
      </div>

      <form className="cart-page-quantity" onSubmit={handleUpdate}>
        <label htmlFor={`guest-quantity-${line.itemId}`}>Quantity</label>
        <div className="cart-page-quantity-controls">
          <button
            type="button"
            aria-label={`Decrease ${displayedName} quantity`}
            disabled={!canEdit}
            onClick={() => onAction(line.itemId, "decrease", stock)}
          >
            −
          </button>
          <input
            id={`guest-quantity-${line.itemId}`}
            type="number"
            min="1"
            max={Math.min(99, stock || 99)}
            inputMode="numeric"
            value={draft}
            disabled={!canEdit}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw === "" ? 0 : Math.max(0, Number(raw) || 0));
            }}
          />
          <button
            type="button"
            aria-label={`Increase ${displayedName} quantity`}
            disabled={!canEdit || line.quantity >= Math.min(99, stock)}
            onClick={() => onAction(line.itemId, "increase", stock)}
          >
            +
          </button>
        </div>
        <button
          className="cart-page-update-button"
          type="submit"
          disabled={!canEdit || !changed}
        >
          Update Quantity
        </button>
      </form>

      <div className="cart-page-total">
        <span>Subtotal</span>
        <strong>{product ? formatMoney(itemPrice * line.quantity) : "—"}</strong>
        <button
          className="cart-page-remove"
          type="button"
          aria-label={`Delete ${displayedName} from cart`}
          title="Delete item"
          onClick={() => onAction(line.itemId, "remove", stock)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
        </button>
      </div>
    </article>
  );
});

export function GuestCartPage() {
  // Render the saved cart immediately, even before catalogue data arrives.
  const [lines, setLines] = useState<GuestLine[]>(() => readGuestCart());
  const [categories, setCategories] = useState<CatalogCategory[]>(
    () => catalogSnapshot?.data || [],
  );
  const [loading, setLoading] = useState(() => !catalogSnapshot);
  const [error, setError] = useState("");

  // Preserve lookups across quantity edits, but invalidate synchronously (not
  // in an effect) whenever the catalogue object changes.
  const indexRef = useRef<{
    categories: CatalogCategory[];
    matches: Map<string, ProductMatch>;
  }>({ categories, matches: new Map() });

  const refreshCart = useCallback(() => {
    try {
      const next = readGuestCart();
      setLines((current) => sameLines(current, next) ? current : next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Browser cart storage is unavailable.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadGuestCatalog()
      .then((payload) => {
        if (!active) return;
        setCategories(payload);
        setError("");
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load product details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // `storage` handles updates from another tab, `cart-updated` this tab.
    window.addEventListener("cart-updated", refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      active = false;
      window.removeEventListener("cart-updated", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, [refreshCart]);

  // Category/product matches are cached by ID for as long as the catalogue is
  // unchanged. Quantity clicks no longer search the whole category tree again.
  const products = useMemo(() => {
    if (indexRef.current.categories !== categories) {
      indexRef.current = { categories, matches: new Map() };
    }
    const lookup = indexRef.current.matches;
    const result = new Map<string, ProductMatch>();
    for (const line of lines) {
      if (!lookup.has(line.itemId)) {
        lookup.set(line.itemId, findCatalogProduct(categories, line.itemId));
      }
      result.set(line.itemId, lookup.get(line.itemId));
    }
    return result;
  }, [categories, lines]);

  const summary = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let unavailableCount = 0;
    for (const line of lines) {
      count += line.quantity;
      const match = products.get(line.itemId);
      const item = match?.item;
      const stock = getStock(match);
      if (!item || !stock || line.quantity > stock) unavailableCount += 1;
      if (item) subtotal += (Number(item.price) || 0) * line.quantity;
    }
    return { count, subtotal, unavailableCount };
  }, [lines, products]);

  // Read the current saved value during an action. Two very quick clicks cannot
  // overwrite each other with an out-of-date rendered quantity.
  const saveQuantity = useCallback((itemId: string, quantity: number, stock: number) => {
    try {
      setGuestQuantity(itemId, clampQuantity(quantity, stock), stock);
      setError("");
      refreshCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Browser storage unavailable.");
    }
  }, [refreshCart]);

  const handleAction = useCallback((itemId: string, action: LineAction, stock: number) => {
    try {
      const current = readGuestCart().find((line) => line.itemId === itemId);
      if (!current) return;
      const next = action === "remove" ? 0
        : current.quantity + (action === "increase" ? 1 : -1);
      saveQuantity(itemId, next, stock);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Browser storage unavailable.");
    }
  }, [saveQuantity]);

  const hasBlockingIssue = !loading && Boolean(lines.length) &&
    (!categories.length || summary.unavailableCount > 0);

  return (
    <>
      <style>{GUEST_CART_STYLES}</style>
      <main className="react-cart-page">
        <div className="cart-page-heading">
          <div>
            <span className="cart-page-eyebrow">Your selections</span>
            <h1>Your Shopping Cart</h1>
            <p>Your selections are saved on this browser until checkout.</p>
          </div>
          <Link className="cart-page-button cart-page-button-secondary" to="/categories">
            Continue Shopping
          </Link>
        </div>

        {error && (
          <div className="cart-page-alert cart-page-alert-error" role="alert">{error}</div>
        )}

        {!lines.length ? (
          <section className="cart-page-empty">
            <div aria-hidden="true">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Explore our products and add your favourites.</p>
            <Link className="cart-page-button cart-page-button-primary" to="/categories">
              Browse Products
            </Link>
          </section>
        ) : (
          <>
            {loading && !categories.length && (
              <div className="cart-page-alert cart-page-alert-success" role="status">
                Checking product prices and availability…
              </div>
            )}
            <div className="cart-page-layout">
              <section className="cart-page-card cart-page-list" aria-label="Cart items">
                {lines.map((line) => (
                  <GuestCartItemRow
                    key={line.itemId}
                    line={line}
                    match={products.get(line.itemId)}
                    catalogLoading={loading && !categories.length}
                    onAction={handleAction}
                    onSetQuantity={saveQuantity}
                  />
                ))}
              </section>

              <aside className="cart-page-card cart-page-summary">
                <h2>Order Summary</h2>
                <div className="cart-checkout-type-note">
                  <strong>Delivery</strong>
                  <span>Product delivery timeline</span>
                </div>
                <div className="cart-page-summary-line">
                  <span>Subtotal ({summary.count} items)</span>
                  <strong>{loading && !categories.length ? "Checking…" : formatMoney(summary.subtotal)}</strong>
                </div>
                <div className="cart-page-summary-line">
                  <span>Delivery</span>
                  <strong>At checkout</strong>
                </div>
                <div className="cart-delivery-pricing-note" aria-label="Delivery charges">
                  <strong>Delivery charges</strong>
                  <span>Delivery charges and final product availability are confirmed at checkout.</span>
                </div>
                <div className="cart-page-summary-line cart-page-summary-line-grand">
                  <span>Estimated total</span>
                  <strong>{loading && !categories.length ? "Checking…" : formatMoney(summary.subtotal)}</strong>
                </div>
                <Link
                  className="cart-page-button cart-page-button-primary cart-page-button-full"
                  to={hasBlockingIssue || loading ? "/store/cart" : "/store/checkout"}
                  aria-disabled={hasBlockingIssue || loading}
                  onClick={(event) => {
                    if (hasBlockingIssue || loading) event.preventDefault();
                  }}
                >
                  Proceed to Checkout
                </Link>
                {(hasBlockingIssue || loading) && (
                  <p className="cart-page-checkout-warning" role="status">
                    {loading
                      ? "Checking availability before checkout…"
                      : error && !categories.length
                        ? "Product details could not be loaded. Refresh this page to try again."
                        : "Remove unavailable items or reduce quantities before checkout."}
                  </p>
                )}
                <p className="cart-guest-muted">
                  Sign in or create an account at checkout. Your saved cart will be merged automatically.
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}
