import {
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
  type ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Lock } from "lucide-react";
import { LoginLoader } from "../components/LoginLoader";
import { getJwtAuthIdentity, notifyJwtAuthChanged } from "../lib/jwtAuth";
import "../styles/react-auth.css";
import loginPageImage from "../assets/easyfind/signin-retail.jpg";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const USER_REGISTER_URL = "/store/register";
// const SELLER_REGISTER_URL = "/register/seller";
// const DELIVERY_REGISTER_URL = "/register/delivery";

const OTP_LENGTH = 6;


const EASYFINDSTORE_LOGIN_STYLES = `
/* EasyFindStore login theme — local to this page; all existing auth logic stays intact. */
.react-auth-shell.rudra-auth-page {
  --rudra-maroon: #0a2038;
  --rudra-dark: #061728;
  --rudra-red: #143754;
  --rudra-gold: #efbf60;
  --rudra-cream: #f6f8fb;
  --rudra-ink: #12283d;
  --rudra-muted: #62758a;
  width: 100%;
  min-height: min(850px, calc(100svh - 72px));
  padding: clamp(22px, 3vw, 52px) clamp(16px, 2.4vw, 48px) !important;
  margin: 0;
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: #f2f5f9 !important;
  color: var(--rudra-ink);
  box-sizing: border-box;
  overflow: hidden;
}
.rudra-auth-page *, .rudra-auth-page *::before, .rudra-auth-page *::after { box-sizing: border-box; }
.rudra-auth-page .react-auth-container {
  width: min(100%, 1450px) !important;
  max-width: 1450px !important;
  padding: 0 !important;
  margin: 0 auto !important;
}
.rudra-auth-page .react-auth-split-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, .95fr) !important;
  align-items: stretch !important;
  width: 100% !important;
  min-height: 620px;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
  gap: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(142, 95, 54, .2);
  border-radius: 24px;
  background: #ffffff !important;
  box-shadow: 0 18px 55px rgba(63, 11, 24, .1);
}
.rudra-auth-page .react-auth-form-column {
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  width: 100% !important;
  min-width: 0;
  padding: clamp(26px, 4.1vw, 68px) clamp(24px, 5vw, 84px) !important;
  margin: 0 !important;
  background: #ffffff !important;
}
.rudra-auth-page .react-auth-card {
  position: relative;
  width: 100% !important;
  max-width: 490px !important;
  min-width: 0;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 auto !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  color: var(--rudra-ink);
}
.rudra-auth-page .rudra-auth-brand {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 34px;
  text-decoration: none;
  color: var(--rudra-maroon);
}
.rudra-auth-page .rudra-auth-brand:hover { color: var(--rudra-red); }
.rudra-auth-page .rudra-auth-brand-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid var(--rudra-gold);
  border-radius: 13px;
  color: var(--rudra-gold);
  background: var(--rudra-maroon);
  font-size: 23px;
}
.rudra-auth-page .rudra-auth-brand-text { display: flex; flex-direction: column; gap: 1px; }
.rudra-auth-page .rudra-auth-brand-text strong {
  font: 700 clamp(24px, 2.35vw, 31px)/1.08 Georgia, 'Times New Roman', serif;
  letter-spacing: -.7px;
}
.rudra-auth-page .rudra-auth-brand-text small {
  color: #ad7b27;
  font-size: 9px;
  letter-spacing: 2px;
  font-weight: 800;
}
.rudra-auth-page .react-auth-content,
.rudra-auth-page .react-auth-email-content,
.rudra-auth-page .react-auth-otp-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  color: var(--rudra-ink) !important;
}
.rudra-auth-page .react-auth-eyebrow {
  align-self: flex-start;
  width: fit-content;
  padding: 7px 12px;
  margin: 0 0 20px !important;
  border: 1px solid rgba(216, 169, 73, .5);
  border-radius: 30px;
  background: #fff5dd !important;
  color: #775316 !important;
  text-transform: uppercase;
  font-size: 10px !important;
  font-weight: 800;
  line-height: 1.4;
  letter-spacing: 1.1px;
}
.rudra-auth-page .react-auth-content h1,
.rudra-auth-page .react-auth-content h2,
.rudra-auth-page .react-auth-content h3 {
  margin: 0 0 12px !important;
  color: var(--rudra-maroon) !important;
  background: none !important;
  -webkit-text-fill-color: var(--rudra-maroon) !important;
  font-family: Georgia, 'Times New Roman', serif !important;
  font-size: clamp(29px, 2.6vw, 39px) !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  letter-spacing: -.9px;
}
.rudra-auth-page .react-auth-content p {
  margin: 0 0 26px !important;
  color: var(--rudra-muted) !important;
  font-size: 14px;
  line-height: 1.7;
}
.rudra-auth-page .react-auth-content p strong { color: var(--rudra-maroon) !important; }
.rudra-auth-page .react-auth-field {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0 0 19px;
  color: var(--rudra-maroon);
}
.rudra-auth-page .react-auth-field span {
  font-size: 13px !important;
  font-weight: 750;
  color: var(--rudra-ink) !important;
}
.rudra-auth-page .react-auth-field input {
  width: 100%;
  min-height: 54px;
  padding: 0 16px !important;
  border: 1px solid #d7e1ea !important;
  border-radius: 11px !important;
  box-shadow: none !important;
  outline: 0;
  color: var(--rudra-ink) !important;
  background: #fff !important;
  font-size: 14px !important;
  transition: border-color .2s, box-shadow .2s;
}
.rudra-auth-page .react-auth-field input::placeholder { color: #71839a !important; }
.rudra-auth-page .react-auth-field input:focus {
  border-color: var(--rudra-red) !important;
  box-shadow: 0 0 0 3px rgba(225, 175, 70, .18) !important;
}
.rudra-auth-page .react-auth-primary-button,
.rudra-auth-page a.react-auth-primary-button {
  display: flex !important;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 53px;
  margin: 4px 0 0 !important;
  padding: 12px 20px !important;
  border: 1px solid var(--rudra-maroon) !important;
  border-radius: 11px !important;
  background: var(--rudra-maroon) !important;
  background-image: none !important;
  box-shadow: 0 8px 18px rgba(7, 26, 47, .17) !important;
  color: #f6f8fb !important;
  -webkit-text-fill-color: #f6f8fb !important;
  text-decoration: none !important;
  font-size: 14px !important;
  font-weight: 800;
  cursor: pointer;
  transition: background .2s, transform .2s;
}
.rudra-auth-page .react-auth-primary-button:hover:not(:disabled) {
  background: #183e5c !important;
  transform: translateY(-1px);
}
.rudra-auth-page .react-auth-primary-button:disabled {
  opacity: .58;
  cursor: not-allowed;
  transform: none;
}
.rudra-auth-page .react-auth-register-links {
  margin: 19px 0 0 !important;
  padding: 0 !important;
  text-align: center !important;
}
.rudra-auth-page .react-auth-register-links + .react-auth-register-links { margin-top: 12px !important; }
/* These links sit on navy buttons, so their labels must be cream/white.
   Include visited, hover, and focus states to override legacy auth CSS. */
.rudra-auth-page .react-auth-register-links a,
.rudra-auth-page .react-auth-register-links a:link,
.rudra-auth-page .react-auth-register-links a:visited,
.rudra-auth-page .react-auth-register-links a:hover,
.rudra-auth-page .react-auth-register-links a:focus-visible,
.rudra-auth-page .react-auth-register-links a:active {
  color: #f6f8fb !important;
  -webkit-text-fill-color: #f6f8fb !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  text-decoration: none !important;
  text-shadow: none !important;
}
.rudra-auth-page .react-auth-register-links a:hover {
  color: #fff1c9 !important;
  -webkit-text-fill-color: #fff1c9 !important;
}
.rudra-auth-page .react-auth-register-links a:focus-visible {
  outline: 3px solid #efbf60 !important;
  outline-offset: 3px;
}
/* OTP resend/change-email actions remain navy on the light form background. */
.rudra-auth-page .react-auth-text-button {
  color: var(--rudra-maroon) !important;
  -webkit-text-fill-color: var(--rudra-maroon) !important;
  font-size: 13px !important;
  font-weight: 750;
  text-decoration: none;
}
.rudra-auth-page .react-auth-text-button:hover { text-decoration: underline; }
.rudra-auth-page .react-auth-text-button {
  border: none !important;
  background: none !important;
  padding: 6px !important;
  cursor: pointer;
}
.rudra-auth-page .react-auth-secondary-actions {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px !important;
}
.rudra-auth-page .react-auth-notice {
  padding: 11px 14px;
  margin: 0 0 18px !important;
  border-radius: 10px;
  border: 1px solid #e7cfb0;
  color: #6e3b13 !important;
  background: #fff4e4 !important;
  font-size: 13px;
  line-height: 1.5;
}
.rudra-auth-page .react-auth-notice.error {
  border-color: #edbec4 !important;
  background: #fff0f1 !important;
  color: #9e2538 !important;
}
.rudra-auth-page .react-auth-notice.success {
  border-color: #d7c298 !important;
  color: #61440f !important;
  background: #fbf5e6 !important;
}
.rudra-auth-page .otp-anim-inputs {
  position: relative;
  display: flex !important;
  flex-direction: row !important;
  justify-content: center !important;
  align-items: center;
  flex-wrap: nowrap !important;
  gap: clamp(6px, 1vw, 11px) !important;
  margin: 4px 0 14px !important;
  padding: 0 !important;
  width: 100% !important;
  max-width: none !important;
}
.rudra-auth-page .otp-anim-wrapper {
  flex: 1 1 0;
  min-width: 0;
  max-width: 62px;
  margin: 0 !important;
  padding: 0 !important;
}
.rudra-auth-page .otp-anim-input {
  display: block;
  width: 100% !important;
  height: clamp(48px, 4.5vw, 59px) !important;
  padding: 0 !important;
  border: 1px solid #e1c8c5 !important;
  border-radius: 10px !important;
  background: #fffbf7 !important;
  box-shadow: none !important;
  color: var(--rudra-maroon);
  -webkit-text-fill-color: var(--rudra-maroon);
  font-size: clamp(20px, 2vw, 26px) !important;
  text-align: center;
  caret-color: var(--rudra-red);
}
.rudra-auth-page .otp-anim-input:focus {
  outline: none;
  border-color: var(--rudra-red) !important;
  box-shadow: 0 0 0 3px rgba(142, 37, 57, .1) !important;
}
.rudra-auth-page .otp-verified-card {
  border: 1px solid var(--rudra-gold) !important;
  background: var(--rudra-maroon) !important;
  color: #fff !important;
  border-radius: 14px;
}
.rudra-auth-page .otp-verified-icon { color: var(--rudra-gold) !important; }
.rudra-auth-page .otp-verified-copy strong,
.rudra-auth-page .otp-verified-copy small { color: #f9fbfe !important; }
.rudra-auth-page .react-auth-attempts {
  align-self: center;
  margin-bottom: 12px;
  color: var(--rudra-muted) !important;
}
.rudra-auth-page .otp-anim-success-text { color: var(--rudra-maroon) !important; }
.rudra-auth-page .otp-anim-footer { width: 100%; }
/* Right panel — deep navy framing, crisp original image, gold accents. */
.rudra-auth-page .react-auth-image-column {
  position: relative;
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  width: 100% !important;
  min-width: 0;
  min-height: 620px;
  padding: clamp(34px, 3.5vw, 58px) !important;
  overflow: hidden;
  background: var(--rudra-maroon) !important;
  color: #fff !important;
}
.rudra-auth-page .react-auth-image-column::before,
.rudra-auth-page .react-auth-image-column::after {
  content: '';
  position: absolute;
  height: 100px;
  width: 100px;
  pointer-events: none;
  opacity: .65;
}
.rudra-auth-page .react-auth-image-column::before {
  top: 20px; left: 20px;
  border-top: 1px solid var(--rudra-gold);
  border-left: 1px solid var(--rudra-gold);
}
.rudra-auth-page .react-auth-image-column::after {
  bottom: 20px; right: 20px;
  border-right: 1px solid var(--rudra-gold);
  border-bottom: 1px solid var(--rudra-gold);
}
.rudra-auth-page .rudra-auth-side-intro { position: relative; z-index: 1; }
.rudra-auth-page .rudra-auth-side-kicker {
  display: block;
  margin-bottom: 15px;
  color: #f2cf81;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 2.4px;
}
.rudra-auth-page .rudra-auth-side-intro h2 {
  margin: 0 0 12px;
  color: #f8f9fc;
  font: 700 clamp(31px, 2.9vw, 47px)/1.14 Georgia, 'Times New Roman', serif;
  letter-spacing: -.8px;
}
.rudra-auth-page .rudra-auth-side-intro p {
  margin: 0;
  max-width: 440px;
  color: #f5e3d9;
  font-size: 14px;
  line-height: 1.6;
}
.rudra-auth-page .react-auth-image-container {
  position: relative;
  z-index: 1;
  display: flex !important;
  justify-content: center;
  align-items: center;
  width: 100% !important;
  max-width: none !important;
  height: clamp(230px, 25vw, 335px) !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(233, 195, 117, .6);
  border-radius: 15px;
  background: #061728;
  box-shadow: 0 15px 30px rgba(34, 6, 16, .18);
}
.rudra-auth-page .react-auth-image-container .react-auth-side-image {
  display: block;
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  max-height: none !important;
  object-fit: cover !important;
  object-position: center !important;
  filter: none !important;
  opacity: 1 !important;
}
.rudra-auth-page .rudra-auth-security {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #f8e9da;
  font-size: 12px;
  font-weight: 600;
}
.rudra-auth-page .rudra-auth-security svg { flex: none; color: var(--rudra-gold); }
/* Compact fallback illustration on smaller screens: no extra right column. */
.rudra-auth-page .react-auth-mobile-image { display: none !important; }
@media (max-width: 980px) {
  .react-auth-shell.rudra-auth-page { min-height: calc(100svh - 70px); }
  .rudra-auth-page .react-auth-form-column { padding: 40px 32px !important; }
  .rudra-auth-page .react-auth-image-column { padding: 34px 28px !important; }
  .rudra-auth-page .react-auth-image-container { height: 260px !important; }
}
@media (max-width: 760px) {
  .react-auth-shell.rudra-auth-page { padding: 24px 16px !important; }
  .rudra-auth-page .react-auth-split-layout {
    display: block !important;
    min-height: 0;
    border-radius: 18px;
  }
  .rudra-auth-page .react-auth-form-column { padding: 34px 26px !important; }
  .rudra-auth-page .react-auth-image-column { display: none !important; }
  .rudra-auth-page .rudra-auth-brand { margin-bottom: 30px; }
  .rudra-auth-page .react-auth-mobile-image { display: block !important; margin: 0 0 24px !important; }
  .rudra-auth-page .react-auth-mobile-image .react-auth-side-image {
    display: block;
    width: 100% !important;
    max-width: none !important;
    height: 160px !important;
    max-height: none !important;
    border: 1px solid #e6d1b0;
    border-radius: 12px;
    object-fit: cover !important;
    object-position: center;
  }
}
@media (max-width: 480px) {
  .react-auth-shell.rudra-auth-page { padding: 12px 12px 24px !important; }
  .rudra-auth-page .react-auth-form-column { padding: 28px 20px !important; }
  .rudra-auth-page .rudra-auth-brand { gap: 10px; margin-bottom: 25px; }
  .rudra-auth-page .rudra-auth-brand-mark { width: 40px; height: 40px; font-size: 19px; }
  .rudra-auth-page .rudra-auth-brand-text strong { font-size: 25px; }
  .rudra-auth-page .react-auth-content h1,
  .rudra-auth-page .react-auth-content h2,
  .rudra-auth-page .react-auth-content h3 { font-size: 28px !important; }
  .rudra-auth-page .otp-anim-inputs { gap: 6px !important; }
  .rudra-auth-page .otp-anim-input { height: 47px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .rudra-auth-page .react-auth-primary-button,
  .rudra-auth-page .react-auth-field input { transition: none; }
}
`;

interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface PendingOtp {
  masked_email: string;
  expiry_minutes: number;
  remaining_attempts: number;
}

interface AuthSessionPayload {
  success: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  pending_otp: PendingOtp | null;
  csrf_token: string;
  dashboard_url: string;
}

interface AuthApiPayload {
  success: boolean;
  message?: string;
  code?: string;
  authenticated?: boolean;
  user?: AuthUser | null;
  masked_email?: string;
  expiry_minutes?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  restart_required?: boolean;
  csrf_token?: string;
  redirect_url?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

type LoginStage = "email" | "otp" | "authenticated";
type NoticeKind = "success" | "error" | "info";
type OtpAnimStatus = "idle" | "success";

interface Notice {
  kind: NoticeKind;
  text: string;
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  return payload;
}

function cleanNextUrl(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

function normaliseJwtUser(user: { id: string; email: string; full_name?: string; name?: string; role: string; status?: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.name || "",
    role: user.role,
    status: user.status || "",
  };
}

function getErrorMessage(payload: AuthApiPayload, fallback: string): string {
  return payload.message?.trim() || fallback;
}

// ---- Animation variants ----

const easeInOut = [0.42, 0, 0.58, 1] as const;
const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

function buildBoxVariants(): Variants {
  return {
    idle: {
      x: 0,
      y: 0,
      scale: 1,
      rotateX: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: easeInOut },
    },
    success: (custom: { index: number }) => {
      const delay = custom.index * 0.07;

      return {
        x: 0,
        y: [0, -9, 12],
        scale: [1, 1.06, 0.84],
        rotateX: [0, 0, 68],
        opacity: [1, 1, 0],
        transition: {
          delay,
          duration: 0.68,
          times: [0, 0.42, 1],
          ease: easeInOut,
        },
      };
    },
  };
}

const containerVariants: Variants = {
  idle: {},
  success: {},
};

const digitTextVariants: Variants = {
  idle: {
    opacity: 1,
    color: "#0a2038",
  },
  success: {
    opacity: [1, 1, 0],
    scale: [1, 1, 0.72],
    color: "rgba(85, 17, 31, 0)",
    transition: {
      delay: 0.18,
      duration: 0.42,
      ease: easeOut,
    },
  },
};

const verifiedCardVariants: Variants = {
  idle: {
    opacity: 0,
    scaleX: 0.18,
    scaleY: 0.78,
    x: "-50%",
    y: "-40%",
  },
  success: {
    opacity: 1,
    scaleX: [0.18, 1.06, 1],
    scaleY: [0.78, 1.04, 1],
    x: "-50%",
    y: "-50%",
    transition: {
      delay: 0.72,
      duration: 0.64,
      times: [0, 0.74, 1],
      ease: easeOut,
    },
  },
};

const shieldPathVariants: Variants = {
  idle: {
    pathLength: 0,
    opacity: 0,
  },
  success: {
    pathLength: 1,
    opacity: 1,
    transition: {
      delay: 0.94,
      duration: 0.48,
      ease: easeOut,
    },
  },
};

const verifiedTickVariants: Variants = {
  idle: {
    pathLength: 0,
    opacity: 0,
  },
  success: {
    pathLength: 1,
    opacity: 1,
    transition: {
      delay: 1.12,
      duration: 0.38,
      ease: easeOut,
    },
  },
};

const verifiedSweepVariants: Variants = {
  idle: {
    opacity: 0,
    x: "-160%",
  },
  success: {
    opacity: [0, 0.86, 0],
    x: ["-160%", "160%"],
    transition: { delay: 1.12, duration: 0.72, ease: easeInOut },
  },
};

const VERIFIED_ANIMATION_MS = 3900;

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const digitRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  const boxVariants = useMemo(() => buildBoxVariants(), []);

  const nextUrl = useMemo(
    () => cleanNextUrl(searchParams.get("next")),
    [searchParams],
  );

  const [stage, setStage] = useState<LoginStage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState("/dashboard");
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [otpAnimStatus, setOtpAnimStatus] = useState<OtpAnimStatus>("idle");
  const [showVerifiedText, setShowVerifiedText] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setLoading(true);

      try {
        const response = await fetch(apiUrl("/react/api/auth/session"), {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await readJson<AuthSessionPayload>(response);

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error("Unable to load login session.");
        }

        setCsrfToken(payload.csrf_token);
        setDashboardUrl(payload.dashboard_url || "/dashboard");

        // Validate JWT cookie against /auth/me, not a cached browser session.
        const identity = await getJwtAuthIdentity();
        if (cancelled) return;
        if (identity.authenticated && identity.user) {
          setAuthenticatedUser(normaliseJwtUser(identity.user));
          setStage("authenticated");
          return;
        }

        if (payload.pending_otp) {
          setMaskedEmail(payload.pending_otp.masked_email);
          setExpiryMinutes(payload.pending_otp.expiry_minutes);
          setRemainingAttempts(payload.pending_otp.remaining_attempts);
          setStage("otp");
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load login session.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage !== "otp") return;

    const focusTimer = window.setTimeout(() => {
      digitRefs.current[0]?.focus();
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [stage]);

  useEffect(() => {
    if (otp === "") {
      setOtpAnimStatus("idle");
      setShowVerifiedText(false);
    }
  }, [otp]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ kind: "error", text: "Enter your registered email address." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(apiUrl("/react/api/auth/request-otp"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          next: nextUrl,
        }),
      });
      const payload = await readJson<AuthApiPayload>(response);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        throw new Error(getErrorMessage(payload, "Unable to send the OTP."));
      }

      if (payload.authenticated && payload.redirect_url) {
        window.location.assign(nextUrl !== "/dashboard" ? nextUrl : payload.redirect_url);
        return;
      }

      if (payload.csrf_token) setCsrfToken(payload.csrf_token);
      setMaskedEmail(payload.masked_email || normalizedEmail);
      setExpiryMinutes(payload.expiry_minutes || 0);
      setRemainingAttempts(payload.max_attempts ?? null);
      setOtp("");
      setStage("otp");
      setNotice({
        kind: "success",
        text: payload.message || "OTP sent successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to send the OTP.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!/^\d{6}$/.test(otp)) {
      setNotice({ kind: "error", text: "Enter the complete six-digit OTP." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(apiUrl("/react/api/auth/verify-otp"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ otp }),
      });
      const payload = await readJson<AuthApiPayload>(response);

      if (payload.csrf_token) setCsrfToken(payload.csrf_token);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }

        if (typeof payload.remaining_attempts === "number") {
          setRemainingAttempts(payload.remaining_attempts);
        }

        if (payload.restart_required) {
          setStage("email");
          setOtp("");
          setMaskedEmail("");
        }

        throw new Error(getErrorMessage(payload, "Unable to verify the OTP."));
      }

      // Login is complete only when FastAPI has issued a JWT *and* the
      // browser can authenticate with the new HttpOnly access cookie.
      if (!payload.access_token || payload.token_type?.toLowerCase() !== "bearer") {
        throw new Error("The server did not issue a JWT. Check that the updated backend is running.");
      }
      const identity = await getJwtAuthIdentity();
      if (!identity.authenticated || !identity.user) {
        throw new Error(
          "JWT login could not be confirmed. Check HTTPS, cookie settings, and the API proxy.",
        );
      }
      notifyJwtAuthChanged();
      setAuthenticatedUser(normaliseJwtUser(identity.user));
      setNotice({
        kind: "success",
        text: payload.message || "Login successful.",
      });

      setOtpAnimStatus("success");
      window.setTimeout(() => setShowVerifiedText(true), 2450);
      window.setTimeout(() => {
        setStage("authenticated");
        window.location.assign(identity.user?.role === "user" && nextUrl !== "/dashboard" ? nextUrl : (payload.redirect_url || nextUrl || dashboardUrl));
      }, VERIFIED_ANIMATION_MS);
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
      const response = await fetch(apiUrl("/react/api/auth/resend-otp"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({}),
      });
      const payload = await readJson<AuthApiPayload>(response);

      if (payload.csrf_token) setCsrfToken(payload.csrf_token);

      if (!response.ok || !payload.success) {
        if (payload.code === "csrf_failed") {
          window.location.reload();
          return;
        }
        if (payload.restart_required) {
          setStage("email");
          setOtp("");
        }
        throw new Error(getErrorMessage(payload, "Unable to resend the OTP."));
      }

      setMaskedEmail(payload.masked_email || maskedEmail);
      setExpiryMinutes(payload.expiry_minutes || expiryMinutes);
      setOtp("");
      setNotice({
        kind: "success",
        text: payload.message || "A new OTP was sent.",
      });
      digitRefs.current[0]?.focus();
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

  function changeEmail() {
    setStage("email");
    setOtp("");
    setMaskedEmail("");
    setRemainingAttempts(null);
    setNotice(null);
  }

  const otpDigits = useMemo(() => {
    const chars = otp.split("");
    while (chars.length < OTP_LENGTH) chars.push("");
    return chars.slice(0, OTP_LENGTH);
  }, [otp]);

  function setDigitAt(index: number, char: string) {
    const chars = otpDigits.slice();
    chars[index] = char;
    handleOtpChange(chars.join(""));
  }

  function handleDigitChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    if (otpAnimStatus !== "idle") return;
    const value = e.target.value;
    const lastChar = value.slice(-1);
    if (lastChar && !/^\d$/.test(lastChar)) return;

    setDigitAt(index, lastChar);
    if (lastChar && index < OTP_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (otpAnimStatus !== "idle") return;

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      digitRefs.current[index - 1]?.focus();
      return;
    }

    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      digitRefs.current[index + 1]?.focus();
      return;
    }

    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      e.preventDefault();
      setDigitAt(index - 1, "");
      digitRefs.current[index - 1]?.focus();
      return;
    }

    handleOtpKeyDown(e);
  }

  function handleDigitPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (otpAnimStatus !== "idle") return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    handleOtpChange(pasted);
    const nextEmptyIndex = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    digitRefs.current[nextEmptyIndex]?.focus();
  }

  if (loading) {
    return <LoginLoader />;
  }

  return (
    <>
      <style>{EASYFINDSTORE_LOGIN_STYLES}</style>

      <main
        className="react-auth-shell react-auth-login-page rudra-auth-page"
      >
      <div className="react-auth-container">
        <div className="react-auth-split-layout">

          {/* === LEFT SIDE: FORM === */}
          <div className="react-auth-form-column">
            <section className="react-auth-card">
              <Link to="/" className="rudra-auth-brand" aria-label="EasyFindStore home">
                <span className="rudra-auth-brand-mark" aria-hidden="true">✧</span>
                <span className="rudra-auth-brand-text">
                  <strong>EasyFindStore</strong>
                  <small>BY SKLASSICS</small>
                </span>
              </Link>
              {notice && (
                <div
                  className={`react-auth-notice ${notice.kind}`}
                  role={notice.kind === "error" ? "alert" : "status"}
                >
                  {notice.text}
                </div>
              )}

              {stage === "authenticated" ? (
                <div className="react-auth-content">
                  <span className="react-auth-eyebrow">Account active</span>
                  <h1>You are already logged in</h1>
                  <p>
                    Continue as <strong>{authenticatedUser?.full_name || "User"}</strong>.
                  </p>
                  <a className="react-auth-primary-button" href={dashboardUrl}>
                    Open Dashboard
                  </a>
                </div>
              ) : stage === "email" ? (
                <form className="react-auth-content react-auth-email-content" onSubmit={requestOtp} noValidate>
                  <span className="react-auth-eyebrow">Passwordless access</span>

                  <div className="react-auth-mobile-image">
                    <img
                      src={loginPageImage}
                      alt="EasyFindStore Online Store"
                      className="react-auth-side-image"
                    />
                  </div>

                  <h3>Login with Email OTP</h3>
                  <p>
                    Enter your registered email address. We will send a six-digit
                    login OTP.
                  </p>

                  <label className="react-auth-field">
                    <span>Registered email</span>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder="name@example.com"
                    />
                  </label>

                  <button
                    className="react-auth-primary-button"
                    type="submit"
                    disabled={submitting || !csrfToken}
                  >
                    {submitting ? "Sending OTP…" : "Send Login OTP"}
                  </button>

                  <div className="react-auth-register-links">
                    <Link to={`${USER_REGISTER_URL}?next=${encodeURIComponent(nextUrl)}`}>User registration</Link>
                  </div>

                  <div className="react-auth-register-links">
                    <Link to="/">Back to Home</Link>
                  </div>
                </form>
              ) : (
                <form
                  className="react-auth-content react-auth-otp-content"
                  onSubmit={verifyOtp}
                  noValidate
                >
                  <span className="react-auth-eyebrow">Email verification</span>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={showVerifiedText ? "verified" : "unverified"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      {showVerifiedText ? (
                        <>
                          <h1>Verified successfully</h1>
                          <p>Your email has been verified.</p>
                        </>
                      ) : (
                        <>
                          <h1>Enter your six-digit OTP</h1>
                          <p>
                            The code was sent to <strong>{maskedEmail}</strong>
                            {expiryMinutes > 0 ? ` and expires in ${expiryMinutes} minutes.` : "."}
                          </p>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <input
                    ref={otpInputRef}
                    type="text"
                    value={otp}
                    readOnly
                    aria-hidden="true"
                    tabIndex={-1}
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                  />

                  <motion.div
                    className={`otp-anim-inputs ${otpAnimStatus === "success" ? "is-complete" : ""}`}
                    onPaste={handleDigitPaste}
                    variants={containerVariants}
                    initial="idle"
                    animate={otpAnimStatus}
                  >
                    {otpDigits.map((digit, index) => (
                      <motion.div
                        key={index}
                        className="otp-anim-wrapper"
                        custom={{ index }}
                        variants={boxVariants}
                        initial="idle"
                        animate={otpAnimStatus}
                      >
                        <motion.input
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          ref={(el) => {
                            digitRefs.current[index] = el;
                          }}
                          value={digit}
                          onChange={(e) => handleDigitChange(index, e)}
                          onKeyDown={(e) => handleDigitKeyDown(index, e)}
                          className="otp-anim-input"
                          readOnly={otpAnimStatus !== "idle"}
                          variants={digitTextVariants}
                          initial="idle"
                          animate={otpAnimStatus}
                          aria-label={`OTP digit ${index + 1}`}
                        />
                      </motion.div>
                    ))}

                    <AnimatePresence>
                      {otpAnimStatus === "success" && (
                        <motion.div
                          className="otp-verified-card"
                          variants={verifiedCardVariants}
                          initial="idle"
                          animate="success"
                          exit="idle"
                          aria-hidden="true"
                        >
                          <span className="otp-verified-icon">
                            <svg viewBox="0 0 24 24" fill="none">
                              <motion.path
                                d="M12 2.8 19 5.7v5.7c0 4.7-3 8.7-7 9.8-4-1.1-7-5.1-7-9.8V5.7L12 2.8Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                variants={shieldPathVariants}
                                initial="idle"
                                animate="success"
                              />
                              <motion.path
                                d="m8.2 12.2 2.4 2.4 5.4-5.5"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                variants={verifiedTickVariants}
                                initial="idle"
                                animate="success"
                              />
                            </svg>
                          </span>

                          <span className="otp-verified-copy">
                            <strong>OTP verified</strong>
                            <small>Secure login approved</small>
                          </span>

                          <motion.span
                            className="otp-verified-sweep"
                            variants={verifiedSweepVariants}
                            initial="idle"
                            animate="success"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {remainingAttempts !== null && otpAnimStatus === "idle" && (
                    <small className="react-auth-attempts">
                      {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining
                    </small>
                  )}

                  <button
                    className="react-auth-primary-button"
                    type="submit"
                    disabled={submitting || otp.length !== 6 || otpAnimStatus !== "idle"}
                  >
                    {submitting ? "Verifying…" : "Verify and Login"}
                  </button>

                  <div className="otp-anim-footer">
                    {otpAnimStatus === "idle" && (
                      <div className="react-auth-secondary-actions">
                        <button
                          type="button"
                          className="react-auth-text-button"
                          onClick={resendOtp}
                          disabled={resending}
                        >
                          {resending ? "Sending…" : "Resend OTP"}
                        </button>
                        <button
                          type="button"
                          className="react-auth-text-button"
                          onClick={changeEmail}
                          disabled={submitting || resending}
                        >
                          Change email
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {showVerifiedText && (
                        <motion.div
                          className="otp-anim-success-text"
                          initial={{ opacity: 0, y: 15, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                        >
                          Verified & Secured <Lock size={14} strokeWidth={2.5} color="#efbf60" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              )}
            </section>
          </div>

          {/* === RIGHT SIDE: IMAGE === */}
          <div className="react-auth-image-column">
            <div className="rudra-auth-side-intro">
              <span className="rudra-auth-side-kicker">THE EASYFINDSTORE EXPERIENCE</span>
              <h2>Thoughtful finds.<br />Timeless style.</h2>
              <p>Discover fashion, electronics, home essentials and more, with secure account access.</p>
            </div>
            <div className="react-auth-image-container">
              <img
                src={loginPageImage}
                alt="EasyFindStore Online Store"
                className="react-auth-side-image"
              />
            </div>
            <div className="rudra-auth-security"><Lock size={15} strokeWidth={1.9} /> Secure sign-in with email OTP</div>
          </div>

        </div>
      </div>
      </main>
    </>
  );
}
