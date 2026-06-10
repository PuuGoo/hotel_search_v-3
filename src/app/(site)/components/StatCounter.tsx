"use client";

import { useEffect, useRef, useState } from "react";

/**
 * StatCounter — đếm số tăng dần từ 0 tới giá trị đích (ease-out cubic).
 * Giá trị không có chữ số đầu (vd "∞") được giữ nguyên, không animate.
 * Tôn trọng prefers-reduced-motion: hiển thị thẳng giá trị cuối.
 */
const StatCounter: React.FC<{ value: string; durationMs?: number; delayMs?: number }> = ({
  value,
  durationMs = 1600,
  delayMs = 600,
}) => {
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(value);
  const [display, setDisplay] = useState(match ? `0${match[2]}` : value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isInt = !match[1].includes(".");
    let start = 0;

    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = target * eased;
      setDisplay((isInt ? Math.round(cur).toString() : cur.toFixed(1)) + suffix);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{display}</>;
};

export default StatCounter;
