import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

type DeliveryLocation = {
    id: string | number;
    name: string;
    city?: string;
};

type DeliveryLocationsResponse = {
    success: boolean;
    title?: string;
    description?: string;
    locations?: DeliveryLocation[];
};

const DeliveryLocations: React.FC = () => {
    const [data, setData] = useState<DeliveryLocationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch("/react/api/homepage/delivery-locations", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(
                        `Unable to load delivery locations (${response.status}).`,
                    );
                }
                return (await response.json()) as DeliveryLocationsResponse;
            })
            .then((payload) => {
                if (!payload.success) {
                    throw new Error("Unable to load delivery locations.");
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
                        : "Unable to load delivery locations.",
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, []);

    const locations = data?.locations || [];

    return (
        <>
            <style>{`
                .delivery-locations-section,
                .delivery-locations-section * {
                    box-sizing: border-box;
                }

                .delivery-locations-section {
                    --delivery-olive: #33371b;
                    --delivery-olive-hover: #454b24;
                    --delivery-olive-soft: #eef0e6;
                    --delivery-ink: #242815;
                    width: 100%;
                    overflow: hidden;
                    padding: clamp(52px, 6vw, 80px) 0;
                    background: #f7f7f2;
                }

                .delivery-locations-container {
                    width: 100%;
                    min-width: 0;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                }

                .delivery-locations-container h2 {
                    margin: 0 0 12px;
                    color: var(--delivery-ink);
                    font-size: clamp(34px, 4vw, 52px);
                    font-weight: 800;
                    line-height: 1.08;
                }

                .delivery-locations-container > p {
                    max-width: 660px;
                    margin: 0 auto clamp(30px, 4vw, 48px);
                    color: #626856;
                    font-size: 18px;
                    line-height: 1.65;
                }

                .delivery-locations-grid {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: clamp(14px, 1.6vw, 22px);
                }

                .delivery-location-card {
                    min-width: 0;
                    min-height: 62px;
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    border: 1px solid #dedfd4;
                    border-radius: 18px;
                    background: #ffffff;
                    color: var(--delivery-ink);
                    box-shadow:
                        inset 0 -2px 0 rgba(51, 55, 27, 0.1),
                        0 8px 25px rgba(51, 55, 27, 0.07);
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.25;
                    text-align: center;
                    transition:
                        border-color 0.3s ease,
                        box-shadow 0.3s ease,
                        transform 0.3s ease;
                }

                .delivery-location-card svg {
                    flex: 0 0 auto;
                    color: var(--delivery-olive);
                    font-size: 18px;
                    filter: drop-shadow(0 2px 3px rgba(51, 55, 27, 0.16));
                }

                .delivery-location-card span {
                    min-width: 0;
                    overflow-wrap: anywhere;
                }

                .delivery-locations-state {
                    grid-column: 1 / -1;
                    margin: 0;
                    padding: 20px;
                    border: 1px solid #dedfd4;
                    border-radius: 14px;
                    background: var(--delivery-olive-soft);
                    color: #565b49;
                    text-align: center;
                }

                .delivery-locations-state.error {
                    border-color: #f1b1ae;
                    background: #fff5f5;
                    color: #9a241f;
                }

                @media (hover: hover) and (pointer: fine) {
                    .delivery-location-card:hover {
                        border-color: var(--delivery-olive);
                        box-shadow:
                            inset 0 -3px 0 var(--delivery-olive-hover),
                            0 18px 35px rgba(51, 55, 27, 0.15);
                        transform: translateY(-6px);
                    }
                }

                @media (max-width: 1200px) {
                    .delivery-locations-grid {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }
                }

                @media (max-width: 992px) {
                    .delivery-locations-section {
                        padding: 58px 0;
                    }

                    .delivery-locations-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .delivery-locations-section {
                        padding: 44px 0;
                    }

                    .delivery-locations-container {
                        text-align: left;
                    }

                    .delivery-locations-container h2 {
                        font-size: clamp(30px, 8vw, 38px);
                    }

                    .delivery-locations-container > p {
                        max-width: 100%;
                        margin: 0 0 28px;
                        font-size: 16px;
                        line-height: 1.6;
                    }

                    .delivery-locations-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 14px;
                    }

                    .delivery-location-card {
                        min-height: 56px;
                        padding: 10px 13px;
                        justify-content: flex-start;
                        border-radius: 15px;
                        font-size: 15px;
                        text-align: left;
                    }
                }

                @media (max-width: 520px) {
                    .delivery-locations-section {
                        padding: 38px 0;
                    }

                    .delivery-locations-grid {
                        grid-template-columns: minmax(0, 1fr);
                        gap: 11px;
                    }

                    .delivery-location-card {
                        width: 100%;
                        min-height: 54px;
                        padding: 10px 16px;
                    }
                }

                @media (max-width: 380px) {
                    .delivery-locations-section {
                        padding: 32px 0;
                    }

                    .delivery-locations-container h2 {
                        font-size: 29px;
                    }

                    .delivery-locations-container > p {
                        margin-bottom: 24px;
                        font-size: 15px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .delivery-location-card {
                        transition: none;
                    }
                }
            `}</style>

            <section className="delivery-locations-section">
                <div className="delivery-locations-container">
                    <h2>{data?.title || "Delivery Locations"}</h2>
                    <p>
                        {data?.description ||
                            "See the areas where delivery is currently available."}
                    </p>

                    <div className="delivery-locations-grid" aria-live="polite">
                        {loading ? (
                            <p className="delivery-locations-state">
                                Loading delivery locations…
                            </p>
                        ) : error ? (
                            <p className="delivery-locations-state error">{error}</p>
                        ) : locations.length === 0 ? (
                            <p className="delivery-locations-state">
                                Delivery locations will be updated soon.
                            </p>
                        ) : (
                            locations.map((location) => (
                                <div
                                    className="delivery-location-card"
                                    key={location.id}
                                >
                                    <FaMapMarkerAlt aria-hidden="true" />
                                    <span>{location.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};

export default DeliveryLocations;
