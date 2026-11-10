import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiLock, FiStar } from "react-icons/fi";
import "../styles/react-auth.css";
import registerPageImage from "../assets/easyfind/register-retail.jpg";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "/react/login";

const RUDRA_REGISTRATION_STYLES = `
  /* Scoped styles: matches the EasyFindStore login without altering other auth pages. */
  .react-auth-shell.rudra-register-page {
    --rudra-maroon: #0a2038;
    --rudra-dark: #061728;
    --rudra-red: #143754;
    --rudra-gold: #efbf60;
    --rudra-cream: #f6f8fb;
    --rudra-ink: #12283d;
    --rudra-muted: #62758a;
    width: 100%;
    min-height: calc(100svh - 72px);
    padding: clamp(18px, 2.4vw, 42px) clamp(16px, 2.4vw, 48px) !important;
    display: flex !important;
    justify-content: center;
    align-items: center;
    overflow-x: hidden;
    background: #f2f5f9 !important;
    color: var(--rudra-ink) !important;
    font-family: Arial, sans-serif;
  }
  .rudra-register-page *,
  .rudra-register-page *::before,
  .rudra-register-page *::after { box-sizing: border-box; }
  .rudra-register-page .react-auth-container {
    width: 100% !important;
    max-width: 1450px !important;
    padding: 0 !important;
    margin: 0 auto !important;
  }
  .rudra-register-page .react-auth-split-layout {
    display: grid !important;
    grid-template-columns: minmax(0, .94fr) minmax(0, 1fr) !important;
    width: 100% !important;
    min-height: 700px;
    gap: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid rgba(142, 95, 54, .2);
    border-radius: 24px;
    background: #ffffff;
    box-shadow: 0 18px 55px rgba(63, 11, 24, .1);
    align-items: stretch !important;
  }
  /* Left navy retail image panel. */
  .rudra-register-page .react-auth-image-column {
    display: flex !important;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 22px;
    position: relative;
    width: 100% !important;
    min-width: 0;
    min-height: 700px;
    padding: clamp(32px, 4vw, 66px) !important;
    overflow: hidden;
    background: var(--rudra-maroon) !important;
    color: var(--rudra-cream) !important;
  }
  .rudra-register-page .react-auth-image-column::before,
  .rudra-register-page .react-auth-image-column::after {
    content: "";
    position: absolute;
    width: 90px;
    height: 90px;
    opacity: .65;
    pointer-events: none;
  }
  .rudra-register-page .react-auth-image-column::before {
    top: 20px; left: 20px;
    border-top: 1px solid var(--rudra-gold);
    border-left: 1px solid var(--rudra-gold);
  }
  .rudra-register-page .react-auth-image-column::after {
    bottom: 20px; right: 20px;
    border-right: 1px solid var(--rudra-gold);
    border-bottom: 1px solid var(--rudra-gold);
  }
  .rudra-register-page .rudra-register-side-intro,
  .rudra-register-page .react-auth-image-container,
  .rudra-register-page .rudra-register-security { position: relative; z-index: 1; }
  .rudra-register-page .rudra-register-side-kicker {
    display: block;
    margin-bottom: 16px;
    color: #f2cf81;
    font-size: 11px;
    letter-spacing: 2.1px;
    font-weight: 800;
  }
  .rudra-register-page .rudra-register-side-intro h2 {
    margin: 0 0 12px;
    color: #f8f9fc !important;
    font: 700 clamp(31px, 3vw, 47px)/1.14 Georgia, 'Times New Roman', serif;
    letter-spacing: -.8px;
  }
  .rudra-register-page .rudra-register-side-intro p {
    margin: 0;
    max-width: 440px;
    color: #f5e3d9 !important;
    font: 14px/1.65 Arial, sans-serif;
  }
  .rudra-register-page .react-auth-image-container {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    max-width: none !important;
    /* Retail photograph is framed within the branded side panel. */
    height: auto !important;
    aspect-ratio: 16 / 9;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden;
    border: 1px solid rgba(233, 195, 117, .6);
    border-radius: 15px;
    background: var(--rudra-dark);
    box-shadow: 0 15px 30px rgba(34, 6, 16, .18);
  }
  .rudra-register-page .react-auth-image-container .react-auth-side-image {
    display: block;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: cover !important;
    object-position: center center !important;
    border-radius: inherit;
    opacity: 1 !important;
    filter: none !important;
  }
  .rudra-register-page .rudra-register-security {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #f8e9da;
    font-size: 12px;
    font-weight: 600;
  }
  .rudra-register-page .rudra-register-security svg { color: var(--rudra-gold); flex-shrink: 0; }

  /* Right light form panel. */
  .rudra-register-page .react-auth-form-column {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    min-width: 0;
    margin: 0 !important;
    padding: clamp(28px, 3.4vw, 60px) clamp(25px, 4.5vw, 78px) !important;
    background: #ffffff !important;
  }
  .rudra-register-page .react-auth-card {
    width: 100% !important;
    max-width: 505px !important;
    min-width: 0;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 auto !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    color: var(--rudra-ink) !important;
    text-align: left;
  }
  .rudra-register-page .rudra-register-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 25px;
    color: var(--rudra-maroon) !important;
    text-decoration: none !important;
  }
  .rudra-register-page .rudra-register-brand-mark {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 1px solid var(--rudra-gold);
    border-radius: 13px;
    color: var(--rudra-gold);
    background: var(--rudra-maroon);
  }
  .rudra-register-page .rudra-register-brand-text { display: flex; flex-direction: column; gap: 2px; }
  .rudra-register-page .rudra-register-brand-text strong {
    color: var(--rudra-maroon) !important;
    font: 700 clamp(23px, 2.4vw, 31px)/1.05 Georgia, 'Times New Roman', serif;
    letter-spacing: -.6px;
  }
  .rudra-register-page .rudra-register-brand-text small {
    color: #ad7b27;
    letter-spacing: 1.9px;
    font-size: 9px;
    font-weight: 800;
  }
  .rudra-register-page .user-register-form {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--rudra-ink) !important;
    background: transparent !important;
  }
  .rudra-register-page .react-auth-eyebrow {
    display: inline-flex;
    align-self: flex-start;
    width: fit-content !important;
    margin: 0 0 14px !important;
    padding: 7px 12px !important;
    border: 1px solid rgba(216, 169, 73, .5);
    border-radius: 30px;
    background: #fff5dd !important;
    color: #775316 !important;
    font: 800 10px/1.35 Arial, sans-serif;
    letter-spacing: 1px;
  }
  .rudra-register-page .user-register-form h1 {
    margin: 0 0 10px !important;
    color: var(--rudra-maroon) !important;
    -webkit-text-fill-color: var(--rudra-maroon) !important;
    font: 700 clamp(30px, 3vw, 39px)/1.16 Georgia, 'Times New Roman', serif !important;
    letter-spacing: -.7px;
  }
  .rudra-register-page .user-register-form > p {
    max-width: 500px;
    margin: 0 0 18px !important;
    color: var(--rudra-muted) !important;
    font: 14px/1.65 Arial, sans-serif;
  }
  .rudra-register-page .user-register-form p strong { color: var(--rudra-maroon) !important; }
  .rudra-register-page .react-auth-field {
    width: 100% !important;
    display: flex !important;
    flex-direction: column;
    gap: 7px !important;
    margin: 0 0 14px !important;
    padding: 0 !important;
    color: var(--rudra-ink) !important;
  }
  .rudra-register-page .react-auth-field > span {
    color: var(--rudra-ink) !important;
    font: 750 13px/1.35 Arial, sans-serif;
  }
  .rudra-register-page .react-auth-field input,
  .rudra-register-page .react-auth-field textarea {
    width: 100% !important;
    max-width: none !important;
    min-height: 46px !important;
    height: auto;
    padding: 11px 14px !important;
    border: 1px solid #d7e1ea !important;
    border-radius: 11px !important;
    background: #fff !important;
    color: var(--rudra-ink) !important;
    -webkit-text-fill-color: var(--rudra-ink) !important;
    font: 14px/1.4 Arial, sans-serif !important;
    box-shadow: none !important;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .rudra-register-page .react-auth-field input { height: 46px !important; }
  .rudra-register-page .react-auth-field textarea { min-height: 82px !important; resize: vertical; }
  .rudra-register-page .react-auth-field input::placeholder,
  .rudra-register-page .react-auth-field textarea::placeholder {
    color: #a69396 !important;
    -webkit-text-fill-color: #a69396 !important;
  }
  .rudra-register-page .react-auth-field input:focus,
  .rudra-register-page .react-auth-field textarea:focus {
    border-color: var(--rudra-red) !important;
    box-shadow: 0 0 0 3px rgba(142, 37, 57, .12) !important;
  }
  .rudra-register-page .user-register-button,
  .rudra-register-page .user-register-link-button {
    display: inline-flex !important;
    justify-content: center;
    align-items: center;
    gap: 9px;
    width: 100% !important;
    min-width: 0;
    min-height: 48px;
    margin: 0 !important;
    padding: 11px 14px !important;
    border: 1px solid var(--rudra-gold) !important;
    border-radius: 11px !important;
    background: var(--rudra-maroon) !important;
    background-image: none !important;
    color: var(--rudra-cream) !important;
    -webkit-text-fill-color: var(--rudra-cream) !important;
    font: 800 13px/1.3 Arial, sans-serif !important;
    text-decoration: none !important;
    text-align: center;
    cursor: pointer;
    box-shadow: none !important;
    transition: background .2s, transform .2s, border-color .2s;
  }
  .rudra-register-page .user-register-link-button:link,
  .rudra-register-page .user-register-link-button:visited,
  .rudra-register-page .user-register-link-button:hover,
  .rudra-register-page .user-register-link-button:focus,
  .rudra-register-page .user-register-link-button:active {
    color: var(--rudra-cream) !important;
    -webkit-text-fill-color: var(--rudra-cream) !important;
  }
  .rudra-register-page .user-register-button:hover:not(:disabled),
  .rudra-register-page .user-register-link-button:hover {
    background: #792035 !important;
    transform: translateY(-1px);
  }
  .rudra-register-page .user-register-button:focus-visible,
  .rudra-register-page .user-register-link-button:focus-visible {
    outline: 3px solid rgba(216, 169, 73, .45);
    outline-offset: 3px;
  }
  .rudra-register-page .user-register-button:disabled { opacity: .58; cursor: not-allowed; transform: none; }
  .rudra-register-page .user-register-actions {
    display: flex !important;
    flex-direction: column;
    width: 100% !important;
    gap: 10px !important;
    margin: 12px 0 0 !important;
  }
  .rudra-register-page .user-register-actions .user-register-link-button:last-child {
    background: #fff7ec !important;
    color: var(--rudra-maroon) !important;
    -webkit-text-fill-color: var(--rudra-maroon) !important;
  }
  .rudra-register-page .user-register-actions .user-register-link-button:last-child:link,
  .rudra-register-page .user-register-actions .user-register-link-button:last-child:visited,
  .rudra-register-page .user-register-actions .user-register-link-button:last-child:hover {
    color: var(--rudra-maroon) !important;
    -webkit-text-fill-color: var(--rudra-maroon) !important;
  }
  .rudra-register-page .user-register-actions .user-register-link-button:last-child:hover { background: #f7e6ce !important; }
  .rudra-register-page .user-register-secondary-actions {
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px !important;
  }
  .rudra-register-page .user-register-secondary-actions .user-register-button {
    padding: 10px 6px !important;
    min-height: 46px;
  }
  .rudra-register-page .user-register-secondary-actions .user-register-button:last-child {
    background: #fff7ec !important;
    color: var(--rudra-maroon) !important;
    -webkit-text-fill-color: var(--rudra-maroon) !important;
  }
  .rudra-register-page .react-auth-otp-field input {
    text-align: center;
    font: 800 22px/1 Arial, sans-serif !important;
    letter-spacing: .35em;
  }
  .rudra-register-page .react-auth-attempts { color: var(--rudra-muted) !important; margin-bottom: 12px; }
  .rudra-register-page .react-auth-notice {
    margin-bottom: 15px !important;
    padding: 12px 14px !important;
    border-radius: 10px !important;
    background: #fff4e4 !important;
    border: 1px solid #e7cfb0 !important;
    color: #6e3b13 !important;
    font: 13px/1.5 Arial, sans-serif;
  }
  .rudra-register-page .react-auth-notice.error { background: #fff0f1 !important; border-color: #edbec4 !important; color: #9e2538 !important; }
  .rudra-register-page .react-auth-notice.success { background: #fbf5e6 !important; border-color: #d7c298 !important; color: #61440f !important; }
  .rudra-register-page .react-auth-mobile-image { display: none !important; }
  @media (max-width: 980px) {
    .rudra-register-page .react-auth-image-column { padding: 28px !important; }
    .rudra-register-page .react-auth-form-column { padding: 30px !important; }
    .rudra-register-page .react-auth-image-container {
      height: auto !important;
      aspect-ratio: 16 / 9;
      padding: 0 !important;
    }
  }
  @media (max-width: 760px) {
    .react-auth-shell.rudra-register-page { padding: 20px 16px !important; }
    .rudra-register-page .react-auth-split-layout {
      display: block !important;
      min-height: 0 !important;
      border-radius: 18px;
    }
    .rudra-register-page .react-auth-image-column { display: none !important; }
    .rudra-register-page .react-auth-form-column { padding: 32px 26px !important; }
    .rudra-register-page .react-auth-mobile-image { display: block !important; margin: 4px 0 20px !important; }
    .rudra-register-page .react-auth-mobile-image .react-auth-side-image {
      display: block;
      width: 100% !important;
      max-height: none !important;
      height: auto !important;
      aspect-ratio: 16 / 9;
      padding: 0 !important;
      border: 1px solid #e6d1b0;
      border-radius: 12px;
      background: var(--rudra-maroon);
      object-fit: cover !important;
      object-position: center center !important;
    }
  }
  @media (max-width: 480px) {
    .react-auth-shell.rudra-register-page { padding: 12px 12px 24px !important; }
    .rudra-register-page .react-auth-form-column { padding: 26px 20px !important; }
    .rudra-register-page .rudra-register-brand { margin-bottom: 22px; }
    .rudra-register-page .rudra-register-brand-mark { width: 40px; height: 40px; }
    .rudra-register-page .rudra-register-brand-text strong { font-size: 25px; }
    .rudra-register-page .user-register-form h1 { font-size: 29px !important; }
    .rudra-register-page .user-register-secondary-actions { grid-template-columns: 1fr; gap: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rudra-register-page .user-register-button,
    .rudra-register-page .user-register-link-button { transition: none; }
  }
`;

interface PendingOtp {
  masked_email: string;
  expiry_minutes: number;
  remaining_attempts: number;
  expired?: boolean;
}

interface RegistrationSessionPayload {
  success: boolean;
  authenticated: boolean;
  csrf_token: string;
  pending_otp: PendingOtp | null;
  login_url?: string;
}

interface RegistrationApiPayload {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  errors?: string[];
  masked_email?: string;
  expiry_minutes?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  restart_required?: boolean;
  csrf_token?: string;
  redirect_url?: string;
  status?: string;
}

type RegistrationStage = "form" | "otp";
type NoticeKind = "success" | "error" | "info";

interface Notice {
  kind: NoticeKind;
  text: string;
}

interface UserRegistrationForm {
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

const INITIAL_FORM: UserRegistrationForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
};

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

function apiMessage(payload: RegistrationApiPayload, fallback: string): string {
  return payload.message?.trim() || fallback;
}

export function UserRegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get("next") || "";
  const nextUrl = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/\\") ? requestedNext : "/dashboard";
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<RegistrationStage>("form");
  const [form, setForm] = useState<UserRegistrationForm>(INITIAL_FORM);
  const [otp, setOtp] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationSession() {
      try {
        const response = await fetch(apiUrl("/react/api/register/user/session"), {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await readJson<RegistrationSessionPayload>(response);

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error("Unable to load the registration session.");
        }

        setCsrfToken(payload.csrf_token);

        if (payload.authenticated) {
          navigate(nextUrl, { replace: true });
          return;
        }

        if (payload.pending_otp) {
          setMaskedEmail(payload.pending_otp.masked_email);
          setExpiryMinutes(payload.pending_otp.expiry_minutes);
          setRemainingAttempts(payload.pending_otp.remaining_attempts);
          setStage("otp");

          if (payload.pending_otp.expired) {
            setNotice({
              kind: "info",
              text: "The previous OTP expired. Use Resend OTP to continue.",
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load the registration session.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRegistrationSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (stage === "otp") {
      window.setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [stage]);

  function updateField<K extends keyof UserRegistrationForm>(
    key: K,
    value: UserRegistrationForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function requestRegistrationOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!form.full_name.trim()) {
      setNotice({ kind: "error", text: "Enter your full name." });
      return;
    }
    if (!form.email.trim()) {
      setNotice({ kind: "error", text: "Enter your email address." });
      return;
    }
    if (!form.phone.trim()) {
      setNotice({ kind: "error", text: "Enter your contact number." });
      return;
    }
    if (!form.address.trim()) {
      setNotice({ kind: "error", text: "Enter your delivery address." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        apiUrl("/react/api/register/user/request-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            address: form.address.trim(),
          }),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);

      if (payload.csrf_token) setCsrfToken(payload.csrf_token);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.redirect_url) {
          if (
            payload.redirect_url.startsWith("/") &&
            !payload.redirect_url.startsWith("//")
          ) {
            navigate(payload.redirect_url, { replace: true });
          } else {
            window.location.assign(payload.redirect_url);
          }
          return;
        }
        throw new Error(apiMessage(payload, "Unable to send the registration OTP."));
      }

      setMaskedEmail(payload.masked_email || form.email.trim().toLowerCase());
      setExpiryMinutes(payload.expiry_minutes || 0);
      setRemainingAttempts(payload.max_attempts ?? null);
      setOtp("");
      setStage("otp");
      setNotice({
        kind: "success",
        text: payload.message || "Registration OTP sent successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to send the registration OTP.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyRegistrationOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!/^\d{6}$/.test(otp)) {
      setNotice({ kind: "error", text: "Enter the complete six-digit OTP." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        apiUrl("/react/api/register/user/verify-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ otp }),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);

      if (payload.csrf_token) setCsrfToken(payload.csrf_token);
      if (typeof payload.remaining_attempts === "number") {
        setRemainingAttempts(payload.remaining_attempts);
      }

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.restart_required) {
          setStage("form");
          setOtp("");
        }
        throw new Error(apiMessage(payload, "Unable to verify the OTP."));
      }

      if (!payload.authenticated) {
        throw new Error(
          "Registration was verified, but the login session was not created. Please try again.",
        );
      }

      // The register API now creates the authenticated session immediately.
      // Use a full navigation so app-level auth/session state is refreshed cleanly.
      const redirectUrl = nextUrl !== "/dashboard" ? nextUrl : (payload.redirect_url || "/dashboard");
      if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
        window.location.assign(redirectUrl);
      } else {
        window.location.assign("/dashboard");
      }
      return;
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to verify the OTP.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setNotice(null);
    setResending(true);

    try {
      const response = await fetch(
        apiUrl("/react/api/register/user/resend-otp"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({}),
        },
      );
      const payload = await readJson<RegistrationApiPayload>(response);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.restart_required) {
          setStage("form");
          setOtp("");
        }
        throw new Error(apiMessage(payload, "Unable to resend the OTP."));
      }

      setMaskedEmail(payload.masked_email || maskedEmail);
      setExpiryMinutes(payload.expiry_minutes || expiryMinutes);
      setRemainingAttempts(payload.max_attempts ?? null);
      setOtp("");
      setNotice({
        kind: "success",
        text: payload.message || "A new registration OTP was sent.",
      });
      otpInputRef.current?.focus();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to resend the OTP.",
      });
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  }

  function handleOtpKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && otp.length !== 6) {
      event.preventDefault();
      setNotice({ kind: "error", text: "Enter the complete six-digit OTP." });
    }
  }

  function editDetails() {
    setStage("form");
    setOtp("");
    setNotice(null);
  }

  if (loading) {
    return (
      <>
        <style>{RUDRA_REGISTRATION_STYLES}</style>
        <main className="react-auth-shell rudra-register-page" aria-busy="true">
          <section className="react-auth-card" style={{ maxWidth: 420, padding: 40, textAlign: "center", background: "#ffffff" }}>
            <div className="react-auth-loader" />
            <p className="react-auth-loading-text">Loading user registration…</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{RUDRA_REGISTRATION_STYLES}</style>
      <main className="react-auth-shell react-auth-login-page rudra-register-page">
        <div className="react-auth-container">
          <div className="react-auth-split-layout">
            {/* Left panel: branded artwork, matching the navy and gold login theme. */}
            <div className="react-auth-image-column">
              <div className="rudra-register-side-intro">
                <span className="rudra-register-side-kicker">WELCOME TO EASYFINDSTORE</span>
                <h2>Thoughtful finds.<br />Timeless style.</h2>
                <p>Create an account to make shopping and order tracking easier, with secure email OTP verification.</p>
              </div>
              <div className="react-auth-image-container">
                <img src={registerPageImage} alt="EasyFindStore fashion and lifestyle shopping collection" className="react-auth-side-image" />
              </div>
              <div className="rudra-register-security"><FiLock size={15} aria-hidden="true" /> Secure signup with email OTP</div>
            </div>

            {/* Right panel: existing customer registration and OTP flows. */}
            <div className="react-auth-form-column">
              <section className="react-auth-card">
                <Link to="/" className="rudra-register-brand" aria-label="EasyFindStore home">
                  <span className="rudra-register-brand-mark" aria-hidden="true"><FiStar size={22} /></span>
                  <span className="rudra-register-brand-text">
                    <strong>EasyFindStore</strong>
                    <small>BY SKLASSICS</small>
                  </span>
                </Link>

                {notice && (
                  <div className={`react-auth-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
                    {notice.text}
                  </div>
                )}

                {stage === "form" ? (
                  <form className="react-auth-content user-register-form" onSubmit={requestRegistrationOtp} noValidate>
                    <span className="react-auth-eyebrow">CUSTOMER ACCOUNT</span>
                    <h1>Create your account</h1>
                    <p>Enter your details to join EasyFindStore. We’ll verify your email using a six-digit OTP.</p>

                    <div className="react-auth-mobile-image">
                      <img src={registerPageImage} alt="EasyFindStore fashion and lifestyle shopping collection" className="react-auth-side-image" />
                    </div>

                    <label className="react-auth-field">
                      <span>Full name</span>
                      <input type="text" value={form.full_name} onChange={e => updateField("full_name", e.target.value)} autoComplete="name" placeholder="Enter your full name" required autoFocus />
                    </label>
                    <label className="react-auth-field">
                      <span>Email address</span>
                      <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} autoComplete="email" placeholder="name@example.com" required />
                    </label>
                    <label className="react-auth-field">
                      <span>Contact number</span>
                      <input type="tel" value={form.phone} onChange={e => updateField("phone", e.target.value)} autoComplete="tel" inputMode="tel" placeholder="Enter your contact number" required />
                    </label>
                    <label className="react-auth-field">
                      <span>Delivery address</span>
                      <textarea rows={3} value={form.address} onChange={e => updateField("address", e.target.value)} autoComplete="street-address" placeholder="Enter your delivery address" required />
                    </label>

                    <button className="user-register-button" type="submit" disabled={submitting || !csrfToken}>
                      {submitting ? "Sending OTP…" : <>Continue with Email OTP <FiArrowRight size={17} aria-hidden="true" /></>}
                    </button>
                    <div className="user-register-actions">
                      <Link className="user-register-link-button" to={`${LOGIN_URL}?next=${encodeURIComponent(nextUrl)}`}>
                        Already registered? Login
                      </Link>
                      <Link className="user-register-link-button" to="/">Back to Home</Link>
                    </div>
                  </form>
                ) : (
                  <form className="react-auth-content user-register-form" onSubmit={verifyRegistrationOtp} noValidate>
                    <span className="react-auth-eyebrow">EMAIL VERIFICATION</span>
                    <h1>Verify your email</h1>
                    <p>Enter the six-digit code sent to <strong>{maskedEmail}</strong>{expiryMinutes > 0 ? ` within ${expiryMinutes} minutes.` : "."}</p>
                    <label className="react-auth-field react-auth-otp-field">
                      <span>Registration OTP</span>
                      <input ref={otpInputRef} type="text" value={otp} onChange={event => handleOtpChange(event.target.value)} onKeyDown={handleOtpKeyDown} inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" placeholder="000000" aria-label="Six-digit user registration OTP" />
                    </label>
                    {remainingAttempts !== null && (
                      <small className="react-auth-attempts">{remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining</small>
                    )}
                    <button className="user-register-button" type="submit" disabled={submitting || otp.length !== 6}>
                      {submitting ? "Verifying…" : <>Verify &amp; Continue <FiCheckCircle size={17} aria-hidden="true" /></>}
                    </button>
                    <div className="user-register-secondary-actions">
                      <button type="button" className="user-register-button" onClick={resendOtp} disabled={resending}>
                        {resending ? "Sending…" : "Resend OTP"}
                      </button>
                      <button type="button" className="user-register-button" onClick={editDetails} disabled={submitting || resending}>
                        Edit details
                      </button>
                    </div>
                    <div className="user-register-actions">
                      <Link className="user-register-link-button" to="/">Back to Home</Link>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default UserRegistrationPage;
