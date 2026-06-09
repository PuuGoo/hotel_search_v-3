"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * AutoScale — wraps content and scales it down to fit the viewport height.
 * Preserves full visual quality (panda, animations, etc.) while ensuring
 * the login form never requires scrolling.
 */
const AutoScale: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // Temporarily remove transform to measure natural height
    el.style.transform = "none";
    const naturalH = el.scrollHeight;
    const vh = window.innerHeight;
    // Leave 24px breathing room top+bottom
    const available = vh - 48;
    const newScale = naturalH > available ? available / naturalH : 1;
    setScale(Math.min(1, Math.max(0.35, newScale)));
  }, []);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

  return (
    <div
      ref={containerRef}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "50% 0",
        width: `${100 / scale}%`,
        transition: "transform 0.2s ease",
      }}
    >
      {children}
    </div>
  );
};

export default AutoScale;
