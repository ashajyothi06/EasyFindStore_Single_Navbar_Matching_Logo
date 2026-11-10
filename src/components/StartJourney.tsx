import React from "react";
import {
    Sprout,
    Truck,
    Leaf,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

const StartJourney: React.FC = () => {
    const scrollToCatalogue = () => {
        const catalogueSection = document.getElementById("catalogue");

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
                .start-journey,
                .start-journey * {
                    box-sizing: border-box;
                }

                .start-journey {
                    width: 100%;
                    padding: 80px 0;
                    overflow: hidden;
                    font-family: "EB Garamond", Georgia, serif;
                }

                .start-journey-container {
                    width: 100%;
                    max-width: 1800px;
                    margin: 0 auto;
                }

                .start-journey-card {
                    width: 100%;
                    padding: clamp(45px, 5vw, 75px) clamp(24px, 5vw, 80px);

                    background: #fbfbf7;
                    border: 1px solid #d5ddce;
                    border-radius: 28px;

                    box-shadow:
                        0 12px 35px rgba(51, 55, 27, 0.05);

                    text-align: center;
                }

                .start-journey-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

                .start-journey-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    margin-bottom: 20px;
                    padding: 9px 16px;

                    border: 1px solid #d5dfcf;
                    border-radius: 999px;

                    background: #eef2e9;
                    color: #596443;

                    font-family: "Manrope", Arial, sans-serif;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }

                .start-journey-dot {
                    width: 7px;
                    height: 7px;
                    flex-shrink: 0;

                    border-radius: 50%;
                    background: #718141;
                }

                .start-journey-title {
                    max-width: 1100px;
                    margin: 0 auto 18px;

                    color: #242815;

                    font-family: "EB Garamond", Georgia, serif;
                    font-size: clamp(38px, 4.5vw, 58px);
                    font-weight: 800;
                    line-height: 1.03;
                    letter-spacing: -1px;
                }

                .start-journey-description {
                    max-width: 850px;
                    margin: 0 auto;

                    color: #626856;

                    font-size: 16px;
                    line-height: 1.8;
                }

                .start-journey-features {
                    width: 100%;
                    margin: 42px auto 38px;

                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));

                    border: 1px solid #dfe5da;
                    border-radius: 20px;

                    background: #ffffff;
                    overflow: hidden;
                }

                .start-journey-feature {
                    min-width: 0;
                    min-height: 110px;

                    padding: 20px 16px;

                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;

                    color: #33371b;

                    font-size: 14px;
                    font-weight: 700;
                    line-height: 1.35;
                    text-align: center;

                    border-right: 1px solid #e1e6dc;

                    transition:
                        background-color 0.25s ease,
                        transform 0.25s ease;
                }

                .start-journey-feature:last-child {
                    border-right: none;
                }

                .start-journey-feature:hover {
                    background: #f5f7f1;
                }

                .start-journey-feature-icon {
                    width: 36px;
                    height: 36px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 1px solid #d5ddce;
                    border-radius: 10px;

                    background: #f2f4ed;
                    color: #596443;
                }

                .start-journey-feature-icon svg {
                    width: 18px;
                    height: 18px;
                    stroke-width: 1.8;
                }

                .start-journey-actions {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .start-journey-primary,
                .start-journey-secondary {
                    min-height: 54px;
                    padding: 0 26px;

                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;

                    border-radius: 14px;

                    font-family: "Manrope", sans-serif;
                    font-size: 14px;
                    font-weight: 700;

                    cursor: pointer;

                    transition:
                        background-color 0.25s ease,
                        border-color 0.25s ease,
                        color 0.25s ease,
                        transform 0.25s ease,
                        box-shadow 0.25s ease;
                }

                .start-journey-primary {
                    border: 1px solid #33371b;
                    background: #33371b;
                    color: #ffffff;

                    box-shadow:
                        0 10px 25px rgba(51, 55, 27, 0.15);
                }

                .start-journey-secondary {
                    border: 1px solid #cfd6c8;
                    background: #ffffff;
                    color: #33371b;
                }

                .start-journey-primary svg,
                .start-journey-secondary svg {
                    width: 16px;
                    height: 16px;
                }

                .start-journey-primary:hover {
                    background: #454b24;
                    border-color: #454b24;
                    transform: translateY(-3px);

                    box-shadow:
                        0 14px 28px rgba(51, 55, 27, 0.2);
                }

                .start-journey-secondary:hover {
                    background: #f3f5ef;
                    border-color: #aab49d;
                    transform: translateY(-3px);
                }

                .start-journey-note {
                    margin-top: 22px;

                    color: #89917d;

                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                @media (max-width: 1100px) {
                    .start-journey {
                        padding: 80px 0;
                    }

                    .start-journey-card {
                        padding: 55px 40px;
                    }

                    .start-journey-features {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .start-journey-feature:nth-child(2) {
                        border-right: none;
                    }

                    .start-journey-feature:nth-child(-n + 2) {
                        border-bottom: 1px solid #e1e6dc;
                    }
                }

                @media (max-width: 768px) {
                    .start-journey {
                        padding: 65px 0;
                    }

                    .start-journey-container {
                        width: 100%;
                        max-width: 100%;
                    }

                    .start-journey-card {
                        padding: 38px 24px;
                        border-radius: 24px;
                    }

                    .start-journey-content {
                        max-width: 100%;
                        text-align: left;
                    }

                    .start-journey-badge {
                        margin-bottom: 17px;
                        padding: 8px 13px;
                        font-size: 10px;
                    }

                    .start-journey-title {
                        max-width: 100%;
                        margin: 0 0 16px;

                        font-size: clamp(34px, 9vw, 46px);
                        line-height: 1.05;

                        text-align: left;
                    }

                    .start-journey-description {
                        max-width: 100%;
                        margin: 0;

                        font-size: 15px;
                        line-height: 1.7;

                        text-align: left;
                    }

                    .start-journey-features {
                        margin: 30px 0 28px;
                        border-radius: 18px;
                    }

                    .start-journey-feature {
                        min-height: 95px;
                        padding: 16px 14px;

                        align-items: flex-start;
                        text-align: left;
                    }

                    .start-journey-feature-icon {
                        width: 32px;
                        height: 32px;
                    }

                    .start-journey-feature-icon svg {
                        width: 16px;
                        height: 16px;
                    }

                    .start-journey-actions {
                        width: 100%;
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .start-journey-primary,
                    .start-journey-secondary {
                        width: 100%;
                        min-height: 52px;
                    }

                    .start-journey-note {
                        line-height: 1.5;
                        text-align: left;
                    }
                }

                @media (max-width: 480px) {
                    .start-journey {
                        padding: 55px 0;
                    }

                    .start-journey-card {
                        padding: 30px 18px;
                        border-radius: 20px;
                    }

                    .start-journey-title {
                        font-size: 32px;
                        letter-spacing: -0.5px;
                    }

                    .start-journey-description {
                        font-size: 14px;
                    }

                    .start-journey-features {
                        margin-top: 26px;
                        margin-bottom: 24px;
                    }

                    .start-journey-feature {
                        min-height: 88px;
                        padding: 13px 11px;

                        font-size: 12px;
                    }

                    .start-journey-feature-icon {
                        width: 30px;
                        height: 30px;
                    }

                    .start-journey-note {
                        font-size: 9px;
                    }
                }

                @media (max-width: 360px) {
                    .start-journey-container {
                        padding-left: 12px;
                        padding-right: 12px;
                    }

                    .start-journey-card {
                        padding: 26px 15px;
                    }

                    .start-journey-features {
                        grid-template-columns: 1fr;
                    }

                    .start-journey-feature {
                        min-height: 68px;

                        flex-direction: row;
                        align-items: center;
                        gap: 10px;
                    }

                    .start-journey-feature:nth-child(2) {
                        border-right: none;
                    }

                    .start-journey-feature:nth-child(3) {
                        border-bottom: 1px solid #e1e6dc;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .start-journey-primary,
                    .start-journey-secondary,
                    .start-journey-feature {
                        transition: none;
                    }
                }
            `}</style>

            <section className="start-journey">
                <div className="start-journey-container">
                    <div className="start-journey-card">
                        <div className="start-journey-content">

                            <div className="start-journey-badge">
                                <span className="start-journey-dot" />
                                Explore What You Need
                            </div>

                            <h2 className="start-journey-title">
                                Find Products for Every Need
                            </h2>

                            <p className="start-journey-description">
                                Shop from a flexible catalogue of clothing, electronics,
                                home essentials, accessories and more. Explore
                                available categories and order the products
                                that suit you.
                            </p>

                            <div className="start-journey-features">
                                <div className="start-journey-feature">
                                    <span className="start-journey-feature-icon">
                                        <Sprout />
                                    </span>
                                    <span>Wide Selection</span>
                                </div>

                                <div className="start-journey-feature">
                                    <span className="start-journey-feature-icon">
                                        <Truck />
                                    </span>
                                    <span>Planned Delivery</span>
                                </div>

                                <div className="start-journey-feature">
                                    <span className="start-journey-feature-icon">
                                        <Leaf />
                                    </span>
                                    <span>Product Options</span>
                                </div>

                                <div className="start-journey-feature">
                                    <span className="start-journey-feature-icon">
                                        <ShieldCheck />
                                    </span>
                                    <span>Quality You Trust</span>
                                </div>
                            </div>

                            <div className="start-journey-actions">
                                <button
                                    type="button"
                                    className="start-journey-primary"
                                    onClick={scrollToCatalogue}
                                >
                                    Shop Products
                                    <ArrowRight />
                                </button>

                                <button
                                    type="button"
                                    className="start-journey-secondary"
                                    onClick={scrollToCatalogue}
                                >
                                    Browse Categories
                                    <ArrowRight />
                                </button>
                            </div>

                            <div className="start-journey-note">
                                Easy ordering · Product-specific delivery · Helpful support
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default StartJourney;