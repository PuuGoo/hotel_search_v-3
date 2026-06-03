"use client";

import { useState, useCallback } from "react";
import ImageOptimizer from "./ImageOptimizer";
import Lightbox from "./Lightbox";

interface ImageGalleryProps {
  images: string[];
  onImageClick?: (index: number) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onImageClick }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = useCallback(
    (index: number) => {
      if (onImageClick) {
        onImageClick(index);
      } else {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    },
    [onImageClick]
  );

  const getGridClass = () => {
    if (images.length === 1) return "grid-cols-1";
    if (images.length === 2) return "grid-cols-2";
    return "grid-cols-3";
  };

  const getImageSize = () => {
    if (images.length === 1) return { width: 800, height: 500 };
    if (images.length === 2) return { width: 400, height: 300 };
    return { width: 300, height: 200 };
  };

  const { width, height } = getImageSize();

  return (
    <>
      <div className={`grid ${getGridClass()} gap-2 rounded-lg overflow-hidden`}>
        {images.map((src, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-lg ${
              images.length === 1 ? "aspect-video" : "aspect-square"
            }`}
          >
            <ImageOptimizer
              src={src}
              alt={`Hình ảnh ${index + 1}`}
              width={width}
              height={height}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              clickToZoom
              onImageClick={() => handleImageClick(index)}
            />
          </div>
        ))}
      </div>

      <Lightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default ImageGallery;
