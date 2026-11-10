import React from "react";
import {
  RotateCcw,
  Clock3,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  CreditCard,
  CircleCheckBig,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const RefundPolicy: React.FC = () => {
  return (
    <>
      <style>{`
        .refund-page,
        .refund-page * {
          box-sizing: border-box;
        }

        .refund-page {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f7f2;
          color: #242815;
          font-family: "Manrope", sans-serif;
        }

        .refund-hero {
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

        .refund-hero::after {
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

        .refund-container,
        .refund-content-container {
          width: 100%;
          max-width: 1800px;

          margin: 0 auto;
        }

        .refund-hero-content {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 900px;

          margin: 0 auto;

          text-align: center;
        }

        .refund-badge {
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

        .refund-badge svg {
          width: 15px;
          height: 15px;
        }

        .refund-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(46px, 5.5vw, 72px);
          font-weight: 800;

          line-height: 0.98;
          letter-spacing: -1.5px;
        }

        .refund-title span {
          color: #718141;
        }

        .refund-description {
          max-width: 760px;

          margin: 24px auto 0;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .refund-content {
          width: 100%;

          padding: 90px 0 110px;

          background: #f7f7f2;
        }

        .refund-section-heading {
          width: 100%;
          max-width: 820px;

          margin: 0 auto 55px;

          text-align: center;
        }

        .refund-section-heading span {
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

        .refund-section-heading h2 {
          margin: 0 0 16px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 56px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .refund-section-heading p {
          max-width: 650px;

          margin: 0 auto;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .refund-grid {
          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 24px;

          margin-bottom: 100px;
        }

        .refund-card,
        .refund-share-card {
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

        .refund-card:hover,
        .refund-share-card:hover {
          transform: translateY(-6px);

          border-color: #aab89d;

          box-shadow:
            0 18px 40px rgba(38, 56, 36, 0.09);
        }

        .refund-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 22px;

          padding: 15px;

          border: 1px solid #d5dfcf;
          border-radius: 17px;

          background: #eef2e9;
          color: #596443;
        }

        .refund-card h3,
        .refund-share-card h3 {
          margin: 0 0 12px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 28px;
          font-weight: 800;

          line-height: 1.08;
        }

        .refund-card p,
        .refund-share-card p {
          margin: 0;

          color: #626856;

          font-size: 14px;
          line-height: 1.8;
        }

        .refund-feature-section {
          margin-bottom: 100px;
        }

        .refund-feature {
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

        .refund-feature-content {
          min-width: 0;
        }

        .refund-label {
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

        .refund-feature h2 {
          margin: 0 0 18px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 54px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .refund-feature-description {
          max-width: 650px;

          margin: 0 0 30px;

          color: #626856;

          font-size: 15px;
          line-height: 1.8;
        }

        .refund-points {
          display: flex;
          flex-direction: column;

          gap: 13px;
        }

        .refund-point {
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

        .refund-point:hover {
          transform: translateX(5px);

          border-color: #b7c3ad;

          background: #eef2e9;
        }

        .refund-point-icon {
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

        .refund-point-icon svg {
          width: 19px;
          height: 19px;
        }

        .refund-point h4 {
          margin: 0 0 5px;

          color: #242815;

          font-size: 14px;
          font-weight: 800;
        }

        .refund-point p {
          margin: 0;

          color: #68705f;

          font-size: 13px;
          line-height: 1.65;
        }

        .refund-feature-visual {
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

        .refund-visual-icon {
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

        .refund-visual-icon svg {
          width: 85px;
          height: 85px;

          stroke-width: 1.4;
        }

        .refund-share-section {
          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 24px;
        }

        .refund-share-card {
          padding: 34px;
        }

        .refund-footer-note {
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

        .refund-footer-note svg {
          width: 15px;
          height: 15px;
        }

        @media (max-width: 1100px) {
          .refund-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .refund-feature {
            grid-template-columns: 1fr;
          }

          .refund-feature-visual {
            min-height: 320px;

            order: -1;
          }

          .refund-share-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .refund-hero {
            padding: 95px 0 65px;
          }

          .refund-container,
          .refund-content-container {
            padding-left: 20px;
            padding-right: 20px;
          }

          .refund-title {
            font-size: clamp(40px, 11vw, 56px);

            letter-spacing: -1px;
          }

          .refund-description {
            font-size: 14px;
            line-height: 1.7;
          }

          .refund-content {
            padding: 65px 0 80px;
          }

          .refund-section-heading {
            margin-bottom: 38px;

            text-align: left;
          }

          .refund-section-heading h2 {
            font-size: clamp(34px, 9vw, 45px);
          }

          .refund-section-heading p {
            margin: 0;

            font-size: 14px;
          }

          .refund-grid {
            grid-template-columns: 1fr;

            gap: 18px;

            margin-bottom: 70px;
          }

          .refund-card,
          .refund-share-card {
            padding: 25px;

            border-radius: 21px;
          }

          .refund-feature-section {
            margin-bottom: 70px;
          }

          .refund-feature {
            padding: 24px;

            border-radius: 22px;

            gap: 28px;
          }

          .refund-feature-visual {
            min-height: 260px;

            border-radius: 18px;
          }

          .refund-visual-icon {
            width: 160px;
            height: 160px;
          }

          .refund-visual-icon svg {
            width: 65px;
            height: 65px;
          }

          .refund-feature h2 {
            font-size: clamp(35px, 9vw, 46px);
          }

          .refund-footer-note {
            margin-top: 45px;
          }
        }

        @media (max-width: 480px) {
          .refund-hero {
            padding: 85px 0 55px;
          }

          .refund-badge {
            padding: 8px 13px;

            font-size: 9px;
          }

          .refund-title {
            font-size: 39px;
          }

          .refund-content {
            padding: 55px 0 65px;
          }

          .refund-card,
          .refund-share-card {
            padding: 22px;
          }

          .refund-icon {
            width: 52px;
            height: 52px;

            margin-bottom: 18px;

            padding: 13px;
          }

          .refund-card h3 {
            font-size: 25px;
          }

          .refund-share-card h3 {
            font-size: 27px;
          }

          .refund-point {
            padding: 15px;
          }

          .refund-point-icon {
            width: 38px;
            height: 38px;
          }

          .refund-point h4 {
            font-size: 13px;
          }

          .refund-point p {
            font-size: 12px;
          }

          .refund-feature-visual {
            min-height: 220px;
          }

          .refund-visual-icon {
            width: 135px;
            height: 135px;
          }

          .refund-visual-icon svg {
            width: 55px;
            height: 55px;
          }
        }
      `}</style>

      <div className="refund-page">
        <section className="refund-hero">
          <div className="refund-container">
            <div className="refund-hero-content">
              <div className="refund-badge">
                <RotateCcw />
                Refund & Returns
              </div>

              <h1 className="refund-title">
                Refund <span>& Returns</span>
              </h1>

              <p className="refund-description">
                We want every Fruveto order to arrive fresh and in perfect
                condition. If something isn't right, we're here to help
                with a simple and transparent refund process.
              </p>
            </div>
          </div>
        </section>

        <section className="refund-content">
          <div className="refund-content-container">
            <div className="refund-section-heading">
              <span>Our Promise</span>

              <h2>When Refunds Apply</h2>

              <p>
                We carefully inspect every order before delivery.
                Refunds or replacements are available for eligible
                issues reported within the required timeframe.
              </p>
            </div>

            <div className="refund-grid">
              <div className="refund-card">
                <PackageCheck className="refund-icon" />

                <h3>Damaged Products</h3>

                <p>
                  If your order arrives damaged or defective, contact us
                  with photos within 24 hours of delivery.
                </p>
              </div>

              <div className="refund-card">
                <AlertTriangle className="refund-icon" />

                <h3>Incorrect Items</h3>

                <p>
                  If you receive the wrong products, we'll replace them
                  or issue a refund where applicable.
                </p>
              </div>

              <div className="refund-card">
                <Clock3 className="refund-icon" />

                <h3>Late Delivery</h3>

                <p>
                  Refund eligibility for delayed deliveries depends on
                  the cause and delivery conditions.
                </p>
              </div>
            </div>

            <section className="refund-feature-section">
              <div className="refund-feature">
                <div className="refund-feature-content">
                  <span className="refund-label">
                    <RotateCcw size={14} />
                    Refund Process
                  </span>

                  <h2>How It Works</h2>

                  <p className="refund-feature-description">
                    Our support team reviews every request carefully
                    to ensure a fair and transparent resolution.
                  </p>

                  <div className="refund-points">
                    <div className="refund-point">
                      <div className="refund-point-icon">
                        <CircleCheckBig />
                      </div>

                      <div>
                        <h4>Submit Your Request</h4>

                        <p>
                          Contact our customer support with your order
                          number and photographs if required.
                        </p>
                      </div>
                    </div>

                    <div className="refund-point">
                      <div className="refund-point-icon">
                        <ShieldCheck />
                      </div>

                      <div>
                        <h4>Verification</h4>

                        <p>
                          Our team verifies the issue and determines
                          eligibility based on our refund policy.
                        </p>
                      </div>
                    </div>

                    <div className="refund-point">
                      <div className="refund-point-icon">
                        <CreditCard />
                      </div>

                      <div>
                        <h4>Refund Processing</h4>

                        <p>
                          Approved refunds are processed back to the
                          original payment method within 5–7 business
                          days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="refund-feature-visual">
                  <div className="refund-visual-icon">
                    <RotateCcw />
                  </div>
                </div>
              </div>
            </section>

            <section className="refund-share-section">
              <div className="refund-share-card">
                <ShieldCheck className="refund-icon" />

                <h3>Non-Refundable Items</h3>

                <p>
                  Products that have been consumed, stored improperly
                  after delivery, or reported beyond the eligible period
                  may not qualify for refunds.
                </p>
              </div>

              <div className="refund-share-card">
                <MessageCircle className="refund-icon" />

                <h3>Need Help?</h3>

                <p>
                  Our customer support team is always available to
                  resolve your concerns quickly and ensure a smooth
                  shopping experience.
                </p>
              </div>
            </section>

            <div className="refund-footer-note">
              <ShieldCheck />
              Fresh products. Fair resolutions. Better experiences.
              <ArrowRight />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default RefundPolicy;