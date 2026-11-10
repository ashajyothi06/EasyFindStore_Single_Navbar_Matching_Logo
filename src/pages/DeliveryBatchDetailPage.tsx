import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  isCsrfError,
  loadAdminDeliveryBatch,
  loadDeliveryBatch,
  loadManagerDeliveryBatch,
  updateDeliveryBatchPayout,
  updateDeliveryBatchStatus,
  type BatchDetailResponse,
  type DispatchPageRole,
} from "../services/deliveryDispatchApi";
import {
  confirmBatchCodCash,
  loadBatchCod,
  markCodRemitted,
  settlementErrorMessage,
  type BatchCodResponse,
  type CodCollectionRecord,
} from "../services/settlementEarningsApi";
import {
  RoleSupportTicketCard,
  type SupportOrderOption,
} from "../components/RoleSupportTicketCard";
import "../styles/delivery-dispatch.css";

interface DeliveryBatchDetailPageProps {
  mode: DispatchPageRole;
}

interface FulfillmentSummary {
  product_types?: string[];
  delivery_time_slots?: string[];
  selected_delivery_time_slots?: string[];
  delivery_types?: string[];
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
}

interface DeliveryWindow {
  slot?: string;
  slot_key?: string;
  label?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  time_label?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;
}

interface FulfillmentRecord {
  product_type?: string;
  delivery_time_slot?: string;
  selected_delivery_time_slot?: string;
  selected_delivery_time_slots?: string[];
  customer_selected_delivery_time_slots?: string[];
  delivery_type?: string;
  promised_delivery_date?: string;
  promised_delivery_time_label?: string;
  promised_delivery_label?: string;
  selected_delivery_time_label?: string;
  promised_delivery_start_at?: string;
  promised_delivery_end_at?: string;
  promised_delivery_windows?: DeliveryWindow[];
  delivery_schedule_timezone?: string;
  delivery_status?: string;
  fulfillment_summary?: FulfillmentSummary;
  items?: Array<Record<string, any>>;
}

type DeliveryBatch = NonNullable<BatchDetailResponse["batch"]> &
  FulfillmentRecord;

interface OptimizedRoutePoint {
  route_type?: "pickup" | "drop";
  sequence?: number;
  distance_from_previous_km?: number;
  is_next_stop?: boolean;
  next_action?: string;
  business_name?: string;
  seller_name?: string;
  customer_name?: string;
  maps_url?: string;
  [key: string]: unknown;
}

interface OptimizedDeliveryRoute {
  start?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    source?: string;
    accuracy_meters?: number;
    maps_url?: string;
  };
  route_points?: OptimizedRoutePoint[];
  route_strategy?: string;
  algorithm_label?: string;
  exact_optimization?: boolean;
  baseline_route_km?: number;
  estimated_route_km?: number;
  distance_saved_km?: number;
  distance_saved_percent?: number;
  estimated_travel_minutes?: number;
  estimated_total_minutes?: number;
  navigation_url?: string;
  optimized_at?: string;
  optimization?: {
    precedence_constraints_enforced?: boolean;
    start_source?: string;
  };
}

interface OptimizeRouteResponse {
  success: boolean;
  message?: string;
  batch: DeliveryBatch;
  route?: OptimizedDeliveryRoute;
  csrf_token?: string;
  code?: string;
}

class RouteOptimizationError extends Error {
  status: number;
  code: string;

  constructor(
    message: string,
    status: number,
    code = "route_optimization_failed",
  ) {
    super(message);
    this.name = "RouteOptimizationError";
    this.status = status;
    this.code = code;
  }
}

const ADVANCED_ROUTE_STYLES = `
  .dispatch-route-heading-actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
  }

  .dispatch-route-heading-actions h2 {
    margin-bottom: 5px;
  }

  .dispatch-route-heading-actions p {
    margin: 0;
    color: #68786e;
    font-size: 0.82rem;
  }

  .dispatch-route-action-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 9px;
  }

  .dispatch-route-insights {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .dispatch-route-insight {
    padding: 13px;
    border: 1px solid #dce9df;
    border-radius: 13px;
    background: #f7fbf8;
  }

  .dispatch-route-insight span {
    display: block;
    margin-bottom: 5px;
    color: #738078;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .dispatch-route-insight strong {
    color: #173020;
    font-size: 0.9rem;
  }

  .dispatch-route-algorithm {
    display: inline-flex;
    width: fit-content;
    margin-top: 8px;
    padding: 5px 9px;
    border-radius: 999px;
    background: #e9f8ee;
    color: #137342;
    font-size: 0.7rem;
    font-weight: 800;
  }

  .dispatch-route-list article.next-stop {
    border-color: #16a05d;
    background: #f0fdf4;
    box-shadow: 0 9px 24px rgba(22, 160, 93, 0.12);
  }

  .dispatch-next-stop-badge,
  .dispatch-manifest-sequence {
    display: inline-flex;
    width: fit-content;
    margin-top: 6px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #173020;
    color: #ffffff;
    font-size: 0.66rem;
    font-weight: 850;
  }

  .dispatch-current-location-note {
    margin-top: 5px;
    color: #68786e;
    font-size: 0.72rem;
  }

  .dispatch-batch-fulfillment {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
    gap: 10px;
    margin: 0 0 18px;
    padding: 16px;
    border: 1px solid #dce9df;
    border-radius: 16px;
    background: #ffffff;
  }

  .dispatch-batch-fulfillment > div {
    padding: 12px;
    border-radius: 11px;
    background: #f1f7f3;
  }

  .dispatch-batch-fulfillment span {
    display: block;
    color: #68766d;
    font-size: 0.68rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .dispatch-batch-fulfillment strong {
    display: block;
    margin-top: 4px;
    color: #153e27;
  }

  .dispatch-manifest-fulfillment {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 9px 0;
  }

  .dispatch-manifest-fulfillment span {
    padding: 4px 7px;
    border-radius: 999px;
    background: #edf6f0;
    color: #285b3e;
    font-size: 0.64rem;
    font-weight: 800;
  }

  .dispatch-manifest-fulfillment .selected-time {
    border: 1px solid #a8d5b5;
    background: #dff3e5;
    color: #165f35;
  }

  .dispatch-manifest-fulfillment .delivery-estimate {
    border: 1px solid #ead38c;
    background: #fff7df;
    color: #735800;
  }

  .dispatch-manifest-item {
    display: grid;
    gap: 5px;
    margin-bottom: 8px;
  }

  .dispatch-manifest-item small {
    color: #607168;
    font-weight: 700;
  }

  .dispatch-cod-panel {
    margin: 0 0 18px;
    padding: 18px;
    border: 1px solid #e5d7aa;
    border-radius: 16px;
    background: #fffdf6;
  }

  .dispatch-cod-panel-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .dispatch-cod-panel-heading h2 {
    margin: 0 0 5px;
    color: #4b3a0e;
  }

  .dispatch-cod-panel-heading p {
    margin: 0;
    color: #74663e;
    font-size: .8rem;
  }

  .dispatch-cod-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 14px;
  }

  .dispatch-cod-summary article {
    padding: 11px;
    border: 1px solid #eee3c0;
    border-radius: 11px;
    background: #fff;
  }

  .dispatch-cod-summary span {
    display: block;
    color: #7a6d48;
    font-size: .64rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .dispatch-cod-summary strong {
    display: block;
    margin-top: 4px;
    color: #4b3a0e;
  }

  .dispatch-cod-list {
    display: grid;
    gap: 10px;
  }

  .dispatch-cod-record {
    display: grid;
    grid-template-columns: minmax(180px, 1.3fr) minmax(110px, .6fr) minmax(220px, 1fr);
    gap: 12px;
    align-items: center;
    padding: 13px;
    border: 1px solid #eadfbf;
    border-radius: 12px;
    background: #fff;
  }

  .dispatch-cod-record small {
    display: block;
    margin-top: 3px;
    color: #756b50;
  }

  .dispatch-cod-status {
    display: inline-flex;
    width: fit-content;
    margin-top: 5px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f3efe3;
    color: #65562d;
    font-size: .67rem;
    font-weight: 850;
  }

  .dispatch-cod-status.qr-paid,
  .dispatch-cod-status.remitted {
    background: #e4f7e9;
    color: #176438;
  }

  .dispatch-cod-status.cash-collected {
    background: #fff0d4;
    color: #8a5a00;
  }

  .dispatch-cod-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    justify-content: flex-end;
  }

  .dispatch-cod-qr {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 7px;
  }

  .dispatch-cod-qr img {
    width: 105px;
    height: 105px;
    object-fit: contain;
    border: 1px solid #e0e0e0;
    border-radius: 9px;
    background: #fff;
  }

  .dispatch-cod-note {
    margin: 0 0 12px;
    padding: 9px 11px;
    border-radius: 9px;
    background: #fff7df;
    color: #735800;
    font-size: .76rem;
    font-weight: 750;
  }

  .dispatch-workflow {
    display: grid;
    gap: 14px;
  }

  .dispatch-workflow-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .dispatch-workflow-header h2 {
    margin: 0;
  }

  .dispatch-workflow-header p {
    margin: 5px 0 0;
    color: #68786e;
    font-size: .78rem;
    line-height: 1.45;
  }

  .dispatch-workflow-steps {
    display: grid;
    gap: 7px;
  }

  .dispatch-workflow-step {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    padding: 8px 9px;
    border: 1px solid #e3e9e5;
    border-radius: 11px;
    background: #fafcfb;
  }

  .dispatch-workflow-step .step-dot {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #edf1ef;
    color: #67756d;
    font-size: .74rem;
    font-weight: 900;
  }

  .dispatch-workflow-step strong {
    display: block;
    color: #173020;
    font-size: .78rem;
  }

  .dispatch-workflow-step small {
    display: block;
    margin-top: 2px;
    color: #748078;
    font-size: .66rem;
    line-height: 1.3;
  }

  .dispatch-workflow-step.done {
    border-color: #bee3ca;
    background: #f1fbf4;
  }

  .dispatch-workflow-step.done .step-dot {
    background: #dff4e5;
    color: #167244;
  }

  .dispatch-workflow-step.current {
    border-color: #6f5be8;
    background: #f5f2ff;
    box-shadow: 0 7px 18px rgba(95, 70, 220, .10);
  }

  .dispatch-workflow-step.current .step-dot {
    background: #5f46dc;
    color: #fff;
  }

  .dispatch-workflow-action {
    display: grid;
    gap: 8px;
  }

  .dispatch-workflow-action .dispatch-button {
    min-height: 46px;
  }

  .dispatch-workflow-hint {
    margin: 0;
    color: #68786e;
    font-size: .72rem;
    line-height: 1.45;
  }

  .dispatch-workflow-cod {
    display: grid;
    gap: 10px;
    padding: 13px;
    border: 1px solid #ead38c;
    border-radius: 12px;
    background: #fff9e8;
  }

  .dispatch-workflow-cod h3 {
    margin: 0;
    color: #5f4700;
    font-size: .92rem;
  }

  .dispatch-workflow-cod p {
    margin: 0;
    color: #705d28;
    font-size: .74rem;
    line-height: 1.45;
  }

  .dispatch-workflow-cod-amount {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 10px;
    border-radius: 9px;
    background: #fff;
    color: #5f4700;
  }

  .dispatch-workflow-cod-amount strong {
    font-size: 1rem;
  }

  .dispatch-workflow-terms {
    display: grid !important;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: flex-start;
    gap: 9px;
    padding: 10px;
    border: 1px solid #e8dbb5;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
  }

  .dispatch-workflow-terms input {
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }

  .dispatch-workflow-terms span {
    color: #514726;
    font-size: .72rem;
    font-weight: 700;
    line-height: 1.45;
  }

  .dispatch-workflow-complete {
    padding: 12px;
    border: 1px solid #bfe2c9;
    border-radius: 12px;
    background: #f0faf3;
    color: #165c35;
    font-size: .76rem;
    font-weight: 750;
    line-height: 1.45;
  }

  @media (max-width: 900px) {
    .dispatch-route-insights {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dispatch-route-heading-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .dispatch-route-action-buttons {
      justify-content: flex-start;
    }
  }

  @media (max-width: 520px) {
    .dispatch-route-insights {
      grid-template-columns: 1fr;
    }

    .dispatch-route-action-buttons,
    .dispatch-route-action-buttons .dispatch-button {
      width: 100%;
    }

    .dispatch-batch-fulfillment {
      grid-template-columns: 1fr;
    }

    .dispatch-cod-summary,
    .dispatch-cod-record {
      grid-template-columns: 1fr;
    }

    .dispatch-cod-actions {
      justify-content: flex-start;
    }
  }
`;

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function uniqueValues(values: unknown[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  values.flat().forEach((value) => {
    const clean = String(value || "").trim();
    const identity = clean.toLowerCase();
    if (clean && !seen.has(identity)) {
      seen.add(identity);
      output.push(clean);
    }
  });

  return output;
}

function fulfillmentValues(
  row: FulfillmentRecord,
  key: keyof FulfillmentSummary,
  directKey: "product_type" | "delivery_time_slot" | "delivery_type",
): string[] {
  return uniqueValues([
    row.fulfillment_summary?.[key] || [],
    row[directKey] || "",
  ]);
}

function deliveryTypesForRecord(row: FulfillmentRecord): string[] {
  const direct = fulfillmentValues(
    row,
    "delivery_types",
    "delivery_type",
  ).map((value) => value.toLowerCase());

  const itemTypes = (row.items || [])
    .map((item) => String(item.delivery_type || "").trim().toLowerCase())
    .filter(Boolean);

  return uniqueValues([...direct, ...itemTypes]).map((value) =>
    value.toLowerCase(),
  );
}

function isInstantDelivery(row: FulfillmentRecord): boolean {
  return deliveryTypesForRecord(row).includes("instant_delivery");
}

function instantDeliverySelectionLabel(row: FulfillmentRecord): string {
  const direct = String(
    row.selected_delivery_time_label ||
      row.fulfillment_summary?.selected_delivery_time_label ||
      "",
  ).trim();

  if (direct) return direct;

  const itemLabel = (row.items || [])
    .map((item) => String(item.selected_delivery_time_label || "").trim())
    .find(Boolean);

  return itemLabel || "10 min - 30 min";
}

function customerSelectedTimeLabels(row: FulfillmentRecord): string[] {
  const result: string[] = [];

  if (isInstantDelivery(row)) {
    result.push(instantDeliverySelectionLabel(row));
  }

  selectedDeliveryTimes(row).forEach((value) => {
    const display = `✓ ${deliveryTimeLabel(value)}`;
    if (!result.includes(display)) result.push(display);
  });

  return result;
}

function concreteDeliveryTimes(values: unknown): string[] {
  const source = Array.isArray(values) ? values : [values];
  const output: string[] = [];

  source.forEach((value) => {
    const clean = String(value || "").trim().toLowerCase();
    const slots = clean === "both" ? ["morning", "evening"] : [clean];
    slots.forEach((slot) => {
      if (["morning", "evening"].includes(slot) && !output.includes(slot)) {
        output.push(slot);
      }
    });
  });

  return output;
}

function selectedDeliveryTimes(row: FulfillmentRecord): string[] {
  const itemSlots = (row.items || []).flatMap((item) =>
    concreteDeliveryTimes(
      item.customer_selected_delivery_time_slots ||
        item.selected_delivery_time_slots ||
        item.selected_delivery_time_slot,
    ),
  );
  if (itemSlots.length) return uniqueValues(itemSlots);

  const sources: unknown[] = [
    row.customer_selected_delivery_time_slots,
    row.selected_delivery_time_slots,
    row.fulfillment_summary?.selected_delivery_time_slots,
    row.selected_delivery_time_slot,
  ];
  for (const source of sources) {
    const selected = concreteDeliveryTimes(source);
    if (selected.length) return selected;
  }

  const scheduled = concreteDeliveryTimes(
    deliveryWindows(row).map((window) => window.slot),
  );
  if (scheduled.length) return scheduled;

  if (String(row.delivery_time_slot || "").toLowerCase() !== "both") {
    return concreteDeliveryTimes(row.delivery_time_slot);
  }
  return [];
}

function deliveryTimeLabel(value: string): string {
  return value === "both" ? "Morning & Evening" : label(value);
}

function deliveryTypeLabel(value: string): string {
  if (value === "instant_delivery") return "Instant Delivery";
  if (value === "one_day_delivery") return "One-Day Delivery";
  return label(value);
}

function formatEstimatedDate(value: unknown): string {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const dateOnly = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatEstimatedClock(value: unknown): string {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatConfiguredClock(value: unknown): string {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function deliveryWindows(row: FulfillmentRecord): DeliveryWindow[] {
  const direct = Array.isArray(row.promised_delivery_windows) ? row.promised_delivery_windows.filter(Boolean) : [];
  const itemWindows = (row.items || []).flatMap((item) =>
    Array.isArray(item.promised_delivery_windows) ? item.promised_delivery_windows.filter(Boolean) : [],
  );
  if (direct.length || itemWindows.length) {
    const seen = new Set<string>();
    return [...direct, ...itemWindows].filter((window) => {
      const key = [
        window.slot || window.slot_key,
        window.date,
        window.start_at || window.start_time,
        window.end_at || window.end_time,
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const date = row.promised_delivery_date || row.fulfillment_summary?.promised_delivery_date;
  const timeLabel =
    row.promised_delivery_label ||
    row.promised_delivery_time_label ||
    row.fulfillment_summary?.promised_delivery_label ||
    row.fulfillment_summary?.promised_delivery_time_label;
  const startAt = row.promised_delivery_start_at || row.fulfillment_summary?.promised_delivery_start_at;
  const endAt = row.promised_delivery_end_at || row.fulfillment_summary?.promised_delivery_end_at;
  return date || timeLabel || startAt || endAt
    ? [{ date, time_label: timeLabel, start_at: startAt, end_at: endAt, timezone: row.delivery_schedule_timezone || "Asia/Kolkata" }]
    : [];
}

function deliveryEstimateLabel(window: DeliveryWindow): string {
  const date = formatEstimatedDate(window.date || window.start_at);

  // Instant-delivery timestamps come directly from the order booking time:
  // promised start = booking + 10 minutes, promised end = booking + 30 minutes.
  // Prefer those exact timestamps over a generic saved duration label.
  const exactStart = formatEstimatedClock(window.start_at);
  const exactEnd = formatEstimatedClock(window.end_at);
  const configuredStart = formatConfiguredClock(window.start_time);
  const configuredEnd = formatConfiguredClock(window.end_time);
  const savedLabel = String(window.time_label || "").trim();

  const time =
    exactStart || exactEnd
      ? exactStart && exactEnd
        ? `${exactStart} – ${exactEnd}`
        : exactStart || exactEnd
      : savedLabel ||
        (configuredStart && configuredEnd
          ? `${configuredStart} – ${configuredEnd}`
          : configuredStart || configuredEnd);

  const rawSlot = String(window.slot || window.slot_key || "").toLowerCase();
  const slot =
    rawSlot && rawSlot !== "instant" ? deliveryTimeLabel(rawSlot) : "";

  return [slot, date, time ? `${time} IST` : ""].filter(Boolean).join(" · ");
}

function deliveryWindowPrefix(
  row: FulfillmentRecord,
  window: DeliveryWindow,
): "Promised" | "Estimated" {
  const rawSlot = String(window.slot || window.slot_key || "").toLowerCase();
  return rawSlot === "instant" || isInstantDelivery(row)
    ? "Promised"
    : "Estimated";
}

function FulfillmentTags({ row }: { row: FulfillmentRecord }) {
  return (
    <div className="dispatch-manifest-fulfillment">
      {fulfillmentValues(row, "product_types", "product_type").map((value) => (
        <span key={`product-${value}`}>Product: {value}</span>
      ))}
      {customerSelectedTimeLabels(row).map((value) => (
        <span className="selected-time" key={`time-${value}`}>
          Customer selected: {value}
        </span>
      ))}
      {deliveryTypesForRecord(row).map((value) => (
        <span key={`speed-${value}`}>
          Speed: {deliveryTypeLabel(value)}
        </span>
      ))}
      {deliveryWindows(row).map((window, index) => (
        <span
          className="delivery-estimate"
          key={`estimate-${window.start_at || window.date || index}`}
        >
          {deliveryWindowPrefix(row, window)}: {deliveryEstimateLabel(window)}
        </span>
      ))}
      <span>Delivery status: {label(row.delivery_status || "scheduled")}</span>
    </div>
  );
}

function currentBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Current location is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (positionError) => {
        const message =
          positionError.code === positionError.PERMISSION_DENIED
            ? "Allow location access to optimize the delivery route."
            : "Unable to detect your current location. Try again in an open area.";
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  });
}

async function optimizeRouteFromCurrentLocation(
  batchId: string,
  csrfToken: string,
  position: GeolocationPosition,
): Promise<OptimizeRouteResponse> {
  const response = await fetch(
    `/react/api/delivery/batches/${encodeURIComponent(batchId)}/optimize-route`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        csrf_token: csrfToken,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        location_name: "Current GPS Location",
      }),
    },
  );

  const result = (await response
    .json()
    .catch(() => ({}))) as Partial<OptimizeRouteResponse>;

  if (!response.ok || result.success !== true || !result.batch) {
    throw new RouteOptimizationError(
      result.message || "Unable to optimize the delivery route.",
      response.status,
      result.code,
    );
  }

  return result as OptimizeRouteResponse;
}

const DELIVERY_WORKFLOW_STEPS = [
  {
    status: "assigned",
    label: "Assigned",
    description: "Delivery batch assigned to you.",
  },
  {
    status: "accepted",
    label: "Accepted",
    description: "You accepted responsibility for this delivery.",
  },
  {
    status: "collected",
    label: "Pickup Collected",
    description: "Items collected from the seller.",
  },
  {
    status: "out_for_delivery",
    label: "Out for Delivery",
    description: "Traveling to the customer.",
  },
  {
    status: "reached_location",
    label: "Reached Location",
    description: "You reached the customer delivery location.",
  },
  {
    status: "completed",
    label: "Completed",
    description: "Order handed over and delivery closed.",
  },
] as const;

function normalizedWorkflowStatus(value: unknown): string {
  const clean = String(value || "assigned").trim().toLowerCase();
  return clean === "collecting" ? "collected" : clean;
}

function workflowStepIndex(value: unknown): number {
  const normalized = normalizedWorkflowStatus(value);
  const index = DELIVERY_WORKFLOW_STEPS.findIndex(
    (step) => step.status === normalized,
  );
  return index >= 0 ? index : 0;
}

function codRecordIsOpen(record: CodCollectionRecord): boolean {
  return ["pending", "qr_created"].includes(
    String(record.status || "pending").toLowerCase(),
  );
}

function codRecordIsPaidOnline(record: CodCollectionRecord): boolean {
  return ["online_paid", "qr_paid"].includes(
    String(record.status || "").toLowerCase(),
  );
}

export function DeliveryBatchDetailPage({
  mode,
}: DeliveryBatchDetailPageProps) {
  const { batchId = "" } = useParams();

  const [data, setData] = useState<BatchDetailResponse | null>(null);
  const [status, setStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("pending");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [codData, setCodData] = useState<BatchCodResponse | null>(null);
  const [codWorking, setCodWorking] = useState("");
  const [codNotice, setCodNotice] = useState("");
  const [codTermsAccepted, setCodTermsAccepted] = useState(false);

  async function load() {
    try {
      const response =
        mode === "admin"
          ? await loadAdminDeliveryBatch(batchId)
          : mode === "manager"
            ? await loadManagerDeliveryBatch(batchId)
            : await loadDeliveryBatch(batchId);

      setData(response);
      setStatus(response.allowed_statuses?.[0] || "");
      setPayoutStatus(response.batch?.payout_status || "pending");
      setPayoutReference(response.batch?.payout_reference || "");
      setPayoutNote(response.batch?.payout_note || "");
    } catch (error) {
      if (isAuthenticationError(error)) {
        window.location.assign("/react/login");
        return;
      }

      setNotice(errorMessage(error, "Unable to load delivery batch."));
    }
  }

  async function loadCod() {
    try {
      const response = await loadBatchCod(batchId);
      setCodData(response);

      const summaryStatus = String(
        response.summary?.cod_collection_status || "",
      ).toLowerCase();
      const outstanding = Number(
        response.summary?.cod_outstanding_amount || 0,
      );
      const gatewayPaid = Number(
        response.summary?.cod_gateway_paid_amount || 0,
      );

      if (
        summaryStatus === "paid_online" ||
        (outstanding <= 0 && gatewayPaid > 0)
      ) {
        setCodTermsAccepted(false);
        setCodNotice(
          "Customer payment received online. No COD cash will be deducted from your delivery earnings.",
        );
      }
    } catch (requestError) {
      setCodNotice(
        settlementErrorMessage(
          requestError,
          "Unable to load COD collection status.",
        ),
      );
    }
  }

  useEffect(() => {
    void load();
    void loadCod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, mode]);

  useEffect(() => {
    const currentStatus = normalizedWorkflowStatus(
      data?.batch?.status,
    );

    if (
      mode !== "delivery" ||
      currentStatus !== "reached_location"
    ) {
      return;
    }

    // Customer can pay from Order Details while the delivery-person page is
    // already open. Refresh the COD ledger so Complete Order unlocks
    // automatically without requiring a browser reload.
    const intervalId = window.setInterval(() => {
      void loadCod();
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, mode, data?.batch?.status]);

  function backUrl(): string {
    if (mode === "admin") {
      return "/admin/delivery-dispatch";
    }

    if (mode === "manager") {
      return "/seller-delivery-manager/delivery-dispatch";
    }

    return "/delivery/batches";
  }

  async function submitStatus(event: FormEvent) {
    event.preventDefault();

    if (!data?.csrf_token || !status) return;

    setWorking("status");
    setNotice("");

    try {
      const response = await updateDeliveryBatchStatus(
        batchId,
        data.csrf_token,
        status,
        statusNote,
      );

      setData((current) => ({
        ...current,
        ...response,
      }));
      setStatus(response.allowed_statuses?.[0] || "");
      setStatusNote("");
      setNotice(response.message || "Delivery batch status updated.");
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      setNotice(errorMessage(error, "Unable to update batch status."));
    } finally {
      setWorking("");
    }
  }


  async function confirmOutstandingCodCash() {
    if (!codTermsAccepted) {
      setCodNotice(
        "Tick the COD acknowledgement before confirming cash collection.",
      );
      return;
    }

    const csrfToken =
      codData?.csrf_token || data?.csrf_token || "";

    if (!csrfToken) {
      setCodNotice(
        "Security token is unavailable. Refresh the page and try again.",
      );
      return;
    }

    setCodWorking("batch-cod");
    setCodNotice("");

    try {
      const response = await confirmBatchCodCash(
        batchId,
        csrfToken,
        true,
        "COD cash confirmed at customer location. Delivery person accepted deduction from earnings until reconciliation.",
      );

      setCodData(response);
      setCodTermsAccepted(false);
      setCodNotice(
        response.message ||
          "COD cash recorded successfully. You can now complete the order.",
      );

      await load();
      await loadCod();
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setCodNotice(
        settlementErrorMessage(
          requestError,
          "Unable to confirm COD cash collection.",
        ),
      );
    } finally {
      setCodWorking("");
    }
  }

  async function advanceDeliveryWorkflow(
    targetStatus: string,
    successMessage: string,
  ) {
    if (!data?.csrf_token || mode !== "delivery") return;

    setWorking(`workflow-${targetStatus}`);
    setNotice("");

    try {
      const response = await updateDeliveryBatchStatus(
        batchId,
        data.csrf_token,
        targetStatus,
        successMessage,
      );

      setData((current) => ({
        ...current,
        ...response,
      }));
      setStatus(response.allowed_statuses?.[0] || "");
      setStatusNote("");
      setNotice(response.message || successMessage);

      if (
        targetStatus === "reached_location" ||
        targetStatus === "completed"
      ) {
        await loadCod();
      }
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      setNotice(
        errorMessage(
          error,
          "Unable to update the delivery workflow.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function remitCash(record: CodCollectionRecord) {
    if (!codData?.csrf_token) return;
    const reference = window.prompt(
      "Enter cash remittance/reference number (optional):",
      record.remittance_reference || "",
    );
    if (reference === null) return;
    setCodWorking(`remit-${record.id}`);
    setCodNotice("");
    try {
      const response = await markCodRemitted(
        batchId,
        record.id,
        reference,
        codData.csrf_token,
      );
      setCodNotice(response.message);
      await loadCod();
      await load();
    } catch (requestError) {
      setCodNotice(settlementErrorMessage(requestError, "Unable to mark COD cash remitted."));
    } finally {
      setCodWorking("");
    }
  }

  async function submitPayout(event: FormEvent) {
    event.preventDefault();

    if (!data?.csrf_token) return;

    setWorking("payout");
    setNotice("");

    try {
      const response = await updateDeliveryBatchPayout(
        batchId,
        data.csrf_token,
        {
          payout_status: payoutStatus,
          payout_reference: payoutReference,
          payout_note: payoutNote,
        },
      );

      setData((current) => ({
        ...current,
        ...response,
      }));
      setNotice(response.message || "Payout updated.");
    } catch (error) {
      if (isCsrfError(error)) {
        window.location.reload();
        return;
      }

      setNotice(errorMessage(error, "Unable to update payout."));
    } finally {
      setWorking("");
    }
  }

  async function optimizeCurrentRoute() {
    if (!data?.csrf_token || mode !== "delivery") return;

    setWorking("route");
    setNotice(
      "Detecting your current location and calculating the fastest valid stop sequence…",
    );

    try {
      const position = await currentBrowserPosition();
      const response = await optimizeRouteFromCurrentLocation(
        batchId,
        data.csrf_token,
        position,
      );

      setData((current) =>
        current
          ? {
              ...current,
              batch: response.batch,
              csrf_token: response.csrf_token || current.csrf_token,
            }
          : current,
      );
      setNotice(
        response.message ||
          "The delivery sequence was optimized from your current location.",
      );
    } catch (error) {
      if (
        isCsrfError(error) ||
        (error instanceof RouteOptimizationError && error.status === 403)
      ) {
        window.location.reload();
        return;
      }

      if (error instanceof RouteOptimizationError && error.status === 401) {
        window.location.assign("/react/login");
        return;
      }

      setNotice(errorMessage(error, "Unable to optimize the delivery route."));
    } finally {
      setWorking("");
    }
  }

  if (!data?.batch) {
    return (
      <main className="dispatch-page">
        <div className="dispatch-loading">
          {notice || "Loading delivery route…"}
        </div>
      </main>
    );
  }

  const batch = data.batch as DeliveryBatch;
  const instantBatch = isInstantDelivery(batch);
  const batchSelectedTimes = customerSelectedTimeLabels(batch);
  const batchDeliveryTypes = deliveryTypesForRecord(batch);
  const batchDeliveryWindows = deliveryWindows(batch);
  const route = (batch.route || {}) as OptimizedDeliveryRoute;
  const routePoints = route.route_points || [];
  const canOptimizeRoute =
    mode === "delivery" && !["completed", "cancelled"].includes(batch.status);
  const pickupManifest = [...(batch.pickup_manifest || [])].sort(
    (left: Record<string, any>, right: Record<string, any>) =>
      Number(left.optimized_sequence || 9999) -
      Number(right.optimized_sequence || 9999),
  );
  const dropManifest = [...(batch.drop_manifest || [])].sort(
    (left: Record<string, any>, right: Record<string, any>) =>
      Number(left.optimized_sequence || 9999) -
      Number(right.optimized_sequence || 9999),
  );

  const deliverySupportOrders: SupportOrderOption[] = dropManifest
    .map((drop: Record<string, any>, index) => {
      const id = String(
        drop.parent_order_id ||
          drop.order_id ||
          "",
      ).trim();

      if (!id) return null;

      return {
        id,
        label: String(
          drop.parent_order_number ||
            drop.order_number ||
            `Order ${index + 1}`,
        ),
        customerName: String(drop.customer_name || ""),
        items: (drop.items || []) as Array<Record<string, any>>,
      };
    })
    .filter(
      (row): row is SupportOrderOption => Boolean(row),
    );

  const statusOptions = [...(data.allowed_statuses || [])];
  const workflowStatus = normalizedWorkflowStatus(batch.status);
  const currentWorkflowIndex = workflowStepIndex(batch.status);
  const openCodRecords = (codData?.records || []).filter(codRecordIsOpen);
  const onlinePaidCodRecords = (codData?.records || []).filter(
    codRecordIsPaidOnline,
  );
  const batchCodAmount = Number(
    (batch as Record<string, any>).cod_collection_amount || 0,
  );

  // Once COD API data has loaded it is authoritative. Do not keep using the
  // batch snapshot because that snapshot may still contain the original COD
  // amount even after the customer converted the order to Razorpay.
  const hasCod = codData
    ? Boolean(
        (codData.records || []).length ||
          Number(codData.summary?.cod_collection_amount || 0) > 0,
      )
    : batchCodAmount > 0;

  const codOutstandingFromRecords = openCodRecords.reduce(
    (total, record) => total + Number(record.amount || 0),
    0,
  );

  const codOutstandingAmount = codData
    ? Number(
        codData.summary?.cod_outstanding_amount ||
          codOutstandingFromRecords ||
          0,
      )
    : Number(
        (batch as Record<string, any>).cod_outstanding_amount ||
          batchCodAmount ||
          0,
      );

  const codPaidOnline = Boolean(
    codData &&
      (
        String(
          codData.summary?.cod_collection_status || "",
        ).toLowerCase() === "paid_online" ||
        (
          Number(codData.summary?.cod_gateway_paid_amount || 0) > 0 &&
          Number(codData.summary?.cod_outstanding_amount || 0) <= 0
        )
      ),
  );

  const codResolved = Boolean(
    !hasCod ||
      (
        codData &&
        openCodRecords.length === 0 &&
        Number(codData.summary?.cod_outstanding_amount || 0) <= 0
      ),
  );

  if (
    mode !== "delivery" &&
    !["completed", "cancelled"].includes(batch.status) &&
    !statusOptions.includes("cancelled")
  ) {
    statusOptions.push("cancelled");
  }

  return (
    <>
      <style>{ADVANCED_ROUTE_STYLES}</style>

      <main className="dispatch-page">
        <div className="dispatch-page-container">
          <section className="dispatch-heading-react">
            <div>
              <span className="dispatch-eyebrow">Bulk delivery route</span>
              <h1>{batch.batch_number}</h1>
              <p>
                {batch.delivery_person_name} · {batch.vehicle_type}{" "}
                {batch.vehicle_number}
              </p>
            </div>

            <Link className="dispatch-button secondary" to={backUrl()}>
              Back to Dispatch Centre
            </Link>
          </section>

          <section className="dispatch-stat-grid-react">
            <article>
              <strong>{batch.order_count || 0}</strong>
              <span>Customer orders</span>
            </article>
            <article>
              <strong>{batch.pickup_count || 0}</strong>
              <span>Seller pickups</span>
            </article>
            <article>
              <strong>{batch.drop_count || 0}</strong>
              <span>Customer drops</span>
            </article>
            <article>
              <strong>
                {Number(batch.estimated_route_km || 0).toFixed(2)} km
              </strong>
              <span>Estimated route</span>
            </article>
            <article>
              <strong>
                {data.currency_symbol || "₹"}
                {Number(batch.payout_amount || 0).toFixed(2)}
              </strong>
              <span>Delivery payout</span>
            </article>
            <article>
              <strong>
                {data.currency_symbol || "₹"}
                {Number(batch.cod_collection_amount || 0).toFixed(2)}
              </strong>
              <span>COD to collect</span>
            </article>
          </section>

          {notice && <div className="dispatch-notice warning">{notice}</div>}

          <section
            className="dispatch-batch-fulfillment"
            aria-label="Product and customer delivery plan"
          >
            <div>
              <span>Product Type</span>
              <strong>
                {fulfillmentValues(
                  batch,
                  "product_types",
                  "product_type",
                ).join(", ") || "Products"}
              </strong>
            </div>
            <div>
              <span>Customer Selected Time</span>
              <strong>
                {batchSelectedTimes.join(" · ") || "Not specified"}
              </strong>
            </div>
            <div>
              <span>Delivery Speed</span>
              <strong>
                {batchDeliveryTypes
                  .map(deliveryTypeLabel)
                  .join(", ") || "Not specified"}
              </strong>
            </div>
            <div>
              <span>
                {instantBatch ? "Promised Delivery (IST)" : "Estimated Delivery (IST)"}
              </span>
              <strong>
                {batchDeliveryWindows
                  .map(deliveryEstimateLabel)
                  .filter(Boolean)
                  .join(" · ") || "Schedule pending"}
              </strong>
            </div>
            <div>
              <span>Delivery Status</span>
              <strong>
                {label(
                  mode === "delivery"
                    ? normalizedWorkflowStatus(batch.status)
                    : batch.delivery_status || batch.status || "scheduled",
                )}
              </strong>
            </div>
          </section>

          {(codData?.records || []).length > 0 && (
            <section className="dispatch-cod-panel" aria-label="COD cash collection">
              <div className="dispatch-cod-panel-heading">
                <div>
                  <span className="dispatch-eyebrow">COD reconciliation</span>
                  <h2>COD Cash Collection</h2>
                  <p>
                    The customer can pay online from their Order Details page.
                    The delivery person should only use <strong>Cash Collected</strong>{" "}
                    when physical cash is actually received. Online-paid COD orders
                    do not create a delivery-person cash liability.
                  </p>
                </div>
                <span
                  className={`dispatch-cod-status ${String(
                    codData?.summary?.cod_collection_status || "pending",
                  ).replace(/_/g, "-")}`}
                >
                  {label(codData?.summary?.cod_collection_status || "pending")}
                </span>
              </div>

              {codNotice && <div className="dispatch-cod-note">{codNotice}</div>}

              {mode === "delivery" && (
                <div className="dispatch-cod-note">
                  COD confirmation is available in the Delivery Workflow after you
                  mark <strong>Reached Customer Location</strong>.
                </div>
              )}

              <div className="dispatch-cod-summary">
                <article>
                  <span>Total COD</span>
                  <strong>
                    {data.currency_symbol || "₹"}
                    {Number(codData?.summary?.cod_collection_amount || 0).toFixed(2)}
                  </strong>
                </article>
                <article>
                  <span>Cash held</span>
                  <strong>
                    {data.currency_symbol || "₹"}
                    {Number(codData?.summary?.cod_cash_collected_amount || 0).toFixed(2)}
                  </strong>
                </article>
                <article>
                  <span>Paid online</span>
                  <strong>
                    {data.currency_symbol || "₹"}
                    {Number(codData?.summary?.cod_gateway_paid_amount || 0).toFixed(2)}
                  </strong>
                </article>
                <article>
                  <span>Outstanding</span>
                  <strong>
                    {data.currency_symbol || "₹"}
                    {Number(codData?.summary?.cod_outstanding_amount || 0).toFixed(2)}
                  </strong>
                </article>
              </div>

              <div className="dispatch-cod-list">
                {(codData?.records || []).map((record) => {
                  const recordStatus = String(record.status || "pending").toLowerCase();
                  const paidOnline = ["online_paid", "qr_paid"].includes(recordStatus);

                  return (
                    <article className="dispatch-cod-record" key={record.id}>
                      <div>
                        <strong>{record.order_number || record.order_id}</strong>
                        <small>{record.customer_name || "Customer"}</small>
                        <span
                          className={`dispatch-cod-status ${recordStatus.replace(
                            /_/g,
                            "-",
                          )}`}
                        >
                          {paidOnline ? "Paid Online" : label(recordStatus)}
                        </span>

                        {recordStatus === "pending" && (
                          <small>
                            Waiting for customer online payment or physical cash collection.
                          </small>
                        )}
                        {recordStatus === "cash_collected" && (
                          <small>
                            Cash is held by the delivery person and will be deducted from
                            settlement unless it is remitted.
                          </small>
                        )}
                        {paidOnline && (
                          <small>
                            Customer paid online from Order Details. No COD cash deduction
                            applies to delivery earnings.
                          </small>
                        )}
                        {recordStatus === "remitted" && (
                          <small>
                            Cash remitted to the platform. No delivery settlement deduction
                            applies.
                          </small>
                        )}
                        {recordStatus === "deducted_from_payout" && (
                          <small>
                            Cash was reconciled through the delivery-person settlement.
                          </small>
                        )}
                      </div>

                      <div>
                        <strong>
                          {data.currency_symbol || "₹"}
                          {Number(record.amount || 0).toFixed(2)}
                        </strong>
                        <small>Customer COD amount</small>
                        {record.online_payment_id && (
                          <small>Online payment: {record.online_payment_id}</small>
                        )}
                      </div>

                      <div>
                        <div className="dispatch-cod-actions">
                          {mode !== "delivery" && recordStatus === "cash_collected" && (
                            <button
                              className="dispatch-button primary small"
                              type="button"
                              disabled={Boolean(codWorking)}
                              onClick={() => void remitCash(record)}
                            >
                              {codWorking === `remit-${record.id}`
                                ? "Saving…"
                                : "Mark Cash Remitted"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <div className="dispatch-detail-layout-react">
            <main>
              <section className="dispatch-card">
                <div className="dispatch-route-heading-actions">
                  <div>
                    <h2>Optimized Route Sequence</h2>
                    <p>
                      Pickup-before-delivery constraints are enforced while
                      minimizing the complete route from the delivery person's
                      location.
                    </p>
                    <span className="dispatch-route-algorithm">
                      {route.algorithm_label ||
                        label(route.route_strategy || "Graph optimized route")}
                    </span>
                  </div>

                  <div className="dispatch-route-action-buttons">
                    {canOptimizeRoute && (
                      <button
                        className="dispatch-button primary"
                        type="button"
                        disabled={working === "route"}
                        onClick={() => {
                          void optimizeCurrentRoute();
                        }}
                      >
                        {working === "route"
                          ? "Optimizing…"
                          : "Optimize From Current Location"}
                      </button>
                    )}

                    {route.navigation_url && (
                      <a
                        className="dispatch-button secondary"
                        href={route.navigation_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Start Navigation
                      </a>
                    )}
                  </div>
                </div>

                <div className="dispatch-route-insights">
                  <article className="dispatch-route-insight">
                    <span>Optimized distance</span>
                    <strong>
                      {Number(
                        route.estimated_route_km ||
                          batch.estimated_route_km ||
                          0,
                      ).toFixed(2)}{" "}
                      km
                    </strong>
                  </article>
                  <article className="dispatch-route-insight">
                    <span>Distance saved</span>
                    <strong>
                      {Number(route.distance_saved_km || 0).toFixed(2)} km ·{" "}
                      {Number(route.distance_saved_percent || 0).toFixed(1)}%
                    </strong>
                  </article>
                  <article className="dispatch-route-insight">
                    <span>Travel estimate</span>
                    <strong>
                      {Number(route.estimated_travel_minutes || 0).toFixed(0)}{" "}
                      min driving
                    </strong>
                  </article>
                  <article className="dispatch-route-insight">
                    <span>Total estimate</span>
                    <strong>
                      {Number(route.estimated_total_minutes || 0).toFixed(0)}{" "}
                      min with stops
                    </strong>
                  </article>
                </div>

                <div className="dispatch-route-list">
                  <article className="start">
                    <span>Start</span>
                    <div>
                      <strong>
                        {route.start?.name || "Delivery Person Location"}
                      </strong>
                      <small>
                        {route.start?.latitude}, {route.start?.longitude}
                      </small>
                      <div className="dispatch-current-location-note">
                        {route.start?.source === "browser_current_location"
                          ? "Live browser GPS start"
                          : "Saved home/current-location start"}
                        {Number(route.start?.accuracy_meters || 0) > 0
                          ? ` · ±${Number(route.start?.accuracy_meters).toFixed(
                              0,
                            )} m accuracy`
                          : ""}
                      </div>
                    </div>
                  </article>

                  {routePoints.map((point) => (
                    <article
                      key={`${point.route_type}-${point.sequence}`}
                      className={`${point.route_type || ""} ${
                        point.is_next_stop ? "next-stop" : ""
                      }`}
                    >
                      <span>{point.sequence}</span>
                      <div>
                        <strong>
                          {point.route_type === "pickup"
                            ? `Pickup: ${
                                point.business_name || point.seller_name
                              }`
                            : `Deliver: ${point.customer_name}`}
                        </strong>
                        <small>
                          {Number(point.distance_from_previous_km || 0).toFixed(
                            2,
                          )}{" "}
                          km from previous stop
                        </small>
                        {point.is_next_stop && (
                          <span className="dispatch-next-stop-badge">
                            Next · {point.next_action}
                          </span>
                        )}
                      </div>
                      {point.maps_url && (
                        <a
                          className="dispatch-button secondary small"
                          href={point.maps_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Map
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="dispatch-card">
                <h2>Seller Pickup Manifest</h2>

                <div className="dispatch-manifest-grid">
                  {pickupManifest.map((pickup: Record<string, any>, index) => (
                    <article key={`${pickup.seller_id || "pickup"}-${index}`}>
                      <h3>{pickup.business_name}</h3>
                      {pickup.optimized_sequence && (
                        <span className="dispatch-manifest-sequence">
                          Route stop {pickup.optimized_sequence}
                        </span>
                      )}
                      <p>
                        {pickup.pickup_address ||
                          "Pickup address from seller GPS profile"}
                      </p>
                      <FulfillmentTags row={pickup as FulfillmentRecord} />
                      <strong>{pickup.item_count || 0} total units</strong>
                      <ul>
                        {(pickup.items || []).map(
                          (item: Record<string, any>, itemIndex: number) => (
                            <li
                              className="dispatch-manifest-item"
                              key={`${item.name}-${itemIndex}`}
                            >
                              <span>
                                {item.name} × {item.quantity} ·{" "}
                                {item.parent_order_number}
                              </span>
                              <small>
                                {item.product_type || "Products"} ·{" "}
                                {isInstantDelivery(item)
                                  ? instantDeliverySelectionLabel(item)
                                  : selectedDeliveryTimes(item)
                                      .map(deliveryTimeLabel)
                                      .join(" & ") || "Time not specified"} ·{" "}
                                {deliveryTypeLabel(item.delivery_type)}
                              </small>
                              {deliveryWindows(item).map((window, windowIndex) => (
                                <small key={`estimate-${window.start_at || window.date || windowIndex}`}>
                                  {deliveryWindowPrefix(item, window)}:{" "}
                                  {deliveryEstimateLabel(window)}
                                </small>
                              ))}
                            </li>
                          ),
                        )}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dispatch-card">
                <h2>Customer Delivery Manifest</h2>

                <div className="dispatch-manifest-grid">
                  {dropManifest.map((drop: Record<string, any>, index) => (
                    <article key={`${drop.parent_order_id || "drop"}-${index}`}>
                      <h3>{drop.parent_order_number}</h3>
                      {drop.optimized_sequence && (
                        <span className="dispatch-manifest-sequence">
                          Route stop {drop.optimized_sequence}
                        </span>
                      )}
                      <p>
                        <strong>{drop.customer_name}</strong>
                        <br />
                        {drop.delivery_address?.address_line1}
                        {drop.delivery_address?.address_line2
                          ? `, ${drop.delivery_address.address_line2}`
                          : ""}
                        <br />
                        {drop.delivery_address?.city},{" "}
                        {drop.delivery_address?.state} —{" "}
                        {drop.delivery_address?.postal_code}
                      </p>
                      <p>Phone: {drop.customer_phone}</p>
                      <p>
                        Payment: {label(drop.payment_method)} ·{" "}
                        {label(drop.payment_status)}
                      </p>
                      <FulfillmentTags row={drop as FulfillmentRecord} />
                      {(drop.items || []).length > 0 && (
                        <ul>
                          {(drop.items || []).map(
                            (item: Record<string, any>, itemIndex: number) => (
                              <li
                                className="dispatch-manifest-item"
                                key={`${item.item_id || item.name}-${itemIndex}`}
                              >
                                <span>
                                  {item.name || "Item"} × {item.quantity || 1}
                                </span>
                                <small>
                                  {item.product_type || "Products"} ·{" "}
                                  {isInstantDelivery(item)
                                    ? instantDeliverySelectionLabel(item)
                                    : selectedDeliveryTimes(item)
                                        .map(deliveryTimeLabel)
                                        .join(" & ") || "Time not specified"} ·{" "}
                                  {deliveryTypeLabel(item.delivery_type)}
                                </small>
                                {deliveryWindows(item).map((window, windowIndex) => (
                                  <small key={`estimate-${window.start_at || window.date || windowIndex}`}>
                                    {deliveryWindowPrefix(item, window)}:{" "}
                                    {deliveryEstimateLabel(window)}
                                  </small>
                                ))}
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                      {drop.payment_method === "cash_on_delivery" &&
                        drop.payment_status !== "paid" && (
                          <strong>
                            Collect {data.currency_symbol || "₹"}
                            {Number(drop.order_total || 0).toFixed(2)}
                          </strong>
                        )}
                    </article>
                  ))}
                </div>
              </section>

              {mode === "delivery" ? (
                <RoleSupportTicketCard
                  role="delivery"
                  csrfToken={data.csrf_token || ""}
                  contextType="delivery_batch"
                  contextId={batch.id}
                  batchId={batch.id}
                  orderNumber={String(batch.batch_number || "")}
                  orderOptions={deliverySupportOrders}
                  title="Delivery Support"
                  description="Raise a ticket for this batch or select a customer order for pickup, address, route, COD, item, or payout issues."
                />
              ) : null}
            </main>

            <aside className="dispatch-card dispatch-sticky">
              {mode === "delivery" ? (
                <section className="dispatch-workflow">
                  <div className="dispatch-workflow-header">
                    <div>
                      <h2>Delivery Workflow</h2>
                      <p>
                        Complete each step in order. COD cash is confirmed only after
                        reaching the customer.
                      </p>
                    </div>
                    <span className={`dispatch-status ${batch.status}`}>
                      {workflowStatus === "collected"
                        ? "Pickup Collected"
                        : label(workflowStatus)}
                    </span>
                  </div>

                  <div className="dispatch-workflow-steps">
                    {DELIVERY_WORKFLOW_STEPS.map((step, index) => {
                      const stepClass =
                        index < currentWorkflowIndex
                          ? "done"
                          : index === currentWorkflowIndex
                            ? "current"
                            : "";

                      return (
                        <article
                          className={`dispatch-workflow-step ${stepClass}`}
                          key={step.status}
                        >
                          <span className="step-dot">
                            {index < currentWorkflowIndex ? "✓" : index + 1}
                          </span>
                          <div>
                            <strong>{step.label}</strong>
                            <small>{step.description}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="dispatch-workflow-action">
                    {workflowStatus === "assigned" && (
                      <>
                        <button
                          className="dispatch-button primary full"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() =>
                            void advanceDeliveryWorkflow(
                              "accepted",
                              "Delivery accepted.",
                            )
                          }
                        >
                          {working === "workflow-accepted"
                            ? "Accepting…"
                            : "Accept Delivery"}
                        </button>
                        <p className="dispatch-workflow-hint">
                          Accept the batch before collecting items from the seller.
                        </p>
                      </>
                    )}

                    {workflowStatus === "accepted" && (
                      <>
                        <button
                          className="dispatch-button primary full"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() =>
                            void advanceDeliveryWorkflow(
                              "collected",
                              "Pickup collected from seller.",
                            )
                          }
                        >
                          {working === "workflow-collected"
                            ? "Saving…"
                            : "Mark Pickup Collected"}
                        </button>
                        <p className="dispatch-workflow-hint">
                          Use this only after you physically receive the items from
                          the seller.
                        </p>
                      </>
                    )}

                    {workflowStatus === "collected" && (
                      <>
                        <button
                          className="dispatch-button primary full"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() =>
                            void advanceDeliveryWorkflow(
                              "out_for_delivery",
                              "Started delivery to the customer.",
                            )
                          }
                        >
                          {working === "workflow-out_for_delivery"
                            ? "Starting…"
                            : "Start Out for Delivery"}
                        </button>
                        <p className="dispatch-workflow-hint">
                          Start navigation and proceed to the customer location.
                        </p>
                      </>
                    )}

                    {workflowStatus === "out_for_delivery" && (
                      <>
                        <button
                          className="dispatch-button primary full"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() =>
                            void advanceDeliveryWorkflow(
                              "reached_location",
                              "Reached the customer delivery location.",
                            )
                          }
                        >
                          {working === "workflow-reached_location"
                            ? "Updating…"
                            : "Reached Customer Location"}
                        </button>
                        <p className="dispatch-workflow-hint">
                          Confirm this only after you reach the customer's delivery
                          location.
                        </p>
                      </>
                    )}

                    {workflowStatus === "reached_location" && (
                      <>
                        {hasCod && !codResolved ? (
                          <section className="dispatch-workflow-cod">
                            <h3>Cash on Delivery</h3>
                            <p>
                              The customer may still pay online from Order Details.
                              If you receive physical cash, confirm it here before
                              completing the order.
                            </p>

                            <div className="dispatch-workflow-cod-amount">
                              <span>COD cash to confirm</span>
                              <strong>
                                {data.currency_symbol || "₹"}
                                {codOutstandingAmount.toFixed(2)}
                              </strong>
                            </div>

                            {!openCodRecords.length && codOutstandingAmount > 0 && (
                              <p>
                                COD ledger is being synchronized from this delivery
                                batch when you confirm cash. You can continue after
                                accepting the acknowledgement below.
                              </p>
                            )}

                            <label className="dispatch-workflow-terms">
                              <input
                                type="checkbox"
                                checked={codTermsAccepted}
                                disabled={Boolean(codWorking)}
                                onChange={(event) =>
                                  setCodTermsAccepted(event.target.checked)
                                }
                              />
                              <span>
                                I confirm that I received the COD amount in cash from
                                the customer. I understand and agree that this cash
                                amount will be deducted from my delivery earnings until
                                I remit it or it is reconciled in settlement.
                              </span>
                            </label>

                            <button
                              className="dispatch-button primary full"
                              type="button"
                              disabled={
                                Boolean(codWorking) ||
                                !codTermsAccepted ||
                                codOutstandingAmount <= 0
                              }
                              onClick={() => void confirmOutstandingCodCash()}
                            >
                              {codWorking === "batch-cod"
                                ? "Confirming COD…"
                                : `Confirm COD Cash ${data.currency_symbol || "₹"}${codOutstandingAmount.toFixed(2)}`}
                            </button>

                            {onlinePaidCodRecords.length > 0 && (
                              <p>
                                {onlinePaidCodRecords.length} COD order(s) were already
                                paid online and will not be deducted from earnings.
                              </p>
                            )}
                          </section>
                        ) : (
                          <div className="dispatch-workflow-complete">
                            {codPaidOnline
                              ? "✓ Customer paid online from Order Details. No COD cash deduction will be applied. You can complete this delivery."
                              : hasCod
                                ? "COD is resolved. You can now complete this delivery."
                                : "No COD collection is required. You can now complete this delivery."}
                          </div>
                        )}

                        {codResolved && (
                          <button
                            className="dispatch-button primary full"
                            type="button"
                            disabled={Boolean(working)}
                            onClick={() =>
                              void advanceDeliveryWorkflow(
                                "completed",
                                "Order delivered successfully.",
                              )
                            }
                          >
                            {working === "workflow-completed"
                              ? "Completing…"
                              : "Complete Order"}
                          </button>
                        )}
                      </>
                    )}

                    {workflowStatus === "completed" && (
                      <div className="dispatch-workflow-complete">
                        ✓ Delivery completed successfully. This order is closed.
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <h2>Batch Status</h2>

                  <span className={`dispatch-status ${batch.status}`}>
                    {label(batch.status)}
                  </span>

                  {statusOptions.length > 0 && (
                    <form onSubmit={submitStatus}>
                      <label>
                        New status
                        <select
                          value={status}
                          onChange={(event) => setStatus(event.target.value)}
                          required
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Status note
                        <textarea
                          rows={3}
                          value={statusNote}
                          onChange={(event) => setStatusNote(event.target.value)}
                        />
                      </label>

                      <button
                        className="dispatch-button primary full"
                        type="submit"
                        disabled={working === "status"}
                      >
                        {working === "status" ? "Updating…" : "Update Status"}
                      </button>
                    </form>
                  )}
                </>
              )}

              <section className="dispatch-payout-summary">
                <h3>Delivery Payout</h3>
                <p>
                  {label(batch.payout?.basis || "flat")} · rate{" "}
                  {data.currency_symbol || "₹"}
                  {Number(batch.payout?.rate || 0).toFixed(2)}
                </p>
                <strong>
                  {data.currency_symbol || "₹"}
                  {Number(batch.payout_amount || 0).toFixed(2)}
                </strong>
                <span>{label(batch.payout_status)}</span>
              </section>

              {mode !== "delivery" && (
                <form onSubmit={submitPayout}>
                  <label>
                    Payout status
                    <select
                      value={payoutStatus}
                      onChange={(event) => setPayoutStatus(event.target.value)}
                    >
                      {(
                        data.allowed_payout_statuses || [
                          "pending",
                          "approved",
                          "processing",
                          "paid",
                          "on_hold",
                          "cancelled",
                        ]
                      ).map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Payout reference
                    <input
                      value={payoutReference}
                      onChange={(event) =>
                        setPayoutReference(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Payout note
                    <textarea
                      rows={3}
                      value={payoutNote}
                      onChange={(event) => setPayoutNote(event.target.value)}
                    />
                  </label>

                  <button
                    className="dispatch-button secondary full"
                    type="submit"
                    disabled={working === "payout"}
                  >
                    {working === "payout" ? "Updating…" : "Update Payout"}
                  </button>
                </form>
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export function AdminDeliveryBatchDetailPage() {
  return <DeliveryBatchDetailPage mode="admin" />;
}

export function ManagerDeliveryBatchDetailPage() {
  return <DeliveryBatchDetailPage mode="manager" />;
}

export function MyDeliveryBatchDetailPage() {
  return <DeliveryBatchDetailPage mode="delivery" />;
}
