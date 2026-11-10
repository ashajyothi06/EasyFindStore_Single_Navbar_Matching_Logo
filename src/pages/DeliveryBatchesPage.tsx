import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  errorMessage,
  isAuthenticationError,
  loadDeliveryBatches,
  type BatchListResponse,
} from "../services/deliveryDispatchApi";
import "../styles/delivery-dispatch.css";

type DeliveryBatch = NonNullable<BatchListResponse["batches"]>[number];

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
  items?: Array<Record<string, unknown>>;
}

type FilterableDeliveryBatch = DeliveryBatch & FulfillmentRecord & {
  scheduled_dates?: string[];
  primary_scheduled_date?: string;
  scheduled_date?: string;
  delivery_date?: string;
  created_at?: string;
  payout_status?: string;
  drop_manifest?: Array<Record<string, unknown>>;
};

type BatchTab = "upcoming" | "today" | "completed" | "cancelled";

type ScheduleFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "next_7_days"
  | "future"
  | "overdue"
  | "unscheduled";

type InstantDeliveryFilter =
  | "all"
  | "instant_only"
  | "exclude_instant";

type BatchSort =
  | "schedule_soonest"
  | "schedule_latest"
  | "newest"
  | "oldest"
  | "payout_high"
  | "payout_low";

const ACTIVE_STATUSES = new Set([
  "assigned",
  "accepted",
  "collecting",
  "out_for_delivery",
]);

const BATCH_FILTER_STYLES = `
  .dispatch-batch-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 16px;
    padding: 7px;
    border: 1px solid #dce8df;
    border-radius: 18px;
    background: #f7faf8;
  }

  .dispatch-batch-tab {
    display: flex;
    min-height: 52px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: 13px;
    background: transparent;
    color: #4a5d50;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition: 150ms ease;
  }

  .dispatch-batch-tab:hover {
    border-color: #c7ddce;
    background: #ffffff;
    color: #173c26;
  }

  .dispatch-batch-tab.active {
    border-color: #14864b;
    background: #14864b;
    color: #ffffff;
    box-shadow: 0 9px 22px rgba(20, 134, 75, 0.2);
  }

  .dispatch-batch-tab-count {
    min-width: 25px;
    padding: 3px 7px;
    border-radius: 999px;
    background: rgba(17, 56, 33, 0.09);
    font-size: 0.72rem;
  }

  .dispatch-batch-tab.active .dispatch-batch-tab-count {
    background: rgba(255, 255, 255, 0.2);
  }

  .dispatch-batch-filter-panel {
    margin-bottom: 20px;
    padding: 18px;
    border: 1px solid #dce8df;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(26, 58, 36, 0.05);
  }

  .dispatch-batch-filter-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(140px, 1fr));
    gap: 12px;
    align-items: end;
  }

  .dispatch-batch-filter-field:first-child {
    grid-column: span 2;
  }

  .dispatch-batch-filter-field {
    display: grid;
    gap: 7px;
  }

  .dispatch-batch-filter-field span {
    color: #617067;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .dispatch-batch-filter-field input,
  .dispatch-batch-filter-field select {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid #d6e4da;
    border-radius: 11px;
    outline: none;
    background: #fbfdfb;
    color: #173020;
    font: inherit;
    font-size: 0.86rem;
  }

  .dispatch-batch-filter-field input:focus,
  .dispatch-batch-filter-field select:focus {
    border-color: #159a58;
    box-shadow: 0 0 0 3px rgba(21, 154, 88, 0.12);
  }

  .dispatch-batch-filter-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #edf2ee;
  }

  .dispatch-batch-filter-footer p {
    margin: 0;
    color: #65746a;
    font-size: 0.83rem;
  }

  .dispatch-filter-clear {
    border: 0;
    background: transparent;
    color: #16794a;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
  }

  .dispatch-batch-schedule {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 6px;
    margin: 12px 0 0;
    padding: 7px 10px;
    border: 1px solid #dbe9df;
    border-radius: 999px;
    background: #f4faf6;
    color: #356146;
    font-size: 0.75rem;
    font-weight: 760;
  }

  .dispatch-batch-fulfillment-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 10px 0 13px;
  }

  .dispatch-batch-fulfillment-meta span {
    padding: 5px 8px;
    border-radius: 999px;
    background: #edf6f0;
    color: #285b3e;
    font-size: 0.65rem;
    font-weight: 800;
  }

  .dispatch-batch-fulfillment-meta .selected-time {
    border: 1px solid #a8d5b5;
    background: #dff3e5;
    color: #165f35;
  }

  .dispatch-batch-fulfillment-meta .delivery-estimate {
    border: 1px solid #ead38c;
    background: #fff7df;
    color: #735800;
  }

  .dispatch-batch-no-results {
    grid-column: 1 / -1;
    text-align: center;
  }

  @media (max-width: 1100px) {
    .dispatch-batch-filter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dispatch-batch-filter-field:first-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    .dispatch-batch-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dispatch-batch-filter-grid {
      grid-template-columns: 1fr;
    }

    .dispatch-batch-filter-field:first-child {
      grid-column: auto;
    }

    .dispatch-batch-filter-footer {
      align-items: flex-start;
      flex-direction: column;
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
  if (isInstantDelivery(row)) {
    return [instantDeliverySelectionLabel(row)];
  }

  return selectedDeliveryTimes(row).map(
    (value) => `✓ ${deliveryTimeLabel(value)}`,
  );
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

function statusKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizedDateKey(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : localDateKey(parsed);
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function explicitBatchScheduleDates(batch: FilterableDeliveryBatch): string[] {
  const candidates: unknown[] = [
    ...(Array.isArray(batch.scheduled_dates) ? batch.scheduled_dates : []),
    batch.primary_scheduled_date,
    batch.scheduled_date,
    batch.delivery_date,
  ];

  for (const stop of batch.drop_manifest || []) {
    candidates.push(
      stop.scheduled_date,
      stop.subscription_scheduled_date,
      stop.delivery_date,
    );
  }

  return Array.from(
    new Set(candidates.map(normalizedDateKey).filter(Boolean)),
  ).sort();
}

function batchScheduleDates(batch: FilterableDeliveryBatch): string[] {
  const explicitDates = explicitBatchScheduleDates(batch);
  if (explicitDates.length) return explicitDates;

  const assignedDate = normalizedDateKey(batch.created_at);
  return assignedDate ? [assignedDate] : [];
}

function batchTab(batch: FilterableDeliveryBatch, today: string): BatchTab {
  const status = statusKey(batch.status);

  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") {
    return "cancelled";
  }

  return batchScheduleDates(batch).includes(today) ? "today" : "upcoming";
}

function matchesScheduleFilter(
  batch: FilterableDeliveryBatch,
  filter: ScheduleFilter,
  today: string,
): boolean {
  if (filter === "all") return true;

  const explicitDates = explicitBatchScheduleDates(batch);
  const dates = batchScheduleDates(batch);

  if (filter === "unscheduled") {
    return explicitDates.length === 0;
  }

  if (filter === "today") return dates.includes(today);

  const tomorrow = addDays(today, 1);
  if (filter === "tomorrow") return dates.includes(tomorrow);

  if (filter === "future") {
    return dates.some((date) => date > today);
  }

  if (filter === "overdue") {
    return (
      ACTIVE_STATUSES.has(statusKey(batch.status)) &&
      dates.some((date) => date < today)
    );
  }

  const finalDay = addDays(today, 7);
  return dates.some((date) => date >= today && date <= finalDay);
}

function formatSchedule(batch: FilterableDeliveryBatch, today: string): string {
  const dates = batchScheduleDates(batch);
  if (!dates.length) return "Schedule not available";

  if (dates.includes(today)) return "Scheduled today";

  const tomorrow = addDays(today, 1);
  if (dates.includes(tomorrow)) return "Scheduled tomorrow";

  const first = new Date(`${dates[0]}T00:00:00`);
  const formatted = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(first);

  return dates.length > 1
    ? `${formatted} · ${dates.length} scheduled dates`
    : `Scheduled ${formatted}`;
}

export function DeliveryBatchesPage() {
  const [data, setData] = useState<BatchListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<BatchTab>("today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [payoutFilter, setPayoutFilter] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState("all");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("all");
  const [instantDeliveryFilter, setInstantDeliveryFilter] =
    useState<InstantDeliveryFilter>("all");
  const [sortBy, setSortBy] = useState<BatchSort>("schedule_soonest");

  useEffect(() => {
    loadDeliveryBatches()
      .then(setData)
      .catch((requestError) => {
        if (isAuthenticationError(requestError)) {
          window.location.assign("/react/login?next=/delivery/batches");
          return;
        }

        setError(
          errorMessage(requestError, "Unable to load delivery batches."),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {};
  const today = localDateKey(new Date());
  const batches = (data?.batches || []) as FilterableDeliveryBatch[];

  const tabCounts = useMemo(() => {
    const counts: Record<BatchTab, number> = {
      upcoming: 0,
      today: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const batch of batches) {
      counts[batchTab(batch, today)] += 1;
    }

    return counts;
  }, [batches, today]);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(batches.map((batch) => statusKey(batch.status))))
        .filter(Boolean)
        .sort(),
    [batches],
  );

  const payoutOptions = useMemo(
    () =>
      Array.from(
        new Set(batches.map((batch) => statusKey(batch.payout_status))),
      )
        .filter(Boolean)
        .sort(),
    [batches],
  );

  const productTypeOptions = useMemo(
    () =>
      uniqueValues(
        batches.flatMap((batch) =>
          fulfillmentValues(batch, "product_types", "product_type"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [batches],
  );

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = batches.filter((batch) => {
      if (batchTab(batch, today) !== activeTab) {
        return false;
      }

      if (statusFilter !== "all" && statusKey(batch.status) !== statusFilter) {
        return false;
      }

      if (
        payoutFilter !== "all" &&
        statusKey(batch.payout_status) !== payoutFilter
      ) {
        return false;
      }

      if (!matchesScheduleFilter(batch, scheduleFilter, today)) {
        return false;
      }

      const productTypes = fulfillmentValues(
        batch,
        "product_types",
        "product_type",
      );
      const selectedTimes = selectedDeliveryTimes(batch);
      const deliveryTypes = deliveryTypesForRecord(batch);
      const instantDelivery = isInstantDelivery(batch);

      if (
        productTypeFilter !== "all" &&
        !productTypes.some(
          (value) => value.toLowerCase() === productTypeFilter.toLowerCase(),
        )
      ) {
        return false;
      }

      if (
        deliveryTimeFilter !== "all" &&
        (deliveryTimeFilter === "both"
          ? !(
              selectedTimes.includes("morning") &&
              selectedTimes.includes("evening")
            )
          : !selectedTimes.includes(deliveryTimeFilter))
      ) {
        return false;
      }

      if (
        deliveryTypeFilter !== "all" &&
        !deliveryTypes.some(
          (value) => value.toLowerCase() === deliveryTypeFilter,
        )
      ) {
        return false;
      }

      if (
        instantDeliveryFilter === "instant_only" &&
        !instantDelivery
      ) {
        return false;
      }

      if (
        instantDeliveryFilter === "exclude_instant" &&
        instantDelivery
      ) {
        return false;
      }

      if (!query) return true;

      return [
        batch.batch_number,
        batch.status,
        batch.payout_status,
        batch.id,
        ...productTypes,
        ...selectedTimes,
        ...deliveryTypes,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });

    return rows.sort((left, right) => {
      const leftSchedule = batchScheduleDates(left)[0] || "9999-12-31";
      const rightSchedule = batchScheduleDates(right)[0] || "9999-12-31";
      const leftCreated = String(left.created_at || "");
      const rightCreated = String(right.created_at || "");
      const leftPayout = Number(left.payout_amount || 0);
      const rightPayout = Number(right.payout_amount || 0);

      switch (sortBy) {
        case "schedule_latest":
          return rightSchedule.localeCompare(leftSchedule);
        case "newest":
          return rightCreated.localeCompare(leftCreated);
        case "oldest":
          return leftCreated.localeCompare(rightCreated);
        case "payout_high":
          return rightPayout - leftPayout;
        case "payout_low":
          return leftPayout - rightPayout;
        default:
          return leftSchedule.localeCompare(rightSchedule);
      }
    });
  }, [
    activeTab,
    batches,
    deliveryTimeFilter,
    deliveryTypeFilter,
    instantDeliveryFilter,
    payoutFilter,
    productTypeFilter,
    scheduleFilter,
    search,
    sortBy,
    statusFilter,
    today,
  ]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setScheduleFilter("all");
    setPayoutFilter("all");
    setProductTypeFilter("all");
    setDeliveryTimeFilter("all");
    setDeliveryTypeFilter("all");
    setInstantDeliveryFilter("all");
    setSortBy("schedule_soonest");
  };

  const tabs: Array<{
    key: BatchTab;
    text: string;
  }> = [
    { key: "upcoming", text: "Upcoming" },
    { key: "today", text: "Today" },
    { key: "completed", text: "Completed" },
    { key: "cancelled", text: "Cancelled" },
  ];

  return (
    <>
      <style>{BATCH_FILTER_STYLES}</style>

      <main className="dispatch-page">
        <div className="dispatch-page-container">
          <section className="dispatch-heading-react">
            <div>
              <span className="dispatch-eyebrow">Delivery person</span>
              <h1>My Bulk Delivery Batches</h1>
              <p>
                Follow seller pickup sequences, customer drops, COD collections,
                and payout progress.
              </p>
            </div>

            <Link className="dispatch-button secondary" to="/dashboard">
              Dashboard
            </Link>
          </section>

          <nav
            className="dispatch-batch-tabs"
            aria-label="Delivery batch categories"
          >
            {tabs.map((tab) => (
              <button
                className={`dispatch-batch-tab ${
                  activeTab === tab.key ? "active" : ""
                }`}
                type="button"
                key={tab.key}
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.text}
                <span className="dispatch-batch-tab-count">
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </nav>

          <section
            className="dispatch-batch-filter-panel"
            aria-label="Delivery batch filters"
          >
            <div className="dispatch-batch-filter-grid">
              <label className="dispatch-batch-filter-field">
                <span>Search</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Batch number or status"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Batch status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>
                      {label(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Schedule</span>
                <select
                  value={scheduleFilter}
                  onChange={(event) =>
                    setScheduleFilter(event.target.value as ScheduleFilter)
                  }
                >
                  <option value="all">All schedules</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="next_7_days">Next 7 days</option>
                  <option value="future">All future</option>
                  <option value="overdue">Overdue active</option>
                  <option value="unscheduled">No explicit schedule</option>
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Payout status</span>
                <select
                  value={payoutFilter}
                  onChange={(event) => setPayoutFilter(event.target.value)}
                >
                  <option value="all">All payouts</option>
                  {payoutOptions.map((status) => (
                    <option value={status} key={status}>
                      {label(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Product type</span>
                <select
                  value={productTypeFilter}
                  onChange={(event) =>
                    setProductTypeFilter(event.target.value)
                  }
                >
                  <option value="all">All product types</option>
                  {productTypeOptions.map((productType) => (
                    <option value={productType} key={productType}>
                      {productType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Customer selected time</span>
                <select
                  value={deliveryTimeFilter}
                  onChange={(event) =>
                    setDeliveryTimeFilter(event.target.value)
                  }
                >
                  <option value="all">All selected times</option>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="both">Morning &amp; Evening</option>
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Delivery speed</span>
                <select
                  value={deliveryTypeFilter}
                  onChange={(event) =>
                    setDeliveryTypeFilter(event.target.value)
                  }
                >
                  <option value="all">All delivery speeds</option>
                  <option value="instant_delivery">Instant Delivery</option>
                  <option value="one_day_delivery">One-Day Delivery</option>
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Instant delivery</span>
                <select
                  value={instantDeliveryFilter}
                  onChange={(event) =>
                    setInstantDeliveryFilter(
                      event.target.value as InstantDeliveryFilter,
                    )
                  }
                >
                  <option value="all">All batches</option>
                  <option value="instant_only">Instant delivery only</option>
                  <option value="exclude_instant">Non-instant only</option>
                </select>
              </label>

              <label className="dispatch-batch-filter-field">
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as BatchSort)
                  }
                >
                  <option value="schedule_soonest">Schedule: soonest</option>
                  <option value="schedule_latest">Schedule: latest</option>
                  <option value="newest">Newest batch</option>
                  <option value="oldest">Oldest batch</option>
                  <option value="payout_high">Payout: high to low</option>
                  <option value="payout_low">Payout: low to high</option>
                </select>
              </label>
            </div>

            <div className="dispatch-batch-filter-footer">
              <p>
                Showing <strong>{filteredBatches.length}</strong> of{" "}
                {tabCounts[activeTab]} {label(activeTab)} batches
              </p>
              <button
                className="dispatch-filter-clear"
                type="button"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="dispatch-stat-grid-react">
            <article>
              <strong>{summary.total_batches || 0}</strong>
              <span>Total batches</span>
            </article>
            <article>
              <strong>{summary.active_batches || 0}</strong>
              <span>Active batches</span>
            </article>
            <article>
              <strong>{summary.assigned_orders || 0}</strong>
              <span>Assigned customer orders</span>
            </article>
            <article>
              <strong>
                {data?.currency_symbol || "₹"}
                {Number(summary.pending_payout_amount || 0).toFixed(2)}
              </strong>
              <span>Pending payout</span>
            </article>
            <article>
              <strong>
                {data?.currency_symbol || "₹"}
                {Number(summary.pending_cod_collection || 0).toFixed(2)}
              </strong>
              <span>COD to collect</span>
            </article>
          </section>

          {error && <div className="dispatch-notice error">{error}</div>}

          {loading ? (
            <div className="dispatch-loading">Loading delivery batches…</div>
          ) : filteredBatches.length > 0 ? (
            <section className="dispatch-batch-grid">
              {filteredBatches.map((batch) => {
                const instantDelivery = isInstantDelivery(batch);
                const selectedTimeLabels = customerSelectedTimeLabels(batch);
                const deliveryTypes = deliveryTypesForRecord(batch);
                const batchWindows = deliveryWindows(batch);

                return (
                <article className="dispatch-card" key={batch.id}>
                  <div className="dispatch-batch-card-heading">
                    <div>
                      <strong>{batch.batch_number}</strong>
                      <small>
                        {batch.order_count || 0} orders ·{" "}
                        {batch.pickup_count || 0} pickups ·{" "}
                        {batch.drop_count || 0} drops
                      </small>
                      <span className="dispatch-batch-schedule">
                        ◷ {formatSchedule(batch, today)}
                      </span>
                      <div className="dispatch-batch-fulfillment-meta">
                        {fulfillmentValues(
                          batch,
                          "product_types",
                          "product_type",
                        ).map((value) => (
                          <span key={`product-${value}`}>Product: {value}</span>
                        ))}
                        {selectedTimeLabels.map((value) => (
                          <span
                            className="selected-time"
                            key={`time-${value}`}
                          >
                            Customer selected: {value}
                          </span>
                        ))}
                        {deliveryTypes.map((value) => (
                          <span key={`speed-${value}`}>
                            Speed: {deliveryTypeLabel(value)}
                          </span>
                        ))}
                        {batchWindows.map((window, index) => (
                          <span
                            className="delivery-estimate"
                            key={`estimate-${window.start_at || window.date || index}`}
                          >
                            {deliveryWindowPrefix(batch, window)}:{" "}
                            {deliveryEstimateLabel(window)}
                          </span>
                        ))}
                        <span>
                          Delivery status: {label(batch.delivery_status || batch.status || "scheduled")}
                        </span>
                      </div>
                    </div>

                    <span className={`dispatch-status ${batch.status}`}>
                      {label(batch.status)}
                    </span>
                  </div>

                  <div className="dispatch-batch-metrics">
                    <div>
                      <span>Route</span>
                      <strong>
                        {Number(batch.estimated_route_km || 0).toFixed(2)} km
                      </strong>
                    </div>
                    <div>
                      <span>Payout</span>
                      <strong>
                        {data?.currency_symbol || "₹"}
                        {Number(batch.payout_amount || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span>COD</span>
                      <strong>
                        {data?.currency_symbol || "₹"}
                        {Number(batch.cod_collection_amount || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <Link
                    className="dispatch-button primary full"
                    to={`/delivery/batches/${batch.id}`}
                  >
                    Open Route
                  </Link>
                  <Link
                    className="dispatch-button secondary full"
                    to={`/delivery/batches/${batch.id}#support`}
                  >
                    Raise Issue
                  </Link>
                </article>
                );
              })}
            </section>
          ) : batches.length > 0 ? (
            <section className="dispatch-card dispatch-empty">
              <h2>No matching {label(activeTab)} batches</h2>
              <p>
                Change the filters or choose another menu to see other delivery
                batches.
              </p>
              <button
                className="dispatch-button secondary"
                type="button"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            </section>
          ) : (
            <section className="dispatch-card dispatch-empty">
              <h2>No delivery batch assigned</h2>
              <p>
                New bulk routes assigned by the administrator or delivery
                manager will appear here.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
