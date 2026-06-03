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
    <div className="bg-gray-800 border-b border-gray-700 p-3">
      <div className="flex items-center gap-2">
        <FiSearch size={18} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tin nhắn..."
          className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        {query && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {results.length} kết quả
          </span>
        )}
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery("");
            setResults([]);
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <FiX size={18} />
        </button>
      </div>

      {query.trim() && results.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-4">
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
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm text-white"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-sky-400 font-medium">{msg.sender.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-gray-300 truncate">
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
