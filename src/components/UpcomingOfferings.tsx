import React from "react";
import { offerings } from "../types/constants";
import SingleOfferingCard from "./SingleOfferingCard";

const UpcomingOfferings: React.FC = () => {
  return (
    <>
      <style>{`
        .upcoming {
          width: 100%;
          padding: 80px 0;
          background: #f7f7f2;
          overflow: hidden;
          font-family: "EB Garamond", Georgia, serif;
        }

        .upcoming,
        .upcoming * {
          box-sizing: border-box;
        }
          
        .upcoming-container {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;

        //   padding-left: clamp(20px, 4vw, 80px);
        //   padding-right: clamp(20px, 4vw, 80px);

          box-sizing: border-box;
        }

        .upcoming-header {
          width: 100%;
          max-width: 800px;
          margin: 0 auto 60px;
          text-align: center;
        }

        .launch-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;

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

        .launch-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;

          border-radius: 50%;
          background: #718141;
        }

        .upcoming-header h2 {
          margin: 0 0 18px;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;
          font-size: clamp(38px, 4.5vw, 58px);
          font-weight: 800;
          line-height: 1.03;
          letter-spacing: -1px;
        }

        .upcoming-header p {
          max-width: 650px;
          margin: 0 auto;

          color: #626856;

          font-size: 16px;
          line-height: 1.8;
        }

        .offering-grid {
          width: 100%;
          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 28px;
        }

        .offering-grid > * {
          width: 100%;
          min-width: 0;
        }

        /* =========================================
           TABLET / SMALL LAPTOP
        ========================================= */

        @media (max-width: 1100px) {
          .upcoming {
            padding: 80px 0;
          }

          .offering-grid {
            grid-template-columns: 1fr;
            max-width: 100%;
            margin: 0;
          }
        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (max-width: 768px) {
          .upcoming {
            padding: 65px 0;
          }

          .upcoming-container {
            width: 100%;
            max-width: 100%;
          }

          .upcoming-header {
            width: 100%;
            max-width: 100%;

            margin: 0 0 40px;

            text-align: left;
          }

          .launch-badge {
            margin-bottom: 17px;
          }

          .upcoming-header h2 {
            font-size: clamp(34px, 9vw, 46px);
            line-height: 1.05;
          }

          .upcoming-header p {
            max-width: 100%;

            margin: 0;

            font-size: 15px;
            line-height: 1.7;

            text-align: left;
          }

          .offering-grid {
            width: 100%;
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        /* =========================================
           SMALL MOBILE
        ========================================= */

        @media (max-width: 480px) {
          .upcoming {
            padding: 55px 0;
          }

          .upcoming-header {
            margin-bottom: 32px;
          }

          .launch-badge {
            padding: 8px 13px;
            font-size: 10px;
          }

          .upcoming-header h2 {
            font-size: 32px;
            letter-spacing: -0.5px;
          }

          .upcoming-header p {
            font-size: 14px;
          }
        }
      `}</style>

      <section className="upcoming">
        <div className="upcoming-container">
          <header className="upcoming-header">
            <div className="launch-badge">
              <span className="launch-dot" />
              Coming Soon
            </div>

            <h2>More Goodness Is On Its Way.</h2>

            <p>
              We’re bringing more thoughtful nutrition choices to Fruveto,
              made with the same focus on freshness, quality and everyday
              wellness.
            </p>
          </header>

          <div className="offering-grid">
            {offerings.map((item) => (
              <SingleOfferingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default UpcomingOfferings;