import React from "react";
import {
  ShoppingCart,
  Truck,
  PackageCheck,
  Clock3,
  MapPin,
  ShieldCheck,
  CircleCheckBig,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const ShoppingPolicy: React.FC = () => {
  return (
    <>
      <style>{`
        .shopping-page,
        .shopping-page * {
          box-sizing: border-box;
        }

        .shopping-page {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f7f2;
          color: #242815;
          font-family: "Manrope", sans-serif;
        }

        .shopping-hero {
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

        .shopping-hero::after {
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

        .shopping-container,
        .shopping-content-container {
          width: 100%;
          max-width: 1800px;

          margin: 0 auto;
        }

        .shopping-hero-content {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 900px;

          margin: 0 auto;

          text-align: center;
        }

        .shopping-badge {
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

        .shopping-badge svg {
          width: 15px;
          height: 15px;
        }

        .shopping-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(46px, 5.5vw, 72px);
          font-weight: 800;

          line-height: 0.98;
          letter-spacing: -1.5px;
        }

        .shopping-title span {
          color: #718141;
        }

        .shopping-description {
          max-width: 760px;

          margin: 24px auto 0;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .shopping-content {
          width: 100%;

          padding: 90px 0 110px;

          background: #f7f7f2;
        }

        .shopping-section-heading {
          width: 100%;
          max-width: 820px;

          margin: 0 auto 55px;

          text-align: center;
        }

        .shopping-section-heading span {
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

        .shopping-section-heading h2 {
          margin: 0 0 16px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 56px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .shopping-section-heading p {
          max-width: 650px;

          margin: 0 auto;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .shopping-grid {
          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 24px;

          margin-bottom: 100px;
        }

        .shopping-card,
        .shopping-share-card {
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

        .shopping-card:hover,
        .shopping-share-card:hover {
          transform: translateY(-6px);

          border-color: #aab89d;

          box-shadow:
            0 18px 40px rgba(38, 56, 36, 0.09);
        }

        .shopping-icon {
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

        .shopping-card h3,
        .shopping-share-card h3 {
          margin: 0 0 12px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 28px;
          font-weight: 800;

          line-height: 1.08;
        }

        .shopping-card p,
        .shopping-share-card p {
          margin: 0;

          color: #626856;

          font-size: 14px;
          line-height: 1.8;
        }

        .shopping-feature-section {
          margin-bottom: 100px;
        }

        .shopping-feature {
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

        .shopping-feature-content {
          min-width: 0;
        }

        .shopping-label {
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

        .shopping-feature h2 {
          margin: 0 0 18px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(38px, 4vw, 54px);
          font-weight: 800;

          line-height: 1.02;
          letter-spacing: -1px;
        }

        .shopping-feature-description {
          max-width: 650px;

          margin: 0 0 30px;

          color: #626856;

          font-size: 15px;
          line-height: 1.8;
        }

        .shopping-points {
          display: flex;
          flex-direction: column;

          gap: 13px;
        }

        .shopping-point {
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

        .shopping-point:hover {
          transform: translateX(5px);

          border-color: #b7c3ad;

          background: #eef2e9;
        }

        .shopping-point-icon {
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

        .shopping-point-icon svg {
          width: 19px;
          height: 19px;
        }

        .shopping-point h4 {
          margin: 0 0 5px;

          color: #242815;

          font-size: 14px;
          font-weight: 800;
        }

        .shopping-point p {
          margin: 0;

          color: #68705f;

          font-size: 13px;
          line-height: 1.65;
        }

        .shopping-feature-visual {
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

        .shopping-visual-icon {
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

        .shopping-visual-icon svg {
          width: 85px;
          height: 85px;

          stroke-width: 1.4;
        }

        .shopping-share-section {
          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 24px;
        }

        .shopping-share-card {
          padding: 34px;
        }

        .shopping-footer-note {
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

        .shopping-footer-note svg {
          width: 15px;
          height: 15px;
        }

        @media (max-width: 1100px) {
          .shopping-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .shopping-feature {
            grid-template-columns: 1fr;
          }

          .shopping-feature-visual {
            min-height: 320px;
            order: -1;
          }

          .shopping-share-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .shopping-hero {
            padding: 95px 0 65px;
          }

          .shopping-container,
          .shopping-content-container {
            padding-left: 20px;
            padding-right: 20px;
          }

          .shopping-title {
            font-size: clamp(40px, 11vw, 56px);
            letter-spacing: -1px;
          }

          .shopping-description {
            font-size: 14px;
            line-height: 1.7;
          }

          .shopping-content {
            padding: 65px 0 80px;
          }

          .shopping-section-heading {
            margin-bottom: 38px;
            text-align: left;
          }

          .shopping-section-heading h2 {
            font-size: clamp(34px, 9vw, 45px);
          }

          .shopping-section-heading p {
            margin: 0;
            font-size: 14px;
          }

          .shopping-grid {
            grid-template-columns: 1fr;

            gap: 18px;

            margin-bottom: 70px;
          }

          .shopping-card,
          .shopping-share-card {
            padding: 25px;
            border-radius: 21px;
          }

          .shopping-feature-section {
            margin-bottom: 70px;
          }

          .shopping-feature {
            padding: 24px;
            border-radius: 22px;
            gap: 28px;
          }

          .shopping-feature-visual {
            min-height: 260px;
            border-radius: 18px;
          }

          .shopping-visual-icon {
            width: 160px;
            height: 160px;
          }

          .shopping-visual-icon svg {
            width: 65px;
            height: 65px;
          }

          .shopping-feature h2 {
            font-size: clamp(35px, 9vw, 46px);
          }

          .shopping-footer-note {
            margin-top: 45px;
          }
        }

        @media (max-width: 480px) {
          .shopping-hero {
            padding: 85px 0 55px;
          }

          .shopping-badge {
            padding: 8px 13px;
            font-size: 9px;
          }

          .shopping-title {
            font-size: 39px;
          }

          .shopping-content {
            padding: 55px 0 65px;
          }

          .shopping-card,
          .shopping-share-card {
            padding: 22px;
          }

          .shopping-icon {
            width: 52px;
            height: 52px;
            margin-bottom: 18px;
            padding: 13px;
          }

          .shopping-card h3 {
            font-size: 25px;
          }

          .shopping-share-card h3 {
            font-size: 27px;
          }

          .shopping-point {
            padding: 15px;
          }

          .shopping-point-icon {
            width: 38px;
            height: 38px;
          }

          .shopping-point h4 {
            font-size: 13px;
          }

          .shopping-point p {
            font-size: 12px;
          }

          .shopping-feature-visual {
            min-height: 220px;
          }

          .shopping-visual-icon {
            width: 135px;
            height: 135px;
          }

          .shopping-visual-icon svg {
            width: 55px;
            height: 55px;
          }
        }
      `}</style>

      <div className="shopping-page">
        <section className="shopping-hero">
          <div className="shopping-container">
            <div className="shopping-hero-content">
              <div className="shopping-badge">
                <ShoppingCart />
                Shopping Policy
              </div>

              <h1 className="shopping-title">
                Shopping <span>Policy</span>
              </h1>

              <p className="shopping-description">
                At Fruveto, we are committed to providing a seamless
                shopping experience with fresh products, secure ordering,
                and reliable delivery. Please review our shopping policy
                before placing an order.
              </p>
            </div>
          </div>
        </section>

        <section className="shopping-content">
          <div className="shopping-content-container">
            <div className="shopping-section-heading">
              <span>Shop With Confidence</span>

              <h2>Everything You Need To Know</h2>

              <p>
                Our policies are designed to ensure transparency,
                freshness, and customer satisfaction with every order.
              </p>
            </div>

            <div className="shopping-grid">
              <div className="shopping-card">
                <PackageCheck className="shopping-icon" />

                <h3>Product Handling</h3>

                <p>
                  Products are processed and packed according to
                  their category, specifications and handling needs
                  before dispatch.
                </p>
              </div>

              <div className="shopping-card">
                <Truck className="shopping-icon" />

                <h3>Fast Delivery</h3>

                <p>
                  Orders are delivered within the estimated delivery
                  window depending on your location and product
                  availability.
                </p>
              </div>

              <div className="shopping-card">
                <ShieldCheck className="shopping-icon" />

                <h3>Secure Shopping</h3>

                <p>
                  Your personal information and payment details are
                  protected using secure payment gateways and encrypted
                  transactions.
                </p>
              </div>
            </div>

            <section className="shopping-feature-section">
              <div className="shopping-feature">
                <div className="shopping-feature-content">
                  <span className="shopping-label">
                    <ShoppingCart size={14} />
                    Order Guidelines
                  </span>

                  <h2>How Shopping Works</h2>

                  <p className="shopping-feature-description">
                    To ensure smooth processing and delivery, please
                    follow these simple shopping guidelines while
                    placing your order.
                  </p>

                  <div className="shopping-points">
                    <div className="shopping-point">
                      <div className="shopping-point-icon">
                        <CircleCheckBig />
                      </div>

                      <div>
                        <h4>Place Your Order</h4>

                        <p>
                          Browse our collection, add products to your
                          cart, and complete checkout with accurate
                          delivery information.
                        </p>
                      </div>
                    </div>

                    <div className="shopping-point">
                      <div className="shopping-point-icon">
                        <Clock3 />
                      </div>

                      <div>
                        <h4>Order Confirmation</h4>

                        <p>
                          Orders are confirmed after successful payment
                          and availability verification.
                        </p>
                      </div>
                    </div>

                    <div className="shopping-point">
                      <div className="shopping-point-icon">
                        <MapPin />
                      </div>

                      <div>
                        <h4>Delivery</h4>

                        <p>
                          Ensure someone is available at the delivery
                          address to receive and inspect the order upon
                          arrival.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shopping-feature-visual">
                  <div className="shopping-visual-icon">
                    <ShoppingCart />
                  </div>
                </div>
              </div>
            </section>

            <section className="shopping-share-section">
              <div className="shopping-share-card">
                <PackageCheck className="shopping-icon" />

                <h3>Order Cancellation</h3>

                <p>
                  Orders can be cancelled before they are packed or
                  dispatched. Once shipped, cancellations may no longer
                  be possible.
                </p>
              </div>

              <div className="shopping-share-card">
                <Truck className="shopping-icon" />

                <h3>Delivery Policy</h3>

                <p>
                  Delivery timings may vary due to weather, traffic,
                  holidays, or unforeseen operational conditions. We
                  strive to deliver every order as quickly as possible.
                </p>
              </div>
            </section>

            <div className="shopping-footer-note">
              <CheckCircle2 />
              Fresh products. Secure shopping. Reliable delivery.
              <ArrowRight />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ShoppingPolicy;