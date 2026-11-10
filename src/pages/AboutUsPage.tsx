import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import aboutUsImage from "../assets/easyfind/about-retail.jpg";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCheckCircle,
  FiChevronRight,
  FiHeart,
  FiLayers,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiTag,
  FiTruck,
} from "react-icons/fi";
import { fetchCatalog } from "../lib/guestCart";
import type { CatalogCategory } from "../services/coreCommerceApi";

/**
 * EasyFindStore About page.
 * The styling is scoped to this component and does not need about-us-royal.css.
 * Catalogue counts are fetched from the store API (not hard-coded claims).
 */
const PILLARS = [
  {
    Icon: FiLayers,
    title: "Thoughtful Selection",
    text: "Explore products arranged into clear categories, with item details, images and specifications where available.",
  },
  {
    Icon: FiTag,
    title: "Clear Pricing",
    text: "Review product prices and applicable offers, with delivery charges calculated according to the store's current settings.",
  },
  {
    Icon: FiHeart,
    title: "Customer-First Orders",
    text: "Shop before signing in, follow order updates and contact the store's support team whenever you need assistance.",
  },
];

const ABOUT_PAGE_STYLES = `
  .rudra-about-page {
    --rudra-maroon: #0a2038;
    --rudra-maroon-deep: #061627;
    --rudra-maroon-soft: #163e5b;
    --rudra-gold: #efbf60;
    --rudra-cream: #f6f8fb;
    --rudra-paper: #ffffff;
    --rudra-ink: #112b42;
    --rudra-muted: #65788c;
    --rudra-gutter: clamp(16px, 2.4vw, 48px);
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow-x: clip;
    background: var(--rudra-cream);
    color: var(--rudra-ink);
    font-family: Inter, "Segoe UI", Arial, sans-serif;
  }
  .rudra-about-page,
  .rudra-about-page *,
  .rudra-about-page *::before,
  .rudra-about-page *::after { box-sizing: border-box; }
  .rudra-about-page .rudra-about-container {
    width: 100%;
    max-width: none;
    margin: 0 auto;
    padding-inline: var(--rudra-gutter);
  }
  .rudra-about-page a { text-decoration: none; }
  .rudra-about-page a:focus-visible {
    outline: 3px solid var(--rudra-gold);
    outline-offset: 4px;
  }

  /* Banner spans the screen; copy lines up with the site's header. */
  .rudra-about-page .rudra-about-banner {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    padding-block: clamp(58px, 6.5vw, 116px);
    background: var(--rudra-maroon-deep);
    color: #f6f8fb;
    border-bottom: 2px solid var(--rudra-gold);
  }
  .rudra-about-page .rudra-about-banner::after {
    content: "";
    position: absolute;
    z-index: -1;
    right: -9rem;
    top: -16rem;
    width: min(48vw, 720px);
    aspect-ratio: 1;
    border: 1px solid rgba(216, 170, 81, 0.2);
    border-radius: 50%;
    box-shadow: 0 0 0 54px rgba(216, 170, 81, 0.035),
                0 0 0 108px rgba(216, 170, 81, 0.025);
    pointer-events: none;
  }
  .rudra-about-page .rudra-about-banner-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 30px;
  }
  .rudra-about-page .rudra-about-banner-copy { max-width: 870px; }
  .rudra-about-page .rudra-about-kicker,
  .rudra-about-page .rudra-about-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 18px;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.5;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .rudra-about-page .rudra-about-kicker { color: #edcb85; }
  .rudra-about-page .rudra-about-kicker svg { font-size: 16px; }
  .rudra-about-page .rudra-about-banner h1,
  .rudra-about-page .rudra-about-copy h2,
  .rudra-about-page .rudra-about-values h2,
  .rudra-about-page .rudra-about-bottom h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    letter-spacing: -0.035em;
  }
  .rudra-about-page .rudra-about-banner h1 {
    margin: 0 0 17px;
    font-size: clamp(40px, 5.2vw, 78px);
    line-height: 1.06;
    color: #f6f8fb;
  }
  .rudra-about-page .rudra-about-banner-lede {
    max-width: 720px;
    margin: 0;
    color: #f1dcd6;
    font-size: clamp(15px, 1.2vw, 19px);
    line-height: 1.7;
  }
  .rudra-about-page .rudra-about-breadcrumb {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 29px;
    color: #e9c77e;
    font-size: 13px;
    font-weight: 650;
  }
  .rudra-about-page .rudra-about-breadcrumb a { color: #f6f8fb; }
  .rudra-about-page .rudra-about-breadcrumb a:hover { color: #f1cf87; }
  .rudra-about-page .rudra-about-hero-emblem {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: clamp(122px, 14vw, 220px);
    aspect-ratio: 1;
    margin-right: clamp(6px, 4vw, 72px);
    border: 1px solid rgba(216, 170, 81, 0.68);
    border-radius: 50%;
    box-shadow: inset 0 0 0 12px rgba(216, 170, 81, 0.075), 0 20px 60px rgba(0, 0, 0, 0.12);
    color: #eac477;
  }
  .rudra-about-page .rudra-about-hero-emblem svg { width: 38%; height: 38%; stroke-width: 1.35; }

  /* Story + visual section */
  .rudra-about-page .rudra-about-story {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.9fr);
    align-items: center;
    gap: clamp(32px, 5vw, 90px);
    padding-block: clamp(58px, 5.5vw, 100px);
  }
  .rudra-about-page .rudra-about-copy,
  .rudra-about-page .rudra-about-showcase { min-width: 0; }
  .rudra-about-page .rudra-about-eyebrow { color: #98263c; }
  .rudra-about-page .rudra-about-eyebrow svg { color: #bd8d39; font-size: 17px; }
  .rudra-about-page .rudra-about-copy h2 {
    max-width: 760px;
    margin: 0 0 24px;
    color: var(--rudra-maroon);
    font-size: clamp(34px, 3.2vw, 57px);
    line-height: 1.14;
  }
  .rudra-about-page .rudra-about-copy h2 em { color: #ae3448; font-style: normal; }
  .rudra-about-page .rudra-about-copy > p:not(.rudra-about-eyebrow) {
    max-width: 850px;
    margin: 0 0 18px;
    color: #66545b;
    font-size: clamp(14px, 1vw, 16px);
    line-height: 1.86;
  }
  .rudra-about-page .rudra-about-benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 22px;
    margin: 24px 0 30px;
  }
  .rudra-about-page .rudra-about-benefit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #5e2633;
    font-size: 13px;
    font-weight: 700;
  }
  .rudra-about-page .rudra-about-benefit svg { color: #ab7b29; font-size: 17px; }
  .rudra-about-page .rudra-about-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: fit-content;
    min-height: 50px;
    padding: 13px 21px;
    border: 1px solid var(--rudra-maroon);
    border-radius: 10px;
    background: var(--rudra-maroon);
    color: #f6f8fb !important;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 8px 22px rgba(85, 17, 31, 0.13);
    transition: transform 0.2s ease, background-color 0.2s ease;
  }
  .rudra-about-page .rudra-about-cta:hover {
    transform: translateY(-2px);
    background: #762035;
  }
  .rudra-about-page .rudra-about-cta svg { font-size: 17px; }
  /* Let aboutus.png determine the frame height automatically.
     No fixed 16:9 frame, no bars, no image cropping or stretching. */
  .rudra-about-page .rudra-about-art {
    display: block;
    position: relative;
    width: 100%;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: auto !important;
    padding: 0 !important;
    margin: 0;
    line-height: 0;
    overflow: hidden;
    border: 1px solid #d2a052;
    border-radius: 20px;
    background: transparent;
  }
  .rudra-about-page .rudra-about-art-image {
    position: static !important;
    inset: auto !important;
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: auto !important;
    object-fit: contain;
    object-position: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    filter: none;
  }
  .rudra-about-page .rudra-about-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 14px;
  }
  .rudra-about-page .rudra-about-stat {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    padding: clamp(15px, 1.5vw, 24px);
    border: 1px solid #ecd6bd;
    border-radius: 13px;
    background: #ffffff;
  }
  .rudra-about-page .rudra-about-stat-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 38px;
    height: 38px;
    color: #8c2539;
    background: #f7eae3;
    border-radius: 10px;
  }
  .rudra-about-page .rudra-about-stat-icon svg { width: 18px; height: 18px; }
  .rudra-about-page .rudra-about-stat-text { min-width: 0; }
  .rudra-about-page .rudra-about-stat strong {
    display: block;
    color: var(--rudra-maroon);
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(24px, 2.2vw, 35px);
    line-height: 1.06;
  }
  .rudra-about-page .rudra-about-stat span:not(.rudra-about-stat-icon) {
    display: block;
    margin-top: 5px;
    color: #79646a;
    font-size: 12px;
    line-height: 1.45;
  }
  .rudra-about-page .rudra-about-stat-note {
    margin: 12px 1px 0;
    color: #87767a;
    font-size: 11px;
    line-height: 1.5;
  }

  /* Values cards */
  .rudra-about-page .rudra-about-values {
    padding-block: clamp(55px, 5vw, 92px);
    border-block: 1px solid #eddecf;
    background: #fbf3e9;
  }
  .rudra-about-page .rudra-about-values-head { text-align: center; }
  .rudra-about-page .rudra-about-values-head .rudra-about-eyebrow { justify-content: center; }
  .rudra-about-page .rudra-about-values h2 {
    margin: 0;
    color: var(--rudra-maroon);
    font-size: clamp(33px, 3.5vw, 54px);
  }
  .rudra-about-page .rudra-about-values-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    margin-top: 37px;
  }
  .rudra-about-page .rudra-about-value-card {
    min-width: 0;
    padding: clamp(24px, 2.4vw, 38px);
    border: 1px solid #ecd8c5;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 8px 25px rgba(73, 20, 32, 0.035);
  }
  .rudra-about-page .rudra-about-value-icon {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    margin-bottom: 22px;
    border: 1px solid #e6c58c;
    border-radius: 14px;
    background: #f7e9df;
    color: #832238;
  }
  .rudra-about-page .rudra-about-value-icon svg { width: 27px; height: 27px; stroke-width: 1.65; }
  .rudra-about-page .rudra-about-value-card h3 {
    margin: 0 0 13px;
    color: var(--rudra-maroon);
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(21px, 1.8vw, 27px);
  }
  .rudra-about-page .rudra-about-value-card p {
    margin: 0;
    color: #736369;
    font-size: 14px;
    line-height: 1.8;
  }

  /* Closing CTA */
  .rudra-about-page .rudra-about-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 26px;
    padding-block: clamp(55px, 5vw, 90px);
  }
  .rudra-about-page .rudra-about-bottom .rudra-about-eyebrow { margin-bottom: 12px; }
  .rudra-about-page .rudra-about-bottom h2 {
    margin: 0 0 9px;
    color: var(--rudra-maroon);
    font-size: clamp(30px, 3vw, 47px);
  }
  .rudra-about-page .rudra-about-bottom p:last-child {
    margin: 0;
    color: #77656b;
    font-size: 15px;
    line-height: 1.7;
  }

  @media (max-width: 1050px) {
    .rudra-about-page .rudra-about-story { grid-template-columns: 1fr; }
    .rudra-about-page .rudra-about-showcase { max-width: none; }
    .rudra-about-page .rudra-about-art { min-height: 0; }
  }
  @media (max-width: 760px) {
    .rudra-about-page { --rudra-gutter: 20px; }
    .rudra-about-page .rudra-about-hero-emblem { display: none; }
    .rudra-about-page .rudra-about-banner { padding-block: 58px; }
    .rudra-about-page .rudra-about-values-grid { grid-template-columns: 1fr; gap: 15px; }
    .rudra-about-page .rudra-about-value-card { padding: 24px; }
    .rudra-about-page .rudra-about-bottom { align-items: flex-start; }
  }
  @media (max-width: 480px) {
    .rudra-about-page { --rudra-gutter: 16px; }
    .rudra-about-page .rudra-about-banner h1 { font-size: 40px; }
    .rudra-about-page .rudra-about-stat-grid { gap: 10px; }
    .rudra-about-page .rudra-about-stat { padding: 13px; gap: 9px; }
    .rudra-about-page .rudra-about-stat-icon { width: 32px; height: 32px; }
    .rudra-about-page .rudra-about-stat strong { font-size: 23px; }
    .rudra-about-page .rudra-about-stat span:not(.rudra-about-stat-icon) { font-size: 10px; }
    .rudra-about-page .rudra-about-art { min-height: 0; }
    .rudra-about-page .rudra-about-bottom .rudra-about-cta { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rudra-about-page .rudra-about-cta { transition: none; }
  }
`;

export default function AboutUsPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCatalog()
      .then((rows) => {
        if (mounted) setCategories(rows.filter((category) => category.is_active !== false));
      })
      .catch(() => {
        // Keep the informational page usable if the catalogue is unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const liveProductCount = useMemo(
    () =>
      categories.reduce(
        (sum, category) =>
          sum + (category.items || []).filter((item) => item.is_active !== false).length,
        0,
      ),
    [categories],
  );

  const mainCategoryCount = useMemo(
    () => categories.filter((category) => !category.parent_id || !categories.some((parent) => parent.id === category.parent_id)).length,
    [categories],
  );

  return (
    <div className="rudra-about-page" id="about-top">
      <style>{ABOUT_PAGE_STYLES}</style>

      <header className="rudra-about-banner">
        <div className="rudra-about-container rudra-about-banner-inner">
          <div className="rudra-about-banner-copy">
            <p className="rudra-about-kicker"><FiShoppingBag aria-hidden="true" /> THE EASYFINDSTORE COLLECTION</p>
            <h1>About EasyFindStore</h1>
            <p className="rudra-about-banner-lede">Discover more about the way we make online shopping simple.</p>
            <nav className="rudra-about-breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <FiChevronRight aria-hidden="true" />
              <span aria-current="page">About Us</span>
            </nav>
          </div>
          <div className="rudra-about-hero-emblem" aria-hidden="true"><FiShoppingBag /></div>
        </div>
      </header>

      <section className="rudra-about-story rudra-about-container" aria-labelledby="rudra-about-story-heading">
        <div className="rudra-about-copy">
          <p className="rudra-about-eyebrow"><FiCheckCircle aria-hidden="true" /> OUR STORE &amp; OUR MISSION</p>
          <h2 id="rudra-about-story-heading">Where <em>Choice</em> Meets Thoughtful Shopping</h2>
          <p>
            EasyFindStore brings together products from a range of categories in one convenient online store.
            Whether you are browsing clothing, electronics, home essentials or something else, we aim to make
            finding and comparing products straightforward.
          </p>
          <p>
            Browse detailed product pages with images, available videos, documents and specifications.
            See the displayed price, discounts, stock availability and estimated delivery date before placing an order.
          </p>
          <p>
            Orders are handled directly by the store administration. You can view updates through My Orders,
            and availability or delivery charges are determined by the store's current settings and supported service areas.
          </p>
          <div className="rudra-about-benefits" aria-label="Shopping features">
            <span className="rudra-about-benefit"><FiShield aria-hidden="true" /> Order updates</span>
            <span className="rudra-about-benefit"><FiTruck aria-hidden="true" /> Delivery estimates</span>
            <span className="rudra-about-benefit"><FiTag aria-hidden="true" /> Clear product prices</span>
          </div>
          <Link className="rudra-about-cta" to="/store">
            <FiShoppingBag aria-hidden="true" /> Explore Our Products <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>

        <div className="rudra-about-showcase">
          <div className="rudra-about-art">
            <img
              className="rudra-about-art-image"
              src={aboutUsImage}
              alt="EasyFindStore About Us showcase"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="rudra-about-stat-grid" aria-label="Our shopping features">
            <div className="rudra-about-stat">
              <span className="rudra-about-stat-icon" aria-hidden="true"><FiLayers /></span>
              <div className="rudra-about-stat-text"><strong>{mainCategoryCount || "—"}</strong><span>Main categories currently listed</span></div>
            </div>
            <div className="rudra-about-stat">
              <span className="rudra-about-stat-icon" aria-hidden="true"><FiPackage /></span>
              <div className="rudra-about-stat-text"><strong>{liveProductCount || "—"}</strong><span>Active product listings</span></div>
            </div>
            <div className="rudra-about-stat">
              <span className="rudra-about-stat-icon" aria-hidden="true"><FiShoppingBag /></span>
              <div className="rudra-about-stat-text"><strong>24/7</strong><span>Online product browsing</span></div>
            </div>
            <div className="rudra-about-stat">
              <span className="rudra-about-stat-icon" aria-hidden="true"><FiCheckCircle /></span>
              <div className="rudra-about-stat-text"><strong>✓</strong><span>Order status tracking</span></div>
            </div>
          </div>
          <p className="rudra-about-stat-note">Catalogue counts come from currently active listings; a dash means no items are loaded.</p>
        </div>
      </section>

      <section className="rudra-about-values" aria-labelledby="rudra-about-values-heading">
        <div className="rudra-about-container">
          <div className="rudra-about-values-head">
            <p className="rudra-about-eyebrow">WHAT MATTERS TO US</p>
            <h2 id="rudra-about-values-heading">Our Core Pillars</h2>
          </div>
          <div className="rudra-about-values-grid">
            {PILLARS.map(({ Icon, title, text }) => (
              <article key={title} className="rudra-about-value-card">
                <span className="rudra-about-value-icon" aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rudra-about-bottom rudra-about-container">
        <div>
          <p className="rudra-about-eyebrow">READY TO EXPLORE?</p>
          <h2>Find your next favourite product.</h2>
          <p>Browse the latest products and categories in the shop.</p>
        </div>
        <Link to="/categories" className="rudra-about-cta">
          Browse Categories <FiArrowRight aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
