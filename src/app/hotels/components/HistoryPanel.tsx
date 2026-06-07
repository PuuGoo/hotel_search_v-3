"use client";

import React, { useState, useEffect } from "react";
import {
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiX,
  FiSearch,
  FiBookmark,
  FiFolder,
} from "react-icons/fi";
import { useSearchHistory } from "../contexts/SearchHistoryContext";

interface HistoryPanelProps {
  onSelect: (query: string) => void;
}

interface SavedSearch {
  query: string;
  engines: string[];
  filters: Record<string, unknown>;
  savedAt: string;
}

const HistoryPanel = ({ onSelect }: HistoryPanelProps) => {
  const { history, loading, clearAll, removeEntry } = useSearchHistory();
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("saved-searches") || "[]");
      if (Array.isArray(stored)) setSavedSearches(stored);
    } catch {
      // ignore
    }
  }, []);

  // Close history panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const handleClearAll = async () => {
    await clearAll();
  };

  const handleDeleteOne = async (id: string) => {
    await removeEntry(id);
  };

  const handleDeleteSaved = (index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem("saved-searches", JSON.stringify(updated));
  };

  const handleLoadSaved = (entry: SavedSearch) => {
    onSelect(entry.query);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  };

  return (
    <div className="bg-panel border border-hairline rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-ink hover:bg-fill transition-colors"
        aria-expanded={isExpanded}
        aria-label="Lịch sử tìm kiếm"
      >
        <div className="flex items-center gap-2">
          <FiClock className="w-4 h-4 text-ink" />
          <span className="text-sm font-medium">Lịch sử tìm kiếm</span>
          {history.length > 0 && (
            <span className="text-xs text-ink-soft">({history.length})</span>
          )}
          {savedSearches.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-900/50 text-sky-400 rounded text-xs">
              <FiBookmark className="w-2.5 h-2.5" />
              {savedSearches.length} đã lưu
            </span>
          )}
        </div>
        {isExpanded ? (
          <FiChevronUp className="w-4 h-4 text-ink" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-ink" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-hairline">
          {/* Saved Searches Section */}
          {savedSearches.length > 0 && (
            <div className="border-b border-hairline">
              <div className="flex items-center gap-2 px-4 py-2 bg-fill">
                <FiFolder className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-medium text-sky-400">
                  Tìm kiếm đã lưu
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {savedSearches.map((entry, index) => (
                  <div
                    key={`${entry.query}-${entry.savedAt}`}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-fill transition-colors group"
                  >
                    <FiBookmark className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleLoadSaved(entry)}
                        className="text-sm text-gray-200 hover:text-sky-400 transition-colors truncate block text-left w-full"
                      >
                        {entry.query}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-ink-soft uppercase">
                          {entry.engines.join(", ")}
                        </span>
                        <span className="text-xs text-ink-soft">
                          {formatTime(entry.savedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(index)}
                      className="p-1 text-ink-soft hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:text-red-400"
                      title="Xóa tìm kiếm đã lưu"
                      aria-label={`Xóa: ${entry.query}`}
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-hairline">
              <span className="text-xs text-ink-soft">
                Hiển thị {history.length} mục gần đây
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-ink-soft hover:text-red-400 transition-colors"
                aria-label="Xóa toàn bộ lịch sử"
              >
                <FiTrash2 className="w-3 h-3" />
                Xóa lịch sử
              </button>
            </div>
          )}

          {loading ? (
            <div className="px-4 py-6 text-center text-ink-soft text-sm">
              Đang tải...
            </div>
          ) : history.length === 0 && savedSearches.length === 0 ? (
            <div className="px-4 py-6 text-center text-ink-soft text-sm">
              Chưa có lịch sử tìm kiếm
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-fill transition-colors group"
                >
                  <FiSearch className="w-4 h-4 text-ink-soft flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelect(entry.query)}
                      className="text-sm text-gray-200 hover:text-sky-400 transition-colors truncate block text-left w-full"
                    >
                      {entry.query}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.engine && (
                        <span className="text-xs text-ink-soft uppercase">
                          {entry.engine}
                        </span>
                      )}
                      {entry.resultCount != null && (
                        <span className="text-xs text-ink-soft">
                          {entry.resultCount} kết quả
                        </span>
                      )}
                      <span className="text-xs text-ink-soft">
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(entry.id)}
                    className="p-1 text-ink-soft hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:text-red-400"
                    title="Xóa mục này"
                    aria-label={`Xóa: ${entry.query}`}
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(HistoryPanel);
