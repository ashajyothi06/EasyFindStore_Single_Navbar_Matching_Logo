import React from "react";
import {
    Sun,
    Moon,
    Clock3,
    Truck,
    Leaf,
} from "lucide-react";

type DeliverySlot = {
    id: number;
    label: string;
    time: string;
    type: "morning" | "night" | "neutral";
    icon: React.ReactNode;
};

const DELIVERY_SLOTS: DeliverySlot[] = [
    {
        id: 1,
        label: "Morning Delivery",
        time: "7:00 AM – 10:00 AM",
        type: "morning",
        icon: <Sun />,
    },
    {
        id: 2,
        label: "Midday Delivery",
        time: "11:00 AM – 2:00 PM",
        type: "neutral",
        icon: <Clock3 />,
    },
    {
        id: 3,
        label: "Evening Delivery",
        time: "4:00 PM – 7:00 PM",
        type: "neutral",
        icon: <Truck />,
    },
    {
        id: 4,
        label: "Night Delivery",
        time: "7:00 PM – 9:00 PM",
        type: "night",
        icon: <Moon />,
    },
];

const DeliveryTimingsNew: React.FC = () => {
    return (
        <>
            <style>{`
                .delivery-new,
                .delivery-new * {
                    box-sizing: border-box;
                }

                .delivery-new {
                    width: 100%;
                    padding: 80px 0;
                    overflow: hidden;
                    font-family: "EB Garamond", Georgia, serif;
                }

                .delivery-new-container {
                    width: 100%;
                    max-width: 1800px;
                    margin: 0 auto;
                }

                .delivery-new-header {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto 50px;
                    text-align: center;
                }

                .delivery-new-label {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    margin-bottom: 18px;
                    padding: 8px 14px;

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

                .delivery-new-label-dot {
                    width: 7px;
                    height: 7px;
                    flex-shrink: 0;

                    border-radius: 50%;
                    background: #718141;
                }

                .delivery-new-title {
                    max-width: 900px;
                    margin: 0 auto 17px;

                    color: #242815;

                    font-family: "EB Garamond", Georgia, serif;
                    font-size: clamp(38px, 4.5vw, 58px);
                    font-weight: 800;
                    line-height: 1.04;
                    letter-spacing: -1px;
                }

                .delivery-new-description {
                    max-width: 720px;
                    margin: 0 auto;

                    color: #626856;

                    font-size: 16px;
                    line-height: 1.75;
                }

                .delivery-new-grid {
                    width: 100%;

                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 18px;
                }

                .delivery-new-slot {
                    width: 100%;
                    min-width: 0;
                    min-height: 165px;

                    padding: 28px 24px;

                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    gap: 24px;

                    border: 1px solid #d5ddce;
                    border-radius: 20px;

                    background: #ffffff;

                    transition:
                        transform 0.3s ease,
                        border-color 0.3s ease,
                        background-color 0.3s ease,
                        box-shadow 0.3s ease;
                }

                .delivery-new-slot:hover {
                    transform: translateY(-5px);

                    border-color: #9caf91;

                    background: #fbfcf9;

                    box-shadow:
                        0 14px 32px rgba(51, 55, 27, 0.09);
                }

                .delivery-new-slot-icon {
                    width: 44px;
                    height: 44px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 1px solid #d5ddce;
                    border-radius: 12px;

                    background: #f2f4ed;
                    color: #596443;
                }

                .delivery-new-slot-icon svg {
                    width: 20px;
                    height: 20px;
                    stroke-width: 1.8;
                }

                .delivery-new-slot-label {
                    display: block;

                    margin-bottom: 7px;

                    color: #89917d;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .delivery-new-slot-time {
                    display: block;

                    color: #242815;

                    font-family: "EB Garamond", Georgia, serif;
                    font-size: 26px;
                    font-weight: 800;
                    line-height: 1.1;
                }

                .delivery-new-footer {
                    width: 100%;

                    margin-top: 28px;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 16px 20px;
                    text-align: center;
                }

                .delivery-new-footer-text {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    color: #626856;

                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                }

                .delivery-new-footer-text svg {
                    width: 17px;
                    height: 17px;
                    flex-shrink: 0;
                    color: #718141;
                }

                .delivery-new-note {
                    display: inline-block;

                    color: #89917d;

                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    text-align: center;
                }

                @media (max-width: 1200px) {
                    .delivery-new-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 16px;
                    }

                    .delivery-new-slot {
                        min-height: 150px;
                    }
                }

                @media (max-width: 768px) {
                    .delivery-new {
                        padding: 60px 0;
                    }

                    .delivery-new-header {
                        max-width: 100%;
                        margin: 0 0 34px;

                        text-align: left;
                    }

                    .delivery-new-label {
                        justify-content: flex-start;

                        margin-bottom: 17px;
                        padding: 8px 13px;

                        font-size: 10px;
                    }

                    .delivery-new-title {
                        max-width: 100%;
                        margin: 0 0 15px;

                        font-size: clamp(34px, 9vw, 46px);
                        line-height: 1.05;

                        text-align: left;
                    }

                    .delivery-new-description {
                        max-width: 100%;
                        margin: 0;

                        font-size: 15px;
                        line-height: 1.7;

                        text-align: left;
                    }

                    .delivery-new-grid {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .delivery-new-slot {
                        min-height: 105px;

                        padding: 20px;

                        flex-direction: row;
                        align-items: center;
                        justify-content: flex-start;

                        gap: 16px;

                        border-radius: 17px;
                    }

                    .delivery-new-slot-icon {
                        width: 40px;
                        height: 40px;
                        flex-shrink: 0;
                    }

                    .delivery-new-slot-icon svg {
                        width: 18px;
                        height: 18px;
                    }

                    .delivery-new-slot-label {
                        margin-bottom: 6px;
                        font-size: 10px;
                    }

                    .delivery-new-slot-time {
                        font-size: 23px;
                    }

                    .delivery-new-footer {
                        align-items: flex-start;
                        flex-direction: column;

                        margin-top: 22px;
                    }
                }

                @media (max-width: 480px) {
                    .delivery-new {
                        padding: 50px 0;
                    }

                    .delivery-new-title {
                        font-size: 32px;
                        letter-spacing: -0.5px;
                    }

                    .delivery-new-description {
                        font-size: 14px;
                    }

                    .delivery-new-grid {
                        gap: 10px;
                    }

                    .delivery-new-slot {
                        min-height: 95px;
                        padding: 16px;
                    }

                    .delivery-new-slot-icon {
                        width: 36px;
                        height: 36px;
                    }

                    .delivery-new-slot-icon svg {
                        width: 17px;
                        height: 17px;
                    }

                    .delivery-new-slot-label {
                        font-size: 9px;
                    }

                    .delivery-new-slot-time {
                        font-size: 20px;
                    }

                    .delivery-new-footer-text {
                        font-size: 12px;
                    }

                    .delivery-new-note {
                        font-size: 9px;
                    }
                }

                @media (max-width: 360px) {
                    

                    .delivery-new-title {
                        font-size: 29px;
                    }

                    .delivery-new-slot {
                        padding: 14px;
                    }

                    .delivery-new-slot-time {
                        font-size: 18px;
                    }
                }
            `}</style>

            <section className="delivery-new">
                <div className="delivery-new-container">

                    <div className="delivery-new-header">
                        <div className="delivery-new-label">
                            <span className="delivery-new-label-dot" />
                            Fresh When You Need It
                        </div>

                        <h2 className="delivery-new-title">
                            Pick a Time That Works for You
                        </h2>

                        <p className="delivery-new-description">
                            We carefully pack every order and deliver it at a
                            convenient time, so your fresh produce reaches you
                            ready to enjoy.
                        </p>
                    </div>

                    <div className="delivery-new-grid">
                        {DELIVERY_SLOTS.map((slot) => (
                            <div
                                key={slot.id}
                                className={`delivery-new-slot delivery-new-slot--${slot.type}`}
                            >
                                <div className="delivery-new-slot-icon">
                                    {slot.icon}
                                </div>

                                <div>
                                    <span className="delivery-new-slot-label">
                                        {slot.label}
                                    </span>

                                    <span className="delivery-new-slot-time">
                                        {slot.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="delivery-new-footer">
                        <div className="delivery-new-footer-text">
                            <Leaf />
                            Freshly packed for every delivery
                        </div>

                        <span className="delivery-new-note">
                            Simple · Fresh · Reliable
                        </span>
                    </div>

                </div>
            </section>
        </>
    );
};

export default DeliveryTimingsNew;