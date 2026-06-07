"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  lazy?: boolean;
  clickToZoom?: boolean;
  onImageClick?: () => void;
  cdn?: boolean;
}

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+";

const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width = 288,
  height = 288,
  className = "",
  quality = 75,
  lazy = true,
  clickToZoom = false,
  onImageClick,
  cdn = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageSrc = cdn && typeof window !== "undefined" ? (() => {
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL;
    if (cdnBase && src.startsWith("/")) {
      return `${cdnBase.replace(/\/+$/, "")}${src}`;
    }
    return src;
  })() : src;

  const handleClick = useCallback(() => {
    if (clickToZoom && onImageClick) {
      onImageClick();
    } else if (onImageClick) {
      onImageClick();
    }
  }, [clickToZoom, onImageClick]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-lightgray rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2 text-ink-soft">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <span className="text-xs">Không thể tải ảnh</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${clickToZoom ? "cursor-pointer" : ""}`} onClick={handleClick}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-lightgray rounded-lg animate-pulse"
          style={{ width, height }}
        >
          <svg
            className="w-8 h-8 text-ink dark:text-gray-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        loading={lazy ? "lazy" : "eager"}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    </div>
  );
};

export default ImageOptimizer;
