"use client";

import { useRef, useState } from "react";
import { FiTrash2, FiArchive } from "react-icons/fi";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onDelete,
  onArchive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const maxSwipe = -120;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    const clamped = Math.max(maxSwipe, Math.min(0, diff));
    currentX.current = clamped;
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (currentX.current < maxSwipe / 2) {
      setOffsetX(maxSwipe);
    } else {
      setOffsetX(0);
    }
  };

  const handleDelete = () => {
    setOffsetX(0);
    onDelete?.();
  };

  const handleArchive = () => {
    setOffsetX(0);
    onArchive?.();
  };

  const hasActions = onDelete || onArchive;

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center"
      >
        {onArchive && (
          <button
            onClick={handleArchive}
            className="
              touch-target
              flex
              items-center
              justify-center
              w-16
              h-full
              bg-blue-500
              text-white
              transition-colors
            "
          >
            <FiArchive size={20} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="
              touch-target
              flex
              items-center
              justify-center
              w-16
              h-full
              bg-red-500
              text-white
              transition-colors
            "
          >
            <FiTrash2 size={20} />
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className={
          hasActions
            ? "relative z-10 bg-white dark:bg-dusk touch-pan-y"
            : ""
        }
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.3s ease",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;
