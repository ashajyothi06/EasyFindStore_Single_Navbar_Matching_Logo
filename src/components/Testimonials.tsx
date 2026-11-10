import React, { useEffect, useState } from "react";
import {
    Star,
    ArrowLeft,
    ArrowRight,
    Heart,
    Sparkles,
} from "lucide-react";
import { testimonialData } from "../types/constants";

const Testimonials: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleCards, setVisibleCards] = useState(3);

    const carouselItems = testimonialData.slice(1);
    const totalCards = carouselItems.length;

    useEffect(() => {
        const updateVisibleCards = () => {
            if (window.innerWidth <= 768) {
                setVisibleCards(1);
            } else if (window.innerWidth <= 1100) {
                setVisibleCards(2);
            } else {
                setVisibleCards(3);
            }
        };

        updateVisibleCards();

        window.addEventListener("resize", updateVisibleCards);

        return () => {
            window.removeEventListener("resize", updateVisibleCards);
        };
    }, []);

    useEffect(() => {
        setCurrentIndex(0);
    }, [visibleCards]);

    const handlePrevious = () => {
        setCurrentIndex((prev) => {
            if (prev === 0) {
                return totalCards - visibleCards;
            }

            return prev - 1;
        });
    };

    const handleNext = () => {
        setCurrentIndex((prev) => {
            const nextIndex = prev + 1;

            if (nextIndex > totalCards - visibleCards) {
                return 0;
            }

            return nextIndex;
        });
    };

    const slidePercentage = 100 / visibleCards;

    return (
        <>
            <style>{`
                .fruveto-testimonials,
                .fruveto-testimonials * {
                    box-sizing: border-box;
                }

                .fruveto-testimonials {
                    --testimonial-olive: #33371b;
                    --testimonial-olive-hover: #454b24;
                    --testimonial-olive-soft: #eef0e6;
                    --testimonial-cream: #f7f7f2;
                    --testimonial-ink: #242815;
                    --testimonial-muted: #626856;
                    --testimonial-border: #dedfd4;

                    width: 100%;
                    overflow: hidden;

                    padding:
                        clamp(45px, 5vw, 75px)
                        clamp(18px, 3vw, 40px);

                    border:
                        1px solid
                        var(--testimonial-border);

                    border-radius: 24px;

                    background:
                        var(--testimonial-cream);

                    box-shadow:
                        0 18px 55px
                        rgba(51, 55, 27, 0.07);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;
                }

                .fruveto-testimonials-container {
                    width: 100%;
                    max-width: 1800px;
                    margin: 0 auto;
                }

                .fruveto-testimonials-header {
                    max-width: 760px;
                    margin: 0 auto 42px;
                    text-align: center;
                }

                .fruveto-testimonials-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;

                    margin-bottom: 15px;
                    padding: 8px 15px;

                    border:
                        1px solid
                        rgba(51, 55, 27, 0.2);

                    border-radius: 999px;

                    background:
                        var(--testimonial-olive-soft);

                    color:
                        var(--testimonial-olive);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }

                .fruveto-testimonials-title {
                    margin: 0 0 14px;

                    color:
                        var(--testimonial-ink);

                    font-size:
                        clamp(
                            34px,
                            4vw,
                            50px
                        );

                    font-weight: 800;
                    line-height: 1.08;
                    letter-spacing: -0.7px;
                }

                .fruveto-testimonials-description {
                    max-width: 650px;
                    margin: 0 auto;

                    color:
                        var(--testimonial-muted);

                    font-size: 17px;
                    line-height: 1.7;
                }

                /* FEATURED CUSTOMER */

                .fruveto-featured {
                    width: 100%;

                    display: grid;

                    grid-template-columns:
                        minmax(0, 1fr)
                        minmax(250px, 0.38fr);

                    gap: 25px;

                    margin-bottom: 34px;

                    padding:
                        clamp(
                            26px,
                            4vw,
                            38px
                        );

                    border:
                        1px solid
                        var(--testimonial-border);

                    border-radius: 22px;

                    background: #ffffff;

                    box-shadow:
                        0 10px 32px
                        rgba(51, 55, 27, 0.06);
                }

                .fruveto-featured-main {
                    min-width: 0;

                    padding-right:
                        clamp(
                            0px,
                            3vw,
                            35px
                        );

                    border-right:
                        1px solid
                        var(--testimonial-border);
                }

                .fruveto-featured-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;

                    margin-bottom: 18px;

                    color:
                        var(--testimonial-olive);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }

                .fruveto-featured-review {
                    max-width: 850px;

                    margin: 0;

                    color:
                        var(--testimonial-ink);

                    font-size:
                        clamp(
                            23px,
                            2.5vw,
                            30px
                        );

                    font-weight: 600;
                    line-height: 1.25;

                    letter-spacing: -0.3px;
                }

                .fruveto-featured-author {
                    display: flex;
                    align-items: center;
                    gap: 12px;

                    margin-top: 27px;
                }

                .fruveto-featured-avatar {
                    width: 46px;
                    height: 46px;

                    flex: 0 0 46px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background:
                        var(--testimonial-olive);

                    color: #ffffff;

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 12px;
                    font-weight: 800;
                }

                .fruveto-featured-name {
                    margin: 0;

                    color:
                        var(--testimonial-ink);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 14px;
                    font-weight: 800;
                }

                .fruveto-featured-location {
                    display: block;

                    margin-top: 3px;

                    color:
                        var(--testimonial-muted);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                }

                .fruveto-featured-side {
                    min-width: 0;

                    display: flex;
                    flex-direction: column;
                    justify-content: center;

                    padding-left:
                        clamp(
                            0px,
                            1vw,
                            15px
                        );
                }

                .fruveto-featured-stat {
                    margin-bottom: 20px;
                }

                .fruveto-featured-number {
                    display: block;

                    color:
                        var(--testimonial-olive);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 38px;
                    font-weight: 900;
                    line-height: 1;
                }

                .fruveto-featured-stat-label {
                    display: block;

                    margin-top: 6px;

                    color:
                        var(--testimonial-muted);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 12px;
                    font-weight: 700;
                }

                .fruveto-featured-stars {
                    display: flex;
                    gap: 4px;

                    margin-bottom: 8px;

                    color:
                        var(--testimonial-olive);
                }

                .fruveto-featured-caption {
                    margin: 0;

                    color:
                        var(--testimonial-muted);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    line-height: 1.5;
                }

                /* CAROUSEL HEADER */

                .fruveto-carousel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    margin-bottom: 12px;
                }

                .fruveto-carousel-heading {
                    margin: 0;

                    color:
                        var(--testimonial-ink);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 15px;
                    font-weight: 800;
                }

                .fruveto-carousel-controls {
                    display: flex;
                    gap: 8px;
                }

                .fruveto-carousel-button {
                    width: 38px;
                    height: 38px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border:
                        1px solid
                        var(--testimonial-border);

                    border-radius: 50%;

                    background: #ffffff;

                    color:
                        var(--testimonial-olive);

                    cursor: pointer;

                    transition:
                        background 0.25s ease,
                        color 0.25s ease,
                        border-color 0.25s ease,
                        transform 0.2s ease;
                }

                .fruveto-carousel-button:hover {
                    background:
                        var(--testimonial-olive);

                    border-color:
                        var(--testimonial-olive);

                    color: #ffffff;

                    transform: translateY(-1px);
                }

                /* IMPORTANT:
                   Extra vertical padding prevents
                   hover transform from being clipped.
                */

                .fruveto-carousel-window {
                    width: 100%;

                    overflow: hidden;

                    padding:
                        10px
                        10px
                        18px;

                    margin:
                        -10px
                        -10px
                        0;

                    width: calc(100% + 20px);
                }

                .fruveto-carousel-track {
                    display: flex;

                    transition:
                        transform 0.45s
                        cubic-bezier(
                            0.22,
                            1,
                            0.36,
                            1
                        );

                    will-change: transform;
                }

                .fruveto-carousel-slide {
                    flex:
                        0 0
                        calc(
                            100% /
                            3
                        );

                    min-width: 0;

                    padding:
                        0 10px;
                }

                .fruveto-testimonial-card {
                    width: 100%;
                    min-height: 275px;

                    display: flex;
                    flex-direction: column;

                    padding:
                        25px
                        24px;

                    border:
                        1px solid
                        var(--testimonial-border);

                    border-radius: 18px;

                    background: #ffffff;

                    box-shadow:
                        0 8px 25px
                        rgba(51, 55, 27, 0.05);

                    text-align: left;

                    transition:
                        transform 0.25s ease,
                        box-shadow 0.25s ease,
                        border-color 0.25s ease;
                }

                .fruveto-testimonial-card:hover {
                    transform:
                        translateY(-4px);

                    border-color:
                        rgba(51, 55, 27, 0.3);

                    box-shadow:
                        0 14px 30px
                        rgba(51, 55, 27, 0.1);
                }

                .fruveto-card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    margin-bottom: 18px;
                }

                .fruveto-card-stars {
                    display: flex;
                    gap: 3px;

                    color:
                        var(--testimonial-olive);
                }

                .fruveto-card-icon {
                    width: 29px;
                    height: 29px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 8px;

                    background:
                        var(--testimonial-olive-soft);

                    color:
                        var(--testimonial-olive);
                }

                .fruveto-card-review {
                    flex: 1;

                    margin: 0;

                    color:
                        var(--testimonial-muted);

                    font-size: 15px;
                    line-height: 1.7;
                }

                .fruveto-card-user {
                    display: flex;
                    align-items: center;
                    gap: 11px;

                    margin-top: 22px;
                    padding-top: 16px;

                    border-top:
                        1px solid
                        rgba(51,55,27,0.1);
                }

                .fruveto-card-avatar {
                    width: 40px;
                    height: 40px;

                    flex: 0 0 40px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background:
                        var(--testimonial-olive-soft);

                    color:
                        var(--testimonial-olive);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 10px;
                    font-weight: 800;
                }

                .fruveto-card-name {
                    margin: 0;

                    color:
                        var(--testimonial-ink);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 13px;
                    font-weight: 800;
                }

                .fruveto-card-location {
                    display: block;

                    margin-top: 3px;

                    color:
                        var(--testimonial-muted);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                }

                .fruveto-trust {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    margin-top: 24px;

                    color:
                        var(--testimonial-muted);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    font-weight: 700;
                }

                .fruveto-trust svg {
                    color:
                        var(--testimonial-olive);
                }

                @media (max-width: 1100px) {

                    .fruveto-featured {
                        grid-template-columns:
                            minmax(0, 1fr)
                            minmax(200px, 0.4fr);
                    }

                    .fruveto-carousel-slide {
                        flex:
                            0 0
                            50%;
                    }
                }

                @media (max-width: 800px) {

                    .fruveto-featured {
                        grid-template-columns: 1fr;
                    }

                    .fruveto-featured-main {
                        padding-right: 0;

                        padding-bottom: 24px;

                        border-right: none;

                        border-bottom:
                            1px solid
                            var(--testimonial-border);
                    }

                    .fruveto-featured-side {
                        padding-left: 0;

                        display: grid;

                        grid-template-columns:
                            1fr
                            1fr;

                        gap: 20px;
                    }

                    .fruveto-carousel-slide {
                        flex:
                            0 0
                            100%;
                    }
                }

                @media (max-width: 768px) {

                    .fruveto-testimonials {
                        padding:
                            42px
                            16px;

                        border-radius: 20px;
                    }

                    .fruveto-testimonials-header {
                        margin-bottom: 30px;

                        text-align: left;
                    }

                    .fruveto-testimonials-title {
                        margin-bottom: 13px;

                        font-size:
                            clamp(
                                30px,
                                8vw,
                                40px
                            );

                        text-align: left;
                    }

                    .fruveto-testimonials-description {
                        margin: 0;

                        font-size: 16px;
                        line-height: 1.6;

                        text-align: left;
                    }

                    .fruveto-featured {
                        margin-bottom: 28px;

                        padding:
                            24px
                            20px;

                        border-radius: 18px;

                        text-align: left;
                    }

                    .fruveto-featured-label {
                        margin-bottom: 15px;
                    }

                    .fruveto-featured-review {
                        font-size:
                            clamp(
                                22px,
                                6vw,
                                25px
                            );

                        line-height: 1.28;

                        text-align: left;
                    }

                    .fruveto-featured-author {
                        justify-content: flex-start;
                    }

                    .fruveto-featured-side {
                        grid-template-columns:
                            1fr
                            1fr;

                        text-align: left;
                    }

                    .fruveto-carousel-header {
                        align-items: center;

                        margin-bottom: 12px;
                    }

                    .fruveto-carousel-heading {
                        font-size: 14px;
                    }

                    .fruveto-carousel-button {
                        width: 36px;
                        height: 36px;
                    }

                    .fruveto-carousel-window {
                        padding:
                            10px
                            8px
                            18px;

                        margin:
                            -10px
                            -8px
                            0;

                        width: calc(100% + 16px);
                    }

                    .fruveto-carousel-slide {
                        flex:
                            0 0
                            100%;

                        padding:
                            0
                            8px;
                    }

                    .fruveto-testimonial-card {
                        min-height: 260px;

                        padding:
                            23px
                            20px;

                        border-radius: 16px;
                    }

                    .fruveto-card-review {
                        font-size: 15px;
                        line-height: 1.65;

                        text-align: left;
                    }

                    .fruveto-trust {
                        justify-content: flex-start;

                        text-align: left;
                    }
                }

                @media (max-width: 480px) {

                    .fruveto-testimonials {
                        padding:
                            35px
                            14px;

                        border-radius: 18px;
                    }

                    .fruveto-testimonials-title {
                        font-size:
                            clamp(
                                28px,
                                8.5vw,
                                34px
                            );
                    }

                    .fruveto-testimonials-description {
                        font-size: 15px;
                    }

                    .fruveto-featured {
                        padding:
                            21px
                            18px;

                        border-radius: 16px;
                    }

                    .fruveto-featured-review {
                        font-size: 18px;
                    }

                    .fruveto-featured-side {
                        grid-template-columns:
                            1fr
                            1fr;
                    }

                    .fruveto-featured-number {
                        font-size: 24px;
                    }

                    .fruveto-carousel-button {
                        width: 34px;
                        height: 34px;
                    }

                    .fruveto-testimonial-card {
                        min-height: 250px;

                        padding:
                            20px
                            17px;
                    }

                    .fruveto-card-review {
                        font-size: 14px;
                    }

                    .fruveto-trust {
                        font-size: 10px;
                    }
                }

                @media (max-width: 360px) {

                    .fruveto-testimonials {
                        padding:
                            32px
                            12px;
                    }

                    .fruveto-featured-side {
                        grid-template-columns: 1fr;
                    }

                    .fruveto-featured-stat {
                        margin-bottom: 15px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {

                    .fruveto-carousel-track,
                    .fruveto-testimonial-card {
                        transition: none;
                    }
                }
            `}</style>

            <section className="fruveto-testimonials">
                <div className="fruveto-testimonials-container">

                    <header className="fruveto-testimonials-header">
                        <div className="fruveto-testimonials-eyebrow">
                            <Heart size={13} />
                            Customer Stories
                        </div>

                        <h2 className="fruveto-testimonials-title">
                            Shopping experiences people
                            <br />
                            love to come back for.
                        </h2>

                        <p className="fruveto-testimonials-description">
                            Customer feedback on shopping, product selection,
                            and the convenience of ordering online.
                        </p>
                    </header>

                    <div className="fruveto-featured">

                        <div className="fruveto-featured-main">

                            <div className="fruveto-featured-label">
                                <Sparkles size={15} />
                                Featured Customer
                            </div>

                            <p className="fruveto-featured-review">
                                Fruveto has completely changed the way we
                                enjoy healthy food at home. Everything feels
                                fresh, thoughtful and genuinely high quality.
                            </p>

                            <div className="fruveto-featured-author">
                                <div className="fruveto-featured-avatar">
                                    AR
                                </div>

                                <div>
                                    <p className="fruveto-featured-name">
                                        Ananya Reddy
                                    </p>

                                    <span className="fruveto-featured-location">
                                        Hyderabad
                                    </span>
                                </div>
                            </div>

                        </div>

                        <div className="fruveto-featured-side">

                            <div className="fruveto-featured-stat">
                                <span className="fruveto-featured-number">
                                    5.0
                                </span>

                                <span className="fruveto-featured-stat-label">
                                    Average customer rating
                                </span>
                            </div>

                            <div>
                                <div className="fruveto-featured-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={15}
                                            fill="currentColor"
                                        />
                                    ))}
                                </div>

                                <p className="fruveto-featured-caption">
                                    Loved for freshness,
                                    quality and reliable delivery.
                                </p>
                            </div>

                        </div>

                    </div>

                    <div className="fruveto-carousel-header">

                        <h3 className="fruveto-carousel-heading">
                            What our customers say
                        </h3>

                        <div className="fruveto-carousel-controls">

                            <button
                                type="button"
                                className="fruveto-carousel-button"
                                onClick={handlePrevious}
                                aria-label="Previous testimonials"
                            >
                                <ArrowLeft size={16} />
                            </button>

                            <button
                                type="button"
                                className="fruveto-carousel-button"
                                onClick={handleNext}
                                aria-label="Next testimonials"
                            >
                                <ArrowRight size={16} />
                            </button>

                        </div>

                    </div>

                    <div className="fruveto-carousel-window">

                        <div
                            className="fruveto-carousel-track"
                            style={{
                                transform: `
                                    translateX(
                                        -${
                                            currentIndex *
                                            slidePercentage
                                        }%
                                    )
                                `,
                            }}
                        >

                            {carouselItems.map((item) => (
                                <div
                                    className="fruveto-carousel-slide"
                                    key={item.id}
                                >

                                    <article className="fruveto-testimonial-card">

                                        <div className="fruveto-card-top">

                                            <div className="fruveto-card-stars">
                                                {[1, 2, 3, 4, 5].map(
                                                    (star) => (
                                                        <Star
                                                            key={star}
                                                            size={13}
                                                            fill="currentColor"
                                                        />
                                                    )
                                                )}
                                            </div>

                                            <div className="fruveto-card-icon">
                                                <Heart size={14} />
                                            </div>

                                        </div>

                                        <p className="fruveto-card-review">
                                            {item.review}
                                        </p>

                                        <div className="fruveto-card-user">

                                            <div className="fruveto-card-avatar">
                                                {item.initials}
                                            </div>

                                            <div>
                                                <p className="fruveto-card-name">
                                                    {item.name}
                                                </p>

                                                <span className="fruveto-card-location">
                                                    {item.location}
                                                </span>
                                            </div>

                                        </div>

                                    </article>

                                </div>
                            ))}

                        </div>

                    </div>

                    <div className="fruveto-trust">

                        <Heart
                            size={13}
                            fill="currentColor"
                        />

                        Freshness loved by our growing Fruveto community

                    </div>

                </div>
            </section>
        </>
    );
};

export default Testimonials;