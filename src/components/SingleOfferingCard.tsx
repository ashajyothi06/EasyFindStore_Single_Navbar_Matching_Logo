import React from "react";

interface OfferingItem {
    id: number;
    number: string;
    image: string;
    title: string;
    description: string;
}

interface SingleOfferingCardProps {
  item: OfferingItem;
}

const SingleOfferingCard: React.FC<SingleOfferingCardProps> = ({ item }) => {
  return (
    <>
      <style>{`
        .offering-card {
          position: relative;
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(260px, 42%) minmax(0, 1fr);
          background: #ffffff;
          border: 1px solid #dce6d8;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 12px 35px rgba(38, 56, 36, 0.07);
          transition:
            transform 0.35s ease,
            box-shadow 0.35s ease,
            border-color 0.35s ease;
        }

        .offering-card:hover {
          transform: translateY(-7px);
          border-color: #9caf91;
          box-shadow: 0 22px 50px rgba(38, 56, 36, 0.13);
        }

        .offering-image-wrap {
          position: relative;
          min-height: 330px;
          overflow: hidden;
          background: #edf2e9;
        }

        .offering-image-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(51, 55, 27, 0.04);
          pointer-events: none;
        }

        .offering-image {
          width: 100%;
          height: 100%;
          min-height: 330px;
          display: block;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .offering-card:hover .offering-image {
          transform: scale(1.045);
        }

        .offering-status {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(51, 55, 27, 0.15);
          border-radius: 999px;
          color: #33371b;
          font-family: "Manrope", sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 5px 18px rgba(0, 0, 0, 0.08);
        }

        .offering-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6f7f35;
          flex-shrink: 0;
        }

        .offering-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding: 42px;
        }

        .offering-number {
          margin-bottom: 18px;
          color: #87947b;
          font-family: "Manrope", sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .offering-card h3 {
          margin: 0 0 15px;
          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          font-size: clamp(30px, 3vw, 42px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.7px;
        }

        .offering-card p {
          max-width: 500px;
          margin: 0;
          color: #626856;
          font-family: "EB Garamond", Georgia, serif;
          font-size: 18px;
          line-height: 1.7;
        }

        .offering-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid #e7ebe2;
        }

        .offering-bottom-text {
          color: #87947b;
          font-family: "Manrope", sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .offering-arrow {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #d5dfcf;
          border-radius: 50%;
          color: #33371b;
          font-family: "Manrope", sans-serif;
          font-size: 18px;
          transition:
            background 0.3s ease,
            color 0.3s ease,
            transform 0.3s ease;
        }

        .offering-card:hover .offering-arrow {
          background: #33371b;
          color: #ffffff;
          transform: translateX(3px);
        }

        @media (max-width: 1100px) {
          .offering-card {
            grid-template-columns: 1fr;
          }

          .offering-image-wrap {
            min-height: 280px;
          }

          .offering-image {
            min-height: 280px;
            max-height: 330px;
          }

          .offering-content {
            padding: 32px;
          }
        }

        @media (max-width: 768px) {
          .offering-card {
            border-radius: 22px;
          }

          .offering-image-wrap {
            min-height: 250px;
          }

          .offering-image {
            min-height: 250px;
            max-height: 290px;
          }

          .offering-status {
            top: 16px;
            left: 16px;
            padding: 7px 11px;
            font-size: 10px;
          }

          .offering-content {
            padding: 28px 24px;
          }

          .offering-number {
            margin-bottom: 14px;
          }

          .offering-card h3 {
            font-size: 31px;
            margin-bottom: 12px;
          }

          .offering-card p {
            font-size: 14px;
            line-height: 1.7;
          }

          .offering-bottom {
            margin-top: 24px;
            padding-top: 18px;
          }
        }

        @media (max-width: 480px) {
          .offering-card {
            border-radius: 19px;
          }

          .offering-image-wrap {
            min-height: 220px;
          }

          .offering-image {
            min-height: 220px;
            max-height: 250px;
          }

          .offering-content {
            padding: 24px 20px;
          }

          .offering-card h3 {
            font-size: 28px;
          }

          .offering-card p {
            font-size: 14px;
          }

          .offering-arrow {
            width: 38px;
            height: 38px;
            font-size: 16px;
          }
        }
      `}</style>

      <article className="offering-card">
        <div className="offering-image-wrap">
          <div className="offering-status">
            <span className="offering-status-dot" />
            Coming Soon
          </div>

          <img
            className="offering-image"
            src={item.image}
            alt={item.title}
            loading="lazy"
          />
        </div>

        <div className="offering-content">
          <span className="offering-number">{item.number}</span>

          <h3>{item.title}</h3>

          <p>{item.description}</p>

          <div className="offering-bottom">
            <span className="offering-bottom-text">
              Stay tuned for launch
            </span>

            <span className="offering-arrow" aria-hidden="true">
              →
            </span>
          </div>
        </div>
      </article>
    </>
  );
};

export default SingleOfferingCard;