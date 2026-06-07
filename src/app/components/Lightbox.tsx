"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FiX, FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from "react-icons/fi";

interface LightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

const Lightbox: React.FC<LightboxProps> = ({ images, initialIndex, isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, isOpen]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setZoom(1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating, images.length]);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setZoom(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating, images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goToPrev, goToNext, handleZoomIn, handleZoomOut]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        title="Đóng"
      >
        <FiX size={24} />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
        <span className="text-ink/80 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      <div className="absolute top-4 right-16 z-50 flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Thu nhỏ"
        >
          <FiZoomOut size={18} />
        </button>
        <span className="text-ink/60 text-xs min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Phóng to"
        >
          <FiZoomIn size={18} />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Ảnh trước"
          >
            <FiChevronLeft size={28} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Ảnh tiếp"
          >
            <FiChevronRight size={28} />
          </button>
        </>
      )}

      <div className="flex items-center justify-center w-full h-full p-16 overflow-hidden">
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          <Image
            src={images[currentIndex]}
            alt={`Ảnh ${currentIndex + 1}`}
            width={1200}
            height={800}
            className="max-h-[85vh] max-w-[90vw] object-contain select-none"
            draggable={false}
            priority
          />
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur-sm">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setZoom(1);
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              title={`Ảnh ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Lightbox;
