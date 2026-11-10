import React, { useEffect, useState } from "react";

type DeliverySlot = {
    id: number | string;
    label: string;
    type: "morning" | "night" | "neutral" | string;
    icon: string;
    time: string;
    start_time?: string;
    end_time?: string;
};

type DeliveryTimingsResponse = {
    success: boolean;
    title?: string;
    description?: string;
    slots?: DeliverySlot[];
};

const DeliveryTimings: React.FC = () => {
    const [data, setData] = useState<DeliveryTimingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch("/react/api/homepage/delivery-timings", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(
                        `Unable to load delivery timings (${response.status}).`,
                    );
                }
                return (await response.json()) as DeliveryTimingsResponse;
            })
            .then((payload) => {
                if (!payload.success) {
                    throw new Error("Unable to load delivery timings.");
                }
                setData(payload);
            })
            .catch((requestError: unknown) => {
                if (
                    requestError instanceof DOMException &&
                    requestError.name === "AbortError"
                ) {
                    return;
                }
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Unable to load delivery timings.",
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, []);

    const slots = data?.slots || [];

    return (
        <>
            <style>{`
                .delivery-timings-section,
                .delivery-timings-section * {
                    box-sizing: border-box;
                }

                .delivery-timings-section {
                    --timing-olive: #33371b;
                    --timing-olive-hover: #454b24;
                    --timing-olive-soft: #eef0e6;
                    --timing-ink: #242815;
                    width: 100%;
                    overflow: hidden;
                    padding: clamp(36px, 4vw, 56px) clamp(18px, 3vw, 40px);
                    border: 1px solid #dedfd4;
                    border-radius: 24px;
                    background: #f7f7f2;
                    box-shadow: 0 18px 55px rgba(51, 55, 27, 0.07);
                    font-family: "EB Garamond", Georgia, serif;
                }

                .delivery-timings-container {
                    width: 100%;
                    min-width: 0;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                }

                .delivery-timings-container h2 {
                    margin: 0 0 13px;
                    color: var(--timing-ink);
                    font-size: clamp(34px, 4vw, 48px);
                    font-weight: 800;
                    line-height: 1.08;
                }

                .delivery-timings-container > p {
                    max-width: 650px;
                    margin: 0 auto clamp(28px, 4vw, 40px);
                    color: #626856;
                    font-size: 17px;
                    line-height: 1.7;
                }

                .delivery-timings-list {
                    width: 100%;
                    max-width: 820px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: clamp(14px, 2vw, 24px);
                }

                .delivery-timing-card {
                    width: 100%;
                    min-width: 0;
                    min-height: 68px;
                    padding: 14px 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    border: 1px solid transparent;
                    border-radius: 18px;
                    transition:
                        background-color 0.3s ease,
                        border-color 0.3s ease,
                        color 0.3s ease,
                        box-shadow 0.3s ease,
                        transform 0.3s ease;
                }

                .delivery-timing-card--morning {
                    border-color: rgba(51, 55, 27, 0.22);
                    background: var(--timing-olive-soft);
                    color: var(--timing-olive);
                    box-shadow: inset 0 -2px 0 rgba(51, 55, 27, 0.14);
                }

                .delivery-timing-card--night {
                    border-color: var(--timing-olive);
                    background: var(--timing-olive);
                    color: #ffffff;
                    box-shadow: inset 0 -3px 0 var(--timing-olive-hover);
                }

                .delivery-timing-card--neutral {
                    border-color: #dedfd4;
                    background: #ffffff;
                    color: var(--timing-ink);
                    box-shadow: inset 0 -2px 0 rgba(51, 55, 27, 0.1);
                }

                .delivery-timing-icon {
                    flex: 0 0 auto;
                    width: 30px;
                    height: 30px;
                    object-fit: contain;
                }

                .delivery-timing-fallback-icon {
                    flex: 0 0 auto;
                    display: grid;
                    place-items: center;
                    width: 30px;
                    height: 30px;
                    font: 700 22px/1 Arial, sans-serif;
                }

                .delivery-timing-content {
                    min-width: 0;
                    display: grid;
                    gap: 1px;
                    text-align: left;
                }

                .delivery-timing-label {
                    opacity: 0.75;
                    font-size: 13px;
                    font-weight: 700;
                    line-height: 1.2;
                }

                .delivery-timing-time {
                    min-width: 0;
                    font-size: 20px;
                    font-weight: 700;
                    line-height: 1.25;
                    overflow-wrap: anywhere;
                }

                .delivery-timings-state {
                    grid-column: 1 / -1;
                    margin: 0;
                    padding: 18px;
                    border: 1px solid #dedfd4;
                    border-radius: 14px;
                    background: var(--timing-olive-soft);
                    color: #565b49;
                    text-align: center;
                }

                .delivery-timings-state.error {
                    border-color: #f1b1ae;
                    background: #fff5f5;
                    color: #9a241f;
                }

                @media (hover: hover) and (pointer: fine) {
                    .delivery-timing-card:hover {
                        box-shadow: 0 14px 30px rgba(51, 55, 27, 0.18);
                        transform: translateY(-5px);
                    }

                    .delivery-timing-card--morning:hover {
                        border-color: var(--timing-olive);
                        background: var(--timing-olive);
                        color: #ffffff;
                    }

                    .delivery-timing-card--night:hover {
                        border-color: var(--timing-olive-hover);
                        background: var(--timing-olive-hover);
                    }

                    .delivery-timing-card--neutral:hover {
                        border-color: var(--timing-olive);
                        color: var(--timing-olive);
                        box-shadow:
                            inset 0 -3px 0 var(--timing-olive),
                            0 14px 30px rgba(51, 55, 27, 0.12);
                    }
                }

                @media (max-width: 768px) {
                    .delivery-timings-section {
                        padding: 32px 16px;
                        border-radius: 20px;
                    }

                    .delivery-timings-container {
                        text-align: left;
                    }

                    .delivery-timings-container h2 {
                        font-size: clamp(30px, 8vw, 38px);
                    }

                    .delivery-timings-container > p {
                        max-width: 100%;
                        margin: 0 0 28px;
                        font-size: 16px;
                        line-height: 1.6;
                    }

                    .delivery-timings-list {
                        max-width: none;
                        gap: 13px;
                    }

                    .delivery-timing-card {
                        min-height: 62px;
                        padding: 13px 16px;
                        justify-content: flex-start;
                        border-radius: 15px;
                    }

                    .delivery-timing-icon,
                    .delivery-timing-fallback-icon {
                        width: 27px;
                        height: 27px;
                    }

                    .delivery-timing-time {
                        font-size: 18px;
                    }
                }

                @media (max-width: 600px) {
                    .delivery-timings-list {
                        grid-template-columns: minmax(0, 1fr);
                    }

                    .delivery-timing-card {
                        width: 100%;
                    }
                }

                @media (max-width: 420px) {
                    .delivery-timings-section {
                        padding: 27px 14px;
                    }

                    .delivery-timings-container > p {
                        margin-bottom: 24px;
                        font-size: 15px;
                    }

                    .delivery-timing-card {
                        min-height: 58px;
                        padding: 12px 14px;
                    }

                    .delivery-timing-icon,
                    .delivery-timing-fallback-icon {
                        width: 24px;
                        height: 24px;
                    }

                    .delivery-timing-time {
                        font-size: 17px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .delivery-timing-card {
                        transition: none;
                    }
                }
            `}</style>

            <section className="delivery-timings-section">
                <div className="delivery-timings-container">
                    <h2>{data?.title || "Delivery Slot Timings"}</h2>
                    <p>
                        {data?.description ||
                            "Choose a convenient delivery time for your order."}
                    </p>

                    <div className="delivery-timings-list" aria-live="polite">
                        {loading ? (
                            <p className="delivery-timings-state">
                                Loading delivery timings…
                            </p>
                        ) : error ? (
                            <p className="delivery-timings-state error">{error}</p>
                        ) : slots.length === 0 ? (
                            <p className="delivery-timings-state">
                                Delivery timings will be updated soon.
                            </p>
                        ) : (
                            slots.map((slot) => {
                                const slotStyle = [
                                    "morning",
                                    "night",
                                    "neutral",
                                ].includes(slot.type)
                                    ? slot.type
                                    : "neutral";

                                return (
                                    <div
                                        key={slot.id}
                                        className={`delivery-timing-card delivery-timing-card--${slotStyle}`}
                                    >
                                        {slot.icon ? (
                                            <img
                                                src={slot.icon}
                                                alt=""
                                                aria-hidden="true"
                                                className="delivery-timing-icon"
                                            />
                                        ) : (
                                            <span
                                                className="delivery-timing-fallback-icon"
                                                aria-hidden="true"
                                            >
                                                {slotStyle === "night" ? "☾" : "☀"}
                                            </span>
                                        )}
                                        <span className="delivery-timing-content">
                                            <span className="delivery-timing-label">
                                                {slot.label}
                                            </span>
                                            <span className="delivery-timing-time">
                                                {slot.time}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};

export default DeliveryTimings;
