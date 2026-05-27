import { useEffect, useState } from "react";
import "../styles/LoginSplash.css";

export default function LoginSplash({ onComplete }) {
  const [phase, setPhase] = useState("enter"); // enter → hold → exit

  useEffect(() => {
    // After the enter animation settles, hold briefly then exit
    const holdTimer = setTimeout(() => setPhase("exit"), 2200);
    return () => clearTimeout(holdTimer);
  }, []);

  useEffect(() => {
    if (phase !== "exit") return;
    // Once exit animation finishes, notify parent
    const doneTimer = setTimeout(onComplete, 700);
    return () => clearTimeout(doneTimer);
  }, [phase, onComplete]);

  return (
    <div className={`splash-root splash-${phase}`}>
      {/* Animated background rings */}
      <div className="splash-ring splash-ring-1" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-ring splash-ring-3" />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="splash-particle" style={{ "--i": i }} />
      ))}

      <div className="splash-content">
        {/* Brain/neural icon */}
        <div className="splash-icon-wrap">
          <svg className="splash-icon" viewBox="0 0 80 80" fill="none">
            {/* Neural nodes */}
            <circle
              cx="40"
              cy="14"
              r="5"
              fill="white"
              opacity="0.9"
              className="s-node n1"
            />
            <circle
              cx="62"
              cy="28"
              r="4"
              fill="white"
              opacity="0.8"
              className="s-node n2"
            />
            <circle
              cx="66"
              cy="52"
              r="5"
              fill="white"
              opacity="0.9"
              className="s-node n3"
            />
            <circle
              cx="50"
              cy="68"
              r="4"
              fill="white"
              opacity="0.8"
              className="s-node n4"
            />
            <circle
              cx="30"
              cy="68"
              r="4"
              fill="white"
              opacity="0.8"
              className="s-node n5"
            />
            <circle
              cx="14"
              cy="52"
              r="5"
              fill="white"
              opacity="0.9"
              className="s-node n6"
            />
            <circle
              cx="18"
              cy="28"
              r="4"
              fill="white"
              opacity="0.8"
              className="s-node n7"
            />
            <circle cx="40" cy="40" r="7" fill="white" className="s-node n8" />
            {/* Neural connections */}
            <line
              x1="40"
              y1="14"
              x2="40"
              y2="33"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="62"
              y1="28"
              x2="46"
              y2="36"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="66"
              y1="52"
              x2="47"
              y2="43"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="50"
              y1="68"
              x2="43"
              y2="47"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="30"
              y1="68"
              x2="37"
              y2="47"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="14"
              y1="52"
              x2="33"
              y2="43"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
            <line
              x1="18"
              y1="28"
              x2="34"
              y2="36"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
              className="s-edge"
            />
          </svg>
          <div className="splash-icon-glow" />
        </div>

        <h1 className="splash-title">
          <span className="splash-title-neuro">Neuro</span>
          <span className="splash-title-path">Path</span>
        </h1>

        <p className="splash-subtitle">Empowering every learner's journey</p>

        {/* Progress bar */}
        <div className="splash-bar-track">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
