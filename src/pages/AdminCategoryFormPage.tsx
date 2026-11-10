import "../styles/catalog-variants.css";
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
  useParams,
} from "react-router-dom";

import {
  createAdminCategory,
  isCoreAuthenticationError,
  isCoreCsrfError,
  loadAdminCatalog,
  loadAdminCategory,
  updateAdminCategory,
  type CatalogCategory,
} from "../services/coreCommerceApi";
import "../styles/core-admin.css";

/** Only affects the Create/Edit Category page; no shared stylesheet changes. */
const CATEGORY_FORM_STYLES = `
  .ca-page.rudra-admin-category-form {
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
  .ca-page.rudra-admin-category-form *,
  .ca-page.rudra-admin-category-form *::before,
  .ca-page.rudra-admin-category-form *::after { box-sizing: border-box; }
  .ca-page.rudra-admin-category-form .ca-page-container,
  .ca-page.rudra-admin-category-form .ca-form-shell {
    display: block;
    width: 100% !important;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
  }
  .ca-page.rudra-admin-category-form .ca-form-card {
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
  .ca-page.rudra-admin-category-form .ca-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin: 0;
    padding: 0 0 20px;
    border-bottom: 1px solid var(--rudra-border);
  }
  .ca-page.rudra-admin-category-form .ca-section-heading > div { min-width: 0; }
  .ca-page.rudra-admin-category-form .ca-eyebrow {
    color: var(--rudra-maroon) !important;
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
  }
  .ca-page.rudra-admin-category-form .ca-section-heading h1 {
    margin: 5px 0 9px;
    color: var(--rudra-maroon-deep) !important;
    font-size: clamp(1.65rem, 2.4vw, 2.55rem);
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -.035em;
  }
  .ca-page.rudra-admin-category-form .ca-section-heading p {
    max-width: 760px;
    margin: 0;
    color: var(--rudra-muted);
    line-height: 1.55;
  }
  .ca-page.rudra-admin-category-form .ca-two-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 18px 22px;
    width: 100%;
    min-width: 0;
  }
  .ca-page.rudra-admin-category-form .ca-form-card > label:not(.ca-checkbox-card),
  .ca-page.rudra-admin-category-form .ca-two-column > label,
  .ca-page.rudra-admin-category-form .ca-image-inputs > label:not(.ca-checkbox-card) {
    display: grid;
    align-content: start;
    gap: 8px;
    min-width: 0;
    color: var(--rudra-ink);
    font-size: .9rem;
    font-weight: 750;
  }
  .ca-page.rudra-admin-category-form .ca-form-card label small {
    display: block;
    color: var(--rudra-muted);
    font-size: .76rem;
    font-weight: 450;
    line-height: 1.5;
  }
  .ca-page.rudra-admin-category-form .ca-form-card input[type='text'],
  .ca-page.rudra-admin-category-form .ca-form-card input[type='number'],
  .ca-page.rudra-admin-category-form .ca-form-card input[type='date'],
  .ca-page.rudra-admin-category-form .ca-form-card input[type='file'],
  .ca-page.rudra-admin-category-form .ca-form-card select,
  .ca-page.rudra-admin-category-form .ca-form-card textarea {
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
  .ca-page.rudra-admin-category-form .ca-form-card input[type='file'] {
    min-height: auto;
    padding: 10px;
    cursor: pointer;
  }
  .ca-page.rudra-admin-category-form .ca-form-card input[type='file']::file-selector-button {
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
  .ca-page.rudra-admin-category-form .ca-form-card textarea {
    min-height: 112px;
    resize: vertical;
  }
  .ca-page.rudra-admin-category-form .ca-form-card input:focus-visible,
  .ca-page.rudra-admin-category-form .ca-form-card select:focus-visible,
  .ca-page.rudra-admin-category-form .ca-form-card textarea:focus-visible,
  .ca-page.rudra-admin-category-form .ca-button:focus-visible {
    outline: 2px solid var(--rudra-gold) !important;
    outline-offset: 2px;
    border-color: var(--rudra-maroon) !important;
    box-shadow: 0 0 0 4px rgba(85, 17, 31, .08);
  }
  .ca-page.rudra-admin-category-form .ca-form-card input[type='checkbox'] {
    width: 17px;
    height: 17px;
    flex: 0 0 17px;
    margin: 0;
    accent-color: var(--rudra-maroon);
    cursor: pointer;
  }
  .ca-page.rudra-admin-category-form .rv-category-options {
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
  .ca-page.rudra-admin-category-form .rv-category-options legend {
    padding: 0 8px;
    color: var(--rudra-maroon-deep);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.4;
  }
  .ca-page.rudra-admin-category-form .rv-category-options > p {
    margin: 0;
    color: var(--rudra-muted);
    font-size: .85rem;
    line-height: 1.55;
  }
  .ca-page.rudra-admin-category-form .rv-option-checklist {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }
  .ca-page.rudra-admin-category-form .rv-option-checklist label {
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
  .ca-page.rudra-admin-category-form .rv-option-checklist label:has(input:checked) {
    border-color: #bb8a98;
    background: #faeaf0;
    color: var(--rudra-maroon-deep);
  }
  .ca-page.rudra-admin-category-form .ca-image-editor {
    display: grid;
    gap: 18px;
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--rudra-border) !important;
    border-radius: 16px;
    background: var(--rudra-paper) !important;
  }
  .ca-page.rudra-admin-category-form .ca-image-editor h2 {
    margin: 0 0 6px;
    color: var(--rudra-maroon-deep);
    font-size: 1.2rem;
    font-weight: 800;
  }
  .ca-page.rudra-admin-category-form .ca-image-editor > div:first-child > p {
    margin: 0;
    color: var(--rudra-muted);
    font-size: .85rem;
    line-height: 1.5;
  }
  .ca-page.rudra-admin-category-form .ca-image-grid {
    display: grid;
    grid-template-columns: minmax(210px, 320px) minmax(0, 1fr);
    align-items: start;
    gap: 20px;
    min-width: 0;
    width: 100%;
  }
  .ca-page.rudra-admin-category-form .ca-image-preview {
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
  .ca-page.rudra-admin-category-form .ca-image-preview img {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 360px;
    object-fit: contain;
    object-position: center;
  }
  .ca-page.rudra-admin-category-form .ca-image-preview > div {
    display: grid;
    gap: 7px;
    padding: 20px;
    color: var(--rudra-muted);
    font-size: .82rem;
    text-align: center;
  }
  .ca-page.rudra-admin-category-form .ca-image-preview strong {
    color: var(--rudra-maroon-deep);
  }
  .ca-page.rudra-admin-category-form .ca-image-inputs {
    display: grid;
    align-content: start;
    gap: 14px;
    min-width: 0;
  }
  .ca-page.rudra-admin-category-form .ca-checkbox-card {
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
  .ca-page.rudra-admin-category-form .ca-checkbox-card strong {
    display: block;
    margin: 0 0 3px;
    color: var(--rudra-maroon-deep);
    font-weight: 800;
  }
  .ca-page.rudra-admin-category-form .ca-checkbox-card span {
    min-width: 0;
  }
  .ca-page.rudra-admin-category-form .ca-checkbox-card:has(input:checked) {
    border-color: #d7b49a !important;
    background: #fff6e6 !important;
  }
  .ca-page.rudra-admin-category-form .ca-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .ca-page.rudra-admin-category-form .ca-actions.end {
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid var(--rudra-border);
  }
  .ca-page.rudra-admin-category-form .ca-button {
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
  .ca-page.rudra-admin-category-form .ca-button.small {
    min-height: 36px;
    padding: 8px 13px;
    font-size: .8rem;
  }
  .ca-page.rudra-admin-category-form .ca-button.primary {
    border: 1px solid var(--rudra-maroon) !important;
    background: var(--rudra-maroon) !important;
    color: #fff !important;
    box-shadow: 0 5px 14px rgba(85, 17, 31, .14);
  }
  .ca-page.rudra-admin-category-form .ca-button.primary:hover:not(:disabled) {
    border-color: var(--rudra-maroon-hover) !important;
    background: var(--rudra-maroon-hover) !important;
  }
  .ca-page.rudra-admin-category-form .ca-button.secondary {
    border: 1px solid #d7b6ba !important;
    background: #fff !important;
    color: var(--rudra-maroon) !important;
  }
  .ca-page.rudra-admin-category-form .ca-button.secondary:hover {
    border-color: var(--rudra-maroon) !important;
    background: var(--rudra-soft) !important;
  }
  .ca-page.rudra-admin-category-form .ca-button:disabled {
    cursor: not-allowed;
    opacity: .6;
    box-shadow: none;
  }
  .ca-page.rudra-admin-category-form .ca-alert {
    margin: 0;
    padding: 13px 16px;
    border-radius: 11px;
    font-size: .88rem;
    font-weight: 650;
  }
  .ca-page.rudra-admin-category-form .ca-alert.danger {
    border: 1px solid #edc5c9 !important;
    background: #fff0ef !important;
    color: #9c2934 !important;
  }
  .ca-page.rudra-admin-category-form .ca-loading {
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
    .ca-page.rudra-admin-category-form .ca-image-grid {
      grid-template-columns: minmax(180px, 270px) minmax(0, 1fr);
    }
  }
  @media (max-width: 760px) {
    .ca-page.rudra-admin-category-form {
      --rudra-gutter: 20px;
      padding-top: 20px !important;
      padding-bottom: 46px !important;
    }
    .ca-page.rudra-admin-category-form .ca-form-card {
      padding: 20px !important;
      gap: 18px;
    }
    .ca-page.rudra-admin-category-form .ca-section-heading { align-items: flex-start; }
    .ca-page.rudra-admin-category-form .ca-two-column { gap: 14px; }
    .ca-page.rudra-admin-category-form .ca-image-grid { grid-template-columns: 1fr; }
    .ca-page.rudra-admin-category-form .ca-image-preview { min-height: 190px; max-width: 360px; }
    .ca-page.rudra-admin-category-form .rv-category-options,
    .ca-page.rudra-admin-category-form .ca-image-editor { padding: 16px; }
  }
  @media (max-width: 560px) {
    .ca-page.rudra-admin-category-form { --rudra-gutter: 16px; }
    .ca-page.rudra-admin-category-form .ca-form-card {
      padding: 16px !important;
      gap: 16px;
      border-radius: 14px;
    }
    .ca-page.rudra-admin-category-form .ca-two-column { grid-template-columns: minmax(0, 1fr); }
    .ca-page.rudra-admin-category-form .ca-section-heading { align-items: stretch; }
    .ca-page.rudra-admin-category-form .ca-section-heading h1 { font-size: 1.6rem; }
    .ca-page.rudra-admin-category-form .ca-section-heading .ca-button { width: 100%; }
    .ca-page.rudra-admin-category-form .ca-actions.end { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ca-page.rudra-admin-category-form .ca-actions.end .ca-button { min-width: 0; padding-inline: 8px; }
    .ca-page.rudra-admin-category-form .rv-category-options,
    .ca-page.rudra-admin-category-form .ca-image-editor { padding: 14px; }
    .ca-page.rudra-admin-category-form .rv-option-checklist { gap: 7px; }
    .ca-page.rudra-admin-category-form .rv-option-checklist label { min-height: 38px; padding: 8px 10px; }
  }
`;

interface CategoryFormState {
  variant_attributes: string[];
  delivery_size: string;
  delivery_fee_override: string;
  name: string;
  slug: string;
  description: string;
  product_type: string;
  delivery_time_slot: "morning" | "evening" | "both";
  parent_id: string;
  serial_number: string;
  sort_order: string;
  is_active: boolean;
  remove_image: boolean;
}

const emptyForm: CategoryFormState = {
  variant_attributes: [],
  delivery_size: "small",
  delivery_fee_override: "",
  name: "",
  slug: "",
  description: "",
  product_type: "",
  delivery_time_slot: "both",
  parent_id: "",
  serial_number: "1",
  sort_order: "0",
  is_active: true,
  remove_image: false,
};

function nextCategorySerial(
  categories: CatalogCategory[] = [],
): number {
  const serials = categories
    .map((category) => Number(category.serial_number || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  return serials.length ? Math.max(...serials) + 1 : 1;
}

/**
 * Deduplicate requests while React StrictMode mounts/unmounts the form in
 * development. Results are NOT persisted: CSRF and category data stay fresh.
 */
let catalogRequest: ReturnType<typeof loadAdminCatalog> | null = null;
const categoryRequests = new Map<string, ReturnType<typeof loadAdminCategory>>();

function requestCatalog() {
  if (!catalogRequest) {
    const current = loadAdminCatalog();
    catalogRequest = current;
    void current.then(
      () => { if (catalogRequest === current) catalogRequest = null; },
      () => { if (catalogRequest === current) catalogRequest = null; },
    );
  }
  return catalogRequest;
}

function requestCategory(id: string) {
  const existing = categoryRequests.get(id);
  if (existing) return existing;
  const current = loadAdminCategory(id);
  categoryRequests.set(id, current);
  void current.then(
    () => { if (categoryRequests.get(id) === current) categoryRequests.delete(id); },
    () => { if (categoryRequests.get(id) === current) categoryRequests.delete(id); },
  );
  return current;
}

type ParentOption = Pick<CatalogCategory, "id" | "name">;

export function AdminCategoryFormPage() {
  const { categoryId } = useParams();
  const isEdit = Boolean(categoryId);
  const navigate = useNavigate();
  const location = useLocation();

  const [category, setCategory] = useState<CatalogCategory | null>(null);
  // Keep only the fields needed by the parent dropdown; catalog items can be large.
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [csrfToken, setCsrfToken] = useState("");
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [categoryImageMaxMb, setCategoryImageMaxMb] = useState(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  // Only the requested category blocks rendering in edit mode. The full
  // catalog loads independently and never delays the editable category form.
  const [loading, setLoading] = useState(isEdit);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const serialWasEdited = useRef(false);
  const submitLock = useRef(false);

  const redirectToLogin = useCallback(() => {
    navigate(
      `/react/login?next=${encodeURIComponent(location.pathname)}`,
      { replace: true },
    );
  }, [navigate, location.pathname]);

  // Load the single edited category immediately; don't wait for the much
  // larger loadAdminCatalog() response before showing its fields.
  useEffect(() => {
    let active = true;
    serialWasEdited.current = false;
    setCategory(null);
    setForm(emptyForm);
    setError("");
    setImageFile(null);
    setObjectUrl("");
    setFileInputKey((old) => old + 1);
    setCsrfToken("");

    if (!categoryId) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    void (async () => {
      try {
        const response = await requestCategory(categoryId);
        if (!active) return;
        const loaded = response.category as CatalogCategory;
        setCategory(loaded);
        setCsrfToken(String(response.csrf_token || ""));
        const serial = Number(loaded.serial_number || 0) > 0
          ? Number(loaded.serial_number)
          : Math.max(1, Number(loaded.sort_order || 0) + 1);

        setForm({
          variant_attributes: loaded.variant_attributes || [],
          delivery_size: loaded.delivery_size || "small",
          delivery_fee_override: loaded.delivery_fee_override == null
            ? "" : String(loaded.delivery_fee_override),
          name: loaded.name || "",
          slug: loaded.slug || "",
          description: loaded.description || "",
          product_type: loaded.product_type || "",
          delivery_time_slot: (loaded.delivery_time_slot as "morning" | "evening" | "both") || "both",
          parent_id: loaded.parent_id || "",
          serial_number: String(serial),
          sort_order: String(loaded.sort_order || 0),
          is_active: loaded.is_active !== false,
          remove_image: false,
        });
      } catch (requestError) {
        if (!active) return;
        if (isCoreAuthenticationError(requestError)) {
          redirectToLogin();
          return;
        }
        setError(requestError instanceof Error
          ? requestError.message : "Unable to load the category form.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [categoryId, redirectToLogin]);

  // Secondary data (parent categories, type suggestions, image rules, and
  // the create page's CSRF/next serial) is fetched in parallel with the edit
  // request. This avoids the former serial network waterfall.
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");
    void (async () => {
      try {
        const response = await requestCatalog();
        if (!active) return;
        const allCategories = (response.categories || []) as CatalogCategory[];
        setParentOptions(allCategories.map(({ id, name }) => ({ id, name })));
        setProductTypeOptions(
          Array.isArray(response.product_type_options)
            ? response.product_type_options
                .map((value: unknown) => String(value || "").trim())
                .filter(Boolean)
            : [],
        );
        // Only use catalog's CSRF for CREATE; EDIT gets it from its own
        // category detail response, available sooner.
        if (!categoryId) {
          setCsrfToken(String(response.csrf_token || ""));
          setForm((current) => serialWasEdited.current ? current : {
            ...current,
            serial_number: String(nextCategorySerial(allCategories)),
          });
        }
        setCategoryImageMaxMb(Math.max(1, Number(
          response.category_image_max_mb || response.item_image_max_mb || 5,
        ) || 5));
      } catch (requestError) {
        if (!active) return;
        if (isCoreAuthenticationError(requestError)) {
          redirectToLogin();
          return;
        }
        setCatalogError(requestError instanceof Error
          ? requestError.message : "Unable to load category options.");
      } finally {
        if (active) setCatalogLoading(false);
      }
    })();
    return () => { active = false; };
  }, [categoryId, catalogRetry, redirectToLogin]);

  // Reuse stable option elements while typing in the form.
  const parentChoiceNodes = useMemo(() =>
    parentOptions
      .filter((cat) => cat.id !== categoryId)
      .map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>),
    [parentOptions, categoryId],
  );
  const parentIsListed = useMemo(() =>
    parentOptions.some((cat) => cat.id === form.parent_id),
    [parentOptions, form.parent_id],
  );
  const productTypeNodes = useMemo(() =>
    productTypeOptions.map((value) => <option value={value} key={value} />),
    [productTypeOptions],
  );

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

    if (file && file.size > categoryImageMaxMb * 1024 * 1024) {
      setError(`Image must be ${categoryImageMaxMb} MB or smaller.`);
      setImageFile(null);
      setObjectUrl("");
      event.target.value = "";
      return;
    }
    setError("");
    setImageFile(file);
    setObjectUrl(file ? URL.createObjectURL(file) : "");
    if (file) {
      setForm((current) => ({ ...current, remove_image: false }));
    }
  }

  function setRemoveImage(checked: boolean) {
    if (checked) {
      // The object URL cleanup effect releases the previous preview safely.
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
    return category?.image_url || "";
  }, [
    category?.image_url,
    form.remove_image,
    objectUrl,
  ]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    if (submitLock.current) return;
    if (isEdit && !category) {
      setError("The category has not loaded. Please retry.");
      return;
    }

    const serialNumber =
      Number(form.serial_number);

    if (
      !csrfToken ||
      !form.name.trim() ||
      !form.product_type.trim() ||
      !Number.isInteger(serialNumber) ||
      serialNumber < 1
    ) {
      setError(
        "Enter a category name, product type, and serial number of 1 or greater.",
      );
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setError("");

    const payload = new FormData();

    payload.set("variant_attributes", JSON.stringify(form.variant_attributes));
    payload.set("delivery_size", form.delivery_size);
    payload.set("delivery_fee_override", form.delivery_fee_override);
    payload.set("name", form.name.trim());
    payload.set("slug", form.slug.trim());
    payload.set(
      "description",
      form.description.trim(),
    );
    payload.set(
      "product_type",
      form.product_type.trim(),
    );
    payload.set(
      "delivery_time_slot",
      form.delivery_time_slot,
    );
    payload.set("parent_id", form.parent_id);
    payload.set(
      "serial_number",
      String(serialNumber),
    );
    // Retain the legacy fallback order without using it as the primary order.
    payload.set(
      "sort_order",
      form.sort_order || "0",
    );
    payload.set(
      "is_active",
      String(form.is_active),
    );
    payload.set(
      "remove_image",
      String(form.remove_image),
    );

    // image_url is intentionally omitted when editing. A blank replacement
    // must never clear the currently stored category image.
    if (imageFile) {
      payload.set("image_file", imageFile);
    }

    try {
      if (categoryId) {
        await updateAdminCategory(
          categoryId,
          csrfToken,
          payload,
        );
      } else {
        await createAdminCategory(
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
            ? "Category updated successfully."
            : "Category created successfully.",
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
          : "Unable to save the category.",
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="ca-page rudra-admin-category-form">
        <style>{CATEGORY_FORM_STYLES}</style>
        <div className="ca-page-container">
          <div className="ca-loading">
            Loading category form…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ca-page rudra-admin-category-form">
        <style>{CATEGORY_FORM_STYLES}</style>
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
                  Dynamic catalogue
                </span>
                <h1>
                  {isEdit
                    ? "Edit Category"
                    : "Create Category"}
                </h1>
                <p>
                  Group products, upload the category
                  image and control storefront order
                  using the serial number.
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
              <div className="ca-alert danger" role="alert">
                {error}
              </div>
            )}
            {catalogError && (
              <div className="ca-alert danger" role="alert">
                {isEdit
                  ? "Category loaded, but additional category options are unavailable. "
                  : "Unable to load category settings required to save. "}
                {catalogError}{" "}
                <button
                  type="button"
                  className="ca-button secondary small"
                  onClick={() => setCatalogRetry((n) => n + 1)}
                >Retry loading options</button>
              </div>
            )}

            <fieldset className="rv-category-options"><legend>Product options for this category (check all that apply)</legend>
              <p>Example: Clothing → Size + Color. Electronics → Color + Capacity + Model. Every product can use these fields for its priced stock variations.</p>
              <div className="rv-option-checklist">{(['color','size','material','capacity','style','weight','model'] as const).map(attr =>
                <label key={attr}><input type="checkbox" checked={form.variant_attributes.includes(attr)} onChange={e => setForm(f => ({...f,variant_attributes:e.target.checked?[...f.variant_attributes,attr]:f.variant_attributes.filter(x=>x!==attr)}))}/>{attr[0].toUpperCase()+attr.slice(1)}</label>
              )}</div>
              <div className="ca-two-column"><label>Default delivery parcel size<select value={form.delivery_size} onChange={e=>setForm(f=>({...f,delivery_size:e.target.value}))}><option value="small">Small parcel</option><option value="medium">Medium parcel</option><option value="large">Large / bulky parcel</option></select></label>
              <label>Category-specific delivery fee (₹, optional)<input type="number" min="0" step="0.01" value={form.delivery_fee_override} placeholder="Inherit store-wide parcel fee" onChange={e=>setForm(f=>({...f,delivery_fee_override:e.target.value}))}/><small>Blank = inherit the parcel-size fee. 0 = free category handling.</small></label></div>
            </fieldset>
            <div className="ca-two-column">
              <label>
                Category name
                <input
                  type="text"
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter a category name"
                  required
                />
                <small>Examples: Clothing, Electronics, Home &amp; Kitchen, Books, or any custom category.</small>
              </label>

              <label>
                Serial number
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.serial_number}
                  onChange={(event) => {
                    serialWasEdited.current = true;
                    setForm((current) => ({
                      ...current,
                      serial_number: event.target.value,
                    }));
                  }}
                  required
                />
                <small>
                  Public order: 1 appears before 2,
                  2 before 3, and so on.
                </small>
              </label>
            </div>

            <div className="ca-two-column">
              <label>
                URL slug
                <input
                  type="text"
                  maxLength={120}
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="e.g., clothing"
                />
                <small>
                  Leave blank to generate it
                  automatically from the name.
                </small>
              </label>

              <label>
                Product type
                <input
                  type="text"
                  list="catalog-product-type-options"
                  maxLength={100}
                  value={form.product_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      product_type:
                        event.target.value,
                    }))
                  }
                  placeholder="Select or enter product type"
                  required
                />
                <datalist id="catalog-product-type-options">
                  {productTypeNodes}
                </datalist>
                <small>
                  Examples: Apparel, Electronics, Home Goods.
                  Select a suggestion or enter your own.
                </small>
              </label>
            </div>

            <div className="ca-two-column">
              <label>
                Parent category (optional)
                <select
                  value={form.parent_id}
                  onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}
                >
                  <option value="">Main category</option>
                  {form.parent_id && !parentIsListed && (
                    <option value={form.parent_id}>Current parent category</option>
                  )}
                  {parentChoiceNodes}
                </select>
                <small>Examples: Clothing → Men's Shirts, or Electronics → Headphones. You can also create a main category.
                  {catalogLoading ? " Loading category suggestions…" : ""}
                </small>
              </label>
            </div>

            <label>
              Description
              <textarea
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                placeholder="Describe the products, audience, and key features..."
              />
            </label>

            <section className="ca-image-editor">
              <div>
                <h2>Category image</h2>
                <p>
                  Upload PNG, JPG, JPEG or WEBP.
                  Existing images remain unchanged
                  unless you upload a replacement or
                  explicitly remove them.
                </p>
              </div>

              <div className="ca-image-grid">
                <div className="ca-image-preview">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Category preview"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div>
                      <strong>
                        No category image selected
                      </strong>
                      <span>
                        PNG, JPG, JPEG or WEBP
                      </span>
                    </div>
                  )}
                </div>

                <div className="ca-image-inputs">
                  <label>
                    Upload category image
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      onChange={selectFile}
                    />
                    <small>
                      Maximum {categoryImageMaxMb} MB.
                      A new upload replaces the saved
                      category image.
                    </small>
                  </label>

                  {isEdit &&
                    Boolean(category?.image_url) && (
                      <label className="ca-checkbox-card">
                        <input
                          type="checkbox"
                          checked={form.remove_image}
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
                            Enable only when you
                            intentionally want no
                            category image.
                          </small>
                        </span>
                      </label>
                    )}
                </div>
              </div>
            </section>

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
                <strong>Active category</strong>
                <small>
                  Inactive categories are hidden from
                  the public catalogue.
                </small>
              </span>
            </label>

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
                  (isEdit && !category) ||
                  !csrfToken ||
                  !form.name.trim() ||
                  !form.product_type.trim()
                }
              >
                {submitting
                  ? "Saving…"
                  : !csrfToken && catalogLoading && !isEdit
                    ? "Loading settings…"
                  : isEdit
                    ? "Save Changes"
                    : "Create Category"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default AdminCategoryFormPage;
