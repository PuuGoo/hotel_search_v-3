"use client";

import React, { useCallback } from "react";

interface PandaButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  labelStyle?: React.CSSProperties;
  loading?: boolean;
}

const PandaButton: React.FC<PandaButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  labelStyle,
  loading = false,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      // Ripple effect
      const btn = e.currentTarget;
      const old = btn.querySelector(".ripple-el");
      if (old) old.remove();
      const r = document.createElement("span");
      r.className = "ripple-el";
      r.style.cssText =
        "position:absolute;left:50%;top:50%;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;background:#4caf50;opacity:0.35;pointer-events:none;animation:rippleOut 0.55s ease forwards;z-index:10;";
      btn.appendChild(r);
      r.addEventListener("animationend", () => r.remove());
      onClick?.();
    },
    [onClick, disabled, loading]
  );

  return (
    <button
      className="panda-svg-btn"
      type={type}
      aria-label={typeof children === "string" ? children : undefined}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      <svg width="160" height="165" viewBox="0 0 160 165">
        <ellipse className="panda-svg-shadow" cx="80" cy="148" rx="52" ry="10" />
        <g className="panda-svg-body">
          {/* Arms */}
          <ellipse cx="34" cy="118" rx="14" ry="10" fill="#2a2a2a" transform="rotate(-20 34 118)" />
          <ellipse cx="108" cy="116" rx="14" ry="10" fill="#2a2a2a" transform="rotate(20 108 116)" />
          {/* Body */}
          <ellipse cx="72" cy="122" rx="42" ry="36" fill="#fff" stroke="#222" strokeWidth="1.5" />
          <ellipse cx="72" cy="128" rx="20" ry="16" fill="#e8e8e8" />
          {/* Head */}
          <ellipse cx="72" cy="82" rx="38" ry="36" fill="#fff" stroke="#222" strokeWidth="1.5" />
          {/* Ears */}
          <g className="panda-svg-ear-l">
            <ellipse cx="42" cy="52" rx="14" ry="13" fill="#2a2a2a" stroke="#222" strokeWidth="1" />
          </g>
          <g className="panda-svg-ear-r">
            <ellipse cx="102" cy="52" rx="14" ry="13" fill="#2a2a2a" stroke="#222" strokeWidth="1" />
          </g>
          {/* Eye patches */}
          <ellipse cx="57" cy="80" rx="13" ry="12" fill="#2a2a2a" />
          <ellipse cx="87" cy="80" rx="13" ry="12" fill="#2a2a2a" />
          {/* Eyes */}
          <g className="panda-svg-eye-l">
            <ellipse cx="57" cy="80" rx="6" ry="6" fill="#fff" />
            <ellipse cx="59" cy="79" rx="3" ry="3" fill="#111" />
            <ellipse cx="60" cy="78" rx="1.2" ry="1.2" fill="#fff" />
          </g>
          <g className="panda-svg-eye-r">
            <ellipse cx="87" cy="80" rx="6" ry="6" fill="#fff" />
            <ellipse cx="89" cy="79" rx="3" ry="3" fill="#111" />
            <ellipse cx="90" cy="78" rx="1.2" ry="1.2" fill="#fff" />
          </g>
          {/* Nose + mouth */}
          <ellipse cx="72" cy="93" rx="5" ry="3.5" fill="#2a2a2a" />
          <path d="M66 98 Q72 104 78 98" fill="none" stroke="#2a2a2a" strokeWidth="1.8" strokeLinecap="round" />
          {/* Cheeks */}
          <ellipse cx="46" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />
          <ellipse cx="98" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />
        </g>
        {/* Hearts */}
        <g>
          <text className="panda-svg-heart panda-svg-h1" x="112" y="75" textAnchor="middle" style={{ fontSize: "16px" }}>♥</text>
          <text className="panda-svg-heart panda-svg-h2" x="124" y="65" textAnchor="middle" style={{ fontSize: "12px" }}>♥</text>
          <text className="panda-svg-heart panda-svg-h3" x="100" y="68" textAnchor="middle" style={{ fontSize: "10px" }}>♥</text>
        </g>
      </svg>
      <span className="panda-svg-label" style={labelStyle}>
        {loading ? (
          <span className="panda-svg-spinner" />
        ) : (
          children
        )}
      </span>
    </button>
  );
};

export default PandaButton;
