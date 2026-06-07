"use client";

import React, { useState, useCallback } from "react";
import { FiBookmark, FiExternalLink, FiStar, FiBell, FiColumns, FiCopy, FiCheck } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { safeHref } from "../../libs/safeUrl";
import type { SearchResult } from "../types";

// SearchResult imported from ../types

interface ResultCardProps {
  result: SearchResult;
  onBookmark: (result: SearchResult) => void;
  onAlert: (hotel: { name: string; url?: string }) => void;
  onCompare: (result: SearchResult) => void;
  isCompared: boolean;
  index?: number;
}

const ResultCard = React.memo(function ResultCard({
  result,
  onBookmark,
  onAlert,
  onCompare,
  isCompared,
  index = 0,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(() => {
    if (!result.url) return;
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true);
      toast.success("Đã copy URL");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Không thể copy URL");
    });
  }, [result.url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (result.url && safeHref(result.url)) {
          window.open(safeHref(result.url)!, "_blank", "noopener,noreferrer");
        }
      }
    },
    [result.url]
  );

  return (
    <div
      tabIndex={0}
      role="article"
      aria-label={`Kết quả: ${result.title || "Không có tiêu đề"}`}
      onKeyDown={handleKeyDown}
      className="bg-panel rounded-lg p-6 hover:bg-fill transition-colors stagger-fade-in focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-sky-400 mb-1 truncate">
            {safeHref(result.url) ? (
              <a
                href={safeHref(result.url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {result.title || "Không có tiêu đề"}
              </a>
            ) : (
              result.title || "Không có tiêu đề"
            )}
          </h3>
          {safeHref(result.url) && (
            <p className="text-sm text-green-400 truncate mb-2 flex items-center gap-1.5">
              <span className="truncate">{result.url}</span>
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 p-0.5 text-ink hover:text-sky-400 transition-colors"
                title="Copy URL"
                aria-label="Copy URL to clipboard"
              >
                {copied ? <FiCheck className="w-3.5 h-3.5 text-green-400" /> : <FiCopy className="w-3.5 h-3.5" />}
              </button>
            </p>
          )}
          <p className="text-ink text-sm line-clamp-2">
            {result.snippet || "Không có mô tả"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onAlert({
                name: result.title || "Không có tiêu đề",
                url: result.url || undefined,
              })
            }
            className="p-2 text-ink hover:text-sky-400 transition-colors"
            title="Theo dõi giá"
            aria-label="Theo dõi giá"
          >
            <FiBell />
          </button>
          <button
            onClick={() => onCompare(result)}
            disabled={!result.url || isCompared}
            className={`p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isCompared ? "text-purple-400" : "text-ink hover:text-purple-400"
            }`}
            title={isCompared ? "Đã thêm vào so sánh" : "Thêm vào so sánh"}
            aria-label={isCompared ? "Đã thêm vào so sánh" : "Thêm vào so sánh"}
          >
            <FiColumns />
          </button>
          <button
            onClick={() => onBookmark(result)}
            disabled={!result.url}
            className="p-2 text-ink hover:text-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-ink"
            title={result.url ? "Lưu bookmark" : "Không có URL để lưu"}
            aria-label={result.url ? "Lưu bookmark" : "Không có URL để lưu"}
          >
            <FiBookmark />
          </button>
          {safeHref(result.url) && (
            <a
              href={safeHref(result.url)!}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-ink hover:text-sky-400 transition-colors"
              title="Mở link"
              aria-label="Mở link trong tab mới"
            >
              <FiExternalLink />
            </a>
          )}
        </div>
      </div>
      {typeof result.score === "number" && (
        <div className="mt-3 flex items-center gap-2">
          <FiStar className="text-yellow-400" />
          <span className="text-sm text-ink">
            Điểm: {(result.score * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
});

export default ResultCard;
