"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * AutoScale — wraps content and scales it to fit viewport height.
 * Uses CSS `zoom` which actually resizes the layout box (unlike transform:scale
 * which only visual-scales and leaves the original box intact, breaking layout).
 */
const AutoScale: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const recalc = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // Reset zoom to measure natural height
    (el.style as any).zoom = "1";
    // Use requestAnimationFrame to wait for layout recalc
    requestAnimationFrame(() => {
      const naturalH = el.scrollHeight;
      const vh = window.innerHeight;
      // Leave 32px breathing room
      const available = vh - 64;
      if (naturalH > available) {
        setZoom(Math.max(0.4, available / naturalH));
      } else {
        setZoom(1);
      }
    });
  }, []);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

  return (
    <div
      ref={containerRef}
      style={{ zoom } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default AutoScale;
