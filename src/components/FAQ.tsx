import React, { useState } from "react";
import {
  Plus,
  Minus,
//   MessageCircleQuestion,
  ArrowRight,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What areas does Fruveto deliver to?",
    answer:
      "Fruveto delivers across Hyderabad, covering homes, apartments, offices and communities in many areas. Our delivery network is continuously expanding to reach more customers.",
  },
  {
    question: "How can I check product details?",
    answer:
      "Each product listing contains its available description, pricing, specifications and delivery estimate. Review the details before ordering.",
  },
  {
    question: "Can I choose a size, model, or variant?",
    answer:
      "Where the product provides options, choose the available size, model, color, or other variation before adding it to your cart.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Delivery estimates are shown for each product. Delivery availability depends on the service area and the product's delivery timeline.",
  },
  {
    question: "What products does Fruveto offer?",
    answer:
      "Our catalogue can include clothing, electronics, home and kitchen goods, accessories, and other products. Available categories are managed by our team and can change over time.",
  },
  {
    question: "How can I place an order?",
    answer:
      "Choose the product you want, select the available options and continue with the ordering process. We aim to make the entire experience simple and convenient.",
  },
  {
    question: "What payment options are available?",
    answer:
      "Available payment methods are shown during checkout. Payment options may vary depending on the order and service availability.",
  },
];

const FAQ: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  return (
    <>
      <style>{`
        .fruveto-faq,
        .fruveto-faq * {
          box-sizing: border-box;
        }

        .fruveto-faq {
          width: 100%;
          padding: 90px 0;
          overflow: hidden;
          font-family: "EB Garamond", Georgia, serif;
          color: #242815;
        }

        .faq-container {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
        }

        .faq-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(42px, 5vw, 70px);
        }

        .faq-intro {
          width: min(100%, 900px);
          align-self: center;
          text-align: center;
          position: static;
        }

        .faq-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;

          color: #718141;
          font-family: "Manrope", Arial, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .faq-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #718141;
        }

        .faq-title {
          max-width: 700px;
          margin: 0 auto 20px;

          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          font-size: clamp(42px, 5vw, 64px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -1.2px;
        }

        .faq-description {
          max-width: 640px;
          margin: 0 auto;

          color: #626856;
          font-size: 16px;
          line-height: 1.8;
        }

        .faq-help {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;

          max-width: 430px;
          margin: 38px auto 0;
          padding-top: 25px;

          border-top: 1px solid #d8dfd2;
          text-align: left;
        }

        .faq-help-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #eef2e9;
          border: 1px solid #d5dfcf;
          border-radius: 13px;

          color: #596443;
        }

        .faq-help-icon svg {
          width: 21px;
          height: 21px;
        }

        .faq-help-content {
          min-width: 0;
        }

        .faq-help-title {
          margin: 0 0 3px;

          color: #242815;
          font-size: 13px;
          font-weight: 800;
        }

        .faq-help-text {
          margin: 0;

          color: #87947b;
          font-size: 12px;
          line-height: 1.5;
        }

        .faq-list {
          width: 100%;
          min-width: 0;
        }

        .faq-item {
          border-bottom: 1px solid #d8dfd2;
        }

        .faq-item:first-child {
          border-top: 1px solid #d8dfd2;
        }

        .faq-question {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;

          padding: 25px 0;

          border: 0;
          background: transparent;

          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          font-size: 18px;
          font-weight: 700;

          text-align: left;
          cursor: pointer;
        }

        .faq-question-text {
          min-width: 0;
          line-height: 1.5;
        }

        .faq-icon {
          width: 36px;
          height: 36px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #d5dfcf;
          border-radius: 50%;

          background: #ffffff;
          color: #596443;

          transition:
            background 0.25s ease,
            color 0.25s ease,
            transform 0.25s ease;
        }

        .faq-icon svg {
          width: 17px;
          height: 17px;
        }

        .faq-question:hover .faq-icon,
        .faq-item.active .faq-icon {
          background: #33371b;
          color: #ffffff;
          border-color: #33371b;
        }

        .faq-answer-wrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s ease;
        }

        .faq-item.active .faq-answer-wrapper {
          grid-template-rows: 1fr;
        }

        .faq-answer-inner {
          overflow: hidden;
        }

        .faq-answer {
          max-width: 760px;
          margin: 0;
          padding: 0 70px 25px 0;

          color: #626856;
          font-size: 14px;
          line-height: 1.8;
        }

        .faq-bottom {
          display: flex;
          justify-content: flex-start;
          margin-top: 45px;
        }

        .faq-bottom-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;

          color: #596443;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .faq-bottom-arrow {
          width: 36px;
          height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #d5dfcf;
          border-radius: 50%;

          background: #ffffff;
          color: #33371b;

          transition:
            background 0.25s ease,
            color 0.25s ease,
            transform 0.25s ease;
        }

        .faq-bottom-arrow svg {
          width: 16px;
          height: 16px;
        }

        .faq-bottom-link:hover .faq-bottom-arrow {
          background: #33371b;
          color: #ffffff;
          transform: translateX(3px);
        }

        @media (max-width: 1100px) {
          .faq-title {
            font-size: clamp(40px, 5vw, 54px);
          }
        }

        @media (max-width: 900px) {
          .fruveto-faq {
            padding: 70px 0;
          }

          .faq-layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .faq-intro {
            width: 100%;
            text-align: left;
            position: static;
          }

          .faq-title {
            max-width: 700px;
            margin: 0 0 20px;
          }

          .faq-description {
            max-width: 700px;
            margin: 0;
          }

          .faq-help {
            max-width: 420px;
            margin: 38px 0 0;
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .fruveto-faq {
            padding: 60px 0;
          }

          .faq-layout {
            gap: 40px;
          }

          .faq-intro {
            text-align: left;
          }

          .faq-title {
            font-size: clamp(36px, 10vw, 48px);
            letter-spacing: -0.7px;
          }

          .faq-description {
            font-size: 15px;
            line-height: 1.7;
          }

          .faq-help {
            margin-top: 30px;
          }

          .faq-question {
            padding: 21px 0;
            gap: 16px;
            font-size: 15px;
          }

          .faq-icon {
            width: 34px;
            height: 34px;
          }

          .faq-answer {
            padding: 0 45px 22px 0;
            font-size: 13px;
            line-height: 1.7;
          }

          .faq-bottom {
            margin-top: 35px;
          }
        }

        @media (max-width: 480px) {
          .fruveto-faq {
            padding: 50px 0;
          }

          .faq-title {
            font-size: 34px;
          }

          .faq-description {
            font-size: 14px;
          }

          .faq-help {
            padding-top: 20px;
            gap: 11px;
          }

          .faq-help-icon {
            width: 40px;
            height: 40px;
            border-radius: 11px;
          }

          .faq-question {
            padding: 18px 0;
            font-size: 14px;
          }

          .faq-icon {
            width: 32px;
            height: 32px;
          }

          .faq-answer {
            padding-right: 38px;
            font-size: 13px;
          }

          .faq-bottom {
            margin-top: 30px;
          }
        }
      `}</style>

      <section className="fruveto-faq">
        <div className="faq-container">
          <div className="faq-layout">
            <div className="faq-intro">
              <span className="faq-eyebrow">FAQ</span>

              <h2 className="faq-title">
                Everything You Need To Know.
              </h2>

              <p className="faq-description">
                Have a question about Fruveto, our products or delivery?
                Here are some answers to help you get started.
              </p>

              {/* <div className="faq-help">
                <div className="faq-help-icon">
                  <MessageCircleQuestion />
                </div>

                <div className="faq-help-content">
                  <p className="faq-help-title">
                    Still have a question?
                  </p>

                  <p className="faq-help-text">
                    We're here to help with anything you need.
                  </p>
                </div>
              </div> */}
            </div>

            <div className="faq-list">
              {FAQ_ITEMS.map((item, index) => {
                const isActive = activeIndex === index;

                return (
                  <div
                    className={`faq-item ${isActive ? "active" : ""}`}
                    key={item.question}
                  >
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFAQ(index)}
                      aria-expanded={isActive}
                    >
                      <span className="faq-question-text">
                        {item.question}
                      </span>

                      <span className="faq-icon">
                        {isActive ? <Minus /> : <Plus />}
                      </span>
                    </button>

                    <div className="faq-answer-wrapper">
                      <div className="faq-answer-inner">
                        <p className="faq-answer">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="faq-bottom">
                <div className="faq-bottom-link">
                  <span>Fresh answers. Simple choices.</span>

                  <span className="faq-bottom-arrow">
                    <ArrowRight />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;