import React from "react";
import {
    MapPin,
    Navigation,
    CircleCheck,
} from "lucide-react";

const DELIVERY_AREAS = [
    "Gachibowli",
    "Madhapur",
    "Kondapur",
    "Hitech City",
    "Banjara Hills",
    "Jubilee Hills",
    "Kukatpally",
    "Manikonda",
    "ECIL",
    "Kokapet",
    "Financial District",
    "Begumpet",
    "Secunderabad",
    "Miyapur",
    "Nanakramguda",
    "Mehdipatnam",
];

const DeliveryLocationsNew: React.FC = () => {
    return (
        <>
            <style>{`
                .delivery-locations-new,
                .delivery-locations-new * {
                    box-sizing: border-box;
                }

                .delivery-locations-new {
                    width: 100%;
                    padding: 90px 0;
                    background: #f7f7f2;
                    overflow: hidden;
                    font-family: "EB Garamond", Georgia, serif;
                }

                .delivery-locations-new-container {
                    width: 100%;
                    max-width: 1800px;
                    margin: 0 auto;
                }

                .delivery-locations-header {
                    width: 100%;
                    max-width: 850px;
                    margin: 0 auto 55px;
                    text-align: center;
                }

                .delivery-locations-label {
                    display: inline-flex;
                    align-items: center;
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

                .delivery-locations-label svg {
                    width: 14px;
                    height: 14px;
                }

                .delivery-locations-title {
                    margin: 0 0 18px;

                    color: #242815;

                    font-family: "EB Garamond", Georgia, serif;
                    font-size: clamp(40px, 5vw, 62px);
                    font-weight: 800;
                    line-height: 1.02;
                    letter-spacing: -1.2px;
                }

                .delivery-locations-description {
                    max-width: 700px;
                    margin: 0 auto;

                    color: #626856;

                    font-size: 16px;
                    line-height: 1.8;
                }

                .delivery-wide-highlight {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 30px;

                    margin-bottom: 30px;
                    padding: 30px 34px;

                    border: 1px solid #d5dfcf;
                    border-radius: 22px;

                    background: #ffffff;
                }

                .delivery-highlight-left {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    min-width: 0;
                }

                .delivery-highlight-icon {
                    width: 54px;
                    height: 54px;
                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 15px;

                    background: #eef2e9;
                    color: #596443;
                }

                .delivery-highlight-icon svg {
                    width: 25px;
                    height: 25px;
                }

                .delivery-highlight-content h3 {
                    margin: 0 0 5px;

                    color: #242815;

                    font-family: "EB Garamond", Georgia, serif;
                    font-size: 30px;
                    font-weight: 800;
                    line-height: 1.1;
                }

                .delivery-highlight-content p {
                    margin: 0;

                    color: #626856;

                    font-size: 14px;
                    line-height: 1.6;
                }

                .delivery-highlight-badge {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    flex-shrink: 0;

                    color: #718141;

                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .delivery-highlight-badge svg {
                    width: 16px;
                    height: 16px;
                }

                .delivery-areas {
                    width: 100%;

                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));

                    border-top: 1px solid #d5dfcf;
                    border-left: 1px solid #d5dfcf;

                    background: #ffffff;
                }

                .delivery-area {
                    min-width: 0;

                    display: flex;
                    align-items: center;
                    gap: 12px;

                    min-height: 76px;
                    padding: 18px 22px;

                    border-right: 1px solid #d5dfcf;
                    border-bottom: 1px solid #d5dfcf;

                    color: #34382b;

                    transition:
                        background-color 0.25s ease,
                        color 0.25s ease;
                }

                .delivery-area:hover {
                    background: #eef2e9;
                    color: #596443;
                }

                .delivery-area-icon {
                    width: 28px;
                    height: 28px;
                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background: #f0f3eb;
                    color: #718141;
                }

                .delivery-area-icon svg {
                    width: 14px;
                    height: 14px;
                }

                .delivery-area-name {
                    font-size: 14px;
                    font-weight: 650;
                    line-height: 1.3;
                }

                .delivery-bottom {
                    margin-top: 28px;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    color: #626856;

                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                }

                .delivery-bottom svg {
                    width: 17px;
                    height: 17px;
                    color: #718141;
                }

                @media (max-width: 1200px) {
                    .delivery-areas {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 900px) {
                    .delivery-locations-new {
                        padding: 70px 0;
                    }

                    .delivery-wide-highlight {
                        align-items: flex-start;
                        flex-direction: column;
                        padding: 26px;
                    }

                    .delivery-highlight-badge {
                        margin-left: 72px;
                    }

                    .delivery-areas {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .delivery-locations-new {
                        padding: 60px 0;
                    }

                    .delivery-locations-header {
                        margin: 0 0 38px;
                        text-align: left;
                    }

                    .delivery-locations-label {
                        margin-bottom: 16px;
                        font-size: 10px;
                    }

                    .delivery-locations-title {
                        margin: 0 0 15px;

                        font-size: clamp(35px, 9vw, 46px);
                        line-height: 1.05;
                    }

                    .delivery-locations-description {
                        margin: 0;
                        font-size: 15px;
                        line-height: 1.7;
                    }

                    .delivery-wide-highlight {
                        margin-bottom: 22px;
                        padding: 22px;
                        border-radius: 18px;
                    }

                    .delivery-highlight-left {
                        width: 100%;
                        flex-direction: column;
                        align-items: flex-start;
                        text-align: left;
                    }

                    .delivery-highlight-icon {
                        width: 46px;
                        height: 46px;
                        margin-bottom: 14px;
                        border-radius: 13px;
                    }

                    .delivery-highlight-icon svg {
                        width: 21px;
                        height: 21px;
                    }

                    .delivery-highlight-content {
                        width: 100%;
                        text-align: left;
                    }

                    .delivery-highlight-content h3 {
                        font-size: 26px;
                    }

                    .delivery-highlight-content p {
                        font-size: 13px;
                    }

                    .delivery-highlight-badge {
                        align-self: flex-start;
                        margin-left: 0;
                    }

                    .delivery-areas {
                        grid-template-columns: 1fr 1fr;
                    }

                    .delivery-area {
                        min-height: 68px;
                        padding: 15px 14px;
                        gap: 9px;
                    }

                    .delivery-area-icon {
                        width: 25px;
                        height: 25px;
                    }

                    .delivery-area-icon svg {
                        width: 13px;
                        height: 13px;
                    }

                    .delivery-area-name {
                        font-size: 13px;
                    }

                    .delivery-bottom {
                        justify-content: flex-start;
                        text-align: left;
                        font-size: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .delivery-locations-new {
                        padding: 50px 0;
                    }

                    .delivery-locations-title {
                        font-size: 32px;
                        letter-spacing: -0.5px;
                    }

                    .delivery-locations-description {
                        font-size: 14px;
                    }

                    .delivery-wide-highlight {
                        padding: 20px;
                    }

                    .delivery-highlight-content h3 {
                        font-size: 24px;
                    }

                    .delivery-highlight-content p {
                        font-size: 12px;
                    }

                    .delivery-highlight-badge {
                        margin-left: 0;
                    }

                    .delivery-areas {
                        grid-template-columns: 1fr;
                    }

                    .delivery-area {
                        min-height: 62px;
                    }
                }
            `}</style>

            <section className="delivery-locations-new">
                <div className="delivery-locations-new-container">

                    <header className="delivery-locations-header">
                        <div className="delivery-locations-label">
                            <MapPin />
                            Where We Deliver
                        </div>

                        <h2 className="delivery-locations-title">
                            Delivery Across Hyderabad
                        </h2>

                        <p className="delivery-locations-description">
                            We deliver a wide range of products
                            across Hyderabad. From homes and apartments to
                            offices and communities, we deliver eligible orders
                            to your doorstep.
                        </p>
                    </header>

                    <div className="delivery-wide-highlight">
                        <div className="delivery-highlight-left">
                            <div className="delivery-highlight-icon">
                                <Navigation />
                            </div>

                            <div className="delivery-highlight-content">
                                <h3>We Deliver Across Hyderabad</h3>

                                <p>
                                    Our delivery network covers Hyderabad and
                                    surrounding areas, with more locations
                                    continuously being added.
                                </p>
                            </div>
                        </div>

                        <div className="delivery-highlight-badge">
                            <CircleCheck />
                            Hyderabad Wide Delivery
                        </div>
                    </div>

                    <div className="delivery-areas">
                        {DELIVERY_AREAS.map((area) => (
                            <div
                                className="delivery-area"
                                key={area}
                            >
                                <span className="delivery-area-icon">
                                    <MapPin />
                                </span>

                                <span className="delivery-area-name">
                                    {area}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="delivery-bottom">
                        <MapPin />
                        Serving customers across Hyderabad and nearby areas
                    </div>

                </div>
            </section>
        </>
    );
};

export default DeliveryLocationsNew;