"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiClock, FiSearch, FiX } from "react-icons/fi";
import { useSearchHistory } from "../contexts/SearchHistoryContext";

interface SearchSuggestionsProps {
  query: string;
  onSelect: (query: string) => void;
  isVisible: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Called when user starts interacting with suggestions (mousedown) */
  onInteractionStart?: () => void;
}

const SearchSuggestions = ({
  query,
  onSelect,
  isVisible,
  onClose,
  inputRef,
  onInteractionStart,
}: SearchSuggestionsProps) => {
  const { history, removeEntry, clearAll } = useSearchHistory();
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Sync aria-activedescendant on the input element
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (isVisible && activeIndex >= 0) {
      input.setAttribute("aria-activedescendant", `suggestion-${activeIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }, [activeIndex, isVisible, inputRef]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeEntry(id);
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

    const input = inputRef.current;
    if (input) {
      input.addEventListener("keydown", handleKeyDown);
      return () => input.removeEventListener("keydown", handleKeyDown);
    }
  }, [isVisible, suggestions, activeIndex, onSelect, onClose, inputRef]);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-panel border border-hairline rounded-lg shadow-lg overflow-hidden"
      role="listbox"
      aria-label="Gợi ý tìm kiếm"
      id="search-suggestions-listbox"
    >
      <div className="px-3 py-2 border-b border-hairline flex items-center justify-between">
        <span className="text-xs text-ink-soft font-medium">
          {query.trim() ? "Gợi ý tìm kiếm" : "Tìm kiếm gần đây"}
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onInteractionStart?.();
          }}
          onClick={async () => {
            await clearAll();
            onClose();
          }}
          className="text-xs text-ink-soft hover:text-red-400 transition-colors"
        >
          Xóa lịch sử
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((entry, index) => (
          <div
            key={entry.id}
            onClick={() => onSelect(entry.query)}
            onMouseDown={(e) => {
              e.preventDefault();
              onInteractionStart?.();
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group ${
              index === activeIndex
                ? "bg-fill text-ink"
                : "text-ink hover:bg-fill"
            }`}
            role="option"
            aria-selected={index === activeIndex}
            id={`suggestion-${index}`}
          >
            {query.trim() ? (
              <FiSearch className="w-4 h-4 text-ink-soft flex-shrink-0" />
            ) : (
              <FiClock className="w-4 h-4 text-ink-soft flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-sm">{entry.query}</span>
            <button
              type="button"
              onClick={(e) => handleDelete(e, entry.id)}
              className={`p-1 rounded transition-colors ${
                index === activeIndex
                  ? "text-ink-soft hover:text-red-400 opacity-100"
                  : "text-ink-soft hover:text-red-400 opacity-0 group-hover:opacity-100"
              }`}
              aria-label={`Xóa gợi ý: ${entry.query}`}
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SearchSuggestions);
