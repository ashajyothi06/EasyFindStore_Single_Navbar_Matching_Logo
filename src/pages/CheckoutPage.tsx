import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ApiRequestError,
  getCheckout,
} from "../lib/api";
import type {
  AddressFormValues,
  CheckoutPayload,
  SavedAddress,
} from "../types/commerce";

const EMPTY_ADDRESS: AddressFormValues = {
  recipient_name: "",
  phone: "",
  alternate_phone: "",
  address_line1: "",
  address_line2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "home",
  latitude: "",
  longitude: "",
  is_default: false,
};

const CHECKOUT_PAGE_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .react-checkout-page {
    --checkout-maroon: #55111f;
    --checkout-maroon-hover: #711e32;
    --checkout-maroon-soft: #fff0f1;
    --checkout-ink: #351b25;
    --checkout-muted: #77656b;
    --checkout-border: #e8d9d3;
    --checkout-page-gutter: clamp(18px, 2.4vw, 48px);
    width: 100%;
    min-height: 100vh;
    padding: 28px var(--checkout-page-gutter) 64px;
    box-sizing: border-box;
    min-width: 0;
    overflow-x: clip;
    background: #fbf7f0;
    color: var(--checkout-ink);
    font-family: "Nunito", Arial, Helvetica, sans-serif;
  }

  .react-checkout-page *,
  .react-checkout-page *::before,
  .react-checkout-page *::after {
    box-sizing: border-box;
    font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  }

  .react-checkout-page > form,
  .react-checkout-page > .checkout-alert,
  .react-checkout-page > .checkout-loading,
  .react-checkout-page > .checkout-empty {
    width: 100%;
    max-width: none;
    margin-left: 0;
    margin-right: 0;
  }

  .react-checkout-page,
  .checkout-page-layout,
  .checkout-page-main,
  .checkout-page-card,
  .checkout-summary,
  .checkout-alert,
  .checkout-loading,
  .checkout-empty {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .checkout-page-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(350px, 390px);
    align-items: start;
    gap: clamp(24px, 2.2vw, 36px);
  }

  .checkout-page-main {
    display: grid;
    gap: 20px;
  }

  .checkout-page-card {
    padding: 26px 28px;
    border: 1px solid var(--checkout-border);
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 14px 36px rgba(74, 18, 33, 0.075);
  }

  .checkout-step-title {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .checkout-step-number {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 12px;
    background: var(--checkout-maroon);
    color: #ffffff;
    border: 1px solid #d8a949;
    box-shadow: 0 5px 14px rgba(85, 17, 31, 0.14);
    font-weight: 600;
  }

  .checkout-step-copy {
    min-width: 0;
    flex: 1;
  }

  .checkout-step-copy h2 {
    margin: 0;
    color: var(--checkout-ink);
    font-size: 1.35rem;
    font-weight: 600;
  }

  .checkout-step-copy p {
    margin: 5px 0 0;
    color: var(--checkout-muted);
    line-height: 1.5;
  }

  .checkout-manage-link {
    align-self: center;
    color: var(--checkout-maroon);
    font-size: 0.84rem;
    font-weight: 600;
    text-decoration: none;
  }

  .checkout-manage-link:hover {
    color: var(--checkout-maroon-hover);
    text-decoration: underline;
  }

  .checkout-mode-option {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 13px 0;
    color: var(--checkout-ink);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .checkout-mode-option input,
  .checkout-payment-option input,
  .checkout-checks input,
  .checkout-terms input {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    accent-color: var(--checkout-maroon);
  }

  .checkout-saved-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
    margin-bottom: 18px;
  }

  .checkout-saved-address {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 16px;
    border: 1px solid var(--checkout-border);
    border-radius: 15px;
    background: #fffaf6;
    cursor: pointer;
  }

  .checkout-saved-address.selected {
    border-color: #b47d42;
    background: var(--checkout-maroon-soft);
    box-shadow: 0 0 0 3px rgba(216, 169, 73, 0.20);
  }

  .checkout-saved-address input {
    width: 17px;
    height: 17px;
    margin-top: 2px;
    accent-color: var(--checkout-maroon);
  }

  .checkout-saved-copy {
    min-width: 0;
  }

  .checkout-address-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .checkout-address-top strong {
    color: var(--checkout-ink);
  }

  .checkout-address-type {
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--checkout-maroon-soft);
    color: var(--checkout-maroon);
    font-size: 0.66rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .checkout-saved-copy p {
    margin: 7px 0 0;
    color: var(--checkout-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .checkout-gps-valid,
  .checkout-gps-missing {
    display: block;
    margin-top: 8px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .checkout-gps-valid {
    color: var(--checkout-maroon);
  }

  .checkout-gps-missing {
    color: #b42332;
  }

  .checkout-new-address {
    margin-top: 13px;
    padding-top: 18px;
    border-top: 1px solid var(--checkout-border);
  }

  .checkout-location-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 10px;
    padding: 16px;
    border: 1px solid var(--checkout-border);
    border-radius: 15px;
    background: var(--checkout-maroon-soft);
  }

  .checkout-location-card strong {
    color: var(--checkout-ink);
  }

  .checkout-location-card p {
    margin: 5px 0 0;
    color: var(--checkout-muted);
    font-size: 0.84rem;
  }

  .checkout-button {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border: 1px solid transparent;
    border-radius: 11px;
    font: inherit;
    font-size: 0.86rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .checkout-button:hover {
    transform: translateY(-1px);
  }

  .checkout-button:disabled {
    cursor: wait;
    opacity: 0.62;
    transform: none;
  }

  .checkout-button:focus-visible,
  .checkout-field input:focus-visible,
  .checkout-field select:focus-visible,
  .checkout-coupon-input:focus-visible,
  .checkout-saved-address:focus-within,
  .checkout-payment-option:focus-within {
    outline: 3px solid rgba(216, 169, 73, 0.55);
    outline-offset: 3px;
  }

  .checkout-button-primary {
    border-color: var(--checkout-maroon);
    background: var(--checkout-maroon);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(74, 18, 33, 0.2);
  }

  .checkout-button-primary:hover {
    border-color: var(--checkout-maroon-hover);
    background: var(--checkout-maroon-hover);
    color: #ffffff;
  }

  .checkout-button-secondary {
    border-color: var(--checkout-border);
    background: #ffffff;
    color: var(--checkout-maroon);
  }

  .checkout-button-secondary:hover {
    border-color: var(--checkout-maroon);
    background: var(--checkout-maroon-soft);
  }

  .checkout-button-full {
    width: 100%;
  }

  .checkout-location-status {
    min-height: 21px;
    margin-bottom: 12px;
    color: var(--checkout-muted);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .checkout-location-status.success {
    color: var(--checkout-maroon);
  }

  .checkout-location-status.error {
    color: #b42332;
  }

  .checkout-address-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }

  .checkout-field {
    display: grid;
    gap: 7px;
    color: var(--checkout-ink);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .checkout-field-wide {
    grid-column: 1 / -1;
  }

  .checkout-field input,
  .checkout-field select {
    width: 100%;
    min-height: 45px;
    padding: 10px 12px;
    border: 1px solid var(--checkout-border);
    border-radius: 10px;
    background: #ffffff;
    color: var(--checkout-ink);
    font: inherit;
    font-weight: 500;
    outline: none;
  }

  .checkout-field input:focus,
  .checkout-field select:focus {
    border-color: var(--checkout-maroon);
    box-shadow: 0 0 0 3px rgba(74, 18, 33, 0.16);
  }

  .checkout-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 17px;
  }

  .checkout-checks label {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--checkout-ink);
    font-size: 0.84rem;
    font-weight: 600;
  }

  .checkout-payment-list {
    display: grid;
    gap: 12px;
  }

  .checkout-payment-option {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 17px;
    border: 1px solid var(--checkout-border);
    border-radius: 15px;
    background: #fffaf6;
    cursor: pointer;
  }

  .checkout-payment-option.selected {
    border-color: var(--checkout-maroon);
    background: var(--checkout-maroon-soft);
  }

  .checkout-payment-option strong {
    color: var(--checkout-ink);
  }

  .checkout-payment-option p {
    margin: 6px 0 0;
    color: var(--checkout-muted);
    font-size: 0.84rem;
    line-height: 1.48;
  }

  .checkout-subscription-payment-note {
    margin: 0;
    padding: 13px 15px;
    border: 1px solid var(--checkout-border);
    border-radius: 13px;
    background: #fff9f3;
    color: var(--checkout-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .checkout-subscription-payment-note strong {
    color: var(--checkout-ink);
  }

  .checkout-coupon {
    margin: 17px 0;
    padding: 16px;
    border: 1px solid var(--checkout-border);
    border-radius: 15px;
    background: linear-gradient(145deg, #fafaf6, var(--checkout-maroon-soft));
  }

  .checkout-coupon-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 11px;
  }

  .checkout-coupon-heading strong {
    color: var(--checkout-ink);
    font-size: 0.95rem;
  }

  .checkout-coupon-heading span {
    color: var(--checkout-muted);
    font-size: 0.72rem;
    text-align: right;
  }

  .checkout-coupon-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 9px;
  }

  .checkout-coupon-input {
    width: 100%;
    min-width: 0;
    min-height: 43px;
    padding: 10px 12px;
    border: 1px solid var(--checkout-border);
    border-radius: 10px;
    background: #ffffff;
    color: var(--checkout-ink);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    outline: none;
  }

  .checkout-coupon-input:focus {
    border-color: var(--checkout-maroon);
    box-shadow: 0 0 0 3px rgba(74, 18, 33, 0.16);
  }

  .checkout-coupon-message {
    margin: 10px 0 0;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.45;
  }

  .checkout-coupon-message.success {
    color: var(--checkout-maroon);
  }

  .checkout-coupon-message.error {
    color: #b42332;
  }

  .checkout-coupon-applied {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-top: 11px;
    padding: 11px 12px;
    border: 1px solid var(--checkout-border);
    border-radius: 11px;
    background: var(--checkout-maroon-soft);
    color: var(--checkout-maroon);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .checkout-coupon-applied strong {
    display: block;
    color: var(--checkout-maroon);
  }

  .checkout-summary-discount,
  .checkout-summary-discount strong {
    color: var(--checkout-maroon);
  }

  .checkout-summary {
    position: sticky;
    top: 96px;
    align-self: start;
  }

  .checkout-summary h2 {
    margin: 0 0 18px;
    color: var(--checkout-ink);
    font-size: 1.35rem;
    font-weight: 600;
  }

  .checkout-summary-line {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
    border-bottom: 1px solid var(--checkout-border);
    color: var(--checkout-muted);
  }

  .checkout-summary-line strong {
    color: var(--checkout-ink);
    flex: 0 0 auto;
  }

  .checkout-delivery-copy {
    display: grid;
    gap: 3px;
  }

  .checkout-delivery-note {
    color: var(--checkout-muted);
    font-size: 0.7rem;
    font-weight: 500;
    line-height: 1.35;
  }

  .checkout-delivery-note.error {
    color: #b42332;
  }

  .checkout-summary-grand {
    margin-bottom: 17px;
    padding: 17px 0;
    border-bottom: 0;
    color: var(--checkout-ink);
    font-size: 1.08rem;
    font-weight: 600;
  }

  .checkout-summary-grand strong {
    color: var(--checkout-maroon);
    font-size: 1.35rem;
  }

  .checkout-terms {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0 0 17px;
    padding: 14px;
    border: 1px solid var(--checkout-border);
    border-radius: 13px;
    background: #fffaf6;
    color: var(--checkout-muted);
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .checkout-alert,
  .checkout-loading,
  .checkout-empty {
    padding: 25px;
    border-radius: 18px;
  }

  .checkout-alert {
    margin-bottom: 20px;
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #9f1d2d;
    font-weight: 600;
  }

  .checkout-alert ul {
    margin: 9px 0 0;
    padding-left: 20px;
  }

  .checkout-loading,
  .checkout-empty {
    border: 1px solid var(--checkout-border);
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(74, 18, 33, 0.08);
    text-align: center;
  }

  .checkout-empty h2 {
    margin: 0 0 8px;
    color: var(--checkout-ink);
    font-weight: 600;
  }

  .checkout-empty p {
    margin: 0 0 18px;
    color: var(--checkout-muted);
  }

  @media (min-width: 1700px) {
    .react-checkout-page {
      --checkout-page-gutter: clamp(28px, 2.4vw, 48px);
    }
  }

  @media (max-width: 1439px) {
    .react-checkout-page {
      --checkout-page-gutter: clamp(18px, 2.3vw, 36px);
    }
  }

  @media (max-width: 900px) {
    .react-checkout-page {
      --checkout-page-gutter: 20px;
    }
  }

  @media (max-width: 700px) {
    .react-checkout-page {
      --checkout-page-gutter: 16px;
    }
  }



  @media (min-width: 1440px) {
    .react-checkout-page {
      padding: 34px var(--checkout-page-gutter) 72px;
    }

    .checkout-page-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
      gap: 38px;
    }

    .checkout-page-card {
      padding: 30px 32px;
    }
  }

  @media (min-width: 1101px) and (max-width: 1439px) {
    .react-checkout-page {
      padding: 28px var(--checkout-page-gutter) 58px;
    }

    .checkout-page-layout {
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 28px;
    }
  }

  @media (min-width: 851px) and (max-width: 1100px) {
    .react-checkout-page {
      padding: 24px var(--checkout-page-gutter) 48px;
    }

    .checkout-page-layout {
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 20px;
    }

    .checkout-page-card {
      padding: 22px;
    }

    .checkout-saved-grid {
      grid-template-columns: 1fr;
    }

    .checkout-summary {
      top: 84px;
    }
  }

  @media (max-width: 850px) {
    .react-checkout-page {
      padding: 22px var(--checkout-page-gutter) 44px;
    }

    .checkout-page-layout {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .checkout-summary {
      position: static;
    }

    .checkout-saved-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 650px) {
    .react-checkout-page {
      min-height: 100dvh;
      padding:
        12px
        max(var(--checkout-page-gutter), env(safe-area-inset-right))
        calc(104px + env(safe-area-inset-bottom))
        max(var(--checkout-page-gutter), env(safe-area-inset-left));
      background: #fbf7f0;
    }

    .react-checkout-page > form,
    .react-checkout-page > .checkout-alert,
    .react-checkout-page > .checkout-loading,
    .react-checkout-page > .checkout-empty {
      width: 100%;
      min-width: 0;
    }

    .checkout-page-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .checkout-page-main {
      gap: 12px;
    }

    .checkout-page-card {
      width: 100%;
      min-width: 0;
      padding: 16px;
      border-radius: 17px;
      box-shadow: 0 8px 24px rgba(74, 18, 33, 0.055);
    }

    .checkout-step-title {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      align-items: start;
      gap: 0 12px;
      margin-bottom: 17px;
    }

    .checkout-step-number {
      grid-column: 1;
      grid-row: 1 / span 2;
      width: 36px;
      height: 36px;
      border-radius: 11px;
      font-size: 0.94rem;
    }

    .checkout-step-copy {
      grid-column: 2;
      min-width: 0;
    }

    .checkout-step-copy h2 {
      font-size: 1.23rem;
      line-height: 1.12;
    }

    .checkout-step-copy p {
      margin-top: 4px;
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .checkout-manage-link {
      grid-column: 2;
      width: fit-content;
      margin: 8px 0 0;
      padding: 6px 10px;
      border: 1px solid var(--checkout-border);
      border-radius: 999px;
      background: #fffaf6;
      font-size: 0.76rem;
      line-height: 1;
      text-decoration: none;
    }

    .checkout-manage-link:hover {
      text-decoration: none;
    }

    .checkout-mode-option {
      min-height: 42px;
      gap: 10px;
      margin: 8px 0;
      font-size: 0.88rem;
      line-height: 1.25;
    }

    .checkout-mode-option input,
    .checkout-payment-option input,
    .checkout-checks input,
    .checkout-terms input,
    .checkout-saved-address input {
      width: 19px;
      height: 19px;
      flex: 0 0 19px;
    }

    .checkout-saved-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .checkout-saved-address {
      width: 100%;
      min-width: 0;
      gap: 10px;
      padding: 14px;
      border-radius: 14px;
    }

    .checkout-saved-address.selected {
      box-shadow: 0 0 0 2px rgba(216, 169, 73, 0.22);
    }

    .checkout-saved-copy {
      width: 100%;
      min-width: 0;
    }

    .checkout-address-top {
      align-items: center;
      gap: 8px;
    }

    .checkout-address-top strong {
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 0.92rem;
      line-height: 1.25;
    }

    .checkout-address-type {
      flex: 0 0 auto;
      padding: 4px 7px;
      font-size: 0.62rem;
    }

    .checkout-saved-copy p {
      margin-top: 5px;
      font-size: 0.79rem;
      line-height: 1.38;
      overflow-wrap: anywhere;
    }

    .checkout-gps-valid,
    .checkout-gps-missing {
      margin-top: 7px;
      font-size: 0.68rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .checkout-new-address {
      margin-top: 10px;
      padding-top: 14px;
    }

    .checkout-location-card {
      gap: 12px;
      margin-bottom: 8px;
      padding: 14px;
      border-radius: 14px;
    }

    .checkout-location-card strong {
      font-size: 0.9rem;
    }

    .checkout-location-card p {
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .checkout-location-card .checkout-button {
      width: 100%;
    }

    .checkout-location-status {
      min-height: 0;
      margin: 0 0 10px;
      font-size: 0.76rem;
      line-height: 1.35;
    }

    .checkout-address-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .checkout-field,
    .checkout-field-wide {
      grid-column: auto;
      gap: 6px;
      min-width: 0;
      font-size: 0.79rem;
    }

    .checkout-field input,
    .checkout-field select {
      min-height: 48px;
      padding: 11px 12px;
      border-radius: 11px;
      font-size: 16px;
    }

    .checkout-checks {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      margin-top: 14px;
    }

    .checkout-checks label {
      min-height: 38px;
      align-items: center;
      gap: 9px;
      font-size: 0.8rem;
      line-height: 1.3;
    }

    .checkout-payment-list {
      gap: 10px;
    }

    .checkout-payment-option {
      width: 100%;
      min-width: 0;
      min-height: 68px;
      gap: 11px;
      padding: 14px;
      border-radius: 14px;
    }

    .checkout-payment-option > div {
      min-width: 0;
    }

    .checkout-payment-option strong {
      display: block;
      font-size: 0.91rem;
      line-height: 1.25;
    }

    .checkout-payment-option p {
      margin-top: 5px;
      font-size: 0.77rem;
      line-height: 1.38;
    }

    .checkout-subscription-payment-note {
      padding: 12px;
      font-size: 0.76rem;
    }

    .checkout-summary {
      position: static;
      top: auto;
      align-self: stretch;
      padding: 16px;
    }

    .checkout-summary h2 {
      margin-bottom: 13px;
      font-size: 1.24rem;
    }

    .checkout-summary-line {
      min-width: 0;
      gap: 12px;
      padding: 10px 0;
      font-size: 0.86rem;
      line-height: 1.35;
    }

    .checkout-summary-line > span {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .checkout-summary-line strong {
      white-space: nowrap;
      font-size: 0.88rem;
    }

    .checkout-coupon {
      margin: 14px 0;
      padding: 13px;
      border-radius: 13px;
    }

    .checkout-coupon-heading {
      align-items: baseline;
      gap: 8px;
      margin-bottom: 9px;
    }

    .checkout-coupon-heading strong {
      font-size: 0.88rem;
    }

    .checkout-coupon-heading span {
      font-size: 0.66rem;
      line-height: 1.2;
    }

    .checkout-coupon-row {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .checkout-coupon-input {
      min-height: 46px;
      padding: 10px 11px;
      border-radius: 10px;
      font-size: 16px;
      letter-spacing: 0.02em;
    }

    .checkout-coupon-row .checkout-button {
      width: auto;
      min-width: 76px;
      min-height: 46px;
      padding-inline: 14px;
    }

    .checkout-coupon-message {
      margin-top: 8px;
      font-size: 0.72rem;
    }

    .checkout-coupon-applied {
      gap: 8px;
      margin-top: 9px;
      padding: 10px;
      font-size: 0.72rem;
    }

    .checkout-summary-grand {
      margin-bottom: 13px;
      padding: 14px 0 12px;
      font-size: 1rem;
    }

    .checkout-summary-grand strong {
      font-size: 1.22rem;
    }

    .checkout-terms {
      gap: 10px;
      margin-bottom: 13px;
      padding: 12px;
      border-radius: 12px;
      font-size: 0.72rem;
      line-height: 1.42;
    }

    .checkout-terms span {
      min-width: 0;
    }

    .checkout-button {
      min-height: 46px;
      border-radius: 11px;
      font-size: 0.83rem;
      -webkit-tap-highlight-color: transparent;
    }

    .checkout-button-full {
      min-height: 50px;
      padding: 12px 14px;
      font-size: 0.84rem;
      line-height: 1.25;
      text-align: center;
    }

    .checkout-alert,
    .checkout-loading,
    .checkout-empty {
      padding: 18px 15px;
      border-radius: 15px;
      font-size: 0.84rem;
      line-height: 1.4;
    }
  }

  @media (max-width: 420px) {
    .react-checkout-page {
      --checkout-page-gutter: 16px;
      padding-top: 10px;
    }

    .checkout-page-card,
    .checkout-summary {
      padding: 14px;
      border-radius: 15px;
    }

    .checkout-step-title {
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 0 10px;
      margin-bottom: 14px;
    }

    .checkout-step-number {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: 0.88rem;
    }

    .checkout-step-copy h2,
    .checkout-summary h2 {
      font-size: 1.16rem;
    }

    .checkout-step-copy p {
      font-size: 0.78rem;
    }

    .checkout-saved-address,
    .checkout-payment-option {
      padding: 12px;
    }

    .checkout-coupon-heading {
      display: block;
    }

    .checkout-coupon-heading span {
      display: block;
      margin-top: 3px;
      text-align: left;
    }
  }

  @media (max-width: 360px) {
    .react-checkout-page {
      --checkout-page-gutter: 16px;
    }

    .checkout-page-card,
    .checkout-summary {
      padding: 12px;
      border-radius: 14px;
    }

    .checkout-coupon-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .checkout-coupon-row .checkout-button {
      width: 100%;
    }

    .checkout-address-top {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .checkout-summary-line {
      gap: 8px;
      font-size: 0.82rem;
    }

    .checkout-summary-line strong {
      font-size: 0.84rem;
    }
  }
`;

type AddressMode = "existing" | "new";
type PaymentMethod =
  | "razorpay"
  | "cash_on_delivery";

type CouponAwareCheckoutPayload = CheckoutPayload & {
  coupon_enabled?: boolean;
  coupon_api_url?: string;
  active_coupon_count?: number;
};

type CheckoutTotalsWithDiscount =
  CheckoutPayload["totals"] & {
    discount?: number;
    delivery_distance_km?: number | null;
    delivery_base_fee?: number;
    delivery_distance_fee?: number;
    delivery_extra_distance_km?: number;
    delivery_charged_extra_km?: number;
    delivery_base_radius_km?: number;
    delivery_small_order_limit?: number;
    delivery_small_order_base_fee?: number;
    delivery_extra_per_km?: number;
  };

type AppliedCoupon = {
  id?: string;
  code: string;
  description?: string;
  discount_type?: "percentage" | "fixed" | string;
  discount_value?: number;
  discount_amount: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  applicable_to?: string;
  valid_from?: string;
  valid_until?: string;
};

type CouponApiResponse = {
  success: boolean;
  message: string;
  code?: string;
  mode?: string;
  coupon: AppliedCoupon | null;
  totals: CheckoutTotalsWithDiscount;
  csrf_token: string;
};

type DeliveryQuoteResponse = {
  success: boolean;
  mode?: string;
  coupon?: AppliedCoupon | null;
  totals: CheckoutTotalsWithDiscount;
  delivery_distance_km?: number | null;
  assigned_seller_count?: number;
  csrf_token?: string;
};

type CheckoutOrderRequest = {
  mode: string;
  address_mode: AddressMode;
  address_id?: string;
  payment_method: PaymentMethod;
  accept_fulfillment_terms: boolean;
  save_address?: boolean;
  recipient_name?: string;
  phone?: string;
  alternate_phone?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  address_type?: string;
  latitude?: string;
  longitude?: string;
  is_default?: boolean;
  coupon_code: string;
};

type CheckoutOrderResponse = {
  success: boolean;
  message?: string;
  order: {
    id: string;
    total?: number;
    discount?: number;
    coupon_code?: string;
  };
  payment_required: boolean;
  payment_api_url?: string;
  order_api_url?: string;
  csrf_token?: string;
};

type PendingOrderCouponResponse = {
  success: boolean;
  message?: string;
  coupon: AppliedCoupon | null;
  totals: CheckoutTotalsWithDiscount;
  payment_api_url?: string;
  csrf_token?: string;
};

type CheckoutErrorPayload = {
  success?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  login_url?: string;
  errors?: unknown[];
};

class CheckoutOrderRequestError extends Error {
  status: number;
  code: string;
  csrfToken: string;
  loginUrl: string;
  errors: string[];

  constructor(
    status: number,
    payload: CheckoutErrorPayload,
  ) {
    super(
      String(
        payload.message ||
          "Unable to place this order.",
      ),
    );
    this.name = "CheckoutOrderRequestError";
    this.status = status;
    this.code = String(payload.code || "");
    this.csrfToken = String(
      payload.csrf_token || "",
    );
    this.loginUrl = String(
      payload.login_url || "",
    );
    this.errors = Array.isArray(payload.errors)
      ? payload.errors.map(String)
      : [];
  }
}

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type PaymentVerificationResponse = {
  success: boolean;
  message?: string;
  email_confirmation?: {
    status?: string;
    recipient?: string;
  };
  order_api_url?: string;
  csrf_token?: string;
};

type RazorpayPaymentConfiguration = {
  success: boolean;
  order: {
    id: string;
    order_number?: string;
  };
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
  csrf_token: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (
    response: RazorpaySuccessResponse,
  ) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (
      response: RazorpayFailureResponse,
    ) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayCheckoutOptions,
    ) => RazorpayInstance;
  }
}

class RazorpayPaymentDismissedError extends Error {
  constructor() {
    super("Razorpay payment was closed before completion.");
    this.name = "RazorpayPaymentDismissedError";
  }
}

function money(
  symbol: string,
  value: number | undefined,
): string {
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

function hasCoordinates(
  address: SavedAddress,
): boolean {
  return (
    address.latitude !== null &&
    address.latitude !== undefined &&
    address.longitude !== null &&
    address.longitude !== undefined
  );
}

/**
 * Detect subscription checkout items without forcing a change to the shared
 * CheckoutPayload type. This supports the common subscription fields used by
 * commerce APIs while keeping normal one-time orders unaffected.
 */
function isSubscriptionCheckoutItem(
  item: unknown,
): boolean {
  if (!item || typeof item !== "object") {
    return false;
  }

  const value = item as Record<string, unknown>;

  if (
    value.is_subscription === true ||
    value.subscription === true
  ) {
    return true;
  }

  const textFields = [
    value.purchase_type,
    value.item_type,
    value.order_type,
    value.product_type,
    value.fulfillment_type,
    value.plan_type,
    value.subscription_type,
  ];

  if (
    textFields.some((field) =>
      String(field || "")
        .trim()
        .toLowerCase()
        .includes("subscription"),
    )
  ) {
    return true;
  }

  const subscriptionIdentifiers = [
    value.subscription_id,
    value.subscription_plan_id,
    value.plan_id,
    value.subscription_plan,
    value.subscription_frequency,
    value.subscription_duration,
  ];

  return subscriptionIdentifiers.some(
    (field) =>
      field !== undefined &&
      field !== null &&
      String(field).trim() !== "",
  );
}

function validateNewAddress(
  address: AddressFormValues,
): string[] {
  const errors: string[] = [];

  if (address.recipient_name.trim().length < 2) {
    errors.push(
      "Enter the recipient's full name.",
    );
  }

  if (address.phone.trim().length < 8) {
    errors.push(
      "Enter a valid contact number.",
    );
  }

  if (!address.address_line1.trim()) {
    errors.push(
      "House, flat, building, or street is required.",
    );
  }

  if (!address.city.trim()) {
    errors.push("City is required.");
  }

  if (!address.state.trim()) {
    errors.push("State is required.");
  }

  if (address.postal_code.trim().length < 4) {
    errors.push(
      "Enter a valid postal code.",
    );
  }

  // GPS is optional; fulfilment is checked against the saved area/pincode.
  if (address.latitude.trim() || address.longitude.trim()) {
    const latitude = Number(address.latitude);
    const longitude = Number(address.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push("Enter valid coordinates or leave both GPS fields empty.");
    }
  }

  return errors;
}

function getBrowserPosition(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise(
    (resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        options,
      );
    },
  );
}

async function captureBrowserLocation(): Promise<GeolocationPosition> {
  try {
    return await getBrowserPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  } catch {
    return getBrowserPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 60000,
    });
  }
}

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.querySelector<HTMLScriptElement>(
          `script[src="${RAZORPAY_SCRIPT_URL}"]`,
        );

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
                "Unable to load Razorpay Checkout.",
              ),
            ),
          { once: true },
        );
        return;
      }

      const script =
        document.createElement("script");
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error(
            "Unable to load Razorpay Checkout.",
          ),
        );
      document.head.appendChild(script);
    },
  );

  return razorpayScriptPromise;
}

async function parseJsonResponse<T>(
  response: Response,
): Promise<T> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload
        ? String(
            (payload as { message?: unknown })
              .message ||
              "Payment request failed.",
          )
        : "Payment request failed.";

    throw new Error(message);
  }

  return payload as T;
}

class CouponRequestError extends Error {
  payload: Partial<CouponApiResponse>;

  constructor(
    message: string,
    payload: Partial<CouponApiResponse> = {},
  ) {
    super(message);
    this.name = "CouponRequestError";
    this.payload = payload;
  }
}

async function updateCheckoutCoupon(
  couponApiUrl: string,
  mode: string,
  couponCode: string,
  csrfToken: string,
): Promise<CouponApiResponse> {
  const body = new URLSearchParams({
    mode,
    coupon_code: couponCode,
    csrf_token: csrfToken,
  });

  const response = await fetch(
    couponApiUrl || "/react/api/commerce/checkout/coupon",
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
        "X-CSRF-Token": csrfToken,
      },
      body: body.toString(),
    },
  );

  let payload: Partial<CouponApiResponse> = {};

  try {
    payload =
      (await response.json()) as Partial<CouponApiResponse>;
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    throw new CouponRequestError(
      String(
        payload.message ||
          "Unable to apply this coupon.",
      ),
      payload,
    );
  }

  if (!payload.totals) {
    throw new CouponRequestError(
      "The coupon response does not contain updated totals.",
      payload,
    );
  }

  return payload as CouponApiResponse;
}

function checkoutFormBody(
  values: Record<string, unknown>,
  csrfToken: string,
): URLSearchParams {
  const body = new URLSearchParams();

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (typeof value === "boolean") {
        body.set(key, value ? "true" : "false");
        return;
      }

      body.set(key, String(value));
    },
  );

  body.set("csrf_token", csrfToken);
  return body;
}

async function checkoutPost<T>(
  url: string,
  values: Record<string, unknown>,
  csrfToken: string,
): Promise<T> {
  const body = checkoutFormBody(
    values,
    csrfToken,
  );

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type":
        "application/x-www-form-urlencoded;charset=UTF-8",
      "X-CSRF-Token": csrfToken,
    },
    body: body.toString(),
  });

  let payload: CheckoutErrorPayload = {};

  try {
    payload =
      (await response.json()) as CheckoutErrorPayload;
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    throw new CheckoutOrderRequestError(
      response.status,
      payload,
    );
  }

  return payload as unknown as T;
}

async function requestDeliveryQuote(
  values: Record<string, unknown>,
  csrfToken: string,
): Promise<DeliveryQuoteResponse> {
  return checkoutPost<DeliveryQuoteResponse>(
    "/react/api/commerce/checkout/delivery-quote",
    values,
    csrfToken,
  );
}

async function submitCheckoutOrder(
  order: CheckoutOrderRequest,
  csrfToken: string,
): Promise<CheckoutOrderResponse> {
  return checkoutPost<CheckoutOrderResponse>(
    "/react/api/commerce/checkout/place-order",
    order as unknown as Record<string, unknown>,
    csrfToken,
  );
}

async function applyCouponToPendingOrder(
  orderId: string,
  couponCode: string,
  csrfToken: string,
): Promise<PendingOrderCouponResponse> {
  return checkoutPost<PendingOrderCouponResponse>(
    `/react/api/commerce/orders/${encodeURIComponent(
      orderId,
    )}/coupon`,
    {
      coupon_code: couponCode,
    },
    csrfToken,
  );
}

async function getRazorpayConfiguration(
  paymentApiUrl: string,
): Promise<RazorpayPaymentConfiguration> {
  const response = await fetch(
    paymentApiUrl,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const payload =
    await parseJsonResponse<RazorpayPaymentConfiguration>(
      response,
    );

  if (
    !payload.razorpay?.key_id ||
    !payload.razorpay?.order_id ||
    Number(payload.razorpay?.amount || 0) <= 0
  ) {
    throw new Error(
      "Razorpay payment information is incomplete.",
    );
  }

  return payload;
}

function openRazorpayCheckout(
  configuration: RazorpayPaymentConfiguration,
): Promise<RazorpaySuccessResponse> {
  return new Promise(
    (resolve, reject) => {
      if (!window.Razorpay) {
        reject(
          new Error(
            "Razorpay Checkout is unavailable.",
          ),
        );
        return;
      }

      let completed = false;

      const instance = new window.Razorpay({
        key: configuration.razorpay.key_id,
        amount: Number(
          configuration.razorpay.amount,
        ),
        currency:
          configuration.razorpay.currency ||
          "INR",
        name:
          configuration.razorpay.name ||
          "EasyFindStore",
        description:
          configuration.razorpay.description ||
          "Order payment",
        order_id:
          configuration.razorpay.order_id,
        prefill:
          configuration.razorpay.prefill,
        theme: {
          color: "#55111f",
        },
        handler: (response) => {
          completed = true;
          resolve(response);
        },
        modal: {
          escape: true,
          backdropclose: false,
          ondismiss: () => {
            if (!completed) {
              reject(
                new RazorpayPaymentDismissedError(),
              );
            }
          },
        },
      });

      instance.on(
        "payment.failed",
        (response) => {
          const message =
            response.error?.description ||
            response.error?.reason ||
            "Razorpay payment failed.";

          reject(new Error(message));
        },
      );

      instance.open();
    },
  );
}

async function verifyRazorpayPayment(
  orderId: string,
  payment: RazorpaySuccessResponse,
  csrfToken: string,
): Promise<PaymentVerificationResponse> {
  const body = new URLSearchParams({
    csrf_token: csrfToken,
    razorpay_payment_id:
      payment.razorpay_payment_id,
    razorpay_order_id:
      payment.razorpay_order_id,
    razorpay_signature:
      payment.razorpay_signature,
  });

  const response = await fetch(
    `/react/api/commerce/orders/${encodeURIComponent(
      orderId,
    )}/razorpay/verify`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
        "X-CSRF-Token": csrfToken,
      },
      body: body.toString(),
    },
  );

  return parseJsonResponse<PaymentVerificationResponse>(
    response,
  );
}

async function recordRazorpayFailure(
  orderId: string,
  reason: string,
  csrfToken: string,
): Promise<void> {
  const body = new URLSearchParams({
    csrf_token: csrfToken,
    reason,
  });

  try {
    await fetch(
      `/react/api/commerce/orders/${encodeURIComponent(
        orderId,
      )}/razorpay/failed`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRF-Token": csrfToken,
        },
        body: body.toString(),
      },
    );
  } catch {
    // Failure recording must not hide the original payment result.
  }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const requestedMode =
    searchParams.get("mode") === "buy_now"
      ? "buy_now"
      : "cart";

  const [checkout, setCheckout] =
    useState<CouponAwareCheckoutPayload | null>(null);

  const [addressMode, setAddressMode] =
    useState<AddressMode>("existing");

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState("");

  const [newAddress, setNewAddress] =
    useState<AddressFormValues>(
      EMPTY_ADDRESS,
    );

  const [saveAddress, setSaveAddress] =
    useState(true);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("razorpay");

  const [couponCode, setCouponCode] =
    useState("");

  const [appliedCoupon, setAppliedCoupon] =
    useState<AppliedCoupon | null>(null);

  const [couponTotals, setCouponTotals] =
    useState<CheckoutTotalsWithDiscount | null>(null);

  const [
    deliveryQuoteTotals,
    setDeliveryQuoteTotals,
  ] = useState<CheckoutTotalsWithDiscount | null>(null);

  const [
    deliveryQuoteLoading,
    setDeliveryQuoteLoading,
  ] = useState(false);

  const [
    deliveryQuoteMessage,
    setDeliveryQuoteMessage,
  ] = useState("");

  const [applyingCoupon, setApplyingCoupon] =
    useState(false);

  const [couponMessage, setCouponMessage] =
    useState("");

  const [couponMessageType, setCouponMessageType] =
    useState<"" | "success" | "error">("");

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [capturingLocation, setCapturingLocation] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [validationErrors, setValidationErrors] =
    useState<string[]>([]);

  const [locationStatus, setLocationStatus] =
    useState("");

  const [
    locationStatusType,
    setLocationStatusType,
  ] = useState<
    "" | "success" | "error"
  >("");

  const csrfTokenRef = useRef("");

  const hasSubscriptionItems = useMemo(
    () =>
      Boolean(
        checkout?.items.some(
          isSubscriptionCheckoutItem,
        ),
      ),
    [checkout?.items],
  );

  const handleApiError = useCallback(
    (error: unknown) => {
      if (
        error instanceof ApiRequestError ||
        error instanceof CheckoutOrderRequestError
      ) {
        if (
          error.status === 401 ||
          error.code === "AUTH_REQUIRED"
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

        if (
          error.code === "CHECKOUT_EMPTY"
        ) {
          navigate("/store/cart", {
            replace: true,
          });
          return;
        }

        if (error.csrfToken) {
          csrfTokenRef.current =
            error.csrfToken;
        }

        if (error.errors.length) {
          setValidationErrors(
            error.errors,
          );
        }

        setPageError(error.message);
        return;
      }

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to complete checkout.",
      );
    },
    [
      location.pathname,
      location.search,
      navigate,
    ],
  );

  const applyCheckout = useCallback(
    (payload: CouponAwareCheckoutPayload) => {
      setCheckout(payload);
      setDeliveryQuoteTotals(null);
      setDeliveryQuoteMessage("");
      csrfTokenRef.current =
        payload.csrf_token;

      const preferredAddress =
        payload.addresses.find(
          (address) =>
            address.is_default &&
            hasCoordinates(address),
        ) ||
        payload.addresses.find(
          hasCoordinates,
        ) ||
        payload.addresses[0];

      if (preferredAddress) {
        setSelectedAddressId(
          preferredAddress.id,
        );
        setAddressMode("existing");
      } else {
        setAddressMode("new");
      }

      setNewAddress((current) => ({
        ...current,
        recipient_name:
          current.recipient_name ||
          payload.user.full_name ||
          "",
      }));

      const payloadHasSubscription =
        payload.items.some(
          isSubscriptionCheckoutItem,
        );

      // Subscription orders must always use online payment.
      if (payloadHasSubscription) {
        setPaymentMethod("razorpay");
      } else if (
        payload.razorpay_payment_enabled
      ) {
        setPaymentMethod("razorpay");
      } else if (
        payload.cash_on_delivery_enabled
      ) {
        setPaymentMethod(
          "cash_on_delivery",
        );
      }
    },
    [],
  );

  const loadCheckout = useCallback(
    async () => {
      setLoading(true);
      setPageError("");
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponTotals(null);
      setDeliveryQuoteTotals(null);
      setDeliveryQuoteMessage("");
      setCouponMessage("");
      setCouponMessageType("");

      try {
        const payload =
          await getCheckout(
            requestedMode,
          );

        applyCheckout(payload);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    },
    [
      applyCheckout,
      handleApiError,
      requestedMode,
    ],
  );

  useEffect(() => {
    console.info("[CheckoutPage] coupon UI version 4 loaded");

    const timer = window.setTimeout(() => {
      void loadCheckout();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCheckout]);

  useEffect(() => {
    if (
      hasSubscriptionItems &&
      paymentMethod !== "razorpay"
    ) {
      setPaymentMethod("razorpay");
    }
  }, [
    hasSubscriptionItems,
    paymentMethod,
  ]);

  const selectedAddress = useMemo(
    () =>
      checkout?.addresses.find(
        (address) =>
          address.id ===
          selectedAddressId,
      ) || null,
    [
      checkout?.addresses,
      selectedAddressId,
    ],
  );

  useEffect(() => {
    if (!checkout) {
      return;
    }

    const csrfToken = csrfTokenRef.current;
    if (!csrfToken) {
      return;
    }

    let quoteValues: Record<string, unknown> | null = null;

    if (
      addressMode === "existing" &&
      selectedAddress
    ) {
      quoteValues = {
        mode: checkout.mode,
        address_mode: "existing",
        address_id: selectedAddress.id,
        coupon_code: appliedCoupon?.code || "",
      };
    } else if (addressMode === "new" && newAddress.postal_code.trim().length >= 4) {
      quoteValues = {
        mode: checkout.mode,
        address_mode: "new",
        postal_code: newAddress.postal_code,
        city: newAddress.city,
        state: newAddress.state,
        latitude: newAddress.latitude || undefined,
        longitude: newAddress.longitude || undefined,
        coupon_code: appliedCoupon?.code || "",
      };
    }

    if (!quoteValues) {
      setDeliveryQuoteTotals(null);
      setDeliveryQuoteLoading(false);
      setDeliveryQuoteMessage(
        addressMode === "new"
          ? "Enter the delivery pincode to calculate the applicable delivery charge."
          : "",
      );
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setDeliveryQuoteLoading(true);
      setDeliveryQuoteMessage("");

      void requestDeliveryQuote(
        quoteValues as Record<string, unknown>,
        csrfToken,
      )
        .then((result) => {
          if (cancelled) {
            return;
          }

          if (result.csrf_token) {
            csrfTokenRef.current = result.csrf_token;
          }

          setDeliveryQuoteTotals(result.totals);
          setDeliveryQuoteMessage("");
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setDeliveryQuoteTotals(null);
          setDeliveryQuoteMessage(
            error instanceof Error
              ? error.message
              : "Unable to calculate the delivery charge for this address.",
          );
        })
        .finally(() => {
          if (!cancelled) {
            setDeliveryQuoteLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    addressMode,
    appliedCoupon?.code,
    checkout,
    couponTotals,
    newAddress.latitude,
    newAddress.longitude,
    newAddress.postal_code,
    newAddress.city,
    newAddress.state,
    selectedAddress,
  ]);

  function updateNewAddress(
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>,
  ) {
    const { name } = event.target;

    const value =
      event.target instanceof
        HTMLInputElement &&
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setNewAddress((current) => ({
      ...current,
      [name]: value,
    }));

    setValidationErrors([]);
    setPageError("");
  }

  async function captureLocation() {
    if (!navigator.geolocation) {
      setLocationStatus(
        "Location is not supported by this browser.",
      );
      setLocationStatusType("error");
      return;
    }

    const secureContext =
      window.location.protocol ===
        "https:" ||
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1";

    if (!secureContext) {
      setLocationStatus(
        "Location access requires HTTPS or localhost.",
      );
      setLocationStatusType("error");
      return;
    }

    setCapturingLocation(true);
    setLocationStatus(
      "Getting current location…",
    );
    setLocationStatusType("");

    try {
      const position =
        await captureBrowserLocation();

      setNewAddress((current) => ({
        ...current,
        latitude:
          position.coords.latitude.toFixed(
            7,
          ),
        longitude:
          position.coords.longitude.toFixed(
            7,
          ),
      }));

      setLocationStatus(
        `Location captured with approximately ${Math.round(
          position.coords.accuracy || 0,
        )} metre accuracy.`,
      );
      setLocationStatusType("success");
    } catch {
      setLocationStatus(
        "Unable to capture location. Enter coordinates manually.",
      );
      setLocationStatusType("error");
    } finally {
      setCapturingLocation(false);
    }
  }

  async function handleCouponAction(
    removeCoupon = false,
  ) {
    if (!checkout || applyingCoupon || placingOrder) {
      return;
    }

    const requestedCode = removeCoupon
      ? ""
      : couponCode.trim().toUpperCase();

    if (!removeCoupon && !requestedCode) {
      setCouponMessage("Enter a coupon code.");
      setCouponMessageType("error");
      return;
    }

    setApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");
    setPageError("");

    try {
      let csrfToken = csrfTokenRef.current;

      if (!csrfToken) {
        const fresh = await getCheckout(requestedMode);
        applyCheckout(fresh);
        csrfToken = fresh.csrf_token;
      }

      let result: CouponApiResponse;

      try {
        result = await updateCheckoutCoupon(
          checkout.coupon_api_url ||
            "/react/api/commerce/checkout/coupon",
          checkout.mode,
          requestedCode,
          csrfToken,
        );
      } catch (error) {
        if (
          error instanceof CouponRequestError &&
          error.payload.code === "CSRF_FAILED"
        ) {
          const fresh = await getCheckout(requestedMode);
          applyCheckout(fresh);
          csrfTokenRef.current = fresh.csrf_token;

          result = await updateCheckoutCoupon(
            checkout.coupon_api_url ||
              "/react/api/commerce/checkout/coupon",
            checkout.mode,
            requestedCode,
            fresh.csrf_token,
          );
        } else {
          throw error;
        }
      }

      if (result.csrf_token) {
        csrfTokenRef.current = result.csrf_token;
      }

      setCouponTotals(result.totals);
      setDeliveryQuoteTotals(null);
      setAppliedCoupon(result.coupon);
      setCouponCode(result.coupon?.code || "");
      setCouponMessage(
        result.message ||
          (removeCoupon
            ? "Coupon removed."
            : "Coupon applied successfully."),
      );
      setCouponMessageType("success");
    } catch (error) {
      if (error instanceof CouponRequestError) {
        if (error.payload.csrf_token) {
          csrfTokenRef.current =
            error.payload.csrf_token;
        }

        if (error.payload.totals) {
          setCouponTotals(error.payload.totals);
        }

        setDeliveryQuoteTotals(null);
        setAppliedCoupon(null);
        setCouponMessage(error.message);
        setCouponMessageType("error");
      } else {
        setCouponMessage(
          error instanceof Error
            ? error.message
            : "Unable to apply this coupon.",
        );
        setCouponMessageType("error");
      }
    } finally {
      setApplyingCoupon(false);
    }
  }

  function validateCheckout(): string[] {
    const errors: string[] = [];

    if (
      addressMode === "existing"
    ) {
      if (!selectedAddress) {
        errors.push(
          "Select a saved delivery address.",
        );
      }
    } else {
      errors.push(
        ...validateNewAddress(
          newAddress,
        ),
      );
    }

    if (!acceptedTerms) {
      errors.push(
        "Accept the stock, delivery, and payment terms.",
      );
    }

    if (
      hasSubscriptionItems &&
      paymentMethod === "cash_on_delivery"
    ) {
      errors.push(
        "Cash on Delivery is not available for subscription orders. Please pay online with Razorpay.",
      );
    }

    if (
      paymentMethod === "razorpay" &&
      !checkout
        ?.razorpay_payment_enabled
    ) {
      errors.push(
        hasSubscriptionItems
          ? "Online payment is required for subscription orders, but Razorpay is currently unavailable."
          : "Razorpay is currently unavailable.",
      );
    }

    if (
      paymentMethod ===
        "cash_on_delivery" &&
      !checkout
        ?.cash_on_delivery_enabled
    ) {
      errors.push(
        "Cash on Delivery is currently unavailable.",
      );
    }

    return errors;
  }

  async function submitWithCsrf(
    csrfToken: string,
  ) {
    if (!checkout) {
      throw new Error(
        "Checkout data is unavailable.",
      );
    }

    // Final client-side safety: subscription orders can never be submitted as COD.
    const effectivePaymentMethod: PaymentMethod =
      hasSubscriptionItems
        ? "razorpay"
        : paymentMethod;

    if (
      hasSubscriptionItems &&
      !checkout.razorpay_payment_enabled
    ) {
      throw new Error(
        "Online payment is required for subscription orders, but Razorpay is currently unavailable.",
      );
    }

    const orderPayload: CheckoutOrderRequest = {
      mode: checkout.mode,
      address_mode: addressMode,
      address_id:
        addressMode === "existing"
          ? selectedAddressId
          : undefined,
      payment_method:
        effectivePaymentMethod,
      accept_fulfillment_terms:
        acceptedTerms,
      save_address:
        addressMode === "new"
          ? saveAddress
          : undefined,
      ...(addressMode === "new"
        ? {
            recipient_name:
              newAddress.recipient_name,
            phone:
              newAddress.phone,
            alternate_phone:
              newAddress.alternate_phone,
            address_line1:
              newAddress.address_line1,
            address_line2:
              newAddress.address_line2,
            landmark:
              newAddress.landmark,
            city: newAddress.city,
            state: newAddress.state,
            postal_code:
              newAddress.postal_code,
            country:
              newAddress.country,
            address_type:
              newAddress.address_type,
            latitude:
              newAddress.latitude,
            longitude:
              newAddress.longitude,
            is_default:
              newAddress.is_default,
          }
        : {}),
      coupon_code: appliedCoupon?.code || "",
    };

    return submitCheckoutOrder(
      orderPayload,
      csrfToken,
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const errors =
      validateCheckout();

    if (errors.length) {
      setValidationErrors(errors);
      setPageError(
        "Correct the checkout details.",
      );
      return;
    }

    setPlacingOrder(true);
    setPageError("");
    setValidationErrors([]);

    try {
      let csrfToken =
        csrfTokenRef.current;

      if (!csrfToken) {
        const fresh =
          await getCheckout(
            requestedMode,
          );

        applyCheckout(fresh);
        csrfToken =
          fresh.csrf_token;
      }

      let result;

      try {
        result =
          await submitWithCsrf(
            csrfToken,
          );
      } catch (error) {
        if (
          (error instanceof ApiRequestError ||
            error instanceof CheckoutOrderRequestError) &&
          error.code === "CSRF_FAILED"
        ) {
          const fresh =
            await getCheckout(
              requestedMode,
            );

          csrfTokenRef.current =
            fresh.csrf_token;

          result =
            await submitWithCsrf(
              fresh.csrf_token,
            );
        } else {
          throw error;
        }
      }

      window.dispatchEvent(
        new Event("cart-updated"),
      );

      if (
        result.payment_required
      ) {
        const orderId = String(
          result.order.id,
        );

        let paymentApiUrl =
          result.payment_api_url ||
          `/react/api/commerce/orders/${encodeURIComponent(
            orderId,
          )}/payment`;

        let paymentCsrfToken =
          result.csrf_token ||
          csrfTokenRef.current ||
          csrfToken;

        let expectedPaymentTotal = Number(
          (
            couponTotals ||
            checkout.totals
          ).total || 0,
        );

        const placedOrderTotal = Number(
          result.order.total,
        );

        const placedWithoutDisplayedDiscount =
          Boolean(appliedCoupon?.code) &&
          (
            !Number.isFinite(placedOrderTotal) ||
            Math.abs(
              placedOrderTotal -
                expectedPaymentTotal,
            ) > 0.009
          );

        if (placedWithoutDisplayedDiscount) {
          if (!paymentCsrfToken) {
            throw new Error(
              "The payment security token is missing. Refresh and try again.",
            );
          }

          const repriced =
            await applyCouponToPendingOrder(
              orderId,
              appliedCoupon?.code || "",
              paymentCsrfToken,
            );

          if (repriced.csrf_token) {
            csrfTokenRef.current =
              repriced.csrf_token;
            paymentCsrfToken =
              repriced.csrf_token;
          }

          if (repriced.payment_api_url) {
            paymentApiUrl =
              repriced.payment_api_url;
          }

          if (repriced.totals) {
            setCouponTotals(repriced.totals);
            expectedPaymentTotal = Number(
              repriced.totals.total || 0,
            );
          }

          if (repriced.coupon) {
            setAppliedCoupon(repriced.coupon);
          }
        } else if (
          Number.isFinite(placedOrderTotal)
        ) {
          expectedPaymentTotal =
            placedOrderTotal;
        }

        await loadRazorpayScript();

        const paymentConfiguration =
          await getRazorpayConfiguration(
            paymentApiUrl,
          );

        paymentCsrfToken =
          paymentConfiguration.csrf_token ||
          paymentCsrfToken ||
          csrfTokenRef.current;

        if (!paymentCsrfToken) {
          throw new Error(
            "The payment security token is missing. Refresh and try again.",
          );
        }

        const razorpayAmountSubunits =
          Math.round(
            Number(
              paymentConfiguration.razorpay.amount ||
                0,
            ),
          );

        const expectedAmountSubunits =
          Math.round(
            expectedPaymentTotal * 100,
          );

        if (
          Boolean(appliedCoupon?.code) &&
          razorpayAmountSubunits !==
            expectedAmountSubunits
        ) {
          throw new Error(
            `Payment amount mismatch. Coupon total is ${money(
              checkout.currency_symbol,
              expectedPaymentTotal,
            )}, but Razorpay received ${money(
              checkout.currency_symbol,
              razorpayAmountSubunits / 100,
            )}. Payment was stopped; please retry.`,
          );
        }

        try {
          const razorpayResponse =
            await openRazorpayCheckout(
              paymentConfiguration,
            );

          const verification =
            await verifyRazorpayPayment(
              orderId,
              razorpayResponse,
              paymentCsrfToken,
            );

          const successQuery =
            new URLSearchParams({
              payment: "success",
            });

          if (
            verification.email_confirmation
              ?.status
          ) {
            successQuery.set(
              "email",
              verification.email_confirmation
                .status,
            );
          }

          navigate(
            `/orders/${encodeURIComponent(
              orderId,
            )}?${successQuery.toString()}`,
            {
              replace: true,
              state: {
                paymentMessage:
                  verification.message ||
                  "Payment verified successfully.",
                emailConfirmation:
                  verification.email_confirmation ||
                  null,
              },
            },
          );
          return;
        } catch (paymentError) {
          const reason =
            paymentError instanceof Error
              ? paymentError.message
              : "Razorpay payment was not completed.";

          await recordRazorpayFailure(
            orderId,
            reason,
            paymentCsrfToken,
          );

          if (
            paymentError instanceof
              RazorpayPaymentDismissedError
          ) {
            navigate(
              `/orders/${encodeURIComponent(
                orderId,
              )}`,
              {
                replace: true,
              },
            );
            return;
          }

          throw paymentError;
        }
      }

      navigate(
        `/orders/${encodeURIComponent(
          result.order.id,
        )}`,
        {
          replace: true,
        },
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <>
        <style>
          {CHECKOUT_PAGE_STYLES}
        </style>

        <main className="react-checkout-page">
          <section className="checkout-loading">
            Loading checkout…
          </section>
        </main>
      </>
    );
  }

  if (!checkout) {
    return (
      <>
        <style>
          {CHECKOUT_PAGE_STYLES}
        </style>

        <main className="react-checkout-page">
          <section className="checkout-empty">
            <h2>
              Checkout is unavailable
            </h2>

            <p>
              Return to your cart and try
              again.
            </p>

            <Link
              className="checkout-button checkout-button-primary"
              to="/cart"
            >
              Return to Cart
            </Link>
          </section>
        </main>
      </>
    );
  }

  const displayTotals = (
    deliveryQuoteTotals ||
    couponTotals ||
    checkout.totals
  ) as CheckoutTotalsWithDiscount;

  return (
    <>
      <style>{CHECKOUT_PAGE_STYLES}</style>

      <main className="react-checkout-page">
        {pageError ? (
          <section
            className="checkout-alert"
            role="alert"
          >
            {pageError}

            {validationErrors.length ? (
              <ul>
                {validationErrors.map(
                  (error) => (
                    <li key={error}>
                      {error}
                    </li>
                  ),
                )}
              </ul>
            ) : null}
          </section>
        ) : null}

        <form
          onSubmit={(event) =>
            void handleSubmit(event)
          }
        >
          <div className="checkout-page-layout">
            <div className="checkout-page-main">
              <section className="checkout-page-card">
                <div className="checkout-step-title">
                  <span className="checkout-step-number">
                    1
                  </span>

                  <div className="checkout-step-copy">
                    <h2>
                      Delivery Address
                    </h2>

                    <p>
                      Choose a saved address or enter a complete
                      delivery address and pincode.
                    </p>
                  </div>

                  <Link
                    className="checkout-manage-link"
                    to="/addresses"
                  >
                    Manage Addresses
                  </Link>
                </div>

                {checkout.addresses.length ? (
                  <>
                    <label className="checkout-mode-option">
                      <input
                        type="radio"
                        name="address_mode"
                        value="existing"
                        checked={
                          addressMode ===
                          "existing"
                        }
                        onChange={() =>
                          setAddressMode(
                            "existing",
                          )
                        }
                      />

                      Use a saved address
                    </label>

                    {addressMode ===
                    "existing" ? (
                      <div className="checkout-saved-grid">
                        {checkout.addresses.map(
                          (address) => {
                            const selected =
                              selectedAddressId ===
                              address.id;

                            return (
                              <label
                                className={[
                                  "checkout-saved-address",
                                  selected
                                    ? "selected"
                                    : "",
                                ]
                                  .filter(
                                    Boolean,
                                  )
                                  .join(" ")}
                                key={
                                  address.id
                                }
                              >
                                <input
                                  type="radio"
                                  name="address_id"
                                  value={
                                    address.id
                                  }
                                  checked={
                                    selected
                                  }
                                  onChange={() =>
                                    setSelectedAddressId(
                                      address.id,
                                    )
                                  }
                                />

                                <div className="checkout-saved-copy">
                                  <div className="checkout-address-top">
                                    <strong>
                                      {
                                        address.recipient_name
                                      }
                                    </strong>

                                    <span className="checkout-address-type">
                                      {
                                        address.address_type
                                      }
                                    </span>
                                  </div>

                                  <p>
                                    {
                                      address.address_line1
                                    }

                                    {address.address_line2
                                      ? `, ${address.address_line2}`
                                      : ""}
                                  </p>

                                  {address.landmark ? (
                                    <p>
                                      Landmark:{" "}
                                      {
                                        address.landmark
                                      }
                                    </p>
                                  ) : null}

                                  <p>
                                    {
                                      address.city
                                    }
                                    ,{" "}
                                    {
                                      address.state
                                    }{" "}
                                    —{" "}
                                    {
                                      address.postal_code
                                    }
                                  </p>

                                  <p>
                                    <strong>
                                      Phone:
                                    </strong>{" "}
                                    {
                                      address.phone
                                    }
                                  </p>

                                  {hasCoordinates(
                                    address,
                                  ) ? (
                                    <small className="checkout-gps-valid">
                                      GPS:{" "}
                                      {
                                        address.latitude
                                      }
                                      ,{" "}
                                      {
                                        address.longitude
                                      }
                                    </small>
                                  ) : (
                                    <small className="checkout-gps-missing">
                                      Delivery location is saved;
                                      GPS is optional.
                                    </small>
                                  )}
                                </div>
                              </label>
                            );
                          },
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}

                <label className="checkout-mode-option">
                  <input
                    type="radio"
                    name="address_mode"
                    value="new"
                    checked={
                      addressMode === "new"
                    }
                    onChange={() =>
                      setAddressMode("new")
                    }
                  />

                  Add a new delivery address
                </label>

                {addressMode === "new" ? (
                  <div className="checkout-new-address">
                    <section className="checkout-location-card">
                      <div>
                        <strong>
                          Capture delivery
                          coordinates
                        </strong>

                        <p>
                          GPS coordinates are optional.
                          Delivery availability depends on
                          the address and pincode.
                        </p>
                      </div>

                      <button
                        className="checkout-button checkout-button-secondary"
                        type="button"
                        disabled={
                          capturingLocation ||
                          placingOrder
                        }
                        onClick={() =>
                          void captureLocation()
                        }
                      >
                        {capturingLocation
                          ? "Getting Location…"
                          : "Use My Location"}
                      </button>
                    </section>

                    <div
                      className={[
                        "checkout-location-status",
                        locationStatusType,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      role="status"
                    >
                      {locationStatus}
                    </div>

                    <div className="checkout-address-grid">
                      <label className="checkout-field">
                        Latitude

                        <input
                          type="number"
                          step="any"
                          name="latitude"
                          value={
                            newAddress.latitude
                          }
                          required
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Longitude

                        <input
                          type="number"
                          step="any"
                          name="longitude"
                          value={
                            newAddress.longitude
                          }
                          required
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Recipient full name

                        <input
                          type="text"
                          name="recipient_name"
                          value={
                            newAddress.recipient_name
                          }
                          required
                          autoComplete="name"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Contact number

                        <input
                          type="tel"
                          name="phone"
                          value={
                            newAddress.phone
                          }
                          required
                          autoComplete="tel"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Alternate contact
                        number

                        <input
                          type="tel"
                          name="alternate_phone"
                          value={
                            newAddress.alternate_phone
                          }
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Address type

                        <select
                          name="address_type"
                          value={
                            newAddress.address_type
                          }
                          onChange={
                            updateNewAddress
                          }
                        >
                          <option value="home">
                            Home
                          </option>

                          <option value="work">
                            Work
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <label className="checkout-field checkout-field-wide">
                        House / Flat /
                        Building / Street

                        <input
                          type="text"
                          name="address_line1"
                          value={
                            newAddress.address_line1
                          }
                          required
                          placeholder="Flat number, building, street"
                          autoComplete="address-line1"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field checkout-field-wide">
                        Area / Locality

                        <input
                          type="text"
                          name="address_line2"
                          value={
                            newAddress.address_line2
                          }
                          placeholder="Area, colony, locality"
                          autoComplete="address-line2"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Landmark

                        <input
                          type="text"
                          name="landmark"
                          value={
                            newAddress.landmark
                          }
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        City

                        <input
                          type="text"
                          name="city"
                          value={
                            newAddress.city
                          }
                          required
                          autoComplete="address-level2"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        State

                        <input
                          type="text"
                          name="state"
                          value={
                            newAddress.state
                          }
                          required
                          autoComplete="address-level1"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        PIN / Postal code

                        <input
                          type="text"
                          name="postal_code"
                          inputMode="numeric"
                          value={
                            newAddress.postal_code
                          }
                          required
                          autoComplete="postal-code"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>

                      <label className="checkout-field">
                        Country

                        <input
                          type="text"
                          name="country"
                          value={
                            newAddress.country
                          }
                          required
                          autoComplete="country-name"
                          onChange={
                            updateNewAddress
                          }
                        />
                      </label>
                    </div>

                    <div className="checkout-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={
                            saveAddress
                          }
                          onChange={(event) =>
                            setSaveAddress(
                              event.target
                                .checked,
                            )
                          }
                        />

                        Save for future orders
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={
                            newAddress.is_default
                          }
                          onChange={
                            updateNewAddress
                          }
                        />

                        Make default address
                      </label>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="checkout-page-card">
                <div className="checkout-step-title">
                  <span className="checkout-step-number">
                    2
                  </span>

                  <div className="checkout-step-copy">
                    <h2>
                      Payment Method
                    </h2>

                    <p>
                      Your payment is handled by
                      the store. The admin team
                      processes your order.
                    </p>
                  </div>
                </div>

                <div className="checkout-payment-list">
                  {checkout.razorpay_payment_enabled ? (
                    <label
                      className={[
                        "checkout-payment-option",
                        paymentMethod ===
                        "razorpay"
                          ? "selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="razorpay"
                        checked={
                          paymentMethod ===
                          "razorpay"
                        }
                        onChange={() =>
                          setPaymentMethod(
                            "razorpay",
                          )
                        }
                      />

                      <div>
                        <strong>
                          Pay Online with
                          Razorpay
                        </strong>

                        <p>
                          Pay securely using the
                          store's Razorpay payment
                          gateway.
                        </p>
                      </div>
                    </label>
                  ) : null}

                  {hasSubscriptionItems ? (
                    <p className="checkout-subscription-payment-note">
                      <strong>
                        Subscription payment:
                      </strong>{" "}
                      Cash on Delivery is not
                      available for subscription
                      orders. Online payment is
                      required.
                    </p>
                  ) : null}

                  {!hasSubscriptionItems &&
                  checkout.cash_on_delivery_enabled ? (
                    <label
                      className={[
                        "checkout-payment-option",
                        paymentMethod ===
                        "cash_on_delivery"
                          ? "selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash_on_delivery"
                        checked={
                          paymentMethod ===
                          "cash_on_delivery"
                        }
                        onChange={() =>
                          setPaymentMethod(
                            "cash_on_delivery",
                          )
                        }
                      />

                      <div>
                        <strong>
                          Cash on Delivery
                        </strong>

                        <p>
                          Pay when the
                          complete customer
                          order is delivered.
                        </p>
                      </div>
                    </label>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="checkout-page-card checkout-summary">
              <h2>Your Order</h2>

              {checkout.items.map(
                (item) => (
                  <div
                    className="checkout-summary-line"
                    key={item.item_id}
                  >
                    <span>
                      {item.name} ×{" "}
                      {item.quantity}
                    </span>

                    <strong>
                      {money(
                        checkout.currency_symbol,
                        item.subtotal,
                      )}
                    </strong>
                  </div>
                ),
              )}

              <section
                className="checkout-coupon"
                data-coupon-ui-version="4"
                aria-label="Apply coupon code"
              >
                <div className="checkout-coupon-heading">
                  <strong>Coupon Code</strong>
                  <span>Apply your coupon before payment</span>
                </div>

                {typeof checkout.active_coupon_count === "number" ? (
                  <p className="checkout-coupon-message success">
                    {checkout.active_coupon_count > 0
                      ? `${checkout.active_coupon_count} active coupon${
                          checkout.active_coupon_count === 1 ? "" : "s"
                        } available.`
                      : "Enter a valid coupon created by the administrator."}
                  </p>
                ) : null}

                <div className="checkout-coupon-row">
                  <input
                    className="checkout-coupon-input"
                    type="text"
                    value={couponCode}
                    maxLength={40}
                    placeholder="ENTER COUPON CODE"
                    disabled={applyingCoupon || placingOrder}
                    onChange={(event) => {
                      setCouponCode(
                        event.target.value.toUpperCase(),
                      );
                      setCouponMessage("");
                      setCouponMessageType("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCouponAction(false);
                      }
                    }}
                  />

                  <button
                    className={[
                      "checkout-button",
                      appliedCoupon
                        ? "checkout-button-secondary"
                        : "checkout-button-primary",
                    ].join(" ")}
                    type="button"
                    disabled={applyingCoupon || placingOrder}
                    onClick={() =>
                      void handleCouponAction(
                        Boolean(appliedCoupon),
                      )
                    }
                  >
                    {applyingCoupon
                      ? "Checking…"
                      : appliedCoupon
                        ? "Remove"
                        : "Apply"}
                  </button>
                </div>

                {couponMessage ? (
                  <p
                    className={[
                      "checkout-coupon-message",
                      couponMessageType,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="status"
                  >
                    {couponMessage}
                  </p>
                ) : null}

                {appliedCoupon ? (
                  <div className="checkout-coupon-applied">
                    <span>
                      <strong>{appliedCoupon.code}</strong>
                      {appliedCoupon.description ||
                        "Coupon applied to this order."}
                    </span>
                    <strong>
                      -{money(
                        checkout.currency_symbol,
                        appliedCoupon.discount_amount,
                      )}
                    </strong>
                  </div>
                ) : null}
              </section>

              <div className="checkout-summary-line">
                <span>Subtotal</span>

                <strong>
                  {money(
                    checkout.currency_symbol,
                    displayTotals
                      .subtotal,
                  )}
                </strong>
              </div>

              <div className="checkout-summary-line">
                <span className="checkout-delivery-copy">
                  <span>Delivery</span>

                  <small
                    className={[
                      "checkout-delivery-note",
                      deliveryQuoteMessage
                        ? "error"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {deliveryQuoteLoading
                      ? "Calculating from the selected address…"
                      : deliveryQuoteMessage ||
                        (displayTotals.delivery_distance_km != null
                          ? `${Number(
                              displayTotals.delivery_distance_km,
                            ).toFixed(1)} km • ${
                              Number(
                                displayTotals.delivery_base_fee || 0,
                              ) > 0
                                ? `${money(
                                    checkout.currency_symbol,
                                    Number(
                                      displayTotals.delivery_base_fee || 0,
                                    ),
                                  )} small-order fee`
                                : "No base fee"
                            }${
                              Number(
                                displayTotals.delivery_distance_fee || 0,
                              ) > 0
                                ? ` + ${money(
                                    checkout.currency_symbol,
                                    Number(
                                      displayTotals.delivery_distance_fee || 0,
                                    ),
                                  )} distance fee`
                                : ""
                            }`
                          : "₹20 below ₹100 within 5 km; ₹5 per extra km beyond 5 km.")}
                  </small>
                </span>

                <strong>
                  {displayTotals
                    .delivery_fee > 0
                    ? money(
                        checkout.currency_symbol,
                        displayTotals
                          .delivery_fee,
                      )
                    : "Free"}
                </strong>
              </div>

              {Number(displayTotals.discount || 0) > 0 ? (
                <div className="checkout-summary-line checkout-summary-discount">
                  <span>
                    Coupon discount
                    {appliedCoupon?.code
                      ? ` (${appliedCoupon.code})`
                      : ""}
                  </span>

                  <strong>
                    -{money(
                      checkout.currency_symbol,
                      displayTotals.discount,
                    )}
                  </strong>
                </div>
              ) : null}

              <div className="checkout-summary-line checkout-summary-grand">
                <span>Total</span>

                <strong>
                  {money(
                    checkout.currency_symbol,
                    displayTotals.total,
                  )}
                </strong>
              </div>

              <label className="checkout-terms">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  required
                  onChange={(event) =>
                    setAcceptedTerms(
                      event.target.checked,
                    )
                  }
                />

                <span>
                  I accept the stock availability,
                  delivery area, configured delivery
                  timeline and payment terms. The
                  store admin will review and fulfil
                  my order.
                </span>
              </label>

              <button
                className="checkout-button checkout-button-primary checkout-button-full"
                type="submit"
                disabled={placingOrder}
              >
                {placingOrder
                  ? "Placing Order…"
                  : "Place Order & Continue to Payment"}
              </button>
            </aside>
          </div>
        </form>
      </main>
    </>
  );
}
