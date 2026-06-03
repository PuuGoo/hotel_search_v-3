"use client";

import { useState } from "react";
import { HiFaceSmile } from "react-icons/hi2";
import ReactionPicker from "./ReactionPicker";

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onToggle: (emoji: string) => void;
  isOwn: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onToggle,
  isOwn,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className="relative flex items-center gap-1 mt-1 flex-wrap">
      {entries.map(([emoji, users]) => {
        const hasReacted = users.includes(currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              transition-colors border
              ${
                hasReacted
                  ? isOwn
                    ? "bg-sky-500/30 border-sky-400/50 text-sky-200"
                    : "bg-sky-100 dark:bg-sky-900/40 border-sky-400 dark:border-sky-500/50 text-sky-600 dark:text-sky-300"
                  : isOwn
                  ? "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }
            `}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className={`
            flex items-center justify-center w-6 h-6 rounded-full
            transition-colors text-xs
            ${
              isOwn
                ? "text-white/50 hover:text-white/80 hover:bg-white/10"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
          title="Thêm phản ứng"
        >
          <HiFaceSmile size={16} />
        </button>
        <ReactionPicker
          isOpen={pickerOpen}
          onSelect={onToggle}
          onClose={() => setPickerOpen(false)}
        />
      </div>
    </div>
  );
};

export default MessageReactions;
