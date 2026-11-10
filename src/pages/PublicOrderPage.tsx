/// <reference types="vite/client" />

import {
  memo,
  startTransition,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

import { getJwtAuthIdentity } from "../lib/jwtAuth";
import HeroNew from "../components/HeroNew";
import Marquee from "../components/Marquee";
import StartJourney from "../components/StartJourney";
import WhyChoose from "../components/WhyChoose";
import {
  reverseDeliveryLocation,
  suggestDeliveryLocations,
  type DeliveryLocation,
} from "../services/deliveryDispatchApi";
import DeliveryLocationsNew from "../components/DeliveryLocationsNew";
import DeliveryTimingsNew from "../components/DeliveryTimingsNew";
import FAQ from "../components/FAQ";
import HowItWorks from "../components/HowItWorks";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
const API_PREFIX = "/react/api/public-order";
const LOGIN_PATH = "/react/login";
const AUTH_SESSION_PATH = "/react/api/auth/session";
const CART_PATH = "/cart";
const CATALOG_PAGE_SIZE = 5;
const DEFAULT_LATITUDE = 17.385;
const DEFAULT_LONGITUDE = 78.4867;

const PUBLIC_CATALOG_CACHE_KEY = "fruveto:public-order-catalog:v5";
const PUBLIC_CURRENT_LOCATION_CACHE_KEY =
  "fruveto:public-order-current-location:v2";
const SHARED_HOME_LOCATION_CACHE_KEY = "fruveto:home-location:v3";
const PUBLIC_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_CATALOG_STALE_RENDER_MAX_MS = 30 * 60 * 1000;
const PUBLIC_CATALOG_BACKGROUND_REFRESH_MS = 60 * 1000;
const PUBLIC_CATALOG_RETRY_COOLDOWN_MS = 30 * 1000;
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCATION_LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;

type NoticeKind = "error" | "success" | "info";
type ProductKind = "juice" | "subscription";

interface AuthSessionPayload {
  success?: boolean;
  authenticated?: boolean;
  user?: unknown;
  current_user?: unknown;
  csrf_token?: string;
}

interface CommerceCartPayload {
  success?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  login_url?: string;
}

interface Notice {
  kind: NoticeKind;
  text: string;
}

interface JuiceItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  price: number;
  compare_price: number | null;
  sku: string;
  size: string;
  unit_label: string;
  is_featured: boolean;
}

interface JuiceCategory {
  id: string;
  serial_number?: number | string | null;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  items: JuiceItem[];
}

interface SubscriptionSubItem {
  id?: string;
  name: string;
  quantity: number;
  unit_label: string;
  catalog_price?: number | null;
}

interface ComplimentaryChoice {
  id: string;
  name: string;
  size: string;
  unit_label: string;
  catalog_price: number;
  image_url: string;
}

interface ComplimentaryConfig {
  max_items: number;
  budget: number;
}

interface SubscriptionCombination {
  id: string;
  name: string;
  description: string;
  catalog_item_ids: string[];
  sub_items: SubscriptionSubItem[];
}

interface SubscriptionScheduleEntry {
  id: string;
  scope: "weekday" | "date";
  weekday?: string;
  weekday_index?: number | null;
  schedule_date?: string;
  title: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

interface SubscriptionItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  detailed_description?: string;
  image_url: string;
  sku: string;
  unit_label: string;
  base_price: number;
  plan_prices: Record<string, unknown>;
  allowed_plan_codes: string[];
  minimum_custom_days: number;
  delivery_frequency: string;
  delivery_interval_days: number;
  included_items: SubscriptionSubItem[];
  complimentary_config: ComplimentaryConfig;
  complimentary_choices: ComplimentaryChoice[];
  catalog_combinations: SubscriptionCombination[];
  content_schedule?: {
    weekday_entries?: SubscriptionScheduleEntry[];
    date_entries?: SubscriptionScheduleEntry[];
  };
  delivery_exclusions?: {
    excluded_weekdays?: string[];
    excluded_dates?: Array<{ date: string; reason?: string }>;
  };
}

interface SubscriptionCategory {
  id: string;
  serial_number?: number | string | null;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  items: SubscriptionItem[];
}

interface PublicCoupon {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  applicable_to?: string;
}

interface CatalogPayload {
  success: boolean;
  message?: string;
  code?: string;
  registration_otp_required: boolean;
  location_required_for_catalog: boolean;
  juice_categories: JuiceCategory[];
  subscription_categories: SubscriptionCategory[];
  currency_symbol: string;
  currency_code: string;
  nearby_radius_km: number;
  coupon_enabled?: boolean;
  coupon_api_url?: string;
  active_coupon_count?: number;
  csrf_token: string;
}

interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: string[];
  csrf_token?: string;
}

interface AvailabilityPayload extends ApiErrorPayload {
  success: boolean;
  delivery_available: boolean;
  payment_available: boolean;
  payment_message: string;
  availability: {
    assignment_count: number;
    nearest_distance_km: number | null;
    available_quantity: number;
    nearby_seller_count: number;
    unfulfilled_items: Array<Record<string, unknown>>;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    is_subscription?: boolean;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    delivery_fee: number;
    total: number;
  };
  coupon?: PublicCoupon | null;
  coupon_message?: string;
  coupon_enabled?: boolean;
  currency_symbol: string;
  nearby_radius_km: number;
}

interface PublicOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  customer_name: string;
  user_email: string;
  items: Array<{
    item_id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    is_subscription: boolean;
    subscription_plan_code: string;
    subscription_start_date: string;
  }>;
  item_count: number;
  subtotal: number;
  discount?: number;
  coupon_code?: string;
  coupon?: PublicCoupon | null;
  delivery_fee: number;
  total: number;
  currency: string;
  delivery_address: Record<string, unknown>;
  created_at?: string;
  paid_at?: string;
  confirmation_email_status?: string;
}

interface RazorpayConfiguration {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

interface CreateOrderPayload extends ApiErrorPayload {
  success: boolean;
  payment_required: boolean;
  order: PublicOrder;
  public_order_token: string;
  razorpay: RazorpayConfiguration;
}

interface VerifyPaymentPayload extends ApiErrorPayload {
  success: boolean;
  order: PublicOrder;
  confirmation_email_queued: boolean;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
    reason?: string;
  };
}

interface LeafletMap {
  setView: (coordinates: [number, number], zoom: number) => LeafletMap;
  on: (
    event: "click",
    callback: (event: { latlng: { lat: number; lng: number } }) => void,
  ) => void;
  remove: () => void;
}

interface LeafletMarker {
  setLatLng: (coordinates: [number, number]) => LeafletMarker;
  addTo: (map: LeafletMap) => LeafletMarker;
}

interface LeafletNamespace {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => void };
  marker: (coordinates: [number, number]) => LeafletMarker;
}

declare global {
  interface Window {
    L?: LeafletNamespace;
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

interface CustomerForm {
  full_name: string;
  email: string;
  phone: string;
}

interface AddressForm {
  recipient_name: string;
  phone: string;
  alternate_phone: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: "home" | "work" | "other";
  latitude: number | null;
  longitude: number | null;
}

interface DeliveryLocationAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

type DeliveryLocationWithAddress = DeliveryLocation & {
  address?: DeliveryLocationAddress;
};

interface CheckoutSelection {
  kind: ProductKind;
  item_id: string;
  name: string;
  image_url: string;
  quantity: number;
  unit_label: string;
  price: number;
  plan_code: string;
  custom_days: number;
  start_date: string;
  combination_id: string;
  complimentary_item_ids: string[];
  subscription?: SubscriptionItem;
}

interface PendingPayment {
  order: PublicOrder;
  publicOrderToken: string;
  razorpay: RazorpayConfiguration;
}

const INITIAL_CUSTOMER: CustomerForm = {
  full_name: "",
  email: "",
  phone: "",
};

const INITIAL_ADDRESS: AddressForm = {
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
  latitude: null,
  longitude: null,
};

function addressPatchFromLocation(
  location: DeliveryLocation,
): Partial<AddressForm> {
  const enriched = location as DeliveryLocationWithAddress;
  const details = enriched.address || {};
  const displayName = (location.display_name || location.name || "").trim();
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const postalFromDisplay = parts.find((part) =>
    /^[1-9][0-9]{5}$/.test(part.replace(/\s/g, "")),
  );
  const postalIndex = postalFromDisplay
    ? parts.indexOf(postalFromDisplay)
    : -1;
  const guessedCountry = parts[parts.length - 1] || "India";
  const guessedState =
    postalIndex > 0
      ? parts[postalIndex - 1]
      : parts.length >= 2
        ? parts[parts.length - 2]
        : "";
  const guessedCity =
    postalIndex > 1
      ? parts[postalIndex - 2]
      : parts.length >= 3
        ? parts[parts.length - 3]
        : "";

  const city =
    details.city ||
    details.town ||
    details.village ||
    details.municipality ||
    details.county ||
    guessedCity;
  const state = details.state || details.state_district || guessedState;
  const postalCode = details.postcode || postalFromDisplay || "";
  const country = details.country || guessedCountry || "India";
  const primaryLine = [details.house_number, details.road]
    .filter(Boolean)
    .join(" ");
  const areaLine = [
    details.neighbourhood,
    details.suburb,
    details.city_district,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    address_line1: primaryLine || parts[0] || displayName,
    address_line2:
      areaLine ||
      parts
        .slice(1, Math.max(1, postalIndex > 1 ? postalIndex - 2 : parts.length - 3))
        .join(", "),
    city,
    state,
    postal_code: postalCode,
    country,
  };
}

// Juice card descriptions use the same safe Markdown renderer and compact
// four-line preview used by HomePage. Raw HTML is sanitized before rendering.
const PUBLIC_JUICE_INLINE_MARKDOWN_ELEMENTS = [
  "strong",
  "b",
  "em",
  "i",
  "u",
  "del",
  "s",
  "mark",
  "small",
  "sup",
  "sub",
  "code",
  "br",
  "span",
];

const PUBLIC_JUICE_REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize];
const PUBLIC_JUICE_RICH_TEXT_PATTERN =
  /<\/?[a-z][^>]*>|(?:^|\n)\s*(?:[-+*]|\d+\.)\s+|\[[^\]]+\]\([^)]+\)|[*_~`#>]/i;

type PublicJuiceRichTextValue = string | number | null | undefined;

function publicJuiceRichTextSource(
  value: PublicJuiceRichTextValue,
  fallback = "",
): string {
  const source = String(value ?? "").trim();
  return source || fallback;
}

function publicJuiceNeedsRichTextParsing(source: string): boolean {
  return PUBLIC_JUICE_RICH_TEXT_PATTERN.test(source);
}

const PublicJuiceInlineRichText = memo(function PublicJuiceInlineRichText({
  value,
  fallback = "",
}: {
  value: PublicJuiceRichTextValue;
  fallback?: string;
}) {
  const source = publicJuiceRichTextSource(value, fallback);

  if (!source) return null;

  if (!publicJuiceNeedsRichTextParsing(source)) {
    return <>{source}</>;
  }

  return (
    <ReactMarkdown
      rehypePlugins={PUBLIC_JUICE_REHYPE_PLUGINS}
      allowedElements={PUBLIC_JUICE_INLINE_MARKDOWN_ELEMENTS}
      unwrapDisallowed
    >
      {source}
    </ReactMarkdown>
  );
});

type PublicJuiceMarkdownSegment =
  | {
      type: "markdown";
      content: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    };

function splitPublicJuiceMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      current += character;
      continue;
    }

    if (character === "|") {
      cells.push(current.trim().replace(/\\\|/g, "|"));
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim().replace(/\\\|/g, "|"));
  return cells;
}

function isPublicJuiceMarkdownTableSeparator(line: string): boolean {
  if (!line.includes("|")) return false;

  const cells = splitPublicJuiceMarkdownTableRow(line);
  return (
    cells.length > 1 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")))
  );
}

function parsePublicJuiceMarkdownSegments(
  source: string,
): PublicJuiceMarkdownSegment[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const segments: PublicJuiceMarkdownSegment[] = [];
  let markdownLines: string[] = [];

  const flushMarkdown = () => {
    const content = markdownLines.join("\n").trim();

    if (content) {
      segments.push({
        type: "markdown",
        content,
      });
    }

    markdownLines = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];

    if (
      headerLine?.includes("|") &&
      separatorLine &&
      isPublicJuiceMarkdownTableSeparator(separatorLine)
    ) {
      const headers = splitPublicJuiceMarkdownTableRow(headerLine);
      const rows: string[][] = [];
      let rowIndex = index + 2;

      while (rowIndex < lines.length) {
        const candidate = lines[rowIndex];

        if (!candidate.trim() || !candidate.includes("|")) {
          break;
        }

        const cells = splitPublicJuiceMarkdownTableRow(candidate);

        if (cells.length < 2) {
          break;
        }

        rows.push(
          headers.map((_, cellIndex) => cells[cellIndex] ?? ""),
        );
        rowIndex += 1;
      }

      flushMarkdown();
      segments.push({
        type: "table",
        headers,
        rows,
      });

      index = rowIndex - 1;
      continue;
    }

    markdownLines.push(headerLine);
  }

  flushMarkdown();
  return segments;
}

const PublicJuiceBlockRichText = memo(function PublicJuiceBlockRichText({
  value,
  fallback = "",
}: {
  value: PublicJuiceRichTextValue;
  fallback?: string;
}) {
  const source = publicJuiceRichTextSource(value, fallback);

  if (!source) return null;

  const segments = parsePublicJuiceMarkdownSegments(source);
  const hasTable = segments.some((segment) => segment.type === "table");

  if (!hasTable && !publicJuiceNeedsRichTextParsing(source)) {
    return <p>{source}</p>;
  }

  if (!hasTable) {
    return (
      <ReactMarkdown rehypePlugins={PUBLIC_JUICE_REHYPE_PLUGINS}>
        {source}
      </ReactMarkdown>
    );
  }

  return (
    <>
      {segments.map((segment, segmentIndex) => {
        if (segment.type === "markdown") {
          return (
            <ReactMarkdown
              rehypePlugins={PUBLIC_JUICE_REHYPE_PLUGINS}
              key={`markdown-${segmentIndex}`}
            >
              {segment.content}
            </ReactMarkdown>
          );
        }

        return (
          <div
            className="public-order-juice-markdown-table-scroll"
            key={`table-${segmentIndex}`}
          >
            <table className="public-order-juice-markdown-table">
              <thead>
                <tr>
                  {segment.headers.map((header, headerIndex) => (
                    <th key={`header-${headerIndex}`}>
                      <PublicJuiceInlineRichText value={header} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segment.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`cell-${rowIndex}-${cellIndex}`}>
                        <PublicJuiceInlineRichText value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
});

function publicJuicePlainText(
  value: PublicJuiceRichTextValue,
  fallback = "Product",
): string {
  const source = publicJuiceRichTextSource(value, fallback);

  return (
    source
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_~`>#]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
}

interface PublicJuiceDescriptionProps {
  value: PublicJuiceRichTextValue;
  fallback?: string;
  title: string;
  meta?: string;
  imageUrl?: string;
}

const PublicJuiceProductDescription = memo(
  function PublicJuiceProductDescription({
    value,
    fallback = "Freshly prepared for you.",
    title,
    meta = "",
    imageUrl = "",
  }: PublicJuiceDescriptionProps) {
    const source = publicJuiceRichTextSource(value, fallback);
    const previewRef = useRef<HTMLDivElement | null>(null);
    const [canExpand, setCanExpand] = useState(false);
    const [open, setOpen] = useState(false);

    const updateOverflow = useCallback(() => {
      const element = previewRef.current;

      if (!element) {
        setCanExpand(false);
        return;
      }

      setCanExpand(element.scrollHeight > element.clientHeight + 2);
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") return;

      const frameId = window.requestAnimationFrame(updateOverflow);
      const element = previewRef.current;
      let resizeObserver: ResizeObserver | null = null;

      if (element && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateOverflow);
        resizeObserver.observe(element);
      }

      window.addEventListener("resize", updateOverflow);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", updateOverflow);
        resizeObserver?.disconnect();
      };
    }, [source, updateOverflow]);

    useEffect(() => {
      if (!open || typeof document === "undefined") return;

      const previousOverflow = document.body.style.overflow;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };

      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    const modalTitleId = `public-juice-description-${publicJuicePlainText(title)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "product"}`;

    const modal =
      open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="public-order-juice-description-modal-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <section
                className="public-order-juice-description-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
              >
                <header className="public-order-juice-description-modal-header">
                  <div className="public-order-juice-description-modal-title">
                    {meta ? <small>{meta}</small> : null}
                    <h3 id={modalTitleId}>{publicJuicePlainText(title)}</h3>
                  </div>

                  <button
                    className="public-order-juice-description-modal-close"
                    type="button"
                    aria-label="Close description"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </header>

                <div className="public-order-juice-description-modal-layout">
                  <div className="public-order-juice-description-modal-media">
                    {imageUrl ? (
                      <ProductImage
                        src={imageUrl}
                        alt={publicJuicePlainText(title)}
                      />
                    ) : (
                      <div
                        className="public-order-juice-description-modal-placeholder"
                        aria-hidden="true"
                      >
                        🧃
                      </div>
                    )}

                    {meta ? (
                      <span className="public-order-juice-description-modal-size">
                        {meta}
                      </span>
                    ) : null}
                  </div>

                  <div className="public-order-juice-description-modal-content">
                    <PublicJuiceBlockRichText value={source} />
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null;

    return (
      <div className="public-order-juice-description-shell">
        <div
          ref={previewRef}
          className="public-order-product-description public-order-juice-description-preview"
        >
          <PublicJuiceBlockRichText value={source} />
        </div>

        {canExpand ? (
          <button
            className="public-order-juice-description-view-more"
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
          >
            View More
          </button>
        ) : null}

        {modal}
      </div>
    );
  },
);

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
  .public-order-page{
    --public-order-page-gutter:clamp(10px,2vw,36px);
    width:100%;
    padding:40px 0 80px;
    background:#f7faf5;
    color:#173521;
    font-family:"EB Garamond";
    box-sizing:border-box;
  }
  .public-order-page *{box-sizing:border-box}
  .public-order-shell{
    width:100%;
    max-width:none;
    min-width:0;
    margin:0;
    padding-left:var(--public-order-page-gutter);
    padding-right:var(--public-order-page-gutter);
    box-sizing:border-box;
  }

  .public-order-page,
  .public-order-shell,
  .public-order-section,
  .public-order-catalog-block,
  .public-order-category,
  .public-order-homepage-sections {
    min-width:0;
    max-width:100%;
  }

  .public-order-eyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;color:#27864e;font-size:.75rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
  .public-order-eyebrow:before{content:"";width:28px;height:2px;background:#36a862}
  .public-order-section{margin-top:24px;padding:27px;border:1px solid #deeadc;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(33,74,38,.055)}
  .public-order-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:21px}
  .public-order-section-head h2{margin:0;font-family:"EB Garamond",Georgia,serif;font-size:clamp(1.8rem,3vw,2.55rem);letter-spacing:-.025em}
  .public-order-section-head p{max-width:660px;margin:6px 0 0;color:#6c796d;line-height:1.55}
  .public-order-number{display:grid;place-items:center;flex:0 0 auto;width:42px;height:42px;border-radius:13px;background:#e8f6e7;color:#1b7b40;font-weight:950}
  .public-order-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .public-order-field{display:grid;gap:7px}
  .public-order-field.span-2{grid-column:span 2}.public-order-field.span-3{grid-column:span 3}
  .public-order-field label{color:#314d38;font-size:.77rem;font-weight:850}
  .public-order-field input,.public-order-field select,.public-order-field textarea{width:100%;min-height:46px;box-sizing:border-box;padding:11px 13px;border:1px solid #d4e1d3;border-radius:12px;outline:none;background:#fbfdfb;color:#203d29;font:inherit;transition:.18s ease}
  .public-order-field textarea{min-height:88px;resize:vertical}
  .public-order-field input:focus,.public-order-field select:focus,.public-order-field textarea:focus{border-color:#5baa72;box-shadow:0 0 0 3px rgba(67,163,95,.12);background:#fff}
  .public-order-helper{color:#78847a;font-size:.72rem;line-height:1.45}
  .public-order-notice{margin:18px 0 0;padding:13px 15px;border-radius:12px;font-size:.86rem;font-weight:750;line-height:1.5}
  .public-order-notice.error{background:#fff0f0;color:#a12c36}.public-order-notice.success{background:#e9f9ed;color:#176d38}.public-order-notice.info{background:#fff7df;color:#795a10}
  .public-order-catalog-block{padding-top:2px}
  .public-order-catalog-block+.public-order-catalog-block{margin-top:34px;padding-top:30px;border-top:1px solid #dce7da}
  #catalogue{
    display:flex;
    flex-direction:column;
    padding:0;
    border:0;
    border-radius:0;
    background:transparent;
    box-shadow:none;
  }
  #catalogue #subscriptions{order:1;margin-top:0;padding-top:2px;border-top:0}
  #catalogue #juices{order:2;margin-top:clamp(26px,3vw,34px);padding-top:clamp(24px,3vw,30px);border-top:1px solid #dce7da}
  .public-order-catalog-block-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
  .public-order-catalog-block-head h3{margin:0;font-size:1.16rem}
  .public-order-catalog-block-head p{margin:4px 0 0;color:#7a867b;font-size:.8rem}
  .public-order-catalog-count{flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#eaf7e8;color:#247343;font-size:.72rem;font-weight:900}
  .public-order-category{margin-top:24px;content-visibility:auto;contain-intrinsic-size:auto 620px}.public-order-category:first-of-type{margin-top:0}
  .public-order-category-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:13px}
  .public-order-category h3{margin:0;font-size:1.13rem}.public-order-category p{margin:4px 0 0;color:#7a867b;font-size:.8rem}
  .public-order-product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
  .public-order-product{overflow:hidden;display:flex;flex-direction:column;border:1px solid #dce7da;border-radius:22px;background:#fff;transition:.2s ease;min-height:520px}
  .public-order-product:hover{transform:translateY(-4px);border-color:#7ebc89;box-shadow:0 18px 35px rgba(33,91,46,.12)}
  .public-order-product.selected{border-color:#279354;box-shadow:0 0 0 3px rgba(39,147,84,.11)}
  .public-order-product-image{position:relative;aspect-ratio:4/3;min-height:260px;background:linear-gradient(145deg,#eef7e9,#fff3cf)}
  .public-order-product-image img{width:100%;height:100%;object-fit:cover}
  .public-order-product-placeholder{display:grid;place-items:center;width:100%;height:100%;font-size:3.1rem}
  .public-order-product-badge{position:absolute;left:12px;top:12px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.9);color:#287144;font-size:.66rem;font-weight:950}
  .public-order-product-body{display:flex;flex:1;flex-direction:column;padding:16px}
  .public-order-subscription-card{border-color:#d1e6cf;box-shadow:0 20px 40px rgba(33,76,38,.08);background:linear-gradient(180deg,#f7fbf7 0%,#ffffff 100%)}
  .public-order-subscription-card .public-order-product-image{aspect-ratio:4/3;background:linear-gradient(180deg,#ecf6ec,#fdfdfd);border-bottom:1px solid #dbe8d6}
  .public-order-subscription-card .public-order-product-body{padding:24px;gap:18px}
  .public-order-subscription-card .public-order-subscription-name{font-size:1.18rem;color:#14381f;margin-bottom:0}
  .public-order-subscription-card .public-order-product-description{min-height:40px;margin:0 0 10px;color:#42584d;font-size:.9rem;line-height:1.75}
  .public-order-subscription-card .public-order-price-row{align-items:flex-end;gap:10px}
  .public-order-subscription-card .public-order-price{font-size:1.4rem;color:#164628}
  .public-order-subscription-card .public-order-product-meta{margin:0;color:#4c6b55;font-size:.82rem;font-weight:700}
  .public-order-subscription-card .public-order-price-list{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 14px}
  .public-order-subscription-card .public-order-plan-price{padding:10px 14px;border-radius:14px;background:#eef7ee;color:#1f4f2d;font-size:.78rem;font-weight:900;border:1px solid #d7e8d5}
  .public-order-subscription-card .public-order-detail-block{margin:0 0 14px;padding:16px;border:1px solid #d8e9d7;border-radius:18px;background:#f7fbf8}
  .public-order-subscription-card .public-order-detail-title{margin-bottom:10px;color:#1b4f31;font-size:.93rem}
  .public-order-subscription-card .public-order-detail-list{gap:10px}
  .public-order-subscription-card .public-order-detail-list li{padding:8px 0;border-bottom:1px solid rgba(109,145,113,.18);color:#4b5f4e;font-size:.79rem}
  .public-order-subscription-card .public-order-detail-list li:last-child{border-bottom:0}
  .public-order-subscription-card .public-order-product-action,.public-order-subscription-card .public-order-action{margin-top:auto;border-radius:15px;min-height:48px;font-size:.92rem;box-shadow:0 10px 22px rgba(30,99,53,.12)}
  .public-order-subscription-card .public-order-action{background:#1f8b49}
  .public-order-subscription-card .public-order-action:hover{background:#176f3c}
  .public-order-product h4{margin:0;font-size:1.02rem}.public-order-product-description{min-height:42px;margin:7px 0 12px;color:#6b786d;font-size:.79rem;line-height:1.5}
  .public-order-price-row{display:flex;align-items:baseline;gap:7px}
  .public-order-price{font-size:1.13rem;font-weight:950;color:#183d27}.public-order-compare{color:#9aa39b;font-size:.76rem;text-decoration:line-through}
  .public-order-product-meta{margin:6px 0 13px;color:#78847a;font-size:.72rem}
  .public-order-schedule{display:inline-flex;align-self:flex-start;margin:-2px 0 10px;padding:5px 8px;border-radius:999px;background:#fff1e9;color:#ef684f;font-size:.67rem;font-weight:900}
  .public-order-detail-block{margin:0 0 12px;padding:11px;border:1px solid #e1eae0;border-radius:12px;background:#f8fbf7}
  .public-order-detail-title{display:block;margin-bottom:7px;color:#285338;font-size:.73rem;font-weight:950}
  .public-order-detail-list{display:grid;gap:6px;margin:0;padding:0;list-style:none}
  .public-order-detail-list li{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;color:#536458;font-size:.72rem;line-height:1.4}
  .public-order-detail-list li:before{content:"✓";display:grid;place-items:center;flex:0 0 auto;width:16px;height:16px;margin-top:1px;border-radius:50%;background:#25a758;color:#fff;font-size:.61rem;font-weight:950}
  .public-order-detail-list li span:first-of-type{flex:1}.public-order-detail-list li strong{color:#31513a;font-size:.7rem;text-align:right}
  .public-order-complimentary{border-color:#f0dfbd;background:#fffaf0}
  .public-order-price-list{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 13px}
  .public-order-plan-price{padding:6px 8px;border-radius:8px;background:#edf6f0;color:#31573d;font-size:.68rem;font-weight:850}
  .public-order-plan-price strong{color:#183d27}
  .public-order-action{width:100%;min-height:42px;border:0;border-radius:11px;background:#1f8748;color:#fff;font:inherit;font-size:.82rem;font-weight:900;cursor:pointer;transition:.18s ease}
  .public-order-action:hover{background:#176e3a}.public-order-action.secondary{border:1px solid #cbdcca;background:#f7fbf6;color:#295f3a}.public-order-action:disabled{opacity:.58;cursor:not-allowed}
  .public-order-product-body>.public-order-action,.public-order-product-body>.public-order-quantity-control{margin-top:auto}
  .public-order-quantity-control{display:grid;grid-template-columns:42px minmax(44px,1fr) 42px;align-items:center;gap:7px;width:100%}
  .public-order-quantity-control button{min-height:42px;border:1px solid #cfe1d4;border-radius:10px;background:#f1faf3;color:#176d38;font:inherit;font-size:1.08rem;font-weight:950;cursor:pointer}
  .public-order-quantity-control button:hover{background:#e4f5e8}.public-order-quantity-control button:disabled{opacity:.55;cursor:not-allowed}
  .public-order-quantity-value{display:grid;place-items:center;min-height:42px;border:1px solid #dce7da;border-radius:10px;background:#fff;color:#173521;font-weight:950}
  .public-order-empty{padding:28px;border:1px dashed #ccdbca;border-radius:15px;color:#718074;text-align:center}
  .public-order-checkout-grid{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);gap:18px;align-items:start}
  .public-order-panel{padding:19px;border:1px solid #dce7da;border-radius:18px;background:#fbfdfb}
  .public-order-panel h3{margin:0 0 14px;font-size:1rem}
  .public-order-selected{display:grid;grid-template-columns:72px minmax(0,1fr);gap:13px;margin-bottom:16px;padding:12px;border-radius:14px;background:#fff}
  .public-order-selected img,.public-order-selected-placeholder{width:72px;height:72px;border-radius:12px;object-fit:cover;background:#edf6e9}
  .public-order-selected-placeholder{display:grid;place-items:center;font-size:1.8rem}
  .public-order-selected strong{display:block;margin-top:4px}.public-order-selected small{display:block;margin-top:5px;color:#748176;line-height:1.4}
  .public-order-selected-list{display:grid;gap:12px}
  .public-order-selected-card{padding:12px;border:1px solid #dce7da;border-radius:15px;background:#fff}
  .public-order-selected-card .public-order-selected{margin:0;padding:0}
  .public-order-selected-actions{display:flex;align-items:center;gap:9px;margin-top:12px}
  .public-order-selected-actions .public-order-quantity-control{max-width:170px}
  .public-order-remove{border:0;background:transparent;color:#a13c42;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer}
  .public-order-selection-total{display:flex;justify-content:space-between;gap:15px;margin-top:14px;padding:13px;border-radius:12px;background:#eaf7e8;color:#245d37;font-size:.84rem;font-weight:900}
  .public-order-subscription-options{display:grid;gap:11px;margin-top:13px;padding-top:13px;border-top:1px solid #e1eae0}
  .public-order-readonly-value{min-height:46px;box-sizing:border-box;padding:12px 13px;border:1px solid #d4e1d3;border-radius:12px;background:#f1f6f0;color:#294732;font-size:.86rem;font-weight:850}
  .public-order-complimentary-selector{display:grid;gap:8px;padding:11px;border:1px solid #eadab9;border-radius:12px;background:#fffaf0}
  .public-order-complimentary-selector>strong{color:#6e5623;font-size:.75rem}
  .public-order-complimentary-option{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px;border:1px solid #eadfca;border-radius:10px;background:#fff;cursor:pointer}
  .public-order-complimentary-option input{width:17px;height:17px;margin:0;accent-color:#21894b}.public-order-complimentary-option span{color:#46584a;font-size:.75rem}.public-order-complimentary-option small{color:#6d785f;font-size:.68rem;font-weight:850}
  .public-order-complimentary-option.disabled{opacity:.55;cursor:not-allowed}
  .public-order-map-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
  .public-order-map-toolbar p{margin:0;color:#758176;font-size:.76rem}
  .public-order-location-search{position:relative;display:grid;gap:8px;margin-bottom:12px}
  .public-order-location-search>label{color:#314d38;font-size:.77rem;font-weight:850}
  .public-order-location-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}
  .public-order-location-search-row input{width:100%;min-height:46px;padding:11px 13px;border:1px solid #d4e1d3;border-radius:12px;outline:none;background:#fbfdfb;color:#203d29;font:inherit}
  .public-order-location-search-row input:focus{border-color:#5baa72;box-shadow:0 0 0 3px rgba(67,163,95,.12);background:#fff}
  .public-order-location-status{margin:0;color:#758176;font-size:.72rem}
  .public-order-location-suggestions{display:grid;gap:6px;max-height:230px;overflow:auto;padding:7px;border:1px solid #d5e3d4;border-radius:13px;background:#fff;box-shadow:0 12px 30px rgba(32,75,42,.10);z-index:500}
  .public-order-location-suggestion{display:grid;gap:3px;width:100%;padding:10px 11px;border:0;border-radius:9px;background:#fff;color:#294732;text-align:left;font:inherit;cursor:pointer}
  .public-order-location-suggestion:hover,.public-order-location-suggestion:focus-visible{background:#eef7ec;outline:none}
  .public-order-location-suggestion strong{font-size:.78rem}.public-order-location-suggestion span{color:#718076;font-size:.69rem;line-height:1.35}
  .public-order-map{height:340px;overflow:hidden;border:1px solid #cadaca;border-radius:16px;background:#edf3eb}
  .public-order-coordinates{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .public-order-coordinate{padding:7px 9px;border-radius:9px;background:#eef5ec;color:#526656;font-size:.72rem;font-weight:800}
  .public-order-location-button{padding:9px 12px;border:1px solid #bcd4c0;border-radius:10px;background:#fff;color:#24623a;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer}
  .public-order-form-heading{margin-top:19px;padding-top:18px;border-top:1px solid #dce7da}
  .public-order-form-heading h3{margin:0 0 5px;font-size:1rem}
  .public-order-form-heading p{margin:0;color:#728075;font-size:.76rem;line-height:1.5}
  .public-order-embedded-customer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:13px}
  .public-order-address-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:17px}
  .public-order-availability{margin-top:16px;padding:16px;border-radius:14px;background:#f1f5ef}
  .public-order-availability.available{background:#e9f9ed;color:#176d38}.public-order-availability.unavailable{background:#fff0f0;color:#9d3038}
  .public-order-availability strong{display:block;margin-bottom:5px}.public-order-availability p{margin:0;font-size:.8rem;line-height:1.5}
  .public-order-coupon{display:grid;gap:11px;margin-top:16px;padding:15px;border:1px solid #cfe2d2;border-radius:14px;background:#f5fbf6}
  .public-order-coupon-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .public-order-coupon-head strong{color:#173e27;font-size:.9rem}
  .public-order-coupon-head small{color:#6f7c72;font-size:.7rem;text-align:right}
  .public-order-coupon-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}
  .public-order-coupon-form input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #cdddcf;border-radius:11px;background:#fff;color:#183d27;font:inherit;font-weight:850;text-transform:uppercase;outline:none}
  .public-order-coupon-form input:focus{border-color:#4fa66b;box-shadow:0 0 0 3px rgba(79,166,107,.12)}
  .public-order-coupon-button{min-width:92px;min-height:44px;border:0;border-radius:11px;background:#1f8748;color:#fff;font:inherit;font-size:.8rem;font-weight:900;cursor:pointer}
  .public-order-coupon-button.secondary{border:1px solid #cbdcca;background:#fff;color:#295f3a}
  .public-order-coupon-button:disabled{opacity:.58;cursor:not-allowed}
  .public-order-coupon-applied{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px;border:1px solid #bfe0c6;border-radius:11px;background:#eaf8ed;color:#176d38}
  .public-order-coupon-applied strong{display:block;font-size:.82rem}
  .public-order-coupon-applied small{display:block;margin-top:3px;font-size:.7rem;line-height:1.35}
  .public-order-coupon-help{margin:0;color:#718076;font-size:.72rem;line-height:1.45}
  .public-order-summary{margin-top:14px;padding:16px;border-radius:14px;background:#173e27;color:#fff}
  .public-order-summary-row{display:flex;justify-content:space-between;gap:14px;padding:6px 0;color:#dbe9df;font-size:.82rem}.public-order-summary-row.total{margin-top:7px;padding-top:13px;border-top:1px solid rgba(255,255,255,.18);color:#fff;font-size:1rem;font-weight:950}
  .public-order-terms{display:flex;align-items:flex-start;gap:9px;margin:15px 0;color:#58685b;font-size:.76rem;line-height:1.5}.public-order-terms input{margin-top:3px;accent-color:#228548}
  .public-order-pay{min-height:50px;background:linear-gradient(135deg,#ef8b2c,#e96d21);font-size:.92rem;box-shadow:0 12px 25px rgba(227,111,33,.2)}.public-order-pay:hover{background:linear-gradient(135deg,#e17b20,#cf5a16)}
  .public-order-success{padding:34px;text-align:center}.public-order-success-icon{display:grid;place-items:center;width:76px;height:76px;margin:0 auto 18px;border-radius:24px;background:#dff5e3;color:#16743a;font-size:2rem;font-weight:950}.public-order-success h2{margin:0;font-family:"EB Garamond",Georgia,serif;font-size:2.4rem}.public-order-success p{max-width:650px;margin:10px auto;color:#657268;line-height:1.65}.public-order-success-number{display:inline-block;margin-top:10px;padding:10px 14px;border-radius:11px;background:#eef6ec;color:#285f38;font-weight:950}
  .public-order-loading{display:grid;place-items:center;min-height:360px;color:#59705e;font-weight:800}
  .public-order-homepage-sections{margin-top:24px;display:grid;gap:24px}
  .public-order-homepage-sections > *{width:100%;content-visibility:auto;contain-intrinsic-size:auto 520px}

  /* Fruveto olive theme — aligned with the navigation and hero. */
  .public-order-page{
    --public-theme-primary:#33371b;
    --public-theme-primary-hover:#454b24;
    --public-theme-ink:#242815;
    --public-theme-primary-soft:#eef0e6;
    --public-theme-neutral:#f7f7f2;
    --public-theme-border:#dedfd4;
    --public-theme-danger:#b42318;
    --public-theme-danger-soft:#fff1f0;
    --public-subscription-accent:#a12632;
    --public-subscription-accent-soft:#fff2f2;
    --public-subscription-unit:#526818;
    --public-subscription-unit-soft:#f0f4df;
    --public-subscription-ink:#242815;
    --public-subscription-muted:#626856;
    --public-subscription-border:#d9ddcc;
    background:var(--public-theme-neutral);
    color:var(--public-theme-ink);
  }
  .public-order-eyebrow{color:var(--public-theme-primary)}
  .public-order-eyebrow:before{background:var(--public-theme-primary)}
  .public-order-section{border-color:var(--public-theme-border);box-shadow:0 18px 55px rgba(51,55,27,.07)}
  .public-order-section-head h2,.public-order-catalog-block-head h3,.public-order-category h3,.public-order-panel h3,.public-order-form-heading h3{color:var(--public-theme-ink)}
  .public-order-section-head p,.public-order-catalog-block-head p,.public-order-category p{color:#6b6b6b}
  .public-order-number{background:var(--public-theme-primary);color:#fff}

  .public-order-field label,.public-order-location-search>label{color:#252525}
  .public-order-field input,.public-order-field select,.public-order-field textarea,.public-order-location-search-row input{
    border-color:#d8d8d8;background:#fff;color:var(--public-theme-ink)
  }
  .public-order-field input:focus,.public-order-field select:focus,.public-order-field textarea:focus,.public-order-location-search-row input:focus{
    border-color:var(--public-theme-primary);box-shadow:0 0 0 3px rgba(51,55,27,.14);background:#fff
  }
  .public-order-helper,.public-order-location-status,.public-order-map-toolbar p,.public-order-form-heading p{color:#747474}
  .public-order-notice.success{background:var(--public-theme-primary-soft);color:var(--public-theme-primary);border-left:3px solid var(--public-theme-primary)}
  .public-order-notice.error{background:var(--public-theme-danger-soft);color:#a30b07;border-left:3px solid var(--public-theme-danger)}
  .public-order-notice.info{background:#f5f5f5;color:var(--public-theme-ink);border-left:3px solid var(--public-theme-primary)}

  .public-order-catalog-block+.public-order-catalog-block,#catalogue #juices{border-top-color:#e5e5e5}
  .public-order-catalog-count{border:1px solid rgba(51,55,27,.2);background:var(--public-theme-primary-soft);color:var(--public-theme-primary)}
  .public-order-product{border-color:#e2e2e2}
  .public-order-product:hover{border-color:var(--public-theme-primary);box-shadow:0 18px 35px rgba(51,55,27,.13)}
  .public-order-product.selected{border-color:var(--public-theme-primary);box-shadow:0 0 0 3px rgba(51,55,27,.14)}
  .public-order-product-image{background:linear-gradient(145deg,var(--public-theme-primary-soft),#fff8e8)}
  .public-order-product-badge{color:var(--public-theme-primary);border:1px solid rgba(51,55,27,.16)}
  .public-order-subscription-grid{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:16px}
  .public-order-subscription-card{container-type:inline-size;display:grid;min-width:0;height:100%;min-height:0;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"media body" "footer footer";grid-template-rows:auto auto;align-content:start;overflow:hidden;border:1px solid var(--public-subscription-border);border-radius:18px;background:#fff;box-shadow:0 10px 26px rgba(51,55,27,.07);transition:none}
  .public-order-subscription-card:hover{transform:none;border-color:var(--public-subscription-border);box-shadow:0 10px 26px rgba(51,55,27,.07)}
  .public-order-subscription-card .public-order-product-image{grid-area:media;min-width:0;min-height:350px;height:auto;align-self:stretch;aspect-ratio:auto;overflow:hidden;border-right:1px solid var(--public-subscription-border);border-bottom:0;background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft));display:flex;align-items:center;justify-content:center;font-size:4rem}
  .public-order-subscription-card .public-order-product-image img{display:block;width:100%;height:100%;object-fit:contain;object-position:center;transition:none}
  .public-order-subscription-media-unit{display:none}
  .public-order-subscription-card .public-order-product-body{grid-area:body;display:flex;min-width:0;min-height:350px;flex-direction:column;justify-content:space-evenly;gap:10px;padding:15px}
  .public-order-subscription-card .public-order-subscription-name{display:block;overflow:visible;margin:0 0 5px;color:var(--public-subscription-accent);font-size:clamp(1.32rem,4.5cqw,1.72rem);font-weight:900;line-height:1.08;letter-spacing:-.025em;overflow-wrap:anywhere;word-break:normal}
  .public-order-product:not(.public-order-subscription-card) h4{color:var(--public-theme-ink)}
  .public-order-schedule{background:var(--public-theme-primary-soft);color:var(--public-theme-primary)}
  .public-order-subscription-card .public-order-product-description{min-height:0;margin:0;color:var(--public-subscription-muted);font-size:clamp(.76rem,2.35cqw,.9rem);line-height:1.35;overflow-wrap:anywhere}
  .public-order-product-description{color:#626262}
  .public-order-price{color:var(--public-theme-ink)}
  .public-order-subscription-card .public-order-product-meta,.public-order-product-meta{color:#747474}
  .public-order-subscription-unit{display:inline-flex;max-width:100%;width:fit-content;align-items:center;margin:0 0 9px;padding:5px 10px;border:1px solid rgba(82,104,24,.22);border-radius:999px;background:var(--public-subscription-unit-soft);color:var(--public-subscription-unit);font-size:clamp(1.12rem,3.7cqw,1.42rem);font-weight:900;line-height:1.2;letter-spacing:.01em;overflow-wrap:anywhere}
  .public-order-subscription-product-info{margin:0}
  .public-order-subscription-card .public-order-subscription-content-heading{margin:9px 0 5px;color:var(--public-subscription-ink);font-size:clamp(.8rem,2.6cqw,1rem);font-weight:850;line-height:1.2;letter-spacing:normal}
  .public-order-subscription-inline-items{display:flex;flex-direction:column;gap:7px}
  .public-order-subscription-inline-group{min-width:0}
  .public-order-subscription-inline-group strong{display:block;margin-bottom:3px;color:var(--public-subscription-ink);font-size:clamp(.78rem,2.4cqw,.94rem);line-height:1.2}
  .public-order-subscription-inline-values{display:flex;flex-wrap:wrap;gap:4px 7px}
  .public-order-subscription-inline-value{color:var(--public-subscription-muted);font-size:clamp(.72rem,2.1cqw,.86rem);font-weight:760;line-height:1.25}
  .public-order-subscription-complimentary{margin:0}
  .public-order-subscription-complimentary-list{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none}
  .public-order-subscription-complimentary-item{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;color:var(--public-subscription-muted);font-size:clamp(.76rem,2.2cqw,.9rem);font-weight:760;line-height:1.3}
  .public-order-subscription-complimentary-item span{min-width:0;overflow-wrap:anywhere}
  .public-order-subscription-complimentary-item strong{flex:0 0 auto;color:var(--public-subscription-ink);font-size:inherit}
  .public-order-subscription-footer{grid-area:footer;padding:12px 14px 20px;border-top:1px solid var(--public-subscription-border)}
  .public-order-subscription-card .public-order-price-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}
  .public-order-subscription-card .public-order-plan-price{display:flex;min-width:0;min-height:44px;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border:1px solid rgba(161,38,50,.16);border-radius:9px;background:var(--public-subscription-accent-soft);color:var(--public-subscription-muted);font-size:clamp(.7rem,2.2cqw,.82rem);font-weight:800;line-height:1.2}
  .public-order-subscription-card .public-order-plan-price strong{flex:0 0 auto;color:var(--public-subscription-accent);font-size:clamp(.92rem,2.9cqw,1.12rem);font-weight:900;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
  .public-order-subscription-footer .public-order-action,.public-order-subscription-footer .public-order-quantity-control{width:100%;min-width:0;margin:0}
  .public-order-subscription-card .public-order-detail-block,.public-order-detail-block{border-color:#e3e3e3;background:#fafafa}
  .public-order-subscription-card .public-order-detail-title,.public-order-detail-title{color:var(--public-theme-ink)}
  .public-order-subscription-card .public-order-detail-list li,.public-order-detail-list li{border-color:rgba(11,11,11,.1);color:#555}
  .public-order-detail-list li:before{background:var(--public-theme-primary);color:#fff}
  .public-order-detail-list li strong{color:var(--public-theme-ink)}

  .public-order-action,.public-order-subscription-card .public-order-action,.public-order-coupon-button,.public-order-pay{
    border:2px solid var(--public-theme-primary);
    background:var(--public-theme-primary);
    color:#fff;
    box-shadow:0 10px 22px rgba(51,55,27,.2)
  }
  .public-order-action:hover,.public-order-subscription-card .public-order-action:hover,.public-order-coupon-button:hover,.public-order-pay:hover{
    border-color:var(--public-theme-primary-hover);background:var(--public-theme-primary-hover);color:#fff
  }
  .public-order-subscription-card .public-order-subscription-footer .public-order-action{
    min-height:100%;margin:0;padding:7px 12px;border:1px solid var(--public-theme-primary);border-radius:9px;background:var(--public-theme-primary);color:#fff;font-size:clamp(.72rem,2.2cqw,.86rem);box-shadow:none
  }
  .public-order-subscription-card .public-order-subscription-footer .public-order-action:hover{
    border-color:var(--public-theme-primary-hover);background:var(--public-theme-primary-hover);box-shadow:none
  }
  .public-order-action.secondary,.public-order-coupon-button.secondary{
    border:2px solid var(--public-theme-primary);background:#fff;color:var(--public-theme-primary);box-shadow:none
  }
  .public-order-action.secondary:hover,.public-order-coupon-button.secondary:hover{
    border-color:var(--public-theme-primary);background:var(--public-theme-primary-soft);color:var(--public-theme-primary)
  }
  .public-order-action:focus-visible,.public-order-coupon-button:focus-visible,.public-order-pay:focus-visible,.public-order-location-button:focus-visible{
    outline:3px solid rgba(51,55,27,.28);outline-offset:2px
  }

  .public-order-quantity-control button{border-color:#cfcfcf;background:#fff;color:var(--public-theme-ink)}
  .public-order-quantity-control button:hover{border-color:var(--public-theme-primary);background:var(--public-theme-primary-soft);color:var(--public-theme-primary)}
  .public-order-quantity-value{border-color:#dedede;color:var(--public-theme-ink)}
  .public-order-empty{border-color:#cfcfcf;color:#6d6d6d}
  .public-order-panel{border-color:#e1e1e1;background:#fafafa}
  .public-order-selected img,.public-order-selected-placeholder{background:#f3f3f3}
  .public-order-selected-card{border-color:#e1e1e1}
  .public-order-selection-total{background:var(--public-theme-primary);color:#fff}
  .public-order-subscription-options{border-top-color:#e4e4e4}
  .public-order-readonly-value{border-color:#ddd;background:#f5f5f5;color:#333}
  .public-order-complimentary,.public-order-complimentary-selector{border-color:#e2e2e2;background:#fafafa}
  .public-order-complimentary-selector>strong{color:var(--public-theme-ink)}
  .public-order-complimentary-option{border-color:#e0e0e0}
  .public-order-complimentary-option span{color:#505050}
  .public-order-complimentary-option small{color:#707070}
  .public-order-complimentary-option input,.public-order-terms input{accent-color:var(--public-theme-primary)}

  .public-order-location-suggestions{border-color:#ddd;box-shadow:0 12px 30px rgba(51,55,27,.11)}
  .public-order-location-suggestion{color:#292929}
  .public-order-location-suggestion:hover,.public-order-location-suggestion:focus-visible{background:var(--public-theme-primary-soft)}
  .public-order-location-suggestion span{color:#737373}
  .public-order-map{border-color:#d4d4d4;background:#f1f1f1}
  .public-order-coordinate{background:#f3f3f3;color:#4d4d4d}
  .public-order-location-button{border:2px solid var(--public-theme-primary);background:#fff;color:var(--public-theme-primary)}
  .public-order-location-button:hover{border-color:var(--public-theme-primary);color:var(--public-theme-primary)}
  .public-order-form-heading{border-top-color:#e4e4e4}

  .public-order-availability{background:#f5f5f1;color:var(--public-theme-ink)}
  .public-order-availability.available{background:var(--public-theme-primary-soft);color:var(--public-theme-primary);border-left:3px solid var(--public-theme-primary)}
  .public-order-availability.unavailable{background:var(--public-theme-danger-soft);color:#9d201c;border-left:3px solid var(--public-theme-danger)}
  .public-order-coupon{border-color:#e1e1e1;background:#fafafa}
  .public-order-coupon-head strong{color:var(--public-theme-ink)}
  .public-order-coupon-form input{border-color:#d8d8d8;color:var(--public-theme-ink)}
  .public-order-coupon-form input:focus{border-color:var(--public-theme-primary);box-shadow:0 0 0 3px rgba(51,55,27,.14)}
  .public-order-coupon-applied{border-color:rgba(51,55,27,.2);background:var(--public-theme-primary-soft);color:var(--public-theme-primary)}
  .public-order-summary{background:var(--public-theme-primary);color:#fff;border-top:3px solid var(--public-theme-primary-hover)}
  .public-order-summary-row{color:#eee}
  .public-order-terms{color:#555}
  .public-order-success-icon{border:2px solid var(--public-theme-primary);background:var(--public-theme-primary);color:#fff}
  .public-order-success p,.public-order-selected small,.public-order-coupon-help{color:#707070}
  .public-order-success-number{background:var(--public-theme-primary-soft);color:var(--public-theme-primary);border:1px solid rgba(51,55,27,.2)}
  .public-order-loading{color:var(--public-theme-ink)}
  @media(max-width:1100px){
    .public-order-subscription-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  @media(max-width:980px){
    .public-order-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .public-order-checkout-grid{grid-template-columns:1fr}
    .public-order-form-grid,.public-order-embedded-customer{grid-template-columns:repeat(2,minmax(0,1fr))}
    .public-order-field.span-3{grid-column:span 2}
  }

  @media(max-width:768px){
    .public-order-page{
      --public-order-page-gutter:20px;
      padding:24px 0 56px;
      overflow-x:hidden;
    }

    .public-order-shell{
      width:100%;
      min-width:0;
      padding-top:0;
    }

    .public-order-homepage-sections{
      margin-top:18px;
      gap:18px;
    }

    .public-order-section{
      margin-top:18px;
      padding:18px;
      border-radius:18px;
    }

    .public-order-section-head{
      align-items:flex-start;
      flex-direction:column;
      gap:12px;
      margin-bottom:18px;
    }

    .public-order-section-head h2{
      font-size:clamp(1.65rem,8vw,2.1rem);
      line-height:1.08;
    }

    .public-order-number{
      width:38px;
      height:38px;
      border-radius:11px;
    }

    .public-order-catalog-block+.public-order-catalog-block{
      margin-top:26px;
      padding-top:24px;
    }

    .public-order-catalog-block-head,
    .public-order-category-head{
      align-items:flex-start;
      flex-direction:column;
      gap:8px;
    }

    .public-order-catalog-count{
      align-self:flex-start;
    }

    .public-order-product-grid,
    .public-order-form-grid,
    .public-order-embedded-customer,
    .public-order-address-grid{
      grid-template-columns:minmax(0,1fr);
    }

    .public-order-product-grid{
      gap:16px;
    }

    .public-order-subscription-grid{
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:16px;
    }

    .public-order-field.span-2,
    .public-order-field.span-3{
      grid-column:span 1;
    }

    .public-order-product{
      min-height:0;
      border-radius:18px;
    }

    .public-order-product-image{
      height:auto;
      min-height:0;
      aspect-ratio:4/3;
    }

    .public-order-product-body{
      padding:16px;
    }

    .public-order-subscription-card .public-order-detail-block{
      padding:14px;
      border-radius:15px;
    }

    .public-order-field input,
    .public-order-field select,
    .public-order-field textarea{
      min-height:48px;
      font-size:16px;
    }

    .public-order-checkout-grid{
      grid-template-columns:minmax(0,1fr);
      gap:16px;
    }

    .public-order-panel{
      min-width:0;
      padding:15px;
      border-radius:16px;
    }

    .public-order-selected{
      grid-template-columns:64px minmax(0,1fr);
      gap:10px;
      padding:10px;
    }

    .public-order-selected img,
    .public-order-selected-placeholder{
      width:64px;
      height:64px;
      border-radius:10px;
    }

    .public-order-selected-actions{
      align-items:stretch;
      flex-direction:column;
    }

    .public-order-selected-actions .public-order-quantity-control{
      width:100%;
      max-width:none;
    }

    .public-order-remove{
      min-height:42px;
      border:1px solid #ead7d9;
      border-radius:10px;
      background:#fff8f8;
    }

    .public-order-selection-total{
      align-items:flex-start;
      flex-direction:column;
      gap:7px;
    }

    .public-order-quantity-control{
      grid-template-columns:44px minmax(44px,1fr) 44px;
    }

    .public-order-quantity-control button,
    .public-order-quantity-value{
      min-height:44px;
    }

    .public-order-complimentary-option{
      grid-template-columns:auto minmax(0,1fr);
      align-items:start;
    }

    .public-order-complimentary-option small{
      grid-column:2;
    }

    .public-order-map-toolbar{
      align-items:stretch;
      flex-direction:column;
    }

    .public-order-location-search-row{
      grid-template-columns:minmax(0,1fr);
    }

    .public-order-location-button{
      width:100%;
      min-height:44px;
    }

    .public-order-map{
      height:280px;
      border-radius:14px;
    }

    .public-order-coordinate{
      flex:1 1 130px;
      overflow-wrap:anywhere;
    }

    .public-order-action{
      min-height:48px;
    }

    .public-order-coupon-form{
      grid-template-columns:minmax(0,1fr);
    }

    .public-order-coupon-button{
      width:100%;
    }

    .public-order-summary{
      padding:14px;
    }

    .public-order-summary-row{
      align-items:flex-start;
    }

    .public-order-success{
      padding:24px 18px;
    }

    .public-order-success h2{
      font-size:clamp(1.8rem,9vw,2.2rem);
    }
  }

  @media(max-width:650px){
    .public-order-subscription-grid{grid-template-columns:minmax(0,1fr);gap:14px}
    .public-order-subscription-card{
      grid-template-columns:minmax(145px,46%) minmax(0,1fr);
      grid-template-areas:"media body" "footer footer";
      grid-template-rows:minmax(240px,auto) auto;
      align-items:start;
      border-radius:16px;
    }
    .public-order-subscription-card .public-order-product-image{
      width:100%;
      min-height:0;
      height:100%;
      aspect-ratio:auto;
      align-self:stretch;
      flex-direction:column;
      align-items:stretch;
      justify-content:flex-start;
      border-right:1px solid var(--public-subscription-border);
      border-bottom:0;
      background:#fff;
      font-size:3rem;
    }
    .public-order-subscription-card .public-order-product-image img{
      width:100%;
      height:auto;
      flex:0 0 auto;
      object-fit:contain;
      object-position:top center;
    }
    .public-order-subscription-media-unit{
      display:flex;
      flex:1 0 38px;
      width:100%;
      min-height:38px;
      align-items:center;
      justify-content:center;
      margin:0;
      padding:6px 8px;
      border-top:1px solid rgba(82,104,24,.22);
      background:var(--public-subscription-unit-soft);
      color:var(--public-subscription-unit);
      font-size:.84rem;
      font-weight:900;
      line-height:1.15;
      text-align:center;
    }
    .public-order-subscription-product-info>.public-order-subscription-unit{
      display:none;
    }
    .public-order-subscription-card .public-order-product-body{
      min-height:240px;
      justify-content:flex-start;
      gap:6px;
      padding:10px 8px 7px;
    }
    .public-order-subscription-card .public-order-subscription-name{
      margin-bottom:2px;
      font-size:clamp(.98rem,4.7vw,1.18rem);
      line-height:1.08;
    }
    .public-order-subscription-card .public-order-product-description{
      display:block;
      overflow:visible;
      font-size:.71rem;
      line-height:1.24;
      overflow-wrap:anywhere;
    }
    .public-order-subscription-unit{
      margin-bottom:5px;
      padding:4px 7px;
      font-size:.8rem;
    }
    .public-order-subscription-card .public-order-subscription-content-heading{
      margin:5px 0 3px;
      font-size:.72rem;
    }
    .public-order-subscription-inline-items{gap:4px}
    .public-order-subscription-inline-group strong{
      margin-bottom:2px;
      font-size:.7rem;
    }
    .public-order-subscription-inline-values{gap:2px 5px}
    .public-order-subscription-inline-value,
    .public-order-subscription-complimentary-item{
      font-size:.66rem;
      line-height:1.2;
    }
    .public-order-subscription-footer{
      padding:9px 10px 11px;
      border-top:1px solid var(--public-subscription-border);
    }
    .public-order-subscription-card .public-order-price-list{
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
    }
    .public-order-subscription-card .public-order-plan-price{
      min-height:42px;
      gap:8px;
      padding:8px 10px;
      border-radius:8px;
      font-size:.72rem;
      white-space:nowrap;
    }
    .public-order-subscription-card .public-order-plan-price>span{white-space:nowrap}
    .public-order-subscription-card .public-order-plan-price strong{font-size:.94rem}
    .public-order-subscription-card .public-order-subscription-footer .public-order-action,
    .public-order-subscription-footer .public-order-quantity-control{
      min-height:38px;
      padding:6px 8px;
      font-size:.72rem;
    }
  }

  @media(max-width:380px){
    .public-order-subscription-card{
      grid-template-columns:minmax(132px,44%) minmax(0,1fr);
      grid-template-rows:minmax(230px,auto) auto;
    }
    .public-order-subscription-card .public-order-product-body{
      min-height:230px;
      padding:10px 8px 6px;
    }
    .public-order-subscription-footer{padding:8px 7px 10px}
    .public-order-subscription-card .public-order-price-list{gap:6px}
    .public-order-subscription-card .public-order-plan-price{gap:5px;padding:7px 8px;font-size:.67rem}
    .public-order-subscription-card .public-order-plan-price strong{font-size:.86rem}
    .public-order-subscription-card .public-order-subscription-footer .public-order-action{padding:7px 8px;font-size:.74rem}
  }

  @media(max-width:420px){
    .public-order-section{
      padding:15px;
    }

    .public-order-panel{
      padding:13px;
    }

    .public-order-selected{
      grid-template-columns:56px minmax(0,1fr);
    }

    .public-order-selected img,
    .public-order-selected-placeholder{
      width:56px;
      height:56px;
    }

    .public-order-map{
      height:250px;
    }
  }

  /* Juice Store cards — aligned with the finalized HomePage product card.
     These rules are intentionally juice-card specific so subscriptions, checkout,
     location, forms, and the rest of the public-order page remain unchanged. */
  .public-order-page{
    --public-juice-name-accent:#a42b1d;
    --public-juice-size-accent:#b65f00;
    --public-juice-price-accent:#24733d;
  }

  .public-order-juice-grid{
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:clamp(12px,1.4vw,20px);
    width:100%;
  }

  .public-order-juice-card{
    position:relative;
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    align-items:start;
    min-width:0;
    min-height:310px;
    overflow:hidden;
    border:1px solid #e7e8df;
    border-radius:12px;
    background:#fff;
    box-shadow:0 8px 24px rgba(36,40,21,.07);
    font-family:"Inter","Manrope","Segoe UI",Arial,sans-serif;
    font-feature-settings:"kern" 1,"liga" 1;
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
    transition:transform 180ms ease,border-color 180ms ease,box-shadow 180ms ease;
  }

  .public-order-juice-card:hover{
    transform:translateY(-3px);
    border-color:#cdd2bb;
    box-shadow:0 14px 30px rgba(36,40,21,.12);
  }

  .public-order-juice-card.selected{
    border-color:var(--public-theme-primary);
    box-shadow:0 0 0 3px rgba(51,55,27,.14),0 14px 30px rgba(36,40,21,.12);
  }

  /* Keep the finalized card dimensions/typography exactly the same.
     On desktop the media fills the complete left column so Markdown on the
     right can never create a white strip below the image. Mobile keeps its
     existing explicit 4:5 image rules in the max-width:700px block below. */
  .public-order-juice-card .public-order-juice-image{
    width:100%;
    height:100%;
    min-height:100%;
    max-height:none;
    align-self:stretch;
    aspect-ratio:auto;
    overflow:hidden;
    background:#f5f3ee;
  }

  .public-order-juice-card .public-order-juice-image img{
    display:block;
    width:100%;
    height:100%;
    min-height:100%;
    max-height:none;
    aspect-ratio:auto;
    object-fit:cover;
    object-position:center;
    transition:transform 240ms ease;
  }

  .public-order-juice-card:hover .public-order-juice-image img{
    transform:scale(1.025);
  }

  .public-order-juice-mobile-under-image,
  .public-order-juice-mobile-actions,
  .public-order-juice-image-size{
    display:none;
  }

  .public-order-juice-card .public-order-product-placeholder{
    font-size:clamp(3.2rem,5vw,5rem);
  }

  .public-order-juice-card .public-order-product-badge{
    z-index:2;
    top:10px;
    left:10px;
    padding:5px 8px;
    border:0;
    border-radius:7px;
    background:var(--public-theme-primary);
    color:#fff;
    font-size:.64rem;
    letter-spacing:.04em;
    text-transform:uppercase;
  }

  .public-order-juice-favourite{
    position:absolute;
    z-index:3;
    top:10px;
    right:auto;
    left:calc(50% - 42px);
    width:32px;
    height:32px;
    display:grid;
    place-items:center;
    border:1px solid rgba(51,55,27,.14);
    border-radius:50%;
    background:rgba(255,255,255,.9);
    color:var(--public-theme-primary);
    font-family:Arial,sans-serif;
    font-size:1.25rem;
    line-height:1;
    box-shadow:0 4px 12px rgba(36,40,21,.08);
    pointer-events:none;
  }

  .public-order-juice-card .public-order-juice-body{
    display:flex;
    flex:1;
    min-width:0;
    align-self:stretch;
    flex-direction:column;
    justify-content:flex-start;
    gap:8px;
    padding:clamp(13px,1vw,16px) clamp(13px,1vw,16px) clamp(9px,.7vw,12px);
  }

  .public-order-juice-card .public-order-juice-name{
    min-height:2.35em;
    margin:0;
    display:-webkit-box;
    overflow:hidden;
    color:var(--public-juice-name-accent);
    font-size:clamp(1.18rem,1.22vw,1.38rem);
    font-weight:700;
    line-height:1.17;
    overflow-wrap:anywhere;
    word-break:normal;
    -webkit-box-orient:vertical;
    -webkit-line-clamp:2;
  }

  .public-order-juice-card .public-order-juice-size{
    width:fit-content;
    max-width:100%;
    margin:6px 0 0;
    display:inline-flex;
    align-items:center;
    padding:4px 9px;
    border-radius:999px;
    background:#fff3df;
    color:var(--public-juice-size-accent);
    font-size:clamp(.84rem,.78vw,.94rem);
    font-weight:700;
    line-height:1.25;
    overflow-wrap:anywhere;
  }

  .public-order-juice-card .public-order-product-description{
    min-height:0;
    margin:0;
    display:block;
    overflow:visible;
    color:#626856;
    font-size:clamp(.84rem,.72vw,.92rem);
    font-weight:500;
    line-height:1.44;
    overflow-wrap:anywhere;
    word-break:break-word;
    -webkit-box-orient:initial;
    -webkit-line-clamp:unset;
  }

  /* HomePage-style Markdown preview for juice descriptions only. */
  .public-order-juice-description-shell{
    min-width:0;
    display:grid;
    gap:0;
  }

  .public-order-juice-card .public-order-juice-description-preview{
    position:relative;
    display:block!important;
    max-height:5.76em; /* 4 lines × 1.44 line-height */
    overflow:hidden!important;
    -webkit-box-orient:initial!important;
    -webkit-line-clamp:unset!important;
  }

  .public-order-juice-description-preview>:first-child{margin-top:0!important}
  .public-order-juice-description-preview>:last-child{margin-bottom:0!important}
  .public-order-juice-description-preview p{margin:0!important}
  .public-order-juice-description-preview p+p{margin-top:.28em!important}
  .public-order-juice-description-preview ul,
  .public-order-juice-description-preview ol{
    margin:.18em 0 0!important;
    padding-left:1.05rem!important;
  }

  .public-order-juice-description-view-more{
    width:fit-content;
    min-height:1.44em;
    display:inline-flex;
    align-items:center;
    justify-content:flex-start;
    margin-top:2px;
    padding:0;
    border:0;
    background:transparent;
    color:var(--public-theme-primary,#33371b);
    font:inherit;
    font-size:.73rem;
    font-weight:900;
    line-height:1.44;
    text-decoration:underline;
    text-underline-offset:3px;
    cursor:pointer;
  }

  .public-order-juice-description-view-more:hover{
    color:#454b24;
  }

  .public-order-juice-description-view-more:focus-visible,
  .public-order-juice-description-modal-close:focus-visible{
    outline:3px solid rgba(51,55,27,.22);
    outline-offset:2px;
  }

  .public-order-juice-markdown-table-scroll{
    width:100%;
    min-width:0;
    overflow-x:auto;
    overscroll-behavior-inline:contain;
  }

  .public-order-juice-markdown-table{
    width:100%;
    min-width:440px;
    border-collapse:collapse;
    font-size:.82em;
    line-height:1.35;
  }

  .public-order-juice-markdown-table th,
  .public-order-juice-markdown-table td{
    padding:6px 7px;
    border:1px solid #dfe3d4;
    text-align:left;
    vertical-align:top;
  }

  .public-order-juice-markdown-table th{
    background:#f3f5ec;
    color:var(--public-theme-primary,#33371b);
    font-weight:900;
  }

  .public-order-juice-description-modal-backdrop{
    position:fixed;
    z-index:5000;
    inset:0;
    display:grid;
    place-items:center;
    padding:clamp(14px,3vw,32px);
    background:rgba(18,22,13,.58);
    backdrop-filter:blur(4px);
  }

  .public-order-juice-description-modal{
    width:min(920px,100%);
    max-height:min(82vh,760px);
    display:flex;
    flex-direction:column;
    overflow:hidden;
    border:1px solid #d9ddcc;
    border-radius:20px;
    background:#fff;
    color:#242815;
    box-shadow:0 28px 80px rgba(18,22,13,.28);
    font-family:"Inter","Manrope","Segoe UI",Arial,sans-serif;
  }

  .public-order-juice-description-modal-header{
    position:sticky;
    top:0;
    z-index:1;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    padding:18px 20px 14px;
    border-bottom:1px solid #e5e8dc;
    background:#fff;
  }

  .public-order-juice-description-modal-title{min-width:0}

  .public-order-juice-description-modal-title small{
    display:block;
    margin-bottom:4px;
    color:var(--public-juice-size-accent,#b65f00);
    font-size:.72rem;
    font-weight:900;
    letter-spacing:.05em;
    text-transform:uppercase;
  }

  .public-order-juice-description-modal-title h3{
    margin:0;
    color:#242815;
    font-size:clamp(1.18rem,2vw,1.55rem);
    line-height:1.2;
  }

  .public-order-juice-description-modal-close{
    width:36px;
    height:36px;
    flex:0 0 36px;
    display:inline-grid;
    place-items:center;
    padding:0;
    border:1px solid #dfe3d4;
    border-radius:999px;
    background:#f6f7f1;
    color:var(--public-theme-primary,#33371b);
    font:inherit;
    font-size:1.35rem;
    font-weight:700;
    line-height:1;
    cursor:pointer;
  }

  .public-order-juice-description-modal-close:hover{
    background:#eef0e6;
  }

  .public-order-juice-description-modal-layout{
    display:grid;
    grid-template-columns:minmax(250px,.88fr) minmax(0,1.12fr);
    min-height:0;
    flex:1 1 auto;
    overflow:hidden;
    background:#fff;
  }

  .public-order-juice-description-modal-media{
    position:relative;
    min-width:0;
    min-height:360px;
    overflow:hidden;
    border-right:1px solid #e5e8dc;
    background:linear-gradient(145deg,#f7f7f2,#eef0e6);
  }

  .public-order-juice-description-modal-media img{
    display:block;
    width:100%;
    height:100%;
    object-fit:cover;
    object-position:center;
  }

  .public-order-juice-description-modal-placeholder{
    display:grid;
    place-items:center;
    width:100%;
    height:100%;
    min-height:360px;
    font-size:5rem;
  }

  .public-order-juice-description-modal-size{
    position:absolute;
    left:12px;
    bottom:12px;
    z-index:2;
    display:inline-flex;
    max-width:calc(100% - 24px);
    align-items:center;
    justify-content:center;
    padding:7px 11px;
    border:1px solid rgba(181,28,28,.28);
    border-radius:999px;
    background:rgba(255,248,248,.96);
    color:#c62828;
    box-shadow:0 5px 14px rgba(120,20,20,.16);
    font-size:.82rem;
    font-weight:900;
    line-height:1.1;
    overflow-wrap:anywhere;
  }

  .public-order-juice-description-modal-content{
    min-width:0;
    min-height:0;
    overflow-y:auto;
    overscroll-behavior:contain;
    padding:18px 20px 22px;
    color:#39413a;
    font-size:.94rem;
    font-weight:500;
    line-height:1.62;
    overflow-wrap:anywhere;
    word-break:break-word;
  }

  .public-order-juice-description-modal-content>:first-child{margin-top:0}
  .public-order-juice-description-modal-content>:last-child{margin-bottom:0}
  .public-order-juice-description-modal-content p{margin:0 0 .85em}
  .public-order-juice-description-modal-content ul,
  .public-order-juice-description-modal-content ol{
    margin:.45em 0 .9em;
    padding-left:1.35rem;
  }

  .public-order-juice-description-modal-content .public-order-juice-markdown-table-scroll{
    margin:.7em 0 1em;
  }

  .public-order-juice-description-modal-content table{
    width:100%;
    border-collapse:collapse;
    margin:.7em 0 1em;
    font-size:.88rem;
  }

  .public-order-juice-description-modal-content th,
  .public-order-juice-description-modal-content td{
    padding:8px 9px;
    border:1px solid #dfe3d4;
    text-align:left;
    vertical-align:top;
  }

  .public-order-juice-description-modal-content th{
    background:#f3f5ec;
    color:var(--public-theme-primary,#33371b);
    font-weight:900;
  }

  @media(max-width:700px){
    .public-order-juice-card .public-order-juice-description-preview{
      max-height:5.12em!important; /* 4 compact mobile lines */
      overflow:hidden!important;
      -webkit-line-clamp:unset!important;
    }

    .public-order-juice-description-view-more{
      min-height:1.28em;
      margin-top:2px;
      padding:0;
      font-size:clamp(.58rem,2.55vw,.68rem);
      line-height:1.28;
    }

    .public-order-juice-description-modal-backdrop{
      place-items:center;
      padding:14px;
      background:rgba(18,22,13,.52);
    }

    .public-order-juice-description-modal{
      width:min(92vw,560px);
      max-height:min(78dvh,650px);
      border-radius:18px;
      box-shadow:0 24px 70px rgba(18,22,13,.30);
    }

    .public-order-juice-description-modal-layout{
      grid-template-columns:minmax(0,1fr);
      grid-template-rows:auto minmax(0,1fr);
      overflow-y:auto;
    }

    .public-order-juice-description-modal-media{
      width:min(100%,340px);
      min-height:0;
      aspect-ratio:4/5;
      justify-self:center;
      border-right:0;
      border-bottom:1px solid #e5e8dc;
      background:#f7f7f2;
    }

    .public-order-juice-description-modal-media img{
      object-fit:cover;
    }

    .public-order-juice-description-modal-placeholder{
      min-height:0;
      aspect-ratio:4/5;
    }

    .public-order-juice-description-modal-size{
      left:9px;
      bottom:9px;
      max-width:calc(100% - 18px);
      padding:6px 9px;
      font-size:.72rem;
    }

    .public-order-juice-description-modal-header{
      padding:14px 15px 11px;
    }

    .public-order-juice-description-modal-title h3{
      font-size:1.08rem;
    }

    .public-order-juice-description-modal-close{
      width:32px;
      height:32px;
      flex-basis:32px;
      font-size:1.2rem;
    }

    .public-order-juice-description-modal-content{
      padding:14px 15px calc(20px + env(safe-area-inset-bottom,0px));
      font-size:.84rem;
      line-height:1.55;
    }

    .public-order-juice-description-modal-content table{
      display:block;
      overflow-x:auto;
      white-space:nowrap;
      font-size:.78rem;
    }
  }

  .public-order-juice-card .public-order-price-row{
    width:fit-content;
    max-width:100%;
    min-height:38px;
    display:inline-flex;
    align-items:center;
    flex-wrap:wrap;
    gap:8px;
    margin-top:3px;
    padding:6px 11px;
    border:1px solid rgba(51,55,27,.14);
    border-radius:10px;
    background:var(--public-theme-primary-soft);
  }

  .public-order-juice-card .public-order-price{
    color:var(--public-theme-primary);
    font-size:clamp(1.5rem,1.42vw,1.75rem);
    font-weight:800;
    line-height:1;
    letter-spacing:-.015em;
  }

  .public-order-juice-card .public-order-compare{
    color:#626856;
    font-size:.82rem;
    font-weight:600;
  }

  .public-order-juice-actions{
    width:100%;
    display:grid;
    grid-template-columns:minmax(0,1fr);
    gap:8px;
    margin-top:auto;
    padding-top:5px;
  }

  .public-order-juice-actions>*{
    width:100%;
    min-width:0;
  }

  /* Web order: View Item above, Add to Cart/quantity below. */
  .public-order-juice-actions .public-order-juice-view{order:1}
  .public-order-juice-actions .public-order-juice-action,
  .public-order-juice-actions .public-order-juice-quantity{order:2}

  .public-order-juice-card .public-order-juice-action{
    width:100%;
    min-height:41px;
    margin:0;
    padding:9px 11px;
    border:1px solid var(--public-theme-primary);
    border-radius:3px;
    background:var(--public-theme-primary);
    color:#fff;
    box-shadow:0 7px 16px rgba(51,55,27,.14);
    font-size:clamp(.74rem,.64vw,.82rem);
    font-weight:700;
    letter-spacing:.015em;
    line-height:1.12;
    text-transform:uppercase;
  }

  .public-order-juice-card .public-order-juice-action:hover:not(:disabled){
    border-color:var(--public-theme-primary-hover);
    background:var(--public-theme-primary-hover);
    color:#fff;
  }

  .public-order-juice-card .public-order-juice-quantity{
    width:100%;
    min-width:0;
    grid-template-columns:41px minmax(41px,1fr) 41px;
    margin:0;
  }

  .public-order-juice-card .public-order-juice-quantity button,
  .public-order-juice-card .public-order-juice-quantity .public-order-quantity-value{
    min-height:41px;
    border-radius:3px;
  }

  .public-order-juice-view{
    min-height:41px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:9px 11px;
    border:1px solid #eef0e8;
    border-radius:3px;
    background:#eef0e8;
    color:var(--public-theme-primary);
    font-size:clamp(.74rem,.64vw,.82rem);
    font-weight:700;
    letter-spacing:.015em;
    line-height:1.12;
    text-align:center;
    text-decoration:none;
    text-transform:uppercase;
    font-family:inherit;
    cursor:pointer;
  }

  .public-order-juice-view:hover{
    border-color:var(--public-theme-primary-soft);
    background:var(--public-theme-primary-soft);
    color:var(--public-theme-primary-hover);
  }

  @media(max-width:1100px){
    .public-order-juice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  }

  @media(max-width:700px){
    .public-order-juice-grid{
      grid-template-columns:minmax(0,1fr);
      gap:14px;
    }

    .public-order-juice-card{
      grid-template-columns:minmax(145px,46%) minmax(0,1fr);
      grid-template-rows:auto auto auto;
      min-height:0;
      align-items:stretch;
      align-content:start;
      border-radius:16px;
    }

    /* Preserve the finalized mobile card exactly, but allow the image track to
       stretch when Markdown makes the right side taller. This removes any blank
       strip below the photo without changing the mobile column widths, weight
       strip, typography, price box, or action row. */
    .public-order-juice-card .public-order-juice-image{
      grid-column:1;
      grid-row:1;
      width:100%;
      height:100%;
      min-height:0;
      max-height:none;
      align-self:stretch;
      aspect-ratio:4/5;
      overflow:hidden;
      border-right:1px solid var(--public-theme-border);
      border-bottom:1px solid rgba(82,104,24,.22);
      background:#fff;
    }

    .public-order-juice-card .public-order-juice-image img{
      display:block;
      width:100%;
      height:100%;
      min-height:0;
      max-height:none;
      aspect-ratio:4/5;
      object-fit:cover;
      object-position:center;
    }

    .public-order-juice-favourite{
      top:9px;
      left:calc(46% - 40px);
      width:31px;
      height:31px;
      font-size:1.15rem;
    }

    .public-order-juice-mobile-under-image{
      grid-column:1;
      grid-row:2;
      display:block;
      width:100%;
      min-width:0;
      align-self:start;
      border-right:1px solid var(--public-theme-border);
      background:#fff;
    }

    .public-order-juice-mobile-weight{
      display:flex;
      width:100%;
      min-height:38px;
      align-items:center;
      justify-content:center;
      margin:0;
      padding:6px 8px;
      border-bottom:1px solid rgba(82,104,24,.22);
      background:#f0f4df;
      color:#526818;
      font-size:.84rem;
      font-weight:700;
      line-height:1.15;
      text-align:center;
      overflow-wrap:anywhere;
    }

    .public-order-juice-card .public-order-juice-body{
      grid-column:2;
      grid-row:1 / span 2;
      min-height:240px;
      align-self:stretch;
      justify-content:flex-start;
      gap:6px;
      padding:10px 8px 7px;
      text-align:left;
    }

    .public-order-juice-body .public-order-juice-size,
    .public-order-juice-body .public-order-juice-actions{
      display:none;
    }

    .public-order-juice-card .public-order-juice-name{
      min-height:0;
      display:block;
      overflow:visible;
      margin:0 0 2px;
      font-size:clamp(.98rem,4.7vw,1.18rem);
      font-weight:700;
      line-height:1.08;
      overflow-wrap:anywhere;
      word-break:normal;
      -webkit-line-clamp:unset;
    }

    .public-order-juice-card .public-order-product-description{
      min-height:0;
      display:block;
      overflow:visible;
      margin:0;
      font-size:.80rem;
      font-weight:500;
      line-height:1.30;
      overflow-wrap:anywhere;
      word-break:break-word;
      -webkit-box-orient:initial;
      -webkit-line-clamp:unset;
    }

    .public-order-juice-card .public-order-price-row{
      width:fit-content;
      max-width:100%;
      min-height:34px;
      display:inline-flex;
      align-items:center;
      justify-content:flex-start;
      gap:6px;
      margin-top:4px;
      padding:4px 9px;
      border:1px solid rgba(51,55,27,.14);
      border-radius:9px;
      background:var(--public-theme-primary-soft);
      text-align:left;
    }

    .public-order-juice-card .public-order-price{
      color:var(--public-theme-primary);
      font-size:1.32rem;
      font-weight:800;
      line-height:1;
      letter-spacing:-.01em;
    }

    .public-order-juice-card .public-order-compare{
      color:#626856;
      font-size:.70rem;
      line-height:1;
    }

    .public-order-juice-mobile-actions{
      grid-column:1 / -1;
      grid-row:3;
      display:grid;
      grid-template-columns:minmax(145px,46%) minmax(0,1fr);
      gap:0;
      width:100%;
      min-width:0;
      padding:0;
      border-top:1px solid var(--public-theme-border);
      background:#fff;
    }

    .public-order-juice-mobile-actions>*{
      width:100%;
      min-width:0;
      border-radius:0;
    }

    .public-order-juice-mobile-actions>:first-child{
      grid-column:1;
      border-right:1px solid var(--public-theme-border);
    }

    .public-order-juice-mobile-actions>:last-child{
      grid-column:2;
    }

    .public-order-juice-mobile-actions .public-order-juice-view,
    .public-order-juice-mobile-actions .public-order-juice-action{
      min-height:40px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      margin:0;
      padding:7px 5px;
      border-radius:0;
      font-size:.62rem;
      font-weight:700;
      letter-spacing:.01em;
      line-height:1.05;
      text-align:center;
      text-transform:uppercase;
      white-space:normal;
      box-shadow:none;
    }

    .public-order-juice-mobile-actions .public-order-juice-view{
      border:0;
      background:#eef0e8;
      color:var(--public-theme-primary);
    }

    .public-order-juice-mobile-actions .public-order-juice-action{
      border:0;
      background:var(--public-theme-primary);
      color:#fff;
    }

    .public-order-juice-mobile-actions .public-order-juice-action:hover:not(:disabled){
      background:var(--public-theme-primary-hover);
      color:#fff;
    }

    .public-order-juice-mobile-actions .public-order-juice-quantity{
      width:100%;
      min-width:0;
      grid-template-columns:30px minmax(24px,1fr) 30px;
      gap:3px;
      margin:0;
      padding:3px 5px;
      border-left:0;
    }

    .public-order-juice-mobile-actions .public-order-juice-quantity button,
    .public-order-juice-mobile-actions .public-order-juice-quantity .public-order-quantity-value{
      min-height:36px;
      font-size:.74rem;
    }
  }

  @media(max-width:390px){
    .public-order-juice-card{
      grid-template-columns:minmax(132px,44%) minmax(0,1fr);
    }

    .public-order-juice-favourite{
      left:calc(44% - 37px);
    }

    .public-order-juice-mobile-weight{
      min-height:36px;
      padding:6px;
      font-size:.78rem;
    }

    .public-order-juice-mobile-actions{
      grid-template-columns:minmax(132px,44%) minmax(0,1fr);
    }

    .public-order-juice-mobile-actions .public-order-juice-view,
    .public-order-juice-mobile-actions .public-order-juice-action{
      min-height:38px;
      padding-inline:3px;
      font-size:.57rem;
    }

    .public-order-juice-card .public-order-juice-body{
      min-height:230px;
      gap:5px;
      padding:10px 8px 6px;
    }

    .public-order-juice-card .public-order-juice-name{
      font-size:.98rem;
    }

    .public-order-juice-card .public-order-product-description{
      font-size:.76rem;
      line-height:1.28;
    }

    .public-order-juice-card .public-order-price-row{
      min-height:32px;
      padding:4px 7px;
    }

    .public-order-juice-card .public-order-price{
      font-size:1.2rem;
    }
  }

  .public-order-load-more-row{
    display:flex;
    align-items:center;
    justify-content:center;
    flex-wrap:wrap;
    gap:10px;
    margin-top:22px;
  }

  .public-order-load-more{
    min-height:42px;
    padding:9px 22px;
    border:1px solid var(--public-theme-primary);
    border-radius:999px;
    background:#fff;
    color:var(--public-theme-primary);
    font:inherit;
    font-size:.82rem;
    font-weight:900;
    cursor:pointer;
    transition:background .18s ease,color .18s ease,transform .18s ease;
  }

  .public-order-load-more:hover{
    background:var(--public-theme-primary);
    color:#fff;
    transform:translateY(-1px);
  }

  .public-order-load-more:focus-visible{
    outline:3px solid rgba(51,55,27,.24);
    outline-offset:2px;
  }

  .public-order-load-more-status{
    color:#6b6b6b;
    font-size:.78rem;
    font-weight:750;
  }


  /* Public subscription cards: parity with the dedicated Subscriptions page. */
  .public-order-subscription-mobile-summary,
  .public-order-subscription-media-toggle,
  .public-order-subscription-collapse,
  .public-order-subscription-mobile-meta,
  .public-order-subscription-plan-heading{display:none}

  .public-order-subscription-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;justify-content:start;gap:18px}
  .public-order-subscription-card{container-type:inline-size;content-visibility:auto;contain-intrinsic-size:auto 500px;display:grid;width:100%;max-width:590px;min-width:0;height:100%;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"media body" "bottom bottom";grid-template-rows:auto auto;align-content:start;justify-self:start;overflow:hidden;border:1px solid var(--public-subscription-border);border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(51,55,27,.065);transition:none}
  .public-order-subscription-card:hover{transform:none;border-color:var(--public-subscription-border);box-shadow:0 8px 20px rgba(51,55,27,.065)}
  .public-order-subscription-card.selected{border-color:var(--public-theme-primary);box-shadow:0 0 0 3px rgba(51,55,27,.12),0 8px 20px rgba(51,55,27,.065)}
  .public-order-subscription-media{position:relative;grid-area:media;width:100%;min-width:0;aspect-ratio:4/5;align-self:start;overflow:hidden;border-right:1px solid var(--public-subscription-border);background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft));font-size:4rem;isolation:isolate}
  .public-order-subscription-carousel{position:absolute;inset:0;overflow:hidden;background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft))}
  .public-order-subscription-carousel-image{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;animation:public-order-subscription-carousel-enter .42s ease both}
  .public-order-subscription-carousel-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .public-order-subscription-carousel::after{content:"";position:absolute;inset:42% 0 0;background:linear-gradient(180deg,transparent,rgba(20,24,10,.88));pointer-events:none}
  .public-order-subscription-carousel-caption{position:absolute;z-index:2;left:12px;right:12px;bottom:30px;display:grid;gap:2px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.45)}
  .public-order-subscription-carousel-label{font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .public-order-subscription-carousel-title{overflow:hidden;font-size:.9rem;font-weight:900;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}
  .public-order-subscription-carousel-control{position:absolute;z-index:3;top:50%;display:inline-flex;width:30px;height:30px;align-items:center;justify-content:center;padding:0;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(25,29,14,.62);color:#fff;font:inherit;font-size:.88rem;font-weight:900;line-height:1;cursor:pointer;transform:translateY(-50%);backdrop-filter:blur(5px)}
  .public-order-subscription-carousel-control:hover{background:rgba(25,29,14,.84)}
  .public-order-subscription-carousel-control.previous{left:8px}.public-order-subscription-carousel-control.next{right:8px}
  .public-order-subscription-carousel-dots{position:absolute;z-index:3;left:9px;right:9px;bottom:10px;display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
  .public-order-subscription-carousel-dot{width:6px;height:6px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer}
  .public-order-subscription-carousel-dot.active{background:#fff;transform:scale(1.25)}
  .public-order-subscription-carousel-control:focus-visible,.public-order-subscription-carousel-dot:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}
  @keyframes public-order-subscription-carousel-enter{from{opacity:.2;transform:scale(1.018)}to{opacity:1;transform:scale(1)}}
  @media(prefers-reduced-motion:reduce){.public-order-subscription-carousel-image{animation:none}}

  .public-order-subscription-body{grid-area:body;display:flex;min-width:0;min-height:100%;flex-direction:column;justify-content:flex-start;gap:9px;padding:18px 16px}
  .public-order-subscription-body h4{display:block;overflow:visible;margin:0 0 3px;color:var(--public-subscription-accent);font-size:clamp(1.08rem,4.2cqw,1.3rem);font-weight:900;line-height:1.1;letter-spacing:-.02em;overflow-wrap:anywhere;word-break:normal}
  .public-order-subscription-body>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--public-subscription-muted);font-size:clamp(.72rem,2.3cqw,.82rem);line-height:1.32;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  .public-order-subscription-schedule-note{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--public-subscription-border);border-radius:9px;background:var(--public-theme-primary-soft);color:var(--public-theme-primary);font-size:clamp(.66rem,2cqw,.76rem);font-weight:820;line-height:1.25}
  .public-order-subscription-top{display:block}.public-order-subscription-top>div{min-width:0;flex:1}
  .public-order-subscription-product-info{margin:0}
  .public-order-subscription-unit{display:inline-flex;max-width:100%;width:fit-content;align-items:center;margin:0 0 5px;padding:4px 8px;border:1px solid rgba(82,104,24,.22);border-radius:999px;background:var(--public-subscription-unit-soft);color:var(--public-subscription-unit);font-size:clamp(.82rem,3cqw,1rem);font-weight:900;line-height:1.15;letter-spacing:.01em;overflow-wrap:anywhere}
  .public-order-subscription-content-heading{margin:5px 0 3px!important;color:var(--public-subscription-ink)!important;font-size:clamp(.74rem,2.4cqw,.86rem)!important;font-weight:850!important;line-height:1.2!important;letter-spacing:normal!important}
  .public-order-subscription-inline-items{display:flex;flex-direction:column;gap:5px}.public-order-subscription-inline-group{min-width:0}.public-order-subscription-inline-group strong{display:block;margin-bottom:2px;color:var(--public-subscription-ink);font-size:clamp(.72rem,2.2cqw,.82rem);line-height:1.2}.public-order-subscription-inline-values{display:flex;flex-wrap:wrap;gap:3px 6px}.public-order-subscription-inline-value{color:var(--public-subscription-muted);font-size:clamp(.66rem,2cqw,.76rem);font-weight:760;line-height:1.2}
  .public-order-subscription-complimentary{margin:0}.public-order-subscription-complimentary-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}.public-order-subscription-complimentary-item{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;color:var(--public-subscription-muted);font-size:clamp(.68rem,2cqw,.78rem);font-weight:760;line-height:1.22}.public-order-subscription-complimentary-item span{min-width:0;overflow-wrap:anywhere}.public-order-subscription-complimentary-item strong{flex:0 0 auto;color:var(--public-subscription-ink);font-size:inherit}
  .public-order-subscription-bottom{grid-area:bottom;padding:11px 14px 14px;border-top:1px solid var(--public-subscription-border);background:#fff}
  .public-order-subscription-prices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}
  .public-order-subscription-price{display:flex;min-width:0;min-height:38px;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;border:1px solid rgba(161,38,50,.16);border-radius:8px;background:var(--public-subscription-accent-soft);color:var(--public-subscription-muted);font-size:clamp(.66rem,2.1cqw,.76rem);font-weight:800;line-height:1.15}.public-order-subscription-price span{min-width:0;overflow-wrap:anywhere}.public-order-subscription-price strong{flex:0 0 auto;margin:0;color:var(--public-subscription-accent);font-size:clamp(.82rem,2.7cqw,.98rem);font-weight:900;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
  .public-order-subscription-actions{display:flex;min-width:0;align-items:stretch}.public-order-subscription-actions .public-order-action,.public-order-subscription-actions .public-order-quantity-control{width:100%;min-height:38px;border-radius:8px}.public-order-subscription-actions .public-order-action{margin:0;padding:6px 9px;font-size:clamp(.68rem,2.1cqw,.78rem)}

  @media(max-width:1100px){.public-order-subscription-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:700px){
    .public-order-subscription-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;justify-content:stretch;gap:10px}
    .public-order-subscription-card{width:100%;max-width:none;min-width:0;height:auto;margin:0;border:1px solid rgba(51,55,27,.12);background:#fff;box-shadow:0 1px 3px rgba(36,40,21,.035)}
    .public-order-subscription-card.mobile-compact{grid-template-columns:minmax(0,1fr);grid-template-areas:"media" "summary";grid-template-rows:auto auto;align-content:start;border-radius:12px}
    .public-order-subscription-card.mobile-expanded{grid-column:1/-1;grid-template-columns:minmax(0,1fr);grid-template-areas:"media" "body" "bottom";grid-template-rows:auto auto auto;border-radius:17px;box-shadow:0 3px 7px rgba(36,40,21,.055)}
    .public-order-subscription-media{position:relative;grid-area:media;width:100%;min-height:0;height:auto;aspect-ratio:4/5;border-right:0;border-bottom:1px solid var(--public-subscription-border);background:var(--public-theme-primary-soft)}
    .public-order-subscription-media-toggle{position:absolute;inset:0;z-index:2;display:block;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:pointer}
    .public-order-subscription-carousel-control,.public-order-subscription-carousel-dots{z-index:4}.public-order-subscription-carousel-dots{bottom:5px;gap:3px}.public-order-subscription-carousel-dot{width:5px;height:5px}
    .mobile-compact .public-order-subscription-carousel::after{inset:62% 0 0;background:linear-gradient(180deg,transparent,rgba(18,22,8,.62))}
    .mobile-compact .public-order-subscription-carousel-caption{left:7px;right:7px;bottom:18px;gap:2px}.mobile-compact .public-order-subscription-carousel-label{font-size:clamp(1rem,5.4vw,1.35rem);font-weight:900;line-height:1;letter-spacing:.02em;text-shadow:0 2px 8px rgba(0,0,0,.52)}.mobile-compact .public-order-subscription-carousel-title{display:block;width:100%;overflow:visible;color:#ffd36a;font-size:clamp(.62rem,3.15vw,.8rem);font-weight:900;line-height:1.08;white-space:normal;overflow-wrap:anywhere;text-overflow:clip;text-shadow:0 2px 8px rgba(0,0,0,.66)}
    .public-order-subscription-mobile-summary{grid-area:summary;display:flex;min-width:0;flex-direction:column;gap:4px;padding:5px 7px 6px;border:0;background:#fff;color:inherit;font:inherit;text-align:left;cursor:pointer}.mobile-expanded .public-order-subscription-mobile-summary{display:none}
    .public-order-subscription-mobile-name{min-height:27px;overflow:hidden;color:var(--public-subscription-accent);font-size:11px;font-weight:900;line-height:13.5px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}.public-order-subscription-mobile-price-row{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:1px;padding-top:5px;border-top:1px solid rgba(51,55,27,.08);color:var(--public-subscription-muted);font-size:12.5px;font-weight:900;line-height:15px}.public-order-subscription-mobile-price-row strong{min-width:0;overflow:hidden;color:var(--public-theme-primary);font-size:13px;text-overflow:ellipsis;white-space:nowrap}
    .mobile-compact .public-order-subscription-body,.mobile-compact .public-order-subscription-bottom{display:none}
    .mobile-expanded .public-order-subscription-body{grid-area:body;display:flex;min-height:0;flex-direction:column;justify-content:flex-start;gap:7px;padding:10px 11px 11px}.mobile-expanded .public-order-subscription-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.mobile-expanded .public-order-subscription-top>div{flex:1;min-width:0}.mobile-expanded .public-order-subscription-body h4{margin:0;color:var(--public-subscription-accent);font-size:18px;font-weight:900;line-height:21px}
    .public-order-subscription-collapse{width:28px;height:28px;flex:0 0 28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:14px;background:var(--public-theme-primary-soft);color:var(--public-theme-primary);font:inherit;font-size:21px;line-height:22px;cursor:pointer}
    .public-order-subscription-mobile-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.public-order-subscription-mobile-unit{max-width:38%;overflow:hidden;padding:4px 8px;border:1px solid rgba(82,104,24,.16);border-radius:999px;background:var(--public-subscription-unit-soft);color:var(--public-subscription-unit);font-size:10px;font-weight:900;text-align:center;text-overflow:ellipsis;white-space:nowrap}.public-order-subscription-mobile-weekly{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid rgba(161,38,50,.14);border-radius:9px;background:var(--public-subscription-accent-soft);font-size:12px;font-weight:900}.public-order-subscription-mobile-weekly span{color:var(--public-subscription-muted)}.public-order-subscription-mobile-weekly strong{color:var(--public-subscription-accent);font-size:13px}
    .mobile-expanded .public-order-subscription-body>p{display:block;overflow:visible;margin:0;color:var(--public-subscription-muted);font-size:11.5px;font-weight:500;line-height:16px}.mobile-expanded .public-order-subscription-schedule-note{display:flex;align-items:center;gap:7px;padding:7px 8px;border:1px solid rgba(82,104,24,.14);border-radius:10px;background:#f5f7ed;color:var(--public-theme-primary);font-size:10px;font-weight:800;line-height:13.5px}
    .mobile-expanded .public-order-subscription-product-info,.mobile-expanded .public-order-subscription-complimentary{margin:1px 0 0;padding:8px 9px;border:1px solid rgba(51,55,27,.10);border-radius:10px;background:#fbfcf8}.mobile-expanded .public-order-subscription-product-info>.public-order-subscription-unit{display:none}.mobile-expanded .public-order-subscription-content-heading{margin:0 0 4px!important;font-size:11px!important;line-height:14px!important}.mobile-expanded .public-order-subscription-inline-items{gap:3px}.mobile-expanded .public-order-subscription-inline-group strong{margin-bottom:1px;font-size:12px}.mobile-expanded .public-order-subscription-inline-value,.mobile-expanded .public-order-subscription-complimentary-item{font-size:10.5px;font-weight:700;line-height:15px}
    .mobile-expanded .public-order-subscription-bottom{grid-area:bottom;display:block;padding:9px 10px 10px;border-top:1px solid rgba(51,55,27,.10);background:#fcfdf9}.public-order-subscription-plan-heading{display:block;margin:0 0 7px;color:var(--public-subscription-ink);font-size:11px;font-weight:900}.mobile-expanded .public-order-subscription-prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0}.mobile-expanded .public-order-subscription-price{min-width:0;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 5px;border:1px solid rgba(161,38,50,.15);border-radius:9px;background:var(--public-subscription-accent-soft);font-size:9.5px;line-height:1.1;text-align:center;white-space:normal}.mobile-expanded .public-order-subscription-price span{color:var(--public-subscription-muted);font-weight:800;white-space:nowrap}.mobile-expanded .public-order-subscription-price strong{color:var(--public-subscription-accent);font-size:14.5px;font-weight:900;text-align:center;white-space:nowrap}.mobile-expanded .public-order-subscription-actions{grid-column:1/-1;margin-top:2px}.mobile-expanded .public-order-subscription-actions .public-order-action,.mobile-expanded .public-order-subscription-actions .public-order-quantity-control{width:100%;min-height:43px;border-radius:10px;font-size:12px;font-weight:900}
  }


  /* ================================================================
     JUICE CARDS — ITEM PAGE REFERENCE
     Match the ItemPage recommended-product cards on desktop/tablet/mobile.
     Markdown + View More remains enabled for juice descriptions.
     ================================================================ */

  .public-order-juice-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: clamp(12px, 1.35vw, 20px);
    width: 100%;
  }

  .public-order-juice-card {
    display: grid;
    grid-template-columns: minmax(0, 50%) minmax(0, 50%);
    align-items: stretch;
    min-width: 0;
    height: 100%;
    min-height: 320px;
    overflow: hidden;
    border: 1px solid #e2e4da;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(36, 40, 21, 0.07);
    font-family: "Nunito", Arial, Helvetica, sans-serif;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .public-order-juice-card:hover {
    transform: translateY(-2px);
    border-color: #cbd1ba;
    box-shadow: 0 14px 30px rgba(36, 40, 21, 0.11);
  }

  .public-order-juice-card.selected {
    border-color: var(--public-theme-primary);
    box-shadow:
      0 0 0 3px rgba(51, 55, 27, 0.12),
      0 14px 30px rgba(36, 40, 21, 0.11);
  }

  .public-order-juice-card .public-order-juice-image {
    position: relative;
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    height: 100%;
    min-height: 320px;
    max-height: none;
    align-self: stretch;
    aspect-ratio: auto;
    display: block;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #f4f3ed;
  }

  .public-order-juice-card .public-order-juice-image img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 320px;
    max-height: none;
    aspect-ratio: auto;
    object-fit: cover;
    object-position: center;
  }

  /* Reference card has no separate weight strip or detached mobile footer. */
  .public-order-juice-mobile-under-image,
  .public-order-juice-mobile-actions {
    display: none !important;
  }

  .public-order-juice-favourite {
    top: 10px;
    left: calc(50% - 42px);
  }

  .public-order-juice-card .public-order-juice-body {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    min-height: 320px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 7px;
    padding: 12px 13px 10px;
    background: #ffffff;
    text-align: left;
  }

  .public-order-juice-card .public-order-juice-name {
    min-height: 0;
    margin: 0 0 4px;
    display: block;
    overflow: visible;
    color: #ae2d17;
    font-size: clamp(1.08rem, 1.35vw, 1.34rem);
    font-weight: 850;
    line-height: 1.12;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    -webkit-line-clamp: unset;
  }

  .public-order-juice-card .public-order-juice-size {
    width: fit-content;
    max-width: 100%;
    margin: 0 0 1px;
    display: inline-flex;
    align-items: center;
    padding: 4px 9px;
    border: 1px solid #cfe1d1;
    border-radius: 999px;
    background: #f0faf2;
    color: #176538;
    font-size: .78rem;
    font-weight: 850;
    line-height: 1.1;
  }

  .public-order-juice-card .public-order-product-description {
    min-height: 0;
    margin: 0;
    color: #515847;
    font-size: clamp(.74rem, .73vw, .82rem);
    font-weight: 500;
    line-height: 1.42;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .public-order-juice-card .public-order-juice-description-preview {
    max-height: 5.68em; /* four lines × 1.42 */
    overflow: hidden !important;
  }

  .public-order-juice-description-view-more {
    min-height: 1.42em;
    margin-top: 2px;
    font-size: .70rem;
    line-height: 1.42;
  }

  .public-order-juice-card .public-order-price-row {
    width: fit-content;
    max-width: 100%;
    min-height: 0;
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 2px;
    padding: 3px 7px;
    border: 1px solid #d9ddcc;
    border-radius: 9px;
    background: #f1f3eb;
  }

  .public-order-juice-card .public-order-compare {
    color: #777c6d;
    font-size: .72rem;
    font-weight: 700;
  }

  .public-order-juice-card .public-order-price {
    color: var(--public-theme-primary);
    font-size: clamp(1.05rem, 1.15vw, 1.25rem);
    font-weight: 900;
    line-height: 1;
  }

  .public-order-juice-body .public-order-juice-actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 6px;
    margin-top: auto;
    padding-top: 7px;
  }

  .public-order-juice-body .public-order-juice-actions > *,
  .public-order-juice-body .public-order-juice-actions .public-order-juice-view,
  .public-order-juice-body .public-order-juice-actions .public-order-juice-action,
  .public-order-juice-body .public-order-juice-actions .public-order-juice-quantity {
    width: 100%;
    min-width: 0;
  }

  .public-order-juice-body .public-order-juice-view,
  .public-order-juice-body .public-order-juice-action {
    min-height: 35px;
    margin: 0;
    padding: 7px 9px;
    border-radius: 3px;
    font-size: .70rem;
    font-weight: 850;
    line-height: 1;
    text-transform: uppercase;
    box-shadow: none;
  }

  .public-order-juice-body .public-order-juice-view {
    border: 1px solid #ecefe5;
    background: #eef0e8;
    color: var(--public-theme-primary);
  }

  .public-order-juice-body .public-order-juice-action {
    border: 1px solid var(--public-theme-primary);
    background: var(--public-theme-primary);
    color: #ffffff;
  }

  .public-order-juice-body .public-order-juice-quantity {
    min-height: 35px;
    grid-template-columns: 34px minmax(34px, 1fr) 34px;
    gap: 4px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: transparent;
  }

  .public-order-juice-body .public-order-juice-quantity button,
  .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value {
    min-height: 35px;
    border-radius: 3px;
  }

  @media (min-width: 701px) {
    .public-order-juice-card .public-order-juice-body {
      gap: 9px;
      padding: 15px 15px 12px;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(1.24rem, 1.42vw, 1.56rem);
      line-height: 1.14;
    }

    .public-order-juice-card .public-order-juice-size {
      padding: 5px 10px;
      font-size: clamp(.82rem, .72vw, .90rem);
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.90rem, .82vw, 1rem);
      line-height: 1.7;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      max-height: 6.8em; /* four lines × 1.7 */
    }

    .public-order-juice-description-view-more {
      min-height: 1.7em;
      font-size: .74rem;
      line-height: 1.7;
    }

    .public-order-juice-card .public-order-price-row {
      padding: 5px 9px;
    }

    .public-order-juice-card .public-order-compare {
      font-size: .78rem;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(1.12rem, 1.18vw, 1.30rem);
    }

    .public-order-juice-body .public-order-juice-actions {
      gap: 6px;
      margin-top: auto;
      padding-top: 5px;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 37px;
      font-size: .72rem;
    }

    .public-order-juice-body .public-order-juice-quantity,
    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value {
      min-height: 37px;
    }
  }

  @media (max-width: 1180px) {
    .public-order-juice-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .public-order-juice-grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .public-order-juice-card {
      grid-template-columns: minmax(0, 46%) minmax(0, 54%);
      grid-template-rows: 1fr;
      min-height: 245px;
      align-items: stretch;
      border-radius: 12px;
    }

    .public-order-juice-card .public-order-juice-image,
    .public-order-juice-card .public-order-juice-image img {
      min-height: 245px;
      height: 100%;
      align-self: stretch;
      aspect-ratio: auto;
      border: 0;
    }

    .public-order-juice-favourite {
      top: 9px;
      left: calc(46% - 39px);
      width: 31px;
      height: 31px;
      font-size: 1.15rem;
    }

    .public-order-juice-card .public-order-juice-body {
      grid-column: 2;
      grid-row: 1;
      min-height: 245px;
      gap: 5px;
      padding: 10px 9px 8px;
    }

    .public-order-juice-body .public-order-juice-size {
      display: inline-flex !important;
    }

    .public-order-juice-card .public-order-juice-name {
      margin: 0 0 3px;
      font-size: clamp(.96rem, 4.8vw, 1.14rem);
      line-height: 1.12;
    }

    .public-order-juice-card .public-order-juice-size {
      padding: 3px 7px;
      font-size: .67rem;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: .68rem;
      line-height: 1.38;
    }

    /* Keep the Home/Public Markdown contract: 4 preview lines + View More. */
    .public-order-juice-card .public-order-juice-description-preview {
      max-height: 5.52em;
    }

    .public-order-juice-description-view-more {
      min-height: 1.38em;
      margin-top: 1px;
      font-size: .62rem;
      line-height: 1.38;
    }

    .public-order-juice-card .public-order-price-row {
      gap: 5px;
      margin-top: 2px;
      padding: 3px 7px;
      border-radius: 9px;
    }

    .public-order-juice-card .public-order-price {
      font-size: 1.03rem;
    }

    .public-order-juice-card .public-order-compare {
      font-size: .66rem;
    }

    .public-order-juice-body .public-order-juice-actions {
      display: grid !important;
      gap: 5px;
      margin-top: auto;
      padding-top: 5px;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 33px;
      padding: 6px 7px;
      font-size: .64rem;
    }

    .public-order-juice-body .public-order-juice-quantity {
      min-height: 33px;
      grid-template-columns: 31px minmax(31px, 1fr) 31px;
      gap: 3px;
    }

    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value {
      min-height: 33px;
      font-size: .70rem;
    }
  }

  @media (max-width: 430px) {
    .public-order-juice-card {
      grid-template-columns: minmax(0, 45%) minmax(0, 55%);
      min-height: 228px;
    }

    .public-order-juice-card .public-order-juice-image,
    .public-order-juice-card .public-order-juice-image img,
    .public-order-juice-card .public-order-juice-body {
      min-height: 228px;
    }

    .public-order-juice-favourite {
      left: calc(45% - 37px);
    }

    .public-order-juice-card .public-order-juice-body {
      padding: 9px 8px 7px;
    }
  }



  /* ================================================================
     EXACT HORIZONTAL ALIGNMENT WITH SITE HEADER / HOMEPAGE
     ================================================================
     Keep PublicOrderPage on the same responsive left/right content edge
     as the final SiteHeader CSS at every viewport width.
     ================================================================ */

  @media (min-width: 1700px) {
    .public-order-page {
      --public-order-page-gutter: clamp(32px, 2.5vw, 96px);
    }
  }

  @media (max-width: 1439px) {
    .public-order-page {
      --public-order-page-gutter: clamp(12px, 1.8vw, 24px);
    }
  }

  @media (max-width: 900px) {
    .public-order-page {
      --public-order-page-gutter: clamp(10px, 2vw, 18px);
    }
  }

  @media (max-width: 600px) {
    .public-order-page {
      --public-order-page-gutter: clamp(8px, 3vw, 12px);
    }
  }

  @media (max-width: 480px) {
    .public-order-page {
      --public-order-page-gutter: clamp(7px, 2.6vw, 10px);
    }
  }

  @media (max-width: 340px) {
    .public-order-page {
      --public-order-page-gutter: 7px;
    }
  }

  .public-order-shell {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: var(--public-order-page-gutter) !important;
    padding-right: var(--public-order-page-gutter) !important;
    box-sizing: border-box !important;
  }

  #catalogue,
  #catalogue .public-order-catalog-block,
  #catalogue .public-order-category,
  #catalogue .public-order-product-grid,
  #catalogue .public-order-juice-grid,
  #catalogue .public-order-subscription-grid {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin-left: 0;
    margin-right: 0;
    box-sizing: border-box;
  }



  /* ================================================================
     PUBLIC SUBSCRIPTION CARDS — DEDICATED SUBSCRIPTIONS PAGE REFERENCE
     Subscription-only override. All juice/catalog/checkout styles remain intact.
     ================================================================ */
  .public-order-subscription-mobile-summary,
  .public-order-subscription-media-toggle,
  .public-order-subscription-collapse,
  .public-order-subscription-mobile-meta,
  .public-order-subscription-plan-heading,
  .public-order-subscription-schedule-note,
  .public-order-subscription-product-info,
  .public-order-subscription-complimentary{
    display:none!important;
  }

  .public-order-subscription-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    align-items:stretch;
    justify-content:start;
    gap:18px;
    width:100%;
  }

  .public-order-subscription-reference-card{
    container-type:inline-size;
    display:grid!important;
    width:100%;
    max-width:590px;
    min-width:0;
    height:auto!important;
    min-height:0!important;
    grid-template-columns:minmax(0,52%) minmax(0,48%)!important;
    grid-template-areas:"media body" "bottom bottom"!important;
    grid-template-rows:auto auto!important;
    align-content:start;
    align-items:stretch;
    justify-self:start;
    overflow:hidden;
    border:1px solid var(--public-subscription-border)!important;
    border-radius:16px!important;
    background:#fff!important;
    box-shadow:0 8px 20px rgba(51,55,27,.065)!important;
    transition:none!important;
  }

  .public-order-subscription-reference-card:hover{
    transform:none!important;
    border-color:var(--public-subscription-border)!important;
    box-shadow:0 8px 20px rgba(51,55,27,.065)!important;
  }

  .public-order-subscription-reference-card.selected{
    border-color:var(--public-theme-primary)!important;
    box-shadow:0 0 0 3px rgba(51,55,27,.12),0 8px 20px rgba(51,55,27,.065)!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-media{
    position:relative;
    grid-area:media;
    width:100%;
    min-width:0;
    min-height:0!important;
    height:auto!important;
    aspect-ratio:4/5!important;
    align-self:start;
    overflow:hidden;
    border-right:1px solid var(--public-subscription-border)!important;
    border-bottom:0!important;
    background:#f7f7f2;
    isolation:isolate;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel{
    position:absolute;
    inset:0;
    overflow:hidden;
    background:#f7f7f2;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-image{
    position:absolute;
    inset:0;
    display:block;
    width:100%;
    height:100%;
    object-fit:cover;
    object-position:center;
    animation:public-order-subscription-reference-enter .48s cubic-bezier(.22,.61,.36,1) both!important;
  }

  @keyframes public-order-subscription-reference-enter{
    from{opacity:.2;transform:translateY(-20px) scale(1.012)}
    to{opacity:1;transform:translateY(0) scale(1)}
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel::after{
    content:"";
    position:absolute;
    inset:50% 0 0;
    background:linear-gradient(180deg,transparent,rgba(20,24,10,.86));
    pointer-events:none;
  }

  .public-order-subscription-image-badge{
    position:absolute;
    z-index:5;
    top:10px;
    right:10px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    max-width:calc(100% - 20px);
    padding:5px 10px;
    border:1px solid rgba(82,104,24,.22);
    border-radius:999px;
    background:rgba(255,255,255,.95);
    color:var(--public-subscription-unit);
    font-size:clamp(.66rem,2.3cqw,.8rem);
    font-weight:900;
    line-height:1;
    box-shadow:0 2px 8px rgba(20,24,10,.16);
    backdrop-filter:blur(5px);
    white-space:nowrap;
    pointer-events:none;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
    position:absolute;
    z-index:3;
    left:12px;
    right:12px;
    bottom:28px;
    display:grid;
    gap:2px;
    color:#fff;
    text-shadow:0 2px 8px rgba(0,0,0,.58);
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-label{
    font-size:clamp(.62rem,2.1cqw,.72rem);
    font-weight:900;
    letter-spacing:.06em;
    line-height:1.05;
    text-transform:uppercase;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-title{
    display:block;
    width:100%;
    overflow:visible;
    color:#fff;
    font-size:clamp(.78rem,2.7cqw,.96rem);
    font-weight:900;
    line-height:1.12;
    white-space:normal;
    overflow-wrap:anywhere;
    text-overflow:clip;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-control{
    display:none!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dots{
    position:absolute;
    z-index:4;
    left:9px;
    right:9px;
    bottom:9px;
    display:flex;
    justify-content:center;
    flex-wrap:wrap;
    gap:5px;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dot{
    width:6px;
    height:6px;
    padding:0;
    border:0;
    border-radius:50%;
    background:rgba(255,255,255,.56);
    box-shadow:0 1px 4px rgba(0,0,0,.35);
    cursor:pointer;
    transition:transform .2s ease,background .2s ease;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dot.active{
    background:#fff;
    transform:scale(1.32);
  }

  .public-order-subscription-reference-card .public-order-subscription-body{
    grid-area:body;
    display:grid!important;
    min-width:0;
    min-height:0!important;
    height:100%;
    grid-template-rows:auto auto minmax(0,1fr);
    align-content:stretch;
    gap:5px;
    padding:13px 13px 12px!important;
    overflow:hidden;
    background:#fff;
  }

  .public-order-subscription-reference-card .public-order-subscription-body>h4{
    display:block;
    overflow:visible;
    margin:0!important;
    color:var(--public-subscription-accent)!important;
    font-size:clamp(1rem,4cqw,1.25rem)!important;
    font-weight:900!important;
    line-height:1.08!important;
    letter-spacing:-.02em!important;
    overflow-wrap:anywhere;
  }

  .public-order-subscription-daily-heading{
    margin:0!important;
    color:var(--public-subscription-ink)!important;
    font-size:clamp(.72rem,2.5cqw,.84rem)!important;
    font-weight:900!important;
    line-height:1.15!important;
  }

  .public-order-subscription-day-menu{
    display:grid;
    min-height:0;
    grid-auto-rows:minmax(0,1fr);
    gap:4px;
    overflow:hidden;
  }

  .public-order-subscription-day-row{
    width:100%;
    min-width:0;
    min-height:0;
    display:grid;
    grid-template-columns:minmax(58px,29%) minmax(0,1fr);
    align-items:center;
    gap:6px;
    padding:5px 6px;
    overflow:hidden;
    border:1px solid rgba(51,55,27,.11);
    border-radius:8px;
    background:#fbfcf8;
    color:inherit;
    font:inherit;
    text-align:left;
    cursor:pointer;
    transition:background .22s ease,border-color .22s ease,transform .22s ease,box-shadow .22s ease;
  }

  .public-order-subscription-day-row:hover{
    border-color:rgba(82,104,24,.28);
    background:#f6f8ef;
  }

  .public-order-subscription-day-row.active{
    border-color:rgba(82,104,24,.30);
    background:#f0f4df;
    box-shadow:inset 3px 0 0 var(--public-subscription-accent);
    animation:public-order-subscription-day-active .34s ease both;
  }

  @keyframes public-order-subscription-day-active{
    from{opacity:.72;transform:translateY(-4px)}
    to{opacity:1;transform:translateY(0)}
  }

  .public-order-subscription-day-label{
    min-width:0;
    color:var(--public-theme-primary);
    font-size:clamp(.61rem,2cqw,.72rem);
    font-weight:900;
    line-height:1.12;
    overflow-wrap:anywhere;
  }

  .public-order-subscription-day-row.active .public-order-subscription-day-label{
    color:var(--public-subscription-accent);
  }

  .public-order-subscription-day-items{
    min-width:0;
    color:#4f5749;
    font-size:clamp(.59rem,1.88cqw,.70rem);
    font-weight:760;
    line-height:1.12;
    overflow:visible;
    white-space:normal;
    overflow-wrap:anywhere;
    word-break:normal;
  }

  .public-order-subscription-reference-card .public-order-subscription-bottom{
    grid-area:bottom;
    display:block!important;
    padding:10px 13px 13px!important;
    border-top:1px solid var(--public-subscription-border)!important;
    background:#fff!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-prices{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:7px!important;
    margin:0!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price{
    display:flex!important;
    min-width:0;
    min-height:38px!important;
    align-items:center!important;
    justify-content:space-between!important;
    flex-direction:row!important;
    gap:6px!important;
    padding:7px 8px!important;
    border:1px solid rgba(161,38,50,.16)!important;
    border-radius:8px!important;
    background:var(--public-subscription-accent-soft)!important;
    color:var(--public-subscription-muted)!important;
    font-size:clamp(.66rem,2.1cqw,.76rem)!important;
    font-weight:800!important;
    line-height:1.15!important;
    text-align:left!important;
    white-space:normal!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price span{
    min-width:0;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-price strong{
    flex:0 0 auto;
    margin:0;
    color:var(--public-subscription-accent)!important;
    font-size:clamp(.82rem,2.7cqw,.98rem)!important;
    font-weight:900!important;
    font-variant-numeric:tabular-nums;
    text-align:right;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions{
    display:flex!important;
    min-width:0;
    min-height:38px;
    align-items:stretch;
    margin:0!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
    width:100%!important;
    min-width:0;
    min-height:38px!important;
    margin:0!important;
    border-radius:8px!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action{
    padding:6px 9px!important;
    border:1px solid var(--public-theme-primary)!important;
    background:var(--public-theme-primary)!important;
    color:#fff!important;
    box-shadow:none!important;
    font-size:clamp(.68rem,2.1cqw,.78rem)!important;
    font-weight:900!important;
  }

  @media(max-width:1180px){
    .public-order-subscription-grid{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
    }
  }

  @media(max-width:700px){
    .public-order-subscription-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:14px!important;
    }

    .public-order-subscription-reference-card{
      max-width:none!important;
      grid-template-columns:minmax(0,52%) minmax(0,48%)!important;
      grid-template-areas:"media body" "bottom bottom"!important;
      grid-template-rows:auto auto!important;
      border-radius:14px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media{
      width:100%!important;
      height:auto!important;
      min-height:0!important;
      aspect-ratio:4/5!important;
      align-self:start!important;
      border-right:1px solid var(--public-subscription-border)!important;
      border-bottom:0!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      min-height:0!important;
      height:100%!important;
      gap:4px!important;
      padding:9px 8px 8px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      font-size:clamp(.9rem,4.25vw,1.06rem)!important;
      line-height:1.05!important;
    }

    .public-order-subscription-daily-heading{
      font-size:.67rem!important;
    }

    .public-order-subscription-day-menu{
      gap:3px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(47px,29%) minmax(0,1fr)!important;
      gap:4px!important;
      padding:4px 4px!important;
      border-radius:7px!important;
    }

    .public-order-subscription-day-label{
      font-size:clamp(.52rem,2.25vw,.62rem)!important;
      line-height:1.08!important;
    }

    .public-order-subscription-day-items{
      font-size:clamp(.50rem,2.12vw,.60rem)!important;
      line-height:1.08!important;
    }

    .public-order-subscription-image-badge{
      top:8px;
      right:8px;
      padding:4px 7px;
      font-size:.58rem;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
      left:8px;
      right:8px;
      bottom:22px;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-label{
      font-size:.55rem;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-title{
      font-size:clamp(.65rem,3vw,.78rem);
      line-height:1.08;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-dots{
      bottom:7px;
      gap:4px;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-dot{
      width:5px;
      height:5px;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom{
      padding:9px 10px 11px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-prices{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:7px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price,
    .public-order-subscription-reference-card .public-order-subscription-actions{
      min-height:40px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      padding:7px 8px!important;
      font-size:.67rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      font-size:.86rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
      min-height:40px!important;
      font-size:.72rem!important;
    }
  }

  @media(max-width:390px){
    .public-order-subscription-reference-card{
      grid-template-columns:minmax(0,51%) minmax(0,49%)!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      padding:8px 7px 7px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(43px,28%) minmax(0,1fr)!important;
      padding:3px 4px!important;
    }

    .public-order-subscription-day-label{
      font-size:.50rem!important;
    }

    .public-order-subscription-day-items{
      font-size:.49rem!important;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .public-order-subscription-reference-card .public-order-subscription-carousel-image,
    .public-order-subscription-day-row.active{
      animation:none!important;
    }
  }



  /* ================================================================
     SINGLE-ITEM SUBSCRIPTION CATEGORY ROWS
     ---------------------------------------------------------------
     Keep each category name as its own subscription section.
     When a category contains only one subscription, show up to THREE
     such categories in one row on web. Categories with 2+ items keep
     the existing full-width layout.
     ================================================================ */
  @media (min-width: 901px) {
    .public-order-subscription-categories-layout {
      display: flex;
      width: 100%;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 26px 18px;
    }

    .public-order-subscription-categories-layout > .public-order-category {
      margin-top: 0 !important;
      min-width: 0;
    }

    .public-order-subscription-categories-layout > .public-order-subscription-category-single {
      flex: 0 0 calc((100% - 36px) / 3);
      width: calc((100% - 36px) / 3) !important;
      max-width: none !important;
    }

    .public-order-subscription-category-single .public-order-subscription-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      width: 100%;
    }

    .public-order-subscription-category-single .public-order-subscription-reference-card {
      width: 100%;
      max-width: none !important;
    }

    .public-order-subscription-categories-layout > .public-order-subscription-category-multi {
      flex: 0 0 100%;
      width: 100% !important;
      max-width: none !important;
    }
  }

  @media (max-width: 900px) {
    .public-order-subscription-categories-layout {
      display: block;
      width: 100%;
    }
  }


  /* ================================================================
     EXACT SUBSCRIPTION CARD PARITY
     Matches the dedicated Subscriptions page card:
     - equal image/menu halves
     - fixed 8:5 main area
     - 4:5 image half
     - unit badge, synced day menu, compact prices and Subscribe button
     ================================================================ */
  .public-order-subscription-reference-card,
  .public-order-subscription-reference-card *{
    font-family:"Nunito",Arial,Helvetica,sans-serif!important;
    box-sizing:border-box;
  }

  .public-order-subscription-reference-card{
    container-type:inline-size;
    display:grid!important;
    width:100%;
    max-width:590px;
    min-width:0;
    height:auto!important;
    min-height:0!important;
    grid-template-columns:minmax(0,1fr)!important;
    grid-template-areas:
      "main"
      "bottom"!important;
    grid-template-rows:auto auto!important;
    align-content:start!important;
    justify-self:start;
    overflow:hidden!important;
    border:1px solid var(--public-subscription-border)!important;
    border-radius:16px!important;
    background:#fff!important;
    box-shadow:0 8px 20px rgba(51,55,27,.065)!important;
    transition:none!important;
  }

  .public-order-subscription-reference-card:hover{
    transform:none!important;
    border-color:var(--public-subscription-border)!important;
    box-shadow:0 8px 20px rgba(51,55,27,.065)!important;
  }

  .public-order-subscription-reference-card.selected{
    border-color:var(--public-theme-primary)!important;
    box-shadow:0 0 0 3px rgba(51,55,27,.12),0 8px 20px rgba(51,55,27,.065)!important;
  }

  .public-order-subscription-main{
    grid-area:main;
    display:grid;
    width:100%;
    min-width:0;
    min-height:0;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    grid-template-areas:"media body";
    grid-template-rows:1fr;
    aspect-ratio:8/5;
    overflow:hidden;
    background:#fff;
  }

  .public-order-subscription-reference-card .public-order-subscription-media{
    position:relative;
    grid-area:media;
    width:100%;
    height:100%!important;
    min-width:0;
    min-height:0!important;
    aspect-ratio:auto!important;
    align-self:stretch!important;
    overflow:hidden;
    border-right:1px solid var(--public-subscription-border)!important;
    border-bottom:0!important;
    background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft));
    isolation:isolate;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel{
    position:absolute;
    inset:0;
    overflow:hidden;
    background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft));
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-image{
    position:absolute;
    inset:0;
    display:block;
    width:100%;
    height:100%;
    object-fit:cover;
    object-position:center;
    animation:public-order-subscription-exact-enter .42s ease both!important;
  }

  @keyframes public-order-subscription-exact-enter{
    from{opacity:.15;transform:translateY(-16px) scale(1.012)}
    to{opacity:1;transform:translateY(0) scale(1)}
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-placeholder{
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:4rem;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel::after{
    content:"";
    position:absolute;
    inset:42% 0 0;
    background:linear-gradient(180deg,transparent,rgba(20,24,10,.88));
    pointer-events:none;
  }

  .public-order-subscription-image-badge{
    position:absolute;
    z-index:5;
    top:10px;
    right:10px;
    display:inline-flex;
    max-width:calc(100% - 20px);
    align-items:center;
    justify-content:center;
    padding:5px 10px;
    border:1px solid rgba(82,104,24,.28);
    border-radius:999px;
    background:rgba(255,255,255,.94);
    color:var(--public-subscription-unit);
    font-size:clamp(.72rem,2.5cqw,.9rem);
    font-weight:900;
    line-height:1.1;
    letter-spacing:.01em;
    box-shadow:0 2px 8px rgba(20,24,10,.18);
    backdrop-filter:blur(5px);
    -webkit-backdrop-filter:blur(5px);
    pointer-events:none;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
    position:absolute;
    z-index:2;
    left:12px;
    right:12px;
    bottom:30px;
    display:grid;
    gap:2px;
    color:#fff;
    text-shadow:0 2px 8px rgba(0,0,0,.45);
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-label{
    font-size:.64rem;
    font-weight:900;
    letter-spacing:.08em;
    text-transform:uppercase;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-title{
    display:block;
    width:100%;
    overflow:hidden;
    color:#fff;
    font-size:.9rem;
    font-weight:900;
    line-height:1.15;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-control{
    display:none!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dots{
    position:absolute;
    z-index:3;
    left:9px;
    right:9px;
    bottom:10px;
    display:flex;
    flex-wrap:wrap;
    justify-content:center;
    gap:5px;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dot{
    width:6px;
    height:6px;
    padding:0;
    border:0;
    border-radius:50%;
    background:rgba(255,255,255,.55);
    box-shadow:0 1px 4px rgba(0,0,0,.35);
    cursor:pointer;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-dot.active{
    background:#fff;
    transform:scale(1.25);
  }

  .public-order-subscription-reference-card .public-order-subscription-body{
    grid-area:body;
    display:flex!important;
    width:100%;
    height:100%!important;
    min-width:0;
    min-height:0!important;
    flex-direction:column!important;
    justify-content:flex-start!important;
    gap:9px!important;
    padding:18px 16px!important;
    overflow:hidden!important;
    background:#fff!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-body>h4{
    flex:0 0 auto;
    display:-webkit-box;
    overflow:hidden;
    margin:0 0 3px!important;
    color:var(--public-subscription-accent)!important;
    font-size:clamp(1.08rem,4.2cqw,1.3rem)!important;
    font-weight:900!important;
    line-height:1.1!important;
    letter-spacing:-.02em!important;
    overflow-wrap:anywhere;
    word-break:normal;
    -webkit-box-orient:vertical;
    -webkit-line-clamp:2;
  }

  .public-order-subscription-day-menu{
    display:flex;
    min-height:0;
    flex:1 1 auto;
    flex-direction:column;
    margin:0;
    overflow:hidden;
  }

  .public-order-subscription-daily-heading{
    flex:0 0 auto;
    margin:2px 0 4px!important;
    color:var(--public-subscription-ink)!important;
    font-size:clamp(.74rem,2.4cqw,.86rem)!important;
    font-weight:850!important;
    line-height:1.2!important;
  }

  .public-order-subscription-day-list{
    display:grid;
    min-height:0;
    flex:1 1 auto;
    gap:clamp(2px,.55cqw,5px);
    margin:0;
    padding:0;
    overflow:hidden;
    list-style:none;
  }

  .public-order-subscription-day-row{
    position:relative;
    width:100%;
    min-width:0;
    min-height:0;
    height:100%;
    display:grid;
    grid-template-columns:minmax(68px,.38fr) minmax(0,1fr);
    align-items:center;
    gap:clamp(4px,1cqw,7px);
    padding:clamp(2px,.65cqw,5px) clamp(5px,1cqw,7px);
    overflow:hidden;
    border:1px solid rgba(51,55,27,.09);
    border-radius:8px;
    background:#fbfcf8;
    color:inherit;
    text-align:left;
    cursor:pointer;
    transition:
      background .28s ease,
      border-color .28s ease,
      box-shadow .28s ease,
      transform .28s ease;
    outline:none;
    isolation:isolate;
  }

  .public-order-subscription-day-row::before{
    content:"";
    position:absolute;
    z-index:-1;
    inset:0;
    border-radius:inherit;
    background:linear-gradient(180deg,rgba(82,104,24,.13),rgba(82,104,24,.04));
    opacity:0;
    transform:scaleY(.06);
    transform-origin:top;
  }

  .public-order-subscription-day-row:hover{
    border-color:rgba(82,104,24,.28);
    background:#f7f9f1;
  }

  .public-order-subscription-day-row:focus-visible{
    border-color:rgba(82,104,24,.42);
    box-shadow:0 0 0 3px rgba(82,104,24,.12);
  }

  .public-order-subscription-day-row.active{
    border-color:rgba(82,104,24,.34);
    background:#f2f5e7;
    box-shadow:0 2px 8px rgba(51,55,27,.07);
    transform:translateX(2px);
  }

  .public-order-subscription-day-row.active::before{
    opacity:1;
    animation:public-order-subscription-day-fill 3.6s linear both;
  }

  @keyframes public-order-subscription-day-fill{
    from{transform:scaleY(.05)}
    to{transform:scaleY(1)}
  }

  .public-order-subscription-day-label{
    min-width:0;
    align-self:center;
    overflow:hidden;
    color:var(--public-theme-primary);
    font-size:clamp(.66rem,2.05cqw,.76rem);
    font-weight:900;
    line-height:1.2;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .public-order-subscription-day-row.active .public-order-subscription-day-label{
    color:var(--public-subscription-accent);
  }

  .public-order-subscription-day-items{
    align-self:center;
    display:block;
    min-width:0;
    overflow:visible;
    color:var(--public-subscription-muted);
    font-size:clamp(.58rem,1.78cqw,.70rem);
    font-weight:760;
    line-height:1.06;
    white-space:normal;
    overflow-wrap:anywhere;
    word-break:normal;
  }

  .public-order-subscription-day-items.is-long{
    font-size:clamp(.55rem,1.62cqw,.66rem);
    line-height:1.03;
  }

  .public-order-subscription-day-items.is-very-long{
    font-size:clamp(.51rem,1.48cqw,.61rem);
    line-height:1;
  }

  .public-order-subscription-day-row.active .public-order-subscription-day-items{
    color:var(--public-subscription-ink);
  }

  .public-order-subscription-reference-card .public-order-subscription-bottom{
    grid-area:bottom;
    display:block!important;
    padding:11px 14px 14px!important;
    border-top:1px solid var(--public-subscription-border)!important;
    background:#fff!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-prices{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:7px!important;
    margin:0!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price{
    display:flex!important;
    min-width:0;
    min-height:38px!important;
    align-items:center!important;
    justify-content:space-between!important;
    flex-direction:row!important;
    gap:6px!important;
    padding:7px 8px!important;
    border:1px solid rgba(161,38,50,.16)!important;
    border-radius:8px!important;
    background:var(--public-subscription-accent-soft)!important;
    color:var(--public-subscription-muted)!important;
    font-size:clamp(.66rem,2.1cqw,.76rem)!important;
    font-weight:800!important;
    line-height:1.15!important;
    white-space:normal!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price span{
    min-width:0;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-price strong{
    flex:0 0 auto;
    margin:0;
    color:var(--public-subscription-accent)!important;
    font-size:clamp(.82rem,2.7cqw,.98rem)!important;
    font-weight:900!important;
    font-variant-numeric:tabular-nums;
    text-align:right;
    white-space:nowrap;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions{
    display:flex!important;
    min-width:0;
    min-height:38px!important;
    align-items:stretch;
    margin:0!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
    width:100%!important;
    min-width:0;
    min-height:38px!important;
    margin:0!important;
    border-radius:8px!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action{
    padding:6px 9px!important;
    border:1px solid var(--public-theme-primary)!important;
    background:var(--public-theme-primary)!important;
    color:#fff!important;
    box-shadow:none!important;
    font-size:clamp(.68rem,2.1cqw,.78rem)!important;
    font-weight:900!important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action:hover{
    background:var(--public-theme-primary-hover)!important;
    border-color:var(--public-theme-primary-hover)!important;
  }

  /* Category heading proportions match the dedicated subscription page. */
  #subscriptions .public-order-category-head{
    align-items:end;
    margin-bottom:12px;
  }

  #subscriptions .public-order-category-head h3{
    margin:0;
    font-family:"Nunito",Arial,Helvetica,sans-serif!important;
    font-size:1.45rem;
    font-weight:800;
    line-height:1.15;
  }

  #subscriptions .public-order-category-head p{
    margin:3px 0 0;
    font-family:"Nunito",Arial,Helvetica,sans-serif!important;
    color:var(--public-subscription-muted);
    font-size:.88rem;
  }

  @media(max-width:700px){
    .public-order-subscription-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:12px!important;
    }

    .public-order-subscription-reference-card{
      width:100%!important;
      max-width:590px!important;
      grid-template-columns:minmax(0,1fr)!important;
      grid-template-areas:
        "main"
        "bottom"!important;
      grid-template-rows:auto auto!important;
      justify-self:center!important;
      border-radius:16px!important;
      box-shadow:0 4px 12px rgba(36,40,21,.055)!important;
    }

    .public-order-subscription-main{
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      grid-template-areas:"media body"!important;
      grid-template-rows:1fr!important;
      aspect-ratio:8/5!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media{
      width:100%!important;
      height:100%!important;
      aspect-ratio:auto!important;
      border-right:1px solid var(--public-subscription-border)!important;
      border-bottom:0!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      width:100%!important;
      height:100%!important;
      gap:4px!important;
      padding:9px 8px 8px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      margin:0 0 1px!important;
      font-size:clamp(.84rem,3.7vw,1rem)!important;
      line-height:1.06!important;
    }

    .public-order-subscription-daily-heading{
      margin:1px 0 4px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
      line-height:1.05!important;
    }

    .public-order-subscription-day-list{
      gap:3px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(47px,.40fr) minmax(0,1fr)!important;
      gap:4px!important;
      padding:2px 4px!important;
      border-radius:7px!important;
    }

    .public-order-subscription-day-label{
      font-size:clamp(.50rem,2.15vw,.61rem)!important;
      line-height:1.02!important;
    }

    .public-order-subscription-day-items{
      font-size:clamp(.48rem,2.05vw,.59rem)!important;
      line-height:1.01!important;
    }

    .public-order-subscription-day-items.is-long{
      font-size:clamp(.45rem,1.92vw,.56rem)!important;
      line-height:.99!important;
    }

    .public-order-subscription-day-items.is-very-long{
      font-size:clamp(.42rem,1.78vw,.53rem)!important;
      line-height:.97!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel::after{
      inset:42% 0 0!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
      left:10px!important;
      right:10px!important;
      bottom:25px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-label{
      font-size:clamp(.52rem,2.25vw,.64rem)!important;
      line-height:1!important;
      letter-spacing:.06em!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-title{
      font-size:clamp(.66rem,2.9vw,.82rem)!important;
      line-height:1.08!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-dots{
      bottom:8px!important;
      gap:4px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-dot{
      width:5px!important;
      height:5px!important;
    }

    .public-order-subscription-image-badge{
      top:8px!important;
      right:8px!important;
      max-width:calc(100% - 16px)!important;
      padding:4px 7px!important;
      font-size:clamp(.56rem,2.35vw,.70rem)!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom{
      padding:9px 10px 10px!important;
      background:#fcfdf9!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-prices{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:7px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      min-height:38px!important;
      gap:5px!important;
      padding:7px 8px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
      line-height:1.08!important;
      white-space:nowrap!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      font-size:clamp(.76rem,3.4vw,.90rem)!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
      min-height:38px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action{
      padding:6px 8px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
    }
  }

  @media(max-width:380px){
    .public-order-subscription-reference-card .public-order-subscription-body{
      gap:3px!important;
      padding:7px 6px 6px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      font-size:.78rem!important;
      line-height:1.02!important;
    }

    .public-order-subscription-daily-heading{
      margin-bottom:3px!important;
      font-size:.60rem!important;
    }

    .public-order-subscription-day-list{
      gap:2px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(43px,.40fr) minmax(0,1fr)!important;
      gap:3px!important;
      padding:2px 3px!important;
    }

    .public-order-subscription-day-label{
      font-size:.47rem!important;
    }

    .public-order-subscription-day-items{
      font-size:.45rem!important;
      line-height:.98!important;
    }

    .public-order-subscription-day-items.is-long{
      font-size:.42rem!important;
    }

    .public-order-subscription-day-items.is-very-long{
      font-size:.39rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      padding-left:6px!important;
      padding-right:6px!important;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .public-order-subscription-reference-card .public-order-subscription-carousel-image,
    .public-order-subscription-day-row.active::before{
      animation:none!important;
      transition:none!important;
    }
  }

  /* ================================================================
     OFFERS CATEGORY EXPERIENCE — ONE-DAY + SUBSCRIPTIONS
     Activates only when category name/slug/product_type contains the exact
     token Offer or Offers. Existing normal categories stay unchanged.
     ================================================================ */
  .public-order-offers-category-section{
    position:relative;
    isolation:isolate;
    width:100%!important;
    max-width:none!important;
    margin-top:14px!important;
    padding:clamp(12px,1.8vw,20px)!important;
    overflow:hidden;
    border:1px solid #d8dcc8;
    border-radius:22px;
    background:#f8f9f3;
    box-shadow:0 16px 42px rgba(51,55,27,.10);
  }

  .public-order-offers-category-section::after{
    content:"%";
    position:absolute;
    z-index:0;
    right:-18px;
    bottom:-48px;
    color:rgba(51,55,27,.045);
    font-size:clamp(8rem,18vw,15rem);
    font-weight:950;
    line-height:.8;
    transform:rotate(10deg);
    pointer-events:none;
  }

  .public-order-offers-category-section>*{position:relative;z-index:1}

  .public-order-offers-hero{
    position:relative;
    isolation:isolate;
    display:grid;
    grid-template-columns:minmax(0,1.35fr) minmax(180px,.65fr);
    align-items:center;
    gap:clamp(16px,3vw,34px);
    min-height:clamp(190px,19vw,260px);
    margin-bottom:14px;
    padding:clamp(20px,3vw,36px);
    overflow:hidden;
    border:1px solid rgba(231,222,181,.48);
    border-radius:20px;
    background-color:#33371b;
    background-image:radial-gradient(circle at 88% 24%,rgba(229,210,126,.18),transparent 26%),linear-gradient(118deg,#2b3016 0%,#33371b 58%,#444b22 100%);
    background-size:cover;
    background-position:center;
    background-repeat:no-repeat;
    box-shadow:0 16px 36px rgba(51,55,27,.18);
    color:#fff;
  }

  .public-order-offers-hero::before{
    content:"";
    position:absolute;
    z-index:0;
    inset:0;
    background:linear-gradient(90deg,rgba(33,37,18,.86) 0%,rgba(40,45,21,.66) 42%,rgba(51,55,27,.30) 70%,rgba(51,55,27,.12) 100%);
    pointer-events:none;
  }

  .public-order-offers-hero::after{
    content:"";
    position:absolute;
    z-index:1;
    top:-55%;
    bottom:-55%;
    left:-24%;
    width:13%;
    transform:skewX(-18deg);
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),rgba(225,207,132,.22),rgba(255,255,255,.07),transparent);
    pointer-events:none;
  }

  .public-order-offers-hero>*{position:relative;z-index:2}
  .public-order-offers-hero-copy{min-width:0}
  .public-order-offers-hero-eyebrow{
    display:inline-flex;min-height:25px;align-items:center;padding:5px 10px;
    border:1px solid rgba(232,219,163,.48);border-radius:999px;
    background:rgba(247,242,216,.10);color:#f4e9b5;
    font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:.66rem;font-weight:850;letter-spacing:.10em;
  }
  .public-order-offers-hero-copy>strong{
    display:block;margin-top:12px;color:#fff;font-family:"Nunito",Arial,Helvetica,sans-serif;
    font-size:clamp(1.9rem,3.3vw,3rem);font-weight:900;letter-spacing:-.035em;line-height:.98;
  }
  .public-order-offers-hero-copy>p{
    max-width:540px;margin:12px 0 0;color:rgba(255,255,255,.82);
    font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:clamp(.76rem,.95vw,.9rem);font-weight:650;line-height:1.48;
  }
  .public-order-offers-hero-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
  .public-order-offers-hero-pills span{
    display:inline-flex;min-height:27px;align-items:center;padding:5px 9px;
    border:1px solid rgba(240,231,193,.28);border-radius:999px;background:rgba(247,242,216,.10);
    color:#f8f4df;font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:.58rem;font-weight:820;letter-spacing:.04em;white-space:nowrap;
  }
  .public-order-offers-hero-badge{
    justify-self:center;width:min(100%,210px);min-height:132px;display:grid;place-items:center;align-content:center;gap:2px;padding:18px 20px;
    border:1px solid rgba(246,240,212,.58);border-radius:22px;
    background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.045)),rgba(45,49,24,.58);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 16px 34px rgba(23,26,11,.20);
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);text-align:center;
  }
  .public-order-offers-hero-badge span{color:#f5edc9;font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:.68rem;font-weight:850;letter-spacing:.13em}
  .public-order-offers-hero-badge strong{color:#fff;font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:clamp(1.8rem,3vw,2.8rem);font-weight:950;letter-spacing:-.04em;line-height:1}
  .public-order-offers-hero-badge small{color:rgba(255,255,255,.70);font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:.62rem;font-weight:700}

  .public-order-offers-category-section>.public-order-category-head{
    align-items:center!important;margin-bottom:13px!important;padding:10px 12px;
    border:1px solid #e0e3d4;border-radius:12px;background:#fff;box-shadow:0 8px 22px rgba(51,55,27,.055);
  }
  .public-order-offers-category-section .public-order-category-head h3{
    color:var(--public-theme-ink)!important;font-family:"Nunito",Arial,Helvetica,sans-serif!important;
    font-size:clamp(1.18rem,1.8vw,1.5rem)!important;font-weight:900!important;
  }
  .public-order-offers-category-kicker{
    display:block;margin-bottom:3px;color:#7a6120;font-family:"Nunito",Arial,Helvetica,sans-serif;
    font-size:.68rem;font-weight:900;letter-spacing:.07em;
  }
  .public-order-offers-count-chip{
    flex:0 0 auto;display:inline-flex;align-items:center;min-height:30px;padding:5px 10px;
    border:1px solid #dfe3ce;border-radius:999px;background:#eef0e6;color:#33371b;
    font-family:"Nunito",Arial,Helvetica,sans-serif;font-size:.68rem;font-weight:900;white-space:nowrap;
  }

  .public-order-juice-card.public-order-offer-card-highlight{
    border-color:#cfd5b7!important;background:#fff!important;box-shadow:0 10px 28px rgba(51,55,27,.10)!important;
  }
  .public-order-juice-card.public-order-offer-card-highlight:hover{
    border-color:#aeb98c!important;box-shadow:0 16px 34px rgba(51,55,27,.15)!important;
  }
  .public-order-juice-offer-badge,
  .public-order-subscription-offer-badge{
    position:absolute;z-index:8;top:10px;left:10px;display:inline-flex;min-height:26px;align-items:center;padding:5px 9px;
    border:1px solid rgba(255,255,255,.74);border-radius:999px;background:#a42b1d;color:#fff;
    box-shadow:0 6px 16px rgba(118,35,25,.24);font-family:"Nunito",Arial,Helvetica,sans-serif;
    font-size:.58rem;font-weight:900;letter-spacing:.055em;line-height:1;pointer-events:none;
  }
  .public-order-juice-card.public-order-offer-card-highlight .public-order-price{color:#24733d!important}
  .public-order-juice-card.public-order-offer-card-highlight .public-order-action{background:var(--public-theme-primary)!important}
  .public-order-juice-card.public-order-offer-card-highlight .public-order-product-badge{top:44px;left:10px}

  .public-order-subscription-reference-card.public-order-subscription-offer-highlight{
    border-color:#cfd5b7!important;box-shadow:0 10px 28px rgba(51,55,27,.10)!important;
  }
  .public-order-subscription-offer-highlight .public-order-subscription-price{
    border-color:#d9ddcc!important;background:#f1f3e9!important;
  }
  .public-order-subscription-offer-highlight .public-order-subscription-price strong{color:#33371b!important}
  .public-order-subscription-offer-highlight .public-order-subscription-actions .public-order-action{
    border-color:#33371b!important;background:#33371b!important;
  }

  @media(min-width:901px){
    .public-order-subscription-categories-layout>.public-order-offers-category-section{
      flex:0 0 100%!important;width:100%!important;max-width:none!important;
    }
    .public-order-subscription-categories-layout>.public-order-offers-category-section.public-order-subscription-category-single{
      flex-basis:100%!important;width:100%!important;
    }
    .public-order-offers-category-section.public-order-subscription-category-single .public-order-subscription-grid{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
    }
  }

  @media(max-width:700px){
    .public-order-offers-category-section{margin-top:10px!important;padding:8px!important;border-radius:16px}
    .public-order-offers-hero{
      grid-template-columns:minmax(0,1fr) auto;gap:8px;min-height:118px;margin-bottom:8px;padding:12px 10px;border-radius:13px;
    }
    .public-order-offers-hero-eyebrow{min-height:20px;padding:4px 7px;font-size:.49rem;letter-spacing:.07em}
    .public-order-offers-hero-copy>strong{margin-top:7px;font-size:clamp(1.24rem,6.3vw,1.62rem)}
    .public-order-offers-hero-copy>p{margin-top:6px;font-size:.60rem;line-height:1.32}
    .public-order-offers-hero-pills{gap:4px;margin-top:7px}
    .public-order-offers-hero-pills span{min-height:20px;padding:3px 5px;font-size:.42rem}
    .public-order-offers-hero-badge{width:76px;min-height:78px;padding:8px 6px;border-radius:13px}
    .public-order-offers-hero-badge span{font-size:.40rem}
    .public-order-offers-hero-badge strong{font-size:1.12rem}
    .public-order-offers-hero-badge small{font-size:.38rem}
    .public-order-offers-category-section>.public-order-category-head{gap:8px;margin-bottom:8px!important;padding:8px 9px;border-radius:10px}
    .public-order-offers-category-section .public-order-category-head h3{font-size:1.02rem!important}
    .public-order-offers-category-section .public-order-category-head p{font-size:.70rem!important;line-height:1.3}
    .public-order-offers-category-kicker{font-size:.50rem}
    .public-order-offers-count-chip{min-height:25px;padding:4px 7px;font-size:.52rem}
    .public-order-juice-offer-badge,.public-order-subscription-offer-badge{top:7px;left:7px;min-height:22px;padding:4px 6px;font-size:.42rem}
    .public-order-juice-card.public-order-offer-card-highlight .public-order-product-badge{top:36px;left:7px}
    .public-order-subscription-categories-layout>.public-order-offers-category-section.public-order-subscription-category-single .public-order-subscription-grid{
      grid-template-columns:minmax(0,1fr)!important;
    }
  }

  /* ================================================================
     FINAL MOBILE POLISH — PUBLIC ORDER / ONE-DAY / SUBSCRIPTIONS
     Keeps existing data, cart, checkout, offer detection and navigation.
     ================================================================ */
  @media(max-width:700px){
    .public-order-page{
      --public-order-page-gutter:10px;
      padding:22px 0 50px!important;
      overflow-x:hidden;
    }

    .public-order-shell{
      padding-left:var(--public-order-page-gutter)!important;
      padding-right:var(--public-order-page-gutter)!important;
    }

    .public-order-homepage-sections{
      margin-top:14px!important;
      gap:14px!important;
    }

    .public-order-section#catalogue{
      width:100%!important;
      margin-top:16px!important;
      padding:12px!important;
      border-radius:18px!important;
      box-shadow:0 10px 26px rgba(51,55,27,.06)!important;
    }

    #catalogue #subscriptions{
      padding-top:0!important;
    }

    #catalogue #juices{
      margin-top:22px!important;
      padding-top:20px!important;
    }

    .public-order-catalog-block-head{
      align-items:center!important;
      gap:9px!important;
      margin-bottom:12px!important;
    }

    .public-order-catalog-block-head h3{
      font-size:1.04rem!important;
      line-height:1.15!important;
    }

    .public-order-catalog-block-head p{
      margin-top:3px!important;
      font-size:.72rem!important;
      line-height:1.35!important;
    }

    .public-order-catalog-count{
      padding:5px 8px!important;
      font-size:.62rem!important;
      white-space:nowrap;
    }

    .public-order-category{
      margin-top:16px!important;
    }

    .public-order-category:first-of-type{
      margin-top:0!important;
    }

    .public-order-category-head{
      align-items:center!important;
      gap:8px!important;
      margin-bottom:10px!important;
    }

    .public-order-category-head>div{
      min-width:0;
    }

    .public-order-category h3{
      font-size:1.02rem!important;
      line-height:1.15!important;
      overflow-wrap:anywhere;
    }

    .public-order-category p{
      margin-top:3px!important;
      font-size:.70rem!important;
      line-height:1.32!important;
    }

    .public-order-category-head>small{
      flex:0 0 auto;
      font-size:.61rem!important;
      white-space:nowrap;
    }

    /* One-Day cards: compact two-column mobile catalogue card. */
    .public-order-juice-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:10px!important;
    }

    .public-order-juice-card{
      width:100%!important;
      max-width:none!important;
      min-height:236px!important;
      grid-template-columns:minmax(0,43%) minmax(0,57%)!important;
      grid-template-rows:1fr!important;
      align-items:stretch!important;
      overflow:hidden!important;
      border-radius:14px!important;
      box-shadow:0 6px 18px rgba(36,40,21,.07)!important;
    }

    .public-order-juice-card:hover{
      transform:none!important;
    }

    .public-order-juice-card .public-order-juice-image,
    .public-order-juice-card .public-order-juice-image img{
      width:100%!important;
      height:100%!important;
      min-height:236px!important;
      max-height:none!important;
      aspect-ratio:auto!important;
    }

    .public-order-juice-card .public-order-juice-image img{
      object-fit:cover!important;
      object-position:center!important;
    }

    .public-order-juice-card .public-order-juice-body{
      grid-column:2!important;
      grid-row:1!important;
      min-width:0!important;
      min-height:236px!important;
      gap:5px!important;
      padding:10px 9px 9px!important;
    }

    .public-order-juice-card .public-order-juice-name{
      margin:0 0 2px!important;
      font-size:clamp(.96rem,4.45vw,1.10rem)!important;
      line-height:1.10!important;
    }

    .public-order-juice-card .public-order-juice-size{
      max-width:100%;
      padding:3px 7px!important;
      font-size:.66rem!important;
      line-height:1.15!important;
      white-space:normal!important;
    }

    .public-order-juice-card .public-order-product-description{
      font-size:.70rem!important;
      line-height:1.36!important;
    }

    .public-order-juice-card .public-order-juice-description-preview{
      max-height:5.44em!important;
    }

    .public-order-juice-description-view-more{
      margin-top:1px!important;
      font-size:.62rem!important;
      line-height:1.3!important;
    }

    .public-order-juice-card .public-order-price-row{
      min-height:32px!important;
      max-width:100%!important;
      gap:5px!important;
      margin-top:2px!important;
      padding:4px 7px!important;
      border-radius:8px!important;
    }

    .public-order-juice-card .public-order-price{
      font-size:1.05rem!important;
    }

    .public-order-juice-card .public-order-compare{
      font-size:.63rem!important;
    }

    .public-order-juice-body .public-order-juice-actions{
      width:100%!important;
      gap:5px!important;
      margin-top:auto!important;
      padding-top:4px!important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action{
      min-height:34px!important;
      padding:6px 5px!important;
      border-radius:7px!important;
      font-size:.62rem!important;
      line-height:1.05!important;
    }

    .public-order-juice-body .public-order-juice-quantity{
      min-height:34px!important;
      grid-template-columns:30px minmax(28px,1fr) 30px!important;
      gap:3px!important;
    }

    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value{
      min-height:34px!important;
      font-size:.70rem!important;
    }

    .public-order-juice-favourite{
      top:8px!important;
      left:calc(43% - 37px)!important;
      width:30px!important;
      height:30px!important;
      font-size:1.08rem!important;
    }

    /* Subscriptions: full-width stacked mobile cards for readable schedules. */
    .public-order-subscription-categories-layout{
      display:block!important;
      width:100%!important;
    }

    .public-order-subscription-categories-layout>.public-order-category{
      width:100%!important;
      max-width:none!important;
      margin-top:16px!important;
    }

    .public-order-subscription-categories-layout>.public-order-category:first-child{
      margin-top:0!important;
    }

    .public-order-subscription-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:12px!important;
    }

    .public-order-subscription-reference-card{
      width:100%!important;
      max-width:none!important;
      grid-template-columns:minmax(0,1fr)!important;
      grid-template-areas:"main" "bottom"!important;
      grid-template-rows:auto auto!important;
      border-radius:16px!important;
      box-shadow:0 7px 20px rgba(36,40,21,.07)!important;
    }

    .public-order-subscription-main{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      grid-template-areas:"media" "body"!important;
      grid-template-rows:auto auto!important;
      aspect-ratio:auto!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media{
      grid-area:media!important;
      width:100%!important;
      height:auto!important;
      min-height:0!important;
      aspect-ratio:4/5!important;
      border-right:0!important;
      border-bottom:1px solid var(--public-subscription-border)!important;
      background:#fff!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel,
    .public-order-subscription-reference-card .public-order-subscription-carousel-image{
      width:100%!important;
      height:100%!important;
      aspect-ratio:4/5!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-image{
      object-fit:cover!important;
      object-position:center!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      grid-area:body!important;
      width:100%!important;
      height:auto!important;
      min-height:0!important;
      gap:7px!important;
      padding:13px 12px 11px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      margin:0 0 2px!important;
      font-size:1.08rem!important;
      line-height:1.12!important;
    }

    .public-order-subscription-daily-heading{
      margin:3px 0 5px!important;
      font-size:.73rem!important;
      line-height:1.15!important;
    }

    .public-order-subscription-day-list{
      gap:5px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(62px,.34fr) minmax(0,1fr)!important;
      gap:7px!important;
      padding:6px 7px!important;
      border-radius:8px!important;
    }

    .public-order-subscription-day-label{
      font-size:.66rem!important;
      line-height:1.2!important;
    }

    .public-order-subscription-day-items,
    .public-order-subscription-day-items.is-long,
    .public-order-subscription-day-items.is-very-long{
      font-size:.65rem!important;
      line-height:1.22!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
      left:12px!important;
      right:12px!important;
      bottom:29px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-label{
      font-size:.61rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-title{
      font-size:.84rem!important;
      line-height:1.12!important;
    }

    .public-order-subscription-image-badge{
      top:9px!important;
      right:9px!important;
      padding:5px 8px!important;
      font-size:.68rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom{
      padding:10px 11px 12px!important;
      background:#fcfdf9!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-prices{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:7px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      min-height:42px!important;
      gap:6px!important;
      padding:8px 9px!important;
      font-size:.70rem!important;
      line-height:1.12!important;
      white-space:normal!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      font-size:.90rem!important;
      white-space:nowrap!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions{
      margin-top:8px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
      min-height:40px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action{
      padding:7px 9px!important;
      font-size:.72rem!important;
      border-radius:8px!important;
    }

    /* Offers: readable mobile hero and clean section spacing. */
    .public-order-offers-category-section{
      width:100%!important;
      margin-top:12px!important;
      padding:8px!important;
      border-radius:16px!important;
    }

    .public-order-offers-hero{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:9px!important;
      min-height:0!important;
      margin-bottom:9px!important;
      padding:14px 12px!important;
      border-radius:14px!important;
    }

    .public-order-offers-hero::before{
      background:linear-gradient(110deg,rgba(33,37,18,.88),rgba(51,55,27,.63))!important;
    }

    .public-order-offers-hero-copy>strong{
      margin-top:8px!important;
      font-size:1.48rem!important;
      line-height:1.02!important;
    }

    .public-order-offers-hero-copy>p{
      max-width:none!important;
      margin-top:7px!important;
      font-size:.72rem!important;
      line-height:1.4!important;
    }

    .public-order-offers-hero-eyebrow{
      min-height:23px!important;
      padding:4px 8px!important;
      font-size:.55rem!important;
    }

    .public-order-offers-hero-pills{
      gap:5px!important;
      margin-top:9px!important;
    }

    .public-order-offers-hero-pills span{
      min-height:23px!important;
      padding:4px 7px!important;
      font-size:.52rem!important;
    }

    .public-order-offers-hero-badge{
      width:auto!important;
      min-height:42px!important;
      justify-self:start!important;
      display:flex!important;
      align-items:center!important;
      gap:7px!important;
      padding:7px 10px!important;
      border-radius:11px!important;
    }

    .public-order-offers-hero-badge span{
      font-size:.49rem!important;
    }

    .public-order-offers-hero-badge strong{
      font-size:1.03rem!important;
    }

    .public-order-offers-hero-badge small{
      font-size:.46rem!important;
    }

    .public-order-offers-category-section>.public-order-category-head{
      flex-wrap:wrap!important;
      align-items:flex-start!important;
      gap:7px!important;
      padding:9px!important;
    }

    .public-order-offers-count-chip{
      min-height:26px!important;
      padding:4px 7px!important;
      font-size:.56rem!important;
    }

    .public-order-juice-offer-badge,
    .public-order-subscription-offer-badge{
      top:7px!important;
      left:7px!important;
      min-height:23px!important;
      padding:4px 7px!important;
      font-size:.47rem!important;
      letter-spacing:.035em!important;
    }

    .public-order-subscription-offer-highlight .public-order-subscription-media{
      position:relative!important;
    }
  }

  @media(max-width:390px){
    .public-order-page{
      --public-order-page-gutter:7px;
    }

    .public-order-section#catalogue{
      padding:9px!important;
      border-radius:15px!important;
    }

    .public-order-juice-card{
      min-height:222px!important;
      grid-template-columns:minmax(0,42%) minmax(0,58%)!important;
    }

    .public-order-juice-card .public-order-juice-image,
    .public-order-juice-card .public-order-juice-image img,
    .public-order-juice-card .public-order-juice-body{
      min-height:222px!important;
    }

    .public-order-juice-card .public-order-juice-body{
      padding:8px 7px!important;
    }

    .public-order-juice-card .public-order-juice-name{
      font-size:.93rem!important;
    }

    .public-order-juice-card .public-order-product-description{
      font-size:.66rem!important;
      line-height:1.32!important;
    }

    .public-order-juice-card .public-order-juice-description-preview{
      max-height:5.28em!important;
    }

    .public-order-juice-favourite{
      left:calc(42% - 35px)!important;
      width:28px!important;
      height:28px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      padding:11px 9px 9px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(56px,.34fr) minmax(0,1fr)!important;
      gap:5px!important;
      padding:5px 6px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      padding:7px 7px!important;
      font-size:.65rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      font-size:.84rem!important;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .public-order-offers-hero::after,
    .public-order-juice-card.public-order-offer-card-highlight,
    .public-order-subscription-reference-card.public-order-subscription-offer-highlight{transition:none!important}
  }

  .public-order-subscription-price-suffix{
    margin-left:2px;
    color:inherit;
    font-size:.7em;
    font-weight:800;
    opacity:.78;
  }

  /* ================================================================
     FINAL SUBSCRIPTION MOBILE FIX
     Keep the existing card design unchanged: media stays on the left,
     schedule/content stays on the right, and pricing/actions stay below.
     A custom-only package therefore renders as: Custom | Subscribe.
     ================================================================ */
  @media(max-width:700px){
    .public-order-subscription-reference-card{
      width:100%!important;
      max-width:590px!important;
      grid-template-columns:minmax(0,1fr)!important;
      grid-template-areas:"main" "bottom"!important;
      grid-template-rows:auto auto!important;
      justify-self:center!important;
      border-radius:16px!important;
      box-shadow:0 4px 12px rgba(36,40,21,.055)!important;
    }

    .public-order-subscription-main{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      grid-template-areas:"media body"!important;
      grid-template-rows:1fr!important;
      aspect-ratio:8/5!important;
      min-height:0!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media{
      grid-area:media!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      aspect-ratio:auto!important;
      border-right:1px solid var(--public-subscription-border)!important;
      border-bottom:0!important;
      background:linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft))!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel,
    .public-order-subscription-reference-card .public-order-subscription-carousel-image{
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      aspect-ratio:auto!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-image{
      object-fit:cover!important;
      object-position:center!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body{
      grid-area:body!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      gap:4px!important;
      padding:9px 8px 8px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      margin:0 0 1px!important;
      font-size:clamp(.84rem,3.7vw,1rem)!important;
      line-height:1.06!important;
    }

    .public-order-subscription-daily-heading{
      margin:1px 0 4px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
      line-height:1.05!important;
    }

    .public-order-subscription-day-list{
      gap:3px!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(47px,.40fr) minmax(0,1fr)!important;
      gap:4px!important;
      padding:2px 4px!important;
      border-radius:7px!important;
    }

    .public-order-subscription-day-label{
      font-size:clamp(.50rem,2.15vw,.61rem)!important;
      line-height:1.02!important;
    }

    .public-order-subscription-day-items{
      font-size:clamp(.48rem,2.05vw,.59rem)!important;
      line-height:1.01!important;
    }

    .public-order-subscription-day-items.is-long{
      font-size:clamp(.45rem,1.92vw,.56rem)!important;
      line-height:.99!important;
    }

    .public-order-subscription-day-items.is-very-long{
      font-size:clamp(.42rem,1.78vw,.53rem)!important;
      line-height:.97!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-caption{
      left:10px!important;
      right:10px!important;
      bottom:25px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-label{
      font-size:clamp(.52rem,2.25vw,.64rem)!important;
      line-height:1!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-title{
      font-size:clamp(.66rem,2.9vw,.82rem)!important;
      line-height:1.08!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
      overflow:hidden!important;
    }

    .public-order-subscription-image-badge{
      top:8px!important;
      right:8px!important;
      max-width:calc(100% - 16px)!important;
      padding:4px 7px!important;
      font-size:clamp(.56rem,2.35vw,.70rem)!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom{
      padding:9px 10px 10px!important;
      background:#fcfdf9!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-prices{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:7px!important;
    }

    /* Custom-only keeps the exact same footer/card style: one price tile + action. */
    .public-order-subscription-reference-card .public-order-subscription-prices-single{
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price{
      min-height:38px!important;
      flex-direction:row!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:5px!important;
      padding:7px 8px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
      line-height:1.08!important;
      white-space:normal!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price span{
      min-width:0!important;
      white-space:nowrap!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      flex:0 0 auto!important;
      font-size:clamp(.76rem,3.4vw,.90rem)!important;
      white-space:nowrap!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price-custom strong{
      display:inline-flex!important;
      align-items:baseline!important;
      gap:1px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price-suffix{
      margin-left:1px!important;
      font-size:.62em!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control{
      min-height:38px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action{
      padding:6px 8px!important;
      font-size:clamp(.63rem,2.8vw,.72rem)!important;
      border-radius:8px!important;
    }
  }

  @media(max-width:380px){
    .public-order-subscription-reference-card .public-order-subscription-body{
      gap:3px!important;
      padding:7px 6px 6px!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body>h4{
      font-size:.78rem!important;
      line-height:1.02!important;
    }

    .public-order-subscription-daily-heading{
      margin-bottom:3px!important;
      font-size:.60rem!important;
    }

    .public-order-subscription-day-row{
      grid-template-columns:minmax(43px,.40fr) minmax(0,1fr)!important;
      gap:3px!important;
      padding:2px 3px!important;
    }

    .public-order-subscription-day-label{font-size:.47rem!important}
    .public-order-subscription-day-items{font-size:.45rem!important;line-height:.98!important}
    .public-order-subscription-day-items.is-long{font-size:.42rem!important}
    .public-order-subscription-day-items.is-very-long{font-size:.39rem!important}

    .public-order-subscription-reference-card .public-order-subscription-price{
      padding:7px 6px!important;
      font-size:.61rem!important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong{
      font-size:.80rem!important;
    }
  }


  /* ================================================================
     FINAL ONE-DAY MOBILE REFERENCE CARD
     Match the supplied reference without changing data/cart behavior:
     4:5 image on the left, product details on the right, then the existing
     View Item + Add to Cart / quantity controls stacked inside the right side.
     ================================================================ */
  @media(max-width:700px){
    .public-order-juice-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:12px!important;
    }

    .public-order-juice-card{
      width:100%!important;
      max-width:none!important;
      min-height:0!important;
      aspect-ratio:8/5!important;
      grid-template-columns:minmax(0,50%) minmax(0,50%)!important;
      grid-template-rows:minmax(0,1fr)!important;
      align-items:stretch!important;
      align-content:stretch!important;
      overflow:hidden!important;
      border:1px solid #dfe3d7!important;
      border-radius:13px!important;
      background:#fff!important;
      box-shadow:0 5px 16px rgba(36,40,21,.065)!important;
    }

    .public-order-juice-card:hover{
      transform:none!important;
    }

    .public-order-juice-card .public-order-juice-image{
      grid-column:1!important;
      grid-row:1!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      max-height:none!important;
      aspect-ratio:4/5!important;
      align-self:stretch!important;
      overflow:hidden!important;
      border:0!important;
      border-right:1px solid #eceee6!important;
      background:#f4f1e9!important;
    }

    .public-order-juice-card .public-order-juice-image img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      max-height:none!important;
      aspect-ratio:4/5!important;
      object-fit:cover!important;
      object-position:center!important;
    }

    /* Keep grams/kg on top of the image so the right-side content never
       changes the card height. The badge is an overlay and takes no layout space. */
    .public-order-juice-card .public-order-juice-image-size{
      position:absolute!important;
      left:9px!important;
      right:9px!important;
      bottom:9px!important;
      z-index:5!important;
      display:flex!important;
      min-height:29px!important;
      align-items:center!important;
      justify-content:center!important;
      margin:0!important;
      padding:5px 8px!important;
      border:1px solid rgba(82,104,24,.26)!important;
      border-radius:9px!important;
      background:rgba(244,248,232,.94)!important;
      box-shadow:0 4px 12px rgba(36,40,21,.12)!important;
      color:#425617!important;
      font-size:clamp(.62rem,2.7vw,.76rem)!important;
      font-weight:900!important;
      line-height:1.12!important;
      text-align:center!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
      pointer-events:none!important;
      backdrop-filter:blur(3px)!important;
      -webkit-backdrop-filter:blur(3px)!important;
    }

    /* The reference card keeps all metadata/actions on the right. */
    .public-order-juice-mobile-under-image,
    .public-order-juice-mobile-actions{
      display:none!important;
    }

    .public-order-juice-favourite{
      display:none!important;
    }

    .public-order-juice-card .public-order-juice-body{
      grid-column:2!important;
      grid-row:1!important;
      width:100%!important;
      height:100%!important;
      min-width:0!important;
      min-height:0!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:flex-start!important;
      gap:4px!important;
      padding:10px 12px 9px!important;
      overflow:hidden!important;
      background:#fff!important;
      text-align:left!important;
    }

    .public-order-juice-card .public-order-juice-name{
      min-height:0!important;
      display:-webkit-box!important;
      margin:0 0 2px!important;
      overflow:hidden!important;
      color:#ad2d18!important;
      font-size:clamp(.98rem,4.7vw,1.28rem)!important;
      font-weight:850!important;
      line-height:1.08!important;
      letter-spacing:-.01em!important;
      overflow-wrap:anywhere!important;
      -webkit-box-orient:vertical!important;
      -webkit-line-clamp:2!important;
    }

    .public-order-juice-body .public-order-juice-size,
    .public-order-juice-card .public-order-juice-size{
      display:none!important;
    }

    .public-order-juice-card .public-order-product-description{
      min-height:0!important;
      margin:0!important;
      color:#515847!important;
      font-size:clamp(.66rem,2.75vw,.79rem)!important;
      font-weight:500!important;
      line-height:1.30!important;
      overflow-wrap:anywhere!important;
      word-break:break-word!important;
    }

    .public-order-juice-card .public-order-juice-description-preview{
      max-height:3.90em!important; /* 3 lines on the compact reference card */
      overflow:hidden!important;
    }

    .public-order-juice-description-view-more{
      min-height:1.2em!important;
      margin-top:0!important;
      padding:0!important;
      color:var(--public-theme-primary)!important;
      font-size:clamp(.58rem,2.45vw,.68rem)!important;
      font-weight:900!important;
      line-height:1.2!important;
      text-decoration:underline!important;
    }

    .public-order-juice-card .public-order-price-row{
      width:fit-content!important;
      max-width:100%!important;
      min-height:29px!important;
      display:inline-flex!important;
      align-items:center!important;
      gap:5px!important;
      margin-top:1px!important;
      padding:4px 8px!important;
      border:1px solid #d4dac8!important;
      border-radius:9px!important;
      background:#eef0e8!important;
    }

    .public-order-juice-card .public-order-price{
      color:#33371b!important;
      font-size:clamp(1rem,4.1vw,1.20rem)!important;
      font-weight:900!important;
      line-height:1!important;
    }

    .public-order-juice-card .public-order-compare{
      color:#777c6d!important;
      font-size:clamp(.58rem,2.35vw,.68rem)!important;
      font-weight:700!important;
      line-height:1!important;
    }

    .public-order-juice-body .public-order-juice-actions{
      width:100%!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:6px!important;
      margin-top:auto!important;
      padding-top:4px!important;
    }

    .public-order-juice-body .public-order-juice-actions>*{
      width:100%!important;
      min-width:0!important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action{
      width:100%!important;
      min-height:33px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      margin:0!important;
      padding:6px 7px!important;
      border-radius:3px!important;
      font-size:clamp(.60rem,2.55vw,.70rem)!important;
      font-weight:850!important;
      line-height:1!important;
      letter-spacing:.005em!important;
      text-align:center!important;
      text-transform:uppercase!important;
      box-shadow:none!important;
    }

    .public-order-juice-body .public-order-juice-view{
      border:1px solid #ecefe5!important;
      background:#eef0e8!important;
      color:#242815!important;
    }

    .public-order-juice-body .public-order-juice-action{
      border:1px solid #33371b!important;
      background:#33371b!important;
      color:#fff!important;
    }

    .public-order-juice-body .public-order-juice-action:hover:not(:disabled){
      border-color:#454b24!important;
      background:#454b24!important;
      color:#fff!important;
    }

    .public-order-juice-body .public-order-juice-quantity{
      width:100%!important;
      min-height:33px!important;
      grid-template-columns:32px minmax(30px,1fr) 32px!important;
      gap:4px!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      background:transparent!important;
    }

    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value{
      min-height:33px!important;
      border-radius:3px!important;
      font-size:.72rem!important;
    }

    /* Offer/featured badges remain supported without changing the reference grid. */
    .public-order-juice-offer-badge{
      top:7px!important;
      left:7px!important;
      max-width:calc(100% - 14px)!important;
    }

    .public-order-juice-card.public-order-offer-card-highlight .public-order-product-badge{
      top:35px!important;
      left:7px!important;
    }
  }

  @media(max-width:390px){
    .public-order-juice-card{
      aspect-ratio:8/5!important;
      grid-template-columns:minmax(0,50%) minmax(0,50%)!important;
      min-height:0!important;
    }

    .public-order-juice-card .public-order-juice-body{
      min-height:0!important;
      padding:8px 8px 7px!important;
      gap:3px!important;
    }

    .public-order-juice-card .public-order-juice-name{
      font-size:clamp(.88rem,4.5vw,1rem)!important;
    }

    .public-order-juice-card .public-order-product-description{
      font-size:.62rem!important;
      line-height:1.24!important;
    }

    .public-order-juice-card .public-order-juice-description-preview{
      max-height:2.48em!important; /* 2 lines on very narrow devices */
    }

    .public-order-juice-card .public-order-price-row{
      min-height:27px!important;
      padding:3px 6px!important;
    }

    .public-order-juice-card .public-order-price{
      font-size:.96rem!important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action,
    .public-order-juice-body .public-order-juice-quantity,
    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value{
      min-height:30px!important;
    }
  }


  /* ================================================================
     FINAL MOBILE ALIGNMENT + ONE-DAY TITLE VISIBILITY
     ---------------------------------------------------------------
     Keep the current card designs and behavior. Only:
     1) remove the extra nested horizontal catalogue padding so sections/cards
        line up with the same mobile gutter used by the header;
     2) make the One-Day product title a normal two-line block so WebKit line
        clamping cannot crop the first line on narrow screens.
     ================================================================ */
  @media(max-width:700px){
    .public-order-page{
      --public-order-page-gutter:10px!important;
    }

    .public-order-shell{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
      padding-left:var(--public-order-page-gutter)!important;
      padding-right:var(--public-order-page-gutter)!important;
    }

    /* The shell already supplies the mobile page gutter. Avoid adding a
       second 9/12px inset inside the catalogue. */
    .public-order-section#catalogue{
      width:100%!important;
      margin-left:0!important;
      margin-right:0!important;
      padding-left:0!important;
      padding-right:0!important;
    }

    #catalogue .public-order-catalog-block,
    #catalogue .public-order-category,
    #catalogue .public-order-product-grid,
    #catalogue .public-order-subscription-categories-layout{
      width:100%!important;
      max-width:none!important;
      margin-left:0!important;
      margin-right:0!important;
      box-sizing:border-box!important;
    }

    /* Offer sections retain their own internal padding, but their OUTER edge
       now starts on the same line as the header and normal product cards. */
    #catalogue .public-order-offers-category-section{
      margin-left:0!important;
      margin-right:0!important;
    }

    /* Make the product name reliably visible. A normal block is more robust
       here than -webkit-box line clamping inside the fixed 4:5 reference card. */
    .public-order-juice-card .public-order-juice-body{
      padding-top:11px!important;
      overflow:hidden!important;
    }

    .public-order-juice-card .public-order-juice-name{
      position:relative!important;
      z-index:2!important;
      flex:0 0 auto!important;
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-height:0!important;
      max-height:2.28em!important;
      margin:0 0 3px!important;
      padding:0!important;
      overflow:hidden!important;
      visibility:visible!important;
      opacity:1!important;
      color:#ad2d18!important;
      font-size:clamp(.94rem,4.45vw,1.18rem)!important;
      font-weight:850!important;
      line-height:1.10!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
      word-break:normal!important;
      -webkit-box-orient:initial!important;
      -webkit-line-clamp:unset!important;
      line-clamp:unset!important;
      text-overflow:clip!important;
    }
  }

  @media(max-width:390px){
    .public-order-page{
      --public-order-page-gutter:10px!important;
    }

    .public-order-juice-card .public-order-juice-body{
      padding-top:9px!important;
    }

    .public-order-juice-card .public-order-juice-name{
      max-height:2.24em!important;
      font-size:clamp(.86rem,4.25vw,.98rem)!important;
      line-height:1.08!important;
    }
  }


  /* ================================================================
     FINAL PUBLIC PRODUCT CARD — MATCH HOMEPAGE CARD DESIGN
     - 3 cards per row on desktop
     - horizontal image-left / content-right layout
     - image area is a true 4:5 ratio
     - full card ratio stays 8:5, so the 4:5 image fills the full height
     - size/unit pill sits on the image, large and red
     - larger readable title/description/price/actions
     - responsive 2-column tablet + 1-column phone fallback
     ================================================================ */

  .public-order-juice-grid {
    width: 100% !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    align-items: start !important;
    gap: clamp(10px, .9vw, 16px) !important;
  }

  .public-order-juice-card,
  .public-order-juice-card.public-order-offer-card-highlight {
    container-type: inline-size !important;
    position: relative !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    aspect-ratio: 8 / 5 !important;

    display: grid !important;
    grid-template-columns: minmax(0, 50%) minmax(0, 50%) !important;
    grid-template-rows: minmax(0, 1fr) !important;
    align-items: stretch !important;
    align-content: stretch !important;

    overflow: hidden !important;
    border: 1px solid #dfe3d7 !important;
    border-radius: 13px !important;
    background: #ffffff !important;
    box-shadow: 0 5px 16px rgba(36,40,21,.065) !important;
  }

  .public-order-juice-card:hover,
  .public-order-juice-card.public-order-offer-card-highlight:hover {
    transform: translateY(-2px) !important;
    border-color: #cbd1ba !important;
    box-shadow: 0 12px 26px rgba(36,40,21,.10) !important;
  }

  .public-order-juice-card .public-order-juice-image {
    position: relative !important;
    grid-column: 1 !important;
    grid-row: 1 !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    align-self: stretch !important;
    aspect-ratio: 4 / 5 !important;
    overflow: hidden !important;
    border: 0 !important;
    border-right: 1px solid #eceee6 !important;
    border-radius: 0 !important;
    background: #f4f1e9 !important;
  }

  .public-order-juice-card .public-order-juice-image img {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    display: block !important;
    aspect-ratio: 4 / 5 !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  /* Large red size/unit pill on the image, same treatment as HomePage. */
  .public-order-juice-card .public-order-juice-image-size {
    position: absolute !important;
    z-index: 15 !important;
    left: 10px !important;
    right: auto !important;
    bottom: 10px !important;

    display: inline-flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;

    width: fit-content !important;
    max-width: calc(100% - 20px) !important;
    min-height: 34px !important;

    margin: 0 !important;
    padding: 6px 10px !important;

    border: 1px solid rgba(181,28,28,.30) !important;
    border-radius: 999px !important;

    background: rgba(255,248,248,.97) !important;
    color: #c62828 !important;

    box-shadow:
      0 6px 16px rgba(120,20,20,.18),
      0 0 0 2px rgba(255,255,255,.35) !important;

    font-size: clamp(.78rem, 2.9cqw, .98rem) !important;
    font-weight: 900 !important;
    line-height: 1.08 !important;
    letter-spacing: .005em !important;
    text-align: left !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;

    pointer-events: none !important;
    backdrop-filter: blur(3px) !important;
    -webkit-backdrop-filter: blur(3px) !important;
  }

  /* Remove the duplicate size pill from the content side. */
  .public-order-juice-body .public-order-juice-size,
  .public-order-juice-card .public-order-juice-size,
  .public-order-juice-mobile-under-image,
  .public-order-juice-mobile-actions {
    display: none !important;
  }

  .public-order-juice-card .public-order-juice-body {
    grid-column: 2 !important;
    grid-row: 1 !important;

    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;

    gap: clamp(4px, 1.1cqw, 7px) !important;
    padding: clamp(8px, 2.2cqw, 12px) !important;

    overflow: hidden !important;
    background: #ffffff !important;
    text-align: left !important;
  }

  .public-order-juice-card .public-order-juice-name {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;

    display: -webkit-box !important;
    overflow: hidden !important;

    color: #ad2d18 !important;
    font-size: clamp(.94rem, 3.6cqw, 1.18rem) !important;
    font-weight: 850 !important;
    line-height: 1.10 !important;
    letter-spacing: -.01em !important;

    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .public-order-juice-card .public-order-product-description {
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;

    color: #515847 !important;
    font-size: clamp(.69rem, 2.45cqw, .82rem) !important;
    font-weight: 500 !important;
    line-height: 1.34 !important;

    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .public-order-juice-card .public-order-juice-description-preview {
    max-height: 5.36em !important; /* 4 lines */
    overflow: hidden !important;
  }

  .public-order-juice-description-view-more {
    min-height: 1.2em !important;
    margin-top: 0 !important;
    padding: 0 !important;

    color: var(--public-theme-primary) !important;
    font-size: clamp(.67rem, 2.25cqw, .78rem) !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
    text-decoration: underline !important;
  }

  .public-order-juice-card .public-order-price-row {
    width: fit-content !important;
    max-width: 100% !important;
    min-height: 31px !important;

    display: inline-flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 5px !important;

    margin: 0 !important;
    padding: 4px 8px !important;

    border: 1px solid #d4dac8 !important;
    border-radius: 9px !important;
    background: #eef0e8 !important;
  }

  .public-order-juice-card .public-order-price {
    color: #33371b !important;
    font-size: clamp(1.04rem, 3.55cqw, 1.24rem) !important;
    font-weight: 900 !important;
    line-height: 1 !important;
  }

  .public-order-juice-card .public-order-compare {
    color: #777c6d !important;
    font-size: clamp(.62rem, 2.10cqw, .74rem) !important;
    font-weight: 700 !important;
    line-height: 1 !important;
  }

  .public-order-juice-body .public-order-juice-actions {
    width: 100% !important;
    min-width: 0 !important;

    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;

    gap: 6px !important;
    margin-top: 0 !important;
    padding-top: 2px !important;
  }

  .public-order-juice-body .public-order-juice-actions > *,
  .public-order-juice-body .public-order-juice-view,
  .public-order-juice-body .public-order-juice-action,
  .public-order-juice-body .public-order-juice-quantity {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .public-order-juice-body .public-order-juice-view,
  .public-order-juice-body .public-order-juice-action {
    min-height: 34px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    margin: 0 !important;
    padding: 6px 7px !important;

    border-radius: 3px !important;

    font-size: clamp(.62rem, 2.05cqw, .74rem) !important;
    font-weight: 850 !important;
    line-height: 1 !important;
    letter-spacing: .005em !important;
    text-align: center !important;
    text-transform: uppercase !important;
    box-shadow: none !important;
  }

  .public-order-juice-body .public-order-juice-view {
    order: 1 !important;
    border: 1px solid #ecefe5 !important;
    background: #eef0e8 !important;
    color: #242815 !important;
  }

  .public-order-juice-body .public-order-juice-action,
  .public-order-juice-body .public-order-juice-quantity {
    order: 2 !important;
  }

  .public-order-juice-body .public-order-juice-action {
    border: 1px solid #33371b !important;
    background: #33371b !important;
    color: #ffffff !important;
  }

  .public-order-juice-body .public-order-juice-action:hover:not(:disabled) {
    border-color: #454b24 !important;
    background: #454b24 !important;
    color: #ffffff !important;
  }

  .public-order-juice-body .public-order-juice-quantity {
    min-height: 34px !important;
    grid-template-columns: 32px minmax(30px, 1fr) 32px !important;
    gap: 4px !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
  }

  .public-order-juice-body .public-order-juice-quantity button,
  .public-order-juice-body .public-order-juice-quantity .public-order-quantity-value {
    min-height: 34px !important;
    border-radius: 3px !important;
    font-size: .72rem !important;
  }

  .public-order-juice-favourite {
    z-index: 16 !important;
    top: 8px !important;
    left: calc(50% - 36px) !important;
    right: auto !important;
    width: 28px !important;
    height: 28px !important;
  }

  .public-order-juice-offer-badge {
    top: 8px !important;
    left: 8px !important;
    z-index: 17 !important;
    max-width: calc(100% - 16px) !important;
  }

  /* Keep Featured visible below SPECIAL OFFER instead of overlapping it. */
  .public-order-juice-card.public-order-offer-card-highlight .public-order-product-badge {
    top: 40px !important;
    left: 8px !important;
    z-index: 16 !important;
  }

  /* Compact desktop still keeps exactly 3 cards per row. */
  @media (min-width: 901px) and (max-width: 1180px) {
    .public-order-juice-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .public-order-juice-card .public-order-juice-body {
      gap: 3px !important;
      padding: 6px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.80rem, 3.7cqw, .95rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.57rem, 2.65cqw, .68rem) !important;
      line-height: 1.27 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      max-height: 3.81em !important; /* 3 lines */
    }

    .public-order-juice-description-view-more {
      font-size: clamp(.57rem, 2.35cqw, .66rem) !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(.90rem, 3.8cqw, 1.03rem) !important;
    }

    .public-order-juice-card .public-order-compare {
      font-size: .58rem !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 29px !important;
      padding: 4px !important;
      font-size: clamp(.52rem, 2.25cqw, .61rem) !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 7px !important;
      bottom: 7px !important;
      max-width: calc(100% - 14px) !important;
      min-height: 29px !important;
      padding: 5px 7px !important;
      font-size: clamp(.66rem, 3cqw, .78rem) !important;
    }
  }

  /* Tablet: two cards per row. */
  @media (max-width: 900px) {
    .public-order-juice-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    .public-order-juice-card {
      aspect-ratio: 8 / 5 !important;
    }
  }

  /* Phone: one full-width horizontal card, same design. */
  @media (max-width: 600px) {
    .public-order-juice-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 12px !important;
    }

    .public-order-juice-card,
    .public-order-juice-card.public-order-offer-card-highlight {
      aspect-ratio: 8 / 5 !important;
      grid-template-columns: minmax(0, 50%) minmax(0, 50%) !important;
      border-radius: 13px !important;
    }

    .public-order-juice-card .public-order-juice-body {
      gap: 4px !important;
      padding: 8px 8px 7px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.90rem, 4.2vw, 1.06rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.64rem, 2.7vw, .74rem) !important;
      line-height: 1.30 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      max-height: 3.90em !important; /* 3 lines */
    }

    .public-order-juice-description-view-more {
      font-size: clamp(.62rem, 2.5vw, .70rem) !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(1rem, 4.2vw, 1.16rem) !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 32px !important;
      font-size: clamp(.59rem, 2.5vw, .68rem) !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 7px !important;
      bottom: 7px !important;
      max-width: calc(100% - 14px) !important;
      min-height: 28px !important;
      padding: 5px 7px !important;
      font-size: clamp(.68rem, 3vw, .82rem) !important;
    }

    .public-order-juice-favourite {
      display: none !important;
    }
  }

  @media (max-width: 390px) {
    .public-order-juice-card .public-order-juice-body {
      gap: 3px !important;
      padding: 7px 6px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.82rem, 4.25vw, .94rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.59rem, 2.8vw, .67rem) !important;
      line-height: 1.27 !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 6px !important;
      bottom: 6px !important;
      max-width: calc(100% - 12px) !important;
      min-height: 26px !important;
      padding: 4px 6px !important;
      font-size: clamp(.62rem, 3.05vw, .74rem) !important;
    }
  }


  /* ================================================================
     FINAL PUBLIC SUBSCRIPTION CARD — SUBSCRIPTIONS PAGE REFERENCE
     Mirrors the supplied SubscriptionsPage card:
       - 3 cards per row on desktop
       - 4:5 image at left
       - title + Daily menu at right
       - compact "View details" buttons
       - plan prices + Subscribe in bottom row
       - larger RED unit badge on image
     ================================================================ */

  .public-order-subscription-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    align-items: stretch !important;
    gap: 18px !important;
  }

  .public-order-subscription-reference-card {
    container-type: inline-size !important;
    width: 100% !important;
    max-width: 590px !important;
    min-width: 0 !important;
    height: 100% !important;
    min-height: 0 !important;

    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    grid-template-areas:
      "media body"
      "bottom bottom" !important;
    grid-template-rows: auto auto !important;

    align-content: start !important;
    align-items: stretch !important;
    justify-self: start !important;

    overflow: hidden !important;
    border: 1px solid var(--public-subscription-border) !important;
    border-radius: 16px !important;
    background: #ffffff !important;
    box-shadow: 0 8px 20px rgba(51,55,27,.065) !important;
    transition: none !important;
  }

  .public-order-subscription-reference-card:hover {
    transform: none !important;
    border-color: var(--public-subscription-border) !important;
    box-shadow: 0 8px 20px rgba(51,55,27,.065) !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-main {
    display: contents !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-media {
    position: relative !important;
    grid-area: media !important;
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 4 / 5 !important;
    align-self: start !important;
    overflow: hidden !important;
    border-right: 1px solid var(--public-subscription-border) !important;
    border-bottom: 0 !important;
    background: linear-gradient(145deg,#f7f7f2,var(--public-theme-primary-soft)) !important;
    isolation: isolate !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel,
  .public-order-subscription-reference-card .public-order-subscription-carousel-image {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-image {
    display: block !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel::after {
    content: "" !important;
    position: absolute !important;
    inset: 42% 0 0 !important;
    background: linear-gradient(180deg,transparent,rgba(20,24,10,.88)) !important;
    pointer-events: none !important;
  }

  /* Larger red size/unit badge from the reference page. */
  .public-order-subscription-image-badge {
    position: absolute !important;
    z-index: 6 !important;
    top: 10px !important;
    right: 10px !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    max-width: calc(100% - 20px) !important;
    min-height: 32px !important;
    padding: 6px 12px !important;

    border: 1px solid rgba(161,38,50,.28) !important;
    border-radius: 999px !important;

    background: rgba(255,255,255,.97) !important;
    color: var(--public-subscription-accent) !important;

    box-shadow: 0 3px 10px rgba(20,24,10,.20) !important;

    font-size: clamp(.84rem,2.9cqw,1.02rem) !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
    letter-spacing: .01em !important;
    white-space: nowrap !important;
    pointer-events: none !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-caption {
    left: 12px !important;
    right: 12px !important;
    bottom: 30px !important;
    gap: 2px !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-label {
    font-size: .64rem !important;
    font-weight: 900 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-carousel-title {
    overflow: hidden !important;
    color: #ffffff !important;
    font-size: .9rem !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-body {
    grid-area: body !important;
    display: flex !important;
    min-width: 0 !important;
    min-height: 100% !important;
    height: auto !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    gap: 9px !important;
    padding: 18px 16px !important;
    overflow: hidden !important;
    background: #ffffff !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-body > h4 {
    display: block !important;
    overflow: visible !important;
    margin: 0 0 3px !important;
    color: var(--public-subscription-accent) !important;
    font-size: clamp(1.08rem,4.2cqw,1.3rem) !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
    letter-spacing: -.02em !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .public-order-subscription-daily-heading {
    margin: 5px 0 3px !important;
    color: var(--public-subscription-ink) !important;
    font-size: clamp(.74rem,2.4cqw,.86rem) !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
  }

  .public-order-subscription-day-menu {
    min-width: 0 !important;
    margin: 1px 0 0 !important;
  }

  .public-order-subscription-day-list {
    display: grid !important;
    min-height: 0 !important;
    gap: 5px !important;
    margin: 0 !important;
    padding: 0 !important;
    list-style: none !important;
  }

  .public-order-subscription-day-row {
    display: grid !important;
    grid-template-columns: minmax(68px,.38fr) minmax(0,1fr) !important;
    align-items: center !important;
    gap: 7px !important;

    min-width: 0 !important;
    min-height: 0 !important;
    padding: 5px 7px !important;

    border: 1px solid rgba(51,55,27,.09) !important;
    border-radius: 8px !important;
    background: #fbfcf8 !important;

    cursor: default !important;
  }

  .public-order-subscription-day-label {
    min-width: 0 !important;
    color: var(--public-theme-primary) !important;
    font-size: clamp(.66rem,2.05cqw,.76rem) !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
    overflow-wrap: anywhere !important;
  }

  .public-order-subscription-day-row.active .public-order-subscription-day-label {
    color: var(--public-subscription-accent) !important;
  }

  .public-order-subscription-day-view-button {
    justify-self: end !important;
    display: inline-flex !important;
    min-width: 82px !important;
    min-height: 27px !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 4px 9px !important;

    border: 1px solid rgba(82,104,24,.22) !important;
    border-radius: 7px !important;

    background: #ffffff !important;
    color: #526818 !important;

    font: inherit !important;
    font-size: clamp(.58rem,1.72cqw,.69rem) !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    white-space: nowrap !important;

    cursor: pointer !important;
    transition:
      background .18s ease,
      border-color .18s ease,
      color .18s ease,
      transform .18s ease !important;
  }

  .public-order-subscription-day-view-button:hover {
    border-color: rgba(82,104,24,.42) !important;
    background: #f0f4df !important;
    color: #33371b !important;
  }

  .public-order-subscription-day-view-button:active {
    transform: translateY(1px) !important;
  }

  .public-order-subscription-day-view-button:focus-visible {
    outline: 3px solid rgba(82,104,24,.16) !important;
    outline-offset: 2px !important;
  }

  .public-order-subscription-day-row.active .public-order-subscription-day-view-button {
    border-color: rgba(161,38,50,.20) !important;
    background: #ffffff !important;
    color: var(--public-subscription-accent) !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-bottom {
    grid-area: bottom !important;
    display: block !important;
    padding: 11px 14px 14px !important;
    border-top: 1px solid var(--public-subscription-border) !important;
    background: #ffffff !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-prices {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 7px !important;
    margin: 0 !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price {
    display: flex !important;
    min-width: 0 !important;
    min-height: 38px !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-direction: row !important;

    gap: 6px !important;
    padding: 7px 8px !important;

    border: 1px solid rgba(161,38,50,.16) !important;
    border-radius: 8px !important;

    background: var(--public-subscription-accent-soft) !important;
    color: var(--public-subscription-muted) !important;

    font-size: clamp(.66rem,2.1cqw,.76rem) !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
    text-align: left !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price span {
    min-width: 0 !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-price strong {
    flex: 0 0 auto !important;
    margin: 0 !important;
    color: var(--public-subscription-accent) !important;
    font-size: clamp(.82rem,2.7cqw,.98rem) !important;
    font-weight: 900 !important;
    font-variant-numeric: tabular-nums !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions {
    display: flex !important;
    min-width: 0 !important;
    min-height: 38px !important;
    align-items: stretch !important;
    margin: 0 !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 38px !important;
    margin: 0 !important;
    border-radius: 8px !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action {
    padding: 6px 9px !important;
    border: 1px solid var(--public-theme-primary) !important;
    background: var(--public-theme-primary) !important;
    color: #ffffff !important;
    box-shadow: none !important;
    font-size: clamp(.68rem,2.1cqw,.78rem) !important;
    font-weight: 900 !important;
  }

  /* Lightweight View details popup, same interaction as the reference page. */
  .public-order-subscription-detail-overlay {
    position: fixed !important;
    z-index: 9999 !important;
    inset: 0 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 18px !important;

    background: rgba(22,25,13,.48) !important;
    backdrop-filter: blur(3px) !important;
    -webkit-backdrop-filter: blur(3px) !important;

    font-family: "Nunito",Arial,Helvetica,sans-serif !important;
  }

  .public-order-subscription-detail-card {
    width: min(760px,100%) !important;
    max-height: min(82vh,640px) !important;
    overflow: hidden !important;

    padding: 0 !important;

    border: 1px solid #d9ddcc !important;
    border-radius: 18px !important;

    background: #ffffff !important;
    color: #242815 !important;

    box-shadow: 0 22px 55px rgba(20,24,10,.22) !important;
  }

  .public-order-subscription-detail-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;

    padding: 16px 16px 13px !important;
    border-bottom: 1px solid #e4e7db !important;
  }

  .public-order-subscription-detail-header > div {
    min-width: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
  }

  .public-order-subscription-detail-header span {
    color: #626856 !important;
    font-size: .72rem !important;
    font-weight: 800 !important;
  }

  .public-order-subscription-detail-header strong {
    color: var(--public-subscription-accent) !important;
    font-size: 1.05rem !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
  }

  .public-order-subscription-detail-close {
    width: 34px !important;
    height: 34px !important;
    flex: 0 0 34px !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;

    background: #eef0e6 !important;
    color: #33371b !important;

    font: inherit !important;
    font-size: 1.35rem !important;
    font-weight: 800 !important;
    line-height: 1 !important;

    cursor: pointer !important;
  }

  .public-order-subscription-detail-layout {
    display: grid !important;
    grid-template-columns: minmax(250px,.9fr) minmax(0,1.1fr) !important;
    min-height: 0 !important;
    max-height: calc(min(82vh,640px) - 68px) !important;
    overflow: hidden !important;
  }

  .public-order-subscription-detail-image-wrap {
    position: relative !important;
    min-width: 0 !important;
    min-height: 340px !important;
    overflow: hidden !important;
    border-right: 1px solid #e4e7db !important;
    background: linear-gradient(145deg,#f7f7f2,#eef0e6) !important;
  }

  .public-order-subscription-detail-image {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 340px !important;
    object-fit: cover !important;
    object-position: center !important;
  }

  .public-order-subscription-detail-image-placeholder {
    display: grid !important;
    place-items: center !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 340px !important;
    font-size: 4rem !important;
  }

  .public-order-subscription-detail-image-wrap::after {
    content: "" !important;
    position: absolute !important;
    inset: 58% 0 0 !important;
    background: linear-gradient(180deg,transparent,rgba(20,24,10,.68)) !important;
    pointer-events: none !important;
  }

  .public-order-subscription-detail-day-badge {
    position: absolute !important;
    z-index: 2 !important;
    left: 13px !important;
    bottom: 13px !important;
    max-width: calc(100% - 26px) !important;
    color: #ffffff !important;
    font-size: .92rem !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
    text-shadow: 0 2px 8px rgba(0,0,0,.5) !important;
  }

  .public-order-subscription-detail-content {
    min-width: 0 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    margin: 14px !important;
    padding: 14px 15px !important;

    border: 1px solid rgba(82,104,24,.16) !important;
    border-radius: 13px !important;

    background: #f7f9f1 !important;
  }

  .public-order-subscription-detail-content > span {
    display: block !important;
    margin-bottom: 6px !important;

    color: #526818 !important;
    font-size: .72rem !important;
    font-weight: 900 !important;
  }

  .public-order-subscription-detail-content > p {
    margin: 0 !important;

    color: #242815 !important;
    font-size: .93rem !important;
    font-weight: 800 !important;
    line-height: 1.45 !important;
    overflow-wrap: anywhere !important;
  }

  .public-order-subscription-detail-content > small {
    display: block !important;
    margin-top: 8px !important;
    color: #626856 !important;
    font-size: .78rem !important;
    font-weight: 650 !important;
    line-height: 1.4 !important;
    overflow-wrap: anywhere !important;
  }

  @media (max-width: 1260px) {
    .public-order-subscription-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }
  }

  @media (max-width: 700px) {
    .public-order-subscription-grid {
      grid-template-columns: minmax(0,1fr) !important;
      gap: 14px !important;
    }

    .public-order-subscription-reference-card {
      max-width: 100% !important;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
      grid-template-areas:
        "media body"
        "bottom bottom" !important;
      grid-template-rows: auto auto !important;
      border-radius: 16px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media {
      aspect-ratio: 4 / 5 !important;
      border-right: 1px solid var(--public-subscription-border) !important;
      border-bottom: 0 !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      min-height: 0 !important;
      gap: 6px !important;
      padding: 12px 11px 9px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      margin-bottom: 2px !important;
      font-size: 15px !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-daily-heading {
      font-size: 12px !important;
      line-height: 1.1 !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(56px,.42fr) minmax(0,1fr) !important;
      gap: 5px !important;
      padding: 5px 6px !important;
    }

    .public-order-subscription-day-label {
      font-size: 10.5px !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 74px !important;
      min-height: 25px !important;
      padding: 4px 7px !important;
      font-size: 10px !important;
      line-height: 1 !important;
    }

    .public-order-subscription-image-badge {
      top: 8px !important;
      right: 8px !important;
      max-width: calc(100% - 16px) !important;
      min-height: 0 !important;
      padding: 5px 10px !important;
      font-size: 12px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-label {
      font-size: 10px !important;
      line-height: 1.05 !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-carousel-title {
      font-size: 12.5px !important;
      line-height: 1.1 !important;
      white-space: normal !important;
      text-overflow: clip !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom {
      padding: 9px 10px 11px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      min-height: 42px !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      line-height: 1.12 !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: 14px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action,
    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-quantity-control {
      min-height: 38px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-actions .public-order-action {
      font-size: 12px !important;
      line-height: 1.1 !important;
    }

    .public-order-subscription-detail-overlay {
      display: block !important;
      padding: 0 !important;
    }

    .public-order-subscription-detail-card {
      position: absolute !important;
      left: 12px !important;
      right: 12px !important;
      top: 50%;
      width: auto !important;
      max-height: min(82vh,620px) !important;
      overflow: auto !important;
      border-radius: 17px !important;
      transform: translateY(-50%) !important;
    }

    .public-order-subscription-detail-header {
      padding: 14px 14px 12px !important;
    }

    .public-order-subscription-detail-layout {
      grid-template-columns: minmax(0,1fr) !important;
      grid-template-rows: auto auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .public-order-subscription-detail-image-wrap {
      width: min(100%,320px) !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      justify-self: center !important;
      border-right: 0 !important;
      border-bottom: 1px solid #e4e7db !important;
    }

    .public-order-subscription-detail-image,
    .public-order-subscription-detail-image-placeholder {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
    }

    .public-order-subscription-detail-content {
      overflow: visible !important;
      margin: 12px !important;
      padding: 13px !important;
    }
  }

  @media (max-width: 380px) {
    .public-order-subscription-reference-card .public-order-subscription-body {
      padding: 10px 8px 6px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom {
      padding: 8px 7px 10px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      gap: 5px !important;
      padding: 7px 8px !important;
      font-size: 11.5px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: 13.5px !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 70px !important;
      font-size: 9.5px !important;
    }

    .public-order-subscription-image-badge {
      font-size: 11px !important;
      padding: 4px 9px !important;
    }
  }


  /* ================================================================
     FINAL RESPONSIVE SUBSCRIPTION CARD ADAPTATION
     The public subscription cards now behave like the main Subscription
     page: the grid count, card split, typography, menu rows, price boxes,
     and actions all resize together for the available screen resolution.

     Layout:
       wide desktop   -> 3 cards
       compact desktop/tablet -> 2 cards
       phone          -> 1 card
     ================================================================ */

  .public-order-subscription-grid {
    width: 100% !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    align-items: stretch !important;
    justify-content: stretch !important;
    gap: clamp(10px, 1.15vw, 18px) !important;
  }

  .public-order-subscription-reference-card {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    justify-self: stretch !important;
  }

  /* ---------------- WIDE / NORMAL DESKTOP ---------------- */
  @media (min-width: 1261px) {
    .public-order-subscription-reference-card {
      grid-template-columns: minmax(0, 48%) minmax(0, 52%) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      gap: clamp(6px, .55vw, 9px) !important;
      padding: clamp(11px, .9vw, 16px) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      font-size: clamp(1rem, 1vw, 1.28rem) !important;
    }

    .public-order-subscription-daily-heading {
      font-size: clamp(.72rem, .69vw, .88rem) !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(60px, .40fr) minmax(0, 1fr) !important;
      gap: clamp(4px, .38vw, 7px) !important;
      padding: clamp(4px, .35vw, 6px) clamp(5px, .45vw, 8px) !important;
    }

    .public-order-subscription-day-label {
      font-size: clamp(.62rem, .58vw, .76rem) !important;
    }

    .public-order-subscription-day-view-button {
      min-width: clamp(68px, 5.2vw, 84px) !important;
      min-height: clamp(24px, 1.9vw, 28px) !important;
      padding: 4px clamp(6px, .55vw, 9px) !important;
      font-size: clamp(.56rem, .50vw, .69rem) !important;
    }

    .public-order-subscription-image-badge {
      min-height: 31px !important;
      padding: 6px 10px !important;
      font-size: clamp(.76rem, .72vw, .98rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      min-height: 38px !important;
      padding: 7px 8px !important;
      font-size: clamp(.64rem, .57vw, .76rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: clamp(.80rem, .72vw, .98rem) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action {
      font-size: clamp(.66rem, .58vw, .78rem) !important;
    }
  }

  /* ---------------- COMPACT DESKTOP / LANDSCAPE TABLET ---------------- */
  @media (min-width: 821px) and (max-width: 1260px) {
    .public-order-subscription-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: clamp(10px, 1.4vw, 16px) !important;
    }

    .public-order-subscription-reference-card {
      grid-template-columns: minmax(0, 46%) minmax(0, 54%) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      gap: 7px !important;
      padding: clamp(10px, 1.25vw, 14px) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      font-size: clamp(1rem, 1.6vw, 1.22rem) !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-daily-heading {
      margin: 3px 0 2px !important;
      font-size: clamp(.72rem, 1.05vw, .84rem) !important;
    }

    .public-order-subscription-day-list {
      gap: 4px !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(58px, .40fr) minmax(0, 1fr) !important;
      gap: 5px !important;
      padding: 5px 6px !important;
    }

    .public-order-subscription-day-label {
      font-size: clamp(.63rem, .9vw, .74rem) !important;
    }

    .public-order-subscription-day-view-button {
      min-width: clamp(70px, 7.8vw, 82px) !important;
      min-height: 26px !important;
      padding: 4px 7px !important;
      font-size: clamp(.58rem, .78vw, .68rem) !important;
    }

    .public-order-subscription-image-badge {
      top: 8px !important;
      right: 8px !important;
      max-width: calc(100% - 16px) !important;
      min-height: 30px !important;
      padding: 5px 9px !important;
      font-size: clamp(.75rem, 1.15vw, .92rem) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-caption {
      left: 9px !important;
      right: 9px !important;
      bottom: 25px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-label {
      font-size: clamp(.57rem, .77vw, .67rem) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-title {
      font-size: clamp(.78rem, 1.12vw, .91rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom {
      padding: 10px 11px 12px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      min-height: 40px !important;
      padding: 7px 8px !important;
      font-size: clamp(.66rem, .92vw, .75rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: clamp(.84rem, 1.14vw, .98rem) !important;
    }
  }

  /* ---------------- PORTRAIT TABLET / LARGE PHONE ---------------- */
  @media (min-width: 601px) and (max-width: 820px) {
    .public-order-subscription-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 14px !important;
    }

    .public-order-subscription-reference-card {
      grid-template-columns: minmax(0, 43%) minmax(0, 57%) !important;
      grid-template-areas:
        "media body"
        "bottom bottom" !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      gap: 7px !important;
      padding: 12px 13px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      font-size: clamp(1.04rem, 2.8vw, 1.28rem) !important;
    }

    .public-order-subscription-daily-heading {
      font-size: clamp(.76rem, 1.8vw, .88rem) !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(64px, .38fr) minmax(0, 1fr) !important;
      gap: 6px !important;
      padding: 5px 7px !important;
    }

    .public-order-subscription-day-label {
      font-size: clamp(.68rem, 1.65vw, .78rem) !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 80px !important;
      min-height: 27px !important;
      font-size: clamp(.63rem, 1.55vw, .72rem) !important;
    }

    .public-order-subscription-image-badge {
      min-height: 32px !important;
      padding: 6px 10px !important;
      font-size: clamp(.82rem, 2vw, .98rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      font-size: clamp(.70rem, 1.65vw, .80rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: clamp(.92rem, 2vw, 1.05rem) !important;
    }
  }

  /* ---------------- PHONE ---------------- */
  @media (max-width: 600px) {
    .public-order-subscription-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 12px !important;
    }

    .public-order-subscription-reference-card {
      grid-template-columns: minmax(0, 43%) minmax(0, 57%) !important;
      grid-template-areas:
        "media body"
        "bottom bottom" !important;
      grid-template-rows: auto auto !important;
      border-radius: 14px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-media {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 4 / 5 !important;
      align-self: start !important;
      border-right: 1px solid var(--public-subscription-border) !important;
      border-bottom: 0 !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      min-height: 0 !important;
      height: auto !important;
      justify-content: flex-start !important;
      gap: 5px !important;
      padding: 9px 8px 7px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      margin: 0 0 1px !important;
      font-size: clamp(.88rem, 4vw, 1.02rem) !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-daily-heading {
      margin: 2px 0 !important;
      font-size: clamp(.66rem, 2.7vw, .76rem) !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-day-list {
      gap: 3px !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(50px, .40fr) minmax(0, 1fr) !important;
      gap: 4px !important;
      padding: 4px 5px !important;
      border-radius: 7px !important;
    }

    .public-order-subscription-day-label {
      font-size: clamp(.57rem, 2.35vw, .67rem) !important;
      line-height: 1.08 !important;
    }

    .public-order-subscription-day-view-button {
      min-width: clamp(62px, 20vw, 72px) !important;
      min-height: 23px !important;
      padding: 3px 5px !important;
      font-size: clamp(.52rem, 2.15vw, .62rem) !important;
      border-radius: 6px !important;
    }

    .public-order-subscription-image-badge {
      top: 6px !important;
      right: 6px !important;
      max-width: calc(100% - 12px) !important;
      min-height: 27px !important;
      padding: 5px 7px !important;
      font-size: clamp(.68rem, 2.8vw, .80rem) !important;
      line-height: 1.05 !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-caption {
      left: 7px !important;
      right: 7px !important;
      bottom: 18px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-label {
      font-size: clamp(.54rem, 2.2vw, .64rem) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-title {
      display: -webkit-box !important;
      overflow: hidden !important;
      font-size: clamp(.68rem, 2.75vw, .80rem) !important;
      line-height: 1.08 !important;
      white-space: normal !important;
      text-overflow: clip !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom {
      padding: 8px 8px 9px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-prices {
      gap: 6px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      min-height: 38px !important;
      gap: 4px !important;
      padding: 6px 7px !important;
      font-size: clamp(.61rem, 2.45vw, .70rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: clamp(.82rem, 3.2vw, .94rem) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions,
    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action,
    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-quantity-control {
      min-height: 35px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action {
      padding: 5px 7px !important;
      font-size: clamp(.62rem, 2.45vw, .70rem) !important;
    }
  }

  /* ---------------- VERY SMALL PHONE ---------------- */
  @media (max-width: 390px) {
    .public-order-subscription-reference-card {
      grid-template-columns: minmax(0, 41%) minmax(0, 59%) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body {
      gap: 4px !important;
      padding: 7px 6px 6px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-body > h4 {
      font-size: clamp(.80rem, 4.1vw, .90rem) !important;
    }

    .public-order-subscription-daily-heading {
      font-size: .62rem !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(44px, .38fr) minmax(0, 1fr) !important;
      gap: 3px !important;
      padding: 3px 4px !important;
    }

    .public-order-subscription-day-label {
      font-size: .54rem !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 58px !important;
      min-height: 21px !important;
      padding: 3px 4px !important;
      font-size: .49rem !important;
    }

    .public-order-subscription-image-badge {
      min-height: 24px !important;
      padding: 4px 6px !important;
      font-size: clamp(.61rem, 2.9vw, .70rem) !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-bottom {
      padding: 7px 6px 8px !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price {
      min-height: 35px !important;
      gap: 3px !important;
      padding: 5px 6px !important;
      font-size: .58rem !important;
    }

    .public-order-subscription-reference-card .public-order-subscription-price strong {
      font-size: .80rem !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action {
      min-height: 33px !important;
      font-size: .60rem !important;
    }
  }


  /* ================================================================
     FINAL REFERENCE MATCH — REMOVE BLANK AREA UNDER IMAGE
     The reference card's upper section has a fixed 8:5 geometry:
       whole upper section = 8:5
       left half = true 4:5 image
       right half = Daily menu
     This keeps the image bottom exactly aligned with the Daily-menu body
     on every card width, instead of allowing the right side to make the
     first grid row taller and leaving empty white space under the image.
     ================================================================ */

  .public-order-subscription-reference-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    height: auto !important;
    min-height: 0 !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-main {
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;

    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    grid-template-rows: minmax(0, 1fr) !important;

    aspect-ratio: 8 / 5 !important;
    align-items: stretch !important;
    overflow: hidden !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-media {
    position: relative !important;
    grid-column: 1 !important;
    grid-row: 1 !important;

    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-height: none !important;

    align-self: stretch !important;

    /* Half of an 8:5 parent is exactly a 4:5 media area. */
    aspect-ratio: auto !important;

    overflow: hidden !important;
    border-right: 1px solid var(--public-subscription-border) !important;
    border-bottom: 0 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel,
  .public-order-subscription-reference-card
    .public-order-subscription-carousel-image {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-image {
    object-fit: cover !important;
    object-position: center !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-body {
    grid-column: 2 !important;
    grid-row: 1 !important;

    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    display: grid !important;
    grid-template-rows: auto auto minmax(0, 1fr) !important;
    align-content: stretch !important;

    gap: clamp(4px, 1.15cqw, 8px) !important;
    padding: clamp(8px, 2.25cqw, 13px) !important;

    overflow: hidden !important;
    background: #ffffff !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-body > h4 {
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;

    display: -webkit-box !important;
    overflow: hidden !important;

    font-size: clamp(.94rem, 3.55cqw, 1.22rem) !important;
    line-height: 1.08 !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .public-order-subscription-daily-heading {
    min-height: 0 !important;
    margin: 0 !important;
    font-size: clamp(.70rem, 2.45cqw, .86rem) !important;
    line-height: 1.1 !important;
  }

  .public-order-subscription-day-menu {
    min-width: 0 !important;
    min-height: 0 !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  .public-order-subscription-day-list {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;

    display: grid !important;
    align-content: stretch !important;

    gap: clamp(3px, .9cqw, 6px) !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .public-order-subscription-day-row {
    min-width: 0 !important;
    min-height: 0 !important;
    height: 100% !important;

    display: grid !important;
    grid-template-columns: minmax(48px, .40fr) minmax(0, 1fr) !important;
    align-items: center !important;

    gap: clamp(3px, .85cqw, 6px) !important;
    padding: clamp(3px, .75cqw, 5px) clamp(4px, 1cqw, 7px) !important;

    border-radius: clamp(6px, 1.6cqw, 9px) !important;
    overflow: hidden !important;
  }

  .public-order-subscription-day-label {
    min-width: 0 !important;
    overflow: hidden !important;

    font-size: clamp(.56rem, 2.05cqw, .74rem) !important;
    line-height: 1.08 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-day-view-button {
    justify-self: end !important;

    min-width: clamp(58px, 21cqw, 82px) !important;
    min-height: clamp(21px, 7.5cqw, 27px) !important;

    padding: 3px clamp(4px, 1.6cqw, 8px) !important;

    border-radius: clamp(5px, 1.5cqw, 7px) !important;

    font-size: clamp(.50rem, 1.78cqw, .67rem) !important;
    line-height: 1 !important;
  }

  /* Footer begins immediately after the 8:5 upper section. */
  .public-order-subscription-reference-card .public-order-subscription-bottom {
    width: 100% !important;
    min-width: 0 !important;
    flex: 0 0 auto !important;

    padding: clamp(8px, 1.9cqw, 12px) clamp(8px, 2.2cqw, 14px)
      clamp(9px, 2.25cqw, 14px) !important;

    border-top: 1px solid var(--public-subscription-border) !important;
    background: #ffffff !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-prices {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: clamp(5px, 1.2cqw, 8px) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-price {
    min-height: clamp(36px, 9cqw, 42px) !important;
    gap: 4px !important;
    padding: clamp(5px, 1.35cqw, 8px) clamp(6px, 1.55cqw, 9px) !important;

    font-size: clamp(.60rem, 2.08cqw, .76rem) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-price strong {
    font-size: clamp(.80rem, 2.75cqw, .98rem) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-actions,
  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-action,
  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-quantity-control {
    min-height: clamp(36px, 9cqw, 42px) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-action {
    padding: 5px 8px !important;
    font-size: clamp(.62rem, 2.08cqw, .76rem) !important;
  }

  /* Keep the image weight badge proportional as the card changes width. */
  .public-order-subscription-image-badge {
    top: clamp(6px, 2cqw, 10px) !important;
    right: clamp(6px, 2cqw, 10px) !important;

    max-width: calc(100% - clamp(12px, 4cqw, 20px)) !important;
    min-height: clamp(26px, 8cqw, 34px) !important;

    padding:
      clamp(4px, 1.45cqw, 6px)
      clamp(7px, 2.4cqw, 12px) !important;

    font-size: clamp(.67rem, 2.8cqw, 1rem) !important;
    line-height: 1.06 !important;
  }

  /* The image caption also scales with the actual card width. */
  .public-order-subscription-reference-card
    .public-order-subscription-carousel-caption {
    left: clamp(7px, 2cqw, 12px) !important;
    right: clamp(7px, 2cqw, 12px) !important;
    bottom: clamp(18px, 5cqw, 30px) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-label {
    font-size: clamp(.54rem, 2cqw, .66rem) !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-title {
    display: -webkit-box !important;
    overflow: hidden !important;

    font-size: clamp(.72rem, 2.8cqw, .92rem) !important;
    line-height: 1.08 !important;

    white-space: normal !important;
    text-overflow: clip !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  /* Grid count changes independently of card internals. */
  @media (min-width: 1261px) {
    .public-order-subscription-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
  }

  @media (min-width: 821px) and (max-width: 1260px) {
    .public-order-subscription-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 820px) {
    .public-order-subscription-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 14px !important;
    }
  }

  /* Very narrow phones: preserve the exact same composition, simply tighten
     the text/button dimensions so the 8:5 upper section remains intact. */
  @media (max-width: 390px) {
    .public-order-subscription-reference-card .public-order-subscription-body {
      gap: 3px !important;
      padding: 6px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-body > h4 {
      font-size: clamp(.78rem, 3.8cqw, .90rem) !important;
    }

    .public-order-subscription-daily-heading {
      font-size: clamp(.58rem, 2.6cqw, .66rem) !important;
    }

    .public-order-subscription-day-list {
      gap: 2px !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(42px, .38fr) minmax(0, 1fr) !important;
      gap: 3px !important;
      padding: 2px 3px !important;
    }

    .public-order-subscription-day-label {
      font-size: .52rem !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 55px !important;
      min-height: 20px !important;
      padding: 2px 4px !important;
      font-size: .47rem !important;
    }
  }


  /* ================================================================
     EXACT RESPONSIVE CARD PORT FROM THE REFERENCE SUBSCRIPTIONS PAGE
     This final block intentionally overrides the earlier experimental
     public-card breakpoints so the public subscription cards follow the
     same sizing rules as the supplied reference code.
     ================================================================ */

  /* Base / desktop: exactly three cards. */
  .public-order-subscription-grid {
    display: grid !important;
    grid-template-columns: repeat(3,minmax(0,1fr)) !important;
    align-items: stretch !important;
    justify-content: start !important;
    gap: 18px !important;
  }

  .public-order-subscription-reference-card {
    container-type: inline-size !important;
    width: 100% !important;
    max-width: 590px !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;

    display: grid !important;
    grid-template-columns: minmax(0,1fr) !important;
    grid-template-areas:
      "main"
      "bottom" !important;
    grid-template-rows: auto auto !important;

    align-content: start !important;
    justify-self: start !important;

    overflow: hidden !important;
    border: 1px solid var(--public-subscription-border) !important;
    border-radius: 16px !important;
    background: #fff !important;
    box-shadow: 0 8px 20px rgba(51,55,27,.065) !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-main {
    grid-area: main !important;

    display: grid !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
    grid-template-areas: "media body" !important;
    grid-template-rows: 1fr !important;

    /* Exact reference geometry: two equal halves; left half is 4:5. */
    aspect-ratio: 8 / 5 !important;

    overflow: hidden !important;
    background: #fff !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-media {
    grid-area: media !important;

    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    aspect-ratio: auto !important;
    align-self: stretch !important;

    overflow: hidden !important;
    border-right: 1px solid var(--public-subscription-border) !important;
    border-bottom: 0 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel,
  .public-order-subscription-reference-card
    .public-order-subscription-carousel-image {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-image {
    object-fit: cover !important;
    object-position: center !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-body {
    grid-area: body !important;

    display: flex !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    flex-direction: column !important;
    justify-content: flex-start !important;

    gap: 9px !important;
    padding: 18px 16px !important;

    overflow: hidden !important;
    box-sizing: border-box !important;
    background: #fff !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-body > h4 {
    flex: 0 0 auto !important;

    display: -webkit-box !important;
    margin: 0 0 3px !important;
    overflow: hidden !important;

    color: var(--public-subscription-accent) !important;
    font-size: clamp(1.08rem,4.2cqw,1.3rem) !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
    letter-spacing: -.02em !important;

    overflow-wrap: anywhere !important;
    word-break: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .public-order-subscription-day-menu {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;

    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .public-order-subscription-daily-heading {
    flex: 0 0 auto !important;
    margin: 2px 0 4px !important;

    color: var(--public-subscription-ink) !important;
    font-size: clamp(.74rem,2.4cqw,.86rem) !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
  }

  .public-order-subscription-day-list {
    display: grid !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;

    gap: clamp(2px,.55cqw,5px) !important;
    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;
    list-style: none !important;
  }

  .public-order-subscription-day-row {
    position: relative !important;

    min-height: 0 !important;
    height: 100% !important;

    display: grid !important;
    grid-template-columns: minmax(68px,.38fr) minmax(0,1fr) !important;
    align-items: center !important;

    gap: clamp(4px,1cqw,7px) !important;
    padding: clamp(2px,.65cqw,5px) clamp(5px,1cqw,7px) !important;

    overflow: hidden !important;
    border: 1px solid rgba(51,55,27,.09) !important;
    border-radius: 8px !important;
    background: #fbfcf8 !important;
  }

  .public-order-subscription-day-label {
    min-width: 0 !important;
    align-self: center !important;

    overflow: hidden !important;
    color: var(--public-theme-primary) !important;

    font-size: clamp(.66rem,2.05cqw,.76rem) !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-day-row.active
    .public-order-subscription-day-label {
    color: var(--public-subscription-accent) !important;
  }

  .public-order-subscription-day-view-button {
    justify-self: end !important;

    display: inline-flex !important;
    min-width: 82px !important;
    min-height: 27px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 4px 9px !important;

    border: 1px solid rgba(82,104,24,.22) !important;
    border-radius: 7px !important;

    background: #fff !important;
    color: #526818 !important;

    font: inherit !important;
    font-size: clamp(.58rem,1.72cqw,.69rem) !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-day-row.active
    .public-order-subscription-day-view-button {
    border-color: rgba(161,38,50,.20) !important;
    background: #fff !important;
    color: var(--public-subscription-accent) !important;
  }

  /* Exact reference image badge: larger, red and visible. */
  .public-order-subscription-image-badge {
    position: absolute !important;
    z-index: 6 !important;

    top: 10px !important;
    right: 10px !important;

    display: inline-flex !important;
    max-width: calc(100% - 20px) !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 6px 12px !important;

    border: 1px solid rgba(161,38,50,.28) !important;
    border-radius: 999px !important;

    background: rgba(255,255,255,.97) !important;
    color: var(--public-subscription-accent) !important;

    box-shadow: 0 3px 10px rgba(20,24,10,.20) !important;

    font-size: clamp(.84rem,2.9cqw,1.02rem) !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
    letter-spacing: .01em !important;

    white-space: nowrap !important;
    pointer-events: none !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-caption {
    left: 12px !important;
    right: 12px !important;
    bottom: 30px !important;
    gap: 2px !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-label {
    font-size: .64rem !important;
    font-weight: 900 !important;
    letter-spacing: .08em !important;
    line-height: 1 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-carousel-title {
    display: block !important;
    width: 100% !important;

    overflow: hidden !important;
    color: #fff !important;

    font-size: .9rem !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card .public-order-subscription-bottom {
    grid-area: bottom !important;

    display: block !important;
    width: 100% !important;

    padding: 11px 14px 14px !important;

    border-top: 1px solid var(--public-subscription-border) !important;
    background: #fff !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-prices {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;

    gap: 7px !important;
    margin: 0 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-price {
    display: flex !important;
    min-width: 0 !important;
    min-height: 38px !important;

    align-items: center !important;
    justify-content: space-between !important;
    flex-direction: row !important;

    gap: 6px !important;
    padding: 7px 8px !important;

    border: 1px solid rgba(161,38,50,.16) !important;
    border-radius: 8px !important;

    background: var(--public-subscription-accent-soft) !important;
    color: var(--public-subscription-muted) !important;

    font-size: clamp(.66rem,2.1cqw,.76rem) !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-price span {
    min-width: 0 !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-price strong {
    flex: 0 0 auto !important;

    margin: 0 !important;

    color: var(--public-subscription-accent) !important;
    font-size: clamp(.82rem,2.7cqw,.98rem) !important;
    font-weight: 900 !important;
    font-variant-numeric: tabular-nums !important;

    text-align: right !important;
    white-space: nowrap !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-actions {
    display: flex !important;
    min-width: 0 !important;
    min-height: 38px !important;

    align-items: stretch !important;
    margin: 0 !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-action,
  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-quantity-control {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 38px !important;

    margin: 0 !important;
    border-radius: 8px !important;
  }

  .public-order-subscription-reference-card
    .public-order-subscription-actions
    .public-order-action {
    padding: 6px 9px !important;

    border: 1px solid var(--public-theme-primary) !important;
    background: var(--public-theme-primary) !important;
    color: #fff !important;

    box-shadow: none !important;

    font-size: clamp(.68rem,2.1cqw,.78rem) !important;
    font-weight: 900 !important;
  }

  /* The reference page changes only the number of cards at 1260px. */
  @media (max-width: 1260px) {
    .public-order-subscription-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }
  }

  /* ================================================================
     MOBILE = SAME COMPLETE DESKTOP CARD
     This is the important behavior from the supplied reference code.
     The card does NOT stack image/body vertically; it keeps the 8:5
     image-left / Daily-menu-right main row and simply scales its content.
     ================================================================ */
  @media (max-width: 700px) {
    .public-order-subscription-grid {
      grid-template-columns: 1fr !important;
      align-items: start !important;
      gap: 12px !important;
    }

    .public-order-subscription-reference-card {
      width: 100% !important;
      max-width: 590px !important;
      min-width: 0 !important;
      height: auto !important;

      grid-template-columns: minmax(0,1fr) !important;
      grid-template-areas:
        "main"
        "bottom" !important;
      grid-template-rows: auto auto !important;

      align-content: start !important;
      justify-self: center !important;

      overflow: hidden !important;
      border-radius: 16px !important;
      background: #fff !important;
      box-shadow: 0 4px 12px rgba(36,40,21,.055) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-main {
      grid-area: main !important;

      display: grid !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;

      grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
      grid-template-areas: "media body" !important;
      grid-template-rows: 1fr !important;

      aspect-ratio: 8 / 5 !important;

      overflow: hidden !important;
      background: #fff !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-media {
      grid-area: media !important;

      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;

      aspect-ratio: auto !important;
      align-self: stretch !important;

      overflow: hidden !important;
      border-right: 1px solid var(--public-subscription-border) !important;
      border-bottom: 0 !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-body {
      grid-area: body !important;

      display: flex !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;

      flex-direction: column !important;
      justify-content: flex-start !important;

      gap: 4px !important;
      padding: 9px 8px 8px !important;

      overflow: hidden !important;
      box-sizing: border-box !important;
      background: #fff !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-body > h4 {
      flex: 0 0 auto !important;

      display: -webkit-box !important;
      margin: 0 0 1px !important;
      overflow: hidden !important;

      color: var(--public-subscription-accent) !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      line-height: 1.08 !important;
      letter-spacing: -.015em !important;

      overflow-wrap: anywhere !important;

      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }

    .public-order-subscription-day-menu {
      display: flex !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;

      flex-direction: column !important;

      margin: 0 !important;
      padding: 0 !important;

      overflow: hidden !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }

    .public-order-subscription-daily-heading {
      flex: 0 0 auto !important;

      margin: 1px 0 4px !important;

      color: var(--public-subscription-ink) !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;
    }

    .public-order-subscription-day-list {
      display: grid !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;

      gap: 3px !important;
      margin: 0 !important;
      padding: 0 !important;

      overflow: hidden !important;
    }

    .public-order-subscription-day-row {
      min-height: 0 !important;
      height: 100% !important;

      display: grid !important;
      grid-template-columns: minmax(56px,.42fr) minmax(0,1fr) !important;
      align-items: center !important;

      gap: 5px !important;
      padding: 2px 4px !important;

      overflow: hidden !important;

      border: 1px solid rgba(51,55,27,.10) !important;
      border-radius: 7px !important;
      background: #fbfcf8 !important;
    }

    .public-order-subscription-day-row.active {
      background: #f2f5e7 !important;
      transform: translateX(1px) !important;
    }

    .public-order-subscription-day-label {
      min-width: 0 !important;
      align-self: center !important;

      overflow: hidden !important;

      color: var(--public-theme-primary) !important;
      font-size: 10.5px !important;
      font-weight: 900 !important;
      line-height: 1.08 !important;

      text-overflow: clip !important;
      white-space: nowrap !important;
    }

    .public-order-subscription-day-row.active
      .public-order-subscription-day-label {
      color: var(--public-subscription-accent) !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 74px !important;
      min-height: 25px !important;

      padding: 4px 7px !important;

      font-size: 10px !important;
      line-height: 1 !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel::after {
      inset: 42% 0 0 !important;
      background: linear-gradient(
        180deg,
        transparent,
        rgba(20,24,10,.88)
      ) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-caption {
      left: 10px !important;
      right: 10px !important;
      bottom: 25px !important;
      gap: 2px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-label {
      font-size: 10px !important;
      font-weight: 900 !important;
      line-height: 1.05 !important;
      letter-spacing: .06em !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-title {
      display: block !important;
      width: 100% !important;

      overflow: hidden !important;

      color: #fff !important;
      font-size: 12.5px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;

      white-space: nowrap !important;
      text-overflow: ellipsis !important;

      text-shadow: 0 2px 8px rgba(0,0,0,.55) !important;
    }

    .public-order-subscription-image-badge {
      top: 8px !important;
      right: 8px !important;

      max-width: calc(100% - 16px) !important;

      padding: 5px 10px !important;

      color: var(--public-subscription-accent) !important;
      border: 1px solid rgba(161,38,50,.28) !important;
      background: rgba(255,255,255,.97) !important;

      font-size: 12px !important;
      line-height: 1.1 !important;

      box-shadow: 0 3px 10px rgba(20,24,10,.20) !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-bottom {
      grid-area: bottom !important;

      display: block !important;
      padding: 9px 10px 10px !important;

      border-top: 1px solid var(--public-subscription-border) !important;
      background: #fcfdf9 !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-prices {
      display: grid !important;
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;

      gap: 7px !important;
      margin: 0 !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-price {
      min-width: 0 !important;
      min-height: 38px !important;

      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;

      gap: 5px !important;
      padding: 7px 8px !important;

      border-radius: 8px !important;

      font-size: 12px !important;
      line-height: 1.12 !important;
      text-align: left !important;
      white-space: nowrap !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-price span {
      min-width: 0 !important;

      color: var(--public-subscription-muted) !important;
      font-weight: 800 !important;

      white-space: nowrap !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-price strong {
      flex: 0 0 auto !important;

      color: var(--public-subscription-accent) !important;
      font-size: 14px !important;
      font-weight: 900 !important;

      text-align: right !important;
      white-space: nowrap !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions {
      display: flex !important;
      min-width: 0 !important;

      margin-top: 0 !important;
      align-items: stretch !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action,
    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-quantity-control {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 38px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action {
      padding: 6px 8px !important;

      border-radius: 8px !important;

      font-size: 12px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;
    }
  }

  @media (max-width: 380px) {
    .public-order-subscription-reference-card
      .public-order-subscription-body {
      gap: 3px !important;
      padding: 7px 6px 6px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-body > h4 {
      font-size: 14px !important;
    }

    .public-order-subscription-daily-heading {
      margin-bottom: 3px !important;
      font-size: 11px !important;
    }

    .public-order-subscription-day-list {
      gap: 2px !important;
    }

    .public-order-subscription-day-row {
      grid-template-columns: minmax(52px,.42fr) minmax(0,1fr) !important;
      gap: 4px !important;
      padding: 2px 3px !important;
    }

    .public-order-subscription-day-label {
      font-size: 9.5px !important;
    }

    .public-order-subscription-day-view-button {
      min-width: 70px !important;
      font-size: 9.5px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-label {
      font-size: 9.5px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-carousel-title {
      font-size: 12px !important;
    }

    .public-order-subscription-image-badge {
      font-size: 11px !important;
      padding: 4px 9px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-price,
    .public-order-subscription-reference-card
      .public-order-subscription-actions
      .public-order-action {
      font-size: 11.5px !important;
    }

    .public-order-subscription-reference-card
      .public-order-subscription-price strong {
      font-size: 13.5px !important;
    }
  }


  /* ================================================================
     FINAL JUICE CARD DESIGN — PORTED FROM THE PROVIDED HOMEPAGE REFERENCE

     Reference behavior preserved:
       - exactly 3 juice cards per row on desktop
       - true 4:5 product image on the left
       - product content on the right
       - larger red size/unit badge on the image
       - compact but clearly readable content
       - View Item above Add to Cart
       - 2 cards on tablet, 1 card on phone
       - same horizontal card composition at every resolution
     ================================================================ */

  .public-order-juice-grid {
    width: 100% !important;
    min-width: 0 !important;

    display: grid !important;
    grid-template-columns: repeat(3,minmax(0,1fr)) !important;
    align-items: start !important;

    gap: clamp(10px,.9vw,16px) !important;
  }

  .public-order-juice-card,
  .public-order-juice-card.public-order-offer-card-highlight {
    container-type: inline-size !important;

    position: relative !important;

    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;

    height: auto !important;
    min-height: 0 !important;

    /* Do not force the whole card to 8:5.
       The reference lets the real 4:5 image define the row height. */
    aspect-ratio: auto !important;

    display: grid !important;
    grid-template-columns: minmax(0,50%) minmax(0,50%) !important;
    grid-template-rows: auto !important;

    align-items: stretch !important;
    align-content: start !important;

    overflow: hidden !important;

    border: 1px solid #d9ddcc !important;
    border-radius: 13px !important;

    background: #ffffff !important;

    box-shadow: 0 8px 20px rgba(51,55,27,.065) !important;

    font-family: "Nunito",Arial,Helvetica,sans-serif !important;
  }

  .public-order-juice-card:hover,
  .public-order-juice-card.public-order-offer-card-highlight:hover {
    transform: translateY(-2px) !important;
    border-color: #c9cfb8 !important;
    box-shadow: 0 12px 26px rgba(51,55,27,.10) !important;
  }

  /* ------------------------------------------------
     TRUE 4:5 IMAGE — SAME AS HOMEPAGE REFERENCE
     ------------------------------------------------ */
  .public-order-juice-card .public-order-juice-image {
    position: relative !important;

    grid-column: 1 !important;
    grid-row: 1 !important;

    width: 100% !important;
    height: auto !important;

    min-width: 0 !important;
    min-height: 0 !important;
    max-height: none !important;

    aspect-ratio: 4 / 5 !important;

    align-self: start !important;

    overflow: hidden !important;

    border: 0 !important;
    border-right: 1px solid #d9ddcc !important;
    border-radius: 0 !important;

    background: #f5f3ee !important;
  }

  .public-order-juice-card .public-order-juice-image img {
    position: absolute !important;
    inset: 0 !important;

    display: block !important;

    width: 100% !important;
    height: 100% !important;

    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;

    aspect-ratio: 4 / 5 !important;

    object-fit: cover !important;
    object-position: center !important;

    transform: none !important;
  }

  .public-order-juice-card:hover .public-order-juice-image img {
    transform: none !important;
  }

  /* ------------------------------------------------
     LARGE RED SIZE / UNIT BADGE ON IMAGE
     ------------------------------------------------ */
  .public-order-juice-card .public-order-juice-image-size {
    position: absolute !important;

    z-index: 15 !important;

    left: 10px !important;
    right: auto !important;
    bottom: 10px !important;

    display: inline-flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;

    width: fit-content !important;
    max-width: calc(100% - 20px) !important;
    min-height: 36px !important;

    margin: 0 !important;
    padding: 7px 12px !important;

    border: 1px solid rgba(181,28,28,.30) !important;
    border-radius: 999px !important;

    background: rgba(255,248,248,.97) !important;
    color: #c62828 !important;

    box-shadow:
      0 6px 16px rgba(120,20,20,.18),
      0 0 0 2px rgba(255,255,255,.35) !important;

    font-size: clamp(.90rem,.88vw,1.08rem) !important;
    font-weight: 900 !important;
    line-height: 1.08 !important;
    letter-spacing: .005em !important;

    white-space: normal !important;
    text-align: left !important;
    overflow-wrap: anywhere !important;

    pointer-events: none !important;
  }

  /* Size is shown on the image only, like the reference card. */
  .public-order-juice-body .public-order-juice-size,
  .public-order-juice-card .public-order-juice-size,
  .public-order-juice-mobile-under-image,
  .public-order-juice-mobile-actions {
    display: none !important;
  }

  /* ------------------------------------------------
     RIGHT CONTENT — FULL HEIGHT / REFERENCE TYPOGRAPHY
     ------------------------------------------------ */
  .public-order-juice-card .public-order-juice-body {
    grid-column: 2 !important;
    grid-row: 1 !important;

    width: 100% !important;
    min-width: 0 !important;

    height: 100% !important;
    min-height: 100% !important;

    align-self: stretch !important;

    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;

    gap: 7px !important;

    padding: 11px 12px !important;

    overflow: hidden !important;

    background: #ffffff !important;

    text-align: left !important;
  }

  .public-order-juice-card .public-order-juice-name {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    display: -webkit-box !important;
    overflow: hidden !important;

    color: #a42b1d !important;

    font-size: clamp(1.05rem,1vw,1.28rem) !important;
    font-weight: 800 !important;
    line-height: 1.14 !important;

    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }

  .public-order-juice-description-shell {
    min-width: 0 !important;
  }

  .public-order-juice-card .public-order-product-description {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    margin: 0 !important;

    color: #626856 !important;

    font-size: clamp(.76rem,.70vw,.86rem) !important;
    font-weight: 500 !important;
    line-height: 1.42 !important;

    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .public-order-juice-card .public-order-juice-description-preview {
    display: -webkit-box !important;

    max-height: none !important;

    overflow: hidden !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 5 !important;
  }

  .public-order-juice-description-view-more {
    margin-top: 0 !important;
    padding: 0 !important;

    color: #242815 !important;

    font-size: clamp(.73rem,.66vw,.82rem) !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;

    text-decoration: underline !important;
  }

  /* ------------------------------------------------
     PRICE
     ------------------------------------------------ */
  .public-order-juice-card .public-order-price-row {
    flex: 0 0 auto !important;

    width: fit-content !important;
    max-width: 100% !important;
    min-height: 0 !important;

    display: inline-flex !important;
    align-items: baseline !important;
    flex-wrap: wrap !important;

    gap: 5px !important;

    margin: 0 !important;
    padding: 5px 8px !important;

    border: 1px solid #d4dac8 !important;
    border-radius: 9px !important;

    background: #eef0e8 !important;
  }

  .public-order-juice-card .public-order-compare {
    color: #777c6d !important;

    font-size: clamp(.68rem,.60vw,.76rem) !important;
    font-weight: 700 !important;
    line-height: 1 !important;

    text-decoration: line-through !important;
  }

  .public-order-juice-card .public-order-price {
    color: #33371b !important;

    font-size: clamp(1.12rem,1.02vw,1.32rem) !important;
    font-weight: 900 !important;
    line-height: 1 !important;
  }

  /* ------------------------------------------------
     VIEW ITEM + ADD TO CART
     ------------------------------------------------ */
  .public-order-juice-body .public-order-juice-actions {
    flex: 0 0 auto !important;

    width: 100% !important;
    min-width: 0 !important;

    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;

    gap: 6px !important;

    margin-top: 0 !important;
    padding-top: 2px !important;
  }

  .public-order-juice-body .public-order-juice-actions > *,
  .public-order-juice-body .public-order-juice-view,
  .public-order-juice-body .public-order-juice-action,
  .public-order-juice-body .public-order-juice-quantity {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .public-order-juice-body .public-order-juice-view,
  .public-order-juice-body .public-order-juice-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-height: 36px !important;

    margin: 0 !important;
    padding: 7px 8px !important;

    border-radius: 3px !important;

    font-size: clamp(.69rem,.61vw,.78rem) !important;
    font-weight: 850 !important;
    line-height: 1.05 !important;

    text-align: center !important;
    text-transform: uppercase !important;

    box-shadow: none !important;
  }

  .public-order-juice-body .public-order-juice-view {
    order: 1 !important;

    border: 1px solid #ecefe5 !important;
    background: #eef0e8 !important;
    color: #242815 !important;
  }

  .public-order-juice-body .public-order-juice-action,
  .public-order-juice-body .public-order-juice-quantity {
    order: 2 !important;
  }

  .public-order-juice-body .public-order-juice-action {
    border: 1px solid #33371b !important;
    background: #33371b !important;
    color: #ffffff !important;
  }

  .public-order-juice-body .public-order-juice-action:hover:not(:disabled) {
    border-color: #454b24 !important;
    background: #454b24 !important;
    color: #ffffff !important;
  }

  .public-order-juice-body .public-order-juice-quantity {
    min-height: 36px !important;

    grid-template-columns: 34px minmax(30px,1fr) 34px !important;

    gap: 4px !important;

    padding: 0 !important;

    border: 0 !important;
    background: transparent !important;
  }

  .public-order-juice-body .public-order-juice-quantity button,
  .public-order-juice-body
    .public-order-juice-quantity
    .public-order-quantity-value {
    min-height: 36px !important;

    border-radius: 3px !important;

    font-size: .74rem !important;
  }

  /* ------------------------------------------------
     IMAGE BADGES
     ------------------------------------------------ */
  .public-order-juice-offer-badge {
    top: 8px !important;
    left: 8px !important;
    z-index: 18 !important;

    min-height: 24px !important;
    max-width: calc(100% - 16px) !important;

    padding: 5px 9px !important;

    border: 1px solid rgba(181,74,47,.24) !important;
    border-radius: 999px !important;

    background: rgba(255,248,238,.96) !important;
    color: #8f331d !important;

    box-shadow: 0 4px 12px rgba(92,20,12,.16) !important;

    font-size: .63rem !important;
    font-weight: 900 !important;
    letter-spacing: .03em !important;
    line-height: 1 !important;

    white-space: nowrap !important;
  }

  .public-order-juice-card.public-order-offer-card-highlight
    .public-order-product-badge {
    top: 40px !important;
    left: 8px !important;
    right: auto !important;

    z-index: 17 !important;
  }

  .public-order-juice-favourite {
    top: 7px !important;
    left: calc(50% - 34px) !important;
    right: auto !important;

    width: 27px !important;
    height: 27px !important;

    z-index: 16 !important;
  }

  /* ================================================================
     COMPACT DESKTOP — STILL 3 CARDS PER ROW
     ================================================================ */
  @media (min-width: 901px) and (max-width: 1180px) {
    .public-order-juice-grid {
      grid-template-columns: repeat(3,minmax(0,1fr)) !important;
      gap: 8px !important;
    }

    .public-order-juice-card .public-order-juice-body {
      justify-content: space-between !important;

      gap: 4px !important;

      padding: 7px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.92rem,1.18vw,1.04rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.67rem,.82vw,.74rem) !important;
      line-height: 1.34 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      -webkit-line-clamp: 4 !important;
    }

    .public-order-juice-description-view-more {
      font-size: .68rem !important;
    }

    .public-order-juice-card .public-order-price-row {
      padding: 4px 6px !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(1rem,1.1vw,1.10rem) !important;
    }

    .public-order-juice-card .public-order-compare {
      font-size: .60rem !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 33px !important;

      padding: 5px !important;

      font-size: clamp(.61rem,.72vw,.67rem) !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 8px !important;
      bottom: 8px !important;

      max-width: calc(100% - 16px) !important;
      min-height: 32px !important;

      padding: 6px 10px !important;

      font-size: clamp(.78rem,.94vw,.90rem) !important;
    }
  }

  /* ================================================================
     TABLET — 2 CARDS PER ROW
     ================================================================ */
  @media (max-width: 900px) {
    .public-order-juice-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
      gap: 10px !important;
    }

    .public-order-juice-card,
    .public-order-juice-card.public-order-offer-card-highlight {
      grid-template-columns: minmax(0,48%) minmax(0,52%) !important;

      aspect-ratio: auto !important;

      align-items: stretch !important;
    }

    .public-order-juice-card .public-order-juice-image {
      width: 100% !important;
      height: auto !important;

      aspect-ratio: 4 / 5 !important;

      align-self: start !important;
    }

    .public-order-juice-card .public-order-juice-body {
      height: 100% !important;
      min-height: 100% !important;

      justify-content: space-between !important;

      gap: 5px !important;

      padding: 8px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(1rem,4vw,1.14rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.71rem,2.7vw,.80rem) !important;
      line-height: 1.38 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      -webkit-line-clamp: 5 !important;
    }

    .public-order-juice-description-view-more {
      font-size: clamp(.69rem,2.45vw,.78rem) !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(1.08rem,4.8vw,1.24rem) !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 34px !important;

      font-size: clamp(.66rem,2.45vw,.74rem) !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 8px !important;
      right: auto !important;
      bottom: 8px !important;

      max-width: calc(100% - 16px) !important;
      min-height: 31px !important;

      padding: 6px 9px !important;

      font-size: clamp(.78rem,3.1vw,.94rem) !important;
    }
  }

  /* ================================================================
     PHONE — 1 CARD PER ROW, SAME HORIZONTAL DESIGN
     ================================================================ */
  @media (max-width: 600px) {
    .public-order-juice-grid {
      grid-template-columns: minmax(0,1fr) !important;
      gap: 12px !important;
    }

    .public-order-juice-card,
    .public-order-juice-card.public-order-offer-card-highlight {
      grid-template-columns: minmax(0,46%) minmax(0,54%) !important;

      border-radius: 13px !important;
    }

    .public-order-juice-card .public-order-juice-body {
      gap: 5px !important;

      padding: 8px 8px 7px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.95rem,4vw,1.10rem) !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.67rem,2.5vw,.76rem) !important;
      line-height: 1.34 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      -webkit-line-clamp: 4 !important;
    }

    .public-order-juice-description-view-more {
      font-size: clamp(.66rem,2.4vw,.74rem) !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(1.02rem,4.5vw,1.20rem) !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 33px !important;

      font-size: clamp(.62rem,2.35vw,.70rem) !important;
    }

    .public-order-juice-favourite {
      display: none !important;
    }
  }

  /* ================================================================
     VERY SMALL PHONE
     ================================================================ */
  @media (max-width: 420px) {
    .public-order-juice-card,
    .public-order-juice-card.public-order-offer-card-highlight {
      grid-template-columns: minmax(0,44%) minmax(0,56%) !important;
    }

    .public-order-juice-card .public-order-juice-body {
      gap: 4px !important;

      padding: 7px 6px !important;
    }

    .public-order-juice-card .public-order-juice-name {
      font-size: clamp(.82rem,4.1vw,.94rem) !important;
      line-height: 1.10 !important;
    }

    .public-order-juice-card .public-order-product-description {
      font-size: clamp(.66rem,2.9vw,.74rem) !important;
      line-height: 1.30 !important;
    }

    .public-order-juice-card .public-order-juice-description-preview {
      -webkit-line-clamp: 3 !important;
    }

    .public-order-juice-description-view-more {
      font-size: .62rem !important;
    }

    .public-order-juice-card .public-order-price-row {
      padding: 3px 6px !important;
    }

    .public-order-juice-card .public-order-price {
      font-size: clamp(.94rem,5vw,1.08rem) !important;
    }

    .public-order-juice-card .public-order-compare {
      font-size: .58rem !important;
    }

    .public-order-juice-body .public-order-juice-actions {
      gap: 4px !important;
    }

    .public-order-juice-body .public-order-juice-view,
    .public-order-juice-body .public-order-juice-action {
      min-height: 31px !important;

      padding: 5px 4px !important;

      font-size: clamp(.54rem,2.65vw,.62rem) !important;
    }

    .public-order-juice-body .public-order-juice-quantity {
      grid-template-columns: 29px minmax(27px,1fr) 29px !important;
      gap: 3px !important;
    }

    .public-order-juice-body .public-order-juice-quantity button,
    .public-order-juice-body
      .public-order-juice-quantity
      .public-order-quantity-value {
      min-height: 31px !important;
    }

    .public-order-juice-card .public-order-juice-image-size {
      left: 6px !important;
      bottom: 6px !important;

      max-width: calc(100% - 12px) !important;
      min-height: 29px !important;

      padding: 5px 8px !important;

      font-size: clamp(.72rem,3.15vw,.84rem) !important;
    }
  }


  /* =============================================================
     PUBLIC CATALOG CARD REFRESH — MATCH THE HOME PAGE REFERENCE
     Visual-only override. Existing add-to-cart, modal, quantity,
     subscription, checkout and API handlers remain untouched.
     ============================================================= */
  .public-order-page .public-order-juice-grid {
    display:grid !important;
    grid-template-columns:minmax(0,1fr) !important;
    gap:20px !important;
    width:100%;
  }
  .public-order-page .public-order-juice-card {
    display:grid !important;
    grid-template-columns:minmax(230px,32%) minmax(0,1fr) !important;
    grid-template-rows:minmax(0,auto) !important;
    width:100% !important;
    max-width:none !important;
    min-height:300px !important;
    height:auto !important;
    overflow:hidden;
    border:1px solid #d9ddcc !important;
    border-radius:22px !important;
    background:#fff !important;
    box-shadow:0 12px 32px rgba(51,55,27,.075) !important;
    transform:none !important;
    transition:border-color .2s ease, box-shadow .2s ease !important;
  }
  .public-order-page .public-order-juice-card:hover {
    border-color:#aab49b !important;
    box-shadow:0 16px 40px rgba(51,55,27,.11) !important;
  }
  .public-order-page .public-order-juice-card.selected {
    border-color:#33371b !important;
    box-shadow:0 0 0 2px rgba(51,55,27,.11),0 14px 34px rgba(51,55,27,.09) !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image {
    grid-area:1/1/2/2 !important;
    position:relative;
    width:100% !important;
    height:100% !important;
    min-height:300px !important;
    max-height:none !important;
    aspect-ratio:auto !important;
    border:0 !important;
    border-radius:0 !important;
    background:linear-gradient(145deg,#f7f7f2,#eef0e6) !important;
    overflow:hidden;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image img {
    width:100% !important;
    height:100% !important;
    min-height:300px !important;
    object-fit:cover !important;
    object-position:center !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-body {
    grid-area:1/2/2/3 !important;
    display:flex !important;
    flex-direction:column !important;
    align-items:stretch !important;
    justify-content:center !important;
    width:100%;
    min-width:0;
    min-height:300px !important;
    gap:11px !important;
    padding:clamp(20px,3vw,38px) !important;
    background:#fff !important;
    text-align:left !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-name {
    color:#a42b1d !important;
    font-size:clamp(1.35rem,2.1vw,1.95rem) !important;
    line-height:1.16 !important;
    font-weight:900 !important;
    margin:0 !important;
    letter-spacing:-.02em;
  }
  .public-order-page .public-order-juice-card .public-order-juice-size {
    color:#1f6b42 !important;
    background:#eff7f0 !important;
    border:1px solid #d0e6d5 !important;
    border-radius:9px !important;
    font-size:.83rem !important;
    padding:6px 10px !important;
  }
  .public-order-page .public-order-juice-card .public-order-product-description {
    color:#626856 !important;
    font-size:clamp(.84rem,1.15vw,.98rem) !important;
    line-height:1.6 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-description-preview {
    max-height:6.4em !important;
  }
  .public-order-page .public-order-juice-card .public-order-price-row {
    width:fit-content !important;
    margin-top:4px !important;
    background:transparent !important;
    border:0 !important;
    padding:0 !important;
    gap:10px !important;
  }
  .public-order-page .public-order-juice-card .public-order-price {
    color:#24733d !important;
    font-size:clamp(1.25rem,2vw,1.65rem) !important;
    font-weight:900 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-actions {
    display:flex !important;
    flex-wrap:wrap;
    align-items:center;
    gap:10px !important;
    margin-top:5px !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view,
  .public-order-page .public-order-juice-card .public-order-juice-action {
    min-height:43px !important;
    padding:10px 18px !important;
    border-radius:10px !important;
    font-size:.82rem !important;
    font-weight:900 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action {
    background:#33371b !important;
    border-color:#33371b !important;
    color:#fff !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view {
    background:#fff !important;
    border:1px solid #33371b !important;
    color:#33371b !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image-size {
    background:#fff !important;
    color:#1f6b42 !important;
    border:1px solid #d9ddcc !important;
    border-radius:10px !important;
    font-weight:900 !important;
  }
  .public-order-page .public-order-juice-favourite {display:none !important;}
  .public-order-page .public-order-juice-mobile-under-image,
  .public-order-page .public-order-juice-mobile-actions {display:none !important;}
  /* Subscription cards keep their fuller information layout, but share
     the reference's clean border, corner radius and shadow treatment. */
  .public-order-page .public-order-subscription-card {
    border-color:#d9ddcc !important;
    border-radius:20px !important;
    box-shadow:0 12px 32px rgba(51,55,27,.075) !important;
  }
  @media (max-width:900px) and (min-width:641px) {
    .public-order-page .public-order-juice-card {
      grid-template-columns:minmax(210px,38%) minmax(0,1fr) !important;
      min-height:265px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-image,
    .public-order-page .public-order-juice-card .public-order-juice-image img,
    .public-order-page .public-order-juice-card .public-order-juice-body {
      min-height:265px !important;
    }
  }
  @media (max-width:640px) {
    .public-order-page .public-order-juice-grid {
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:10px !important;
    }
    .public-order-page .public-order-juice-card {
      display:flex !important;
      flex-direction:column !important;
      min-height:0 !important;
      border-radius:14px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-image {
      flex:0 0 auto;
      width:100% !important;
      height:auto !important;
      min-height:0 !important;
      aspect-ratio:1 / 1 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-image img {
      min-height:0 !important;
      width:100% !important;
      height:100% !important;
      object-fit:cover !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-body {
      flex:1;
      display:flex !important;
      min-height:0 !important;
      justify-content:flex-start !important;
      gap:6px !important;
      padding:10px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-name {
      font-size:clamp(.86rem,3.45vw,1.05rem) !important;
      line-height:1.24 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-size {display:none !important;}
    .public-order-page .public-order-juice-card .public-order-product-description {
      font-size:.73rem !important;
      line-height:1.4 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-description-preview {max-height:3.92em !important;}
    .public-order-page .public-order-juice-card .public-order-price-row {margin-top:auto !important;}
    .public-order-page .public-order-juice-card .public-order-price {font-size:1.08rem !important;}
    .public-order-page .public-order-juice-card .public-order-juice-actions {
      display:flex !important;
      gap:5px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-view,
    .public-order-page .public-order-juice-card .public-order-juice-action {
      flex:1 1 auto;
      min-height:34px !important;
      padding:7px 5px !important;
      font-size:.65rem !important;
      border-radius:8px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      width:100%;
      grid-template-columns:32px minmax(0,1fr) 32px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-quantity button,
    .public-order-page .public-order-juice-card .public-order-quantity-value {min-height:34px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-image-size {
      left:8px !important;
      bottom:8px !important;
      font-size:.72rem !important;
      padding:4px 7px !important;
      min-height:0 !important;
    }
  }


  /* Screenshot-matched public product cards. Kept last to supersede legacy layout. */
  .public-order-page .public-order-juice-grid {
    display:grid !important;
    grid-template-columns:repeat(5,minmax(0,1fr)) !important;
    gap:14px !important;
    align-items:stretch;
  }
  .public-order-page .public-order-juice-card {
    display:flex !important;
    flex-direction:column !important;
    position:relative !important;
    min-width:0 !important;
    min-height:0 !important;
    overflow:visible !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    transform:none !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image {
    display:block !important;
    position:relative !important;
    grid-area:auto !important;
    align-self:auto !important;
    flex:none !important;
    width:100% !important;
    height:auto !important;
    min-height:0 !important;
    max-height:none !important;
    aspect-ratio:1/1 !important;
    overflow:hidden !important;
    border:1px solid #e6e9e5 !important;
    border-radius:17px !important;
    background:#f5f3ee !important;
    box-shadow:0 2px 5px rgba(0,0,0,.035);
  }
  .public-order-page .public-order-juice-card .public-order-juice-image img {
    display:block !important;
    width:100% !important;
    height:100% !important;
    min-height:0 !important;
    max-height:none !important;
    aspect-ratio:1/1 !important;
    object-fit:cover !important;
    border-radius:inherit !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-body {
    display:flex !important;
    flex:1 1 auto !important;
    flex-direction:column !important;
    align-items:stretch !important;
    justify-content:flex-start !important;
    grid-area:auto !important;
    position:relative !important;
    width:100% !important;
    min-height:0 !important;
    gap:0 !important;
    padding:25px 4px 3px !important;
    background:transparent !important;
    text-align:left !important;
  }
  .public-order-page .public-order-juice-card .public-order-price-row {
    order:1 !important;
    display:flex !important;
    align-items:center !important;
    gap:8px !important;
    width:100% !important;
    min-height:33px !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    background:transparent !important;
  }
  .public-order-page .public-order-juice-card .public-order-price {
    order:0;
    display:inline-flex !important;
    align-items:center !important;
    min-height:32px !important;
    padding:5px 10px !important;
    border-radius:7px !important;
    background:#21863b !important;
    color:#fff !important;
    font-size:1.07rem !important;
    font-weight:900 !important;
    line-height:1.15 !important;
  }
  .public-order-page .public-order-juice-card .public-order-compare {
    order:1;
    color:#777b74 !important;
    font-size:.78rem !important;
    text-decoration:line-through;
  }
  .public-order-page .public-order-juice-card .public-juice-discount {
    order:2 !important;
    display:block;
    margin:5px 0 7px !important;
    color:#188437;
    font-size:.83rem;
    font-weight:900;
    line-height:1.15;
    white-space:nowrap;
  }
  .public-order-page .public-order-juice-card .public-order-juice-name {
    order:3 !important;
    display:-webkit-box !important;
    min-height:0 !important;
    margin:0 0 6px !important;
    overflow:hidden !important;
    color:#293321 !important;
    font-family:Nunito,Arial,sans-serif !important;
    font-size:clamp(.88rem,1.25vw,1rem) !important;
    font-weight:800 !important;
    line-height:1.35 !important;
    letter-spacing:normal !important;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
  }
  .public-order-page .public-order-juice-card .public-order-juice-size {
    order:4 !important;
    display:inline-block !important;
    width:auto !important;
    margin:0 0 7px !important;
    padding:0 !important;
    background:transparent !important;
    color:#7b8177 !important;
    border:0 !important;
    font-size:.82rem !important;
    font-weight:500 !important;
    line-height:1.4 !important;
  }
  .public-order-page .public-order-juice-card .public-juice-category-tag {
    order:6 !important;
    align-self:flex-start;
    margin-top:4px;
    padding:6px 9px;
    border-radius:7px;
    background:#fff0d0;
    color:#93610f;
    font-size:.76rem;
    font-weight:700;
    line-height:1.2;
  }
  .public-order-page .public-order-juice-card .public-order-juice-description-shell {
    order:5 !important;
    display:none !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-actions {
    display:contents !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action,
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    position:absolute !important;
    z-index:5 !important;
    top:-21px !important;
    right:7px !important;
    left:auto !important;
    width:86px !important;
    min-height:42px !important;
    margin:0 !important;
    padding:7px 9px !important;
    border:2px solid #ff1760 !important;
    border-radius:11px !important;
    background:#fff !important;
    color:#f41458 !important;
    box-shadow:0 3px 5px rgba(0,0,0,.11) !important;
    font-size:.86rem !important;
    font-weight:900 !important;
    letter-spacing:0 !important;
    text-transform:uppercase;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:hover:not(:disabled) {
    background:#fff0f4 !important;
    color:#e6004b !important;
    border-color:#e6004b !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled) {font-size:0 !important;}
  .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {content:"ADD";font-size:.88rem !important;}
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    display:grid !important;
    grid-template-columns:24px minmax(0,1fr) 24px !important;
    gap:0 !important;
    padding:4px !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-quantity button,
  .public-order-page .public-order-juice-card .public-order-quantity-value {
    min-height:28px !important;
    border:0 !important;
    background:transparent !important;
    color:#f41458 !important;
    padding:0 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view {
    position:absolute !important;
    z-index:2 !important;
    top:17px !important;
    right:4px !important;
    left:auto !important;
    display:inline-flex !important;
    width:auto !important;
    min-height:0 !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    color:#276d3a !important;
    font-size:0 !important;
    font-weight:900 !important;
    text-decoration:underline !important;
    white-space:nowrap;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view::after {content:"View More";font-size:.79rem !important;}
  .public-order-page .public-order-juice-favourite,
  .public-order-page .public-order-juice-mobile-under-image,
  .public-order-page .public-order-juice-mobile-actions,
  .public-order-page .public-order-juice-card .public-order-juice-image-size {display:none !important;}
  @media(max-width:1100px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(4,minmax(0,1fr)) !important;}
  }
  @media(max-width:800px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:12px !important;}
  }
  @media(max-width:550px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:12px 10px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-body {padding:24px 3px 4px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {width:74px !important;min-height:38px !important;top:-19px !important;right:4px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-name {font-size:.83rem !important;}
    .public-order-page .public-order-juice-card .public-order-price {font-size:.94rem !important;padding:5px 7px !important;}
    .public-order-page .public-order-juice-card .public-order-compare {font-size:.7rem !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view {top:14px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view::after {font-size:.7rem !important;}
    .public-order-page .public-order-juice-card .public-juice-discount {font-size:.75rem;}
  }


  /* Final public catalogue cards — reference HomePage visual system.
     Keep the public ordering/cart JSX and APIs unchanged. */
  .public-order-page .public-order-juice-grid {
    display:grid !important;
    grid-template-columns:repeat(5,minmax(0,1fr)) !important;
    column-gap:12px !important;
    row-gap:26px !important;
    align-items:start !important;
  }
  .public-order-page .public-order-juice-grid > .public-order-juice-card {
    display:flex !important;
    flex-direction:column !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    overflow:visible !important;
    padding:0 !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    transform:none !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image {
    width:100% !important;
    height:auto !important;
    aspect-ratio:1 / 1 !important;
    min-height:0 !important;
    position:relative !important;
    overflow:hidden !important;
    border:1px solid #e7e7e1 !important;
    border-radius:16px !important;
    background:#f2efe6 !important;
    box-shadow:0 2px 4px rgba(0,0,0,.035) !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-image img {
    display:block !important;
    width:100% !important;
    height:100% !important;
    max-height:none !important;
    object-fit:cover !important;
    object-position:center !important;
    aspect-ratio:1 / 1 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-body {
    position:relative !important;
    display:flex !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    flex:1 1 auto !important;
    flex-direction:column !important;
    gap:0 !important;
    align-items:stretch !important;
    justify-content:flex-start !important;
    padding:25px 4px 2px !important;
    text-align:left !important;
    background:transparent !important;
  }
  .public-order-page .public-order-juice-card .public-order-price-row {
    order:1 !important;
    display:flex !important;
    width:100% !important;
    min-height:33px !important;
    align-items:center !important;
    gap:8px !important;
    padding:0 !important;
    margin:0 !important;
    border:0 !important;
    background:none !important;
  }
  .public-order-page .public-order-juice-card .public-order-price {
    order:0 !important;
    display:inline-flex !important;
    min-height:31px !important;
    align-items:center !important;
    padding:5px 9px !important;
    border-radius:7px !important;
    background:#20863d !important;
    color:white !important;
    font:900 1.03rem/1.1 Nunito,Arial,sans-serif !important;
    white-space:nowrap !important;
  }
  .public-order-page .public-order-juice-card .public-order-compare {
    order:1 !important;
    padding:0 !important;
    color:#777b74 !important;
    font-size:.77rem !important;
    text-decoration:line-through !important;
  }
  .public-order-page .public-order-juice-card .public-juice-discount {
    order:2 !important;
    display:block !important;
    margin:5px 0 7px !important;
    color:#188437 !important;
    font-size:.82rem !important;
    font-weight:900 !important;
    line-height:1.15 !important;
    white-space:normal !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-name {
    order:3 !important;
    display:-webkit-box !important;
    max-width:100% !important;
    min-height:0 !important;
    margin:0 0 6px !important;
    overflow:hidden !important;
    color:#293321 !important;
    font:800 clamp(.84rem,1.3vw,1rem)/1.3 Nunito,Arial,sans-serif !important;
    -webkit-line-clamp:2 !important;
    -webkit-box-orient:vertical !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-size {
    order:4 !important;
    display:block !important;
    margin:0 0 7px !important;
    padding:0 !important;
    color:#767c71 !important;
    background:none !important;
    border:0 !important;
    font-size:.81rem !important;
    font-weight:500 !important;
    line-height:1.4 !important;
  }
  .public-order-page .public-order-juice-card .public-juice-category-tag {
    order:6 !important;
    display:inline-block !important;
    align-self:flex-start !important;
    margin:2px 0 0 !important;
    padding:6px 9px !important;
    border:0 !important;
    border-radius:7px !important;
    background:#ffefd0 !important;
    color:#90600c !important;
    font-size:.75rem !important;
    font-weight:700 !important;
    line-height:1.2 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-description-shell {
    order:5 !important;
    display:none !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-actions {
    display:contents !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action,
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    position:absolute !important;
    z-index:5 !important;
    top:-21px !important;
    right:7px !important;
    left:auto !important;
    width:86px !important;
    min-width:0 !important;
    min-height:42px !important;
    margin:0 !important;
    padding:6px 9px !important;
    border:2px solid #ff1760 !important;
    border-radius:11px !important;
    background:#fff !important;
    color:#f41458 !important;
    box-shadow:0 3px 5px rgba(0,0,0,.11) !important;
    font-family:Nunito,Arial,sans-serif !important;
    font-weight:900 !important;
    text-transform:uppercase !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled) {
    font-size:0 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {
    content:"ADD" !important;
    font-size:.88rem !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:disabled {
    font-size:.72rem !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    display:grid !important;
    grid-template-columns:24px minmax(0,1fr) 24px !important;
    gap:0 !important;
    padding:4px !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-quantity button,
  .public-order-page .public-order-juice-card .public-order-quantity-value {
    min-width:0 !important;
    min-height:28px !important;
    padding:0 !important;
    border:0 !important;
    background:transparent !important;
    color:#f41458 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view {
    position:absolute !important;
    z-index:2 !important;
    top:17px !important;
    right:4px !important;
    left:auto !important;
    display:inline-flex !important;
    width:auto !important;
    min-height:0 !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    color:#276d3a !important;
    box-shadow:none !important;
    font-size:0 !important;
    font-weight:900 !important;
    text-decoration:underline !important;
    white-space:nowrap !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view::after {
    content:"View More" !important;
    font-size:.78rem !important;
  }
  .public-order-page .public-order-juice-favourite,
  .public-order-page .public-order-juice-mobile-under-image,
  .public-order-page .public-order-juice-mobile-actions,
  .public-order-page .public-order-juice-card .public-order-juice-image-size {
    display:none !important;
  }
  @media(max-width:1100px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(4,minmax(0,1fr)) !important;}
  }
  @media(max-width:800px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:12px 8px !important;}
  }
  /* Match the final reference HomePage mobile: three dense cards per row. */
  @media(max-width:700px) {
    .public-order-page .public-order-juice-grid {grid-template-columns:repeat(3,minmax(0,1fr)) !important;column-gap:6px !important;row-gap:13px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-image {border-radius:11px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-body {padding:18px 2px 2px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      right:3px !important;top:-14px !important;width:54px !important;min-height:28px !important;height:28px !important;padding:0 3px !important;border-width:1.5px !important;border-radius:7px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {font-size:10px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-quantity {grid-template-columns:14px minmax(0,1fr) 14px !important;padding:0 2px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-quantity button,
    .public-order-page .public-order-juice-card .public-order-quantity-value {min-height:23px !important;font-size:11px !important;}
    .public-order-page .public-order-juice-card .public-order-price-row {min-height:23px !important;gap:3px !important;}
    .public-order-page .public-order-juice-card .public-order-price {min-height:22px !important;padding:3px 5px !important;border-radius:5px !important;font-size:.76rem !important;}
    .public-order-page .public-order-juice-card .public-order-compare {font-size:.56rem !important;}
    .public-order-page .public-order-juice-card .public-juice-discount {margin:3px 0 4px !important;font-size:.65rem !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view {top:12px !important;right:1px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view::after {font-size:.59rem !important;}
    .public-order-page .public-order-juice-card .public-order-juice-name {margin-bottom:3px !important;font-size:.71rem !important;line-height:1.2 !important;}
    .public-order-page .public-order-juice-card .public-order-juice-size {margin-bottom:3px !important;font-size:.63rem !important;}
    .public-order-page .public-order-juice-card .public-juice-category-tag {padding:4px 5px !important;border-radius:5px !important;font-size:.6rem !important;}
  }


  /* FINAL FIX: compact reference cards and visible floating actions.
     This is intentionally placed LAST so previous responsive rules cannot
     stretch the images or bury controls behind them. */
  .public-order-page .public-order-juice-grid {
    display:grid !important;
    grid-template-columns:repeat(auto-fill,minmax(172px,205px)) !important;
    justify-content:start !important;
    gap:22px 12px !important;
    align-items:start !important;
  }
  .public-order-page .public-order-juice-grid > .public-order-juice-card {
    position:relative !important;
    isolation:isolate !important;
    width:100% !important;
    max-width:205px !important;
    min-width:0 !important;
    padding:0 !important;
    margin:0 !important;
    overflow:visible !important;
    border:0 !important;
    box-shadow:none !important;
    background:transparent !important;
  }
  .public-order-page .public-order-juice-card > .public-order-juice-image {
    position:relative !important;
    z-index:0 !important;
    width:100% !important;
    height:auto !important;
    aspect-ratio:1 / 1 !important;
    max-height:205px !important;
    min-height:0 !important;
    overflow:hidden !important;
    border-radius:16px !important;
  }
  .public-order-page .public-order-juice-card > .public-order-juice-image img {
    display:block !important;
    position:absolute !important;
    inset:0 !important;
    width:100% !important;
    height:100% !important;
    min-height:0 !important;
    max-height:none !important;
    object-fit:cover !important;
  }
  .public-order-page .public-order-juice-card > .public-order-juice-body {
    position:relative !important;
    z-index:3 !important;
    overflow:visible !important;
    padding:25px 4px 2px !important;
    min-height:0 !important;
    background:transparent !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-actions {
    display:contents !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action,
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    position:absolute !important;
    z-index:10 !important;
    top:-21px !important;
    right:7px !important;
    bottom:auto !important;
    left:auto !important;
    transform:none !important;
    width:86px !important;
    height:42px !important;
    min-height:42px !important;
    border:2px solid #ff1760 !important;
    border-radius:11px !important;
    background:#fff !important;
    color:#f41458 !important;
    box-shadow:0 3px 5px rgba(0,0,0,.11) !important;
    visibility:visible !important;
    opacity:1 !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {
    content:"ADD" !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-view {
    position:absolute !important;
    z-index:9 !important;
    top:17px !important;
    right:4px !important;
    bottom:auto !important;
    left:auto !important;
    transform:none !important;
    display:inline-flex !important;
    visibility:visible !important;
    opacity:1 !important;
    background:transparent !important;
    color:#276d3a !important;
    text-decoration:underline !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-offer-badge {
    display:none !important;
  }
  @media(max-width:800px){
    .public-order-page .public-order-juice-grid {
      grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      gap:16px 9px !important;
    }
    .public-order-page .public-order-juice-grid > .public-order-juice-card {max-width:none !important;}
    .public-order-page .public-order-juice-card > .public-order-juice-image {max-height:none !important;}
  }
  @media(max-width:700px){
    .public-order-page .public-order-juice-grid {
      grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      gap:15px 6px !important;
    }
    .public-order-page .public-order-juice-card > .public-order-juice-body {
      padding:18px 2px 2px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      top:-14px !important;
      right:3px !important;
      width:54px !important;
      height:28px !important;
      min-height:28px !important;
      border-width:1.5px !important;
      border-radius:7px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-view {
      top:12px !important;
      right:1px !important;
    }
  }


  /* MOBILE CARD REPAIR — controls have their own flow row, never cover prices. */
  @media (max-width: 700px) {
    .public-order-page .public-order-juice-grid {
      display:grid !important;
      grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      gap:18px 7px !important;
      align-items:start !important;
    }
    .public-order-page .public-order-juice-grid > .public-order-juice-card {
      min-width:0 !important;
      max-width:none !important;
      overflow:visible !important;
    }
    .public-order-page .public-order-juice-card > .public-order-juice-image {
      aspect-ratio:1 / 1 !important;
      width:100% !important;
      min-height:0 !important;
      max-height:none !important;
      border-radius:12px !important;
      overflow:hidden !important;
    }
    .public-order-page .public-order-juice-card > .public-order-juice-body {
      display:flex !important;
      flex-direction:column !important;
      gap:0 !important;
      padding:0 2px 3px !important;
      position:relative !important;
      z-index:2 !important;
      min-width:0 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-actions {
      position:relative !important;
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:wrap !important;
      justify-content:space-between !important;
      align-items:center !important;
      align-self:stretch !important;
      gap:3px !important;
      order:-2 !important;
      margin:-10px 0 6px !important;
      padding:0 1px !important;
      min-height:32px !important;
      z-index:12 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      position:relative !important;
      top:auto !important;
      right:auto !important;
      bottom:auto !important;
      left:auto !important;
      width:58px !important;
      height:30px !important;
      min-height:30px !important;
      padding:2px 5px !important;
      margin:0 !important;
      border:1.5px solid #ff1760 !important;
      border-radius:8px !important;
      flex:0 0 auto !important;
      box-shadow:0 2px 5px rgba(0,0,0,.09) !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {font-size:11px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view {
      position:relative !important;
      top:auto !important;
      right:auto !important;
      bottom:auto !important;
      left:auto !important;
      z-index:2 !important;
      display:inline-flex !important;
      width:auto !important;
      min-height:25px !important;
      max-width:100% !important;
      margin:0 0 0 auto !important;
      padding:2px 0 !important;
      white-space:nowrap !important;
      align-items:center !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-view::after {font-size:9px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      display:grid !important;
      grid-template-columns:15px minmax(0,1fr) 15px !important;
      padding:1px !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-quantity button,
    .public-order-page .public-order-juice-card .public-order-quantity-value {
      min-height:22px !important;
      font-size:11px !important;
    }
    .public-order-page .public-order-juice-card .public-order-price-row {
      order:-1 !important;
      display:flex !important;
      align-items:center !important;
      flex-wrap:wrap !important;
      gap:3px !important;
      margin:0 0 3px !important;
      min-height:0 !important;
    }
    .public-order-page .public-order-juice-card .public-order-price {
      font-size:clamp(10px,2.9vw,13px) !important;
      line-height:1.1 !important;
      min-height:22px !important;
      padding:4px 5px !important;
    }
    .public-order-page .public-order-juice-card .public-order-compare {font-size:9px !important;}
    .public-order-page .public-order-juice-card .public-juice-discount {
      order:0 !important;
      margin:0 0 4px !important;
      font-size:10px !important;
      line-height:1.2 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-name {
      order:1 !important;
      margin:0 0 3px !important;
      font-size:11px !important;
      line-height:1.22 !important;
      overflow-wrap:anywhere !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-size {
      order:2 !important;
      margin:0 0 5px !important;
      font-size:9px !important;
      line-height:1.2 !important;
    }
    .public-order-page .public-order-juice-card .public-juice-category-tag {
      order:3 !important;
      align-self:flex-start !important;
      margin:0 !important;
      font-size:9px !important;
      line-height:1.15 !important;
      padding:4px 5px !important;
    }
  }
  @media(max-width:360px) {
    .public-order-page .public-order-juice-grid {gap:16px 5px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-actions {gap:1px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {width:50px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-view::after {font-size:8px !important;}
  }


  /* Reference-faithful mobile card: separate controls, clean savings row.
     This last rule-set takes precedence over legacy overlapping mobile CSS. */
  .public-order-page .public-order-juice-reference-view { display:none; }
  @media (max-width:700px) {
    .public-order-page .public-order-juice-grid {
      display:grid !important;
      grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      gap:17px 7px !important;
      justify-content:stretch !important;
      align-items:start !important;
    }
    .public-order-page .public-order-juice-grid > .public-order-juice-card {
      display:flex !important;
      flex-direction:column !important;
      position:relative !important;
      isolation:isolate !important;
      min-width:0 !important;
      width:100% !important;
      max-width:none !important;
      border:0 !important;
      background:transparent !important;
      box-shadow:none !important;
      overflow:visible !important;
      container-type:inline-size;
    }
    .public-order-page .public-order-juice-card > .public-order-juice-image {
      display:block !important;
      position:relative !important;
      z-index:0 !important;
      aspect-ratio:1 / 1 !important;
      width:100% !important;
      height:auto !important;
      min-height:0 !important;
      max-height:none !important;
      overflow:hidden !important;
      border-radius:11px !important;
    }
    .public-order-page .public-order-juice-card > .public-order-juice-image img {
      position:absolute !important;
      inset:0 !important;
      width:100% !important;
      height:100% !important;
      object-fit:cover !important;
    }
    .public-order-page .public-order-juice-mobile-under-image,
    .public-order-page .public-order-juice-mobile-actions,
    .public-order-page .public-order-juice-card .public-order-juice-favourite,
    .public-order-page .public-order-juice-card .public-order-juice-image-size {display:none !important;}
    .public-order-page .public-order-juice-card > .public-order-juice-body {
      display:flex !important;
      flex-direction:column !important;
      position:relative !important;
      z-index:2 !important;
      width:100% !important;
      padding:16px 2px 2px !important;
      gap:0 !important;
      min-width:0 !important;
      overflow:visible !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-actions {
      display:block !important;
      position:absolute !important;
      z-index:20 !important;
      right:5px !important;
      top:-14px !important;
      left:auto !important;
      bottom:auto !important;
      width:auto !important;
      height:29px !important;
      min-height:0 !important;
      margin:0 !important;
      padding:0 !important;
      overflow:visible !important;
      order:unset !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-actions .public-order-juice-view {display:none !important;}
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      display:flex !important;
      align-items:center !important;
      justify-content:center !important;
      position:relative !important;
      z-index:21 !important;
      inset:auto !important;
      top:auto !important;
      right:auto !important;
      transform:none !important;
      width:51px !important;
      height:28px !important;
      min-height:28px !important;
      padding:0 2px !important;
      margin:0 !important;
      border:1.5px solid #ff1760 !important;
      border-radius:7px !important;
      background:#fff !important;
      color:#f41458 !important;
      box-shadow:0 2px 4px rgba(0,0,0,.08) !important;
      white-space:nowrap !important;
      flex:0 0 auto !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-action:not(:disabled)::after {
      content:'ADD' !important;
      font-size:11px !important;
      font-weight:850 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-quantity {
      display:grid !important;
      grid-template-columns:13px minmax(0,1fr) 13px !important;
      gap:0 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-quantity button,
    .public-order-page .public-order-juice-card .public-order-quantity-value {
      min-width:0 !important;
      min-height:22px !important;
      padding:0 !important;
      font-size:11px !important;
    }
    .public-order-page .public-order-juice-card .public-order-price-row {
      order:-5 !important;
      display:flex !important;
      flex-wrap:nowrap !important;
      gap:4px !important;
      align-items:center !important;
      margin:0 0 5px !important;
      padding:0 !important;
      min-height:21px !important;
      overflow:hidden !important;
    }
    .public-order-page .public-order-juice-card .public-order-price {
      order:0 !important;
      display:inline-flex !important;
      align-items:center !important;
      padding:3px 5px !important;
      min-height:21px !important;
      border-radius:5px !important;
      font-size:clamp(10px,2.9vw,13px) !important;
      line-height:1 !important;
      white-space:nowrap !important;
    }
    .public-order-page .public-order-juice-card .public-order-compare {
      order:1 !important;
      margin:0 !important;
      font-size:clamp(8px,2vw,10px) !important;
      white-space:nowrap !important;
    }
    .public-order-page .public-order-juice-card .public-juice-discount {
      order:-4 !important;
      align-self:flex-start !important;
      margin:0 0 4px !important;
      font-size:9px !important;
      font-weight:850 !important;
      line-height:1.3 !important;
      white-space:nowrap !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-reference-view {
      display:inline-flex !important;
      position:relative !important;
      inset:auto !important;
      order:-3 !important;
      align-self:flex-end !important;
      margin:-17px 0 5px !important;
      padding:0 !important;
      border:0 !important;
      background:none !important;
      color:#246e3a !important;
      font:inherit !important;
      font-size:clamp(8px,2.1vw,10px) !important;
      font-weight:800 !important;
      line-height:1.3 !important;
      text-decoration:underline !important;
      white-space:nowrap !important;
      cursor:pointer !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-name {
      order:-2 !important;
      margin:0 0 4px !important;
      font-size:clamp(10px,2.9vw,12px) !important;
      line-height:1.22 !important;
      font-weight:800 !important;
      overflow-wrap:break-word !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-size {
      order:-1 !important;
      margin:0 0 6px !important;
      font-size:9px !important;
      line-height:1.25 !important;
      color:#777e72 !important;
    }
    .public-order-page .public-order-juice-card .public-juice-category-tag {
      order:0 !important;
      align-self:flex-start !important;
      margin:0 !important;
      padding:4px 5px !important;
      border-radius:5px !important;
      font-size:9px !important;
      line-height:1.15 !important;
    }
    .public-order-page .public-order-juice-card .public-order-juice-description-shell {display:none !important;}
  }
  @media(max-width:360px) {
    .public-order-page .public-order-juice-grid {gap:16px 5px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-action,
    .public-order-page .public-order-juice-card .public-order-juice-quantity {width:45px !important;}
    .public-order-page .public-order-juice-card .public-order-juice-reference-view {font-size:8px !important;}
  }


/* Public subscription cards: match dedicated subscription catalogue layout. */
.public-order-page .public-order-subscription-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;align-items:start!important}
.public-order-page .public-order-subscription-commerce-card{container-type:normal!important;display:block!important;width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;padding:0!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-main{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"media" "summary" "body"!important;grid-template-rows:auto auto auto!important;gap:0!important;height:auto!important;min-height:0!important;overflow:visible!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media{grid-area:media!important;position:relative!important;display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:4/5!important;overflow:visible!important;border:0!important;background:transparent!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-carousel{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;border:1px solid #e4e7dc!important;border-radius:17px!important;background:#f1f2eb!important;box-shadow:0 4px 12px rgba(40,48,25,.07)!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-carousel-image{width:100%!important;height:100%!important;object-fit:cover!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-image-badge{display:none!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-carousel-caption{display:none!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action{position:absolute!important;z-index:20!important;right:6px!important;bottom:-17px!important;display:flex!important;justify-content:flex-end!important;max-width:calc(100% - 12px)!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action .public-order-action{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:90px!important;min-height:40px!important;margin:0!important;padding:7px 10px!important;border:2px solid #33371b!important;border-radius:13px!important;background:#fff!important;color:#33371b!important;box-shadow:0 3px 6px rgba(0,0,0,.12)!important;font:inherit!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action .public-order-quantity-control{width:125px!important;min-width:0!important;max-width:100%!important;min-height:38px!important;background:#fff!important;border:1px solid #33371b!important;border-radius:10px!important}
.public-order-page .public-order-subscription-commerce-summary{grid-area:summary!important;display:flex!important;flex-direction:column!important;gap:5px!important;min-width:0!important;padding:27px 4px 8px!important;color:#242815!important}
.public-order-page .public-order-subscription-commerce-price-row{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}
.public-order-page .public-order-subscription-commerce-price-row strong{display:inline-block!important;padding:5px 10px!important;border-radius:8px!important;background:#218e43!important;color:white!important;font-size:clamp(13px,1.55vw,19px)!important;font-weight:900!important;line-height:1.25!important;font-variant-numeric:tabular-nums!important}
.public-order-page .public-order-subscription-commerce-price-row span{color:#656a61!important;font-size:12px!important}
.public-order-page .public-order-subscription-commerce-detail-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:5px!important;color:#16843c!important;font-size:12px!important;font-weight:900!important}
.public-order-page .public-order-subscription-commerce-detail-row button{padding:0!important;border:0!important;background:transparent!important;color:#176b36!important;font:inherit!important;font-size:12px!important;font-weight:900!important;text-decoration:underline!important;cursor:pointer!important;white-space:nowrap!important}
.public-order-page .public-order-subscription-commerce-summary h3{min-height:0!important;margin:0!important;color:#242815!important;font-size:15px!important;font-weight:900!important;line-height:1.3!important;overflow-wrap:anywhere!important}
.public-order-page .public-order-subscription-commerce-summary p{margin:2px 0 0!important;color:#70766e!important;font-size:12px!important}
.public-order-page .public-order-subscription-commerce-tag{align-self:flex-start!important;padding:5px 9px!important;border-radius:7px!important;background:#fff0d2!important;color:#99631b!important;font-size:11px!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-body{grid-area:body!important;display:none!important;height:auto!important;min-height:0!important;padding:12px!important;margin:5px 0!important;border:1px solid #d9ddcc!important;border-radius:12px!important;background:#fff!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-bottom{display:none!important;height:auto!important;padding:12px!important;border:1px solid #d9ddcc!important;border-radius:12px!important;background:#fff!important}
.public-order-page .public-order-subscription-commerce-card.public-order-subscription-expanded .public-order-subscription-body{display:block!important}
.public-order-page .public-order-subscription-commerce-card.public-order-subscription-expanded .public-order-subscription-bottom{display:block!important;margin-top:8px!important}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-offer-badge{z-index:8!important}
@media(max-width:1100px){.public-order-page .public-order-subscription-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:700px){.public-order-page .public-order-subscription-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.public-order-page .public-order-subscription-commerce-summary{padding:23px 2px 6px!important;gap:4px!important}.public-order-page .public-order-subscription-commerce-price-row strong{font-size:12px!important;padding:5px 6px!important}.public-order-page .public-order-subscription-commerce-price-row span{font-size:10px!important}.public-order-page .public-order-subscription-commerce-detail-row,.public-order-page .public-order-subscription-commerce-detail-row button{font-size:10px!important}.public-order-page .public-order-subscription-commerce-summary h3{font-size:12px!important}.public-order-page .public-order-subscription-commerce-summary p{font-size:10px!important}.public-order-page .public-order-subscription-commerce-tag{font-size:9px!important;padding:4px 7px!important}.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action .public-order-action{min-width:78px!important;min-height:35px!important;font-size:10px!important;padding:5px 7px!important}.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action{bottom:-14px!important}}


/* FINAL subscription reference sizing: constrain each card instead of
   distributing just three cards over the entire desktop viewport. */
.public-order-page .public-order-subscription-grid {
  display:grid !important;
  grid-template-columns:repeat(3,minmax(0,220px)) !important;
  justify-content:start !important;
  align-items:start !important;
  gap:14px !important;
  width:100% !important;
}
.public-order-page .public-order-subscription-commerce-card {
  width:100% !important;
  max-width:220px !important;
  min-width:0 !important;
  justify-self:start !important;
  font-family:"Nunito",Arial,sans-serif !important;
}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-main {
  min-width:0 !important;
  width:100% !important;
}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media {
  width:100% !important;
  height:auto !important;
  aspect-ratio:4/5 !important;
  min-height:0 !important;
}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-carousel {
  position:absolute !important;
  inset:0 !important;
  overflow:hidden !important;
  border-radius:16px !important;
}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-carousel-image {
  display:block !important;
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
  object-position:center !important;
}
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-media-action {
  z-index:25 !important;
  bottom:-15px !important;
  right:5px !important;
}
.public-order-page .public-order-subscription-commerce-summary {
  padding:23px 3px 6px !important;
  gap:5px !important;
  font-family:"Nunito",Arial,sans-serif !important;
}
.public-order-page .public-order-subscription-commerce-summary h3 {
  font-size:15px !important;
  line-height:1.32 !important;
}
@media(max-width:760px) {
  .public-order-page .public-order-subscription-grid {
    grid-template-columns:repeat(3,minmax(0,1fr)) !important;
    gap:10px !important;
  }
  .public-order-page .public-order-subscription-commerce-card {max-width:220px !important;}
}
@media(max-width:520px) {
  .public-order-page .public-order-subscription-grid {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    gap:9px !important;
  }
  .public-order-page .public-order-subscription-commerce-card {
    max-width:none !important;
  }
  .public-order-page .public-order-subscription-commerce-card .public-order-subscription-media {
    aspect-ratio:4/5 !important;
  }
  .public-order-page .public-order-subscription-commerce-summary h3 {font-size:12px !important;}
}


/* ================================================================
   SUBSCRIPTION CARDS — FINAL STRUCTURAL FIX
   Explicitly cancel historic 8/5 two-column grid rules (which otherwise
   collapse the image when the summary/body are moved below the media).
   This block is deliberately last inside STYLES.
   ================================================================ */
.public-order-page .public-order-subscription-grid {
  display:grid !important;
  grid-template-columns:repeat(5,minmax(0,220px)) !important;
  gap:14px !important;
  justify-content:start !important;
  align-items:start !important;
}
.public-order-page .public-order-subscription-grid > .public-order-subscription-reference-card.public-order-subscription-commerce-card {
  box-sizing:border-box !important;
  width:100% !important;
  max-width:220px !important;
  min-width:0 !important;
  height:auto !important;
  min-height:0 !important;
  display:block !important;
  overflow:visible !important;
  background:transparent !important;
  border:0 !important;
  border-radius:0 !important;
  box-shadow:none !important;
  container-type:normal !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card > .public-order-subscription-main {
  box-sizing:border-box !important;
  display:flex !important;
  flex-direction:column !important;
  align-items:stretch !important;
  justify-content:flex-start !important;
  width:100% !important;
  height:auto !important;
  min-height:0 !important;
  max-height:none !important;
  aspect-ratio:auto !important;
  grid-template-columns:none !important;
  grid-template-rows:none !important;
  grid-template-areas:none !important;
  overflow:visible !important;
  gap:0 !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-media {
  box-sizing:border-box !important;
  position:relative !important;
  display:block !important;
  flex:0 0 auto !important;
  align-self:stretch !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
  width:100% !important;
  height:auto !important;
  min-height:0 !important;
  max-height:none !important;
  aspect-ratio:4 / 5 !important;
  overflow:visible !important;
  padding:0 !important;
  border:0 !important;
  isolation:isolate !important;
  background:#f6f5ef !important;
  border-radius:16px !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-media > .public-order-subscription-carousel {
  box-sizing:border-box !important;
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  min-height:100% !important;
  display:block !important;
  overflow:hidden !important;
  border:1px solid #e3e5dc !important;
  border-radius:16px !important;
  background:#f6f5ef !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-carousel-image {
  position:absolute !important;
  inset:0 !important;
  display:block !important;
  width:100% !important;
  height:100% !important;
  max-width:none !important;
  max-height:none !important;
  object-fit:contain !important;
  object-position:center !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-media-action {
  position:absolute !important;
  z-index:30 !important;
  top:auto !important;
  bottom:-17px !important;
  right:5px !important;
  left:auto !important;
  width:auto !important;
  height:auto !important;
  display:flex !important;
  overflow:visible !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-commerce-summary {
  box-sizing:border-box !important;
  position:relative !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
  width:100% !important;
  min-height:0 !important;
  display:flex !important;
  flex:0 0 auto !important;
  flex-direction:column !important;
  padding:26px 3px 9px !important;
  overflow:visible !important;
  background:transparent !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-body {
  position:relative !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
  width:100% !important;
  height:auto !important;
  min-height:0 !important;
  max-height:none !important;
  aspect-ratio:auto !important;
  overflow:visible !important;
  display:none !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card.public-order-subscription-expanded .public-order-subscription-body {
  display:block !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-bottom {
  display:none !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
}
.public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card.public-order-subscription-expanded .public-order-subscription-bottom {
  display:block !important;
}
@media(max-width:1290px){
  .public-order-page .public-order-subscription-grid{grid-template-columns:repeat(4,minmax(0,220px)) !important;}
}
@media(max-width:980px){
  .public-order-page .public-order-subscription-grid{grid-template-columns:repeat(3,minmax(0,220px)) !important;}
}
@media(max-width:760px){
  .public-order-page .public-order-subscription-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:10px !important;}
  .public-order-page .public-order-subscription-grid > .public-order-subscription-reference-card.public-order-subscription-commerce-card{max-width:none !important;}
}
@media(max-width:380px){
  .public-order-page .public-order-subscription-grid{gap:7px !important;}
  .public-order-page .public-order-subscription-reference-card.public-order-subscription-commerce-card .public-order-subscription-media-action .public-order-action{min-width:70px !important;padding:5px 6px !important;font-size:10px !important;}
}


/* FINAL CATEGORY GRID CONSISTENCY FIX — applies to ALL subscription groups.
   Previously one-item categories sat in 33% width parents, while their
   nested grids still requested five columns. This made cards ~100px wide. */
.public-order-page #catalogue .public-order-subscription-categories-layout {
  display:block !important;
  width:100% !important;
  max-width:100% !important;
  min-width:0 !important;
}
.public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category,
.public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-subscription-category-single,
.public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-subscription-category-multi {
  box-sizing:border-box !important;
  display:block !important;
  float:none !important;
  clear:both !important;
  flex:initial !important;
  flex-basis:auto !important;
  width:100% !important;
  max-width:100% !important;
  min-width:0 !important;
  margin:0 0 25px !important;
}
.public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category > .public-order-subscription-grid {
  box-sizing:border-box !important;
  display:grid !important;
  grid-template-columns:repeat(auto-fill,minmax(190px,220px)) !important;
  justify-content:start !important;
  align-items:start !important;
  gap:14px !important;
  width:100% !important;
  min-width:0 !important;
  max-width:100% !important;
}
.public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category > .public-order-subscription-grid > .public-order-subscription-commerce-card {
  width:100% !important;
  max-width:220px !important;
  min-width:0 !important;
  justify-self:stretch !important;
}
@media (max-width:700px) {
  .public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category > .public-order-subscription-grid {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    gap:10px !important;
  }
  .public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category > .public-order-subscription-grid > .public-order-subscription-commerce-card {
    max-width:none !important;
  }
}
@media (max-width:360px) {
  .public-order-page #catalogue .public-order-subscription-categories-layout > .public-order-category > .public-order-subscription-grid {gap:7px !important;}
}


/* 2026-10-14: unified, flow-safe offer/juice product cards.
   Overrides legacy absolute View Item positioning and the several older card
   styles without touching cart handlers or category data. */
.public-order-page .public-order-juice-grid > .public-order-juice-card {
  display:flex !important;
  flex-direction:column !important;
  align-self:start !important;
  height:auto !important;
  overflow:visible !important;
}
.public-order-page .public-order-juice-card > .public-order-juice-body {
  display:grid !important;
  grid-template-columns:minmax(0,1fr) auto !important;
  grid-template-rows:auto auto auto auto auto !important;
  align-content:start !important;
  column-gap:6px !important;
  row-gap:5px !important;
  position:relative !important;
  z-index:3 !important;
  width:100% !important;
  padding:25px 4px 5px !important;
  margin:0 !important;
  overflow:visible !important;
}
.public-order-page .public-order-juice-card .public-order-price-row {
  grid-column:1 / -1 !important;
  grid-row:1 !important;
  order:unset !important;
  display:flex !important;
  flex-wrap:wrap !important;
  align-items:center !important;
  gap:7px !important;
  padding:0 !important;
  margin:0 !important;
  min-height:30px !important;
  overflow:visible !important;
}
.public-order-page .public-order-juice-card .public-order-price {
  flex:0 0 auto !important;
  max-width:100% !important;
  margin:0 !important;
  padding:6px 8px !important;
  border-radius:7px !important;
  background:#188941 !important;
  color:#fff !important;
  font-size:15px !important;
  font-weight:900 !important;
  line-height:1.12 !important;
  white-space:nowrap !important;
}
.public-order-page .public-order-juice-card .public-order-compare {
  margin:0 !important;
  color:#858981 !important;
  font-size:11px !important;
  white-space:nowrap !important;
}
.public-order-page .public-order-juice-card .public-juice-discount {
  grid-column:1 !important;
  grid-row:2 !important;
  justify-self:start !important;
  align-self:center !important;
  order:unset !important;
  padding:0 !important;
  margin:0 !important;
  color:#087935 !important;
  font-size:11px !important;
  font-weight:900 !important;
  line-height:1.2 !important;
  white-space:nowrap !important;
}
.public-order-page .public-order-juice-card .public-order-juice-reference-view {
  grid-column:2 !important;
  grid-row:2 !important;
  justify-self:end !important;
  align-self:center !important;
  display:inline-block !important;
  position:static !important;
  inset:auto !important;
  order:unset !important;
  margin:0 !important;
  padding:0 !important;
  border:0 !important;
  background:transparent !important;
  color:#266c3a !important;
  font:inherit !important;
  font-size:11px !important;
  font-weight:850 !important;
  line-height:1.2 !important;
  text-decoration:underline !important;
  white-space:nowrap !important;
  cursor:pointer !important;
}
.public-order-page .public-order-juice-card .public-order-juice-name {
  grid-column:1 / -1 !important;
  grid-row:3 !important;
  order:unset !important;
  margin:0 !important;
  color:#242815 !important;
  font-size:14px !important;
  font-weight:850 !important;
  line-height:1.3 !important;
  overflow-wrap:anywhere !important;
}
.public-order-page .public-order-juice-card .public-order-juice-size {
  grid-column:1 / -1 !important;
  grid-row:4 !important;
  order:unset !important;
  margin:0 !important;
  color:#777e72 !important;
  font-size:12px !important;
  line-height:1.3 !important;
}
.public-order-page .public-order-juice-card .public-juice-category-tag {
  grid-column:1 / -1 !important;
  grid-row:5 !important;
  justify-self:start !important;
  order:unset !important;
  margin:2px 0 0 !important;
  padding:5px 8px !important;
  font-size:11px !important;
  line-height:1.2 !important;
  background:#fff0ce !important;
  border-radius:7px !important;
}
.public-order-page .public-order-juice-card .public-order-juice-actions {
  display:contents !important;
}
.public-order-page .public-order-juice-card .public-order-juice-actions .public-order-juice-view {
  display:none !important;
}
.public-order-page .public-order-juice-card .public-order-juice-action,
.public-order-page .public-order-juice-card .public-order-juice-quantity {
  position:absolute !important;
  z-index:15 !important;
  top:-20px !important;
  right:7px !important;
  bottom:auto !important;
  left:auto !important;
  transform:none !important;
  width:85px !important;
  height:40px !important;
  min-height:40px !important;
  margin:0 !important;
  padding:0 5px !important;
  border:2px solid #ff1760 !important;
  border-radius:11px !important;
  background:white !important;
  color:#ff1760 !important;
  box-shadow:0 2px 5px rgba(0,0,0,.1) !important;
}
.public-order-page .public-order-juice-card .public-order-juice-description-shell,
.public-order-page .public-order-juice-card .public-order-juice-mobile-under-image,
.public-order-page .public-order-juice-card .public-order-juice-mobile-actions {
  display:none !important;
}
@media(max-width:700px) {
  .public-order-page .public-order-juice-grid {
    grid-template-columns:repeat(3,minmax(0,1fr)) !important;
    gap:17px 7px !important;
  }
  .public-order-page .public-order-juice-card > .public-order-juice-body {
    padding:18px 1px 3px !important;
    column-gap:2px !important;
    row-gap:4px !important;
  }
  .public-order-page .public-order-juice-card .public-order-juice-action,
  .public-order-page .public-order-juice-card .public-order-juice-quantity {
    top:-14px !important;
    right:2px !important;
    width:51px !important;
    height:28px !important;
    min-height:28px !important;
    padding:0 2px !important;
    border-width:1.5px !important;
    border-radius:7px !important;
  }
  .public-order-page .public-order-juice-card .public-order-price-row {
    min-height:22px !important;
    gap:3px !important;
    margin:0 !important;
  }
  .public-order-page .public-order-juice-card .public-order-price {
    padding:4px 5px !important;
    font-size:clamp(10px,2.9vw,13px) !important;
    border-radius:5px !important;
  }
  .public-order-page .public-order-juice-card .public-order-compare {font-size:clamp(8px,1.9vw,10px) !important;}
  .public-order-page .public-order-juice-card .public-juice-discount {font-size:clamp(8px,2.1vw,10px) !important;}
  .public-order-page .public-order-juice-card .public-order-juice-reference-view {font-size:clamp(8px,2.1vw,10px) !important;}
  .public-order-page .public-order-juice-card .public-order-juice-name {font-size:clamp(10px,2.9vw,12px) !important;line-height:1.2 !important;}
  .public-order-page .public-order-juice-card .public-order-juice-size {font-size:9px !important;}
  .public-order-page .public-order-juice-card .public-juice-category-tag {padding:4px 5px !important;font-size:9px !important;}
}
@media(max-width:360px) {
  .public-order-page .public-order-juice-card .public-juice-discount {font-size:7.5px !important;}
  .public-order-page .public-order-juice-card .public-order-juice-reference-view {font-size:7.5px !important;}
}

/* Reference-matched details card and consistent product card proportions. */
.public-order-page .public-order-juice-grid > .public-order-juice-card{width:100% !important;max-width:205px !important;min-width:0 !important;background:transparent !important;border:0 !important;box-shadow:none !important;overflow:visible !important;}
.public-order-page .public-order-juice-card > .public-order-juice-image{width:100% !important;height:auto !important;min-height:0 !important;aspect-ratio:1/1 !important;position:relative !important;overflow:hidden !important;border:1px solid #e8e7dd !important;border-radius:16px !important;background:#f7f4ed !important;}
.public-order-page .public-order-juice-card > .public-order-juice-image img{width:100% !important;height:100% !important;object-fit:cover !important;}
.public-order-page .public-order-juice-card > .public-order-juice-body{padding:24px 3px 6px !important;}
.public-order-page .public-order-juice-card .public-order-juice-action,.public-order-page .public-order-juice-card .public-order-juice-quantity{top:-21px !important;right:6px !important;z-index:30 !important;}
.public-order-page .public-order-juice-card .public-order-juice-reference-view{position:static !important;grid-column:2 !important;grid-row:2 !important;align-self:center !important;justify-self:end !important;margin:0 !important;white-space:nowrap !important;}
.public-details-price-line{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:18px;font-family:Nunito,Arial,sans-serif;}
.public-details-price-line strong{padding:7px 12px;border-radius:9px;background:#198b43;color:#fff;font-size:1.15rem;}
.public-details-price-line del{color:#858981}.public-details-price-line span{color:#087935;font-weight:900;}
.public-details-add{margin-top:20px;padding:11px 20px;border:2px solid #ff1760;border-radius:10px;background:white;color:#f51659;font:800 14px Nunito,Arial,sans-serif;cursor:pointer;}
.public-details-add:disabled{opacity:.6;cursor:wait;}
@media(max-width:700px){.public-order-page .public-order-juice-grid > .public-order-juice-card{max-width:none !important;}.public-order-page .public-order-juice-card > .public-order-juice-body{padding:20px 3px 6px !important;}.public-order-page .public-order-juice-card .public-order-juice-action,.public-order-page .public-order-juice-card .public-order-juice-quantity{top:-19px !important;}}


/* Only the Offers category NAME is emphasized. No other card styles change. */
.public-order-page .public-order-category-head h3.public-order-offers-title-highlight,
.public-order-page #catalogue .public-order-category-head h3.public-order-offers-title-highlight {
  color: #176a35 !important;
  font-family: "Nunito", Arial, Helvetica, sans-serif !important;
  font-size: clamp(1.85rem, 2.8vw, 2.6rem) !important;
  font-weight: 950 !important;
  letter-spacing: -0.035em !important;
  line-height: 1.15 !important;
}
@media (max-width: 700px) {
  .public-order-page .public-order-category-head h3.public-order-offers-title-highlight,
  .public-order-page #catalogue .public-order-category-head h3.public-order-offers-title-highlight {
    font-size: clamp(1.5rem, 6vw, 1.9rem) !important;
  }
}


/* Subscription card surfaces match the public page background.
   Intentionally scoped to subscriptions; product cards are untouched. */
.public-order-page .public-order-subscription-commerce-card,
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-main,
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-commerce-summary,
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-mobile-summary,
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-body,
.public-order-page .public-order-subscription-commerce-card .public-order-subscription-bottom {
  background:var(--public-theme-neutral, #f7f7f2) !important;
}

`;

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function assetUrl(path: string): string {
  if (!path) return "";
  if (/^(https?:|data:|\/\/)/i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function localTomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function title(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortCatalogCategoriesBySerial<
  TCategory extends { serial_number?: unknown },
>(categories: TCategory[] | undefined): TCategory[] {
  return (categories || [])
    .map((category, originalIndex) => ({
      category,
      originalIndex,
      serialNumber: numberValue(category.serial_number, 0),
    }))
    .sort((left, right) => {
      const leftHasSerial = left.serialNumber > 0;
      const rightHasSerial = right.serialNumber > 0;

      if (leftHasSerial !== rightHasSerial) {
        return leftHasSerial ? -1 : 1;
      }

      if (leftHasSerial && left.serialNumber !== right.serialNumber) {
        return left.serialNumber - right.serialNumber;
      }

      // Keep backend order stable when serial numbers are equal or missing.
      return left.originalIndex - right.originalIndex;
    })
    .map(({ category }) => category);
}

function limitCatalogCategories<
  TItem,
  TCategory extends { items: TItem[] },
>(categories: TCategory[] | undefined, limit: number): TCategory[] {
  let remaining = Math.max(0, limit);

  return (categories || [])
    .map((category) => {
      const items = remaining > 0 ? category.items.slice(0, remaining) : [];
      remaining -= items.length;
      return { ...category, items } as TCategory;
    })
    .filter((category) => category.items.length > 0);
}

type PublicOfferCategoryCandidate = {
  name?: unknown;
  slug?: unknown;
  product_type?: unknown;
};

function isPublicOffersCategory(
  category: PublicOfferCategoryCandidate,
): boolean {
  const candidates = [category.name, category.slug, category.product_type];

  return candidates.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");

    return normalized
      .split(/\s+/)
      .some((part) => part === "offer" || part === "offers");
  });
}

function prioritizePublicOfferCategories<
  TCategory extends PublicOfferCategoryCandidate,
>(categories: TCategory[]): TCategory[] {
  return categories
    .map((category, originalIndex) => ({ category, originalIndex }))
    .sort((left, right) => {
      const leftIsOffer = isPublicOffersCategory(left.category);
      const rightIsOffer = isPublicOffersCategory(right.category);

      if (leftIsOffer !== rightIsOffer) {
        return leftIsOffer ? -1 : 1;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ category }) => category);
}

function money(symbol: string, value: unknown): string {
  return `${symbol}${numberValue(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function errorMessage(payload: ApiErrorPayload, fallback: string): string {
  if (payload.errors?.length) return payload.errors.join(" ");
  return payload.message?.trim() || fallback;
}

type PublicCatalogCacheEntry = {
  fetchedAt: number;
  signature: string;
  payload: CatalogPayload;
};

type PublicCurrentLocationCacheEntry = {
  fetchedAt: number;
  location: DeliveryLocation;
};

type SharedHomeLocationCacheEntry = {
  fetchedAt: number;
  source: "current" | "saved";
  latitude: number;
  longitude: number;
  name: string;
  addressId?: string;
};

type DeliverySuggestionPayload = Awaited<
  ReturnType<typeof suggestDeliveryLocations>
>;

type ReverseDeliveryLocationPayload = Awaited<
  ReturnType<typeof reverseDeliveryLocation>
>;

let publicCatalogMemoryCache: PublicCatalogCacheEntry | null | undefined;
let publicCatalogRequest: Promise<CatalogPayload> | null = null;
let lastPublicCatalogRequestAt = 0;

const locationSuggestionCache = new Map<
  string,
  {
    fetchedAt: number;
    payload: DeliverySuggestionPayload;
  }
>();
const locationSuggestionRequests = new Map<
  string,
  Promise<DeliverySuggestionPayload>
>();

const reverseLocationCache = new Map<
  string,
  {
    fetchedAt: number;
    payload: ReverseDeliveryLocationPayload;
  }
>();
const reverseLocationRequests = new Map<
  string,
  Promise<ReverseDeliveryLocationPayload>
>();

function isTimestampFresh(timestamp: number, ttl: number): boolean {
  return Number.isFinite(timestamp) && Date.now() - timestamp < ttl;
}

function catalogSignature(payload: CatalogPayload): string {
  return JSON.stringify({
    registration_otp_required: payload.registration_otp_required,
    location_required_for_catalog: payload.location_required_for_catalog,
    juice_categories: payload.juice_categories || [],
    subscription_categories: payload.subscription_categories || [],
    currency_symbol: payload.currency_symbol,
    currency_code: payload.currency_code,
    nearby_radius_km: payload.nearby_radius_km,
    coupon_enabled: payload.coupon_enabled,
    coupon_api_url: payload.coupon_api_url,
    active_coupon_count: payload.active_coupon_count,
  });
}

function readPublicCatalogCache(
  freshOnly = false,
): PublicCatalogCacheEntry | null {
  if (publicCatalogMemoryCache === undefined) {
    publicCatalogMemoryCache = null;

    if (typeof window !== "undefined") {
      try {
        const storedValue = window.sessionStorage.getItem(
          PUBLIC_CATALOG_CACHE_KEY,
        );
        if (storedValue) {
          const parsed = JSON.parse(storedValue) as PublicCatalogCacheEntry;
          if (
            parsed &&
            Number.isFinite(parsed.fetchedAt) &&
            parsed.payload &&
            Array.isArray(parsed.payload.juice_categories) &&
            Array.isArray(parsed.payload.subscription_categories)
          ) {
            publicCatalogMemoryCache = {
              ...parsed,
              signature:
                parsed.signature || catalogSignature(parsed.payload),
            };
          }
        }
      } catch {
        publicCatalogMemoryCache = null;
      }
    }
  }

  const entry = publicCatalogMemoryCache;
  if (!entry) return null;

  const maximumAge = freshOnly
    ? PUBLIC_CATALOG_CACHE_TTL_MS
    : PUBLIC_CATALOG_STALE_RENDER_MAX_MS;

  return isTimestampFresh(entry.fetchedAt, maximumAge) ? entry : null;
}

function writePublicCatalogCache(
  payload: CatalogPayload,
  fetchedAt = Date.now(),
): PublicCatalogCacheEntry {
  const entry: PublicCatalogCacheEntry = {
    fetchedAt,
    signature: catalogSignature(payload),
    payload,
  };
  publicCatalogMemoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        PUBLIC_CATALOG_CACHE_KEY,
        JSON.stringify(entry),
      );
    } catch {
      // In-memory caching still keeps SPA tab switching fast.
    }
  }

  return entry;
}

async function requestPublicCatalogOnce(): Promise<CatalogPayload> {
  if (publicCatalogRequest) return publicCatalogRequest;

  const request = (async () => {
    lastPublicCatalogRequestAt = Date.now();

    const response = await fetch(apiUrl(`${API_PREFIX}/catalog`), {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as CatalogPayload;

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.message || "Unable to load products.",
      );
    }

    writePublicCatalogCache(payload);
    return payload;
  })();

  publicCatalogRequest = request;

  try {
    return await request;
  } finally {
    if (publicCatalogRequest === request) {
      publicCatalogRequest = null;
    }
  }
}

function readPublicCurrentLocationCache(): DeliveryLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.sessionStorage.getItem(
      PUBLIC_CURRENT_LOCATION_CACHE_KEY,
    );
    if (!storedValue) return null;

    const parsed = JSON.parse(
      storedValue,
    ) as PublicCurrentLocationCacheEntry;
    const latitude = Number(parsed?.location?.latitude);
    const longitude = Number(parsed?.location?.longitude);

    if (
      !parsed ||
      !isTimestampFresh(parsed.fetchedAt, LOCATION_CACHE_TTL_MS) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return parsed.location;
  } catch {
    return null;
  }
}

function writePublicCurrentLocationCache(location: DeliveryLocation): void {
  if (typeof window === "undefined") return;

  const entry: PublicCurrentLocationCacheEntry = {
    fetchedAt: Date.now(),
    location,
  };

  try {
    window.sessionStorage.setItem(
      PUBLIC_CURRENT_LOCATION_CACHE_KEY,
      JSON.stringify(entry),
    );
  } catch {
    // A storage restriction should never block selecting a location.
  }
}

function writeSharedCurrentLocationCache(location: DeliveryLocation): void {
  if (typeof window === "undefined") return;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const entry: SharedHomeLocationCacheEntry = {
    fetchedAt: Date.now(),
    source: "current",
    latitude,
    longitude,
    name:
      location.name ||
      location.display_name ||
      "Current location",
  };

  try {
    window.sessionStorage.setItem(
      SHARED_HOME_LOCATION_CACHE_KEY,
      JSON.stringify(entry),
    );
  } catch {
    // Other pages can still obtain location normally if storage is unavailable.
  }
}

async function getDeliverySuggestionsCached(
  query: string,
): Promise<DeliverySuggestionPayload> {
  const key = query.trim().toLowerCase();
  const cached = locationSuggestionCache.get(key);
  if (
    cached &&
    isTimestampFresh(cached.fetchedAt, LOCATION_LOOKUP_CACHE_TTL_MS)
  ) {
    return cached.payload;
  }

  const existingRequest = locationSuggestionRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = suggestDeliveryLocations(query);
  locationSuggestionRequests.set(key, request);

  try {
    const payload = await request;
    locationSuggestionCache.set(key, {
      fetchedAt: Date.now(),
      payload,
    });
    return payload;
  } finally {
    if (locationSuggestionRequests.get(key) === request) {
      locationSuggestionRequests.delete(key);
    }
  }
}

async function getReverseDeliveryLocationCached(
  latitude: number,
  longitude: number,
): Promise<ReverseDeliveryLocationPayload> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = reverseLocationCache.get(key);
  if (
    cached &&
    isTimestampFresh(cached.fetchedAt, LOCATION_LOOKUP_CACHE_TTL_MS)
  ) {
    return cached.payload;
  }

  const existingRequest = reverseLocationRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = reverseDeliveryLocation(latitude, longitude);
  reverseLocationRequests.set(key, request);

  try {
    const payload = await request;
    reverseLocationCache.set(key, {
      fetchedAt: Date.now(),
      payload,
    });
    return payload;
  } finally {
    if (reverseLocationRequests.get(key) === request) {
      reverseLocationRequests.delete(key);
    }
  }
}

function loadExternalScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Unable to load ${src}`)),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function ensureLeafletStyles(): void {
  if (document.getElementById("public-order-leaflet-css")) return;
  const link = document.createElement("link");
  link.id = "public-order-leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

function planPrice(
  item: SubscriptionItem,
  planCode: string,
  customDays: number,
): number {
  const prices = item.plan_prices || {};
  if (planCode === "custom") {
    return (
      numberValue(prices.custom_per_day, item.base_price) *
      Math.max(item.minimum_custom_days || 1, customDays || 1)
    );
  }
  return numberValue(prices[planCode], item.base_price);
}

interface SubscriptionPriceEntry {
  key: string;
  label: string;
  value: number;
  suffix?: string;
}

/**
 * The backend already returns the exact plan codes enabled for a subscription
 * through `allowed_plan_codes`. Keep that list authoritative so a custom-only
 * package never renders Weekly / Monthly / 3 months as ₹0.00 placeholders.
 *
 * The price-key fallback is only for older cached/API payloads that do not yet
 * include allowed_plan_codes.
 */
function subscriptionAllowedPlanCodes(item: SubscriptionItem): string[] {
  const configuredCodes = Array.isArray(item.allowed_plan_codes)
    ? item.allowed_plan_codes
        .map((code) => String(code || "").trim().toLowerCase())
        .filter(Boolean)
    : [];

  if (configuredCodes.length) {
    return Array.from(new Set(configuredCodes));
  }

  const prices = item.plan_prices || {};
  const inferredCodes: string[] = [];

  if (Object.prototype.hasOwnProperty.call(prices, "weekly")) {
    inferredCodes.push("weekly");
  }
  if (Object.prototype.hasOwnProperty.call(prices, "monthly")) {
    inferredCodes.push("monthly");
  }
  if (Object.prototype.hasOwnProperty.call(prices, "three_months")) {
    inferredCodes.push("three_months");
  }
  if (Object.prototype.hasOwnProperty.call(prices, "custom_per_day")) {
    inferredCodes.push("custom");
  }

  // Preserve compatibility with old records that contain neither field.
  return inferredCodes.length
    ? inferredCodes
    : ["weekly", "monthly", "three_months"];
}

function subscriptionPriceEntries(
  item: SubscriptionItem,
): SubscriptionPriceEntry[] {
  const prices = item.plan_prices || {};
  const allowedCodes = new Set(subscriptionAllowedPlanCodes(item));

  const entries: SubscriptionPriceEntry[] = [
    {
      key: "weekly",
      label: "Weekly",
      value: numberValue(prices.weekly, item.base_price),
    },
    {
      key: "monthly",
      label: "Monthly",
      value: numberValue(prices.monthly, item.base_price),
    },
    {
      key: "three_months",
      label: "3 months",
      value: numberValue(prices.three_months, item.base_price),
    },
    {
      key: "custom",
      label: "Custom",
      value: numberValue(prices.custom_per_day, item.base_price),
      suffix: "/day",
    },
  ];

  return entries.filter((entry) => allowedCodes.has(entry.key));
}

function subscriptionScheduleSlides(
  item: SubscriptionItem,
): SubscriptionScheduleEntry[] {
  const schedule = item.content_schedule;
  const excludedWeekdays = new Set(
    (item.delivery_exclusions?.excluded_weekdays || ["sunday"]).map((value) =>
      String(value).toLowerCase(),
    ),
  );
  const excludedDates = new Set(
    (item.delivery_exclusions?.excluded_dates || []).map((row) => row.date),
  );
  const weekdays = (schedule?.weekday_entries || [])
    .filter(
      (entry) =>
        entry.is_active &&
        !excludedWeekdays.has(String(entry.weekday || "").toLowerCase()),
    )
    .sort(
      (left, right) =>
        Number(left.weekday_index ?? 99) - Number(right.weekday_index ?? 99),
    );
  const exactDates = (schedule?.date_entries || [])
    .filter(
      (entry) =>
        entry.is_active &&
        Boolean(entry.schedule_date) &&
        !excludedDates.has(String(entry.schedule_date)),
    )
    .sort((left, right) =>
      String(left.schedule_date).localeCompare(String(right.schedule_date)),
    );
  return [...weekdays, ...exactDates];
}

function subscriptionScheduleLabel(entry: SubscriptionScheduleEntry): string {
  if (entry.scope === "date" && entry.schedule_date) {
    const value = new Date(`${entry.schedule_date}T00:00:00`);
    return `Special · ${value.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  const weekday = String(entry.weekday || "Weekly menu");
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function PublicSubscriptionReferenceCard({
  item,
  currencySymbol,
  selectedSubscription,
  eager,
  highPriority,
  offerEmphasis: _offerEmphasis = false,
  onSubscribe,
  onViewSubscription,
  onChangeQuantity,
}: {
  item: SubscriptionItem;
  currencySymbol: string;
  selectedSubscription?: CheckoutSelection;
  eager: boolean;
  highPriority: boolean;
  offerEmphasis?: boolean;
  onSubscribe: () => void;
  onViewSubscription: () => void;
  onChangeQuantity: (delta: number) => void;
}) {
  const scheduleSlides = useMemo(
    () => subscriptionScheduleSlides(item),
    [item],
  );

  const fallbackSlide = useMemo<SubscriptionScheduleEntry>(
    () => ({
      id: `${item.id}-subscription-image`,
      scope: "weekday",
      title: item.name,
      description: item.description,
      image_url: item.image_url,
      is_active: true,
    }),
    [item],
  );

  const slides = scheduleSlides.length ? scheduleSlides : [fallbackSlide];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [detailEntry, setDetailEntry] =
    useState<SubscriptionScheduleEntry | null>(null);
  const [detailAnchorTop, setDetailAnchorTop] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setIsPaused(false);
    setDetailsExpanded(false);
    setDetailEntry(null);
    setDetailAnchorTop(null);
  }, [item.id]);

  useEffect(() => {
    if (!detailEntry || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailEntry(null);
        setDetailAnchorTop(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailEntry]);

  const autoSlideIndexes = useMemo(() => {
    const weekdayIndexes = slides
      .map((slide, index) => (slide.scope === "weekday" ? index : -1))
      .filter((index) => index >= 0);

    return weekdayIndexes.length
      ? weekdayIndexes
      : slides.map((_, index) => index);
  }, [slides]);

  useEffect(() => {
    if (autoSlideIndexes.length < 2 || isPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => {
        const currentPosition = autoSlideIndexes.indexOf(current);
        const nextPosition =
          currentPosition >= 0
            ? (currentPosition + 1) % autoSlideIndexes.length
            : 0;

        return autoSlideIndexes[nextPosition];
      });
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [autoSlideIndexes, isPaused, item.id]);

  const visibleIndex = Math.min(activeIndex, slides.length - 1);
  const active = slides[visibleIndex];
  const imageUrl = active.image_url || item.image_url;
  const priceEntries = subscriptionPriceEntries(item);
  const primaryPrice = priceEntries.find((entry) => entry.key === "monthly") || priceEntries[0];

  const openEntryDetails = (
    entry: SubscriptionScheduleEntry,
    index: number,
    trigger?: HTMLElement | null,
  ) => {
    setActiveIndex(index);

    if (typeof window !== "undefined" && trigger) {
      const rect = trigger.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const desiredCenter = rect.top + rect.height / 2;
      const minimumCenter = 185;
      const maximumCenter = Math.max(minimumCenter, viewportHeight - 185);

      setDetailAnchorTop(
        Math.min(Math.max(desiredCenter, minimumCenter), maximumCenter),
      );
    } else {
      setDetailAnchorTop(null);
    }

    setDetailEntry(entry);
  };

  return (
    <article
      className={`public-order-subscription-card public-order-subscription-reference-card public-order-subscription-commerce-card ${detailsExpanded ? "public-order-subscription-expanded " : ""}${
        false ? "public-order-subscription-offer-highlight " : ""
      }${selectedSubscription ? "selected" : ""}`}
    >
      <div className="public-order-subscription-main">
        <div className="public-order-subscription-media">
          <div
            className="public-order-subscription-carousel"
            aria-label={`${item.name} schedule carousel`}
            aria-live={isPaused ? "polite" : "off"}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setIsPaused(false);
              }
            }}
          >

            {imageUrl ? (
              <img
                key={active.id}
                className="public-order-subscription-carousel-image"
                src={assetUrl(imageUrl)}
                alt={active.title || item.name}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={highPriority ? "high" : "auto"}
              />
            ) : (
              <span
                className="public-order-subscription-carousel-placeholder"
                aria-hidden="true"
              >
                🥤
              </span>
            )}

            <span className="public-order-subscription-image-badge">
              {item.unit_label || "Subscription"}
            </span>

            <div className="public-order-subscription-carousel-caption">
              <span className="public-order-subscription-carousel-label">
                {subscriptionScheduleLabel(active)}
              </span>
              <span className="public-order-subscription-carousel-title">
                {active.title || item.name}
              </span>
            </div>

            {slides.length > 1 ? (
              <div
                className="public-order-subscription-carousel-dots"
                aria-label={`Choose an image for ${item.name}`}
              >
                {slides.map((slide, index) => (
                  <button
                    className={`public-order-subscription-carousel-dot ${
                      index === visibleIndex ? "active" : ""
                    }`}
                    type="button"
                    aria-label={`Show ${subscriptionScheduleLabel(slide)}`}
                    aria-current={
                      index === visibleIndex ? "true" : undefined
                    }
                    onClick={() => setActiveIndex(index)}
                    key={slide.id}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="public-order-subscription-media-action">
            {selectedSubscription ? (
              <div className="public-order-quantity-control" aria-label={`${item.name} quantity`}>
                <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onChangeQuantity(-1)}>−</button>
                <span className="public-order-quantity-value">{selectedSubscription.quantity}</span>
                <button type="button" aria-label={`Increase ${item.name} quantity`} disabled={selectedSubscription.quantity >= 25} onClick={() => onChangeQuantity(1)}>+</button>
              </div>
            ) : (
              <button className="public-order-action" type="button" onClick={onSubscribe}>SUBSCRIBE</button>
            )}
          </div>
        </div>

        <div className="public-order-subscription-commerce-summary">
          <div className="public-order-subscription-commerce-price-row">
            <strong>{primaryPrice ? money(currencySymbol, primaryPrice.value) : money(currencySymbol, item.base_price)}</strong>
            <span>{primaryPrice?.label || "Subscription"}</span>
          </div>
          <div className="public-order-subscription-commerce-detail-row">
            <span>{scheduleSlides.length ? `${scheduleSlides.length} days` : "Flexible"}</span>
            <button type="button" onClick={onViewSubscription}>View More</button>
          </div>
          <h3>{item.name}</h3>
          <p>{item.unit_label || "Subscription"}</p>
          <span className="public-order-subscription-commerce-tag">{priceEntries.length} {priceEntries.length === 1 ? "plan" : "plans"}</span>
        </div>

        <div className="public-order-subscription-body">
          <h4>{item.name}</h4>

          <div className="public-order-subscription-day-menu">
            <h5 className="public-order-subscription-daily-heading">
              Daily menu
            </h5>

            <ul
              className="public-order-subscription-day-list"
              style={{
                gridTemplateRows: `repeat(${Math.max(
                  slides.length,
                  1,
                )}, minmax(0, 1fr))`,
              }}
            >
              {slides.map((slide, index) => {
                const menuText = (slide.title || item.name).trim();
                const dayLabel = subscriptionScheduleLabel(slide);
                const isActive = index === visibleIndex;

                return (
                  <li
                    className={`public-order-subscription-day-row${
                      isActive ? " active" : ""
                    }`}
                    key={`${slide.id}-menu`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      setActiveIndex(index);
                      setIsPaused(true);
                    }}
                  >
                    <strong className="public-order-subscription-day-label">
                      {dayLabel}
                    </strong>

                    <button
                      className="public-order-subscription-day-view-button"
                      type="button"
                      aria-label={`View ${dayLabel} menu details`}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsPaused(true);
                        openEntryDetails(slide, index, event.currentTarget);
                      }}
                      title={menuText}
                    >
                      View details
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="public-order-subscription-bottom">
        <div
          className={`public-order-subscription-prices${
            priceEntries.length === 1 ? " public-order-subscription-prices-single" : ""
          }`}
        >
          {priceEntries.map((entry) => (
            <div
              className={`public-order-subscription-price${
                entry.key === "custom" ? " public-order-subscription-price-custom" : ""
              }`}
              key={entry.key}
            >
              <span>{entry.label}</span>
              <strong>
                {money(currencySymbol, entry.value)}
                {entry.suffix ? (
                  <small className="public-order-subscription-price-suffix">
                    {entry.suffix}
                  </small>
                ) : null}
              </strong>
            </div>
          ))}

          <div className="public-order-subscription-actions">
            {selectedSubscription ? (
              <div
                className="public-order-quantity-control"
                aria-label={`${item.name} quantity`}
              >
                <button
                  type="button"
                  aria-label={`Decrease ${item.name} quantity`}
                  onClick={() => onChangeQuantity(-1)}
                >
                  −
                </button>

                <span
                  className="public-order-quantity-value"
                  aria-live="polite"
                >
                  {selectedSubscription.quantity}
                </span>

                <button
                  type="button"
                  aria-label={`Increase ${item.name} quantity`}
                  disabled={selectedSubscription.quantity >= 25}
                  onClick={() => onChangeQuantity(1)}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="public-order-action"
                onClick={onSubscribe}
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      </div>

      {detailEntry && typeof document !== "undefined"
        ? createPortal(
            <div
              className="public-order-subscription-detail-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setDetailEntry(null);
                  setDetailAnchorTop(null);
                }
              }}
            >
              <section
                className="public-order-subscription-detail-card"
                style={
                  detailAnchorTop !== null
                    ? { top: `${detailAnchorTop}px` }
                    : undefined
                }
                role="dialog"
                aria-modal="true"
                aria-label={`${subscriptionScheduleLabel(
                  detailEntry,
                )} menu details`}
              >
                <div className="public-order-subscription-detail-header">
                  <div>
                    <span>Daily menu</span>
                    <strong>{subscriptionScheduleLabel(detailEntry)}</strong>
                  </div>

                  <button
                    className="public-order-subscription-detail-close"
                    type="button"
                    aria-label="Close menu details"
                    onClick={() => {
                      setDetailEntry(null);
                      setDetailAnchorTop(null);
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className="public-order-subscription-detail-layout">
                  <div className="public-order-subscription-detail-image-wrap">
                    {detailEntry.image_url || item.image_url ? (
                      <img
                        className="public-order-subscription-detail-image"
                        src={assetUrl(detailEntry.image_url || item.image_url)}
                        alt={`${subscriptionScheduleLabel(detailEntry)} - ${
                          detailEntry.title || item.name
                        }`}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="public-order-subscription-detail-image-placeholder"
                        aria-hidden="true"
                      >
                        🥤
                      </div>
                    )}

                    <span className="public-order-subscription-detail-day-badge">
                      {subscriptionScheduleLabel(detailEntry)}
                    </span>
                  </div>

                  <div className="public-order-subscription-detail-content">
                    <span>
                      Included on {subscriptionScheduleLabel(detailEntry)}
                    </span>
                    <p>{(detailEntry.title || item.name).trim()}</p>
                    {detailEntry.description?.trim() ? (
                      <small>{detailEntry.description.trim()}</small>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}

function displayDate(value: string): string {
  if (!value) return "Not available";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProductImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return src ? (
    <img
      src={assetUrl(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="public-order-product-placeholder" aria-hidden="true">
      🥤
    </span>
  );
}

function LocationMap({
  latitude,
  longitude,
  onChange,
  onError,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  onError: (message: string) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [ready, setReady] = useState(Boolean(window.L));

  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }
    ensureLeafletStyles();
    void loadExternalScript(
      "public-order-leaflet-js",
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    )
      .then(() => setReady(true))
      .catch(() =>
        onError(
          "The map could not load. You can still use current location and enter the address.",
        ),
      );
  }, [onError]);

  useEffect(() => {
    if (!ready || !window.L || !nodeRef.current || mapRef.current) return;
    const map = window.L.map(nodeRef.current).setView(
      [latitude ?? DEFAULT_LATITUDE, longitude ?? DEFAULT_LONGITUDE],
      latitude !== null && longitude !== null ? 15 : 11,
    );
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", (event) => {
      onChange(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [ready, onChange]);

  useEffect(() => {
    if (
      !ready ||
      !window.L ||
      !mapRef.current ||
      latitude === null ||
      longitude === null
    ) {
      return;
    }
    const coordinates: [number, number] = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = window.L.marker(coordinates).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(coordinates);
    }
    mapRef.current.setView(coordinates, 16);
  }, [latitude, longitude, ready]);

  return (
    <div
      ref={nodeRef}
      className="public-order-map"
      role="application"
      aria-label="Select delivery point on map"
    />
  );
}

export function PublicOrderPage() {
  const navigate = useNavigate();
  const checkoutRef = useRef<HTMLElement>(null);
  const initialCatalogEntry = useMemo(
    () => readPublicCatalogCache(false),
    [],
  );
  const initialCatalog = initialCatalogEntry?.payload ?? null;

  const [catalog, setCatalog] = useState<CatalogPayload | null>(initialCatalog);
  const [activeJuiceDetails, setActiveJuiceDetails] = useState<{ category: JuiceCategory; item: JuiceItem } | null>(null);
  const [visibleJuiceCount, setVisibleJuiceCount] =
    useState(CATALOG_PAGE_SIZE);
  const [visibleSubscriptionCount, setVisibleSubscriptionCount] =
    useState(CATALOG_PAGE_SIZE);
  const [customer, setCustomer] = useState<CustomerForm>(INITIAL_CUSTOMER);
  const [address, setAddress] = useState<AddressForm>(INITIAL_ADDRESS);
  const [selections, setSelections] = useState<CheckoutSelection[]>([]);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(!initialCatalog);
  const [checking, setChecking] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addingCartItemId, setAddingCartItemId] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    DeliveryLocation[]
  >([]);
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] =
    useState(false);
  const locationSearchTimer = useRef<number | null>(null);
  const skipNextLocationSearch = useRef(false);
  const locationResolveRequest = useRef(0);
  const locationSuggestionRequestRef = useRef(0);
  const catalogRequestIdRef = useRef(0);
  const backgroundCatalogRefreshRef = useRef(false);
  const catalogSignatureRef = useRef(
    initialCatalogEntry?.signature ||
      (initialCatalog ? catalogSignature(initialCatalog) : ""),
  );
  const csrfTokenRef = useRef(initialCatalog?.csrf_token || "");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<PublicCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(
    null,
  );
  const [confirmedOrder, setConfirmedOrder] = useState<PublicOrder | null>(
    null,
  );

  const currencySymbol = catalog?.currency_symbol || "₹";
  const minimumStartDate = useMemo(localTomorrow, []);

  const selectedItemsByKey = useMemo(() => {
    const lookup = new Map<string, CheckoutSelection>();
    selections.forEach((selection) => {
      lookup.set(`${selection.kind}:${selection.item_id}`, selection);
    });
    return lookup;
  }, [selections]);

  const catalogMetrics = useMemo(() => {
    const juiceCategories = catalog?.juice_categories || [];
    const subscriptionCategories = catalog?.subscription_categories || [];

    const juiceCount = juiceCategories.reduce(
      (total, category) => total + category.items.length,
      0,
    );
    const subscriptionCount = subscriptionCategories.reduce(
      (total, category) => total + category.items.length,
      0,
    );

    return {
      hasJuices: juiceCount > 0,
      hasSubscriptions: subscriptionCount > 0,
      juiceCount,
      subscriptionCount,
    };
  }, [catalog]);

  const visibleJuiceCategories = useMemo(
    () =>
      limitCatalogCategories(
        prioritizePublicOfferCategories(
          sortCatalogCategoriesBySerial(catalog?.juice_categories),
        ),
        visibleJuiceCount,
      ),
    [catalog?.juice_categories, visibleJuiceCount],
  );

  const visibleSubscriptionCategories = useMemo(
    () =>
      limitCatalogCategories(
        prioritizePublicOfferCategories(
          sortCatalogCategoriesBySerial(catalog?.subscription_categories),
        ),
        visibleSubscriptionCount,
      ),
    [catalog?.subscription_categories, visibleSubscriptionCount],
  );

  const selectedUnitCount = useMemo(
    () =>
      selections.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [selections],
  );

  const estimatedSubtotal = useMemo(
    () =>
      selections.reduce((total, item) => {
        const unitPrice =
          item.kind === "subscription" && item.subscription
            ? planPrice(
                item.subscription,
                item.plan_code,
                item.custom_days,
              )
            : item.price;
        return total + unitPrice * item.quantity;
      }, 0),
    [selections],
  );

  const applyCatalogResult = useCallback(
    (payload: CatalogPayload, silent = false) => {
      if (payload.csrf_token) {
        csrfTokenRef.current = payload.csrf_token;
      }

      const signature = catalogSignature(payload);
      if (catalogSignatureRef.current === signature) {
        return false;
      }

      catalogSignatureRef.current = signature;

      if (silent) {
        startTransition(() => setCatalog(payload));
      } else {
        setCatalog(payload);
      }

      return true;
    },
    [],
  );

  const loadCatalog = useCallback(
    async ({
      forceRefresh = false,
      silent = false,
    }: {
      forceRefresh?: boolean;
      silent?: boolean;
    } = {}) => {
      const requestId = ++catalogRequestIdRef.current;

      if (!forceRefresh) {
        const cached = readPublicCatalogCache(true);
        if (cached) {
          applyCatalogResult(cached.payload, silent);
          setLoading(false);
          return cached.payload;
        }
      }

      if (!silent && !catalogSignatureRef.current) {
        setLoading(true);
      }

      try {
        const payload = await requestPublicCatalogOnce();
        if (requestId !== catalogRequestIdRef.current) return null;

        applyCatalogResult(payload, silent);
        return payload;
      } catch (error) {
        if (
          requestId === catalogRequestIdRef.current &&
          !catalogSignatureRef.current
        ) {
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load the catalogue.",
          });
        }
        return null;
      } finally {
        if (requestId === catalogRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [applyCatalogResult],
  );

  useEffect(() => {
    if (initialCatalogEntry) {
      if (
        Date.now() - lastPublicCatalogRequestAt >=
        PUBLIC_CATALOG_RETRY_COOLDOWN_MS
      ) {
        void loadCatalog({
          forceRefresh: true,
          silent: true,
        });
      }
    } else {
      void loadCatalog();
    }

    return () => {
      catalogRequestIdRef.current += 1;
    };
  }, [initialCatalogEntry, loadCatalog]);

  useEffect(() => {
    const refreshVisibleCatalog = async () => {
      if (
        document.visibilityState !== "visible" ||
        backgroundCatalogRefreshRef.current ||
        Date.now() - lastPublicCatalogRequestAt <
          PUBLIC_CATALOG_RETRY_COOLDOWN_MS
      ) {
        return;
      }

      backgroundCatalogRefreshRef.current = true;
      try {
        await loadCatalog({
          forceRefresh: true,
          silent: true,
        });
      } finally {
        backgroundCatalogRefreshRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshVisibleCatalog();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PUBLIC_CATALOG_CACHE_KEY || !event.newValue) return;

      publicCatalogMemoryCache = undefined;
      const cached = readPublicCatalogCache(false);
      if (cached) {
        applyCatalogResult(cached.payload, true);
      }
    };

    const intervalId = window.setInterval(
      () => void refreshVisibleCatalog(),
      PUBLIC_CATALOG_BACKGROUND_REFRESH_MS,
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", refreshVisibleCatalog);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", refreshVisibleCatalog);
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyCatalogResult, loadCatalog]);

  useEffect(() => {
    const requestId = ++locationSuggestionRequestRef.current;

    if (locationSearchTimer.current !== null) {
      window.clearTimeout(locationSearchTimer.current);
    }

    if (skipNextLocationSearch.current) {
      skipNextLocationSearch.current = false;
      setLoadingLocationSuggestions(false);
      return;
    }

    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setLoadingLocationSuggestions(false);
      return;
    }

    locationSearchTimer.current = window.setTimeout(() => {
      setLoadingLocationSuggestions(true);

      getDeliverySuggestionsCached(query)
        .then((response) => {
          if (requestId !== locationSuggestionRequestRef.current) return;
          setLocationSuggestions(response.suggestions || []);
        })
        .catch(() => {
          if (requestId === locationSuggestionRequestRef.current) {
            setLocationSuggestions([]);
          }
        })
        .finally(() => {
          if (requestId === locationSuggestionRequestRef.current) {
            setLoadingLocationSuggestions(false);
          }
        });
    }, 300);

    return () => {
      if (locationSearchTimer.current !== null) {
        window.clearTimeout(locationSearchTimer.current);
      }
    };
  }, [locationQuery]);

  function setCustomerField<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) {
    setCustomer((current) => ({ ...current, [key]: value }));
    if (key === "full_name") {
      setAddress((current) => ({
        ...current,
        recipient_name:
          current.recipient_name === "" ||
          current.recipient_name === customer.full_name
            ? value
            : current.recipient_name,
      }));
    }
    if (key === "email") {
      setAvailability(null);
      setAppliedCoupon(null);
      setPendingPayment(null);
    }
    if (key === "phone") {
      setAddress((current) => ({
        ...current,
        phone:
          current.phone === "" || current.phone === customer.phone
            ? value
            : current.phone,
      }));
    }
  }

  function setAddressField<K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K],
  ) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  const applyDeliveryLocation = useCallback(
    (location: DeliveryLocation, source: "current_location" | "map_pin" | "place_search") => {
      const latitude = Number(Number(location.latitude).toFixed(6));
      const longitude = Number(Number(location.longitude).toFixed(6));
      const addressPatch = addressPatchFromLocation(location);
      const displayName =
        location.display_name ||
        location.name ||
        `${latitude}, ${longitude}`;

      setAddress((current) => ({
        ...current,
        ...addressPatch,
        latitude,
        longitude,
      }));
      skipNextLocationSearch.current = true;
      setLocationQuery(displayName);
      setLocationSuggestions([]);
      setAvailability(null);
      setAppliedCoupon(null);
      setPendingPayment(null);
      if (source === "current_location") {
        writePublicCurrentLocationCache(location);
        writeSharedCurrentLocationCache(location);
      }

      setNotice({
        kind: "info",
        text:
          source === "current_location"
            ? "Current location found and the delivery address was filled automatically. Please verify the address before payment."
            : source === "place_search"
              ? "Selected place and delivery address were filled automatically. You can fine-tune the pin on the map."
              : "Map pin updated and the delivery address was refreshed automatically. Please verify the address.",
      });
    },
    [],
  );

  const resolveCoordinates = useCallback(
    async (
      latitude: number,
      longitude: number,
      source: "current_location" | "map_pin" | "place_search",
    ) => {
      const requestId = ++locationResolveRequest.current;
      const normalizedLatitude = Number(latitude.toFixed(6));
      const normalizedLongitude = Number(longitude.toFixed(6));

      setAddress((current) => ({
        ...current,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
      }));
      setAvailability(null);
      setAppliedCoupon(null);
      setPendingPayment(null);
      setResolvingLocation(true);

      try {
        const response = await getReverseDeliveryLocationCached(
          normalizedLatitude,
          normalizedLongitude,
        );
        if (requestId !== locationResolveRequest.current) return;
        if (response.location) {
          applyDeliveryLocation(response.location, source);
        } else {
          skipNextLocationSearch.current = true;
          setLocationQuery(`${normalizedLatitude}, ${normalizedLongitude}`);
          setLocationSuggestions([]);
          setNotice({
            kind: "info",
            text: "The delivery pin was saved, but the address could not be fetched automatically. Please enter the address below.",
          });
        }
      } catch {
        if (requestId !== locationResolveRequest.current) return;
        skipNextLocationSearch.current = true;
        setLocationQuery(`${normalizedLatitude}, ${normalizedLongitude}`);
        setLocationSuggestions([]);
        setNotice({
          kind: "info",
          text: "The delivery pin was saved, but the address could not be fetched automatically. Please enter the address below.",
        });
      } finally {
        if (requestId === locationResolveRequest.current) {
          setResolvingLocation(false);
        }
      }
    },
    [applyDeliveryLocation],
  );

  function selectLocationSuggestion(location: DeliveryLocation) {
    skipNextLocationSearch.current = true;
    setLocationQuery(
      location.display_name ||
        location.name ||
        `${location.latitude}, ${location.longitude}`,
    );
    setLocationSuggestions([]);

    void resolveCoordinates(
      location.latitude,
      location.longitude,
      "place_search",
    );
  }

  const handleMapError = useCallback((message: string) => {
    setNotice({ kind: "error", text: message });
  }, []);

  function invalidateSelectionAvailability() {
    setAvailability(null);
    setAppliedCoupon(null);
    setPendingPayment(null);
  }

  async function getAuthenticatedSession(): Promise<AuthSessionPayload | null> {
    try {
      const response = await fetch(apiUrl(AUTH_SESSION_PATH), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as AuthSessionPayload;

      if (!response.ok || !payload.success) return null;
      const identity = await getJwtAuthIdentity();
      if (!identity.authenticated) return null;

      const sessionCsrfToken = String(payload.csrf_token || "").trim();
      if (sessionCsrfToken) csrfTokenRef.current = sessionCsrfToken;
      return payload;
    } catch {
      return null;
    }
  }

  async function navigateToProtectedCatalogue(destination: string) {
    const session = await getAuthenticatedSession();
    navigate(session ? destination : LOGIN_PATH);
  }

  function requireAuthentication(): boolean {
    // The embedded public checkout remains unchanged. Catalogue navigation
    // buttons use navigateToProtectedCatalogue() for the requested login gate.
    return true;
  }

  function selectedItem(kind: ProductKind, itemId: string) {
    return selectedItemsByKey.get(`${kind}:${itemId}`);
  }


  function updateSelectedItem(
    kind: ProductKind,
    itemId: string,
    update: (current: CheckoutSelection) => CheckoutSelection,
  ) {
    if (!requireAuthentication()) return;
    setSelections((current) =>
      current.map((item) =>
        item.kind === kind && item.item_id === itemId ? update(item) : item,
      ),
    );
    invalidateSelectionAvailability();
  }

  function toggleComplimentaryItem(itemId: string, choiceId: string) {
    if (!requireAuthentication()) return;
    const selected = selections.find(
      (item) => item.kind === "subscription" && item.item_id === itemId,
    );
    const subscription = selected?.subscription;
    if (!selected || !subscription) return;

    const currentIds = selected.complimentary_item_ids || [];
    if (currentIds.includes(choiceId)) {
      updateSelectedItem("subscription", itemId, (current) => ({
        ...current,
        complimentary_item_ids: current.complimentary_item_ids.filter(
          (id) => id !== choiceId,
        ),
      }));
      return;
    }

    const choices = subscription.complimentary_choices || [];
    const maximum =
      Number(subscription.complimentary_config?.max_items || 0) > 0
        ? Number(subscription.complimentary_config.max_items)
        : choices.length;
    if (maximum > 0 && currentIds.length >= maximum) {
      setNotice({
        kind: "error",
        text: `Select no more than ${maximum} complimentary item(s) for ${subscription.name}.`,
      });
      return;
    }

    const budget = numberValue(subscription.complimentary_config?.budget, 0);
    const selectedValue = currentIds.reduce((total, id) => {
      const choice = choices.find((row) => row.id === id);
      return total + numberValue(choice?.catalog_price, 0);
    }, 0);
    const nextChoice = choices.find((row) => row.id === choiceId);
    if (
      budget > 0 &&
      selectedValue + numberValue(nextChoice?.catalog_price, 0) > budget
    ) {
      setNotice({
        kind: "error",
        text: `Complimentary choices for ${subscription.name} cannot exceed ${money(
          currencySymbol,
          budget,
        )}.`,
      });
      return;
    }

    updateSelectedItem("subscription", itemId, (current) => ({
      ...current,
      complimentary_item_ids: [...current.complimentary_item_ids, choiceId],
    }));
  }

  function changeSelectionQuantity(
    kind: ProductKind,
    itemId: string,
    delta: number,
  ) {
    if (!requireAuthentication()) return;
    setSelections((current) =>
      current
        .map((item) => {
          if (item.kind !== kind || item.item_id !== itemId) return item;
          const maximum = item.kind === "subscription" ? 25 : 99;
          return {
            ...item,
            quantity: Math.max(0, Math.min(maximum, item.quantity + delta)),
          };
        })
        .filter((item) => item.quantity > 0),
    );
    invalidateSelectionAvailability();
  }

  function scrollToCheckout() {
    window.setTimeout(
      () => checkoutRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  }

  async function chooseJuice(item: JuiceItem) {
    if (addingCartItemId) return;

    const session = await getAuthenticatedSession();
    if (!session) {
      navigate(LOGIN_PATH);
      return;
    }

    setAddingCartItemId(item.id);

    const readPayload = async (response: Response): Promise<CommerceCartPayload> =>
      (await response.json().catch(() => ({}))) as CommerceCartPayload;

    const fetchCartToken = async (): Promise<string> => {
      const response = await fetch(apiUrl("/react/api/commerce/cart"), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await readPayload(response);

      if (response.status === 401) {
        navigate(payload.login_url || LOGIN_PATH);
        throw new Error("AUTH_REQUIRED");
      }
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Unable to load the cart.");
      }

      const token = String(payload.csrf_token || "").trim();
      if (!token) throw new Error("Cart security token is unavailable.");
      csrfTokenRef.current = token;
      return token;
    };

    const addItem = async (csrfToken: string) => {
      const body = new URLSearchParams({
        csrf_token: csrfToken,
        quantity: "1",
      });
      const response = await fetch(
        apiUrl(
          `/react/api/commerce/cart/items/${encodeURIComponent(item.id)}`,
        ),
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
      return { response, payload: await readPayload(response) };
    };

    try {
      let csrfToken =
        String(session.csrf_token || csrfTokenRef.current || "").trim() ||
        (await fetchCartToken());

      let result = await addItem(csrfToken);

      if (result.response.status === 401) {
        navigate(result.payload.login_url || LOGIN_PATH);
        return;
      }

      if (
        (!result.response.ok || result.payload.success === false) &&
        result.payload.code === "CSRF_FAILED"
      ) {
        csrfToken = await fetchCartToken();
        result = await addItem(csrfToken);
      }

      if (!result.response.ok || result.payload.success === false) {
        throw new Error(result.payload.message || "Unable to add this item to the cart.");
      }

      const refreshedToken = String(result.payload.csrf_token || "").trim();
      if (refreshedToken) csrfTokenRef.current = refreshedToken;

      window.dispatchEvent(new Event("cart-updated"));
      navigate(CART_PATH);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") return;

      // If direct cart insertion is unavailable in this deployment, send the
      // customer to the normal juice catalogue where the existing cart flow is used.
      navigate("/juice");
    } finally {
      setAddingCartItemId("");
    }
  }

  function viewJuiceItem(category: JuiceCategory, item: JuiceItem) {
    setActiveJuiceDetails({ category, item });
  }

  useEffect(() => {
    if (!activeJuiceDetails) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveJuiceDetails(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = prior;
      window.removeEventListener("keydown", onEscape);
    };
  }, [activeJuiceDetails]);

  async function chooseSubscription(item: SubscriptionItem) {
    await navigateToProtectedCatalogue(
      `/subscriptions/item/${encodeURIComponent(item.id)}`,
    );
  }

  function useCurrentLocation() {
    const cachedLocation = readPublicCurrentLocationCache();
    if (cachedLocation) {
      applyDeliveryLocation(cachedLocation, "current_location");
      return;
    }

    if (!navigator.geolocation) {
      setNotice({
        kind: "error",
        text: "Current-location access is not supported by this browser.",
      });
      return;
    }

    setLocating(true);
    setNotice({
      kind: "info",
      text: "Detecting your current delivery location…",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void resolveCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "current_location",
        ).finally(() => setLocating(false));
      },
      (error) => {
        setLocating(false);
        setNotice({
          kind: "error",
          text:
            error.message ||
            "Unable to detect the current location. Point on the map instead.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: LOCATION_CACHE_TTL_MS,
      },
    );
  }

  function selectionsBody(): Array<Record<string, unknown>> {
    return selections.map((selection) => ({
      kind: selection.kind,
      item_id: selection.item_id,
      quantity: selection.quantity,
      plan_code: selection.plan_code,
      custom_days: selection.custom_days,
      start_date: selection.start_date,
      combination_id: selection.combination_id,
      complimentary_item_ids: selection.complimentary_item_ids,
    }));
  }

  async function postJson<T extends ApiErrorPayload>(
    path: string,
    body: Record<string, unknown>,
    publicOrderToken?: string,
  ): Promise<T> {
    const sendRequest = async (token: string) => {
      const response = await fetch(apiUrl(path), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
          ...(publicOrderToken
            ? { "X-Public-Order-Token": publicOrderToken }
            : {}),
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as T;
      if (payload.csrf_token) {
        csrfTokenRef.current = payload.csrf_token;
      }

      return { response, payload };
    };

    let result = await sendRequest(csrfTokenRef.current);

    if (
      (!result.response.ok || result.payload.success === false) &&
      result.payload.code === "CSRF_FAILED"
    ) {
      const freshCatalog = await requestPublicCatalogOnce();
      applyCatalogResult(freshCatalog, true);
      csrfTokenRef.current = freshCatalog.csrf_token || csrfTokenRef.current;
      result = await sendRequest(csrfTokenRef.current);
    }

    if (!result.response.ok || result.payload.success === false) {
      throw new Error(
        errorMessage(result.payload, "Unable to complete the request."),
      );
    }

    return result.payload;
  }

  function validateAvailabilityRequest(): string | null {
    if (!selections.length) {
      return "Add at least one product first.";
    }
    if (address.latitude === null || address.longitude === null) {
      return "Use current location or point to the delivery location on the map.";
    }
    const subscriptionWithoutPlan = selections.find(
      (item) => item.kind === "subscription" && !item.plan_code,
    );
    if (subscriptionWithoutPlan) {
      return "Select a subscription plan.";
    }
    const subscriptionWithoutCombination = selections.find(
      (item) =>
        item.kind === "subscription" &&
        (item.subscription?.catalog_combinations.length || 0) > 0 &&
        !item.combination_id,
    );
    if (subscriptionWithoutCombination) {
      return "Select a subscription combination.";
    }
    return null;
  }

  async function requestAvailability(
    couponCode: string,
  ): Promise<AvailabilityPayload> {
    return postJson<AvailabilityPayload>(
      `${API_PREFIX}/availability`,
      {
        selections: selectionsBody(),
        latitude: address.latitude,
        longitude: address.longitude,
        coupon_code: couponCode,
        customer: {
          email: customer.email.trim().toLowerCase(),
        },
      },
    );
  }

  async function checkAvailability() {
    if (!requireAuthentication()) return;
    setNotice(null);
    const validationError = validateAvailabilityRequest();
    if (validationError) {
      setNotice({ kind: "error", text: validationError });
      return;
    }

    setChecking(true);
    try {
      const payload = await requestAvailability(
        appliedCoupon?.code || "",
      );
      setAvailability(payload);
      setAppliedCoupon(payload.coupon || null);
      setNotice({
        kind: payload.delivery_available ? "success" : "error",
        text: `${payload.message} ${payload.payment_message || ""}`.trim(),
      });
    } catch (error) {
      setAvailability(null);
      setAppliedCoupon(null);
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to check delivery availability.",
      });
    } finally {
      setChecking(false);
    }
  }

  async function applyCoupon() {
    if (!requireAuthentication()) return;
    setNotice(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setNotice({ kind: "error", text: "Enter a coupon code." });
      return;
    }

    const validationError = validateAvailabilityRequest();
    if (validationError) {
      setNotice({ kind: "error", text: validationError });
      return;
    }

    setApplyingCoupon(true);
    try {
      const couponApiUrl =
        catalog?.coupon_api_url ||
        `${API_PREFIX}/coupon`;

      const payload = await postJson<AvailabilityPayload>(
        couponApiUrl,
        {
          selections: selectionsBody(),
          latitude: address.latitude,
          longitude: address.longitude,
          coupon_code: code,
          customer: {
            email: customer.email.trim().toLowerCase(),
          },
        },
      );
      setAvailability(payload);
      setAppliedCoupon(payload.coupon || null);
      setCouponInput(payload.coupon?.code || code);
      setNotice({
        kind: payload.coupon ? "success" : "info",
        text:
          payload.coupon_message ||
          (payload.coupon
            ? `Coupon ${payload.coupon.code} applied successfully.`
            : "Coupon removed."),
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to apply the coupon.",
      });
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function removeCoupon() {
    setApplyingCoupon(true);
    setNotice(null);
    try {
      const validationError = validateAvailabilityRequest();
      if (validationError) {
        setAppliedCoupon(null);
        setCouponInput("");
        setNotice({ kind: "info", text: "Coupon removed." });
        return;
      }
      const couponApiUrl =
        catalog?.coupon_api_url ||
        `${API_PREFIX}/coupon`;

      const payload = await postJson<AvailabilityPayload>(
        couponApiUrl,
        {
          selections: selectionsBody(),
          latitude: address.latitude,
          longitude: address.longitude,
          coupon_code: "",
          customer: {
            email: customer.email.trim().toLowerCase(),
          },
        },
      );
      setAvailability(payload);
      setAppliedCoupon(null);
      setCouponInput("");
      setNotice({ kind: "info", text: "Coupon removed." });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to remove the coupon.",
      });
    } finally {
      setApplyingCoupon(false);
    }
  }

  function validateOrder(): string | null {
    if (!selections.length) return "Add at least one product.";
    if (customer.full_name.trim().length < 2) return "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email.trim())) {
      return "Enter a valid email address.";
    }
    if (customer.phone.replace(/\D/g, "").length < 8) {
      return "Enter a valid phone number.";
    }
    if (address.recipient_name.trim().length < 2) {
      return "Enter the recipient name.";
    }
    if (address.phone.replace(/\D/g, "").length < 8) {
      return "Enter the delivery contact number.";
    }
    if (!address.address_line1.trim()) {
      return "Enter house, flat, building, or street.";
    }
    if (!address.city.trim()) return "Enter the city.";
    if (!address.state.trim()) return "Enter the state.";
    if (address.postal_code.trim().length < 4) {
      return "Enter a valid postal code.";
    }
    if (address.latitude === null || address.longitude === null) {
      return "Point to the delivery location on the map.";
    }
    if (!availability?.delivery_available) {
      return "Check delivery availability for the selected items and location.";
    }
    if (!availability.payment_available) {
      return availability.payment_message || "Online payment is unavailable.";
    }
    if (!acceptTerms) {
      return "Accept the delivery, allocation, and payment terms.";
    }
    return null;
  }

  async function ensureRazorpay(): Promise<void> {
    if (window.Razorpay) return;
    await loadExternalScript(
      "public-order-razorpay-js",
      "https://checkout.razorpay.com/v1/checkout.js",
    );
    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout could not be loaded.");
    }
  }

  async function reportPaymentFailure(payment: PendingPayment, reason: string) {
    try {
      await postJson<ApiErrorPayload>(
        `${API_PREFIX}/orders/${payment.order.id}/razorpay/failed`,
        { reason },
        payment.publicOrderToken,
      );
    } catch {
      // The user-facing failure is already shown; reporting is best effort.
    }
  }

  async function verifyPayment(
    payment: PendingPayment,
    response: RazorpaySuccessResponse,
  ) {
    setPlacing(true);
    setNotice({
      kind: "info",
      text: "Verifying the captured payment securely…",
    });
    try {
      const payload = await postJson<VerifyPaymentPayload>(
        `${API_PREFIX}/orders/${payment.order.id}/razorpay/verify`,
        {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        },
        payment.publicOrderToken,
      );
      setConfirmedOrder(payload.order);
      setPendingPayment(null);
      setNotice({
        kind: "success",
        text:
          payload.message ||
          "Payment verified and order confirmed successfully.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      });
    } finally {
      setPlacing(false);
    }
  }

  function openRazorpay(payment: PendingPayment) {
    if (!window.Razorpay) {
      setNotice({
        kind: "error",
        text: "Razorpay Checkout is unavailable. Check the browser connection.",
      });
      return;
    }
    const instance = new window.Razorpay({
      key: payment.razorpay.key_id,
      amount: payment.razorpay.amount,
      currency: payment.razorpay.currency,
      name: payment.razorpay.name,
      description: payment.razorpay.description,
      order_id: payment.razorpay.order_id,
      prefill: payment.razorpay.prefill,
      theme: { color: "#33371b" },
      retry: { enabled: true, max_count: 2 },
      modal: {
        ondismiss: () => {
          setPlacing(false);
          setNotice({
            kind: "info",
            text: "Payment window closed. Your unpaid order is ready to retry.",
          });
        },
      },
      handler: (response: RazorpaySuccessResponse) => {
        void verifyPayment(payment, response);
      },
    }) as {
      open: () => void;
      on?: (
        event: "payment.failed",
        callback: (response: RazorpayFailureResponse) => void,
      ) => void;
    };
    instance.on?.("payment.failed", (response: RazorpayFailureResponse) => {
      const reason =
        response.error?.description ||
        response.error?.reason ||
        "Razorpay payment attempt failed.";
      setPlacing(false);
      setNotice({ kind: "error", text: reason });
      void reportPaymentFailure(payment, reason);
    });
    instance.open();
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireAuthentication()) return;
    setNotice(null);
    const validationError = validateOrder();
    if (validationError) {
      setNotice({ kind: "error", text: validationError });
      return;
    }
    setPlacing(true);
    try {
      await ensureRazorpay();
      const payload = await postJson<CreateOrderPayload>(
        `${API_PREFIX}/orders`,
        {
          customer: {
            full_name: customer.full_name.trim(),
            email: customer.email.trim().toLowerCase(),
            phone: customer.phone.trim(),
          },
          address: {
            ...address,
            recipient_name:
              address.recipient_name.trim() || customer.full_name.trim(),
            phone: address.phone.trim() || customer.phone.trim(),
          },
          selections: selectionsBody(),
          coupon_code: appliedCoupon?.code || "",
          accept_terms: acceptTerms,
        },
      );
      const expectedAmount = Math.round(
        numberValue(payload.order.total) * 100,
      );
      if (numberValue(payload.razorpay.amount) !== expectedAmount) {
        throw new Error(
          "The Razorpay amount does not match the discounted order total. Refresh and try again.",
        );
      }

      const payment: PendingPayment = {
        order: payload.order,
        publicOrderToken: payload.public_order_token,
        razorpay: payload.razorpay,
      };
      setPendingPayment(payment);
      setNotice({
        kind: "info",
        text: "Order created. Complete payment in the secure Razorpay window.",
      });
      openRazorpay(payment);
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to create the order.",
      });
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="public-order-page">
        <style>{STYLES}</style>
        <div className="public-order-loading">
          Loading products…
        </div>
      </main>
    );
  }

  if (confirmedOrder) {
    return (
      <main className="public-order-page">
        <style>{STYLES}</style>
        <div className="public-order-shell">
          <section className="public-order-section public-order-success">
            <div className="public-order-success-icon" aria-hidden="true">
              ✓
            </div>
            <span className="public-order-eyebrow">Payment verified</span>
            <h2>Your order is confirmed</h2>
            <p>
              Thank you, {confirmedOrder.customer_name}. A confirmation message
              is being sent to {confirmedOrder.user_email}. Your delivery will
              use the address selected on this page.
            </p>
            <span className="public-order-success-number">
              {confirmedOrder.order_number}
            </span>
            <div
              className="public-order-summary"
              style={{ maxWidth: 470, margin: "22px auto 0" }}
            >
              <div className="public-order-summary-row">
                <span>Subtotal</span>
                <strong>
                  {money(currencySymbol, confirmedOrder.subtotal)}
                </strong>
              </div>
              {numberValue(confirmedOrder.discount) > 0 ? (
                <div className="public-order-summary-row">
                  <span>
                    Coupon discount
                    {confirmedOrder.coupon_code
                      ? ` (${confirmedOrder.coupon_code})`
                      : ""}
                  </span>
                  <strong>
                    -{money(currencySymbol, confirmedOrder.discount)}
                  </strong>
                </div>
              ) : null}
              <div className="public-order-summary-row">
                <span>Delivery</span>
                <strong>
                  {money(currencySymbol, confirmedOrder.delivery_fee)}
                </strong>
              </div>
              <div className="public-order-summary-row total">
                <span>Total paid</span>
                <strong>{money(currencySymbol, confirmedOrder.total)}</strong>
              </div>
            </div>
            <button
              type="button"
              className="public-order-action secondary"
              style={{ width: "auto", marginTop: 20, paddingInline: 24 }}
              onClick={() => window.location.reload()}
            >
              Place another order
            </button>
          </section>
        </div>
      </main>
    );
  }

  const {
    hasJuices,
    hasSubscriptions,
    juiceCount,
    subscriptionCount,
  } = catalogMetrics;

  return (
    <main className="public-order-page">
      <style>{STYLES}</style>

      <HeroNew />

      <div className="public-order-shell">
        <div className="public-order-homepage-sections">
          <Marquee />
        </div>

        <section className="public-order-section" id="catalogue">
          <div className="public-order-catalog-block" id="juices">
            <div className="public-order-catalog-block-head">
              <div>
                {/* <h3>Fresh juices</h3>
                <p>Choose a juice and click Buy now to continue below.</p> */}
              </div>
              <span className="public-order-catalog-count">
                {juiceCount} item(s)
              </span>
            </div>
            {hasJuices ? (
              <>
                {visibleJuiceCategories.map((category) => {
                  return (
                  <section
                    className="public-order-category"
                    key={category.id}
                  >
                  <div className="public-order-category-head">
                    <div>
                      <h3 className={isPublicOffersCategory(category) ? "public-order-offers-title-highlight" : undefined}>{category.name}</h3>
                      <p>{category.description}</p>
                    </div>
                    <small>{category.items.length} item(s)</small>
                  </div>
                  <div className="public-order-product-grid public-order-juice-grid">
                    {category.items.map((item) => (
                      <article
                        className={`public-order-product public-order-juice-card ${selectedItem("juice", item.id) ? "selected" : ""}`}
                        key={item.id}
                      >
                        <span
                          className="public-order-juice-favourite"
                          aria-hidden="true"
                        >
                          ♡
                        </span>
                        <div className="public-order-product-image public-order-juice-image">
                          <ProductImage src={item.image_url} alt={item.name} />
                          <span
                            className="public-order-juice-image-size"
                            aria-label={`Size: ${
                              [item.size, item.unit_label]
                                .filter(Boolean)
                                .join(" ") || "Fresh item"
                            }`}
                          >
                            {[item.size, item.unit_label]
                              .filter(Boolean)
                              .join(" ") || "Fresh item"}
                          </span>
                          {item.is_featured ? (
                            <span className="public-order-product-badge">
                              Featured
                            </span>
                          ) : null}
                        </div>

                        <div className="public-order-juice-mobile-under-image">
                          <div className="public-order-juice-mobile-weight">
                            {[item.size, item.unit_label]
                              .filter(Boolean)
                              .join("-") || "Fresh item"}
                          </div>
                        </div>

                        <div className="public-order-product-body public-order-juice-body">
                          <h4 className="public-order-juice-name">
                            {item.name}
                          </h4>
                          <div className="public-order-product-meta public-order-juice-size">
                            {[item.size, item.unit_label]
                              .filter(Boolean)
                              .join("-") || "Fresh item"}
                          </div>
                          <PublicJuiceProductDescription
                            value={item.description}
                            fallback="Freshly prepared for you."
                            title={item.name}
                            imageUrl={item.image_url}
                            meta={
                              [item.size, item.unit_label]
                                .filter(Boolean)
                                .join(" ") || "Fresh item"
                            }
                          />
                          <div className="public-order-price-row">
                            {item.compare_price &&
                            item.compare_price > item.price ? (
                              <span className="public-order-compare">
                                {money(currencySymbol, item.compare_price)}
                              </span>
                            ) : null}
                            <span className="public-order-price">
                              {money(currencySymbol, item.price)}
                            </span>
                          </div>

                          {item.compare_price != null && item.compare_price > item.price ? (
                            <span className="public-juice-discount">
                              {money(currencySymbol, item.compare_price - item.price)} OFF
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="public-order-juice-reference-view"
                            onClick={() => void viewJuiceItem(category, item)}
                          >
                            View More
                          </button>
                          <span className="public-juice-category-tag">{category.name}</span>
                          <div className="public-order-juice-actions">
                            <button
                              type="button"
                              className="public-order-juice-view"
                              onClick={() => void viewJuiceItem(category, item)}
                            >
                              View Item
                            </button>

                            {selectedItem("juice", item.id) ? (
                              <div
                                className="public-order-quantity-control public-order-juice-quantity"
                                aria-label={`${item.name} quantity`}
                              >
                                <button
                                  type="button"
                                  aria-label={`Decrease ${item.name} quantity`}
                                  onClick={() =>
                                    changeSelectionQuantity(
                                      "juice",
                                      item.id,
                                      -1,
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span
                                  className="public-order-quantity-value"
                                  aria-live="polite"
                                >
                                  {selectedItem("juice", item.id)?.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Increase ${item.name} quantity`}
                                  disabled={
                                    (selectedItem("juice", item.id)?.quantity ||
                                      0) >= 99
                                  }
                                  onClick={() =>
                                    changeSelectionQuantity(
                                      "juice",
                                      item.id,
                                      1,
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="public-order-action public-order-juice-action"
                                onClick={() => void chooseJuice(item)}
                                disabled={Boolean(addingCartItemId)}
                              >
                                {addingCartItemId === item.id ? "Adding…" : "Add to Cart"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          className={`public-order-juice-mobile-actions${
                            selectedItem("juice", item.id) ? " has-quantity" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="public-order-juice-view"
                            onClick={() => void viewJuiceItem(category, item)}
                          >
                            View Item
                          </button>

                          {selectedItem("juice", item.id) ? (
                            <div
                              className="public-order-quantity-control public-order-juice-quantity"
                              aria-label={`${item.name} quantity`}
                            >
                              <button
                                type="button"
                                aria-label={`Decrease ${item.name} quantity`}
                                onClick={() =>
                                  changeSelectionQuantity("juice", item.id, -1)
                                }
                              >
                                −
                              </button>
                              <span
                                className="public-order-quantity-value"
                                aria-live="polite"
                              >
                                {selectedItem("juice", item.id)?.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase ${item.name} quantity`}
                                disabled={
                                  (selectedItem("juice", item.id)?.quantity || 0) >=
                                  99
                                }
                                onClick={() =>
                                  changeSelectionQuantity("juice", item.id, 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="public-order-action public-order-juice-action"
                              onClick={() => void chooseJuice(item)}
                              disabled={Boolean(addingCartItemId)}
                            >
                              {addingCartItemId === item.id ? "Adding…" : "Add to Cart"}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  </section>
                  );
                })}

                {visibleJuiceCount < juiceCount ? (
                  <div className="public-order-load-more-row">
                    <button
                      type="button"
                      className="public-order-load-more"
                      onClick={() =>
                        setVisibleJuiceCount((current) =>
                          Math.min(
                            current + CATALOG_PAGE_SIZE,
                            juiceCount,
                          ),
                        )
                      }
                    >
                      Load More
                    </button>
                    <span className="public-order-load-more-status">
                      Showing {Math.min(visibleJuiceCount, juiceCount)} of{" "}
                      {juiceCount} items
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="public-order-empty">
                No active products are available right now.
              </div>
            )}
          </div>

          {false && (
          <div className="public-order-catalog-block" id="subscriptions">
            <div className="public-order-catalog-block-head">
              <div>
                <h3>Subscriptions</h3>
                <p>Choose a plan and click Subscribe to continue below.</p>
              </div>
              <span className="public-order-catalog-count">
                {subscriptionCount} plan(s)
              </span>
            </div>
            {hasSubscriptions ? (
              <>
                <div className="public-order-subscription-categories-layout">
                {visibleSubscriptionCategories.map((category, categoryIndex) => {
                  return (
                  <section
                    className={`public-order-category ${
                      category.items.length === 1
                        ? "public-order-subscription-category-single"
                        : "public-order-subscription-category-multi"
                    }`}
                    key={category.id}
                  >
                    <div className="public-order-category-head">
                      <div>
                        <h3 className={isPublicOffersCategory(category) ? "public-order-offers-title-highlight" : undefined}>{category.name}</h3>
                        <p>{category.description}</p>
                      </div>
                    </div>
                    <div className="public-order-product-grid public-order-subscription-grid">
                      {category.items.map((item, itemIndex) => {
                        const selectedSubscription = selectedItem(
                          "subscription",
                          item.id,
                        );

                        return (
                          <PublicSubscriptionReferenceCard
                            key={item.id}
                            item={item}
                            currencySymbol={currencySymbol}
                            selectedSubscription={selectedSubscription}
                            eager={categoryIndex === 0 && itemIndex < 3}
                            highPriority={categoryIndex === 0 && itemIndex === 0}
                            offerEmphasis={false}
                            onSubscribe={() => void chooseSubscription(item)}
                            onViewSubscription={() => void navigateToProtectedCatalogue("/subscriptions")}
                            onChangeQuantity={(delta) =>
                              changeSelectionQuantity(
                                "subscription",
                                item.id,
                                delta,
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  </section>
                  );
                })}
                </div>

                {visibleSubscriptionCount < subscriptionCount ? (
                  <div className="public-order-load-more-row">
                    <button
                      type="button"
                      className="public-order-load-more"
                      onClick={() =>
                        setVisibleSubscriptionCount((current) =>
                          Math.min(
                            current + CATALOG_PAGE_SIZE,
                            subscriptionCount,
                          ),
                        )
                      }
                    >
                      Load More
                    </button>
                    <span className="public-order-load-more-status">
                      Showing{" "}
                      {Math.min(
                        visibleSubscriptionCount,
                        subscriptionCount,
                      )}{" "}
                      of {subscriptionCount} plans
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="public-order-empty">
                No active subscriptions are available right now.
              </div>
            )}
          </div>
          )}
        </section>

        {selections.length ? (
          <section
            className="public-order-section"
            id="delivery-checkout"
            ref={checkoutRef}
          >
            <div className="public-order-section-head">
              <div>
                <h2>Customer, delivery address and payment</h2>
                <p>
                  Enter your customer and address details together, point to the
                  exact location, check nearby delivery, and pay securely.
                </p>
              </div>
              <span className="public-order-number">02</span>
            </div>

            <form onSubmit={placeOrder}>
              <div className="public-order-checkout-grid">
                <aside className="public-order-panel">
                  <h3>Selected items ({selectedUnitCount})</h3>
                  <div className="public-order-selected-list">
                    {selections.map((selected) => {
                      const subscription = selected.subscription;
                      const unitPrice =
                        selected.kind === "subscription" && subscription
                          ? planPrice(
                              subscription,
                              selected.plan_code,
                              selected.custom_days,
                            )
                          : selected.price;
                      const fieldId = `${selected.kind}-${selected.item_id}`;
                      const complimentaryChoices =
                        subscription?.complimentary_choices || [];
                      const complimentaryMaximum =
                        Number(
                          subscription?.complimentary_config?.max_items || 0,
                        ) > 0
                          ? Number(
                              subscription?.complimentary_config?.max_items,
                            )
                          : complimentaryChoices.length;
                      const complimentaryBudget = numberValue(
                        subscription?.complimentary_config?.budget,
                        0,
                      );
                      const selectedComplimentaryValue = (
                        selected.complimentary_item_ids || []
                      ).reduce((total, id) => {
                        const choice = complimentaryChoices.find(
                          (row) => row.id === id,
                        );
                        return total + numberValue(choice?.catalog_price, 0);
                      }, 0);
                      return (
                        <div
                          className="public-order-selected-card"
                          key={fieldId}
                        >
                          <div className="public-order-selected">
                            {selected.image_url ? (
                              <img
                                src={assetUrl(selected.image_url)}
                                alt={selected.name}
                              />
                            ) : (
                              <span className="public-order-selected-placeholder">
                                {selected.kind === "subscription" ? "📦" : "🥤"}
                              </span>
                            )}
                            <div>
                              <strong>{selected.name}</strong>
                              <small>
                                {selected.kind === "subscription"
                                  ? "Subscription plan"
                                  : selected.unit_label || "Product"}
                              </small>
                              <small>
                                {money(currencySymbol, unitPrice)} each ·{" "}
                                {money(
                                  currencySymbol,
                                  unitPrice * selected.quantity,
                                )}
                              </small>
                            </div>
                          </div>

                          <div className="public-order-selected-actions">
                            <div
                              className="public-order-quantity-control"
                              aria-label={`${selected.name} quantity`}
                            >
                              <button
                                type="button"
                                aria-label={`Decrease ${selected.name} quantity`}
                                onClick={() =>
                                  changeSelectionQuantity(
                                    selected.kind,
                                    selected.item_id,
                                    -1,
                                  )
                                }
                              >
                                −
                              </button>
                              <span className="public-order-quantity-value">
                                {selected.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase ${selected.name} quantity`}
                                disabled={
                                  selected.quantity >=
                                  (selected.kind === "subscription" ? 25 : 99)
                                }
                                onClick={() =>
                                  changeSelectionQuantity(
                                    selected.kind,
                                    selected.item_id,
                                    1,
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="public-order-remove"
                              onClick={() =>
                                changeSelectionQuantity(
                                  selected.kind,
                                  selected.item_id,
                                  -selected.quantity,
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>

                          {selected.kind === "subscription" && subscription ? (
                            <div className="public-order-subscription-options">
                              <div className="public-order-field">
                                <label htmlFor={`${fieldId}-plan`}>
                                  Subscription plan
                                </label>
                                <select
                                  id={`${fieldId}-plan`}
                                  value={selected.plan_code}
                                  onChange={(event) =>
                                    updateSelectedItem(
                                      selected.kind,
                                      selected.item_id,
                                      (current) => ({
                                        ...current,
                                        plan_code: event.target.value,
                                      }),
                                    )
                                  }
                                >
                                  {subscriptionAllowedPlanCodes(subscription).map(
                                    (planCode) => (
                                      <option key={planCode} value={planCode}>
                                        {title(planCode)} —{" "}
                                        {money(
                                          currencySymbol,
                                          planPrice(
                                            subscription,
                                            planCode,
                                            selected.custom_days,
                                          ),
                                        )}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>

                              {selected.plan_code === "custom" ? (
                                <div className="public-order-field">
                                  <label htmlFor={`${fieldId}-custom-days`}>
                                    Number of delivery days
                                  </label>
                                  <input
                                    id={`${fieldId}-custom-days`}
                                    type="number"
                                    min={subscription.minimum_custom_days || 1}
                                    max={365}
                                    value={selected.custom_days}
                                    onChange={(event) =>
                                      updateSelectedItem(
                                        selected.kind,
                                        selected.item_id,
                                        (current) => ({
                                          ...current,
                                          custom_days: Math.max(
                                            subscription.minimum_custom_days ||
                                              1,
                                            Math.min(
                                              365,
                                              Number(event.target.value) || 1,
                                            ),
                                          ),
                                        }),
                                      )
                                    }
                                  />
                                </div>
                              ) : null}

                              <div className="public-order-field">
                                <label>Starting date</label>
                                <div
                                  className="public-order-readonly-value"
                                  aria-label={`Starting date ${displayDate(
                                    selected.start_date,
                                  )}`}
                                >
                                  {displayDate(selected.start_date)}
                                </div>
                              </div>

                              {subscription.catalog_combinations.length > 0 ? (
                                <div className="public-order-field">
                                  <label htmlFor={`${fieldId}-combination`}>
                                    Product options
                                  </label>
                                  <select
                                    id={`${fieldId}-combination`}
                                    value={selected.combination_id}
                                    onChange={(event) =>
                                      updateSelectedItem(
                                        selected.kind,
                                        selected.item_id,
                                        (current) => ({
                                          ...current,
                                          combination_id: event.target.value,
                                        }),
                                      )
                                    }
                                  >
                                    <option value="">Select combination</option>
                                    {subscription.catalog_combinations.map(
                                      (combination) => (
                                        <option
                                          key={combination.id}
                                          value={combination.id}
                                        >
                                          {combination.name}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                              ) : null}

                              {complimentaryChoices.length > 0 ? (
                                <div className="public-order-complimentary-selector">
                                  <strong>
                                    Select complimentary items
                                    {complimentaryMaximum > 0
                                      ? ` (${selected.complimentary_item_ids.length}/${complimentaryMaximum})`
                                      : ""}
                                    {complimentaryBudget > 0
                                      ? ` · ${money(
                                          currencySymbol,
                                          selectedComplimentaryValue,
                                        )} of ${money(
                                          currencySymbol,
                                          complimentaryBudget,
                                        )}`
                                      : ""}
                                  </strong>
                                  {complimentaryChoices.map((choice) => {
                                    const checked =
                                      selected.complimentary_item_ids.includes(
                                        choice.id,
                                      );
                                    const limitReached =
                                      !checked &&
                                      complimentaryMaximum > 0 &&
                                      selected.complimentary_item_ids.length >=
                                        complimentaryMaximum;
                                    const exceedsBudget =
                                      !checked &&
                                      complimentaryBudget > 0 &&
                                      selectedComplimentaryValue +
                                        numberValue(choice.catalog_price, 0) >
                                        complimentaryBudget;
                                    const disabled =
                                      limitReached || exceedsBudget;
                                    return (
                                      <label
                                        className={`public-order-complimentary-option ${
                                          disabled ? "disabled" : ""
                                        }`}
                                        key={choice.id}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={disabled}
                                          onChange={() =>
                                            toggleComplimentaryItem(
                                              selected.item_id,
                                              choice.id,
                                            )
                                          }
                                        />
                                        <span>
                                          {choice.name}
                                          {choice.size
                                            ? ` · ${choice.size}`
                                            : choice.unit_label
                                              ? ` · ${choice.unit_label}`
                                              : ""}
                                        </span>
                                        <small>
                                          {numberValue(
                                            choice.catalog_price,
                                            0,
                                          ) > 0
                                            ? money(
                                                currencySymbol,
                                                choice.catalog_price,
                                              )
                                            : "Complimentary"}
                                        </small>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="public-order-selection-total">
                    <span>Estimated subtotal</span>
                    <span>{money(currencySymbol, estimatedSubtotal)}</span>
                  </div>

                  <button
                    type="button"
                    className="public-order-action secondary"
                    style={{ marginTop: 14 }}
                    onClick={() =>
                      document
                        .getElementById("catalogue")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Add more items
                  </button>
                </aside>

                <div className="public-order-panel">
                  <div className="public-order-location-search">
                    <label htmlFor="public-delivery-location-search">
                      Search delivery location
                    </label>
                    <div className="public-order-location-search-row">
                      <input
                        id="public-delivery-location-search"
                        value={locationQuery}
                        onChange={(event) => {
                          skipNextLocationSearch.current = false;
                          setLocationQuery(event.target.value);
                        }}
                        placeholder="Start typing an area, street, landmark, or place"
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={locationSuggestions.length > 0}
                      />
                      <button
                        type="button"
                        className="public-order-location-button"
                        onClick={useCurrentLocation}
                        disabled={locating || resolvingLocation}
                      >
                        {locating ? "Locating…" : "Use current location"}
                      </button>
                    </div>
                    {loadingLocationSuggestions ? (
                      <p className="public-order-location-status">
                        Finding matching places…
                      </p>
                    ) : null}
                    {locationSuggestions.length > 0 ? (
                      <div
                        className="public-order-location-suggestions"
                        role="listbox"
                        aria-label="Suggested delivery locations"
                      >
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            type="button"
                            className="public-order-location-suggestion"
                            key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                            onClick={() => selectLocationSuggestion(suggestion)}
                            role="option"
                            aria-selected="false"
                          >
                            <strong>
                              {suggestion.name || suggestion.display_name}
                            </strong>
                            {suggestion.display_name &&
                            suggestion.display_name !== suggestion.name ? (
                              <span>{suggestion.display_name}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="public-order-map-toolbar">
                    <p>
                      Tap or click the map to move the delivery pin. The address
                      fields below will update automatically.
                    </p>
                  </div>
                  <LocationMap
                    latitude={address.latitude}
                    longitude={address.longitude}
                    onChange={(latitude, longitude) => {
                      void resolveCoordinates(latitude, longitude, "map_pin");
                    }}
                    onError={handleMapError}
                  />
                  {resolvingLocation ? (
                    <p className="public-order-location-status" style={{ marginTop: 9 }}>
                      Fetching address for the selected point…
                    </p>
                  ) : null}
                  <div className="public-order-coordinates">
                    <span className="public-order-coordinate">
                      Latitude:{" "}
                      {address.latitude === null
                        ? "Not selected"
                        : address.latitude.toFixed(6)}
                    </span>
                    <span className="public-order-coordinate">
                      Longitude:{" "}
                      {address.longitude === null
                        ? "Not selected"
                        : address.longitude.toFixed(6)}
                    </span>
                    <span className="public-order-coordinate">
                      Radius: {catalog?.nearby_radius_km || 0} km
                    </span>
                  </div>

                  <div className="public-order-form-heading">
                    <h3>Customer and registration details</h3>
                    <p>
                      Keep using this same form even if you are already
                      registered. After successful payment, your email matches
                      the paid order to the existing account or creates a new
                      customer account. No registration OTP is required.
                    </p>
                  </div>
                  <div className="public-order-embedded-customer">
                    <div className="public-order-field">
                      <label htmlFor="public-full-name">Full name</label>
                      <input
                        id="public-full-name"
                        value={customer.full_name}
                        onChange={(event) =>
                          setCustomerField("full_name", event.target.value)
                        }
                        autoComplete="name"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="public-email">Email address</label>
                      <input
                        id="public-email"
                        type="email"
                        value={customer.email}
                        onChange={(event) =>
                          setCustomerField("email", event.target.value)
                        }
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                      <span className="public-order-helper">
                        Used to find your account and send confirmation.
                      </span>
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="public-phone">Phone number</label>
                      <input
                        id="public-phone"
                        type="tel"
                        value={customer.phone}
                        onChange={(event) =>
                          setCustomerField("phone", event.target.value)
                        }
                        autoComplete="tel"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="public-order-form-heading">
                    <h3>Delivery address</h3>
                    <p>
                      Enter the recipient and complete address for this order.
                    </p>
                  </div>

                  <div className="public-order-address-grid">
                    <div className="public-order-field">
                      <label htmlFor="delivery-recipient">Recipient name</label>
                      <input
                        id="delivery-recipient"
                        value={address.recipient_name}
                        onChange={(event) =>
                          setAddressField("recipient_name", event.target.value)
                        }
                        autoComplete="name"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-phone">Delivery phone</label>
                      <input
                        id="delivery-phone"
                        type="tel"
                        value={address.phone}
                        onChange={(event) =>
                          setAddressField("phone", event.target.value)
                        }
                        autoComplete="tel"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-alt-phone">
                        Alternate phone
                      </label>
                      <input
                        id="delivery-alt-phone"
                        type="tel"
                        value={address.alternate_phone}
                        onChange={(event) =>
                          setAddressField("alternate_phone", event.target.value)
                        }
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-type">Address type</label>
                      <select
                        id="delivery-type"
                        value={address.address_type}
                        onChange={(event) =>
                          setAddressField(
                            "address_type",
                            event.target.value as AddressForm["address_type"],
                          )
                        }
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div
                      className="public-order-field"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <label htmlFor="delivery-line1">
                        House / flat / building / street
                      </label>
                      <input
                        id="delivery-line1"
                        value={address.address_line1}
                        onChange={(event) =>
                          setAddressField("address_line1", event.target.value)
                        }
                        autoComplete="address-line1"
                      />
                    </div>
                    <div
                      className="public-order-field"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <label htmlFor="delivery-line2">
                        Area / colony / address line 2
                      </label>
                      <input
                        id="delivery-line2"
                        value={address.address_line2}
                        onChange={(event) =>
                          setAddressField("address_line2", event.target.value)
                        }
                        autoComplete="address-line2"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-landmark">Landmark</label>
                      <input
                        id="delivery-landmark"
                        value={address.landmark}
                        onChange={(event) =>
                          setAddressField("landmark", event.target.value)
                        }
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-city">City</label>
                      <input
                        id="delivery-city"
                        value={address.city}
                        onChange={(event) =>
                          setAddressField("city", event.target.value)
                        }
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-state">State</label>
                      <input
                        id="delivery-state"
                        value={address.state}
                        onChange={(event) =>
                          setAddressField("state", event.target.value)
                        }
                        autoComplete="address-level1"
                      />
                    </div>
                    <div className="public-order-field">
                      <label htmlFor="delivery-postal">Postal code</label>
                      <input
                        id="delivery-postal"
                        value={address.postal_code}
                        onChange={(event) =>
                          setAddressField("postal_code", event.target.value)
                        }
                        autoComplete="postal-code"
                      />
                    </div>
                    <div
                      className="public-order-field"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <label htmlFor="delivery-country">Country</label>
                      <input
                        id="delivery-country"
                        value={address.country}
                        onChange={(event) =>
                          setAddressField("country", event.target.value)
                        }
                        autoComplete="country-name"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="public-order-action secondary"
                    style={{ marginTop: 15 }}
                    onClick={() => void checkAvailability()}
                    disabled={checking}
                  >
                    {checking
                      ? "Checking nearby delivery…"
                      : "Check delivery availability"}
                  </button>

                  {availability ? (
                    <div
                      className={`public-order-availability ${
                        availability.delivery_available
                          ? "available"
                          : "unavailable"
                      }`}
                    >
                      <strong>
                        {availability.delivery_available
                          ? "Delivery available"
                          : "Delivery unavailable"}
                      </strong>
                      <p>{availability.message}</p>
                      {availability.availability.nearest_distance_km !==
                      null ? (
                        <p>
                          Nearest assigned seller:{" "}
                          {availability.availability.nearest_distance_km} km
                        </p>
                      ) : null}
                      <p>{availability.payment_message}</p>
                    </div>
                  ) : null}

                  <div className="public-order-coupon">
                      <div className="public-order-coupon-head">
                        <strong>Coupon Code</strong>
                        <small>
                          {catalog?.active_coupon_count
                            ? `${catalog.active_coupon_count} active coupon${
                                catalog.active_coupon_count === 1 ? "" : "s"
                              }`
                            : "Apply before payment"}
                        </small>
                      </div>

                      <div className="public-order-coupon-form">
                        <input
                          type="text"
                          value={couponInput}
                          placeholder="Enter coupon code"
                          maxLength={40}
                          disabled={applyingCoupon || Boolean(pendingPayment)}
                          onChange={(event) =>
                            setCouponInput(event.target.value.toUpperCase())
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void applyCoupon();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="public-order-coupon-button"
                          disabled={
                            applyingCoupon ||
                            Boolean(pendingPayment) ||
                            !couponInput.trim()
                          }
                          onClick={() => void applyCoupon()}
                        >
                          {applyingCoupon ? "Applying…" : "Apply"}
                        </button>
                      </div>

                      {appliedCoupon ? (
                        <div className="public-order-coupon-applied">
                          <div>
                            <strong>{appliedCoupon.code} applied</strong>
                            <small>
                              {appliedCoupon.description ||
                                `${appliedCoupon.discount_value}${
                                  appliedCoupon.discount_type === "percentage"
                                    ? "%"
                                    : ` ${currencySymbol}`
                                } discount`}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="public-order-coupon-button secondary"
                            disabled={
                              applyingCoupon || Boolean(pendingPayment)
                            }
                            onClick={() => void removeCoupon()}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                      {!availability ? (
                        <p className="public-order-coupon-help">
                          Select products and a delivery point, then apply the
                          coupon. Applying it will also check delivery
                          availability and calculate the final Razorpay amount.
                        </p>
                      ) : null}
                    </div>

                  {availability?.delivery_available ? (
                    <div className="public-order-summary">
                      <div className="public-order-summary-row">
                        <span>Item subtotal</span>
                        <strong>
                          {money(currencySymbol, availability.totals.subtotal)}
                        </strong>
                      </div>
                      {numberValue(availability.totals.discount) > 0 ? (
                        <div className="public-order-summary-row">
                          <span>
                            Coupon discount
                            {appliedCoupon?.code
                              ? ` (${appliedCoupon.code})`
                              : ""}
                          </span>
                          <strong>
                            -{money(
                              currencySymbol,
                              availability.totals.discount,
                            )}
                          </strong>
                        </div>
                      ) : null}
                      <div className="public-order-summary-row">
                        <span>Delivery fee</span>
                        <strong>
                          {money(
                            currencySymbol,
                            availability.totals.delivery_fee,
                          )}
                        </strong>
                      </div>
                      <div className="public-order-summary-row total">
                        <span>Total</span>
                        <strong>
                          {money(currencySymbol, availability.totals.total)}
                        </strong>
                      </div>
                    </div>
                  ) : null}

                  <label className="public-order-terms">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(event) => setAcceptTerms(event.target.checked)}
                    />
                    <span>
                      I accept the nearby seller allocation, delivery
                      availability, address, and Razorpay payment terms. Stock
                      is rechecked when the order is created.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="public-order-action public-order-pay"
                    disabled={
                      placing ||
                      applyingCoupon ||
                      Boolean(pendingPayment) ||
                      !availability?.delivery_available ||
                      !availability.payment_available
                    }
                  >
                    {pendingPayment
                      ? "Payment order ready — use Retry payment below"
                      : placing
                        ? "Preparing secure payment…"
                        : availability?.delivery_available
                          ? `Pay ${money(
                              currencySymbol,
                              availability.totals.total,
                            )} with Razorpay`
                          : "Check delivery before payment"}
                  </button>

                  {pendingPayment ? (
                    <button
                      type="button"
                      className="public-order-action secondary"
                      style={{ marginTop: 10 }}
                      onClick={() => openRazorpay(pendingPayment)}
                      disabled={placing}
                    >
                      Retry payment for {pendingPayment.order.order_number}
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            {notice ? (
              <div
                className={`public-order-notice ${notice.kind}`}
                role={notice.kind === "error" ? "alert" : "status"}
              >
                {notice.text}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="public-order-homepage-sections">
          <WhyChoose />
          {/* <DeliveryLocations /> */}
          {/* <DeliveryTimings /> */}
          <HowItWorks />
          <DeliveryLocationsNew />
          <DeliveryTimingsNew />
          <StartJourney />
          <FAQ />
        </div>
      </div>
        {activeJuiceDetails && typeof document !== "undefined"
          ? createPortal(
              <div
                className="public-order-juice-description-modal-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setActiveJuiceDetails(null);
                }}
              >
                <section
                  className="public-order-juice-description-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${activeJuiceDetails.item.name} product details`}
                >
                  <header className="public-order-juice-description-modal-header">
                    <div className="public-order-juice-description-modal-title">
                      <small>{activeJuiceDetails.category.name}</small>
                      <h3>{activeJuiceDetails.item.name}</h3>
                    </div>
                    <button className="public-order-juice-description-modal-close" type="button" aria-label="Close product details" onClick={() => setActiveJuiceDetails(null)}>×</button>
                  </header>
                  <div className="public-order-juice-description-modal-layout">
                    <div className="public-order-juice-description-modal-media">
                      <ProductImage src={activeJuiceDetails.item.image_url} alt={activeJuiceDetails.item.name} />
                      <span className="public-order-juice-description-modal-size">
                        {[activeJuiceDetails.item.size, activeJuiceDetails.item.unit_label].filter(Boolean).join(" ")}
                      </span>
                    </div>
                    <div className="public-order-juice-description-modal-content">
                      <div className="public-details-price-line">
                        <strong>{money(currencySymbol, activeJuiceDetails.item.price)}</strong>
                        {activeJuiceDetails.item.compare_price != null && activeJuiceDetails.item.compare_price > activeJuiceDetails.item.price ? (
                          <><del>{money(currencySymbol, activeJuiceDetails.item.compare_price)}</del><span>{money(currencySymbol, activeJuiceDetails.item.compare_price - activeJuiceDetails.item.price)} OFF</span></>
                        ) : null}
                      </div>
                      <PublicJuiceBlockRichText value={activeJuiceDetails.item.description} fallback="Freshly prepared for you." />
                      <button type="button" className="public-details-add" disabled={Boolean(addingCartItemId)} onClick={() => { if (activeJuiceDetails) void chooseJuice(activeJuiceDetails.item); }}>
                        {addingCartItemId === activeJuiceDetails.item.id ? "Adding…" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>,
              document.body,
            )
          : null}
    </main>
  );
}

export default PublicOrderPage;
