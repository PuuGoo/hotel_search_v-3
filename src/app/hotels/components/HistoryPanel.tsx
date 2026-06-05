"use client";

import { useState, useEffect } from "react";
import {
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiX,
  FiSearch,
} from "react-icons/fi";
import { useSearchHistory } from "../contexts/SearchHistoryContext";

interface HistoryPanelProps {
  onSelect: (query: string) => void;
}

const HistoryPanel = ({ onSelect }: HistoryPanelProps) => {
  const { history, loading, clearAll, removeEntry } = useSearchHistory();
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-white hover:bg-gray-750 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Lịch sử tìm kiếm"
      >
        <div className="flex items-center gap-2">
          <FiClock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium">Lịch sử tìm kiếm</span>
          {history.length > 0 && (
            <span className="text-xs text-gray-500">({history.length})</span>
          )}
        </div>
        {isExpanded ? (
          <FiChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700">
          {history.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-xs text-gray-500">
                Hiển thị {history.length} mục gần đây
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                aria-label="Xóa toàn bộ lịch sử"
              >
                <FiTrash2 className="w-3 h-3" />
                Xóa lịch sử
              </button>
            </div>
          )}

          {loading ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              Đang tải...
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              Chưa có lịch sử tìm kiếm
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-750 transition-colors group"
                >
                  <FiSearch className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
                        <span className="text-xs text-gray-500 uppercase">
                          {entry.engine}
                        </span>
                      )}
                      {entry.resultCount != null && (
                        <span className="text-xs text-gray-600">
                          {entry.resultCount} kết quả
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(entry.id)}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:text-red-400"
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

export default HistoryPanel;
