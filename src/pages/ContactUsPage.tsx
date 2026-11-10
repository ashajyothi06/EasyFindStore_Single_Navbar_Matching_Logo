import { FormEvent, useEffect, useState } from "react";

import contactRetailImage from "../assets/easyfind/support-retail.jpg";

const CONTACT_IMAGE = contactRetailImage;

type ContactOtpState = {
  verified?: boolean;
  verified_email?: string;
  pending?: boolean;
  expired?: boolean;
  masked_email?: string;
  expiry_minutes?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  resend_seconds?: number;
};

type SupportSession = {
  success: boolean;
  authenticated: boolean;
  csrf_token: string;
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
  contact_otp?: ContactOtpState | null;
};

type OtpResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  masked_email?: string;
  verified_email?: string;
  verified?: boolean;
  expiry_minutes?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  retry_after_seconds?: number;
  restart_required?: boolean;
};

type ContactResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  csrf_token?: string;
  contact_number?: string;
  email_verified?: boolean;
};

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const CONTACT_STYLES = `
  :root{
    --contact-olive:#751f2b;
    --contact-olive-hover:#590f1b;
    --contact-olive-soft:#faf0ed;
    --contact-page:#fbf6ee;
    --contact-border:#e7d6ba;
    --contact-text:#302226;
    --contact-muted:#75676b;
    --contact-danger:#9b281d;
  }

  .contact-page{
    min-height:70vh;
    width:100%;
    padding:24px clamp(20px,3.6vw,56px) 48px;
    background:var(--contact-page);
    color:var(--contact-text);
    font-family:"EB Garamond",Georgia,serif;
  }

  .contact-shell{
    width:100%;
    max-width:none;
    margin:0;
    display:grid;
    grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);
    gap:24px;
  }

  .contact-copy,
  .contact-form-card{
    padding:clamp(22px,4vw,38px);
    border:1px solid var(--contact-border);
    border-radius:22px;
    background:#fff;
    box-shadow:0 16px 42px rgba(51,55,27,.08);
  }

  .contact-form-card{
    display:flex;
    flex-direction:column;
    align-self:stretch;
  }

  .contact-copy{
    position:relative;
    min-height:680px;
    padding:0;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    background:
      radial-gradient(circle at 12% 8%,rgba(255,255,255,.11),transparent 24%),
      linear-gradient(145deg,var(--contact-olive),var(--contact-olive-hover));
    color:#fff;
    isolation:isolate;
  }

  .contact-copy::before{
    content:"";
    position:absolute;
    width:260px;
    height:260px;
    top:-115px;
    right:-95px;
    z-index:-1;
    border:1px solid rgba(255,255,255,.12);
    border-radius:50%;
  }

  .contact-copy::after{
    content:"";
    position:absolute;
    width:170px;
    height:170px;
    left:-85px;
    bottom:120px;
    z-index:-1;
    border:1px solid rgba(255,255,255,.08);
    border-radius:50%;
  }

  .contact-copy-content{
    padding:clamp(26px,4vw,42px) clamp(24px,3vw,38px) 22px;
  }

  .contact-copy h1{
    margin:10px 0 18px;
    max-width:430px;
    font-size:clamp(2.65rem,5vw,4.8rem);
    line-height:.9;
    letter-spacing:-.045em;
  }

  .contact-kicker{
    color:inherit;
    font-size:.78rem;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }

  .contact-form-card > .contact-kicker,
  .contact-form-card h2,
  .contact-field label{
    color:var(--contact-olive);
  }

  .contact-form-card h2{
    margin:8px 0 28px;
  }

  .contact-image-stage{
    position:relative;
    width:100%;
    flex:1;
    min-height:0;
    margin:0;
    padding:10px 18px 22px;
    overflow:hidden;
    display:flex;
    align-items:center;
    justify-content:center;
    background:transparent;
  }

  .contact-image-stage::before,
  .contact-image-stage::after{
    display:none;
  }

  .contact-image-stage img{
    width:auto;
    max-width:100%;
    height:420px;
    max-height:calc(100% - 8px);
    display:block;
    object-fit:contain;
    object-position:center;
    flex:0 0 auto;
    transform:none;
    transition:none;
  }

  .contact-image-stage:hover img{
    transform:none;
  }

  .contact-image-badge{
    position:absolute;
    top:24px;
    left:30px;
    z-index:3;
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:9px 13px;
    border:1px solid rgba(255,255,255,.28);
    border-radius:999px;
    background:rgba(51,55,27,.7);
    color:#fff;
    font-size:.75rem;
    font-weight:900;
    letter-spacing:.045em;
    backdrop-filter:blur(10px);
    -webkit-backdrop-filter:blur(10px);
  }

  .contact-image-badge::before{
    content:"";
    width:8px;
    height:8px;
    border-radius:50%;
    background:#efd9a9;
    box-shadow:0 0 0 4px rgba(223,233,188,.14);
  }

  .contact-image-caption{
    position:absolute;
    left:30px;
    right:30px;
    bottom:32px;
    z-index:3;
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:16px;
    color:#fff;
  }

  .contact-image-caption strong{
    display:block;
    max-width:300px;
    font-size:clamp(1.25rem,2vw,1.7rem);
    line-height:1.05;
  }

  .contact-image-caption span{
    display:inline-flex;
    flex:0 0 auto;
    padding:7px 10px;
    border:1px solid rgba(255,255,255,.22);
    border-radius:999px;
    background:rgba(255,255,255,.1);
    color:rgba(255,255,255,.86);
    font-size:.7rem;
    font-weight:800;
    backdrop-filter:blur(8px);
    -webkit-backdrop-filter:blur(8px);
  }

  .contact-form{
    width:100%;
    flex:1;
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    column-gap:14px;
    row-gap:clamp(18px,2.2vh,28px);
    align-items:start;
    align-content:space-between;
  }

  .contact-field{
    min-width:0;
    display:grid;
    align-content:start;
    gap:7px;
  }

  .contact-field.full{
    grid-column:1/-1;
  }

  .contact-field label{
    font-weight:800;
  }

  .contact-field input,
  .contact-field textarea{
    width:100%;
    box-sizing:border-box;
    padding:12px 13px;
    border:1px solid var(--contact-border);
    border-radius:11px;
    outline:none;
    background:#fff;
    color:var(--contact-text);
    font:inherit;
    transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease;
  }

  .contact-field input{
    height:48px;
    min-height:48px;
  }

  .contact-field input:focus,
  .contact-field textarea:focus{
    border-color:var(--contact-olive);
    box-shadow:0 0 0 3px rgba(51,55,27,.12);
  }

  .contact-field input:disabled{
    background:#f1f2eb;
    color:#636855;
    cursor:not-allowed;
  }

  .contact-field textarea{
    min-height:190px;
    resize:vertical;
  }

  .contact-field.full{
    width:100%;
  }

  .contact-email-actions{
    min-height:40px;
    display:flex;
    flex-wrap:wrap;
    align-items:flex-start;
    gap:8px;
    margin-top:0;
  }

  .contact-otp-panel{
    grid-column:1/-1;
    display:grid;
    gap:12px;
    padding:15px;
    border:1px solid #d5dbc8;
    border-radius:14px;
    background:var(--contact-olive-soft);
  }

  .contact-otp-head{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
  }

  .contact-otp-head strong{
    display:block;
    color:var(--contact-olive);
  }

  .contact-otp-head small{
    display:block;
    margin-top:3px;
    color:var(--contact-muted);
    line-height:1.4;
  }

  .contact-otp-row{
    display:grid;
    grid-template-columns:minmax(0,1fr) auto;
    gap:9px;
  }

  .contact-otp-input{
    width:100%;
    min-height:44px;
    box-sizing:border-box;
    padding:10px 13px;
    border:1px solid #cbd2bd;
    border-radius:10px;
    outline:none;
    background:#fff;
    color:var(--contact-text);
    font:inherit;
    font-size:1.05rem;
    font-weight:800;
    letter-spacing:.22em;
  }

  .contact-otp-input:focus{
    border-color:var(--contact-olive);
    box-shadow:0 0 0 3px rgba(51,55,27,.12);
  }

  .contact-otp-actions{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
  }

  .contact-small-btn{
    min-height:40px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:8px 13px;
    border:1px solid var(--contact-olive);
    border-radius:10px;
    background:#fff;
    color:var(--contact-olive);
    font:inherit;
    font-size:.84rem;
    font-weight:850;
    cursor:pointer;
    transition:background-color .18s ease,border-color .18s ease,color .18s ease;
  }

  .contact-small-btn.primary{
    background:var(--contact-olive);
    color:#fff;
  }

  .contact-small-btn:hover:not(:disabled){
    background:var(--contact-olive-soft);
  }

  .contact-small-btn.primary:hover:not(:disabled){
    border-color:var(--contact-olive-hover);
    background:var(--contact-olive-hover);
  }

  .contact-small-btn:disabled{
    cursor:not-allowed;
    opacity:.58;
  }

  .contact-verified{
    grid-column:1/-1;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:12px 14px;
    border:1px solid #cfd7be;
    border-radius:12px;
    background:var(--contact-olive-soft);
    color:var(--contact-olive);
    font-size:.9rem;
    font-weight:800;
  }

  .contact-submit{
    grid-column:1/-1;
    min-height:46px;
    border:1px solid var(--contact-olive);
    border-radius:12px;
    background:var(--contact-olive);
    color:#fff;
    font:inherit;
    font-weight:900;
    cursor:pointer;
    transition:background-color .18s ease,border-color .18s ease,opacity .18s ease;
  }

  .contact-submit:hover:not(:disabled){
    border-color:var(--contact-olive-hover);
    background:var(--contact-olive-hover);
  }

  .contact-submit:disabled{
    cursor:not-allowed;
    opacity:.58;
  }

  .contact-alert{
    grid-column:1/-1;
    padding:11px 13px;
    border:1px solid #d4dac6;
    border-radius:10px;
    background:var(--contact-olive-soft);
    color:var(--contact-olive);
  }

  .contact-alert.error{
    border-color:#f0c8c3;
    background:#fff0ef;
    color:var(--contact-danger);
  }

  .contact-verification-note{
    grid-column:1/-1;
    margin:-2px 0 0;
    color:var(--contact-muted);
    font-size:.82rem;
    line-height:1.5;
  }

  @media(max-width:760px){
    .contact-page{
      padding:20px 16px 40px;
    }

    .contact-form-card{
      display:block;
    }

    .contact-shell{
      grid-template-columns:1fr;
    }

    .contact-copy{
      min-height:auto;
    }

    .contact-image-stage{
      min-height:340px;
      padding:8px 16px 20px;
    }

    .contact-image-stage img{
      height:320px;
      max-height:none;
    }

    .contact-form{
      grid-template-columns:1fr;
      row-gap:16px;
      align-content:start;
    }

    .contact-field.full,
    .contact-submit,
    .contact-alert,
    .contact-otp-panel,
    .contact-verified,
    .contact-verification-note{
      grid-column:auto;
    }
  }

  @media(max-width:480px){
    .contact-page{
      padding:18px 12px 34px;
    }

    .contact-copy,
    .contact-form-card{
      border-radius:17px;
    }

    .contact-copy-content{
      padding:24px 18px 18px;
    }

    .contact-image-stage{
      min-height:270px;
      margin:0;
      padding:4px 10px 16px;
    }

    .contact-image-stage img{
      width:auto;
      max-width:100%;
      height:250px;
      max-height:none;
      object-fit:contain;
    }

    .contact-image-caption{
      left:20px;
      right:20px;
      bottom:22px;
      align-items:flex-start;
      flex-direction:column;
      gap:9px;
    }

    .contact-image-caption strong{
      max-width:240px;
      font-size:1.2rem;
    }

    .contact-otp-row{
      grid-template-columns:1fr;
    }

    .contact-otp-row .contact-small-btn{
      width:100%;
    }

    .contact-verified{
      align-items:flex-start;
      flex-direction:column;
    }

    .contact-email-actions,
    .contact-otp-actions{
      width:100%;
    }

    .contact-email-actions .contact-small-btn,
    .contact-otp-actions .contact-small-btn{
      flex:1;
    }
  }
`;

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactUsPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(5);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void fetch("/react/api/support/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => ({}))) as SupportSession;

        if (!response.ok || payload.success !== true) {
          throw new Error("Unable to initialise the contact form.");
        }

        if (!active) return;

        setAuthenticated(Boolean(payload.authenticated));
        setCsrfToken(payload.csrf_token || "");

        const initialEmail = payload.user?.email || "";

        setForm((current) => ({
          ...current,
          full_name:
            current.full_name ||
            payload.user?.full_name ||
            "",
          email: current.email || initialEmail,
          phone: current.phone || payload.user?.phone || "",
        }));

        const contactOtp = payload.contact_otp;

        if (
          contactOtp?.verified &&
          contactOtp.verified_email &&
          initialEmail &&
          contactOtp.verified_email.toLowerCase() ===
            initialEmail.toLowerCase()
        ) {
          setOtpSent(true);
          setOtpVerified(true);
          setMaskedEmail(
            contactOtp.masked_email || contactOtp.verified_email,
          );
          setOtpExpiryMinutes(contactOtp.expiry_minutes || 5);
        } else if (
          contactOtp?.pending &&
          initialEmail
        ) {
          setOtpSent(true);
          setOtpVerified(false);
          setMaskedEmail(contactOtp.masked_email || initialEmail);
          setOtpExpiryMinutes(contactOtp.expiry_minutes || 5);
          setRemainingAttempts(
            typeof contactOtp.remaining_attempts === "number"
              ? contactOtp.remaining_attempts
              : null,
          );
          setResendIn(
            Math.max(0, Number(contactOtp.resend_seconds || 0)),
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? `${err.message} Refresh and try again.`
            : "Unable to initialise the contact form. Refresh and try again.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn]);

  const updateField = (
    key: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetEmailVerification = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setMaskedEmail("");
    setRemainingAttempts(null);
    setResendIn(0);
    setNotice("");
    setError("");
  };

  const requestOtp = async () => {
    if (otpBusy) return;

    const fullName = form.full_name.trim();
    const email = form.email.trim();

    if (fullName.length < 2) {
      setError("Enter your name before requesting an OTP.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Enter a valid email address before requesting an OTP.");
      return;
    }

    if (!csrfToken) {
      setError("Security token is not ready. Refresh the page and try again.");
      return;
    }

    setOtpBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/react/api/support/contact/request-otp",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone: form.phone,
            csrf_token: csrfToken,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as OtpResponse;

      if (payload.csrf_token) {
        setCsrfToken(payload.csrf_token);
      }

      if (!response.ok || payload.success !== true) {
        if (payload.retry_after_seconds) {
          setResendIn(
            Math.max(0, Number(payload.retry_after_seconds)),
          );
        }

        throw new Error(
          payload.message || "Unable to send the verification OTP.",
        );
      }

      setOtp("");
      setOtpSent(true);
      setOtpVerified(false);
      setMaskedEmail(payload.masked_email || email);
      setOtpExpiryMinutes(payload.expiry_minutes || 5);
      setRemainingAttempts(
        typeof payload.max_attempts === "number"
          ? payload.max_attempts
          : null,
      );
      setResendIn(
        Math.max(0, Number(payload.retry_after_seconds || 0)),
      );
      setNotice(
        payload.message ||
          "Verification OTP sent successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the verification OTP.",
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otpBusy) return;

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Enter the six-digit OTP sent to your email.");
      return;
    }

    setOtpBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/react/api/support/contact/verify-otp",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            otp: cleanOtp,
            csrf_token: csrfToken,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as OtpResponse;

      if (payload.csrf_token) {
        setCsrfToken(payload.csrf_token);
      }

      if (!response.ok || payload.success !== true) {
        if (typeof payload.remaining_attempts === "number") {
          setRemainingAttempts(payload.remaining_attempts);
        }

        if (
          payload.code === "otp_expired" ||
          payload.code === "maximum_attempts" ||
          payload.restart_required
        ) {
          setOtp("");
        }

        throw new Error(
          payload.message || "Unable to verify the OTP.",
        );
      }

      setOtpVerified(true);
      setRemainingAttempts(null);
      setNotice(
        payload.message ||
          "Email verified successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify the OTP.",
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (busy) return;

    if (!otpVerified) {
      setError(
        "Verify your email with the OTP before sending your message.",
      );
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/react/api/support/contact", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          ...form,
          csrf_token: csrfToken,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as ContactResponse;

      if (payload.csrf_token) {
        setCsrfToken(payload.csrf_token);
      }

      if (!response.ok || payload.success !== true) {
        if (
          payload.code === "email_verification_required" ||
          payload.code === "email_verification_mismatch"
        ) {
          setOtpVerified(false);
          setOtpSent(false);
          setOtp("");
          setMaskedEmail("");
        }

        throw new Error(
          payload.message || "Unable to send your message.",
        );
      }

      setNotice(
        `${payload.message || "Your message has been received."}${
          payload.contact_number
            ? ` Reference: ${payload.contact_number}`
            : ""
        }`,
      );

      setForm((current) => ({
        ...current,
        subject: "",
        message: "",
      }));

      // Verification is one-time. A fresh OTP is required for the next
      // Contact Us submission.
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
      setMaskedEmail("");
      setRemainingAttempts(null);
      setResendIn(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send your message.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{CONTACT_STYLES}</style>

      <main className="contact-page">
        <div className="contact-shell">
          <section className="contact-copy">
            <div className="contact-copy-content">
              <span className="contact-kicker">
                EasyFindStore support
              </span>

              <h1>Contact us</h1>

            </div>

            {CONTACT_IMAGE ? (
              <div className="contact-image-stage">
                <img
                  src={CONTACT_IMAGE}
                  alt="EasyFindStore customer support"
                />

                <div className="contact-image-badge">
                  We&apos;re here to help
                </div>

                <div className="contact-image-caption">
                  {/* <strong>
                    Customer support for every EasyFindStore order.
                  </strong> */}
                  <span>Email verified support</span>
                </div>
              </div>
            ) : null}

          </section>

          <section className="contact-form-card">
            <span className="contact-kicker">
              Send a message
            </span>

            <h2>How can we help?</h2>

            <form className="contact-form" onSubmit={submit}>
              <div className="contact-field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    updateField("full_name", event.target.value)
                  }
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  required
                  type="email"
                  disabled={otpSent}
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                />

                {!otpSent ? (
                  <div className="contact-email-actions">
                    <button
                      className="contact-small-btn primary"
                      type="button"
                      disabled={otpBusy || !csrfToken}
                      onClick={() => void requestOtp()}
                    >
                      {otpBusy ? "Sending…" : "Send OTP"}
                    </button>
                  </div>
                ) : null}
              </div>

              {otpSent && !otpVerified ? (
                <div className="contact-otp-panel">
                  <div className="contact-otp-head">
                    <div>
                      <strong>Verify your email</strong>
                      <small>
                        Enter the six-digit OTP sent to{" "}
                        {maskedEmail || form.email}. It expires in{" "}
                        {otpExpiryMinutes} minute
                        {otpExpiryMinutes === 1 ? "" : "s"}.
                        {remainingAttempts !== null
                          ? ` ${remainingAttempts} attempt${
                              remainingAttempts === 1 ? "" : "s"
                            } remaining.`
                          : ""}
                      </small>
                    </div>
                  </div>

                  <div className="contact-otp-row">
                    <input
                      className="contact-otp-input"
                      aria-label="Six-digit email OTP"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        )
                      }
                    />

                    <button
                      className="contact-small-btn primary"
                      type="button"
                      disabled={otpBusy || otp.length !== 6}
                      onClick={() => void verifyOtp()}
                    >
                      {otpBusy ? "Verifying…" : "Verify OTP"}
                    </button>
                  </div>

                  <div className="contact-otp-actions">
                    <button
                      className="contact-small-btn"
                      type="button"
                      disabled={otpBusy || resendIn > 0}
                      onClick={() => void requestOtp()}
                    >
                      {resendIn > 0
                        ? `Resend in ${resendIn}s`
                        : "Resend OTP"}
                    </button>

                    <button
                      className="contact-small-btn"
                      type="button"
                      disabled={otpBusy}
                      onClick={resetEmailVerification}
                    >
                      Change email
                    </button>
                  </div>
                </div>
              ) : null}

              {otpVerified ? (
                <div className="contact-verified" role="status">
                  <span>
                    ✓ Email verified: {maskedEmail || form.email}
                  </span>

                  <button
                    className="contact-small-btn"
                    type="button"
                    onClick={resetEmailVerification}
                  >
                    Change email
                  </button>
                </div>
              ) : null}

              <div className="contact-field full">
                <label htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                />
              </div>

              <div className="contact-field full">
                <label htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  required
                  value={form.subject}
                  onChange={(event) =>
                    updateField("subject", event.target.value)
                  }
                />
              </div>

              <div className="contact-field full">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  required
                  minLength={10}
                  value={form.message}
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                />
              </div>

              <p className="contact-verification-note">
                Email OTP verification is required for every new
                Contact Us submission. This page remains available
                without logging in.
              </p>

              {notice ? (
                <div className="contact-alert" role="status">
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div className="contact-alert error" role="alert">
                  {error}
                </div>
              ) : null}

              <button
                className="contact-submit"
                disabled={busy || !csrfToken || !otpVerified}
                type="submit"
              >
                {busy
                  ? "Sending…"
                  : otpVerified
                    ? "Send to Support"
                    : "Verify Email to Continue"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
