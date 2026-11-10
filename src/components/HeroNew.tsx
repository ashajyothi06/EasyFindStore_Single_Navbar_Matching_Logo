import heroImage from "../assets/images/fruveto-hero.png";
import heroImageMobile from "../assets/images/fruveto-hero-mobile.png";

function HeroNew() {
    const scrollToSection = (sectionId: "juices" | "subscriptions") => {
        const catalogueSection = document.getElementById(sectionId);

        if (!catalogueSection) return;

        const y =
            catalogueSection.getBoundingClientRect().top +
            window.scrollY -
            90;

        window.scrollTo({
            top: y,
            behavior: "smooth",
        });
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playball&family=Caveat:wght@700&display=swap');

                .fruzely-hero,
                .fruzely-hero * {
                    box-sizing: border-box;
                }

                .fruzely-hero {
                    --fruveto-olive: #33371b;
                    --fruveto-olive-dark: #242815;
                    --fruveto-green: #4f741d;
                    --fruveto-cream: #f7f7f2;
                    --fruveto-soft: #eef0e6;

                    /*
                     * IMPORTANT:
                     * Keep this gutter system identical to SiteHeader.
                     * Header reference:
                     * default      clamp(10px, 2vw, 36px)
                     * <= 1439px    clamp(12px, 1.8vw, 24px)
                     * <= 900px     clamp(10px, 2vw, 18px)
                     * <= 600px     clamp(8px, 3vw, 12px)
                     * <= 480px     clamp(7px, 2.6vw, 10px)
                     * <= 340px     7px
                     * >= 1700px    clamp(32px, 2.5vw, 96px)
                     */
                    --fruveto-page-gutter: clamp(10px, 2vw, 36px);

                    position: relative;
                    width: 100%;
                    min-width: 0;
                    min-height: clamp(650px, 78vh, 780px);
                    margin: -40px 0 0 0 !important;
                    padding: 0 !important;
                    overflow: hidden;
                    background: var(--fruveto-cream);
                    display: block;
                }

                .fruzely-hero__background {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                    overflow: hidden;
                    margin: 0;
                    padding: 0;
                }

                .fruzely-hero__background picture {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                .fruzely-hero__background img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    margin: 0;
                    padding: 0;
                    object-fit: cover;
                    object-position: center bottom;
                }

                .fruzely-hero__overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                    background:
                        linear-gradient(
                            90deg,
                            rgba(247, 247, 242, 0.16) 0%,
                            rgba(247, 247, 242, 0.05) 40%,
                            rgba(247, 247, 242, 0) 67%
                        );
                }

                .fruzely-hero__container {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: none;
                    min-width: 0;
                    min-height: clamp(650px, 78vh, 780px);
                    margin: 0 auto;

                    /* Match SiteHeader exactly on BOTH sides. */
                    padding-top: clamp(24px, 4vh, 48px);
                    padding-right: var(--fruveto-page-gutter);
                    padding-bottom: 70px;
                    padding-left: var(--fruveto-page-gutter);

                    display: flex;
                    align-items: center;
                    box-sizing: border-box;
                    pointer-events: none;
                }

                .fruzely-hero__content {
                    width: min(46rem, 45vw);
                    max-width: 46rem;
                    min-width: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    pointer-events: auto;
                }

                .fruzely-hero__eyebrow {
                    margin: 0 0 18px;
                    color: var(--fruveto-olive-dark);
                    font-size: 15px;
                    font-weight: 800;
                    letter-spacing: 2.4px;
                    line-height: 1.3;
                    text-transform: uppercase;
                }

                .fruzely-hero__content h1 {
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    line-height: 1;
                    letter-spacing: -3px;
                }

                .fruzely-hero__heading-main {
                    display: block;
                    color: var(--fruveto-olive-dark);
                    font-family: "EB Garamond", Georgia, serif;
                    font-size: clamp(94px, 9.6vw, 148px);
                    font-weight: 900;
                    line-height: 0.95;
                    letter-spacing: -0.06em;
                }

                .fruzely-hero__heading-script {
                    display: block;
                    margin-top: clamp(14px, 1.2vw, 20px);
                    color: var(--fruveto-green);
                    font-family: 'Playball', 'Caveat', cursive;
                    font-size: clamp(88px, 8.8vw, 136px);
                    font-weight: 600;
                    line-height: 1;
                    letter-spacing: -2px;
                    transform: none;
                    transform-origin: left center;
                }

                .fruzely-hero__description {
                    max-width: 640px;
                    margin: 30px 0 0;
                    color: #3f4333;
                    font-size: 20px;
                    line-height: 1.72;
                }

                .fruzely-hero__features {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 12px 26px;
                    margin-top: 25px;
                }

                .fruzely-hero__feature {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--fruveto-olive-dark);
                    font-size: 15px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .fruzely-hero__feature-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    color: var(--fruveto-green);
                }

                .fruzely-hero__buttons {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    margin-top: 36px;
                }

                .fruzely-hero__order-btn,
                .fruzely-hero__view-btn {
                    min-height: 60px;
                    padding: 0 36px;
                    border-radius: 16px;
                    font: inherit;
                    font-size: 17px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition:
                        transform 0.3s ease,
                        background-color 0.3s ease,
                        box-shadow 0.3s ease,
                        border-color 0.3s ease;
                }

                .fruzely-hero__order-btn {
                    border: none;
                    background: var(--fruveto-green);
                    color: #ffffff;
                    box-shadow: 0 15px 30px rgba(79, 116, 29, 0.25);
                }

                .fruzely-hero__order-btn:hover {
                    background: #3e5a17;
                    transform: translateY(-5px);
                    box-shadow: 0 22px 40px rgba(79, 116, 29, 0.35);
                }

                .fruzely-hero__view-btn {
                    border: 2.5px solid var(--fruveto-green);
                    background: transparent;
                    color: var(--fruveto-green);
                }

                .fruzely-hero__view-btn:hover {
                    background: rgba(79, 116, 29, 0.08);
                    transform: translateY(-5px);
                }

                .fruzely-hero__order-btn:focus-visible,
                .fruzely-hero__view-btn:focus-visible {
                    outline: 3px solid rgba(79, 116, 29, 0.3);
                    outline-offset: 3px;
                }

                /* Same wide-screen gutter used by SiteHeader. */
                @media (min-width: 1700px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: clamp(32px, 2.5vw, 96px);
                    }
                }

                /* Same <=1439px gutter used by SiteHeader. */
                @media (max-width: 1439px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: clamp(12px, 1.8vw, 24px);
                    }
                }

                /* =========================================================
                   TABLET
                 ========================================================= */
                @media (max-width: 1100px) {
                    .fruzely-hero__content {
                        width: 55%;
                        max-width: 650px;
                    }

                    .fruzely-hero__heading-main {
                        font-size: clamp(52px, 6vw, 74px);
                    }

                    .fruzely-hero__heading-script {
                        font-size: clamp(46px, 5.4vw, 68px);
                    }
                }

                /* Same <=900px gutter used by SiteHeader. */
                @media (max-width: 900px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: clamp(10px, 2vw, 18px);
                    }
                }

                /* =========================================================
                   MOBILE
                 ========================================================= */
                @media (max-width: 820px) {
                    .fruzely-hero {
                        min-height: clamp(700px, 90svh, 760px);
                        margin: -40px 0 0 0 !important;
                        padding: 0 !important;
                        display: block;
                        overflow: hidden;
                    }

                    .fruzely-hero__background {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 0;
                        overflow: hidden;
                        margin: 0;
                        padding: 0;
                    }

                    .fruzely-hero__background picture {
                        display: block;
                        width: 100%;
                        height: 100%;
                    }

                    .fruzely-hero__background img {
                        width: 100%;
                        height: 100%;
                        display: block;
                        object-fit: cover;
                        object-position: center top;
                        transform: none;
                        transform-origin: center center;
                    }

                    .fruzely-hero__overlay {
                        position: absolute;
                        inset: 0;
                        z-index: 1;
                        display: block;
                        pointer-events: none;
                        background:
                            linear-gradient(
                                180deg,
                                rgba(247, 247, 242, 0.04) 0%,
                                rgba(247, 247, 242, 0.1) 38%,
                                rgba(247, 247, 242, 0.78) 57%,
                                rgba(247, 247, 242, 0.96) 70%,
                                rgba(247, 247, 242, 0.98) 100%
                            );
                    }

                    .fruzely-hero__container {
                        width: 100%;
                        max-width: 100%;
                        min-width: 0;
                        min-height: clamp(700px, 90svh, 760px);
                        margin: 0;

                        /*
                         * Only vertical padding is written here.
                         * Horizontal padding always comes from the shared
                         * --fruveto-page-gutter variable.
                         */
                        padding-top: max(24px, env(safe-area-inset-top));
                        padding-right: max(
                            var(--fruveto-page-gutter),
                            env(safe-area-inset-right)
                        );
                        padding-bottom: max(
                            22px,
                            env(safe-area-inset-bottom)
                        );
                        padding-left: max(
                            var(--fruveto-page-gutter),
                            env(safe-area-inset-left)
                        );

                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        justify-content: flex-end;
                        text-align: left;
                    }

                    .fruzely-hero__content {
                        width: 100%;
                        max-width: 440px;
                        min-width: 0;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .fruzely-hero__eyebrow {
                        width: 100%;
                        margin: 0 0 10px;
                        color: var(--fruveto-olive-dark);
                        font-size: clamp(10px, 2.8vw, 12px);
                        font-weight: 800;
                        letter-spacing: clamp(1.2px, 0.4vw, 1.7px);
                        line-height: 1.3;
                    }

                    .fruzely-hero__content h1 {
                        position: absolute;
                        top: max(28px, env(safe-area-inset-top));
                        left: max(
                            var(--fruveto-page-gutter),
                            env(safe-area-inset-left)
                        );
                        right: max(
                            var(--fruveto-page-gutter),
                            env(safe-area-inset-right)
                        );
                        z-index: 3;
                        width: auto;
                        min-width: 0;
                        align-items: flex-start;
                        text-align: left;
                        line-height: 1;
                        letter-spacing: -1.8px;
                        pointer-events: none;
                    }

                    .fruzely-hero__heading-main {
                        max-width: 100%;
                        font-size: clamp(56px, 14.8vw, 70px);
                        text-shadow: 0 2px 18px rgba(247, 247, 242, 0.78);
                    }

                    .fruzely-hero__heading-script {
                        max-width: 100%;
                        margin-top: 9px;
                        font-size: clamp(48px, 12.6vw, 60px);
                        line-height: 1;
                        transform: none;
                        transform-origin: left center;
                        text-shadow: 0 2px 18px rgba(247, 247, 242, 0.82);
                    }

                    .fruzely-hero__description {
                        width: 100%;
                        max-width: none;
                        margin: 14px 0 0;
                        color: #3f4333;
                        font-size: clamp(13px, 3.5vw, 15px);
                        line-height: 1.5;
                    }

                    .fruzely-hero__features {
                        width: 100%;
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        align-items: flex-start;
                        gap: 10px;
                        margin-top: 16px;
                    }

                    .fruzely-hero__feature {
                        width: 100%;
                        min-width: 0;
                        display: grid;
                        grid-template-columns: 18px minmax(0, 1fr);
                        align-items: center;
                        gap: 6px;
                        font-size: clamp(11px, 3vw, 13px);
                        white-space: normal;
                    }

                    .fruzely-hero__feature-icon {
                        flex: 0 0 auto;
                        width: 18px;
                        height: 18px;
                    }

                    .fruzely-hero__buttons {
                        width: 100%;
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 10px;
                        margin-top: 18px;
                    }

                    .fruzely-hero__order-btn,
                    .fruzely-hero__view-btn {
                        width: 100%;
                        min-width: 0;
                        min-height: 50px;
                        padding: 0 clamp(10px, 3vw, 18px);
                        border-radius: 13px;
                        font-size: clamp(11px, 3vw, 13px);
                        line-height: 1.2;
                        white-space: nowrap;
                        gap: 8px;
                        text-align: center;
                    }

                    .fruzely-hero__order-btn svg,
                    .fruzely-hero__view-btn svg {
                        flex: 0 0 auto;
                        margin-left: 0 !important;
                    }

                    .fruzely-hero__view-btn {
                        background: rgba(247, 247, 242, 0.72);
                        backdrop-filter: blur(3px);
                    }
                }

                /* Exact SiteHeader mobile gutters. */
                @media (max-width: 600px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: clamp(8px, 3vw, 12px);
                    }
                }

                @media (max-width: 480px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: clamp(7px, 2.6vw, 10px);
                    }
                }

                @media (max-width: 380px) {
                    .fruzely-hero,
                    .fruzely-hero__container {
                        min-height: 700px;
                    }

                    .fruzely-hero__content h1 {
                        top: max(24px, env(safe-area-inset-top));
                        letter-spacing: -1.4px;
                    }

                    .fruzely-hero__heading-main {
                        font-size: clamp(52px, 14.2vw, 60px);
                    }

                    .fruzely-hero__heading-script {
                        font-size: clamp(46px, 12.2vw, 52px);
                    }

                    .fruzely-hero__buttons {
                        gap: 8px;
                        margin-top: 16px;
                    }

                    .fruzely-hero__order-btn,
                    .fruzely-hero__view-btn {
                        min-height: 46px;
                        padding: 0 9px;
                        border-radius: 11px;
                        font-size: 10.5px;
                    }

                    .fruzely-hero__order-btn svg,
                    .fruzely-hero__view-btn svg {
                        width: 14px;
                        height: 14px;
                    }
                }

                @media (max-width: 340px) {
                    .fruzely-hero {
                        --fruveto-page-gutter: 7px;
                    }
                }

                @media (max-width: 820px) and (orientation: landscape) {
                    .fruzely-hero,
                    .fruzely-hero__container {
                        min-height: 560px;
                    }

                    .fruzely-hero__container {
                        padding-top: 48px;
                        padding-bottom: 32px;
                        justify-content: center;
                    }

                    .fruzely-hero__overlay {
                        background:
                            linear-gradient(
                                90deg,
                                rgba(247, 247, 242, 0.96) 0%,
                                rgba(247, 247, 242, 0.82) 46%,
                                rgba(247, 247, 242, 0.08) 78%,
                                rgba(247, 247, 242, 0) 100%
                            );
                    }

                    .fruzely-hero__content {
                        max-width: min(58vw, 460px);
                        margin-left: 0;
                        margin-right: auto;
                    }

                    .fruzely-hero__content h1 {
                        position: static;
                        width: 100%;
                        align-items: flex-start;
                        text-align: left;
                        pointer-events: auto;
                    }

                    .fruzely-hero__heading-main {
                        font-size: clamp(38px, 7vw, 54px);
                    }

                    .fruzely-hero__heading-script {
                        font-size: clamp(36px, 6.5vw, 50px);
                        transform-origin: left center;
                    }
                }

                @media (hover: none) and (pointer: coarse) {
                    .fruzely-hero__order-btn:hover,
                    .fruzely-hero__view-btn:hover {
                        transform: none;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .fruzely-hero__order-btn,
                    .fruzely-hero__view-btn {
                        transition: none;
                    }
                }
            `}</style>

            <section className="fruzely-hero">
                <div className="fruzely-hero__background">
                    <picture>
                        <source
                            media="(max-width: 768px)"
                            srcSet={heroImageMobile}
                        />
                        <img
                            src={heroImage}
                            alt="Fresh fruits, vegetables and healthy food"
                        />
                    </picture>
                </div>

                <div className="fruzely-hero__overlay" />

                <div className="fruzely-hero__container">
                    <div className="fruzely-hero__content">
                        <p className="fruzely-hero__eyebrow">
                            SHOP WITH CONFIDENCE,
                        </p>

                        <h1>
                            <span className="fruzely-hero__heading-main">
                                Products
                            </span>
                            <span className="fruzely-hero__heading-script">
                                for your lifestyle!
                            </span>
                        </h1>

                        <p className="fruzely-hero__description">
                            Discover clothing, electronics, home essentials and
                            more in one place. Explore flexible categories
                            and shop your favorites with ease.
                        </p>

                        <div className="fruzely-hero__features">
                            <span className="fruzely-hero__feature">
                                <span className="fruzely-hero__feature-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c1.25-3.33 3.5-5.5 6-6.5a14 14 0 0 1 12-1s1 8-4.5 11c-2.5 1.35-6.25 1-13.5-3.5z" /><path d="M8 15.5c2 2 3.5 4.5 4.5 6.5" /></svg>
                                </span>
                                Shop by Category
                            </span>

                            <span className="fruzely-hero__feature">
                                <span className="fruzely-hero__feature-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                                </span>
                                Product Details
                            </span>

                            <span className="fruzely-hero__feature">
                                <span className="fruzely-hero__feature-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" /></svg>
                                </span>
                                Easy Checkout
                            </span>

                            <span className="fruzely-hero__feature">
                                <span className="fruzely-hero__feature-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                </span>
                                Delivery Estimates
                            </span>
                        </div>

                        <div className="fruzely-hero__buttons">
                            <button
                                type="button"
                                className="fruzely-hero__order-btn"
                                onClick={() =>
                                    scrollToSection("juices")
                                }
                            >
                                ORDER NOW
                                <svg style={{ marginLeft: "10px" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>

                            <button
                                type="button"
                                className="fruzely-hero__view-btn"
                                onClick={() =>
                                    scrollToSection("juices")
                                }
                            >
                                BROWSE PRODUCTS
                                <svg style={{ marginLeft: "8px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c1.25-3.33 3.5-5.5 6-6.5a14 14 0 0 1 12-1s1 8-4.5 11c-2.5 1.35-6.25 1-13.5-3.5z" /><path d="M8 15.5c2 2 3.5 4.5 4.5 6.5" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default HeroNew;
