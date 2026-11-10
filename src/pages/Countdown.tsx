import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  Citrus,
  Milk,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const Countdown: React.FC = () => {
  const navigate = useNavigate();

  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const createAudioContext = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return null;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      return audioContextRef.current;
    } catch {
      return null;
    }
  };

  const playTickSound = () => {
    try {
      const audioContext = createAudioContext();

      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        count === 1 ? 720 : 520,
        audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.08,
        audioContext.currentTime + 0.02
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.18
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log("Countdown sound unavailable", error);
    }
  };

  const playLaunchSound = () => {
    try {
      const audioContext = createAudioContext();

      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const frequencies = [440, 554, 659, 880];

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        const startTime =
          audioContext.currentTime + index * 0.08;

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        gainNode.gain.setValueAtTime(
          0.0001,
          startTime
        );

        gainNode.gain.exponentialRampToValueAtTime(
          0.12,
          startTime + 0.03
        );

        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + 0.35
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch (error) {
      console.log("Launch sound unavailable", error);
    }
  };

  const startCountdown = () => {
    if (started) return;

    const audioContext = createAudioContext();

    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }

    setStarted(true);
  };

  useEffect(() => {
    if (!started) return;

    if (count <= 0) {
      setIsLive(true);

      playLaunchSound();

      const redirectTimer = window.setTimeout(() => {
        navigate("/");
      }, 3000);

      return () => {
        window.clearTimeout(redirectTimer);
      };
    }

    playTickSound();

    const timer = window.setTimeout(() => {
      setCount((previous) => previous - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [started, count]);

  return (
    <>
      <style>{`
        .countdown-page,
        .countdown-page * {
          box-sizing: border-box;
        }

        .countdown-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          min-height: 100svh;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          background: #f7f7f2;
          color: #242815;

          font-family: "Manrope", sans-serif;
        }

        .countdown-page::before {
          content: "";

          position: absolute;

          width: 600px;
          height: 600px;

          top: -260px;
          right: -180px;

          border-radius: 50%;

          background: #eef2e9;

          opacity: 0.8;

          pointer-events: none;
        }

        .countdown-page::after {
          content: "";

          position: absolute;

          width: 500px;
          height: 500px;

          bottom: -280px;
          left: -180px;

          border-radius: 50%;

          background: #eef2e9;

          opacity: 0.7;

          pointer-events: none;
        }

        .countdown-container {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 1800px;

          min-height: 100vh;
          min-height: 100svh;

          margin: 0 auto;

          padding: 50px clamp(20px, 4vw, 80px);

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;
        }

        .countdown-brand {
          position: absolute;

          top: 42px;
          left: clamp(20px, 4vw, 80px);

          display: flex;
          align-items: center;

          gap: 10px;
        }

        .countdown-brand-mark {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #d5dfcf;
          border-radius: 50%;

          background: #ffffff;
          color: #596443;
        }

        .countdown-brand-mark svg {
          width: 21px;
          height: 21px;
        }

        .countdown-brand-name {
          color: #33371b;

          font-size: 16px;
          font-weight: 800;

          letter-spacing: -0.3px;
        }

        .countdown-brand-name span {
          color: #87947b;
          font-weight: 500;
        }

        .countdown-content {
          width: 100%;
          max-width: 850px;

          text-align: center;
        }

        .countdown-eyebrow {
          display: inline-flex;
          align-items: center;

          gap: 8px;

          margin-bottom: 20px;

          color: #718141;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 0.2em;

          text-transform: uppercase;
        }

        .countdown-eyebrow-dot {
          width: 7px;
          height: 7px;

          flex-shrink: 0;

          border-radius: 50%;

          background: #718141;

          animation: countdownPulse 1.4s ease-in-out infinite;
        }

        @keyframes countdownPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }

        .countdown-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(52px, 7vw, 92px);

          font-weight: 800;

          line-height: 0.95;

          letter-spacing: -2px;
        }

        .countdown-description {
          max-width: 600px;

          margin: 22px auto 0;

          color: #626856;

          font-size: 16px;

          line-height: 1.8;
        }

        .countdown-visual {
          position: relative;

          width: 280px;
          height: 280px;

          margin: 45px auto 35px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .countdown-ring {
          position: absolute;

          inset: 0;

          border: 1px solid #d5dfcf;

          border-radius: 50%;
        }

        .countdown-ring::before {
          content: "";

          position: absolute;

          inset: 16px;

          border: 1px dashed #cbd6c2;

          border-radius: 50%;

          animation: ringRotate 18s linear infinite;
        }

        @keyframes ringRotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .countdown-number-wrap {
          position: relative;
          z-index: 3;

          width: 170px;
          height: 170px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #33371b;

          box-shadow:
            0 20px 50px rgba(51, 55, 27, 0.18),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);

          animation: numberFloat 3s ease-in-out infinite;
        }

        @keyframes numberFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        .countdown-number {
          color: #ffffff;

          font-family: "EB Garamond", Georgia, serif;

          font-size: 92px;
          font-weight: 800;

          line-height: 1;

          letter-spacing: -4px;

          animation: numberChange 0.25s ease;
        }

        @keyframes numberChange {
          from {
            opacity: 0;
            transform: scale(0.7);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .countdown-fruit {
          position: absolute;
          z-index: 4;

          width: 52px;
          height: 52px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #d5dfcf;

          border-radius: 50%;

          background: #ffffff;
          color: #596443;

          box-shadow: 0 10px 25px rgba(38, 56, 36, 0.08);

          animation: fruitFloat 4s ease-in-out infinite;
        }

        .countdown-fruit svg {
          width: 22px;
          height: 22px;
        }

        .countdown-fruit.one {
          top: 5px;
          left: 28px;
        }

        .countdown-fruit.two {
          top: 35px;
          right: 10px;

          animation-delay: 0.7s;
        }

        .countdown-fruit.three {
          bottom: 25px;
          right: 35px;

          animation-delay: 1.2s;
        }

        .countdown-fruit.four {
          bottom: 10px;
          left: 35px;

          animation-delay: 1.8s;
        }

        @keyframes fruitFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-9px) rotate(4deg);
          }
        }

        .countdown-status {
          min-height: 24px;

          color: #87947b;

          font-size: 12px;
          font-weight: 700;

          letter-spacing: 0.12em;

          text-transform: uppercase;
        }

        .countdown-start {
          margin-top: 28px;

          padding: 15px 26px;

          display: inline-flex;
          align-items: center;

          gap: 10px;

          border: 1px solid #33371b;

          border-radius: 999px;

          background: #33371b;
          color: #ffffff;

          font-family: "Manrope", sans-serif;

          font-size: 12px;
          font-weight: 800;

          letter-spacing: 0.1em;

          text-transform: uppercase;

          cursor: pointer;

          transition:
            transform 0.25s ease,
            background 0.25s ease,
            box-shadow 0.25s ease;
        }

        .countdown-start:hover {
          transform: translateY(-3px);

          background: #242815;

          box-shadow:
            0 12px 30px rgba(51, 55, 27, 0.16);
        }

        .countdown-start svg {
          width: 16px;
          height: 16px;
        }

        .countdown-footer {
          position: absolute;

          bottom: 35px;

          color: #a0a794;

          font-size: 10px;
          font-weight: 700;

          letter-spacing: 0.14em;

          text-transform: uppercase;
        }

        /* LIVE SCREEN */

        .countdown-live {
          position: fixed;

          inset: 0;

          z-index: 50;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          background: rgba(247, 247, 242, 0.98);

          animation: liveScreenIn 0.7s ease forwards;
        }

        @keyframes liveScreenIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .countdown-live-content {
          position: relative;

          z-index: 5;

          width: min(900px, 90%);

          text-align: center;

          animation:
            liveContentIn 0.9s
            cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }

        @keyframes liveContentIn {
          from {
            opacity: 0;

            transform:
              translateY(35px)
              scale(0.92);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        .countdown-live-icon {
          width: 72px;
          height: 72px;

          margin: 0 auto 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #33371b;
          color: #ffffff;

          box-shadow:
            0 0 0 10px rgba(51, 55, 27, 0.07),
            0 20px 50px rgba(51, 55, 27, 0.18);

          animation: liveIcon 1.5s ease-in-out infinite;
        }

        .countdown-live-icon svg {
          width: 32px;
          height: 32px;
        }

        @keyframes liveIcon {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.08);
          }
        }

        .countdown-live-eyebrow {
          margin-bottom: 15px;

          color: #718141;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 0.25em;

          text-transform: uppercase;
        }

        .countdown-live-title {
          margin: 0;

          color: #242815;

          font-family: "EB Garamond", Georgia, serif;

          font-size: clamp(65px, 10vw, 130px);

          font-weight: 800;

          line-height: 0.85;

          letter-spacing: -4px;
        }

        .countdown-live-title span {
          color: #718141;
        }

        .countdown-live-description {
          max-width: 600px;

          margin: 25px auto 0;

          color: #626856;

          font-size: 16px;

          line-height: 1.8;
        }

        .countdown-live-line {
          width: 90px;
          height: 2px;

          margin: 30px auto 0;

          background: #718141;

          animation:
            liveLine 1.2s
            ease-in-out infinite alternate;
        }

        @keyframes liveLine {
          from {
            width: 60px;
            opacity: 0.4;
          }

          to {
            width: 130px;
            opacity: 1;
          }
        }

        /* LIVE PARTICLES */

        .live-particle {
          position: absolute;

          width: 10px;
          height: 10px;

          border-radius: 50%;

          background: #718141;

          opacity: 0;

          animation:
            particleBurst 2.5s
            ease-out infinite;
        }

        .live-particle:nth-child(1) {
          top: 18%;
          left: 20%;

          animation-delay: 0.1s;
        }

        .live-particle:nth-child(2) {
          top: 30%;
          right: 18%;

          width: 7px;
          height: 7px;

          animation-delay: 0.4s;
        }

        .live-particle:nth-child(3) {
          bottom: 22%;
          left: 27%;

          width: 6px;
          height: 6px;

          animation-delay: 0.7s;
        }

        .live-particle:nth-child(4) {
          bottom: 27%;
          right: 25%;

          width: 12px;
          height: 12px;

          animation-delay: 1s;
        }

        .live-particle:nth-child(5) {
          top: 20%;
          left: 45%;

          width: 5px;
          height: 5px;

          animation-delay: 1.2s;
        }

        .live-particle:nth-child(6) {
          bottom: 18%;
          right: 44%;

          width: 7px;
          height: 7px;

          animation-delay: 1.5s;
        }

        @keyframes particleBurst {
          0% {
            opacity: 0;

            transform:
              scale(0)
              translateY(20px);
          }

          20% {
            opacity: 0.8;
          }

          70% {
            opacity: 0.5;
          }

          100% {
            opacity: 0;

            transform:
              scale(1.5)
              translateY(-70px);
          }
        }

        /* LIVE FRUIT ELEMENTS */

        .countdown-launch-fruit {
          position: absolute;

          width: 50px;
          height: 50px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #d5dfcf;

          border-radius: 50%;

          background: #ffffff;
          color: #596443;

          box-shadow:
            0 12px 30px
            rgba(38, 56, 36, 0.08);

          animation:
            launchFruit 3s
            ease-out forwards;
        }

        .countdown-launch-fruit svg {
          width: 21px;
          height: 21px;
        }

        .countdown-launch-fruit.fruit-a {
          top: 20%;
          left: 17%;

          animation-delay: 0.1s;
        }

        .countdown-launch-fruit.fruit-b {
          top: 22%;
          right: 17%;

          animation-delay: 0.3s;
        }

        .countdown-launch-fruit.fruit-c {
          bottom: 20%;
          left: 20%;

          animation-delay: 0.5s;
        }

        .countdown-launch-fruit.fruit-d {
          bottom: 18%;
          right: 20%;

          animation-delay: 0.7s;
        }

        @keyframes launchFruit {
          0% {
            opacity: 0;

            transform:
              scale(0.3)
              rotate(-30deg);
          }

          30% {
            opacity: 1;
          }

          100% {
            opacity: 1;

            transform:
              scale(1)
              rotate(10deg);
          }
        }

        @media (max-width: 768px) {
          .countdown-container {
            padding: 90px 20px 70px;
          }

          .countdown-brand {
            top: 25px;
            left: 20px;
          }

          .countdown-brand-mark {
            width: 36px;
            height: 36px;
          }

          .countdown-brand-name {
            font-size: 14px;
          }

          .countdown-title {
            font-size: clamp(46px, 13vw, 68px);

            letter-spacing: -1.5px;
          }

          .countdown-description {
            max-width: 500px;

            font-size: 14px;

            line-height: 1.7;
          }

          .countdown-visual {
            width: 245px;
            height: 245px;

            margin: 35px auto 28px;
          }

          .countdown-number-wrap {
            width: 150px;
            height: 150px;
          }

          .countdown-number {
            font-size: 80px;
          }

          .countdown-fruit {
            width: 46px;
            height: 46px;
          }

          .countdown-fruit svg {
            width: 19px;
            height: 19px;
          }

          .countdown-footer {
            bottom: 22px;
          }

          .countdown-live-title {
            font-size: clamp(55px, 17vw, 90px);

            letter-spacing: -2px;
          }

          .countdown-live-description {
            max-width: 450px;

            font-size: 14px;
          }

          .countdown-live-icon {
            width: 62px;
            height: 62px;
          }

          .countdown-launch-fruit {
            width: 42px;
            height: 42px;
          }

          .countdown-launch-fruit.fruit-a {
            left: 7%;
          }

          .countdown-launch-fruit.fruit-b {
            right: 7%;
          }

          .countdown-launch-fruit.fruit-c {
            left: 10%;
          }

          .countdown-launch-fruit.fruit-d {
            right: 10%;
          }
        }

        @media (max-width: 480px) {
          .countdown-container {
            padding: 85px 18px 65px;
          }

          .countdown-brand {
            top: 20px;
            left: 18px;
          }

          .countdown-brand-mark {
            width: 34px;
            height: 34px;
          }

          .countdown-brand-name {
            font-size: 13px;
          }

          .countdown-eyebrow {
            font-size: 9px;

            letter-spacing: 0.15em;
          }

          .countdown-title {
            font-size: 43px;
          }

          .countdown-description {
            margin-top: 16px;

            font-size: 13px;
          }

          .countdown-visual {
            width: 220px;
            height: 220px;

            margin: 30px auto 25px;
          }

          .countdown-number-wrap {
            width: 135px;
            height: 135px;
          }

          .countdown-number {
            font-size: 72px;
          }

          .countdown-fruit {
            width: 42px;
            height: 42px;
          }

          .countdown-fruit svg {
            width: 17px;
            height: 17px;
          }

          .countdown-fruit.one {
            top: 3px;
            left: 18px;
          }

          .countdown-fruit.two {
            right: 5px;
          }

          .countdown-fruit.three {
            right: 20px;
            bottom: 15px;
          }

          .countdown-fruit.four {
            left: 20px;
            bottom: 5px;
          }

          .countdown-status {
            font-size: 9px;
          }

          .countdown-start {
            margin-top: 22px;

            padding: 13px 21px;

            font-size: 10px;
          }

          .countdown-footer {
            font-size: 8px;
          }

          .countdown-live-title {
            font-size: 52px;

            line-height: 0.9;
          }

          .countdown-live-description {
            font-size: 13px;

            line-height: 1.7;
          }

          .countdown-live-eyebrow {
            font-size: 9px;
          }

          .countdown-launch-fruit {
            width: 38px;
            height: 38px;
          }

          .countdown-launch-fruit svg {
            width: 17px;
            height: 17px;
          }
        }
      `}</style>

      <main className="countdown-page">
        <div className="countdown-container">
          <div className="countdown-brand">
            <div className="countdown-brand-mark">
              <Apple />
            </div>

            <div className="countdown-brand-name">
              Fruveto <span>Fresh Living</span>
            </div>
          </div>

          <div className="countdown-content">
            <div className="countdown-eyebrow">
              <span className="countdown-eyebrow-dot" />
              Something Fresh Is Arriving
            </div>

            <h1 className="countdown-title">
              A Fresher Way
              <br />
              Is Almost Here.
            </h1>

            <p className="countdown-description">
              Fresh fruits, nourishing juices, premium dry fruits
              and wholesome goodness — all coming together in one
              fresh experience.
            </p>

            <div className="countdown-visual">
              <div className="countdown-ring" />

              <div className="countdown-number-wrap">
                <span className="countdown-number">
                  {count}
                </span>
              </div>

              <div className="countdown-fruit one">
                <Apple />
              </div>

              <div className="countdown-fruit two">
                <Citrus />
              </div>

              <div className="countdown-fruit three">
                <Milk />
              </div>

              <div className="countdown-fruit four">
                <Sparkles />
              </div>
            </div>

            <div className="countdown-status">
              {count > 0
                ? started
                  ? "Launching in..."
                  : "Ready to launch"
                : "Welcome to Fruveto"}
            </div>

            {!started && (
              <button
                type="button"
                className="countdown-start"
                onClick={startCountdown}
              >
                Start the journey
                <ArrowRight />
              </button>
            )}
          </div>

          <div className="countdown-footer">
            Freshness • Wellness • Everyday
          </div>
        </div>

        {isLive && (
          <div className="countdown-live">
            <span className="live-particle" />
            <span className="live-particle" />
            <span className="live-particle" />
            <span className="live-particle" />
            <span className="live-particle" />
            <span className="live-particle" />

            <div className="countdown-launch-fruit fruit-a">
              <Apple />
            </div>

            <div className="countdown-launch-fruit fruit-b">
              <Citrus />
            </div>

            <div className="countdown-launch-fruit fruit-c">
              <Milk />
            </div>

            <div className="countdown-launch-fruit fruit-d">
              <Sparkles />
            </div>

            <div className="countdown-live-content">
              <div className="countdown-live-icon">
                <Sparkles />
              </div>

              <div className="countdown-live-eyebrow">
                The wait is over
              </div>

              <h2 className="countdown-live-title">
                WE ARE <span>LIVE</span>
                <br />
                NOW.
              </h2>

              <p className="countdown-live-description">
                Fresh fruits, nourishing juices, premium dry fruits
                and wholesome goodness are now waiting for you.
              </p>

              <div className="countdown-live-line" />
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Countdown;