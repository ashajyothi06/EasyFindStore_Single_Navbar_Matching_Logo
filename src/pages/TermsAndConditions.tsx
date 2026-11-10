import React from "react";
import {
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle2,
  LockKeyhole,
  ShieldAlert,
  PackageCheck,
  Scale,
  FileText,
  ArrowRight,
} from "lucide-react";

const TermsAndConditions: React.FC = () => {
  return (
    <>
      <style>{`
        .terms-page,
        .terms-page * {
          box-sizing: border-box;
        }

        .terms-page {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f7f2;
          color: #242815;
          font-family: "Manrope", sans-serif;
        }

        .terms-hero {
          position: relative;
          width: 100%;
          padding: 120px 0 90px;
          overflow: hidden;

          background:
            radial-gradient(
              circle at 10% 15%,
              rgba(113, 129, 65, 0.11),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 80%,
              rgba(113, 129, 65, 0.08),
              transparent 30%
            ),
            #f7f7f2;

          border-bottom: 1px solid #dfe5d9;
        }

        .terms-hero::after {
          content: "";

          position: absolute;

          width: 250px;
          height: 250px;

          left: 4%;
          bottom: -170px;

          border-radius: 50%;

          background: rgba(238, 242, 233, 0.8);

          pointer-events: none;
        }

        .terms-container,
        .terms-content-container {
          width: 100%;
          max-width: 1800px;

          margin: 0 auto;
        }

        .terms-hero-content {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 900px;

          margin: 0 auto;

          text-align: center;
        }

        .terms-badge {
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

        .terms-badge-icon {
          width: 15px;
          height: 15px;
        }

        .terms-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(46px, 5.5vw, 72px);
          font-weight: 800;

          line-height: 0.98;
          letter-spacing: -1.5px;
        }

        .terms-title span {
          color: #718141;
        }

        .terms-description {
          max-width: 760px;

          margin: 24px auto 0;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .terms-content {
          width: 100%;
          padding: 90px 0 110px;

          background: #f7f7f2;
        }

        .terms-section-heading {
          width: 100%;
          max-width: 820px;

          margin: 0 auto 55px;

          text-align: center;
        }

        .terms-section-heading span {
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

        .terms-section-heading h2 {
          margin: 0 0 16px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 56px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .terms-section-heading p {
          max-width: 650px;

          margin: 0 auto;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .terms-grid {
          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 24px;

          margin-bottom: 100px;
        }

        .terms-card,
        .terms-share-card {
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

        .terms-card:hover,
        .terms-share-card:hover {
          transform: translateY(-6px);

          border-color: #aab89d;

          box-shadow:
            0 18px 40px rgba(38, 56, 36, 0.09);
        }

        .terms-card-icon,
        .terms-share-icon {
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

        .terms-card-icon svg,
        .terms-share-icon svg {
          width: 25px;
          height: 25px;
        }

        .terms-card h3,
        .terms-share-card h3 {
          margin: 0 0 12px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 28px;
          font-weight: 800;

          line-height: 1.08;
        }

        .terms-card p,
        .terms-share-card p {
          margin: 0;

          color: #626856;

          font-size: 14px;
          line-height: 1.8;
        }

        .terms-feature-section {
          margin-bottom: 100px;
        }

        .terms-feature {
          display: grid;

          grid-template-columns:
            minmax(0, 1.15fr)
            minmax(320px, 0.85fr);

          gap: clamp(40px, 6vw, 100px);

          align-items: center;

          padding: clamp(30px, 4vw, 60px);

          background: #ffffff;

          border: 1px solid #dce4d8;
          border-radius: 28px;

          box-shadow:
            0 12px 35px rgba(38, 56, 36, 0.05);
        }

        .terms-feature-content {
          min-width: 0;
        }

        .terms-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;

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

        .terms-feature h2 {
          margin: 0 0 18px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 54px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .terms-feature > .terms-feature-content > p {
          max-width: 650px;

          margin: 0 0 30px;

          color: #626856;

          font-size: 15px;
          line-height: 1.8;
        }

        .terms-points {
          display: flex;
          flex-direction: column;

          gap: 13px;
        }

        .terms-point {
          display: flex;
          align-items: flex-start;

          gap: 15px;

          padding: 17px;

          background: #f7f7f2;

          border: 1px solid #e0e6dc;
          border-radius: 17px;

          transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            background 0.3s ease;
        }

        .terms-point:hover {
          transform: translateX(5px);

          border-color: #b7c3ad;

          background: #eef2e9;
        }

        .terms-point-icon {
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

        .terms-point-icon svg {
          width: 19px;
          height: 19px;
        }

        .terms-point h4 {
          margin: 0 0 5px;

          color: #242815;

          font-size: 14px;
          font-weight: 800;
        }

        .terms-point p {
          margin: 0;

          color: #68705f;

          font-size: 13px;
          line-height: 1.65;
        }

        .terms-feature-visual {
          min-height: 400px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #dce4d8;
          border-radius: 22px;

          background:
            radial-gradient(
              circle at center,
              #ffffff 0%,
              #eef2e9 70%
            );

          overflow: hidden;
        }

        .terms-feature-icon {
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

        .terms-feature-icon svg {
          width: 85px;
          height: 85px;

          stroke-width: 1.4;
        }

        .terms-share-section {
          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 24px;
        }

        .terms-share-card {
          padding: 34px;
        }

        .terms-footer-note {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          margin-top: 60px;

          color: #87947b;

          font-size: 11px;
          font-weight: 700;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          text-align: center;
        }

        .terms-footer-note svg {
          width: 15px;
          height: 15px;
        }

        @media (max-width: 1100px) {
          .terms-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .terms-feature {
            grid-template-columns: 1fr;
          }

          .terms-feature-visual {
            min-height: 320px;
            order: -1;
          }

          .terms-share-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .terms-hero {
            padding: 95px 0 65px;
          }

          .terms-container,
          .terms-content-container {
            padding-left: 20px;
            padding-right: 20px;
          }

          .terms-title {
            font-size: clamp(40px, 11vw, 56px);
            letter-spacing: -1px;
          }

          .terms-description {
            font-size: 14px;
            line-height: 1.7;
          }

          .terms-content {
            padding: 65px 0 80px;
          }

          .terms-section-heading {
            margin-bottom: 38px;
            text-align: left;
          }

          .terms-section-heading h2 {
            font-size: clamp(34px, 9vw, 45px);
          }

          .terms-section-heading p {
            margin: 0;
            font-size: 14px;
          }

          .terms-grid {
            grid-template-columns: 1fr;

            gap: 18px;

            margin-bottom: 70px;
          }

          .terms-card,
          .terms-share-card {
            padding: 25px;
            border-radius: 21px;
          }

          .terms-feature-section {
            margin-bottom: 70px;
          }

          .terms-feature {
            padding: 24px;
            border-radius: 22px;
            gap: 28px;
          }

          .terms-feature-visual {
            min-height: 260px;
            border-radius: 18px;
          }

          .terms-feature-icon {
            width: 160px;
            height: 160px;
          }

          .terms-feature-icon svg {
            width: 65px;
            height: 65px;
          }

          .terms-feature h2 {
            font-size: clamp(35px, 9vw, 46px);
          }

          .terms-share-section {
            gap: 18px;
          }

          .terms-footer-note {
            margin-top: 45px;
          }
        }

        @media (max-width: 480px) {
          .terms-hero {
            padding: 85px 0 55px;
          }

          .terms-badge {
            padding: 8px 13px;
            font-size: 9px;
          }

          .terms-title {
            font-size: 39px;
          }

          .terms-content {
            padding: 55px 0 65px;
          }

          .terms-card,
          .terms-share-card {
            padding: 22px;
          }

          .terms-card-icon,
          .terms-share-icon {
            width: 52px;
            height: 52px;

            margin-bottom: 18px;
          }

          .terms-card h3 {
            font-size: 25px;
          }

          .terms-share-card h3 {
            font-size: 27px;
          }

          .terms-point {
            padding: 15px;
          }

          .terms-point-icon {
            width: 38px;
            height: 38px;
          }

          .terms-point h4 {
            font-size: 13px;
          }

          .terms-point p {
            font-size: 12px;
          }

          .terms-feature-visual {
            min-height: 220px;
          }

          .terms-feature-icon {
            width: 135px;
            height: 135px;
          }

          .terms-feature-icon svg {
            width: 55px;
            height: 55px;
          }
        }
      `}</style>

      <div className="terms-page">
        <section className="terms-hero">
          <div className="terms-container">
            <div className="terms-hero-content">
              <div className="terms-badge">
                <FileText className="terms-badge-icon" />
                User Agreement
              </div>

              <h1 className="terms-title">
                Terms & <span>Conditions</span>
              </h1>

              <p className="terms-description">
                Welcome to Fruveto. By accessing our website, creating
                an account or placing an order, you agree to follow these
                Terms & Conditions. Please read them carefully before
                using our services.
              </p>
            </div>
          </div>
        </section>

        <section className="terms-content">
          <div className="terms-content-container">
            <div className="terms-section-heading">
              <span>Understanding Our Terms</span>

              <h2>
                Simple, Clear & Transparent
              </h2>

              <p>
                These terms help keep the Fruveto experience fair,
                reliable and enjoyable for everyone.
              </p>
            </div>

            <div className="terms-grid">
              <div className="terms-card">
                <div className="terms-card-icon">
                  <ShoppingBag />
                </div>

                <h3>Orders</h3>

                <p>
                  Orders are confirmed after successful payment and
                  product availability. Fruveto may modify or cancel
                  orders when products are unavailable or unexpected
                  circumstances arise.
                </p>
              </div>

              <div className="terms-card">
                <div className="terms-card-icon">
                  <CreditCard />
                </div>

                <h3>Payments</h3>

                <p>
                  Payments must be completed through approved payment
                  methods. Prices shown on the website include applicable
                  taxes unless otherwise mentioned.
                </p>
              </div>

              <div className="terms-card">
                <div className="terms-card-icon">
                  <Truck />
                </div>

                <h3>Delivery</h3>

                <p>
                  Delivery times are estimates and may vary depending
                  on location, traffic, weather and operational
                  conditions.
                </p>
              </div>
            </div>

            <section className="terms-feature-section">
              <div className="terms-feature">
                <div className="terms-feature-content">
                  <span className="terms-label">
                    <ShieldAlert size={14} />
                    Customer Responsibilities
                  </span>

                  <h2>
                    Using Fruveto Responsibly
                  </h2>

                  <p>
                    Customers are expected to use the Fruveto platform
                    fairly and lawfully while keeping their account
                    information secure and accurate.
                  </p>

                  <div className="terms-points">
                    <div className="terms-point">
                      <div className="terms-point-icon">
                        <CheckCircle2 />
                      </div>

                      <div>
                        <h4>
                          Provide Accurate Information
                        </h4>

                        <p>
                          Keep your account details, delivery address
                          and contact information up to date.
                        </p>
                      </div>
                    </div>

                    <div className="terms-point">
                      <div className="terms-point-icon">
                        <LockKeyhole />
                      </div>

                      <div>
                        <h4>Account Security</h4>

                        <p>
                          You are responsible for maintaining the
                          confidentiality of your account credentials.
                        </p>
                      </div>
                    </div>

                    <div className="terms-point">
                      <div className="terms-point-icon">
                        <ShieldAlert />
                      </div>

                      <div>
                        <h4>Prohibited Activities</h4>

                        <p>
                          Do not misuse the website, attempt unauthorized
                          access or engage in fraudulent transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="terms-feature-visual">
                  <div className="terms-feature-icon">
                    <Scale />
                  </div>
                </div>
              </div>
            </section>

            <section className="terms-share-section">
              <div className="terms-share-card">
                <div className="terms-share-icon">
                  <PackageCheck />
                </div>

                <h3>Returns & Refunds</h3>

                <p>
                  Refunds and replacements are subject to our applicable
                  refund policy. Customers should report product issues
                  as soon as possible after delivery.
                </p>
              </div>

              <div className="terms-share-card">
                <div className="terms-share-icon">
                  <Scale />
                </div>

                <h3>Policy Updates</h3>

                <p>
                  Fruveto may update these Terms & Conditions from time
                  to time. Continued use of our services after an update
                  indicates acceptance of the revised terms.
                </p>
              </div>
            </section>

            <div className="terms-footer-note">
              <FileText />
              Please review these terms before placing your order
              <ArrowRight />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default TermsAndConditions;