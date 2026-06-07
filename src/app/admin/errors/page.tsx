"use client";

import { useCallback, useEffect, useState } from "react";

interface ErrorReport {
  level: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

interface ErrorStats {
  total: number;
  byLevel: Record<string, number>;
  topMessages: { message: string; count: number }[];
}

const LEVEL_STYLES: Record<string, string> = {
  info: "bg-blue-900/50 text-blue-300",
  warning: "bg-yellow-900/50 text-yellow-300",
  error: "bg-red-900/50 text-red-300",
  critical: "bg-red-900/70 text-red-200 font-bold",
};

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/errors?stats=true&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
        setStats(data.stats || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleClear() {
    if (!confirm("Bạn có chắc muốn xóa tất cả lỗi?")) return;
    await fetch("/api/admin/errors", { method: "DELETE" });
    setErrors([]);
    setStats(null);
  }

  const filtered =
    filter === "all" ? errors : errors.filter((e) => e.level === filter);

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Thống kê lỗi</h2>
        <button
          onClick={handleClear}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Xóa tất cả
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-hairline bg-panel p-4">
            <p className="text-sm text-ink-soft">Tổng lỗi</p>
            <p className="mt-1 text-2xl font-bold text-ink">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-panel p-4">
            <p className="text-sm text-ink-soft">Critical</p>
            <p className="mt-1 text-2xl font-bold text-red-400">
              {stats.byLevel.critical}
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-panel p-4">
            <p className="text-sm text-ink-soft">Error</p>
            <p className="mt-1 text-2xl font-bold text-orange-400">
              {stats.byLevel.error}
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-panel p-4">
            <p className="text-sm text-ink-soft">Warning</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {stats.byLevel.warning}
            </p>
          </div>
        </div>
      )}

      {stats && stats.topMessages.length > 0 && (
        <div className="rounded-lg border border-hairline bg-panel p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Lỗi phổ biến
          </h3>
          <div className="space-y-2">
            {stats.topMessages.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-canvas px-3 py-2"
              >
                <span className="text-sm text-ink font-mono truncate max-w-[70%]">
                  {item.message}
                </span>
                <span className="text-xs font-medium text-sky-400">
                  {item.count} lần
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-soft">Mức độ:</span>
        {["all", "critical", "error", "warning", "info"].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === level
                ? "bg-sky-500 text-white"
                : "bg-panel text-ink-soft hover:bg-fill"
            }`}
          >
            {level === "all" ? "Tất cả" : level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-hairline bg-panel">
        <div className="border-b border-hairline px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">
            Lỗi gần đây
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-ink-soft">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-ink-soft">
            Không có lỗi nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-ink-soft">
                  <th className="px-5 py-3 font-medium">Thời gian</th>
                  <th className="px-5 py-3 font-medium">Mức độ</th>
                  <th className="px-5 py-3 font-medium">Tin nhắn</th>
                  <th className="px-5 py-3 font-medium">Ngữ cảnh</th>
                  <th className="px-5 py-3 font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((err, i) => (
                  <tr
                    key={i}
                    className="border-b border-hairline/50 hover:bg-fill/30 transition-colors"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-ink">
                      {formatTime(err.timestamp)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${
                          LEVEL_STYLES[err.level] || "bg-fill text-ink"
                        }`}
                      >
                        {err.level}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink font-mono text-xs">
                      {err.message}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink-soft font-mono text-xs">
                      {err.context ? JSON.stringify(err.context) : "—"}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink-soft text-xs">
                      {err.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
