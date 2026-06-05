"use client";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
  fullRadius?: boolean;
}

export default function Skeleton({
  className = "",
  width = "w-full",
  height = "h-4",
  rounded = false,
  fullRadius = false,
}: SkeletonProps) {
  const radius = fullRadius ? "rounded-full" : rounded ? "rounded-lg" : "rounded";

  return (
    <div
      className={`bg-gray-700/50 animate-pulse ${radius} ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  );
}
