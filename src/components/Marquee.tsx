import React from "react";
import { FaCheck } from "react-icons/fa";

const Marquee: React.FC = () => {
    const marqueeText = "Browse products across categories · Easy shopping · Delivery estimates by product.";

    return (
        <>
            <style>{`
                .fssai-marquee,
                .fssai-marquee * {
                    box-sizing: border-box;
                }

                .fssai-marquee {
                    --marquee-olive: #33371b;
                    --marquee-olive-soft: #eef0e6;
                    --marquee-ink: #242815;
                    width: 100%;
                    overflow: hidden;
                    padding: 15px 0;
                    border-top: 1px solid rgba(51, 55, 27, 0.28);
                    border-bottom: 1px solid rgba(51, 55, 27, 0.28);
                    background: var(--marquee-olive-soft);
                    font-family: "EB Garamond", Georgia, serif;
                    mask-image: linear-gradient(
                        90deg,
                        transparent 0,
                        #000 28px,
                        #000 calc(100% - 28px),
                        transparent 100%
                    );
                    -webkit-mask-image: linear-gradient(
                        90deg,
                        transparent 0,
                        #000 28px,
                        #000 calc(100% - 28px),
                        transparent 100%
                    );
                }

                .fssai-marquee-track {
                    width: max-content;
                    display: flex;
                    align-items: center;
                    will-change: transform;
                    animation: fssaiMarqueeScroll 36s linear infinite;
                }

                .fssai-marquee:hover .fssai-marquee-track {
                    animation-play-state: paused;
                }

                .fssai-marquee-item {
                    flex: 0 0 auto;
                    margin-right: 64px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    color: var(--marquee-ink);
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.3;
                    white-space: nowrap;
                }

                .fssai-marquee-item svg {
                    flex: 0 0 auto;
                    color: var(--marquee-olive);
                    font-size: 18px;
                    filter: drop-shadow(0 2px 3px rgba(51, 55, 27, 0.18));
                }

                @keyframes fssaiMarqueeScroll {
                    from {
                        transform: translate3d(0, 0, 0);
                    }

                    to {
                        transform: translate3d(-50%, 0, 0);
                    }
                }

                @media (max-width: 768px) {
                    .fssai-marquee {
                        padding: 13px 0;
                        border: 1px solid rgba(51, 55, 27, 0.35);
                        border-radius: 14px;
                        mask-image: linear-gradient(
                            90deg,
                            transparent 0,
                            #000 18px,
                            #000 calc(100% - 18px),
                            transparent 100%
                        );
                        -webkit-mask-image: linear-gradient(
                            90deg,
                            transparent 0,
                            #000 18px,
                            #000 calc(100% - 18px),
                            transparent 100%
                        );
                    }

                    .fssai-marquee-track {
                        animation-duration: 34s;
                    }

                    .fssai-marquee-item {
                        margin-right: 44px;
                        gap: 9px;
                        font-size: 14px;
                    }

                    .fssai-marquee-item svg {
                        font-size: 16px;
                    }
                }

                @media (max-width: 480px) {
                    .fssai-marquee {
                        padding: 11px 0;
                        border-radius: 12px;
                    }

                    .fssai-marquee-track {
                        animation-duration: 32s;
                    }

                    .fssai-marquee-item {
                        margin-right: 30px;
                        gap: 8px;
                        font-size: 13px;
                    }

                    .fssai-marquee-item svg {
                        font-size: 14px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .fssai-marquee {
                        mask-image: none;
                        -webkit-mask-image: none;
                    }

                    .fssai-marquee-track {
                        width: 100%;
                        animation: none;
                    }

                    .fssai-marquee-item {
                        display: none;
                    }

                    .fssai-marquee-item:first-child {
                        width: 100%;
                        margin: 0;
                        padding: 0 14px;
                        display: flex;
                        justify-content: center;
                        white-space: normal;
                        text-align: center;
                    }
                }
            `}</style>

            <section className="fssai-marquee" aria-label={marqueeText}>
                <div className="fssai-marquee-track" aria-hidden="true">
                    {[...Array(16)].map((_, index) => (
                        <div className="fssai-marquee-item" key={index}>
                            <FaCheck />
                            <span>{marqueeText}</span>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
};

export default Marquee;
