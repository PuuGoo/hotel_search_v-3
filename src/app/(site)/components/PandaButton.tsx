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
}

// Inline SVG panda face — scaled down to fit inside buttons.
// The panda reacts to hover (blink, wiggle ears) and click (press) via CSS.
function PandaFace({ variant = "default" }: { variant?: PandaVariant }) {
  const isLove = variant === "love";
  const isSleep = variant === "sleep";

  return (
    <svg
      className="panda-btn-face"
      width="36"
      height="36"
      viewBox="0 0 160 165"
      aria-hidden="true"
    >
      {/* Body + head group — scales on hover/click */}
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
        {!isSleep && (
          <path
            d="M66 98 Q72 104 78 98"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
        {isSleep && (
          <path
            d="M67 99 Q72 104 77 99"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}

        {/* Cheeks */}
        <ellipse cx="46" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />
        <ellipse cx="98" cy="92" rx="8" ry="5" fill="#ffb3c1" opacity="0.55" />

        {/* Love variant: heart in hands */}
        {isLove && (
          <>
            <ellipse cx="30" cy="108" rx="12" ry="14" fill="#2a2a2a" transform="rotate(-40 30 108)" />
            <ellipse cx="114" cy="108" rx="12" ry="14" fill="#2a2a2a" transform="rotate(40 114 108)" />
            <text x="72" y="105" textAnchor="middle" style={{ fontSize: "22px", fill: "#e25490" }}>♥</text>
          </>
        )}

        {/* Sleep variant: closed eyes + zzz */}
        {isSleep && (
          <>
            <ellipse cx="38" cy="122" rx="18" ry="10" fill="#2a2a2a" transform="rotate(10 38 122)" />
            <ellipse cx="106" cy="122" rx="18" ry="10" fill="#2a2a2a" transform="rotate(-10 106 122)" />
            {/* Closed eyes */}
            <path d="M51 80 Q57 86 63 80" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M81 80 Q87 86 93 80" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            {/* Zzz */}
            <g className="panda-btn-zzz">
              <text x="116" y="60" style={{ fontSize: "14px", fill: "#7e57c2", fontWeight: 500 }}>z</text>
              <text x="124" y="50" style={{ fontSize: "11px", fill: "#7e57c2", fontWeight: 500 }}>z</text>
              <text x="131" y="42" style={{ fontSize: "9px", fill: "#7e57c2", fontWeight: 500 }}>z</text>
            </g>
          </>
        )}
      </g>

      {/* Floating hearts on hover */}
      {isLove && (
        <>
          <text className="panda-btn-heart h1" x="118" y="72" textAnchor="middle" style={{ fontSize: "16px", fill: "#e25490" }}>♥</text>
          <text className="panda-btn-heart h2" x="130" y="58" textAnchor="middle" style={{ fontSize: "13px", fill: "#e25490" }}>♥</text>
          <text className="panda-btn-heart h3" x="106" y="60" textAnchor="middle" style={{ fontSize: "10px", fill: "#e25490" }}>♥</text>
        </>
      )}
      {!isLove && !isSleep && (
        <>
          <text className="panda-btn-heart h1" x="112" y="75" textAnchor="middle" style={{ fontSize: "16px", fill: "#e25490" }}>♥</text>
          <text className="panda-btn-heart h2" x="124" y="65" textAnchor="middle" style={{ fontSize: "12px", fill: "#e25490" }}>♥</text>
          <text className="panda-btn-heart h3" x="100" y="68" textAnchor="middle" style={{ fontSize: "10px", fill: "#e25490" }}>♥</text>
        </>
      )}
    </svg>
  );
}

const PandaButton: React.FC<PandaButtonProps> = ({
  children,
  onClick,
  variant = "default",
  disabled = false,
  type = "button",
  className = "",
  loading = false,
}) => {
  const colorMap: Record<PandaVariant, string> = {
    confirm: "#2d5a27",
    love: "#b5275f",
    sleep: "#5e35b1",
    default: "#1a1a2e",
  };
  const shadowMap: Record<PandaVariant, string> = {
    confirm: "#1a3a17",
    love: "#7a1a3e",
    sleep: "#3b1f8c",
    default: "#0d0d1a",
  };

  return (
    <button
      type={type}
      className={`panda-btn ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={typeof children === "string" ? children : undefined}
    >
      <PandaFace variant={variant} />
      <span
        className="panda-btn-label"
        style={{
          background: colorMap[variant],
          boxShadow: `0 2px 0 ${shadowMap[variant]}`,
        }}
      >
        {loading ? (
          <span className="panda-btn-spinner" />
        ) : (
          children
        )}
      </span>
    </button>
  );
};

export default PandaButton;
