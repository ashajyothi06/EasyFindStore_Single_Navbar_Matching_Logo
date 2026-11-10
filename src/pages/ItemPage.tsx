import "../styles/catalog-variants.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { addProductToCart } from "../lib/guestCart";
import { productDetailHref } from "../lib/productLinks";
import { findCatalogDetail } from "../lib/catalogProductLookup";
import { estimatedDelivery, productMoney } from "../lib/estimatedDelivery";
import type { CatalogCategory, CatalogItem, ProductMedia } from "../services/coreCommerceApi";
import "../styles/item-ecommerce.css";

/**
 * Mobile-first overrides for the product details page.
 * Desktop layout and the imported item-ecommerce / variant styles remain intact.
 * Kept local so this TSX file can be dropped into the project without CSS edits.
 */
const ITEM_PAGE_SPACING_CSS = `
  .ec-item-page.ec-item-page-wide {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: clamp(18px, 2.4vw, 48px) !important;
    padding-right: clamp(18px, 2.4vw, 48px) !important;
    box-sizing: border-box !important;
  }
  .ec-item-page.ec-item-page-wide > .ec-item-breadcrumb,
  .ec-item-page.ec-item-page-wide > .ec-item-layout,
  .ec-item-page.ec-item-page-wide > .ec-recommendations {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box !important;
  }

  /* Tablets: prevent a cramped three-column product layout. */
  @media (min-width: 769px) and (max-width: 1080px) {
    .ec-item-page.ec-item-page-wide {
      padding-left: 22px !important;
      padding-right: 22px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-layout {
      display: grid !important;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) !important;
      align-items: start !important;
      gap: 22px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery {
      grid-column: 1 !important;
      grid-row: 1 / span 2 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-info,
    .ec-item-page.ec-item-page-wide .ec-buy-panel {
      grid-column: 2 !important;
      width: 100% !important;
      min-width: 0 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-info { grid-row: 1 !important; }
    .ec-item-page.ec-item-page-wide .ec-buy-panel { grid-row: 2 !important; position: static !important; }
  }


  /* DESKTOP THUMBNAIL RAIL FIX
     The older site-wide stylesheet fixes the thumbnail column at ~50px.
     Enlarging only the button made its sides disappear under that narrow rail
     (the top and bottom of the active border were all that remained visible).
     Grow the *gallery grid track and the thumbnail rail together*. */
  @media (min-width: 769px) {
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-item-gallery {
      --ec-item-thumb-rail-width: clamp(100px, 9vw, 136px);
      display: grid !important;
      grid-template-columns: var(--ec-item-thumb-rail-width) minmax(0, 1fr) !important;
      grid-template-rows: auto auto !important;
      align-items: start !important;
      justify-items: stretch !important;
      gap: 10px 14px !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: visible !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-thumbs {
      grid-column: 1 !important;
      grid-row: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      flex: none !important;
      gap: 10px !important;
      width: var(--ec-item-thumb-rail-width) !important;
      min-width: var(--ec-item-thumb-rail-width) !important;
      max-width: var(--ec-item-thumb-rail-width) !important;
      max-height: min(650px, 75vh) !important;
      margin: 0 !important;
      padding: 2px !important;
      box-sizing: border-box !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      scrollbar-width: thin;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-thumbs > button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      height: clamp(106px, 9.2vw, 132px) !important;
      min-height: clamp(106px, 9.2vw, 132px) !important;
      max-height: clamp(106px, 9.2vw, 132px) !important;
      margin: 0 !important;
      padding: 6px !important;
      box-sizing: border-box !important;
      border: 2px solid #e9d8c8 !important;
      border-radius: 10px !important;
      background: #fff !important;
      overflow: hidden !important;
      cursor: pointer;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-thumbs > button.selected {
      border-color: #16a5cb !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-thumbs > button:focus-visible {
      outline: 2px solid #16a5cb !important;
      outline-offset: -2px;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-main-media {
      grid-column: 2 !important;
      grid-row: 1 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-media-count {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
    }
  }
  /* All viewport sizes: show the entire photo, even tall pooja idols. */
  .ec-item-page.ec-item-page-wide .ec-item-thumbs > button > img {
    display: block !important;
    position: static !important;
    inset: auto !important;
    flex: 0 1 auto !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 100% !important;
    max-height: 100% !important;
    aspect-ratio: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    object-fit: contain !important;
    object-position: center center !important;
    transform: none !important;
  }

  /* Desktop: same compact, gold-bordered recommendation tiles as the mobile reference.
     Intentionally fixed tile width so old shared styles cannot stretch the cards. */
  @media (min-width: 769px) {
    .ec-item-page.ec-item-page-wide > .ec-recommendations {
      min-width: 0 !important;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      gap: 12px !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 4px 2px 14px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scroll-behavior: smooth;
      scroll-snap-type: x proximity;
      overscroll-behavior-x: contain;
      scrollbar-width: thin;
      scrollbar-color: #d9b58d transparent;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      gap: 0 !important;
      flex: 0 0 clamp(128px, 10.5vw, 148px) !important;
      width: clamp(128px, 10.5vw, 148px) !important;
      min-width: clamp(128px, 10.5vw, 148px) !important;
      max-width: clamp(128px, 10.5vw, 148px) !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 7px !important;
      box-sizing: border-box !important;
      border: 1px solid #e4c8a5 !important;
      border-radius: 10px !important;
      background: #fff !important;
      box-shadow: none !important;
      color: #291a1c !important;
      text-decoration: none !important;
      overflow: hidden !important;
      scroll-snap-align: start;
      transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item:hover {
      border-color: #8a2938 !important;
      box-shadow: 0 4px 12px rgba(90, 32, 44, .09) !important;
      transform: translateY(-2px);
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item:focus-visible {
      outline: 2px solid #8a2938 !important;
      outline-offset: 2px;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item > .ec-related-image {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      height: clamp(98px, 8.2vw, 120px) !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 0 7px !important;
      padding: 4px !important;
      box-sizing: border-box !important;
      border: 0 !important;
      border-radius: 7px !important;
      background: #faf8f5 !important;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item > .ec-related-image > img {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      margin: 0 !important;
      object-fit: contain !important;
      object-position: center center !important;
      transform: none !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item > .ec-related-name {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      line-clamp: 2;
      flex: 0 0 auto !important;
      align-self: stretch !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: 2.8em !important;
      margin: 0 0 5px !important;
      padding: 0 !important;
      font-size: 11px !important;
      font-weight: 650 !important;
      line-height: 1.4 !important;
      overflow-wrap: anywhere;
      overflow: hidden !important;
      color: #501d29 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item > .ec-related-price {
      display: flex !important;
      align-items: baseline !important;
      flex-wrap: wrap !important;
      gap: 2px 4px !important;
      flex: 0 0 auto !important;
      align-self: stretch !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 15px !important;
      font-weight: 750 !important;
      line-height: 1.35 !important;
      color: #541526 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item > .ec-related-price > span {
      font-size: 10px !important;
      font-weight: 650 !important;
      line-height: 1.25 !important;
      color: #9c2235 !important;
    }
  }

  @media (max-width: 768px) {
    .ec-item-page.ec-item-page-wide {
      padding: 12px 16px 32px !important;
      overflow-x: clip !important;
    }
    .ec-item-page.ec-item-page-wide *,
    .ec-item-page.ec-item-page-wide *::before,
    .ec-item-page.ec-item-page-wide *::after {
      box-sizing: border-box !important;
    }

    /* Breadcrumb: short single row that doesn't force page-level sideways scrolling. */
    .ec-item-page.ec-item-page-wide > .ec-item-breadcrumb {
      display: flex !important;
      align-items: center !important;
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
      gap: 7px !important;
      min-height: 22px;
      margin-bottom: 12px !important;
      padding: 0 1px 3px !important;
      font-size: 12px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
    }
    .ec-item-page.ec-item-page-wide > .ec-item-breadcrumb::-webkit-scrollbar { display: none; }
    .ec-item-page.ec-item-page-wide > .ec-item-breadcrumb > * { flex-shrink: 0; }

    /* Force one vertical product layout regardless of the desktop stylesheet. */
    .ec-item-page.ec-item-page-wide .ec-item-layout {
      display: flex !important;
      flex-direction: column !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 16px !important;
      width: 100% !important;
      min-width: 0 !important;
      align-items: stretch !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-item-gallery,
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-item-info,
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-buy-panel {
      display: block;
      grid-column: 1 !important;
      grid-row: auto !important;
      flex: none !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      margin: 0 !important;
      position: static !important;
      inset: auto !important;
      transform: none !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-item-gallery {
      order: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 11px !important;
      padding: 10px !important;
      border: 1px solid #e9d9c7 !important;
      border-radius: 14px !important;
      background: #fff !important;
      overflow: hidden !important;
      box-shadow: none !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-main-media {
      order: 1 !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      width: 100% !important;
      max-width: 100% !important;
      height: clamp(255px, 85vw, 405px) !important;
      min-height: 0 !important;
      max-height: none !important;
      aspect-ratio: auto !important;
      margin: 0 !important;
      padding: 12px !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 11px !important;
      background: #faf9f7 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-main-media > img,
    .ec-item-page.ec-item-page-wide .ec-item-main-media > video {
      position: static !important;
      inset: auto !important;
      display: block !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-height: 100% !important;
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      object-fit: contain !important;
      object-position: center center !important;
      transform: none !important;
      border-radius: 7px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-main-media > video {
      background: #111 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-main-media > .ec-item-no-image,
    .ec-item-page.ec-item-page-wide .ec-item-main-media > .ec-item-document {
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
      text-align: center;
    }
    /* Put photos/videos under the main photo in a swipeable thumbnail strip. */
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-thumbs {
      order: 2 !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      gap: 9px !important;
      align-items: center !important;
      justify-content: flex-start !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 2px 0 6px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scrollbar-width: thin;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 106px !important;
      width: 106px !important;
      min-width: 106px !important;
      max-width: 106px !important;
      height: 90px !important;
      min-height: 90px !important;
      max-height: 90px !important;
      padding: 5px !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      border-radius: 9px !important;
      background: #fff !important;
      scroll-snap-align: start;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button.selected {
      border: 2px solid #7b2030 !important;
      box-sizing: border-box !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      border-radius: 5px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button > span {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      font-size: 14px !important;
      line-height: 1.1 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button small { font-size: 10px !important; }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-media-count {
      order: 3 !important;
      width: 100% !important;
      text-align: center !important;
      font-size: 11px !important;
      margin: 0 !important;
    }

    /* Product name, prices, variant choices and details become readable full-width blocks. */
    .ec-item-page.ec-item-page-wide .ec-item-info {
      order: 2 !important;
      padding: 0 1px !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-info > h1 {
      margin: 2px 0 10px !important;
      font-size: clamp(20px, 5.7vw, 27px) !important;
      font-weight: 750 !important;
      line-height: 1.23 !important;
      letter-spacing: -.02em;
      overflow-wrap: anywhere;
    }
    .ec-item-page.ec-item-page-wide .ec-brand,
    .ec-item-page.ec-item-page-wide .ec-category {
      margin-bottom: 9px !important;
      font-size: 13px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-price-panel {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 12px 0 15px !important;
      padding: 13px 14px !important;
      border: 1px solid #efdfd0 !important;
      border-radius: 11px !important;
      background: #fffaf6 !important;
      box-shadow: none !important;
    }
    .ec-item-page.ec-item-page-wide .ec-price-main {
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
      font-size: clamp(26px, 7.7vw, 34px) !important;
      line-height: 1.17 !important;
      color: #611726 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-price-main > span:last-child {
      font-weight: 800 !important;
      color: #611726 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-discount {
      font-size: 15px !important;
      font-weight: 700 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-mrp {
      margin: 5px 0 !important;
      font-size: 12px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-tax-note {
      margin: 6px 0 0 !important;
      font-size: 11px !important;
      line-height: 1.4 !important;
    }
    .ec-item-page.ec-item-page-wide .rv-shop-options,
    .ec-item-page.ec-item-page-wide .ec-offers,
    .ec-item-page.ec-item-page-wide .ec-about,
    .ec-item-page.ec-item-page-wide .ec-warranty,
    .ec-item-page.ec-item-page-wide .ec-item-documents {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 13px 0 !important;
      padding: 14px !important;
      border-radius: 11px !important;
      overflow-wrap: anywhere;
    }
    .ec-item-page.ec-item-page-wide .rv-shop-options h2,
    .ec-item-page.ec-item-page-wide .ec-offers h2,
    .ec-item-page.ec-item-page-wide .ec-about h2,
    .ec-item-page.ec-item-page-wide .ec-warranty h2,
    .ec-item-page.ec-item-page-wide .ec-item-documents h2 {
      margin: 0 0 11px !important;
      font-size: 16px !important;
      line-height: 1.35 !important;
    }
    .ec-item-page.ec-item-page-wide .rv-shop-option { min-width: 0 !important; margin-bottom: 11px !important; }
    .ec-item-page.ec-item-page-wide .rv-swatch-list {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-x: visible !important;
    }
    .ec-item-page.ec-item-page-wide .rv-swatch-list button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      min-height: 42px !important;
      max-width: 100% !important;
      padding: 8px 12px !important;
      border-radius: 8px !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      font-size: 12px !important;
    }
    .ec-item-page.ec-item-page-wide .rv-variant-summary {
      font-size: 12px !important;
      line-height: 1.6 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-offer-list {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 9px !important;
      min-width: 0 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-offer-card {
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-wrap: anywhere;
    }
    .ec-item-page.ec-item-page-wide .ec-trust-row {
      display: flex !important;
      align-items: stretch !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 12px 0 !important;
      overflow: visible !important;
    }
    .ec-item-page.ec-item-page-wide .ec-trust-row > span {
      flex: 1 1 135px !important;
      min-width: 0 !important;
      padding: 9px !important;
      border-radius: 7px !important;
      font-size: 11px !important;
      line-height: 1.4 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-spec-table {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 13px 0 !important;
      overflow-x: auto !important;
      border-collapse: collapse !important;
      font-size: 12px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-spec-table th,
    .ec-item-page.ec-item-page-wide .ec-spec-table td {
      min-width: 0 !important;
      padding: 9px !important;
      word-break: break-word !important;
      white-space: normal !important;
      vertical-align: top !important;
    }
    .ec-item-page.ec-item-page-wide .ec-spec-table th { width: 37% !important; }
    .ec-item-page.ec-item-page-wide .ec-about p,
    .ec-item-page.ec-item-page-wide .ec-about li { font-size: 13px !important; line-height: 1.7 !important; }

    /* Purchase controls: no desktop sticky sidebar or narrow buttons on mobile. */
    .ec-item-page.ec-item-page-wide .ec-item-layout > .ec-buy-panel {
      order: 3 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
      padding: 16px !important;
      border: 1px solid #e8d2b9 !important;
      border-radius: 14px !important;
      background: #fff !important;
      box-shadow: 0 3px 14px rgba(70, 20, 29, .045) !important;
      overflow: visible !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-price {
      font-size: 26px !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
      color: #631928 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-date,
    .ec-item-page.ec-item-page-wide .ec-delivery-note,
    .ec-item-page.ec-item-page-wide .ec-buy-stock {
      margin: 1px 0 !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-quantity {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      width: 100% !important;
      margin: 3px 0 6px !important;
      font-size: 13px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-quantity select {
      min-width: 80px !important;
      min-height: 42px !important;
      padding: 8px 10px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-panel > .ec-add-btn,
    .ec-item-page.ec-item-page-wide .ec-buy-panel > .ec-buy-btn {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: 48px !important;
      margin: 0 !important;
      padding: 11px 14px !important;
      border-radius: 999px !important;
      font-weight: 750 !important;
      font-size: 14px !important;
      text-align: center !important;
      line-height: 1.3 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-panel > .ec-add-btn {
      border: 1px solid #711c2c !important;
      background: #711c2c !important;
      color: #fff !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-panel > .ec-buy-btn {
      border: 1px solid #711c2c !important;
      background: #fff7ed !important;
      color: #711c2c !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-panel > button:disabled { opacity: .5 !important; cursor: not-allowed !important; }
    .ec-item-page.ec-item-page-wide .ec-buy-meta {
      display: grid !important;
      grid-template-columns: minmax(85px, 34%) minmax(0, 1fr) !important;
      gap: 6px 9px !important;
      width: 100% !important;
      max-width: 100% !important;
      margin-top: 9px !important;
      font-size: 12px !important;
      overflow-wrap: anywhere;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-meta dt,
    .ec-item-page.ec-item-page-wide .ec-buy-meta dd {
      margin: 0 !important;
      width: auto !important;
      min-width: 0 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-login { font-size: 11px !important; line-height: 1.5 !important; }

    /* Compact related products: show THREE complete bordered cards in a row. */
    .ec-item-page.ec-item-page-wide > .ec-recommendations {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 23px 0 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-heading {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      margin: 0 0 12px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-heading h2 {
      min-width: 0 !important;
      margin: 0 !important;
      font-size: clamp(16px, 4.5vw, 20px) !important;
      line-height: 1.3 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-heading button {
      min-width: 28px !important;
      min-height: 30px !important;
      padding: 2px 7px !important;
      flex-shrink: 0 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller {
      --related-card-gap: 8px;
      --related-visible-count: 3;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      gap: var(--related-card-gap) !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 2px 1px 12px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scroll-behavior: smooth;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      scrollbar-width: thin;
      scrollbar-color: #d9b58d transparent;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      flex: 0 0 calc((100% - (var(--related-visible-count) - 1) * var(--related-card-gap)) / var(--related-visible-count)) !important;
      width: calc((100% - (var(--related-visible-count) - 1) * var(--related-card-gap)) / var(--related-visible-count)) !important;
      min-width: 0 !important;
      max-width: none !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 7px !important;
      border: 1px solid #e4c8a5 !important;
      border-radius: 10px !important;
      background: #fff !important;
      box-shadow: none !important;
      color: #291a1c !important;
      text-decoration: none !important;
      scroll-snap-align: start;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-scroller > .ec-related-item:focus-visible {
      outline: 2px solid #7a1d30 !important;
      outline-offset: -2px;
    }
    .ec-item-page.ec-item-page-wide .ec-related-image {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      height: clamp(79px, 25vw, 100px) !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 0 7px !important;
      padding: 3px !important;
      border-radius: 7px !important;
      background: #faf8f5 !important;
      overflow: hidden !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-image > img {
      display: block !important;
      position: static !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-image > .ec-product-no-photo {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      padding: 4px !important;
      text-align: center !important;
      font-size: 10px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-name {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      line-clamp: 2;
      flex: 0 0 auto !important;
      min-height: 2.8em !important;
      max-height: 2.8em !important;
      width: 100% !important;
      margin: 0 0 5px !important;
      padding: 0 !important;
      overflow: hidden !important;
      font-size: 11px !important;
      font-weight: 650 !important;
      line-height: 1.4 !important;
      overflow-wrap: anywhere;
      color: #501d29 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-price {
      display: flex !important;
      align-items: baseline !important;
      flex-wrap: wrap !important;
      gap: 2px 4px !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 15px !important;
      font-weight: 750 !important;
      line-height: 1.35 !important;
      color: #541526 !important;
    }
    .ec-item-page.ec-item-page-wide .ec-related-price > span {
      font-size: 10px !important;
      line-height: 1.25 !important;
      font-weight: 650 !important;
      color: #9c2235 !important;
    }

  }

  /* Wider phones / small tablets show FOUR related product cards at once. */
  @media (min-width: 440px) and (max-width: 768px) {
    .ec-item-page.ec-item-page-wide .ec-related-scroller {
      --related-visible-count: 4;
      --related-card-gap: 10px;
    }
    .ec-item-page.ec-item-page-wide .ec-related-image {
      height: clamp(82px, 17vw, 112px) !important;
    }
  }

  @media (max-width: 380px) {
    .ec-item-page.ec-item-page-wide { padding: 10px 12px 28px !important; }
    .ec-item-page.ec-item-page-wide .ec-item-gallery { padding: 8px !important; }
    .ec-item-page.ec-item-page-wide .ec-item-gallery > .ec-item-main-media {
      height: clamp(240px, 82vw, 330px) !important;
    }
    .ec-item-page.ec-item-page-wide .ec-item-thumbs > button {
      flex-basis: 96px !important;
      width: 96px !important;
      min-width: 96px !important;
      max-width: 96px !important;
      height: 84px !important;
      min-height: 84px !important;
      max-height: 84px !important;
    }
    .ec-item-page.ec-item-page-wide .ec-buy-panel { padding: 13px !important; }
  }
`;

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
type Offer = { code: string; product_ids: string[]; discount_type: string; discount_value: number; minimum_order_amount: number; applicable_to?: string };
type RelatedProduct = { item: CatalogItem; category: CatalogCategory; priority: number };
const detailPath = (_c: CatalogCategory, item: CatalogItem) => productDetailHref(item.id);
const imageOf = (item: CatalogItem) => item.image_url || item.media?.find(m => m.type === "image")?.url || "";
function comparePrice(item: CatalogItem) { return Math.max(Number(item.price) || 0, Number(item.compare_price) || 0, Number(item.regular_price) || 0); }
function discountPercent(item: CatalogItem) { const mrp = comparePrice(item), price = Number(item.price) || 0; return mrp > price && price >= 0 ? Math.round((mrp - price) / mrp * 100) : 0; }
function ProductImage({ item, className = "" }: { item: CatalogItem; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = imageOf(item);
  useEffect(() => setFailed(false), [image]);
  return image && !failed ? <img className={className} src={image} alt={item.name} loading="lazy" onError={() => setFailed(true)} /> : <div className="ec-product-no-photo">Image coming soon</div>;
}
export function ItemPage() {
  const { categorySlug, itemSlug, itemId } = useParams();
  const navigate = useNavigate();
  const location=useLocation();
  const initialVariantId=new URLSearchParams(location.search).get("variant")||"";
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const relatedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/react/api/catalog/categories`, { signal: controller.signal, cache: "no-store" }).then(async r => { if (!r.ok) throw new Error("Product catalogue unavailable"); return r.json(); }),
      fetch(`${BASE}/react/api/store/product-offers`, { signal: controller.signal, cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([catalog, offerData]) => {
      setCategories(Array.isArray(catalog.categories) ? catalog.categories : []);
      setOffers(Array.isArray(offerData.offers) ? offerData.offers : []);
      setError("");
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load product"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { setSelectedMedia(""); setSelectedVariantId(""); setQuantity(1); setAdded(false); setError(""); window.scrollTo?.({ top: 0, behavior: "auto" }); }, [categorySlug, itemSlug, itemId, location.search]);
  const matched = useMemo(() => findCatalogDetail(categories, { itemId, categorySlug, itemSlug }),
    [categories, itemId, categorySlug, itemSlug]);
  const category = matched?.category;
  const item = matched?.item;
  // Prefer a stocked option on first visit. A customer may still explicitly
  // select an out-of-stock color/size to see that specific variant.
  const selectedVariant = item?.variants?.find(v=>v.id===(selectedVariantId || initialVariantId || itemId))
    || item?.variants?.find(v=>Number(v.stock_quantity)>0)
    || item?.variants?.[0];
  const variantAttributes = item?.variants ? Array.from(new Set(item.variants.flatMap(v=>['color','size','material','capacity','style','weight','model'].filter(key=>Boolean((v as unknown as Record<string,unknown>)[key]))))) : [];
  const variantItem: CatalogItem | undefined = item && selectedVariant ? {...item,...selectedVariant,id:selectedVariant.id,image_url:selectedVariant.image_url || item.image_url,
    name:`${item.name} — ${variantAttributes.map(a=>String((selectedVariant as unknown as Record<string,unknown>)[a] || '')).filter(Boolean).join(' / ')}`,
    stock_quantity:selectedVariant.stock_quantity,price:selectedVariant.price,delivery_extra_fee:selectedVariant.delivery_extra_fee ?? item.delivery_extra_fee} : item;
  const chooseVariant = (attr:string,value:string) => {
    if(!item?.variants?.length)return;
    const selected = selectedVariant;
    const compatible = item.variants.find(v=>String((v as unknown as Record<string,unknown>)[attr]||'')===value &&
      variantAttributes.every(other=>other===attr || !(selected as unknown as Record<string,unknown>)?.[other] ||
        (v as unknown as Record<string,unknown>)[other]===(selected as unknown as Record<string,unknown>)[other]));
    const next = compatible || item.variants.find(v=>String((v as unknown as Record<string,unknown>)[attr]||'')===value);
    if(next){setSelectedVariantId(next.id);setSelectedMedia(next.image_url || '');setQuantity(1);setAdded(false);}
  };
  const media = useMemo(() => {
    if (!item) return [];
    const files: ProductMedia[] = [...(item.media || [])];
    for(const v of item.variants || []) if(v.image_url && !files.some(m=>m.url===v.image_url)) files.push({type:'image',url:v.image_url,name:[v.color,v.size].filter(Boolean).join(' / ') || 'Variant photo'});
    if (item.image_url) {
      const cover = files.find(f => f.url === item.image_url);
      const remainder = files.filter(f => f.url !== item.image_url);
      files.splice(0, files.length, cover || { type: "image", url: item.image_url, name: item.name }, ...remainder);
    }
    return files.filter(f => Boolean(f.url));
  }, [item]);
  const active = media.find(x => x.url === selectedMedia) || (selectedVariant?.image_url ? {type:'image' as const,url:selectedVariant.image_url,name:'Selected color'} : undefined) || media[0];
  const recommendations = useMemo(() => {
    if (!category || !item) return [];
    const categoryParent = category.parent_id || category.id;
    const related: RelatedProduct[] = [];
    for (const cat of categories) for (const other of cat.items || []) {
      if (other.id === item.id || other.is_active === false) continue;
      const sameCategory = cat.id === category.id;
      const sameGroup = !!item.group_name && item.group_name.toLowerCase() === (other.group_name || "").toLowerCase();
      const sameParent = (cat.parent_id || cat.id) === categoryParent;
      if (sameCategory || sameGroup || sameParent) related.push({ item: other, category: cat, priority: sameGroup ? 0 : sameCategory ? 1 : 2 });
    }
    return related.sort((a, b) => a.priority - b.priority || a.item.name.localeCompare(b.item.name)).slice(0, 18);
  }, [categories, item, category]);
  const price = Number(variantItem?.price) || 0;
  const mrp = variantItem ? comparePrice(variantItem) : 0;
  const off = variantItem ? discountPercent(variantItem) : 0;
  const stock = Math.max(0, Number(variantItem?.stock_quantity) || 0);
  const maxQuantity = Math.min(99, stock);
  const highlights = (item?.highlights || "").split(/\r?\n/).map(s => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  const specifications = (item?.specifications || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => { const index = s.indexOf(":"); return index >= 0 ? [s.slice(0, index).trim(), s.slice(index + 1).trim()] : ["Detail", s]; });
  const validOffers = item ? offers.filter(x => x.applicable_to === "all" || x.applicable_to === "catalogue" || x.product_ids.includes(item.id)) : [];
  const add = async (goToCheckout = false) => {
    if (!variantItem || !stock || quantity > stock) return;
    setBusy(true); setError(""); setAdded(false);
    try { await addProductToCart(variantItem, quantity); setAdded(true); if (goToCheckout) navigate("/store/checkout"); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to add product to cart"); }
    finally { setBusy(false); }
  };
  return <main className="ec-item-page ec-item-page-wide">
    <style>{ITEM_PAGE_SPACING_CSS}</style>
    <nav className="ec-item-breadcrumb" aria-label="Breadcrumb"><Link to="/categories">Store</Link><span>›</span>{category && <><Link to={`/categories/${encodeURIComponent(category.slug)}`}>{category.name}</Link><span>›</span></>}{item?.group_name && <><span>{item.group_name}</span><span>›</span></>}{item?.name || "Product"}</nav>
    {loading ? <p className="ec-item-state">Loading product details…</p> : !item || !category ? <section className="ec-item-state" role="alert">{error || "This product link is no longer valid or the product is inactive. Browse the current catalogue for available items."} <Link to="/categories">Browse products</Link></section> : <>
      <div className="ec-item-layout">
        <section className="ec-item-gallery" aria-label="Product images and videos">
          <div className="ec-item-thumbs" aria-label="Select product media">{media.map((m, idx) => <button key={`${m.url}-${idx}`} type="button" className={active?.url === m.url ? "selected" : ""} onClick={() => setSelectedMedia(m.url)} aria-label={`Show ${m.type} ${idx + 1}`} aria-pressed={active?.url === m.url}>
            {m.type === "image" ? <img src={m.url} alt="" loading="lazy" /> : m.type === "video" ? <span>▶<small>Video</small></span> : <span>▤<small>File</small></span>}</button>)}</div>
          <div className="ec-item-main-media">
            {active?.type === "image" ? <><img key={active.url} src={active.url} alt={item.name} onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement?.classList.add("ec-media-failed"); }} /></> : active?.type === "video" ? <video key={active.url} src={active.url} controls playsInline preload="metadata" /> : active ? <a href={active.url} className="ec-item-document" rel="noopener noreferrer" target="_blank">Open {active.name || "product document"}</a> : <div className="ec-item-no-image">Photo coming soon</div>}
          </div>
          {media.length > 1 && <div className="ec-item-media-count">{media.filter(m => m.type === "image").length} photos · {media.filter(m => m.type === "video").length} videos</div>}
        </section>
        <section className="ec-item-info">
          <h1>{item.name}</h1>
          {item.brand && <p className="ec-brand">Brand: <strong>{item.brand}</strong></p>}
          {item.group_name && <Link className="ec-category" to={`/categories/${encodeURIComponent(category.slug)}?group=${encodeURIComponent(item.group_name)}`}>{item.group_name}</Link>}
          <div className="ec-item-price-panel"><div className="ec-price-main">{off > 0 && <span className="ec-discount">-{off}%</span>}<span>₹{productMoney(price)}</span></div>{mrp > price && <p className="ec-mrp">M.R.P.: <s>₹{productMoney(mrp)}</s></p>}<p className="ec-tax-note">Final shipping and taxes are calculated at checkout.</p></div>
          {variantAttributes.length > 0 && <section className="rv-shop-options" aria-label="Choose product variation"><h2>Choose color, size &amp; options</h2>
            {variantAttributes.map(attr=> <div className="rv-shop-option" key={attr}><strong>{attr[0].toUpperCase()+attr.slice(1)}</strong><div className="rv-swatch-list">
              {Array.from(new Set((item?.variants||[]).map(v=>String((v as unknown as Record<string,unknown>)[attr]||'')).filter(Boolean))).map(value=>
                <button key={value} type="button" className={String((selectedVariant as unknown as Record<string,unknown>)?.[attr]||'')===value?'selected':''} onClick={()=>chooseVariant(attr,value)} aria-pressed={String((selectedVariant as unknown as Record<string,unknown>)?.[attr]||'')===value}>
                  {attr==='color' && <span className="rv-color-dot" style={{backgroundColor:/^[#a-zA-Z0-9(), .%-]+$/.test(value)?value:'#ddd'}}/>}{value}</button>)}
            </div></div>)}
            <p className="rv-variant-summary">Selected variant: <strong>{variantAttributes.map(a=>String((selectedVariant as unknown as Record<string,unknown>)?.[a]||'')).filter(Boolean).join(' / ')}</strong> · ₹{productMoney(price)} · {stock} in stock</p>
          </section>}
          {validOffers.length > 0 && <div className="ec-offers"><h2>🏷 Available coupons</h2><div className="ec-offer-list">{validOffers.map(o => <div key={o.code} className="ec-offer-card"><strong>{o.code}</strong><span>{o.discount_type === "fixed" ? `₹${productMoney(o.discount_value)}` : `${o.discount_value}%`} off with code</span><small>Apply at checkout{o.minimum_order_amount > 0 ? ` · Min. ₹${productMoney(o.minimum_order_amount)}` : ""}</small></div>)}</div></div>}
          <div className="ec-trust-row"><span>🔒 Secure checkout</span><span>📦 Estimated {estimatedDelivery(item.delivery_days)}</span>{Number(item.return_days) > 0 && <span>↩ {item.return_days}-day returns</span>}</div>
          {specifications.length > 0 && <table className="ec-spec-table"><tbody>{specifications.map(([key, value], idx) => <tr key={idx}><th scope="row">{key}</th><td>{value}</td></tr>)}</tbody></table>}
          <div className="ec-about"><h2>About this item</h2>{highlights.length ? <ul>{highlights.map((line, index) => <li key={index}>{line}</li>)}</ul> : item.description ? <p>{item.description}</p> : <p>Product details will be added soon.</p>}</div>
          {item.warranty && <div className="ec-warranty"><h2>Warranty and support</h2><p>{item.warranty}</p></div>}
          {media.some(m => m.type === "document") && <div className="ec-item-documents"><h2>Product documents</h2>{media.filter(m => m.type === "document").map((m, i) => <a key={`${m.url}-${i}`} target="_blank" rel="noopener noreferrer" href={m.url}>📄 {m.name || "Document"}</a>)}</div>}
        </section>
        <aside className="ec-buy-panel" aria-label="Purchase product"><div className="ec-buy-price">₹{productMoney(price)}</div><p className="ec-buy-date">Estimated delivery <strong>{estimatedDelivery(item.delivery_days)}</strong></p><p className="ec-delivery-note">Based on ordering today. Actual delivery may change at checkout.</p>{Number(variantItem?.delivery_extra_fee || 0) > 0 && <p className="ec-delivery-note"><strong>Extra handling fee: ₹{productMoney(Number(variantItem?.delivery_extra_fee))} per unit.</strong> This may be waived if the order qualifies under current delivery settings.</p>}<p className={stock > 0 ? "ec-buy-stock in-stock" : "ec-buy-stock"}>{stock > 0 ? `In stock (${stock} available)` : "Out of stock"}</p>
          <label className="ec-buy-quantity">Quantity <select value={Math.min(quantity, Math.max(1, maxQuantity))} disabled={!stock} onChange={e => setQuantity(Number(e.target.value))}>{Array.from({ length: maxQuantity }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" className="ec-add-btn" disabled={!stock || busy} onClick={() => void add()}>{busy ? "Adding…" : "Add to Cart"}</button>
          <button type="button" className="ec-buy-btn" disabled={!stock || busy} onClick={() => void add(true)}>Buy Now</button>
          {added && <p role="status" className="ec-item-success">Added to cart. <Link to="/store/cart">View cart</Link></p>}{error && <p role="alert" className="ec-item-error">{error}</p>}
          <dl className="ec-buy-meta"><dt>Ships from</dt><dd>EasyFindStore</dd><dt>Sold by</dt><dd>EasyFindStore</dd><dt>Payment</dt><dd>Secure checkout</dd>{variantItem?.sku && <><dt>SKU</dt><dd>{variantItem.sku}</dd></>}</dl>
          <p className="ec-buy-login">You can add items without signing in. Login or register only at checkout.</p>
        </aside>
      </div>
      {recommendations.length > 0 && <section className="ec-recommendations" aria-label="Similar products"><div className="ec-related-heading"><h2>More items to explore</h2><div><button type="button" aria-label="Scroll recommendations left" onClick={() => relatedRef.current?.scrollBy({ left: -(relatedRef.current?.clientWidth || 320) * 0.9, behavior: "smooth" })}>‹</button><button type="button" aria-label="Scroll recommendations right" onClick={() => relatedRef.current?.scrollBy({ left: (relatedRef.current?.clientWidth || 320) * 0.9, behavior: "smooth" })}>›</button></div></div><div className="ec-related-scroller" ref={relatedRef}>{recommendations.map(({ item: other, category: cat }) => <Link key={other.id} className="ec-related-item" to={detailPath(cat, other)}><div className="ec-related-image"><ProductImage item={other}/></div><span className="ec-related-name">{other.name}</span><div className="ec-related-price">{discountPercent(other) > 0 && <span>-{discountPercent(other)}% </span>}₹{productMoney(other.price)}</div></Link>)}</div></section>}
    </>}
  </main>;
}
