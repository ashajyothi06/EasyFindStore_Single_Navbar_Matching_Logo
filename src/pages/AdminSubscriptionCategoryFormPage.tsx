import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  adminSubscriptionAssetUrl,
  isAdminSubscriptionAuthenticationError,
  loadAdminSubscriptionCatalog,
  loadAdminSubscriptionCategory,
  saveAdminSubscriptionCategory,
} from "../services/adminSubscriptionsApi";
import "../styles/admin-subscriptions.css";

export function AdminSubscriptionCategoryFormPage() {
  const { categoryId } = useParams();
  const editing = Boolean(categoryId);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState(1);
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (categoryId) {
          const payload = await loadAdminSubscriptionCategory(categoryId);
          if (cancelled) return;
          setToken(payload.subscription_csrf_token);
          setName(payload.category.name || "");
          setSlug(payload.category.slug || "");
          setDescription(payload.category.description || "");
          setSerialNumber(Number(payload.category.serial_number || 1));
          setActive(Boolean(payload.category.is_active));
          setImageUrl(payload.category.image_url || "");
        } else {
          const payload = await loadAdminSubscriptionCatalog();
          if (cancelled) return;
          setToken(payload.subscription_csrf_token);
          setSerialNumber(
            Math.max(
              0,
              ...payload.categories.map((category) =>
                Number(category.serial_number || 0),
              ),
            ) + 1,
          );
        }
      } catch (requestError) {
        if (isAdminSubscriptionAuthenticationError(requestError)) {
          navigate(
            `/react/login?next=${encodeURIComponent(location.pathname)}`,
            { replace: true },
          );
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the category.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [categoryId, location.pathname, navigate]);

  const preview = useMemo(
    () =>
      imageFile
        ? URL.createObjectURL(imageFile)
        : !removeImage
          ? adminSubscriptionAssetUrl(imageUrl)
          : "",
    [imageFile, imageUrl, removeImage],
  );

  useEffect(
    () => () => {
      if (imageFile && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [imageFile, preview],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveAdminSubscriptionCategory({
        id: categoryId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        serial_number: Math.max(1, Number(serialNumber || 1)),
        is_active: active,
        remove_image: removeImage,
        image_file: imageFile,
        subscription_csrf_token: token,
      });
      navigate("/admin/subscriptions", {
        replace: true,
        state: { message: `Subscription category ${editing ? "updated" : "created"}.` },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the category.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="sa-page"><section className="sa-panel sa-loading">Loading category…</section></main>;
  }

  return (
    <main className="sa-page">
      <div className="sa-container narrow">
        <section className="sa-heading">
          <div>
            <span className="sa-eyebrow">Subscription catalogue</span>
            <h1>{editing ? "Edit category" : "Add category"}</h1>
            <p>Organise related subscription products and control visibility.</p>
          </div>
          <Link className="sa-button ghost" to="/admin/subscriptions">Cancel</Link>
        </section>
        {error && <div className="sa-alert error">{error}</div>}
        <form className="sa-panel sa-form" onSubmit={submit}>
          <div className="sa-form-grid two">
            <label>
              <span>Name *</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              <span>Slug</span>
              <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Generated from name" />
            </label>
            <label>
              <span>Display order</span>
              <input type="number" min="1" value={serialNumber} onChange={(event) => setSerialNumber(Number(event.target.value))} />
            </label>
            <label className="sa-check">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              <span>Category is active</span>
            </label>
            <label className="full">
              <span>Description</span>
              <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>

          <section className="sa-upload-row">
            <div className="sa-upload-preview">
              {preview ? <img src={preview} alt="Category preview" /> : <div className="sa-image-placeholder">IMAGE</div>}
            </div>
            <div>
              <h2>Category image</h2>
              <p>JPG, PNG or WebP. Large files are compressed before upload.</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] || null);
                  if (event.target.files?.[0]) setRemoveImage(false);
                }}
              />
              {(imageUrl || imageFile) && (
                <label className="sa-check">
                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(event) => {
                      setRemoveImage(event.target.checked);
                      if (event.target.checked) setImageFile(null);
                    }}
                  />
                  <span>Remove current image</span>
                </label>
              )}
            </div>
          </section>

          <div className="sa-form-actions">
            <Link className="sa-button ghost" to="/admin/subscriptions">Cancel</Link>
            <button className="sa-button primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save category"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
