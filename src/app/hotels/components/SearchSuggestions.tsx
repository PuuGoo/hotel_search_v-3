"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { FiClock, FiSearch, FiX } from "react-icons/fi";

interface SearchHistoryEntry {
  id: string;
  query: string;
  engine?: string | null;
  createdAt: string;
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (query: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

const SearchSuggestions = ({
  query,
  onSelect,
  isVisible,
  onClose,
}: SearchSuggestionsProps) => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get("/api/search/history")
      .then((res) => setHistory(res.data.history || []))
      .catch(() => {});
  }, []);

  const filtered = query.trim()
    ? history.filter(
        (entry) =>
          entry.query.toLowerCase().includes(query.toLowerCase()) &&
          entry.query.toLowerCase() !== query.toLowerCase()
      )
    : history;

  const suggestions = filtered.slice(0, 8);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, handleClickOutside]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await axios.delete("/api/search/history", { data: { id } });
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            e.preventDefault();
            onSelect(suggestions[activeIndex].query);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    const input = document.querySelector(
      'input[type="text"]'
    ) as HTMLElement | null;
    if (input) {
      input.addEventListener("keydown", handleKeyDown);
      return () => input.removeEventListener("keydown", handleKeyDown);
    }
  });

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">
          {query.trim() ? "Gợi ý tìm kiếm" : "Tìm kiếm gần đây"}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await axios.delete("/api/search/history");
              setHistory([]);
              onClose();
            } catch {}
          }}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Xóa lịch sử
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((entry, index) => (
          <div
            key={entry.id}
            onClick={() => onSelect(entry.query)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
              index === activeIndex
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-750"
            }`}
          >
            {query.trim() ? (
              <FiSearch className="w-4 h-4 text-gray-500 flex-shrink-0" />
            ) : (
              <FiClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-sm">{entry.query}</span>
            <button
              type="button"
              onClick={(e) => handleDelete(e, entry.id)}
              className={`p-1 rounded transition-colors ${
                index === activeIndex
                  ? "text-gray-400 hover:text-red-400 opacity-100"
                  : "text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              }`}
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestions;
