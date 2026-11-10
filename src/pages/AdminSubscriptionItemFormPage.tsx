import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  SUBSCRIPTION_WEEKDAYS,
  adminSubscriptionAssetUrl,
  isAdminSubscriptionAuthenticationError,
  loadAdminSubscriptionItem,
  saveAdminSubscriptionItem,
  uploadAdminSubscriptionImage,
  type AdminCatalogChoice,
  type AdminDeliveryExclusion,
  type AdminScheduleEntry,
  type AdminSubscriptionCombination,
} from "../services/adminSubscriptionsApi";
import "../styles/admin-subscriptions.css";

const PLANS = [
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["three_months", "3 months"],
  ["custom", "Custom days"],
];

function newId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function nice(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function newWeekdays(): AdminScheduleEntry[] {
  return SUBSCRIPTION_WEEKDAYS.map((weekday, index) => ({
    id: "schedule-weekday-" + weekday,
    scope: "weekday",
    weekday,
    weekday_index: index,
    title: "",
    description: "",
    image_url: "",
    is_active: weekday !== "sunday",
  }));
}

function ImageBox(props: { file?: File | null; url?: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!props.file) {
      setSrc(adminSubscriptionAssetUrl(props.url));
      return;
    }
    const objectUrl = URL.createObjectURL(props.file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [props.file, props.url]);
  return src ? (
    <img src={src} alt={props.label} />
  ) : (
    <div className="sa-image-placeholder">4:5</div>
  );
}

type Fields = {
  id: string;
  serial_number: number;
  source_catalog_item_id: string;
  name: string;
  slug: string;
  sku: string;
  unit_label: string;
  description: string;
  detailed_description: string;
  weekly_price: string;
  monthly_price: string;
  three_months_price: string;
  custom_price_per_day: string;
  allowed_plan_codes: string[];
  minimum_custom_days: number;
  is_active: boolean;
  complimentary_max_items: number;
  complimentary_budget: string;
  complimentary_item_ids: string[];
  image_url: string;
  remove_image: boolean;
};

const EMPTY: Fields = {
  id: "",
  serial_number: 1,
  source_catalog_item_id: "",
  name: "",
  slug: "",
  sku: "",
  unit_label: "",
  description: "",
  detailed_description: "",
  weekly_price: "",
  monthly_price: "",
  three_months_price: "",
  custom_price_per_day: "",
  allowed_plan_codes: ["weekly"],
  minimum_custom_days: 7,
  is_active: true,
  complimentary_max_items: 0,
  complimentary_budget: "0.00",
  complimentary_item_ids: [],
  image_url: "",
  remove_image: false,
};

export function AdminSubscriptionItemFormPage() {
  const params = useParams();
  const categoryId = params.categoryId || "";
  const itemId = params.itemId;
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [categoryName, setCategoryName] = useState("");
  const [catalogItems, setCatalogItems] = useState<AdminCatalogChoice[]>([]);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [weekdays, setWeekdays] = useState<AdminScheduleEntry[]>(newWeekdays);
  const [dates, setDates] = useState<AdminScheduleEntry[]>([]);
  const [excludedWeekdays, setExcludedWeekdays] = useState<string[]>(["sunday"]);
  const [holidays, setHolidays] = useState<AdminDeliveryExclusion[]>([]);
  const [combinations, setCombinations] = useState<AdminSubscriptionCombination[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});

  function field<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await loadAdminSubscriptionItem(categoryId, itemId);
        if (cancelled) return;
        const item = payload.item;
        setToken(payload.subscription_csrf_token);
        setCurrency(payload.currency_symbol || "₹");
        setCategoryName(payload.category.name || "");
        setCatalogItems(payload.catalog_items || []);
        setFields({
          id: item?.id || newId("subscription-item-react"),
          serial_number: Number(item?.serial_number || (payload.category.items?.length || 0) + 1),
          source_catalog_item_id: item?.source_catalog_item_id || "",
          name: item?.name || "",
          slug: item?.slug || "",
          sku: item?.sku || "",
          unit_label: item?.unit_label || "",
          description: item?.description || "",
          detailed_description: item?.detailed_description || item?.description || "",
          weekly_price: String(item?.plan_prices?.weekly ?? item?.base_price ?? ""),
          monthly_price: String(item?.plan_prices?.monthly ?? ""),
          three_months_price: String(item?.plan_prices?.three_months ?? ""),
          custom_price_per_day: String(item?.plan_prices?.custom_per_day ?? ""),
          allowed_plan_codes: item?.allowed_plan_codes?.length ? [...item.allowed_plan_codes] : ["weekly"],
          minimum_custom_days: Number(item?.minimum_custom_days || 7),
          is_active: item ? Boolean(item.is_active) : true,
          complimentary_max_items: Number(item?.complimentary_config?.max_items || 0),
          complimentary_budget: String(item?.complimentary_config?.budget ?? "0.00"),
          complimentary_item_ids: [...(item?.complimentary_config?.eligible_item_ids || [])],
          image_url: item?.image_url || "",
          remove_image: false,
        });
        const byDay = new Map(
          (item?.content_schedule?.weekday_entries || []).map((row) => [row.weekday, row]),
        );
        setWeekdays(
          newWeekdays().map((row) => ({
            ...row,
            ...(byDay.get(row.weekday) || {}),
            scope: "weekday",
          })),
        );
        setDates(
          (item?.content_schedule?.date_entries || []).map((row) => ({
            ...row,
            scope: "date",
          })),
        );
        setExcludedWeekdays(
          item ? [...(item.delivery_exclusions?.excluded_weekdays || [])] : ["sunday"],
        );
        setHolidays(
          (item?.delivery_exclusions?.excluded_dates || []).map((row) => ({
            date: row.date,
            reason: row.reason || "",
          })),
        );
        setCombinations(
          (item?.catalog_combinations || []).map((row) => ({
            ...row,
            sub_items: (row.sub_items || row.item_details || []).map((sub) => ({ ...sub })),
          })),
        );
      } catch (requestError) {
        if (isAdminSubscriptionAuthenticationError(requestError)) {
          navigate("/react/login?next=" + encodeURIComponent(location.pathname), { replace: true });
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [categoryId, itemId, location.pathname, navigate]);

  function weekdayPatch(day: string, patchValue: Partial<AdminScheduleEntry>) {
    setWeekdays((current) =>
      current.map((row) => row.weekday === day ? { ...row, ...patchValue } : row),
    );
  }

  function datePatch(id: string, patchValue: Partial<AdminScheduleEntry>) {
    setDates((current) =>
      current.map((row) => row.id === id ? { ...row, ...patchValue } : row),
    );
  }

  function addCombination() {
    setCombinations((current) => [
      ...current,
      { id: newId("subscription-combination"), name: "Combination " + (current.length + 1), description: "", sub_items: [] },
    ]);
  }

  function combinationPatch(index: number, patchValue: Partial<AdminSubscriptionCombination>) {
    setCombinations((current) =>
      current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patchValue } : row),
    );
  }

  function addSubItem(combinationIndex: number, sourceId?: string) {
    const source = catalogItems.find((item) => item.id === sourceId);
    setCombinations((current) =>
      current.map((row, index) =>
        index !== combinationIndex ? row : {
          ...row,
          sub_items: [
            ...(row.sub_items || []),
            {
              id: newId("subscription-sub-item"),
              source_catalog_item_id: source?.id || "",
              name: source?.name || "",
              sku: source?.sku || "",
              slug: source?.slug || "",
              unit_label: source?.unit_label || "",
              description: source?.description || "",
              quantity: 1,
            },
          ],
        },
      ),
    );
  }

  function subItemPatch(combinationIndex: number, subIndex: number, patchValue: Record<string, unknown>) {
    setCombinations((current) =>
      current.map((row, index) =>
        index !== combinationIndex ? row : {
          ...row,
          sub_items: (row.sub_items || []).map((sub, itemIndex) =>
            itemIndex === subIndex ? { ...sub, ...patchValue } : sub,
          ),
        },
      ),
    );
  }

  function validate() {
    if (!fields.name.trim() && !fields.source_catalog_item_id) return "Enter an item name or select a source item.";
    if (!fields.allowed_plan_codes.length) return "Select at least one plan.";
    if (excludedWeekdays.length === SUBSCRIPTION_WEEKDAYS.length) return "At least one delivery weekday must remain.";
    const scheduleDates = dates.map((row) => row.schedule_date || "");
    if (scheduleDates.some((value) => !value)) return "Every exact-date slide needs a date.";
    if (new Set(scheduleDates).size !== scheduleDates.length) return "Exact-date slides must use unique dates.";
    const blockedDates = holidays.map((row) => row.date || "");
    if (blockedDates.some((value) => !value)) return "Every holiday needs a date.";
    if (new Set(blockedDates).size !== blockedDates.length) return "Holiday dates must be unique.";
    return "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    setError("");
    setProgress("Saving schedule and subscription details…");
    let operation = "saving subscription details";
    try {
      const saved = await saveAdminSubscriptionItem({
        ...fields,
        category_id: categoryId,
        catalog_combinations_json: JSON.stringify(combinations),
        content_schedule: { weekday_entries: weekdays, date_entries: dates },
        delivery_exclusions: {
          excluded_weekdays: excludedWeekdays,
          excluded_dates: holidays,
        },
        subscription_csrf_token: token,
      });
      let currentToken = saved.subscription_csrf_token || token;
      const uploads: Array<{ key: string; type: "item" | "weekday" | "date"; target: string }> = [];
      if (files.item) uploads.push({ key: "item", type: "item", target: "" });
      weekdays.forEach((row) => {
        const key = "weekday:" + row.weekday;
        if (files[key]) uploads.push({ key, type: "weekday", target: String(row.weekday || "") });
      });
      dates.forEach((row) => {
        const key = "date:" + row.id;
        if (files[key]) uploads.push({ key, type: "date", target: row.id });
      });
      for (let index = 0; index < uploads.length; index += 1) {
        const upload = uploads[index];
        const image = files[upload.key];
        if (!image) continue;
        operation =
          "uploading image " + (index + 1) + " of " + uploads.length;
        setProgress("Uploading image " + (index + 1) + " of " + uploads.length + "…");
        const result = await uploadAdminSubscriptionImage({
          itemId: fields.id,
          targetType: upload.type,
          targetKey: upload.target,
          file: image,
          subscriptionCsrfToken: currentToken,
        });
        currentToken = result.subscription_csrf_token || currentToken;
      }
      window.dispatchEvent(new Event("admin-dashboard-updated"));
      navigate("/admin/subscriptions", {
        replace: true,
        state: { message: "Subscription item saved with its delivery schedule." },
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to save item.";
      setError("Error while " + operation + ": " + message);
      setProgress("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="sa-page"><section className="sa-panel sa-loading">Loading subscription item…</section></main>;
  }

  return (
    <main className="sa-page">
      <div className="sa-container">
        <section className="sa-heading">
          <div>
            <span className="sa-eyebrow">{categoryName}</span>
            <h1>{itemId ? "Edit subscription item" : "Add subscription item"}</h1>
            <p>Manage the customer card, plans, 4:5 carousel and delivery calendar.</p>
          </div>
          <Link className="sa-button ghost" to="/admin/subscriptions">Cancel</Link>
        </section>
        {error && <div className="sa-alert error">{error}</div>}
        {progress && <div className="sa-alert info">{progress}</div>}

        <form className="sa-editor" onSubmit={submit}>
          <section className="sa-panel sa-form">
            <div className="sa-section-title"><span>1</span><div><h2>Item details</h2><p>Customer-facing subscription information.</p></div></div>
            <div className="sa-form-grid two">
              <label className="full"><span>Source catalogue item</span><div className="sa-inline-input">
                <select value={fields.source_catalog_item_id} onChange={(event) => field("source_catalog_item_id", event.target.value)}>
                  <option value="">Custom item</option>
                  {catalogItems.map((item) => <option key={item.id} value={item.id}>{(item.category_name ? item.category_name + " · " : "") + item.name}</option>)}
                </select>
                <button className="sa-button secondary" type="button" onClick={() => {
                  const source = catalogItems.find((row) => row.id === fields.source_catalog_item_id);
                  if (!source) return;
                  setFields((current) => ({
                    ...current,
                    name: current.name || source.name,
                    slug: current.slug || source.slug || "",
                    sku: current.sku || source.sku || "",
                    unit_label: current.unit_label || source.unit_label || "",
                    description: current.description || source.description || "",
                    detailed_description: current.detailed_description || source.description || "",
                  }));
                }}>Fill empty fields</button>
              </div></label>
              <label><span>Name *</span><input value={fields.name} onChange={(event) => field("name", event.target.value)} /></label>
              <label><span>Slug</span><input value={fields.slug} onChange={(event) => field("slug", event.target.value)} placeholder="Generated from name" /></label>
              <label><span>SKU</span><input value={fields.sku} onChange={(event) => field("sku", event.target.value)} /></label>
              <label><span>Unit label</span><input value={fields.unit_label} onChange={(event) => field("unit_label", event.target.value)} placeholder="500 ml bottle" /></label>
              <label><span>Display order</span><input type="number" min="1" value={fields.serial_number} onChange={(event) => field("serial_number", Number(event.target.value))} /></label>
              <label className="sa-check"><input type="checkbox" checked={fields.is_active} onChange={(event) => field("is_active", event.target.checked)} /><span>Item is active</span></label>
              <label className="full"><span>Short description</span><textarea rows={3} value={fields.description} onChange={(event) => field("description", event.target.value)} /></label>
              <label className="full"><span>Detailed subscription description</span><textarea rows={7} value={fields.detailed_description} onChange={(event) => field("detailed_description", event.target.value)} /></label>
            </div>
            <div className="sa-upload-row">
              <div className="sa-upload-preview portrait"><ImageBox file={files.item} url={fields.remove_image ? "" : fields.image_url} label="Subscription item" /></div>
              <div><h3>Main 4:5 image</h3><p>The main customer-facing card image. Large images are compressed before upload.</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const image = event.target.files?.[0] || null;
                  setFiles((current) => ({ ...current, item: image }));
                  if (image) field("remove_image", false);
                }} />
                {fields.image_url && <label className="sa-check"><input type="checkbox" checked={fields.remove_image} onChange={(event) => {
                  field("remove_image", event.target.checked);
                  if (event.target.checked) setFiles((current) => ({ ...current, item: null }));
                }} /><span>Remove current image</span></label>}
              </div>
            </div>
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title"><span>2</span><div><h2>Plans and pricing</h2><p>Choose the plans shown to customers.</p></div></div>
            <div className="sa-plan-options">
              {PLANS.map(([code, planLabel]) => <label className="sa-check" key={code}><input type="checkbox" checked={fields.allowed_plan_codes.includes(code)} onChange={(event) => field("allowed_plan_codes", event.target.checked ? [...fields.allowed_plan_codes, code] : fields.allowed_plan_codes.filter((value) => value !== code))} /><span>{planLabel}</span></label>)}
            </div>
            <div className="sa-form-grid four">
              <label><span>Weekly ({currency})</span><input type="number" min="0" step="0.01" value={fields.weekly_price} onChange={(event) => field("weekly_price", event.target.value)} /></label>
              <label><span>Monthly ({currency})</span><input type="number" min="0" step="0.01" value={fields.monthly_price} onChange={(event) => field("monthly_price", event.target.value)} /></label>
              <label><span>3 months ({currency})</span><input type="number" min="0" step="0.01" value={fields.three_months_price} onChange={(event) => field("three_months_price", event.target.value)} /></label>
              <label><span>Custom / day ({currency})</span><input type="number" min="0" step="0.01" value={fields.custom_price_per_day} onChange={(event) => field("custom_price_per_day", event.target.value)} /></label>
              <label><span>Minimum custom days</span><input type="number" min="1" max="365" value={fields.minimum_custom_days} onChange={(event) => field("minimum_custom_days", Number(event.target.value))} /></label>
            </div>
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title"><span>3</span><div><h2>Weekly 4:5 carousel</h2><p>Monday–Saturday are active by default. Sunday is optional.</p></div></div>
            <div className="sa-schedule-grid">
              {weekdays.map((row) => {
                const day = String(row.weekday || "");
                const fileKey = "weekday:" + day;
                return <article className="sa-schedule-card" key={row.id}>
                  <div className="sa-schedule-preview"><ImageBox file={files[fileKey]} url={row.remove_image ? "" : row.image_url} label={nice(day)} /><strong>{nice(day)}</strong></div>
                  <label className="sa-check"><input type="checkbox" checked={row.is_active} onChange={(event) => weekdayPatch(day, { is_active: event.target.checked })} /><span>Show slide</span></label>
                  <label><span>Title</span><input value={row.title || ""} onChange={(event) => weekdayPatch(day, { title: event.target.value })} /></label>
                  <label><span>Description</span><textarea rows={3} value={row.description || ""} onChange={(event) => weekdayPatch(day, { description: event.target.value })} /></label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const image = event.target.files?.[0] || null;
                    setFiles((current) => ({ ...current, [fileKey]: image }));
                    if (image) weekdayPatch(day, { remove_image: false });
                  }} />
                  {row.image_url && <label className="sa-check"><input type="checkbox" checked={Boolean(row.remove_image)} onChange={(event) => {
                    weekdayPatch(day, { remove_image: event.target.checked });
                    if (event.target.checked) setFiles((current) => ({ ...current, [fileKey]: null }));
                  }} /><span>Remove image</span></label>}
                </article>;
              })}
            </div>
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title with-action"><span>4</span><div><h2>Exact-date carousel slides</h2><p>Override weekly content for one specific date.</p></div><button className="sa-button secondary" type="button" onClick={() => setDates((current) => [...current, { id: newId("schedule-date"), scope: "date", schedule_date: "", title: "", description: "", image_url: "", is_active: true }])}>Add date slide</button></div>
            <div className="sa-date-list">
              {dates.map((row) => {
                const fileKey = "date:" + row.id;
                return <article className="sa-date-row" key={row.id}>
                  <div className="sa-date-preview"><ImageBox file={files[fileKey]} url={row.remove_image ? "" : row.image_url} label="Date slide" /></div>
                  <div className="sa-form-grid two grow">
                    <label><span>Date *</span><input type="date" value={row.schedule_date || ""} onChange={(event) => datePatch(row.id, { schedule_date: event.target.value })} /></label>
                    <label><span>Title</span><input value={row.title || ""} onChange={(event) => datePatch(row.id, { title: event.target.value })} /></label>
                    <label className="full"><span>Description</span><textarea rows={3} value={row.description || ""} onChange={(event) => datePatch(row.id, { description: event.target.value })} /></label>
                    <label className="sa-check"><input type="checkbox" checked={row.is_active} onChange={(event) => datePatch(row.id, { is_active: event.target.checked })} /><span>Show slide</span></label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                      const image = event.target.files?.[0] || null;
                      setFiles((current) => ({ ...current, [fileKey]: image }));
                      if (image) datePatch(row.id, { remove_image: false });
                    }} />
                    {row.image_url && <label className="sa-check"><input type="checkbox" checked={Boolean(row.remove_image)} onChange={(event) => {
                      datePatch(row.id, { remove_image: event.target.checked });
                      if (event.target.checked) setFiles((current) => ({ ...current, [fileKey]: null }));
                    }} /><span>Remove image</span></label>}
                  </div>
                  <button className="sa-icon-button danger" type="button" onClick={() => setDates((current) => current.filter((entry) => entry.id !== row.id))}>×</button>
                </article>;
              })}
              {!dates.length && <div className="sa-empty compact">No exact-date slides.</div>}
            </div>
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title"><span>5</span><div><h2>Delivery exclusions and holidays</h2><p>Every skipped holiday extends the schedule by one delivery day.</p></div></div>
            <h3>No-delivery weekdays</h3>
            <div className="sa-weekday-options">{SUBSCRIPTION_WEEKDAYS.map((day) => <label className={"sa-day-toggle " + (excludedWeekdays.includes(day) ? "selected" : "")} key={day}><input type="checkbox" checked={excludedWeekdays.includes(day)} onChange={() => setExcludedWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])} /><span>{nice(day)}</span></label>)}</div>
            <div className="sa-subheading"><div><h3>Festival / holiday dates</h3><p>Use a reason such as Diwali or maintenance.</p></div><button className="sa-button secondary small" type="button" onClick={() => setHolidays((current) => [...current, { date: "", reason: "" }])}>Add holiday</button></div>
            <div className="sa-holiday-list">
              {holidays.map((row, index) => <div className="sa-holiday-row" key={index}>
                <input type="date" value={row.date || ""} onChange={(event) => setHolidays((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, date: event.target.value } : entry))} />
                <input value={row.reason || ""} onChange={(event) => setHolidays((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, reason: event.target.value } : entry))} placeholder="Holiday reason" />
                <button className="sa-icon-button danger" type="button" onClick={() => setHolidays((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button>
              </div>)}
              {!holidays.length && <div className="sa-empty compact">No holiday dates.</div>}
            </div>
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title with-action"><span>6</span><div><h2>Subscription combinations</h2><p>Bundle catalogue or custom items.</p></div><button className="sa-button secondary" type="button" onClick={addCombination}>Add combination</button></div>
            {combinations.map((combination, comboIndex) => <article className="sa-combination" key={combination.id}>
              <div className="sa-subheading"><h3>Combination {comboIndex + 1}</h3><button className="sa-button danger small" type="button" onClick={() => setCombinations((current) => current.filter((_, index) => index !== comboIndex))}>Remove</button></div>
              <div className="sa-form-grid two">
                <label><span>Name</span><input value={combination.name || ""} onChange={(event) => combinationPatch(comboIndex, { name: event.target.value })} /></label>
                <label><span>Description</span><input value={combination.description || ""} onChange={(event) => combinationPatch(comboIndex, { description: event.target.value })} /></label>
              </div>
              <div className="sa-inline-input"><select defaultValue="" onChange={(event) => { if (event.target.value) addSubItem(comboIndex, event.target.value); event.target.value = ""; }}><option value="">Add catalogue item…</option>{catalogItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="sa-button ghost small" type="button" onClick={() => addSubItem(comboIndex)}>Add custom item</button></div>
              <div className="sa-subitem-list">{(combination.sub_items || []).map((sub, subIndex) => <div className="sa-subitem" key={sub.id}>
                <input value={sub.name || ""} onChange={(event) => subItemPatch(comboIndex, subIndex, { name: event.target.value })} placeholder="Item name" />
                <input value={sub.unit_label || ""} onChange={(event) => subItemPatch(comboIndex, subIndex, { unit_label: event.target.value })} placeholder="Unit" />
                <input type="number" min="1" max="100" value={sub.quantity || 1} onChange={(event) => subItemPatch(comboIndex, subIndex, { quantity: Number(event.target.value) })} />
                <button className="sa-icon-button danger" type="button" onClick={() => combinationPatch(comboIndex, { sub_items: (combination.sub_items || []).filter((_, index) => index !== subIndex) })}>×</button>
              </div>)}</div>
            </article>)}
            {!combinations.length && <div className="sa-empty compact">No combinations configured.</div>}
          </section>

          <section className="sa-panel sa-form">
            <div className="sa-section-title"><span>7</span><div><h2>Complimentary choices</h2><p>Optional free normal-catalogue items.</p></div></div>
            <div className="sa-form-grid two">
              <label><span>Maximum choices</span><input type="number" min="0" max="50" value={fields.complimentary_max_items} onChange={(event) => field("complimentary_max_items", Number(event.target.value))} /></label>
              <label><span>Maximum value ({currency})</span><input type="number" min="0" step="0.01" value={fields.complimentary_budget} onChange={(event) => field("complimentary_budget", event.target.value)} /></label>
            </div>
            <div className="sa-choice-grid">{catalogItems.map((item) => <label className="sa-choice" key={item.id}><input type="checkbox" checked={fields.complimentary_item_ids.includes(item.id)} onChange={(event) => field("complimentary_item_ids", event.target.checked ? [...fields.complimentary_item_ids, item.id] : fields.complimentary_item_ids.filter((id) => id !== item.id))} />{item.image_url ? <img src={adminSubscriptionAssetUrl(item.image_url)} alt="" /> : <span className="sa-choice-image">+</span>}<span><strong>{item.name}</strong><small>{item.unit_label || item.category_name || "Catalogue item"}</small></span></label>)}</div>
          </section>

          <div className="sa-sticky-save">
            <div><strong>{fields.name || "New subscription item"}</strong><span>{progress || "Save to apply all schedule changes."}</span></div>
            <div className="sa-actions"><Link className="sa-button ghost" to="/admin/subscriptions">Cancel</Link><button className="sa-button primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save subscription item"}</button></div>
          </div>
        </form>
      </div>
    </main>
  );
}
