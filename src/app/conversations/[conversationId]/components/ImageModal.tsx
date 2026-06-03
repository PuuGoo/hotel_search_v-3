"use client";

import Lightbox from "../../../components/Lightbox";

interface ImageModalProps {
  isOpen?: boolean;
  onClose: () => void;
  src?: string | null;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, src }) => {
  if (!src) {
    return null;
  }

  return (
    <Lightbox
      images={[src]}
      initialIndex={0}
      isOpen={!!isOpen}
      onClose={onClose}
    />
  );
};

export default ImageModal;
