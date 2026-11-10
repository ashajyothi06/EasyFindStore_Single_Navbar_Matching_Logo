import React from "react";
import styled from "styled-components";

import fruvetoLogo from "../assets/logo.png";

const Loader: React.FC = () => {
  return (
    <StyledWrapper role="status" aria-live="polite" aria-label="Fruveto is loading">
      <div className="loader">
        <div className="load-inner load-one" />
        <div className="load-inner load-two" />
        <div className="load-inner load-three" />
        <img className="loader-logo" src={fruvetoLogo} alt="Fruveto" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: #33371b;
  box-sizing: border-box;

  .loader {
    position: relative;
    width: clamp(160px, 24vw, 210px);
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 780px;
  }

  .loader-logo {
    position: relative;
    z-index: 10;
    width: 82%;
    max-width: 168px;
    max-height: 96px;
    display: block;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
  }

  .load-inner {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-sizing: border-box;
    filter: drop-shadow(0 0 6px rgba(241, 234, 216, 0.2));
  }

  .load-one {
    border-bottom: 3px solid #ffffff;
    animation: rotate1 1.15s linear infinite;
  }

  .load-two {
    border-right: 3px solid #f1ead8;
    animation: rotate2 1.15s 0.1s linear infinite;
  }

  .load-three {
    border-top: 3px solid #aeb78a;
    animation: rotate3 1.15s 0.15s linear infinite;
  }

  @keyframes rotate1 {
    from {
      transform: rotateX(45deg) rotateY(-45deg) rotateZ(0deg);
    }

    to {
      transform: rotateX(45deg) rotateY(-45deg) rotateZ(360deg);
    }
  }

  @keyframes rotate2 {
    from {
      transform: rotateX(45deg) rotateY(45deg) rotateZ(0deg);
    }

    to {
      transform: rotateX(45deg) rotateY(45deg) rotateZ(360deg);
    }
  }

  @keyframes rotate3 {
    from {
      transform: rotateX(-60deg) rotateY(0deg) rotateZ(0deg);
    }

    to {
      transform: rotateX(-60deg) rotateY(0deg) rotateZ(360deg);
    }
  }

  @media (max-width: 480px) {
    min-height: 100dvh;
    padding: 24px 16px;

    .loader {
      width: 165px;
    }

    .loader-logo {
      max-width: 132px;
      max-height: 76px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .load-inner {
      animation-duration: 2.4s;
    }
  }
`;

export default Loader;
