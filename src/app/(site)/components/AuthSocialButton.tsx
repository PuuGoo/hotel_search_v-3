"use client";

import { useCallback } from "react";
import { IconType } from "react-icons";

interface AuthSocialButtonProps {
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  provider?: "github" | "google";
}

const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  icon: Icon,
  onClick,
  disabled,
  label,
  provider,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Panda-green ripple at exact click point
      const ripple = document.createElement("span");
      ripple.className = "auth-social-btn__ripple";
      ripple.style.cssText = `left:${x}px;top:${y}px;`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());

      // Spawn mini paw trail particles
      const pawEmojis = ["🐾", "🌿", "✨"];
      for (let i = 0; i < 3; i++) {
        const paw = document.createElement("span");
        paw.textContent = pawEmojis[i];
        const angle = -60 + i * 60;
        const dist = 20 + Math.random() * 15;
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist - 10;
        paw.style.cssText = `
          position:absolute;
          left:${x}px;top:${y}px;
          font-size:10px;
          pointer-events:none;
          z-index:20;
          transform:translate(-50%,-50%);
          animation:confettiBurst 0.5s ease-out forwards;
          --angle:${angle + 180}deg;
        `;
        btn.appendChild(paw);
        paw.addEventListener("animationend", () => paw.remove());
      }

      onClick();
    },
    [onClick, disabled]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="auth-social-btn"
      data-provider={provider}
    >
      {/* Shimmer overlay */}
      <span className="auth-social-btn__shimmer" aria-hidden="true" />

      {/* Platform badge indicator */}
      {provider && (
        <span
          className="auth-social-btn__badge"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 5,
            left: 8,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: provider === "github" ? "#24292f" : "#4285F4",
            opacity: 0.45,
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        />
      )}

      <span className="auth-social-btn__icon">
        <Icon />
      </span>
      {label && <span className="auth-social-btn__label">{label}</span>}

      {/* Panda paw print watermark on hover */}
      <span className="auth-social-btn__paw" aria-hidden="true">🐾</span>
    </button>
  );
};

export default AuthSocialButton;
