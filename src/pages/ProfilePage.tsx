import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notifyJwtAuthChanged } from "../lib/jwtAuth";

/** Profile styles are embedded in this component; no CSS import is needed. */
const PROFILE_PAGE_CSS = `
/* ================================================================
   EasyFindStore | My Profile
   Maroon + antique gold + warm cream
   Drop-in replacement for src/styles/profile-page.css
   All selectors are scoped to the profile page.
   ================================================================ */

.rudra-profile-page {
  --profile-maroon: #55111f;
  --profile-maroon-dark: #3d0b17;
  --profile-maroon-light: #8e2539;
  --profile-gold: #d8a949;
  --profile-gold-light: #f5e4ba;
  --profile-cream: #fffaf4;
  --profile-paper: #fffdf9;
  --profile-border: #eadcca;
  --profile-ink: #3e1b23;
  --profile-muted: #806d71;
  --profile-gutter: clamp(18px, 2.4vw, 48px);

  display: block;
  width: 100% !important;
  max-width: none !important;
  min-width: 0;
  min-height: calc(100svh - 74px);
  margin: 0 !important;
  padding: clamp(30px, 3.6vw, 64px) var(--profile-gutter) clamp(54px, 5vw, 90px) !important;
  box-sizing: border-box;
  background: var(--profile-cream);
  color: var(--profile-ink);
  font-family: Arial, Helvetica, sans-serif;
}

.rudra-profile-page *,
.rudra-profile-page *::before,
.rudra-profile-page *::after {
  box-sizing: border-box;
}

/* Main heading — aligned to the same gutters as the site header. */
.rudra-profile-page .rudra-profile-heading {
  position: relative;
  width: 100%;
  max-width: none;
  margin: 0 0 clamp(25px, 3vw, 42px);
  padding: 0 0 24px;
  border-bottom: 1px solid var(--profile-border);
  text-align: left;
}

.rudra-profile-page .rudra-profile-heading > span {
  display: inline-block;
  margin-bottom: 12px;
  color: #986b27;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.17em;
  line-height: 1.4;
}

.rudra-profile-page .rudra-profile-heading h1 {
  margin: 0 0 9px;
  color: var(--profile-maroon);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(34px, 3.3vw, 54px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.035em;
}

.rudra-profile-page .rudra-profile-heading p {
  margin: 0;
  color: var(--profile-muted);
  font-size: clamp(14px, 1.15vw, 16px);
  line-height: 1.65;
}

/* Balanced two-column desktop layout; no legacy 1200px page cap. */
.rudra-profile-page .rudra-profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.85fr);
  align-items: start;
  gap: clamp(20px, 2.1vw, 34px);
  width: 100% !important;
  max-width: none !important;
  min-width: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.rudra-profile-page .rudra-profile-card {
  position: relative;
  width: 100% !important;
  max-width: none !important;
  min-width: 0;
  margin: 0 !important;
  padding: clamp(22px, 2.6vw, 42px) !important;
  border: 1px solid var(--profile-border);
  border-radius: 18px;
  background: var(--profile-paper);
  box-shadow: 0 8px 26px rgba(63, 11, 23, 0.055);
  overflow: hidden;
}

.rudra-profile-page .rudra-profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--profile-maroon) 0%, var(--profile-maroon-light) 55%, var(--profile-gold) 100%);
}

.rudra-profile-page .rudra-profile-card-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 27px;
  padding: 0 0 19px;
  border-bottom: 1px solid #eee4d8;
}

.rudra-profile-page .rudra-profile-card-title h2 {
  margin: 0;
  color: var(--profile-maroon);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(23px, 2vw, 29px);
  line-height: 1.25;
  font-weight: 700;
}

.rudra-profile-page .rudra-profile-card-title > span {
  display: inline-flex;
  align-items: center;
  min-height: 27px;
  padding: 5px 12px;
  border: 1px solid #e8c981;
  border-radius: 999px;
  background: #fff5e0;
  color: #85591e;
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.025em;
}

/* Personal information form */
.rudra-profile-page .rudra-profile-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 20px;
  margin: 0;
}

.rudra-profile-page .rudra-profile-form > label {
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: 100%;
  margin: 0;
  color: var(--profile-ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.rudra-profile-page .rudra-profile-form input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 52px;
  padding: 12px 15px;
  border: 1px solid #e2cfd0;
  border-radius: 11px;
  outline: none;
  background: #fff;
  color: var(--profile-ink);
  -webkit-text-fill-color: var(--profile-ink);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 500;
  box-shadow: none;
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}

.rudra-profile-page .rudra-profile-form input::placeholder {
  color: #a49094;
}

.rudra-profile-page .rudra-profile-form input:focus-visible {
  border-color: var(--profile-maroon-light);
  box-shadow: 0 0 0 3px rgba(142, 37, 57, .11);
}

.rudra-profile-page .rudra-profile-form input[readonly] {
  cursor: not-allowed;
  border-color: #e9dfd3;
  background: #f6f1eb;
  color: #77696d;
  -webkit-text-fill-color: #77696d;
}

.rudra-profile-page .rudra-profile-form label small {
  margin-top: -3px;
  color: var(--profile-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.rudra-profile-page .rudra-profile-feedback:empty {
  display: none;
}

.rudra-profile-page .rudra-profile-feedback p {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
}

.rudra-profile-page .rudra-profile-feedback .success {
  border-color: #b9d9b9;
  background: #edf7ed;
  color: #28683c;
}

.rudra-profile-page .rudra-profile-feedback .error {
  border-color: #eab4bc;
  background: #fff0f1;
  color: #9a2538;
}

.rudra-profile-page .rudra-profile-form > button[type='submit'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  width: min(100%, 300px);
  min-height: 52px;
  margin: 3px 0 0;
  padding: 12px 24px;
  border: 1px solid var(--profile-maroon);
  border-radius: 11px;
  background: var(--profile-maroon);
  background-image: none;
  color: #fffaf4;
  -webkit-text-fill-color: #fffaf4;
  font: 800 14px/1.3 Arial, Helvetica, sans-serif;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 9px 18px rgba(85, 17, 31, .13);
  transition: transform .2s ease, background-color .2s ease, box-shadow .2s ease;
}

.rudra-profile-page .rudra-profile-form > button[type='submit']:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #792035;
  box-shadow: 0 13px 24px rgba(85, 17, 31, .18);
}

.rudra-profile-page .rudra-profile-form > button[type='submit']:focus-visible,
.rudra-profile-page .rudra-profile-quicklinks a:focus-visible {
  outline: 3px solid rgba(216, 169, 73, .6);
  outline-offset: 3px;
}

.rudra-profile-page .rudra-profile-form > button[type='submit']:disabled {
  cursor: not-allowed;
  opacity: .58;
  transform: none;
}

/* Account details card */
.rudra-profile-page .rudra-profile-side {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-top: clamp(25px, 3vw, 46px) !important;
}

.rudra-profile-page .rudra-profile-avatar {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  flex: 0 0 auto;
  margin: 0 auto 16px;
  border: 2px solid var(--profile-gold);
  border-radius: 50%;
  background: var(--profile-maroon);
  color: #f3d694;
  font: 700 43px/1 Georgia, 'Times New Roman', serif;
  box-shadow: 0 0 0 7px #fff5e7;
}

.rudra-profile-page .rudra-profile-side > h2 {
  margin: 5px 0 6px;
  color: var(--profile-maroon);
  font: 700 clamp(22px, 1.7vw, 27px)/1.25 Georgia, 'Times New Roman', serif;
  text-align: center;
  overflow-wrap: anywhere;
}

.rudra-profile-page .rudra-profile-side > p {
  margin: 0 0 24px;
  color: var(--profile-muted);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  overflow-wrap: anywhere;
}

.rudra-profile-page .rudra-profile-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 0;
  padding: 16px 0;
  border-top: 1px solid #eee4d9;
}

.rudra-profile-page .rudra-profile-account > span {
  color: var(--profile-muted);
  font-size: 13px;
  font-weight: 500;
}

.rudra-profile-page .rudra-profile-account > strong {
  color: var(--profile-maroon);
  font-size: 13px;
  font-weight: 800;
  text-align: right;
  overflow-wrap: anywhere;
}

.rudra-profile-page .rudra-profile-quicklinks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 21px;
  padding-top: 20px;
  border-top: 1px solid #eee4d9;
}

.rudra-profile-page .rudra-profile-quicklinks a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  min-height: 48px;
  padding: 12px 15px;
  border: 1px solid #e6d5c9;
  border-radius: 10px;
  background: #fff8f0;
  color: var(--profile-maroon);
  -webkit-text-fill-color: var(--profile-maroon);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  text-decoration: none;
  transition: border-color .2s ease, background-color .2s ease, transform .2s ease;
}

.rudra-profile-page .rudra-profile-quicklinks a::after {
  content: '›';
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  color: #a57731;
  -webkit-text-fill-color: #a57731;
}

.rudra-profile-page .rudra-profile-quicklinks a:hover {
  border-color: var(--profile-gold);
  background: #fff0dc;
  transform: translateX(2px);
}

/* Tablets */
@media (max-width: 1024px) {
  .rudra-profile-page {
    --profile-gutter: 22px;
  }

  .rudra-profile-page .rudra-profile-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(270px, .8fr);
  }

  .rudra-profile-page .rudra-profile-card {
    padding: 25px !important;
  }
}

/* Stack account card below the form on narrow screens. */
@media (max-width: 760px) {
  .rudra-profile-page {
    --profile-gutter: 20px;
    min-height: calc(100svh - 66px);
    padding-top: 28px !important;
  }

  .rudra-profile-page .rudra-profile-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .rudra-profile-page .rudra-profile-heading {
    margin-bottom: 22px;
    padding-bottom: 18px;
  }

  .rudra-profile-page .rudra-profile-card {
    padding: 24px !important;
  }

  .rudra-profile-page .rudra-profile-form > button[type='submit'] {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .rudra-profile-page {
    --profile-gutter: 16px;
    padding-top: 23px !important;
    padding-bottom: 45px !important;
  }

  .rudra-profile-page .rudra-profile-card {
    padding: 21px 18px !important;
    border-radius: 14px;
  }

  .rudra-profile-page .rudra-profile-card-title {
    margin-bottom: 21px;
  }

  .rudra-profile-page .rudra-profile-form {
    gap: 17px;
  }

  .rudra-profile-page .rudra-profile-avatar {
    width: 76px;
    height: 76px;
    font-size: 37px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rudra-profile-page .rudra-profile-form input,
  .rudra-profile-page .rudra-profile-form > button[type='submit'],
  .rudra-profile-page .rudra-profile-quicklinks a {
    transition: none;
  }
}
`;

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const empty: Profile = {
  id: "",
  full_name: "",
  email: "",
  phone: "",
  role: "",
  status: "",
  created_at: "",
  updated_at: "",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(empty);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [csrf, setCsrf] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [sessionResp, profileResp] = await Promise.all([
          fetch(`${BASE}/react/api/auth/session`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${BASE}/react/api/profile`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (profileResp.status === 401) {
          navigate("/react/login?next=/profile", { replace: true });
          return;
        }

        const session = await sessionResp.json();
        const result = await profileResp.json();
        if (!profileResp.ok || !result.success) {
          throw new Error(result.message || "Unable to load profile");
        }
        if (!active) return;

        setCsrf(session.csrf_token || "");
        setProfile(result.profile);
        setName(result.profile.full_name || "");
        setPhone(result.profile.phone || "");
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load your profile");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [navigate]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${BASE}/react/api/profile`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({
          full_name: name.trim(),
          phone: phone.trim(),
          csrf_token: csrf,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update profile");
      }

      setProfile(data.profile);
      setMessage("Your profile was updated successfully.");
      notifyJwtAuthChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="rudra-profile-page">
      <style>{PROFILE_PAGE_CSS}</style>

      <div className="rudra-profile-heading">
        <span>MY ACCOUNT</span>
        <h1>My Profile</h1>
        <p>Manage your contact details and account information securely.</p>
      </div>

      <div className="rudra-profile-grid">
        <section className="rudra-profile-card">
          <div className="rudra-profile-card-title">
            <h2>Personal information</h2>
            <span>Editable</span>
          </div>

          {loading ? (
            <p>Loading your profile…</p>
          ) : (
            <form onSubmit={save} className="rudra-profile-form">
              <label htmlFor="profile-name">
                Full name
                <input
                  id="profile-name"
                  value={name}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label htmlFor="profile-phone">
                Phone number
                <input
                  id="profile-phone"
                  value={phone}
                  autoComplete="tel"
                  placeholder="Your contact number"
                  maxLength={22}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label htmlFor="profile-email">
                Verified email address
                <input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  readOnly
                />
                <small>This is your OTP login identity and cannot be changed here.</small>
              </label>
              <div className="rudra-profile-feedback" aria-live="polite">
                {message && <p className="success">{message}</p>}
                {error && <p className="error" role="alert">{error}</p>}
              </div>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Profile Changes"}
              </button>
            </form>
          )}
        </section>

        <aside className="rudra-profile-card rudra-profile-side">
          <div className="rudra-profile-avatar" aria-hidden="true">
            {(profile.full_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <h2>{profile.full_name || "Your account"}</h2>
          <p>{profile.email}</p>
          <div className="rudra-profile-account">
            <span>Account type</span>
            <strong>{profile.role === "admin" ? "Store administrator" : "Customer"}</strong>
          </div>
          <div className="rudra-profile-account">
            <span>Account status</span>
            <strong>{profile.status || "Active"}</strong>
          </div>
          <nav aria-label="Profile quick links" className="rudra-profile-quicklinks">
            {profile.role === "admin" ? (
              <>
                <Link to="/admin">Admin dashboard</Link>
                <Link to="/admin/orders">Manage orders</Link>
              </>
            ) : (
              <>
                <Link to="/orders">My orders</Link>
                <Link to="/addresses">Saved addresses</Link>
                <Link to="/support/tickets">Help &amp; support</Link>
              </>
            )}
          </nav>
        </aside>
      </div>
    </main>
  );
}
