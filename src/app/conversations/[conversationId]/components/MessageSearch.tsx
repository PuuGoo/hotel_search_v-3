"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { FullMessageType } from "../../../types";

interface MessageSearchProps {
  messages: FullMessageType[];
  onSelectMessage?: (id: string) => void;
}

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-yellow-400 text-black rounded px-0.5">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onSelectMessage }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FullMessageType[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchMessages = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      const lower = searchQuery.toLowerCase();
      const filtered = messages.filter(
        (m) => m.body && m.body.toLowerCase().includes(lower)
      );
      setResults(filtered);
    },
    [messages]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchMessages(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchMessages]);

  if (!isOpen) return null;

  return (
    <div className="bg-panel border-b border-hairline p-3">
      <div className="flex items-center gap-2">
        <FiSearch size={18} className="text-ink-soft shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tin nhắn..."
          className="flex-1 bg-fill text-ink text-sm rounded-lg px-3 py-2 placeholder-ink-soft focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        {query && (
          <span className="text-xs text-ink-soft whitespace-nowrap">
            {results.length} kết quả
          </span>
        )}
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery("");
            setResults([]);
          }}
          className="text-ink-soft hover:text-ink transition-colors"
        >
          <FiX size={18} />
        </button>
      </div>

      {query.trim() && results.length === 0 && (
        <div className="text-center text-ink-soft text-sm py-4">
          Không tìm thấy tin nhắn
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
          {results.map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                onSelectMessage?.(msg.id);
                const el = document.querySelector(`[data-message-id="${msg.id}"]`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="w-full text-left px-3 py-2 rounded-lg bg-fill hover:bg-hairline transition-colors text-sm text-ink"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-sky-400 font-medium">{msg.sender.name}</span>
                <span className="text-xs text-ink-soft">
                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-ink truncate">
                {highlightText(msg.body || "", query)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageSearch;
