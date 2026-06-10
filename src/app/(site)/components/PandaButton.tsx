"use client";

import React, { useCallback, useEffect, useRef } from "react";

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
  const btnRef = useRef<HTMLButtonElement>(null);

  // Rainbow hue-shift on idle via CSS var cycling
  useEffect(() => {
    if (!btnRef.current || disabled || loading) return;
    let frame: number;
    let hue = 0;
    const cycle = () => {
      hue = (hue + 0.3) % 30; // subtle ±15deg range
      if (btnRef.current) {
        btnRef.current.style.setProperty("--btn-hue", `${hue - 15}deg`);
      }
      frame = requestAnimationFrame(cycle);
    };
    frame = requestAnimationFrame(cycle);
    return () => cancelAnimationFrame(frame);
  }, [disabled, loading]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      const btn = e.currentTarget;

      // Ripple effect (green radial)
      const old = btn.querySelector(".ripple-el");
      if (old) old.remove();
      const r = document.createElement("span");
      r.className = "ripple-el";
      r.style.cssText =
        "position:absolute;left:50%;top:50%;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;background:radial-gradient(circle,rgba(76,175,80,0.5),rgba(45,90,39,0.2));opacity:0.45;pointer-events:none;animation:rippleOut 0.55s ease forwards;z-index:10;";
      btn.appendChild(r);
      r.addEventListener("animationend", () => r.remove());

      // Confetti + emoji burst
      const confettiColors = ["#4caf50", "#ffb3c1", "#2f80ed", "#f2c84b", "#ff8ca2", "#fff", "#a8e6a0", "#ffd166"];
      const confettiShapes = ["🐾", "🌿", "🎋", "✨", "💚", "⭐", "🌸"];
      for (let i = 0; i < 12; i++) {
        const c = document.createElement("span");
        const angle = (i / 12) * 360;
        const isEmoji = i < 4;
        if (isEmoji) {
          c.textContent = confettiShapes[i % confettiShapes.length];
          c.style.cssText = `
            position:absolute;left:50%;top:28%;
            font-size:${10 + Math.random() * 6}px;pointer-events:none;z-index:20;
            transform:translate(-50%,-50%);
            animation:confettiBurst 0.7s ease-out forwards;
            --angle:${angle}deg;
          `;
        } else {
          const color = confettiColors[i % confettiColors.length];
          c.style.cssText = `
            position:absolute;left:50%;top:28%;
            width:${3 + Math.random() * 5}px;height:${3 + Math.random() * 5}px;
            border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
            background:${color};pointer-events:none;z-index:20;
            transform:translate(-50%,-50%);
            animation:confettiBurst 0.65s ease-out forwards;
            --angle:${angle}deg;
          `;
        }
        btn.appendChild(c);
        c.addEventListener("animationend", () => c.remove());
      }

      // Submit burst glow ring
      const burst = document.createElement("span");
      burst.style.cssText = `
        position:absolute;left:50%;top:36%;
        width:60px;height:60px;margin:-30px 0 0 -30px;
        border-radius:50%;
        border:2.5px solid rgba(76,175,80,0.6);
        pointer-events:none;z-index:15;
        animation:rippleOut 0.5s ease-out forwards;
      `;
      btn.appendChild(burst);
      burst.addEventListener("animationend", () => burst.remove());

      onClick?.();
    },
    [onClick, disabled, loading]
  );

  return (
    <button
      ref={btnRef}
      className={`panda-svg-btn${loading ? " panda-svg-btn--loading" : ""}`}
      type={type}
      aria-label={typeof children === "string" ? children : undefined}
      onClick={handleClick}
      disabled={disabled || loading}
      style={{ "--btn-hue": "0deg" } as React.CSSProperties}
    >
      <svg
        width="160"
        height="165"
        viewBox="0 0 160 165"
        style={{ filter: `hue-rotate(var(--btn-hue, 0deg))` }}
      >
        <ellipse className="panda-svg-shadow" cx="80" cy="148" rx="52" ry="10" />
        <g className="panda-svg-body">
          {/* Tail — wags on hover */}
          <ellipse
            className="panda-svg-tail"
            cx="72" cy="151" rx="11" ry="9"
            fill="#e8e8e8" stroke="#ddd" strokeWidth="0.8"
          />
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
            <ellipse cx="42" cy="53" rx="7" ry="6" fill="#5a3a3a" opacity="0.4" />
          </g>
          <g className="panda-svg-ear-r">
            <ellipse cx="102" cy="52" rx="14" ry="13" fill="#2a2a2a" stroke="#222" strokeWidth="1" />
            <ellipse cx="102" cy="53" rx="7" ry="6" fill="#5a3a3a" opacity="0.4" />
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
          {/* Glasses (subtle) */}
          <circle cx="57" cy="80" r="8" fill="none" stroke="rgba(100,80,60,0.22)" strokeWidth="1.2" />
          <circle cx="87" cy="80" r="8" fill="none" stroke="rgba(100,80,60,0.22)" strokeWidth="1.2" />
          <line x1="65" y1="80" x2="79" y2="80" stroke="rgba(100,80,60,0.22)" strokeWidth="1.2" />

          {/* Loading indicator: spinning ring overlay */}
          {loading && (
            <circle
              cx="72" cy="82" r="42"
              fill="none"
              stroke="rgba(76,175,80,0.35)"
              strokeWidth="2.5"
              strokeDasharray="40 80"
              style={{ animation: "panda-orig-spin 1s linear infinite", transformOrigin: "72px 82px" }}
            />
          )}
        </g>
        {/* Hearts — fly up on hover */}
        <g>
          <text className="panda-svg-heart panda-svg-h1" x="112" y="75" textAnchor="middle" style={{ fontSize: "16px" }}>♥</text>
          <text className="panda-svg-heart panda-svg-h2" x="124" y="65" textAnchor="middle" style={{ fontSize: "12px" }}>♥</text>
          <text className="panda-svg-heart panda-svg-h3" x="100" y="68" textAnchor="middle" style={{ fontSize: "10px" }}>♥</text>
        </g>
        {/* Loading paw prints that orbit */}
        {loading && (
          <g>
            <text x="18" y="28" fontSize="10" opacity="0.5" style={{ animation: "float-sway 1s ease-in-out infinite" }}>🐾</text>
            <text x="118" y="26" fontSize="8" opacity="0.4" style={{ animation: "float-sway 1.2s ease-in-out infinite 0.4s" }}>🐾</text>
            <text x="68" y="18" fontSize="9" opacity="0.35" style={{ animation: "float-sway 0.9s ease-in-out infinite 0.2s" }}>🌿</text>
          </g>
        )}
      </svg>

      <span className="panda-svg-label" style={labelStyle}>
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="panda-svg-spinner" />
            <span style={{ fontSize: 12, opacity: 0.8 }}>Đang xử lý…</span>
          </span>
        ) : (
          children
        )}
      </span>

      {loading && (
        <div className="panda-loading-dots" aria-hidden="true" style={{ marginTop: 8 }}>
          <span className="panda-loading-dot" />
          <span className="panda-loading-dot" />
          <span className="panda-loading-dot" />
        </div>
      )}
    </button>
  );
};

export default PandaButton;
