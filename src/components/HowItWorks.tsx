import React from "react";
import {
    ShoppingBasket,
    SlidersHorizontal,
    PackageCheck,
    Truck,
    ArrowRight,
} from "lucide-react";

interface Step {
    number: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

const steps: Step[] = [
    {
        number: "01",
        title: "Browse Products",
        description:
            "Browse categories and discover products that fit your needs, preferences, and budget.",
        icon: ShoppingBasket,
    },
    {
        number: "02",
        title: "Make It Yours",
        description:
            "Choose any available size, model or variant, then add the products you want to your cart.",
        icon: SlidersHorizontal,
    },
    {
        number: "03",
        title: "We Process Your Order",
        description:
            "Our team reviews your order, checks availability and prepares items for dispatch.",
        icon: PackageCheck,
    },
    {
        number: "04",
        title: "Delivered to Your Address",
        description:
            "Your order is delivered to eligible service areas according to the product delivery estimate.",
        icon: Truck,
    },
];

const HowItWorks: React.FC = () => {
    return (
        <>
            <style>{`
        .how-it-works,
        .how-it-works * {
          box-sizing: border-box;
        }

        .how-it-works {
          width: 100%;
          padding: 90px 0;
          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          overflow: hidden;
        }

        .how-container {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
        }

        .how-card {
          width: 100%;
          padding: clamp(55px, 6vw, 90px);
          background: #fbfbf7;
        border: 1px solid #d5ddce;
        border-radius: 28px;
          border-radius: 30px;
          box-shadow: 0 18px 55px rgba(38, 56, 36, 0.07);
          overflow: hidden;
        }

        .how-header {
          width: 100%;
          max-width: 760px;
          margin: 0 auto 75px;
          text-align: center;
        }

        .how-eyebrow {
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

        .how-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #718141;
        }

        .how-title {
          margin: 0 0 18px;
          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          font-size: clamp(40px, 4.5vw, 60px);
          font-weight: 800;
          line-height: 1.03;
          letter-spacing: -1px;
        }

        .how-description {
          max-width: 650px;
          margin: 0 auto;
          color: #626856;
          font-size: 16px;
          line-height: 1.8;
        }

        .how-steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
        }

        .how-step {
          position: relative;
          min-width: 0;
          padding: 0 30px;
          text-align: center;
        }

        .how-step:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 35px;
          left: calc(50% + 55px);
          right: calc(-50% + 55px);
          height: 1px;
          background: #d8dfd2;
        }

        .how-icon-wrap {
          position: relative;
          z-index: 2;

          width: 70px;
          height: 70px;
          margin: 0 auto 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #f3f6ef;
          border: 1px solid #d5dfcf;
          border-radius: 50%;

          color: #33371b;

          box-shadow: 0 8px 24px rgba(38, 56, 36, 0.06);

          transition:
            transform 0.3s ease,
            background 0.3s ease,
            border-color 0.3s ease,
            color 0.3s ease;
        }

        .how-step:hover .how-icon-wrap {
          transform: translateY(-5px);
          background: #33371b;
          border-color: #33371b;
          color: #ffffff;
        }

        .how-icon {
          width: 26px;
          height: 26px;
          stroke-width: 1.7;
        }

        .how-number {
          display: block;
          margin-bottom: 10px;
          color: #87947b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .how-step-title {
          margin: 0 0 12px;
          color: #242815;
          font-family: "EB Garamond", Georgia, serif;
          font-size: clamp(24px, 2vw, 30px);
          font-weight: 800;
          line-height: 1.1;
        }

        .how-step-description {
          max-width: 290px;
          margin: 0 auto;
          color: #626856;
          font-size: 14px;
          line-height: 1.75;
        }

        .how-bottom {
          display: flex;
          justify-content: center;
          margin-top: 65px;
          padding-top: 30px;
          border-top: 1px solid #e4e9df;
        }

        .how-bottom-line {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #718141;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .how-bottom-arrow {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d5dfcf;
          border-radius: 50%;
          background: #f7f8f4;
          color: #33371b;
          transition:
            background 0.3s ease,
            color 0.3s ease,
            transform 0.3s ease;
        }

        .how-bottom-arrow svg {
          width: 16px;
          height: 16px;
        }

        .how-bottom-line:hover .how-bottom-arrow {
          background: #33371b;
          color: #ffffff;
          transform: translateX(3px);
        }

        @media (max-width: 1200px) {
          .how-card {
            padding: 55px 40px;
          }

          .how-step {
            padding: 0 18px;
          }

          .how-step:not(:last-child)::after {
            left: calc(50% + 48px);
            right: calc(-50% + 48px);
          }

          .how-step-title {
            font-size: 25px;
          }

          .how-step-description {
            font-size: 13px;
          }
        }

        @media (max-width: 900px) {
          .how-it-works {
            padding: 70px 0;
          }

          .how-card {
            padding: 50px 28px;
            border-radius: 26px;
          }

          .how-header {
            margin-bottom: 60px;
          }

          .how-steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 55px;
          }

          .how-step {
            padding: 0 20px;
          }

          .how-step:nth-child(2)::after {
            display: none;
          }

          .how-step:nth-child(1)::after,
          .how-step:nth-child(3)::after {
            left: calc(50% + 50px);
            right: calc(-50% + 50px);
          }

          .how-step:nth-child(3)::after {
            display: block;
          }
        }

        @media (max-width: 768px) {
          .how-it-works {
            padding: 60px 0;
          }

          .how-card {
            padding: 45px 24px;
            border-radius: 22px;
          }

          .how-header {
            margin: 0 0 45px;
            text-align: left;
          }

          .how-eyebrow {
            margin-bottom: 15px;
          }

          .how-title {
            font-size: clamp(36px, 10vw, 48px);
            letter-spacing: -0.7px;
          }

          .how-description {
            margin: 0;
            font-size: 15px;
            line-height: 1.7;
          }

          .how-steps {
            display: flex;
            flex-direction: column;
            gap: 0;
          }

          .how-step {
            display: grid;
            grid-template-columns: 64px minmax(0, 1fr);
            column-gap: 20px;
            padding: 0 0 38px;
            text-align: left;
          }

          .how-step:not(:last-child)::after {
            display: block;
            top: 70px;
            left: 31px;
            right: auto;
            width: 1px;
            height: calc(100% - 70px);
            background: #d8dfd2;
          }

          .how-icon-wrap {
            width: 64px;
            height: 64px;
            margin: 0;
            grid-row: span 3;
          }

          .how-icon {
            width: 24px;
            height: 24px;
          }

          .how-number {
            margin: 2px 0 7px;
          }

          .how-step-title {
            margin-bottom: 8px;
            font-size: 27px;
          }

          .how-step-description {
            max-width: 100%;
            margin: 0;
            font-size: 14px;
            line-height: 1.7;
          }

          .how-bottom {
            justify-content: flex-start;
            margin-top: 10px;
            padding-top: 24px;
          }
        }

        @media (max-width: 480px) {
          .how-it-works {
            padding: 50px 0;
          }

          .how-card {
            padding: 38px 20px;
            border-radius: 19px;
          }

          .how-header {
            margin-bottom: 38px;
          }

          .how-title {
            font-size: 34px;
          }

          .how-description {
            font-size: 14px;
          }

          .how-step {
            grid-template-columns: 56px minmax(0, 1fr);
            column-gap: 16px;
            padding-bottom: 34px;
          }

          .how-step:not(:last-child)::after {
            left: 27px;
            top: 62px;
            height: calc(100% - 62px);
          }

          .how-icon-wrap {
            width: 56px;
            height: 56px;
          }

          .how-icon {
            width: 21px;
            height: 21px;
          }

          .how-step-title {
            font-size: 24px;
          }

          .how-step-description {
            font-size: 13px;
          }

          .how-bottom-line {
            font-size: 10px;
          }
        }
      `}</style>

            <section className="how-it-works">
                <div className="how-container">
                    <div className="how-card">
                        <header className="how-header">
                            <span className="how-eyebrow">How It Works</span>

                            <h2 className="how-title">
                                Online Shopping, Made Simple.
                            </h2>

                            <p className="how-description">
                                From finding your favorite products to receiving them at
                                your doorstep, our store makes shopping simple and
                                convenient.
                            </p>
                        </header>

                        <div className="how-steps">
                            {steps.map((step) => {
                                const Icon = step.icon;

                                return (
                                    <article className="how-step" key={step.number}>
                                        <div className="how-icon-wrap">
                                            <Icon className="how-icon" />
                                        </div>

                                        <span className="how-number">{step.number}</span>

                                        <h3 className="how-step-title">
                                            {step.title}
                                        </h3>

                                        <p className="how-step-description">
                                            {step.description}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="how-bottom">
                            <div className="how-bottom-line">
                                <span>Fresh choices. Every day.</span>

                                <span className="how-bottom-arrow">
                                    <ArrowRight />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HowItWorks;