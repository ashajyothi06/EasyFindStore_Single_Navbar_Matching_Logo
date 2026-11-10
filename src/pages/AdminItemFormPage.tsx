import "../styles/catalog-variants.css";
import {
  type ChangeEvent,
  type FormEvent,
  memo,
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
  useParams,
} from "react-router-dom";

import {
  createAdminItem,
  isCoreAuthenticationError,
  isCoreCsrfError,
  loadAdminCategory,
  loadAdminItem,
  updateAdminItem,
  type CatalogCategory,
  type CatalogItem,
  type ProductVariant,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

/** Scoped theme for Admin Add/Edit Product; retains both original stylesheet imports and logic. */
const ITEM_FORM_STYLES = `
  .ca-page.rudra-admin-item-form {
    --rudra-maroon: #55111f;
    --rudra-maroon-deep: #3b0a15;
    --rudra-maroon-hover: #6b1d30;
    --rudra-gold: #c89d55;
    --rudra-paper: #fffaf5;
    --rudra-soft: #f9f0e9;
    --rudra-ink: #291b20;
    --rudra-muted: #75646a;
    --rudra-border: #e9d9d0;
    --rudra-gutter: clamp(16px, 2.4vw, 48px);
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    min-height: 100%;
    margin: 0 !important;
    padding: 30px var(--rudra-gutter) 64px !important;
    overflow-x: clip;
    box-sizing: border-box;
    background: var(--rudra-paper) !important;
    color: var(--rudra-ink);
  }
  .ca-page.rudra-admin-item-form *,
  .ca-page.rudra-admin-item-form *::before,
  .ca-page.rudra-admin-item-form *::after { box-sizing: border-box; }
  .ca-page.rudra-admin-item-form .ca-page-container,
  .ca-page.rudra-admin-item-form .ca-form-shell {
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
  }
  .ca-page.rudra-admin-item-form .ca-form-card {
    display: grid;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    padding: clamp(20px, 2.4vw, 36px) !important;
    gap: 22px;
    border: 1px solid var(--rudra-border) !important;
    border-top: 3px solid var(--rudra-gold) !important;
    border-radius: 20px;
    background: #ffffff !important;
    color: var(--rudra-ink);
    box-shadow: 0 12px 36px rgba(85, 17, 31, .065);
  }
  .ca-page.rudra-admin-item-form .ca-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin: 0;
    padding: 0 0 20px;
    border-bottom: 1px solid var(--rudra-border);
  }
  .ca-page.rudra-admin-item-form .ca-section-heading > div { min-width: 0; }
  .ca-page.rudra-admin-item-form .ca-eyebrow {
    color: var(--rudra-maroon) !important;
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
  }
  .ca-page.rudra-admin-item-form .ca-section-heading h1 {
    margin: 5px 0 9px;
    color: var(--rudra-maroon-deep) !important;
    font-size: clamp(1.65rem, 2.4vw, 2.55rem);
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -.035em;
  }
  .ca-page.rudra-admin-item-form .ca-section-heading p {
    max-width: 760px;
    margin: 0;
    color: var(--rudra-muted);
    line-height: 1.55;
  }
  .ca-page.rudra-admin-item-form .ca-two-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 18px 22px;
    width: 100%;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .ca-form-card > label:not(.ca-checkbox-card),
  .ca-page.rudra-admin-item-form .ca-two-column > label,
  .ca-page.rudra-admin-item-form .ca-image-inputs > label:not(.ca-checkbox-card) {
    display: grid;
    align-content: start;
    gap: 8px;
    min-width: 0;
    color: var(--rudra-ink);
    font-size: .9rem;
    font-weight: 750;
  }
  .ca-page.rudra-admin-item-form .ca-form-card label small {
    display: block;
    color: var(--rudra-muted);
    font-size: .76rem;
    font-weight: 450;
    line-height: 1.5;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='text'],
  .ca-page.rudra-admin-item-form .ca-form-card input[type='number'],
  .ca-page.rudra-admin-item-form .ca-form-card input[type='date'],
  .ca-page.rudra-admin-item-form .ca-form-card input[type='datetime-local'],
  .ca-page.rudra-admin-item-form .ca-form-card input:not([type]),
  .ca-page.rudra-admin-item-form .ca-form-card input[type='file'],
  .ca-page.rudra-admin-item-form .ca-form-card select,
  .ca-page.rudra-admin-item-form .ca-form-card textarea {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 46px;
    padding: 11px 13px;
    border: 1px solid #decbd0 !important;
    border-radius: 10px;
    background: #fffdfb !important;
    color: var(--rudra-ink) !important;
    font: inherit;
    font-size: .92rem;
    font-weight: 500;
    line-height: 1.45;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='file'] {
    min-height: auto;
    padding: 10px;
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='file']::file-selector-button {
    margin-right: 12px;
    padding: 9px 12px;
    border: 1px solid #d3b3b9;
    border-radius: 8px;
    background: var(--rudra-soft);
    color: var(--rudra-maroon);
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .ca-form-card textarea {
    min-height: 112px;
    resize: vertical;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input:focus-visible,
  .ca-page.rudra-admin-item-form .ca-form-card select:focus-visible,
  .ca-page.rudra-admin-item-form .ca-form-card textarea:focus-visible,
  .ca-page.rudra-admin-item-form .ca-button:focus-visible {
    outline: 2px solid var(--rudra-gold) !important;
    outline-offset: 2px;
    border-color: var(--rudra-maroon) !important;
    box-shadow: 0 0 0 4px rgba(85, 17, 31, .08);
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='checkbox'] {
    width: 17px;
    height: 17px;
    flex: 0 0 17px;
    margin: 0;
    accent-color: var(--rudra-maroon);
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .rv-category-options {
    display: grid;
    gap: 14px;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 18px 20px 20px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 16px;
    background: var(--rudra-paper) !important;
  }
  .ca-page.rudra-admin-item-form .rv-category-options legend {
    padding: 0 8px;
    color: var(--rudra-maroon-deep);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.4;
  }
  .ca-page.rudra-admin-item-form .rv-category-options > p {
    margin: 0;
    color: var(--rudra-muted);
    font-size: .85rem;
    line-height: 1.55;
  }
  .ca-page.rudra-admin-item-form .rv-option-checklist {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }
  .ca-page.rudra-admin-item-form .rv-option-checklist label {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 40px;
    margin: 0;
    padding: 9px 13px;
    border: 1px solid var(--rudra-border);
    border-radius: 10px;
    background: #fff;
    color: var(--rudra-ink);
    font-size: .82rem;
    font-weight: 700;
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .rv-option-checklist label:has(input:checked) {
    border-color: #bb8a98;
    background: #faeaf0;
    color: var(--rudra-maroon-deep);
  }
  .ca-page.rudra-admin-item-form .ca-image-editor {
    display: grid;
    gap: 18px;
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 16px;
    background: var(--rudra-paper) !important;
  }
  .ca-page.rudra-admin-item-form .ca-image-editor h2 {
    margin: 0 0 6px;
    color: var(--rudra-maroon-deep);
    font-size: 1.2rem;
    font-weight: 800;
  }
  .ca-page.rudra-admin-item-form .ca-image-editor > div:first-child > p {
    margin: 0;
    color: var(--rudra-muted);
    font-size: .85rem;
    line-height: 1.5;
  }
  .ca-page.rudra-admin-item-form .ca-image-grid {
    display: grid;
    grid-template-columns: minmax(210px, 320px) minmax(0, 1fr);
    align-items: start;
    gap: 20px;
    min-width: 0;
    width: 100%;
  }
  .ca-page.rudra-admin-item-form .ca-image-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-width: 0;
    min-height: 230px;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border: 1px dashed #d3b3b9;
    border-radius: 13px;
    background: #fff !important;
  }
  .ca-page.rudra-admin-item-form .ca-image-preview img {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 360px;
    object-fit: contain;
    object-position: center;
  }
  .ca-page.rudra-admin-item-form .ca-image-preview > div {
    display: grid;
    gap: 7px;
    padding: 20px;
    color: var(--rudra-muted);
    font-size: .82rem;
    text-align: center;
  }
  .ca-page.rudra-admin-item-form .ca-image-preview strong {
    color: var(--rudra-maroon-deep);
  }
  .ca-page.rudra-admin-item-form .ca-image-inputs {
    display: grid;
    align-content: start;
    gap: 14px;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .ca-checkbox-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
    margin: 0;
    padding: 15px 17px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 12px;
    background: var(--rudra-paper) !important;
    color: var(--rudra-ink);
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .ca-checkbox-card strong {
    display: block;
    margin: 0 0 3px;
    color: var(--rudra-maroon-deep);
    font-weight: 800;
  }
  .ca-page.rudra-admin-item-form .ca-checkbox-card span {
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .ca-checkbox-card:has(input:checked) {
    border-color: #d7b49a !important;
    background: #fff6e6 !important;
  }
  .ca-page.rudra-admin-item-form .ca-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .ca-page.rudra-admin-item-form .ca-actions.end {
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid var(--rudra-border);
  }
  .ca-page.rudra-admin-item-form .ca-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 10px 17px;
    border-radius: 10px;
    font: inherit;
    font-size: .87rem;
    font-weight: 750;
    line-height: 1.3;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .ca-page.rudra-admin-item-form .ca-button.small {
    min-height: 36px;
    padding: 8px 13px;
    font-size: .8rem;
  }
  .ca-page.rudra-admin-item-form .ca-button.primary {
    border: 1px solid var(--rudra-maroon) !important;
    background: var(--rudra-maroon) !important;
    color: #fff !important;
    box-shadow: 0 5px 14px rgba(85, 17, 31, .14);
  }
  .ca-page.rudra-admin-item-form .ca-button.primary:hover:not(:disabled) {
    border-color: var(--rudra-maroon-hover) !important;
    background: var(--rudra-maroon-hover) !important;
  }
  .ca-page.rudra-admin-item-form .ca-button.secondary {
    border: 1px solid #d7b6ba !important;
    background: #fff !important;
    color: var(--rudra-maroon) !important;
  }
  .ca-page.rudra-admin-item-form .ca-button.secondary:hover {
    border-color: var(--rudra-maroon) !important;
    background: var(--rudra-soft) !important;
  }
  .ca-page.rudra-admin-item-form .ca-button:disabled {
    cursor: not-allowed;
    opacity: .6;
    box-shadow: none;
  }
  .ca-page.rudra-admin-item-form .ca-alert {
    margin: 0;
    padding: 13px 16px;
    border-radius: 11px;
    font-size: .88rem;
    font-weight: 650;
  }
  .ca-page.rudra-admin-item-form .ca-alert.danger {
    border: 1px solid #edc5c9 !important;
    background: #fff0ef !important;
    color: #9c2934 !important;
  }
  .ca-page.rudra-admin-item-form .ca-loading {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 18px;
    border: 1px solid var(--rudra-border);
    border-radius: 16px;
    background: #fff;
    color: var(--rudra-muted);
  }
  @media (max-width: 980px) {
    .ca-page.rudra-admin-item-form .ca-image-grid {
      grid-template-columns: minmax(180px, 270px) minmax(0, 1fr);
    }
  }
  @media (max-width: 760px) {
    .ca-page.rudra-admin-item-form {
      --rudra-gutter: 20px;
      padding-top: 20px !important;
      padding-bottom: 46px !important;
    }
    .ca-page.rudra-admin-item-form .ca-form-card {
      padding: 20px !important;
      gap: 18px;
    }
    .ca-page.rudra-admin-item-form .ca-section-heading { align-items: flex-start; }
    .ca-page.rudra-admin-item-form .ca-two-column { gap: 14px; }
    .ca-page.rudra-admin-item-form .ca-image-grid { grid-template-columns: 1fr; }
    .ca-page.rudra-admin-item-form .ca-image-preview { min-height: 190px; max-width: 360px; }
    .ca-page.rudra-admin-item-form .rv-category-options,
    .ca-page.rudra-admin-item-form .ca-image-editor { padding: 16px; }
  }
  @media (max-width: 560px) {
    .ca-page.rudra-admin-item-form { --rudra-gutter: 16px; }
    .ca-page.rudra-admin-item-form .ca-form-card {
      padding: 16px !important;
      gap: 16px;
      border-radius: 14px;
    }
    .ca-page.rudra-admin-item-form .ca-two-column { grid-template-columns: minmax(0, 1fr); }
    .ca-page.rudra-admin-item-form .ca-section-heading { align-items: stretch; }
    .ca-page.rudra-admin-item-form .ca-section-heading h1 { font-size: 1.6rem; }
    .ca-page.rudra-admin-item-form .ca-section-heading .ca-button { width: 100%; }
    .ca-page.rudra-admin-item-form .ca-actions.end { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ca-page.rudra-admin-item-form .ca-actions.end .ca-button { min-width: 0; padding-inline: 8px; }
    .ca-page.rudra-admin-item-form .rv-category-options,
    .ca-page.rudra-admin-item-form .ca-image-editor { padding: 14px; }
    .ca-page.rudra-admin-item-form .rv-option-checklist { gap: 7px; }
    .ca-page.rudra-admin-item-form .rv-option-checklist label { min-height: 38px; padding: 8px 10px; }
  }


  /* Defer expensive layout/paint for long sections below the viewport. */
  @supports (content-visibility: auto) {
    .ca-page.rudra-admin-item-form .ca-form-card > .ca-image-editor,
    .ca-page.rudra-admin-item-form .ca-form-card > .ca-sale-editor,
    .ca-page.rudra-admin-item-form .ca-form-card > .rv-variant-editor {
      content-visibility: auto;
      contain-intrinsic-size: auto 360px;
    }
  }

  /* Product form: retain the same two/three-column structure as the original. */
  .ca-page.rudra-admin-item-form .ca-three-column {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 18px 22px;
    width: 100%;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .ca-three-column > label,
  .ca-page.rudra-admin-item-form .ca-form-card > label:not(.ca-checkbox-card),
  .ca-page.rudra-admin-item-form .ca-marketplace-detail-fields > label,
  .ca-page.rudra-admin-item-form .ca-sale-editor label,
  .ca-page.rudra-admin-item-form .rv-category-options .ca-two-column > label,
  .ca-page.rudra-admin-item-form .rv-variant-fields > label {
    display: grid;
    gap: 8px;
    align-content: start;
    min-width: 0;
    color: var(--rudra-ink);
    font-size: .88rem;
    font-weight: 750;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='datetime-local'] {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
  .ca-page.rudra-admin-item-form .ca-marketplace-detail-fields h2,
  .ca-page.rudra-admin-item-form .ca-sale-editor h3,
  .ca-page.rudra-admin-item-form .rv-variant-editor h2 {
    margin: 0 0 8px;
    color: var(--rudra-maroon-deep) !important;
    font-size: 1.18rem;
    font-weight: 850;
    line-height: 1.3;
  }
  .ca-page.rudra-admin-item-form .ca-marketplace-detail-fields > p,
  .ca-page.rudra-admin-item-form .ca-image-editor > p,
  .ca-page.rudra-admin-item-form .ca-sale-editor > p,
  .ca-page.rudra-admin-item-form .rv-variant-editor > p,
  .ca-page.rudra-admin-item-form .rv-category-options > p {
    margin: 0;
    color: var(--rudra-muted) !important;
    font-size: .85rem;
    font-weight: 480;
    line-height: 1.55;
  }
  .ca-page.rudra-admin-item-form .ca-sale-editor,
  .ca-page.rudra-admin-item-form .rv-variant-editor {
    display: grid;
    gap: 16px;
    min-width: 0;
    width: 100%;
    margin: 0;
    padding: 20px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 16px;
    background: var(--rudra-paper) !important;
    color: var(--rudra-ink);
  }
  .ca-page.rudra-admin-item-form .ca-marketplace-detail-fields {
    gap: 16px;
  }
  .ca-page.rudra-admin-item-form .ca-marketplace-detail-fields > label {
    width: 100%;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input:disabled,
  .ca-page.rudra-admin-item-form .ca-form-card select:disabled {
    cursor: not-allowed;
    background: #f1eae7 !important;
    color: #98888e !important;
    opacity: .75;
  }
  .ca-page.rudra-admin-item-form .ca-form-card input[type='checkbox'],
  .ca-page.rudra-admin-item-form .ca-form-card input[type='radio'] {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    min-height: 0;
    margin: 0;
    accent-color: var(--rudra-maroon);
    cursor: pointer;
  }
  .ca-page.rudra-admin-item-form .ca-delivery-days {
    display: grid;
    gap: 8px;
    width: 100%;
    padding: 15px 18px;
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    background: #fffaf5;
  }
  .ca-page.rudra-admin-item-form .ca-delivery-days input {
    max-width: 100%;
  }

  /* Saved media, product documents and gallery uploads. */
  .ca-page.rudra-admin-item-form .ca-multifile-input {
    width: 100%;
    max-width: 100%;
  }
  .ca-page.rudra-admin-item-form .ca-selected-files,
  .ca-page.rudra-admin-item-form .ca-saved-media {
    display: grid;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    background: #fff !important;
  }
  .ca-page.rudra-admin-item-form .ca-selected-files > strong,
  .ca-page.rudra-admin-item-form .ca-saved-media > strong {
    color: var(--rudra-maroon-deep);
    font-size: .9rem;
  }
  .ca-page.rudra-admin-item-form .ca-selected-files > span {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--rudra-muted);
    font-size: .82rem;
  }
  .ca-page.rudra-admin-item-form .ca-gallery-edit-row {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    align-items: start;
    gap: 15px;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 12px;
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    background: var(--rudra-paper);
  }
  .ca-page.rudra-admin-item-form .ca-gallery-thumb {
    display: block;
    width: 104px;
    height: 104px;
    max-width: 100%;
    object-fit: contain;
    object-position: center;
    overflow: hidden;
    border: 1px solid var(--rudra-border);
    border-radius: 10px;
    background: #fff;
  }
  .ca-page.rudra-admin-item-form .ca-file-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }
  .ca-page.rudra-admin-item-form .ca-gallery-edit-actions {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    align-items: flex-start;
    gap: 11px;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .ca-gallery-edit-actions a {
    max-width: 100%;
    color: var(--rudra-maroon) !important;
    overflow-wrap: anywhere;
    font-size: .86rem;
    font-weight: 750;
  }
  .ca-page.rudra-admin-item-form .ca-gallery-edit-actions label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--rudra-ink);
    font-size: .81rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Variants are independent stocked choices, so keep each row readable. */
  .ca-page.rudra-admin-item-form .rv-category-options .ca-two-column {
    margin: 0;
  }
  .ca-page.rudra-admin-item-form .rv-variant-table {
    display: grid;
    gap: 14px;
    width: 100%;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .rv-variant-row {
    display: grid;
    align-items: start;
    gap: 14px;
    width: 100%;
    min-width: 0;
    padding: 17px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 13px;
    background: #fff !important;
  }
  .ca-page.rudra-admin-item-form .rv-variant-fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 13px 16px;
    width: 100%;
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .rv-variant-fields > label {
    min-width: 0;
  }
  .ca-page.rudra-admin-item-form .rv-variant-preview {
    display: block;
    max-width: 200px;
    width: 100%;
    height: 165px;
    object-fit: contain;
    border: 1px solid var(--rudra-border);
    border-radius: 12px;
    background: #fffdfb;
  }
  .ca-page.rudra-admin-item-form .rv-variant-row > .ca-button {
    justify-self: start;
  }
  .ca-page.rudra-admin-item-form .rv-variant-editor > .ca-button {
    justify-self: start;
  }
  .ca-page.rudra-admin-item-form .rv-variant-editor > small {
    display: block;
    color: var(--rudra-muted);
    font-size: .79rem;
    line-height: 1.5;
  }
  .ca-page.rudra-admin-item-form .ca-align-checkboxes {
    align-items: stretch;
  }
  .ca-page.rudra-admin-item-form .ca-align-checkboxes > .ca-checkbox-card {
    align-self: stretch;
    min-height: 104px;
  }

  /* Responsive widths and consistent horizontal gutter across admin screens. */
  @media (max-width: 1050px) {
    .ca-page.rudra-admin-item-form .rv-variant-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 760px) {
    .ca-page.rudra-admin-item-form .ca-three-column {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .ca-page.rudra-admin-item-form .ca-sale-editor,
    .ca-page.rudra-admin-item-form .rv-variant-editor {
      padding: 16px;
    }
  }
  @media (max-width: 560px) {
    .ca-page.rudra-admin-item-form .ca-three-column,
    .ca-page.rudra-admin-item-form .rv-variant-fields {
      grid-template-columns: minmax(0, 1fr);
    }
    .ca-page.rudra-admin-item-form .ca-gallery-edit-row {
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 10px;
      padding: 10px;
    }
    .ca-page.rudra-admin-item-form .ca-gallery-thumb {
      width: 76px;
      height: 80px;
    }
    .ca-page.rudra-admin-item-form .ca-sale-editor,
    .ca-page.rudra-admin-item-form .rv-variant-editor {
      padding: 14px;
    }
    .ca-page.rudra-admin-item-form .rv-variant-row { padding: 12px; }
    .ca-page.rudra-admin-item-form .ca-align-checkboxes > .ca-checkbox-card { min-height: 0; }
  }
`;

interface ItemFormState {
  name: string;
  slug: string;
  group_name: string;
  description: string;
  image_url: string;
  price: string;
  compare_price: string;
  stock_quantity: string;
  delivery_days: string;
  delivery_extra_fee: string;
  delivery_size: string;
  delivery_fee_mode: string;
  brand: string;
  highlights: string;
  specifications: string;
  warranty: string;
  return_days: string;
  sale_type: string;
  sale_value: string;
  sale_start: string;
  sale_end: string;
  sku: string;
  size: string;
  unit_label: string;
  sort_order: string;
  is_active: boolean;
  is_featured: boolean;
  remove_image: boolean;
}

const emptyForm: ItemFormState = {
  name: "",
  slug: "",
  group_name: "",
  description: "",
  image_url: "",
  price: "",
  compare_price: "",
  stock_quantity: "0",
  delivery_days: "2",
  delivery_extra_fee: "0",
  delivery_size: "small",
  delivery_fee_mode: "inherit",
  brand: "",
  highlights: "",
  specifications: "",
  warranty: "",
  return_days: "0",
  sale_type: "none",
  sale_value: "0",
  sale_start: "",
  sale_end: "",
  sku: "",
  size: "",
  unit_label: "unit",
  sort_order: "0",
  is_active: true,
  is_featured: false,
  remove_image: false,
};

const units = [
  "unit",
  "piece",
  "pair",
  "set",
  "pack",
  "box",
  "kg",
  "g",
  "litre",
  "ml",
  // Keep legacy choices available when editing previously saved products.
  "bottle",
  "glass",
  "cup",
  "shot",
  "add-on",
];

/**
 * Coalesce simultaneous requests (including React StrictMode effect replays).
 * Intentionally do not cache completed admin responses: CSRF and stock must stay fresh.
 */
const pendingFormRequests = new Map<string, Promise<unknown>>();

function loadOnce<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const existing = pendingFormRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const request = Promise.resolve().then(operation);
  pendingFormRequests.set(key, request);
  void request.finally(() => {
    if (pendingFormRequests.get(key) === request) pendingFormRequests.delete(key);
  }).catch(() => { /* Original caller handles the request failure. */ });
  return request;
}

type ProductMedia = NonNullable<CatalogItem["media"]>;

type ProductMediaEditorProps = {
  media: CatalogItem["media"] | undefined;
  selectedFiles: File[];
  keptMedia: string[];
  galleryCover: string;
  onFilesChange: (files: File[]) => void;
  onKeepChange: (url: string, keep: boolean) => void;
  onCoverChange: (url: string) => void;
};

/** Keep the media preview subtree out of ordinary product-field re-renders. */
const ProductMediaEditor = memo(function ProductMediaEditor({
  media, selectedFiles, keptMedia, galleryCover,
  onFilesChange, onKeepChange, onCoverChange,
}: ProductMediaEditorProps) {
  const retained = useMemo(() => new Set(keptMedia), [keptMedia]);
  const files: ProductMedia = media || [];
  return (
    <section className="ca-image-editor ca-media-editor">
      <h2>Product gallery, videos and documents</h2>
      <p>Upload multiple photos, videos and files to OneDrive. Supports PDF, Word, Excel, PowerPoint and text.</p>
      <input className="ca-multifile-input" type="file" multiple
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={(event) => onFilesChange(Array.from(event.target.files || []))} />
      {selectedFiles.length > 0 && (
        <div className="ca-selected-files">
          <strong>{selectedFiles.length} file(s) selected</strong>
          {selectedFiles.map((file, i) => <span key={`${file.name}-${file.size}-${i}`}>{file.name}</span>)}
        </div>
      )}
      {files.length > 0 && (
        <div className="ca-saved-media">
          <strong>Saved files (uncheck to remove)</strong>
          {files.map((file) => (
            <div key={file.url} className="ca-gallery-edit-row">
              {file.type === "image" ? (
                <img className="ca-gallery-thumb" src={file.url} alt={file.name || "Product photo"}
                  loading="lazy" decoding="async" />
              ) : file.type === "video" ? (
                <video className="ca-gallery-thumb" src={file.url} controls preload="none" />
              ) : (
                <div className="ca-gallery-thumb ca-file-icon">📄</div>
              )}
              <div className="ca-gallery-edit-actions">
                <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name || file.type}</a>
                <label>
                  <input type="checkbox" checked={retained.has(file.url)}
                    onChange={(event) => onKeepChange(file.url, event.target.checked)} /> Keep this file
                </label>
                {file.type === "image" && retained.has(file.url) && (
                  <label><input type="radio" name="gallery-cover" checked={galleryCover === file.url}
                    onChange={() => onCoverChange(file.url)} /> Use as main cover</label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

type VariantEditRowProps = {
  variant: Partial<ProductVariant>;
  index: number;
  attributes: string[];
  basePrice: string;
  onEdit: (index: number, field: string, value: unknown) => void;
  onFile: (index: number, file: File | null) => void;
  onRemove: (index: number) => void;
};

/** Only the changed row rerenders while editing dozens of variants. */
const VariantEditRow = memo(function VariantEditRow({
  variant, index, attributes, basePrice, onEdit, onFile, onRemove,
}: VariantEditRowProps) {
  return (
    <div className="rv-variant-row">
      <div className="rv-variant-fields">
        {attributes.map((attr) => (
          <label key={attr}>{attr[0].toUpperCase() + attr.slice(1)}
            <input value={String((variant as Record<string, unknown>)[attr] || "")}
              onChange={(event) => onEdit(index, attr, event.target.value)} />
          </label>
        ))}
        <label>Selling price (₹)
          <input type="number" min="0" step="0.01" value={variant.price ?? basePrice}
            onChange={(event) => onEdit(index, "price", Number(event.target.value))} />
        </label>
        <label>Units in stock
          <input type="number" min="0" step="1" value={variant.stock_quantity ?? 0}
            onChange={(event) => onEdit(index, "stock_quantity", Number(event.target.value))} />
        </label>
        <label>Additional delivery fee (₹)
          <input type="number" min="0" step="0.01" value={variant.delivery_extra_fee ?? 0}
            onChange={(event) => onEdit(index, "delivery_extra_fee", Number(event.target.value))} />
        </label>
        <label>Image URL
          <input placeholder="Choose an existing media URL or paste HTTPS" value={variant.image_url || ""}
            onChange={(event) => onEdit(index, "image_url", event.target.value)} />
        </label>
        <label>Upload this variant's image
          <input type="file" accept="image/png,image/jpeg,image/webp"
            onChange={(event) => onFile(index, event.target.files?.[0] || null)} />
        </label>
      </div>
      {variant.image_url && (
        <img className="rv-variant-preview" src={variant.image_url}
          alt={`Variant ${index + 1}`} loading="lazy" decoding="async" />
      )}
      <button type="button" className="ca-button secondary small" onClick={() => onRemove(index)}>
        Remove variant
      </button>
    </div>
  );
});

type VariantEditorProps = {
  variants: Partial<ProductVariant>[];
  attributes: string[];
  basePrice: string;
  onEdit: VariantEditRowProps["onEdit"];
  onFile: VariantEditRowProps["onFile"];
  onRemove: VariantEditRowProps["onRemove"];
  onAdd: () => void;
};

const ProductVariantsEditor = memo(function ProductVariantsEditor({
  variants, attributes, basePrice, onEdit, onFile, onRemove, onAdd,
}: VariantEditorProps) {
  return (
    <section className="rv-variant-editor">
      <h2>Color, size &amp; variant prices</h2>
      <p>Every combination is a separate stocked SKU. Assign different color photos and selling prices.</p>
      <p>Category options: {attributes.join(", ") || "Set options in Edit Category first."}</p>
      <div className="rv-variant-table">
        {variants.map((variant, index) => (
          <VariantEditRow key={index} variant={variant} index={index}
            attributes={attributes} basePrice={basePrice}
            onEdit={onEdit} onFile={onFile} onRemove={onRemove} />
        ))}
      </div>
      <button type="button" className="ca-button secondary" onClick={onAdd}>+ Add variant</button>
      <small>Leave empty for a standard single-SKU product. Variants are orderable independently.</small>
    </section>
  );
});

export function AdminItemFormPage() {
  const { categoryId = "", itemId } =
    useParams();
  const isEdit = Boolean(itemId);
  const navigate = useNavigate();
  const location = useLocation();

  const [category, setCategory] =
    useState<CatalogCategory | null>(null);
  const [item, setItem] =
    useState<CatalogItem | null>(null);
  const [form, setForm] =
    useState<ItemFormState>(emptyForm);
  const [csrfToken, setCsrfToken] =
    useState("");
  const [imageFile, setImageFile] =
    useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [keptMedia, setKeptMedia] = useState<string[]>([]);
  const [galleryCover, setGalleryCover] = useState("");
  const [objectUrl, setObjectUrl] =
    useState("");
  const [fileInputKey, setFileInputKey] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [variantImages, setVariantImages] = useState<Record<number,File>>({});
  const submittingRef = useRef(false);
  const [debouncedImageUrl, setDebouncedImageUrl] = useState("");

  // A pasted or typed URL should not trigger image downloads on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedImageUrl(form.image_url.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [form.image_url]);

  const variantAttributes = useMemo(
    () => category?.variant_attributes?.length ? category.variant_attributes : ["color", "size"],
    [category?.variant_attributes],
  );

  const changeVariant = useCallback((index: number, field: string, value: unknown) => {
    setVariants((rows) => rows.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
  }, []);

  const changeVariantFile = useCallback((index: number, file: File | null) => {
    setVariantImages((current) => {
      const next = { ...current };
      if (file) next[index] = file;
      else delete next[index];
      return next;
    });
  }, []);

  const removeVariant = useCallback((index: number) => {
    setVariants((rows) => rows.filter((_, i) => i !== index));
    // Clearing pending uploads prevents associating a former row's file with a different SKU.
    setVariantImages({});
  }, []);

  const addVariant = useCallback(() => {
    setVariants((rows) => [...rows, {
      price: Number(form.price) || 0,
      stock_quantity: 0, delivery_extra_fee: 0, color: "", size: "", image_url: "",
    }]);
  }, [form.price]);

  const changeMediaFiles = useCallback((files: File[]) => setMediaFiles(files), []);
  const changeMediaCover = useCallback((url: string) => setGalleryCover(url), []);
  const changeKeptMedia = useCallback((url: string, keep: boolean) => {
    if (!keep) setGalleryCover((current) => current === url ? "" : current);
    setKeptMedia((current) => keep
      ? current.includes(url) ? current : [...current, url]
      : current.filter((value) => value !== url));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (itemId) {
          const response =
            await loadOnce(
              `item:${categoryId}:${itemId}`,
              () => loadAdminItem(categoryId, itemId),
            );

          if (cancelled) return;

          const loadedCategory =
            response.category as CatalogCategory;
          const loadedItem =
            response.item as CatalogItem;

          setCategory(loadedCategory);
          setItem(loadedItem);
          setVariants((loadedItem.variants || []).map(v=>({...v})));
          setVariantImages({});
          setKeptMedia((loadedItem.media || []).map((file) => file.url));
          setCsrfToken(
            String(response.csrf_token || ""),
          );
          setForm({
            name: loadedItem.name || "",
            slug: loadedItem.slug || "",
            group_name:
              loadedItem.group_name || "",
            description:
              loadedItem.description || "",
            // Replacement URL only. The saved image stays on loadedItem
            // so leaving this blank never clears the current image.
            image_url: "",
            price: String(
              loadedItem.price ?? "",
            ),
            compare_price:
              loadedItem.compare_price == null
                ? ""
                : String(
                  loadedItem.compare_price,
                ),
            stock_quantity: String(
              loadedItem.stock_quantity || 0,
            ),
            delivery_days: String(loadedItem.delivery_days || 1),
            delivery_extra_fee: String(loadedItem.delivery_extra_fee || 0),
            delivery_size:loadedItem.delivery_size || loadedCategory.delivery_size || "small",
            delivery_fee_mode:(loadedItem as CatalogItem & {delivery_fee_mode?:string}).delivery_fee_mode || "inherit",
            brand: loadedItem.brand || "",
            highlights: loadedItem.highlights || "",
            specifications: loadedItem.specifications || "",
            warranty: loadedItem.warranty || "",
            return_days: String(loadedItem.return_days || 0),
            sale_type: loadedItem.sale_type || "none",
            sale_value: String(loadedItem.sale_value || 0),
            sale_start: (loadedItem.sale_start || "").slice(0,16),
            sale_end: (loadedItem.sale_end || "").slice(0,16),
            sku: loadedItem.sku || "",
            size: loadedItem.size || "",
            unit_label:
              loadedItem.unit_label ||
              "unit",
            sort_order: String(
              loadedItem.sort_order || 0,
            ),
            is_active:
              loadedItem.is_active !== false,
            is_featured: Boolean(
              loadedItem.is_featured,
            ),
            remove_image: false,
          });
        } else {
          const response =
            await loadOnce(
              `category:${categoryId}`,
              () => loadAdminCategory(categoryId),
            );

          if (cancelled) return;

          setCategory(
            response.category as CatalogCategory,
          );
          setForm(f=>({...f,delivery_size:(response.category as CatalogCategory).delivery_size || "small"}));
          setCsrfToken(
            String(response.csrf_token || ""),
          );
        }
      } catch (requestError) {
        if (cancelled) return;
        if (
          isCoreAuthenticationError(
            requestError,
          )
        ) {
          navigate(
            `/react/login?next=${encodeURIComponent(
              location.pathname,
            )}`,
            { replace: true },
          );
          return;
        }

        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the item form.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    categoryId,
    itemId,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  function selectFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] || null;

    // useEffect revokes the prior object URL after the new preview commits.
    setObjectUrl("");
    setImageFile(file);

    if (file) {
      setObjectUrl(
        URL.createObjectURL(file),
      );
      setForm((current) => ({
        ...current,
        remove_image: false,
      }));
    }
  }

  function setRemoveImage(checked: boolean) {
    if (checked) {
      setObjectUrl("");
      setImageFile(null);
      setFileInputKey((value) => value + 1);
    }

    setForm((current) => ({
      ...current,
      remove_image: checked,
    }));
  }

  const previewUrl = useMemo(() => {
    if (objectUrl) return objectUrl;
    if (form.remove_image) return "";
    if (debouncedImageUrl) return debouncedImageUrl;
    return form.image_url.trim() ? "" : item?.image_url || "";
  }, [
    debouncedImageUrl,
    form.image_url,
    form.remove_image,
    item?.image_url,
    objectUrl,
  ]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (
      !csrfToken ||
      !form.name.trim() ||
      !form.price.trim() || !Number.isInteger(Number(form.delivery_days)) || Number(form.delivery_days) < 1 || Number(form.delivery_days) > 3650
    ) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    const payload = new FormData();

    payload.set("variants_json",JSON.stringify(variants));
    payload.set("delivery_size",form.delivery_size);
    payload.set("delivery_fee_mode",form.delivery_fee_mode);
    Object.entries(variantImages).forEach(([index,file])=>payload.set(`variant_image_${index}`,file));
    payload.set("name", form.name.trim());
    payload.set("slug", form.slug.trim());
    payload.set(
      "group_name",
      form.group_name.trim(),
    );
    payload.set(
      "description",
      form.description.trim(),
    );
    payload.set(
      "image_url",
      form.image_url.trim(),
    );
    payload.set("price", form.price);
    payload.set(
      "compare_price",
      form.compare_price,
    );
    payload.set(
      "stock_quantity",
      form.stock_quantity,
    );
    payload.set("delivery_days", form.delivery_days);
    payload.set("delivery_extra_fee", form.delivery_extra_fee);
    payload.set("brand", form.brand.trim());
    payload.set("highlights", form.highlights.trim());
    payload.set("specifications", form.specifications.trim());
    payload.set("warranty", form.warranty.trim());
    payload.set("return_days", form.return_days);
    payload.set("sale_type", form.sale_type);
    payload.set("sale_value", form.sale_value);
    payload.set("sale_start", form.sale_start);
    payload.set("sale_end", form.sale_end);
    // An explicit selection flag distinguishes keeping no media from an unchanged form.
    payload.set("media_selection_present", "1");
    if (keptMedia.includes(galleryCover)) payload.set("media_cover_url", galleryCover);
    keptMedia.forEach((url) => payload.append("keep_media", url));
    mediaFiles.forEach((file) => payload.append("media_files", file));
    payload.set("sku", form.sku.trim());
    payload.set("size", form.size.trim());
    payload.set(
      "unit_label",
      form.unit_label,
    );
    payload.set(
      "sort_order",
      form.sort_order,
    );
    payload.set(
      "is_active",
      String(form.is_active),
    );
    payload.set(
      "is_featured",
      String(form.is_featured),
    );
    payload.set(
      "remove_image",
      String(form.remove_image),
    );

    if (imageFile) {
      payload.set("image_file", imageFile);
    }

    try {
      if (itemId) {
        await updateAdminItem(
          categoryId,
          itemId,
          csrfToken,
          payload,
        );
      } else {
        await createAdminItem(
          categoryId,
          csrfToken,
          payload,
        );
      }

      window.dispatchEvent(
        new Event("admin-dashboard-updated"),
      );
      navigate("/admin/catalog", {
        state: {
          message: isEdit
            ? "Product updated successfully."
            : "Product created successfully.",
        },
      });
    } catch (requestError) {
      if (isCoreCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the product.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="ca-page rudra-admin-item-form">
      <style>{ITEM_FORM_STYLES}</style>
        <div className="ca-loading">
          Loading product form…
        </div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="ca-page rudra-admin-item-form">
      <style>{ITEM_FORM_STYLES}</style>
        <section className="ca-empty">
          <h1>Category unavailable</h1>
          <p>
            {error ||
              "The selected category was not found."}
          </p>
          <Link
            className="ca-button secondary"
            to="/admin/catalog"
          >
            Back to Catalogue
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="ca-page rudra-admin-item-form">
      <style>{ITEM_FORM_STYLES}</style>
      <div className="ca-page-container">
        <section className="ca-form-shell">
          <form
            className="ca-form-card"
            onSubmit={submit}
            encType="multipart/form-data"
          >
            <div className="ca-section-heading">
              <div>
                <span className="ca-eyebrow">
                  {category.name}
                </span>
                <h1>
                  {isEdit
                    ? "Edit Product"
                    : "Add Product"}
                </h1>
                <p>
                  Add pricing, stock, size, product
                  imagery and storefront visibility.
                </p>
              </div>
              <Link
                className="ca-button secondary small"
                to="/admin/catalog"
              >
                Cancel
              </Link>
            </div>

            {error && (
              <div className="ca-alert danger">
                {error}
              </div>
            )}

            <div className="ca-two-column">
              <label>
                Product name
                <input
                  type="text"
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g., Cotton Shirt, Headphones, Table Lamp"
                  required
                />
              </label>

              <label>
                URL slug
                <input
                  type="text"
                  maxLength={140}
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="e.g., cotton-shirt"
                />
                <small>
                  Leave blank for automatic generation.
                </small>
              </label>
            </div>

            <label>
              Product group (optional)
              <input
                type="text"
                maxLength={120}
                value={form.group_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    group_name:
                      event.target.value,
                  }))
                }
                placeholder="e.g., Men’s Shirts, Wireless Earbuds, Home Decor"
              />
            </label>

            <label>
              Description
              <textarea
                rows={4}
                maxLength={1500}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                placeholder="Key features, specifications, materials, and product details..."
              />
            </label>

            <section className="ca-marketplace-detail-fields ca-image-editor">
              <h2>Product details & specifications</h2>
              <p>Displayed on the public product details page. Enter only verified product information; recommendations use this product’s category and group.</p>
              <div className="ca-two-column">
                <label>Brand / manufacturer
                  <input type="text" maxLength={120} value={form.brand} onChange={e=>setForm(v=>({...v,brand:e.target.value}))} placeholder="Actual product brand" />
                </label>
                <label>Return window (days, 0 = not offered)
                  <input type="number" min="0" max="365" value={form.return_days} onChange={e=>setForm(v=>({...v,return_days:e.target.value}))}/>
                </label>
              </div>
              <label>About this item — one feature per line
                <textarea rows={6} maxLength={4500} value={form.highlights} onChange={e=>setForm(v=>({...v,highlights:e.target.value}))} placeholder="Product feature 1&#10;Product feature 2" />
              </label>
              <label>Technical specifications — Key: Value per line
                <textarea rows={6} maxLength={4500} value={form.specifications} onChange={e=>setForm(v=>({...v,specifications:e.target.value}))} placeholder={"Material: Cotton\nColour: Navy\nModel: X100"}/>
              </label>
              <label>Warranty / support information (optional)
                <input maxLength={300} value={form.warranty} onChange={e=>setForm(v=>({...v,warranty:e.target.value}))} placeholder="Actual warranty terms, if available" />
              </label>
            </section>

            <section className="ca-image-editor">
              <div>
                <h2>Product image</h2>
                <p>
                  Upload an image to OneDrive or
                  provide an external image URL.
                </p>
              </div>

              <div className="ca-image-grid">
                <div className="ca-image-preview">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Product preview" loading="lazy" decoding="async"
                    />
                  ) : (
                    <div>
                      <strong>
                        No image selected
                      </strong>
                      <span>
                        PNG, JPG, JPEG or WEBP
                      </span>
                    </div>
                  )}
                </div>

                <div className="ca-image-inputs">
                  <label>
                    Upload product image
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      onChange={selectFile}
                    />
                    <small>
                      Maximum file size follows the
                      backend item image setting. A new
                      upload takes priority over the URL.
                    </small>
                  </label>

                  <label>
                    Or use a replacement image URL/path
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          image_url:
                            event.target.value,
                          remove_image: false,
                        }))
                      }
                      placeholder="https://example.com/image.jpg (or upload to OneDrive)"
                    />
                    <small>
                      Optional replacement only. Leave blank
                      while editing to keep the currently
                      saved image.
                    </small>
                  </label>

                  {isEdit &&
                    Boolean(item?.image_url) && (
                      <label className="ca-checkbox-card">
                        <input
                          type="checkbox"
                          checked={
                            form.remove_image
                          }
                          onChange={(event) =>
                            setRemoveImage(
                              event.target.checked,
                            )
                          }
                        />
                        <span>
                          <strong>
                            Remove current image
                          </strong>
                          <small>
                            Clears the saved image when
                            no replacement is uploaded.
                          </small>
                        </span>
                      </label>
                    )}
                </div>
              </div>
            </section>

            <label className="ca-delivery-days">
              Delivery timeline (days after order)
              <input type="number" min="1" max="3650" step="1" required
                value={form.delivery_days}
                onChange={(event) => setForm((current) => ({ ...current, delivery_days: event.target.value }))} />
              <small>Set 2 for 2 days, 7 for 7 days, or any whole number. This promise is saved per product.</small>
            </label>
            <label className="ca-delivery-days">Extra delivery fee for this product (₹ per unit)
              <input type="number" min="0" max="1000000" step="0.01" value={form.delivery_extra_fee}
                onChange={(event) => setForm((current) => ({ ...current, delivery_extra_fee: event.target.value }))} />
              <small>Optional handling fee for heavy or bulky items. Admin delivery settings decide whether to waive it on free-delivery orders.</small>
            </label>
            <ProductMediaEditor
              media={item?.media}
              selectedFiles={mediaFiles}
              keptMedia={keptMedia}
              galleryCover={galleryCover}
              onFilesChange={changeMediaFiles}
              onKeepChange={changeKeptMedia}
              onCoverChange={changeMediaCover}
            />
            <div className="ca-three-column">
              <label>
                Selling price (₹)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="99.00"
                  required
                />
              </label>

              <label>
                Original price (₹)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.compare_price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      compare_price:
                        event.target.value,
                    }))
                  }
                  placeholder="120.00"
                />
              </label>

              <label>
                Stock quantity
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock_quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stock_quantity:
                        event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <section className="ca-sale-editor" aria-label="Product sale discount">
              <h3>Special sale — this product only</h3>
              <p>Choose a percentage or flat discount. Set optional dates to start or end the offer automatically. The backend uses the sale price at checkout.</p>
              <div className="ca-three-column">
                <label>Sale type
                  <select value={form.sale_type} onChange={e=>setForm(v=>({...v,sale_type:e.target.value}))}>
                    <option value="none">No sale</option><option value="percentage">Percentage (%)</option><option value="fixed">Flat discount (₹)</option>
                  </select>
                </label>
                <label>Discount amount
                  <input type="number" min="0" step="0.01" value={form.sale_value} onChange={e=>setForm(v=>({...v,sale_value:e.target.value}))} disabled={form.sale_type==="none"}/>
                </label>
                <label>Starts (optional)
                  <input type="datetime-local" value={form.sale_start} onChange={e=>setForm(v=>({...v,sale_start:e.target.value}))}/>
                </label>
                <label>Ends (optional)
                  <input type="datetime-local" value={form.sale_end} onChange={e=>setForm(v=>({...v,sale_end:e.target.value}))}/>
                </label>
              </div>
            </section>
            <div className="ca-three-column">
              <label>
                SKU
                <input
                  type="text"
                  maxLength={60}
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sku: event.target.value,
                    }))
                  }
                  placeholder="e.g., SHIRT-BLU-M-001"
                />
                <small>
                  Leave blank to generate automatically.
                </small>
              </label>

              <label>
                Size / variant
                <input
                  type="text"
                  maxLength={50}
                  value={form.size}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      size: event.target.value,
                    }))
                  }
                  placeholder="e.g., Medium, 128 GB, 1 piece"
                />
              </label>

              <label>
                Unit label
                <select
                  value={form.unit_label}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit_label:
                        event.target.value,
                    }))
                  }
                  required
                >
                  {units.map((unit) => (
                    <option
                      key={unit}
                      value={unit}
                    >
                      {unit
                        .replace(/-/g, " ")
                        .replace(
                          /\b\w/g,
                          (character) =>
                            character.toUpperCase(),
                        )}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ca-three-column ca-align-checkboxes">
              <label>
                Sort order
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sort_order:
                        event.target.value,
                    }))
                  }
                  required
                />
                <small>
                  Lower numbers appear first.
                </small>
              </label>

              <label className="ca-checkbox-card">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active:
                        event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Active item</strong>
                  <small>
                    Show this product in the
                    storefront catalogue.
                  </small>
                </span>
              </label>

              <label className="ca-checkbox-card">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_featured:
                        event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Featured item</strong>
                  <small>
                    Show this product in featured
                    sections.
                  </small>
                </span>
              </label>
            </div>

            <fieldset className="rv-category-options"><legend>Delivery package and product-specific charge</legend><div className="ca-two-column">
              <label>Product parcel size<select value={form.delivery_size} onChange={e=>setForm(f=>({...f,delivery_size:e.target.value}))}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large / bulky</option></select></label>
              <label>Fee precedence<select value={form.delivery_fee_mode} onChange={e=>setForm(f=>({...f,delivery_fee_mode:e.target.value}))}><option value="inherit">Inherit category or package fee</option><option value="override">Override with this product's charge, including ₹0</option></select></label>
            </div><p>A positive product handling fee always takes priority. Select override if this item should have zero extra fee regardless of category rules.</p></fieldset>
            <ProductVariantsEditor
              variants={variants}
              attributes={variantAttributes}
              basePrice={form.price}
              onEdit={changeVariant}
              onFile={changeVariantFile}
              onRemove={removeVariant}
              onAdd={addVariant}
            />
            <div className="ca-actions end">
              <Link
                className="ca-button secondary"
                to="/admin/catalog"
              >
                Cancel
              </Link>
              <button
                className="ca-button primary"
                type="submit"
                disabled={
                  submitting ||
                  !csrfToken ||
                  !form.name.trim() ||
                  !form.price.trim()
                }
              >
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save Item Changes"
                    : "Add Product"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
