import React from "react";

import apple from "../assets/fruits/apple.svg";
import pineapple from "../assets/fruits/pineapple.svg";
import watermelon from "../assets/fruits/watermelon.svg";
import strawberry from "../assets/fruits/strawberry.svg";
import grapes from "../assets/fruits/grapes.svg";
import plum from "../assets/fruits/plum.svg";
import melon from "../assets/fruits/melon.svg";
import banana from "../assets/fruits/banana.svg";

const FruitIcons: React.FC = () => {
  const fruits: string[] = [
    apple,
    pineapple,
    watermelon,
    strawberry,
    grapes,
    plum,
    melon,
    banana,
  ];

  return (
    <>
      <style>{`
        .fruit-icons {
          width: 100%;
          background: #ffffff;
          padding: 24px 0;
          overflow: hidden;
        }

        .fruit-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 clamp(18px, 4vw, 64px);

          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        .fruit-icon {
          width: 48px;
          height: 48px;
          object-fit: contain;
          flex-shrink: 0;

          cursor: pointer;

          filter: drop-shadow(0 8px 16px rgba(21, 128, 61, 0.15));

          animation: floatFruit 3s ease-in-out infinite;
          transition: transform .3s ease;
        }

        .fruit-icon:hover {
          transform: translateY(-8px) scale(1.15);
        }

        @keyframes floatFruit {

          0%{
            transform:translateY(0);
          }

          50%{
            transform:translateY(-10px);
          }

          100%{
            transform:translateY(0);
          }

        }

        /* Laptop */

        @media (max-width:1200px){

          .fruit-container{
            gap:24px;
          }

          .fruit-icon{
            width:42px;
            height:42px;
          }

        }

        /* Tablet */

        @media (max-width:768px){

          .fruit-container{
            flex-wrap:wrap;
            justify-content:center;
            gap:22px;
          }

          .fruit-icon{
            width:36px;
            height:36px;
          }

        }

        /* Mobile */

        @media (max-width:576px){

          .fruit-icons{
            padding:16px 0;
          }

          .fruit-container{
            gap:18px;
          }

          .fruit-icon{
            width:24px;
            height:24px;
          }

        }
      `}</style>

      <section className="fruit-icons">
        <div className="fruit-container">
          {fruits.map((fruit: string, index: number) => (
            <img
              key={index}
              src={fruit}
              alt={`Fruit ${index + 1}`}
              className="fruit-icon"
              style={{
                animationDelay: `${index * 0.2}s`,
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default FruitIcons;