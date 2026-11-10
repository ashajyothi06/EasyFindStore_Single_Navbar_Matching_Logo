import React from "react";
import {
    Leaf,
    HeartPulse,
    ShieldCheck,
    Truck,
    Sparkles,
} from "lucide-react";


const whyChooseItems = [
    {
        id: 1,
        icon: Leaf,
        title: "A Wide Product Range",
        description:
            "Explore categories ranging from everyday essentials to specialty products.",
    },
    {
        id: 2,
        icon: HeartPulse,
        title: "Easy Shopping",
        description:
            "Browse products, compare details, and place orders with a straightforward checkout.",
    },
    {
        id: 3,
        icon: ShieldCheck,
        title: "Quality You Can Trust",
        description:
            "We present clear product information and work to keep orders carefully handled.",
    },
    {
        id: 4,
        icon: Truck,
        title: "Delivery You Can Plan",
        description:
            "Check product-specific delivery timelines and available service areas before placing an order.",
    },
];

const WhyChoose: React.FC = () => {
    return (
        <>
            <style>{`
                .fruveto-why,
                .fruveto-why * {
                    box-sizing: border-box;
                }

                .fruveto-why {
                    --why-olive: #33371b;
                    --why-olive-hover: #454b24;
                    --why-olive-soft: #eef0e6;
                    --why-ink: #242815;
                    --why-muted: #626856;
                    --why-border: #dedfd4;

                    width: 100%;
                    max-width: 100%;
                    min-width: 0;

                    margin: 0;
                    /*
                     * IMPORTANT:
                     * Horizontal page alignment is already provided by the
                     * HomePage/header wrapper. Do not add another page gutter
                     * here or the section becomes double-indented.
                     */
                    padding-top: clamp(36px, 4vw, 56px);
                    padding-right: 0;
                    padding-bottom: clamp(36px, 4vw, 56px);
                    padding-left: 0;

                    overflow: hidden;

                    background: #f7f7f2;

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;
                }

                .fruveto-why-container {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    margin: 0;
                    padding: 0;
                }

                /*
                 * Keep every major block on the exact same left/right edge.
                 * No nested page gutter is added inside this component.
                 */
                .fruveto-why-header,
                .fruveto-why-grid,
                .fruveto-why-bottom {
                    margin-left: 0;
                    margin-right: 0;
                }

                .fruveto-why-header {
                    width: 100%;
                    max-width: 100%;
                    margin: 0 0 clamp(28px, 4vw, 40px);
                    text-align: center;
                }

                .fruveto-why-eyebrow {
                    margin: 0 0 12px;

                    color: var(--why-olive);

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    line-height: 1.3;
                    text-transform: uppercase;
                }

                .fruveto-why-title {
                    max-width: 900px;
                    margin: 0 auto 13px;

                    color: var(--why-ink);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: clamp(34px, 4vw, 48px);
                    font-weight: 800;
                    line-height: 1.08;
                    letter-spacing: -0.8px;
                }

                .fruveto-why-title span {
                    color: var(--why-olive);
                }

                .fruveto-why-description {
                    max-width: 650px;
                    margin: 0 auto;

                    color: var(--why-muted);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: 17px;
                    line-height: 1.7;
                }

                .fruveto-why-grid {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;

                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: clamp(14px, 2vw, 24px);
                }

                .fruveto-why-card {
                    position: relative;

                    width: 100%;
                    min-width: 0;
                    min-height: 280px;

                    padding:
                        clamp(24px, 2.5vw, 32px)
                        clamp(20px, 2vw, 28px);

                    display: flex;
                    flex-direction: column;
                    align-items: center;

                    border: 1px solid #dedfd4;
                    border-radius: 18px;

                    background: #ffffff;

                    text-align: center;

                    box-shadow:
                        0 10px 30px
                        rgba(51, 55, 27, 0.07);

                    transition:
                        border-color 0.3s ease,
                        box-shadow 0.3s ease,
                        transform 0.3s ease;
                }

                .fruveto-why-card:hover {
                    border-color: rgba(51, 55, 27, 0.35);

                    box-shadow:
                        0 14px 32px
                        rgba(51, 55, 27, 0.13);

                    transform: translateY(-5px);
                }

                .fruveto-why-number {
                    position: absolute;
                    top: 17px;
                    right: 19px;

                    color: #d8dacd;

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1px;
                }

                .fruveto-why-icon {
                    width: 62px;
                    height: 62px;

                    margin: 8px 0 18px;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;

                    border: 1px solid rgba(51, 55, 27, 0.18);
                    border-radius: 17px;

                    background: var(--why-olive-soft);
                    color: var(--why-olive);

                    transition:
                        background-color 0.3s ease,
                        color 0.3s ease,
                        border-color 0.3s ease,
                        transform 0.3s ease;
                }

                .fruveto-why-card:hover .fruveto-why-icon {
                    border-color: var(--why-olive);
                    background: var(--why-olive);
                    color: #ffffff;
                    transform: translateY(-2px);
                }

                .fruveto-why-content {
                    width: 100%;
                    min-width: 0;
                }

                .fruveto-why-card h3 {
                    margin: 0 0 9px;

                    color: var(--why-ink);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: clamp(20px, 1.7vw, 24px);
                    font-weight: 800;
                    line-height: 1.2;
                    letter-spacing: -0.3px;
                }

                .fruveto-why-card p {
                    margin: 0;

                    color: var(--why-muted);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: 15px;
                    line-height: 1.65;
                }

                .fruveto-why-bottom {
                    width: 100%;
                    min-width: 0;

                    display: grid;
                    grid-template-columns:
                        minmax(0, 1.15fr)
                        minmax(300px, 0.85fr);

                    gap: clamp(14px, 2vw, 24px);

                    margin-top: clamp(24px, 3vw, 36px);
                }

                .fruveto-why-story {
                    min-width: 0;
                    min-height: 190px;

                    padding: clamp(24px, 3vw, 38px);

                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: flex-start;

                    border: 1px solid var(--why-olive);
                    border-radius: 18px;

                    background: var(--why-olive);
                    color: #ffffff;

                    text-align: left;
                }

                .fruveto-why-story-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    margin-bottom: 14px;

                    color: #dfe5cf;

                    font-family:
                        "Manrope",
                        Arial,
                        sans-serif;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.7px;
                    text-transform: uppercase;
                }

                .fruveto-why-story h3 {
                    max-width: 620px;
                    margin: 0;

                    color: #ffffff;

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: clamp(26px, 3vw, 38px);
                    font-weight: 800;
                    line-height: 1.1;
                    letter-spacing: -0.6px;
                }

                .fruveto-why-story h3 span {
                    color: #dfe5cf;
                }

                .fruveto-why-fssai {
                    min-width: 0;
                    min-height: 190px;

                    padding: clamp(22px, 3vw, 30px);

                    display: grid;
                    grid-template-columns: 78px minmax(0, 1fr);
                    align-items: center;
                    gap: 20px;

                    border: 1px solid var(--why-border);
                    border-radius: 18px;

                    background: #ffffff;

                    text-align: left;
                }

                .fruveto-why-fssai img {
                    display: block;

                    width: 78px;
                    height: auto;
                    max-width: 100%;

                    object-fit: contain;
                }

                .fruveto-why-fssai h3 {
                    margin: 0 0 7px;

                    color: var(--why-olive);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: 22px;
                    font-weight: 800;
                    line-height: 1.2;
                }

                .fruveto-why-fssai p {
                    margin: 0;

                    color: var(--why-muted);

                    font-family:
                        "EB Garamond",
                        Georgia,
                        serif;

                    font-size: 14px;
                    line-height: 1.6;
                }

                @media (max-width: 1100px) {
                    .fruveto-why-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .fruveto-why-card {
                        min-height: 265px;
                    }
                }

                @media (max-width: 800px) {
                    .fruveto-why-bottom {
                        grid-template-columns: minmax(0, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .fruveto-why {
                        padding: 32px 0;
                    }

                    .fruveto-why-header {
                        margin-bottom: 30px;
                        text-align: left;
                    }

                    .fruveto-why-eyebrow {
                        font-size: 11px;
                        letter-spacing: 1.5px;
                    }

                    .fruveto-why-title {
                        max-width: 100%;
                        margin-left: 0;
                        margin-right: 0;

                        font-size: clamp(30px, 8vw, 38px);
                        letter-spacing: -0.5px;
                    }

                    .fruveto-why-description {
                        max-width: 100%;
                        margin-left: 0;
                        margin-right: 0;

                        font-size: 16px;
                        line-height: 1.6;
                    }

                    .fruveto-why-grid {
                        grid-template-columns: minmax(0, 1fr);
                        gap: 13px;
                    }

                    .fruveto-why-card {
                        min-height: 0;

                        padding: 24px 20px;

                        align-items: flex-start;

                        border-radius: 15px;

                        text-align: left;
                    }

                    .fruveto-why-number {
                        top: 15px;
                        right: 17px;
                    }

                    .fruveto-why-icon {
                        width: 58px;
                        height: 58px;

                        margin: 5px 0 15px;

                        border-radius: 15px;
                    }

                    .fruveto-why-card h3 {
                        margin-bottom: 8px;
                        font-size: 21px;
                    }

                    .fruveto-why-card p {
                        font-size: 14px;
                        line-height: 1.6;
                    }

                    .fruveto-why-story {
                        min-height: 175px;

                        padding: 26px 22px;

                        border-radius: 15px;

                        text-align: left;
                    }

                    .fruveto-why-story h3 {
                        font-size: 29px;
                    }

                    .fruveto-why-fssai {
                        min-height: 150px;

                        padding: 20px;

                        grid-template-columns:
                            65px
                            minmax(0, 1fr);

                        align-items: center;
                        gap: 15px;

                        border-radius: 15px;
                    }

                    .fruveto-why-fssai img {
                        width: 65px;
                    }

                    .fruveto-why-fssai h3 {
                        font-size: 20px;
                    }

                    .fruveto-why-fssai p {
                        font-size: 13px;
                    }
                }

                @media (max-width: 420px) {
                    .fruveto-why {
                        padding: 27px 0;
                    }

                    .fruveto-why-title {
                        font-size: 31px;
                    }

                    .fruveto-why-description {
                        font-size: 15px;
                    }

                    .fruveto-why-card {
                        padding: 21px 17px;
                    }

                    .fruveto-why-icon {
                        width: 54px;
                        height: 54px;
                        margin-bottom: 14px;
                    }

                    .fruveto-why-card h3 {
                        font-size: 20px;
                    }

                    .fruveto-why-card p {
                        font-size: 13px;
                    }

                    .fruveto-why-story {
                        padding: 23px 19px;
                    }

                    .fruveto-why-story h3 {
                        font-size: 26px;
                    }

                    .fruveto-why-fssai {
                        padding: 17px;

                        grid-template-columns:
                            56px
                            minmax(0, 1fr);

                        gap: 12px;
                    }

                    .fruveto-why-fssai img {
                        width: 56px;
                    }

                    .fruveto-why-fssai h3 {
                        font-size: 18px;
                    }

                    .fruveto-why-fssai p {
                        font-size: 12px;
                    }
                }

                @media (max-width: 340px) {
                    .fruveto-why-card {
                        padding-left: 15px;
                        padding-right: 15px;
                    }

                    .fruveto-why-story {
                        padding-left: 16px;
                        padding-right: 16px;
                    }

                    .fruveto-why-fssai {
                        padding-left: 14px;
                        padding-right: 14px;
                    }
                }

                @media (hover: none) and (pointer: coarse) {
                    .fruveto-why-card:hover {
                        transform: none;
                    }

                    .fruveto-why-card:hover .fruveto-why-icon {
                        transform: none;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .fruveto-why-card,
                    .fruveto-why-icon {
                        transition: none;
                    }
                }
            `}</style>

            <section className="fruveto-why">
                <div className="fruveto-why-container">
                    <div className="fruveto-why-header">
                        <p className="fruveto-why-eyebrow">
                            THE FRUVETO DIFFERENCE
                        </p>

                        <h2 className="fruveto-why-title">
                            Fresh choices.
                            <span> Better living.</span>
                        </h2>

                        <p className="fruveto-why-description">
                            From carefully selected ingredients to thoughtful
                            preparation and delivery, we make fresh and
                            nutritious choices a simple part of your everyday
                            routine.
                        </p>
                    </div>

                    <div className="fruveto-why-grid">
                        {whyChooseItems.map((item, index) => {
                            const Icon = item.icon;

                            return (
                                <article
                                    className="fruveto-why-card"
                                    key={item.id}
                                >
                                    <span className="fruveto-why-number">
                                        0{index + 1}
                                    </span>

                                    <div className="fruveto-why-icon">
                                        <Icon
                                            size={27}
                                            strokeWidth={1.8}
                                        />
                                    </div>

                                    <div className="fruveto-why-content">
                                        <h3>{item.title}</h3>
                                        <p>{item.description}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="fruveto-why-bottom">
                        <div className="fruveto-why-story">
                            <div className="fruveto-why-story-top">
                                <Sparkles size={15} />
                                Why Fruveto
                            </div>

                            <h3>
                                Great shopping starts with{" "}
                                <span>clear choices.</span>
                            </h3>
                        </div>

                        <div className="fruveto-why-fssai">
                            <ShieldCheck size={38} aria-hidden="true" />

                            <div>
                                <h3>Quality You Can Trust</h3>

                                <p>
                                    Browse product details, check delivery
                                    estimates and get support for your orders.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default WhyChoose;
