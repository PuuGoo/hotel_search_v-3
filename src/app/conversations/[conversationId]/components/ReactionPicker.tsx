"use client";

import { useEffect, useRef } from "react";

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "👀"];

const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, isOpen, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="
        absolute bottom-full left-0 mb-1
        bg-panel rounded-full px-2 py-1
        flex items-center gap-1
        shadow-lg z-50
      "
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="
            text-lg hover:scale-125 transition-transform
            p-1 rounded-full hover:bg-fill
          "
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
