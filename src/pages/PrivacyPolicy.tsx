import React from "react";
import {
  UserRound,
  Zap,
  Cookie,
  ShieldCheck,
  LockKeyhole,
  CreditCard,
  Activity,
  UsersRound,
  UserCog,
  ArrowRight,
} from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <style>{`
        .privacy-page,
        .privacy-page * {
          box-sizing: border-box;
        }

        .privacy-page {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f7f2;
          color: #242815;
          font-family: "Manrope", sans-serif;
        }

        .privacy-hero {
          position: relative;
          width: 100%;
          padding: 120px 0 90px;
          overflow: hidden;

          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(113, 129, 65, 0.10),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 85%,
              rgba(113, 129, 65, 0.08),
              transparent 30%
            ),
            #f7f7f2;

          border-bottom: 1px solid #dfe5d9;
        }

      

        .privacy-hero::after {
          content: "";
          position: absolute;

          width: 240px;
          height: 240px;

          bottom: -160px;
          left: 5%;

          border-radius: 50%;

          background: rgba(238, 242, 233, 0.8);

          pointer-events: none;
        }

        .privacy-container,
        .privacy-content-container {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
        }

        .privacy-hero-content {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 900px;

          margin: 0 auto;

          text-align: center;
        }

        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          margin-bottom: 22px;
          padding: 9px 16px;

          border: 1px solid #d5dfcf;
          border-radius: 999px;

          background: #eef2e9;
          color: #596443;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .privacy-badge-icon {
          width: 15px;
          height: 15px;
        }

        .privacy-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(46px, 5.5vw, 72px);
          font-weight: 800;

          line-height: 0.98;
          letter-spacing: -1.5px;
        }

        .privacy-title span {
          color: #718141;
        }

        .privacy-hero-description {
          max-width: 760px;

          margin: 24px auto 0;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .privacy-content {
          width: 100%;
          padding: 90px 0 110px;

          background: #f7f7f2;
        }

        .privacy-section-heading {
          width: 100%;
          max-width: 820px;

          margin: 0 auto 55px;

          text-align: center;
        }

        .privacy-section-label {
          display: inline-flex;
          align-items: center;

          margin-bottom: 18px;
          padding: 8px 15px;

          border: 1px solid #d5dfcf;
          border-radius: 999px;

          background: #eef2e9;
          color: #596443;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .privacy-section-heading h2 {
          margin: 0 0 16px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 56px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .privacy-section-heading p {
          max-width: 650px;

          margin: 0 auto;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .privacy-grid {
          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 24px;

          margin-bottom: 100px;
        }

        .privacy-card {
          position: relative;

          min-width: 0;

          padding: 32px;

          background: #ffffff;

          border: 1px solid #dce4d8;
          border-radius: 24px;

          box-shadow:
            0 10px 30px rgba(38, 56, 36, 0.05);

          transition:
            transform 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease;
        }

        .privacy-card:hover {
          transform: translateY(-6px);

          border-color: #aab89d;

          box-shadow:
            0 18px 40px rgba(38, 56, 36, 0.09);
        }

        .privacy-card-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 22px;

          border: 1px solid #d5dfcf;
          border-radius: 17px;

          background: #eef2e9;
          color: #596443;
        }

        .privacy-card-icon svg {
          width: 25px;
          height: 25px;
        }

        .privacy-card h3 {
          margin: 0 0 12px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 27px;
          font-weight: 800;

          line-height: 1.1;
        }

        .privacy-card p {
          margin: 0 0 20px;

          color: #626856;

          font-size: 14px;
          line-height: 1.75;
        }

        .privacy-card ul {
          margin: 0;
          padding: 0;

          list-style: none;

          display: flex;
          flex-direction: column;

          gap: 10px;
        }

        .privacy-card li {
          position: relative;

          padding-left: 20px;

          color: #68705f;

          font-size: 13px;
          line-height: 1.5;
        }

        .privacy-card li::before {
          content: "";

          position: absolute;

          width: 6px;
          height: 6px;

          left: 0;
          top: 7px;

          border-radius: 50%;

          background: #718141;
        }

        .privacy-feature-section {
          margin-bottom: 100px;
        }

        .privacy-feature {
          display: grid;

          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);

          gap: clamp(40px, 6vw, 100px);

          align-items: center;

          padding: clamp(30px, 4vw, 60px);

          background: #ffffff;

          border: 1px solid #dce4d8;
          border-radius: 28px;

          box-shadow:
            0 12px 35px rgba(38, 56, 36, 0.05);
        }

        .privacy-feature-content {
          min-width: 0;
        }

        .privacy-label {
          display: inline-flex;
          align-items: center;

          margin-bottom: 18px;
          padding: 8px 14px;

          border: 1px solid #d5dfcf;
          border-radius: 999px;

          background: #eef2e9;
          color: #596443;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .privacy-feature-content h2 {
          margin: 0 0 18px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 54px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .privacy-feature-content > p {
          max-width: 650px;

          margin: 0 0 30px;

          color: #626856;

          font-size: 15px;
          line-height: 1.8;
        }

        .privacy-points {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .privacy-point {
          display: flex;
          align-items: flex-start;

          gap: 15px;

          padding: 18px;

          background: #f7f7f2;

          border: 1px solid #e0e6dc;
          border-radius: 17px;

          transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            background 0.3s ease;
        }

        .privacy-point:hover {
          transform: translateX(5px);

          border-color: #b7c3ad;

          background: #eef2e9;
        }

        .privacy-point-icon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background: #33371b;
          color: #ffffff;
        }

        .privacy-point-icon svg {
          width: 19px;
          height: 19px;
        }

        .privacy-point h4 {
          margin: 0 0 5px;

          color: #242815;

          font-size: 14px;
          font-weight: 800;
        }

        .privacy-point p {
          margin: 0;

          color: #68705f;

          font-size: 13px;
          line-height: 1.65;
        }

        .privacy-feature-image {
          min-height: 400px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 22px;

          background:
            radial-gradient(
              circle at center,
              #ffffff 0%,
              #eef2e9 70%
            );

          border: 1px solid #dce4d8;

          overflow: hidden;
        }

        .privacy-feature-image-inner {
          width: 210px;
          height: 210px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #33371b;
          color: #ffffff;

          box-shadow:
            0 25px 60px rgba(51, 55, 27, 0.18),
            0 0 0 18px rgba(113, 129, 65, 0.08);
        }

        .privacy-feature-image-inner svg {
          width: 85px;
          height: 85px;
          stroke-width: 1.4;
        }

        .privacy-share-section {
          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 24px;
        }

        .privacy-share-card {
          min-width: 0;

          padding: 34px;

          background: #ffffff;

          border: 1px solid #dce4d8;
          border-radius: 24px;

          box-shadow:
            0 10px 30px rgba(38, 56, 36, 0.05);

          transition:
            transform 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease;
        }

        .privacy-share-card:hover {
          transform: translateY(-6px);

          border-color: #aab89d;

          box-shadow:
            0 18px 40px rgba(38, 56, 36, 0.09);
        }

        .privacy-share-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 22px;

          border: 1px solid #d5dfcf;
          border-radius: 17px;

          background: #eef2e9;
          color: #596443;
        }

        .privacy-share-icon svg {
          width: 25px;
          height: 25px;
        }

        .privacy-share-card h3 {
          margin: 0 0 12px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 30px;
          font-weight: 800;

          line-height: 1.05;
        }

        .privacy-share-card p {
          margin: 0 0 20px;

          color: #626856;

          font-size: 14px;
          line-height: 1.75;
        }

        .privacy-share-card ul {
          margin: 0;
          padding: 0;

          list-style: none;

          display: flex;
          flex-direction: column;

          gap: 10px;
        }

        .privacy-share-card li {
          position: relative;

          padding-left: 20px;

          color: #68705f;

          font-size: 13px;
        }

        .privacy-share-card li::before {
          content: "";

          position: absolute;

          width: 6px;
          height: 6px;

          left: 0;
          top: 6px;

          border-radius: 50%;

          background: #718141;
        }

        .privacy-footer-note {
          margin-top: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          color: #87947b;

          font-size: 11px;
          font-weight: 700;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          text-align: center;
        }

        .privacy-footer-note svg {
          width: 15px;
          height: 15px;
        }

        @media (max-width: 1100px) {
          .privacy-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .privacy-feature {
            grid-template-columns: 1fr;
          }

          .privacy-feature-image {
            min-height: 320px;
            order: -1;
          }

          .privacy-share-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .privacy-hero {
            padding: 95px 0 65px;
          }

          .privacy-container,
          .privacy-content-container {
            padding-left: 20px;
            padding-right: 20px;
          }

          .privacy-title {
            font-size: clamp(40px, 11vw, 56px);
            letter-spacing: -1px;
          }

          .privacy-hero-description {
            font-size: 14px;
            line-height: 1.7;
          }

          .privacy-content {
            padding: 65px 0 80px;
          }

          .privacy-section-heading {
            margin-bottom: 38px;
            text-align: left;
          }

          .privacy-section-heading h2 {
            font-size: clamp(34px, 9vw, 45px);
          }

          .privacy-section-heading p {
            margin: 0;
            font-size: 14px;
          }

          .privacy-grid {
            grid-template-columns: 1fr;
            gap: 18px;

            margin-bottom: 70px;
          }

          .privacy-card {
            padding: 25px;
            border-radius: 21px;
          }

          .privacy-feature-section {
            margin-bottom: 70px;
          }

          .privacy-feature {
            padding: 24px;
            border-radius: 22px;
            gap: 28px;
          }

          .privacy-feature-image {
            min-height: 260px;
            border-radius: 18px;
          }

          .privacy-feature-image-inner {
            width: 160px;
            height: 160px;
          }

          .privacy-feature-image-inner svg {
            width: 65px;
            height: 65px;
          }

          .privacy-feature-content h2 {
            font-size: clamp(35px, 9vw, 46px);
          }

          .privacy-share-section {
            gap: 18px;
          }

          .privacy-share-card {
            padding: 25px;
            border-radius: 21px;
          }

          .privacy-footer-note {
            margin-top: 45px;
          }
        }

        @media (max-width: 480px) {
          .privacy-hero {
            padding: 85px 0 55px;
          }

          .privacy-badge {
            padding: 8px 13px;
            font-size: 9px;
          }

          .privacy-title {
            font-size: 39px;
          }

          .privacy-content {
            padding: 55px 0 65px;
          }

          .privacy-card,
          .privacy-share-card {
            padding: 22px;
          }

          .privacy-card-icon,
          .privacy-share-icon {
            width: 52px;
            height: 52px;

            margin-bottom: 18px;
          }

          .privacy-card h3 {
            font-size: 25px;
          }

          .privacy-share-card h3 {
            font-size: 27px;
          }

          .privacy-point {
            padding: 15px;
          }

          .privacy-point-icon {
            width: 38px;
            height: 38px;
          }

          .privacy-point h4 {
            font-size: 13px;
          }

          .privacy-point p {
            font-size: 12px;
          }

          .privacy-feature-image {
            min-height: 220px;
          }

          .privacy-feature-image-inner {
            width: 135px;
            height: 135px;
          }

          .privacy-feature-image-inner svg {
            width: 55px;
            height: 55px;
          }
        }
      `}</style>

      <div className="privacy-page">
        <section className="privacy-hero">
          <div className="privacy-container">
            <div className="privacy-hero-content">
              <div className="privacy-badge">
                <ShieldCheck className="privacy-badge-icon" />
                Your Privacy Matters
              </div>

              <h1 className="privacy-title">
                Privacy <span>Policy</span>
              </h1>

              <p className="privacy-hero-description">
                At Fruveto, we believe your privacy is just as important
                as delivering fresh and healthy products. We are committed
                to protecting your personal information and providing a
                safe, transparent and secure experience.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-content">
          <div className="privacy-content-container">
            <div className="privacy-section-heading">
              <span className="privacy-section-label">
                Information & Privacy
              </span>

              <h2>
                How We Collect & Use Your Information
              </h2>

              <p>
                We collect only the information required to provide you
                with a secure, seamless and personalized Fruveto
                experience.
              </p>
            </div>

            <div className="privacy-grid">
              <div className="privacy-card">
                <div className="privacy-card-icon">
                  <UserRound />
                </div>

                <h3>Information We Collect</h3>

                <p>
                  We collect basic information when you create an account,
                  place an order or contact our support team.
                </p>

                <ul>
                  <li>Name & Contact Details</li>
                  <li>Delivery Address</li>
                  <li>Order History</li>
                  <li>Payment Information</li>
                  <li>Account Preferences</li>
                </ul>
              </div>

              <div className="privacy-card">
                <div className="privacy-card-icon">
                  <Zap />
                </div>

                <h3>How We Use Your Information</h3>

                <p>
                  Your information helps us process orders, manage
                  deliveries, improve support and create a better
                  shopping experience.
                </p>

                <ul>
                  <li>Order Processing</li>
                  <li>Delivery Management</li>
                  <li>Customer Support</li>
                  <li>Personalized Experience</li>
                  <li>Fraud Prevention</li>
                </ul>
              </div>

              <div className="privacy-card">
                <div className="privacy-card-icon">
                  <Cookie />
                </div>

                <h3>Cookies & Analytics</h3>

                <p>
                  Cookies help improve website performance, remember
                  preferences and help us understand how customers use
                  Fruveto.
                </p>

                <ul>
                  <li>Remember Preferences</li>
                  <li>Shopping Experience</li>
                  <li>Website Analytics</li>
                  <li>Performance Monitoring</li>
                  <li>Website Improvements</li>
                </ul>
              </div>
            </div>

            <section className="privacy-feature-section">
              <div className="privacy-feature">
                <div className="privacy-feature-content">
                  <span className="privacy-label">
                    <ShieldCheck
                      size={14}
                      style={{ marginRight: 7 }}
                    />
                    Security First
                  </span>

                  <h2>
                    Keeping Your Information Safe
                  </h2>

                  <p>
                    Protecting your personal information is a priority.
                    We follow modern security practices to help keep
                    your account and information protected.
                  </p>

                  <div className="privacy-points">
                    <div className="privacy-point">
                      <div className="privacy-point-icon">
                        <LockKeyhole />
                      </div>

                      <div>
                        <h4>Secure Authentication</h4>

                        <p>
                          Protected login and secure communication
                          for your Fruveto account.
                        </p>
                      </div>
                    </div>

                    <div className="privacy-point">
                      <div className="privacy-point-icon">
                        <CreditCard />
                      </div>

                      <div>
                        <h4>Safe Payments</h4>

                        <p>
                          Payments are handled through trusted
                          and secure payment providers.
                        </p>
                      </div>
                    </div>

                    <div className="privacy-point">
                      <div className="privacy-point-icon">
                        <Activity />
                      </div>

                      <div>
                        <h4>Continuous Monitoring</h4>

                        <p>
                          We monitor our systems to identify and
                          respond to suspicious activity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="privacy-feature-image">
                  <div className="privacy-feature-image-inner">
                    <ShieldCheck />
                  </div>
                </div>
              </div>
            </section>

            <section className="privacy-share-section">
              <div className="privacy-share-card">
                <div className="privacy-share-icon">
                  <UsersRound />
                </div>

                <h3>
                  When We Share Information
                </h3>

                <p>
                  We do not sell your personal information. Information
                  is shared only when necessary to provide our services
                  or meet legal requirements.
                </p>

                <ul>
                  <li>Delivery Partners</li>
                  <li>Payment Gateway Providers</li>
                  <li>Cloud Services</li>
                  <li>Customer Support</li>
                  <li>Legal Compliance</li>
                </ul>
              </div>

              <div className="privacy-share-card">
                <div className="privacy-share-icon">
                  <UserCog />
                </div>

                <h3>
                  Your Privacy Rights
                </h3>

                <p>
                  You may request access to your information, update
                  your details or request account deletion, subject to
                  applicable requirements.
                </p>

                <ul>
                  <li>Access Your Data</li>
                  <li>Update Information</li>
                  <li>Delete Account</li>
                  <li>Withdraw Consent</li>
                  <li>Export Personal Data</li>
                </ul>
              </div>
            </section>

            <div className="privacy-footer-note">
              <ShieldCheck />
              Your information deserves to stay protected
              <ArrowRight />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default PrivacyPolicy;