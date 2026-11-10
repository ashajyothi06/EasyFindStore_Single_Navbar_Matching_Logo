import "../styles/login-loader.css";

interface LoginLoaderProps {
  message?: string;
}

export function LoginLoader({
  message = "Loading secure login…",
}: LoginLoaderProps) {
  return (
    <main className="react-auth-shell login-loader-page">
      <section
        className="react-auth-card login-loader-card"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="login-loader-visual" aria-hidden="true">
          <span className="login-loader-aura" />

          <span className="login-loader-orbit login-loader-orbit--outer">
            <span className="login-loader-node login-loader-node--yellow" />
            <span className="login-loader-node login-loader-node--green" />
          </span>

          <span className="login-loader-orbit login-loader-orbit--inner">
            <span className="login-loader-node login-loader-node--cream" />
          </span>

          <span className="login-loader-core">
            <svg
              viewBox="0 0 80 80"
              role="presentation"
              focusable="false"
            >
              <path
                d="M60.5 17.5C42.2 18.1 28.7 24.8 22.7 36c-5.3 9.9-2.5 21.8 6.6 27.3 9.1 5.6 21.4 2.8 27.5-6.3 6.2-9.2 5.4-23.1 3.7-39.5Z"
                fill="currentColor"
              />
              <path
                d="M22 61.5C29.4 48.2 40.5 37.8 55.4 29"
                fill="none"
                stroke="#33371b"
                strokeLinecap="round"
                strokeWidth="5"
              />
            </svg>
          </span>

          <span className="login-loader-scanline" />
        </div>

        <div className="login-loader-copy">
          <span className="login-loader-eyebrow">Secure OTP access</span>
          <h1 className="login-loader-title">Preparing your login</h1>
          <p className="login-loader-message">{message}</p>

          <div
            className="login-loader-progress"
            role="progressbar"
            aria-label="Preparing secure login session"
          >
            <span />
          </div>

          <div className="login-loader-status">
            <span className="login-loader-status-dot" aria-hidden="true" />
            <span>Establishing an encrypted session</span>
          </div>
        </div>
      </section>
    </main>
  );
}
