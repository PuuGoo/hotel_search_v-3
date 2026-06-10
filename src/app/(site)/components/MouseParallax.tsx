"use client";

import { useEffect, useRef } from "react";

/**
 * MouseParallax — đặt biến --par-x / --par-y (−0.5..0.5) lên root trang
 * login theo vị trí con trỏ. Các lớp ambient (.auth-par-*) dịch chuyển
 * theo hệ số sâu khác nhau tạo hiệu ứng chiều sâu.
 *
 * Áp transform lên các DIV LỚP BỌC (không animation) — các phần tử
 * trang trí bên trong tự animate transform nên không thể parallax
 * trực tiếp lên chúng.
 */
const MouseParallax: React.FC = () => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = ref.current?.closest<HTMLElement>(".relative.h-screen");
    if (!root) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        root.style.setProperty("--par-x", nx.toFixed(3));
        root.style.setProperty("--par-y", ny.toFixed(3));
      });
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={ref} style={{ display: "none" }} aria-hidden="true" />;
};

export default MouseParallax;
