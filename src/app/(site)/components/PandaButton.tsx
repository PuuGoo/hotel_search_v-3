"use client";

import React from "react";

type PandaVariant = "confirm" | "love" | "sleep" | "default";

interface PandaButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: PandaVariant;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

// Inline SVG panda face — larger, positioned as button icon
function PandaFace() {
  return (
    <svg
      className="panda-btn-face"
      width="48"
      height="48"
      viewBox="0 0 160 165"
      aria-hidden="true"
    >
      <g className="panda-btn-body">
        {/* Ears */}
        <g className="panda-btn-ear-l">
          <ellipse cx="42" cy="52" rx="14" ry="13" fill="#2a2a2a" />
        </g>
        <g className="panda-btn-ear-r">
          <ellipse cx="102" cy="52" rx="14" ry="13" fill="#2a2a2a" />
        </g>
        {/* Head */}
        <ellipse cx="72" cy="82" rx="38" ry="36" fill="#fff" stroke="#222" strokeWidth="1.5" />
        {/* Eye patches */}
        <ellipse cx="57" cy="80" rx="13" ry="12" fill="#2a2a2a" />
        <ellipse cx="87" cy="80" rx="13" ry="12" fill="#2a2a2a" />
        {/* Eyes */}
        <g className="panda-btn-eye-l">
          <ellipse cx="57" cy="80" rx="6" ry="6" fill="#fff" />
          <ellipse cx="59" cy="79" rx="3" ry="3" fill="#111" />
          <ellipse cx="60" cy="78" rx="1.2" ry="1.2" fill="#fff" />
        </g>
        <g className="panda-btn-eye-r">
          <ellipse cx="87" cy="80" rx="6" ry="6" fill="#fff" />
          <ellipse cx="89" cy="79" rx="3" ry="3" fill="#111" />
          <ellipse cx="90" cy="78" rx="1.2" ry="1.2" fill="#fff" />
        </g>
        {/* Nose */}
        <ellipse cx="72" cy="93" rx="5" ry="3.5" fill="#2a2a2a" />
        {/* Mouth */}
        <path d="M66 98 Q72 104 78 98" fill="none" stroke="#2a2a2a" strokeWidth="1.8" strokeLinecap="round" />
        {/* Cheeks */}
        <ellipse cx="46" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />
        <ellipse cx="98" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />
      </g>
      {/* Hearts float on hover */}
      <text className="panda-btn-heart h1" x="112" y="75" textAnchor="middle" style={{ fontSize: "16px", fill: "#fff" }}>♥</text>
      <text className="panda-btn-heart h2" x="124" y="65" textAnchor="middle" style={{ fontSize: "12px", fill: "#fff" }}>♥</text>
    </svg>
  );
}

const colorMap: Record<PandaVariant, { bg: string; hover: string; shadow: string }> = {
  confirm: { bg: "#2d5a27", hover: "#3a7233", shadow: "#1a3a17" },
  love:    { bg: "#b5275f", hover: "#d43070", shadow: "#7a1a3e" },
  sleep:   { bg: "#5e35b1", hover: "#7040c8", shadow: "#3b1f8c" },
  default: { bg: "#1a1a2e", hover: "#2a2a40", shadow: "#0d0d1a" },
};

const PandaButton: React.FC<PandaButtonProps> = ({
  children,
  onClick,
  variant = "default",
  disabled = false,
  type = "button",
  className = "",
  loading = false,
  fullWidth = false,
}) => {
  const colors = colorMap[variant];

  return (
    <button
      type={type}
      className={`panda-btn ${fullWidth ? "panda-btn-full" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: colors.bg,
        boxShadow: `0 3px 0 ${colors.shadow}, 0 6px 20px rgba(0,0,0,0.15)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.hover;
        e.currentTarget.style.boxShadow = `0 3px 0 ${colors.shadow}, 0 10px 30px rgba(0,0,0,0.25)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bg;
        e.currentTarget.style.boxShadow = `0 3px 0 ${colors.shadow}, 0 6px 20px rgba(0,0,0,0.15)`;
      }}
    >
      {loading ? (
        <span className="panda-btn-spinner" />
      ) : (
        <PandaFace />
      )}
      <span className="panda-btn-text">{children}</span>
    </button>
  );
};

export default PandaButton;
