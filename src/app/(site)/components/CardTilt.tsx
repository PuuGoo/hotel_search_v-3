"use client";

import React, { useEffect, useRef } from "react";

/**
 * CardTilt — 3D tilt-on-mouse + moving glare for the login glass card.
 *
 * Listens on the closest `.rounded-3xl` ancestor (the glass card) but applies
 * the transform to its OWN wrapper div. The card itself can't be transformed
 * from JS: its CSS entrance animations use `fill: both` and keep overriding
 * the `transform` property forever.
 */
const CardTilt: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only on devices with a fine pointer (skip touch)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const card = (el.closest(".rounded-3xl") as HTMLElement) ?? el;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; // 0..1
        const py = (e.clientY - r.top) / r.height; // 0..1
        const rx = (0.5 - py) * 4.5; // deg — keep subtle
        const ry = (px - 0.5) * 4.5;
        el.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
        el.classList.add("card-tilt--active");
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame.current);
      el.style.transform =
        "perspective(1100px) rotateX(0deg) rotateY(0deg)";
      el.classList.remove("card-tilt--active");
    };

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div ref={ref} className="card-tilt">
      {children}
    </div>
  );
};

export default CardTilt;
