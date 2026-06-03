"use client";

import { useRef, useState, useCallback } from "react";
import { FiLoader } from "react-icons/fi";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const threshold = 80;

  const getScrollTop = () => {
    if (!containerRef.current) return 0;
    return containerRef.current.scrollTop;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (getScrollTop() > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      if (getScrollTop() > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        const dampened = Math.min(diff * 0.5, 150);
        setPullDistance(dampened);
      }
    },
    [refreshing]
  );

  const handleTouchEnd = async () => {
    if (!isPulling.current || refreshing) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const spinnerRotation = refreshing ? "animate-spin" : "";
  const showIndicator = pullDistance > 0 || refreshing;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: showIndicator ? pullDistance : 0 }}
      >
        <FiLoader
          size={24}
          className={`text-sky-500 ${spinnerRotation}`}
        />
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
