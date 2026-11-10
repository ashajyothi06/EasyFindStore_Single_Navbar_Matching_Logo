import { Link } from "react-router-dom";
import "../styles/site-header-ecommerce.css";
import "../styles/easyfindstore-footer-theme.css";
import { StoreBrand } from "./StoreBrand";

/**
 * Responsive EasyFindStore footer.
 * Desktop keeps the existing footer design; mobile gets a clean, readable
 * two-column link layout with the brand and copyright spanning the width.
 * All responsive overrides stay in this component.
 */
export default function Footer() {
  return (
    <footer className="ec-store-footer">
      <style>{`
        /* Match the header/homepage gutters without constraining the footer. */
        .ec-store-footer {
          width: 100% !important;
          max-width: none !important;
          min-width: 0;
          box-sizing: border-box;
          padding-left: 0 !important;
          padding-right: 0 !important;
          overflow-x: clip;
        }

        .ec-store-footer > .ec-store-footer-inner,
        .ec-store-footer > .ec-store-footer-copy {
          width: 100% !important;
          max-width: none !important;
          min-width: 0;
          box-sizing: border-box;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-left: clamp(16px, 2.4vw, 46px) !important;
          padding-right: clamp(16px, 2.4vw, 46px) !important;
        }

        .ec-store-footer .ec-store-footer-inner > *,
        .ec-store-footer .ec-store-footer-inner nav,
        .ec-store-footer .ec-store-footer-inner a {
          min-width: 0;
          box-sizing: border-box;
        }

        /* On phones, show the brand first and both link groups below it. */
        @media (max-width: 767px) {
          .ec-store-footer {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          .ec-store-footer > .ec-store-footer-inner {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            align-items: start !important;
            justify-content: stretch !important;
            column-gap: 18px !important;
            row-gap: 24px !important;
            padding: 30px 16px 24px !important;
          }

          .ec-store-footer > .ec-store-footer-inner > div:first-child {
            grid-column: 1 / -1 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ec-store-footer > .ec-store-footer-inner > div:first-child strong {
            display: block;
            margin-bottom: 7px;
            font-size: 20px;
            line-height: 1.25;
          }

          .ec-store-footer > .ec-store-footer-inner > div:first-child p {
            margin: 0 !important;
            line-height: 1.55;
            overflow-wrap: anywhere;
          }

          .ec-store-footer > .ec-store-footer-inner > nav {
            display: flex !important;
            flex-direction: column !important;
            flex-wrap: nowrap !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 13px !important;
          }

          .ec-store-footer > .ec-store-footer-inner > nav a {
            display: block !important;
            width: fit-content !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 13px;
            line-height: 1.45;
            text-decoration: none;
            overflow-wrap: anywhere;
            white-space: normal !important;
          }

          .ec-store-footer > .ec-store-footer-copy {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px 16px 22px !important;
            font-size: 12px;
            line-height: 1.6;
            text-align: center !important;
            overflow-wrap: anywhere;
          }
        }

        /* Extra-narrow phones: maintain safe gutters and readable links. */
        @media (max-width: 359px) {
          .ec-store-footer > .ec-store-footer-inner {
            column-gap: 12px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .ec-store-footer > .ec-store-footer-copy {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }
      `}</style>

      <div className="ec-store-footer-inner">
        <div>
          <StoreBrand className="efs-footer-logo" />
          <p>Fashion, lifestyle and everyday finds.</p>
        </div>
        <nav aria-label="Shop links">
          <Link to="/">Home</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders">My Orders</Link>
          <Link to="/contact-us">Contact</Link>
        </nav>
        <nav aria-label="Customer policy links">
          <Link to="/about-us">About</Link>
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-conditions">Terms</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </nav>
      </div>
      <p className="ec-store-footer-copy">
        © {new Date().getFullYear()} EasyFindStore. All rights reserved.
      </p>
    </footer>
  );
}
