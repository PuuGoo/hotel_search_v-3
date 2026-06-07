"use client";

import { useCallback, useEffect, useState } from "react";
import { FiShield, FiRefreshCw, FiAlertTriangle, FiClock } from "react-icons/fi";

interface RateLimitStats {
  config: { windowMs: number; max: number };
  totalKeys: number;
  totalBlocked: number;
  blockedLast24h: number;
  active: Array<{
    key: string;
    used: number;
    limit: number;
    resetInMs: number;
    blocked: boolean;
  }>;
  mostBlocked: Array<{
    key: string;
    used: number;
    limit: number;
    resetInMs: number;
    blocked: boolean;
  }>;
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatWindow(ms: number): string {
  if (ms >= 3600000) return `${ms / 3600000} giờ`;
  if (ms >= 60000) return `${ms / 60000} phút`;
  return `${ms / 1000} giây`;
}

const RateLimitsPage = () => {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowMs, setWindowMs] = useState(60);
  const [max, setMax] = useState(30);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rate-limits");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setWindowMs(Math.round(data.config.windowMs / 60));
        setMax(data.config.max);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/rate-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windowMs: windowMs * 60 * 1000,
          max,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Đã cập nhật cấu hình thành công" });
        fetchStats();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Lỗi cập nhật" });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (ip?: string) => {
    const label = ip || "tất cả";
    setResetting(label);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/rate-limits/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ip || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
        fetchStats();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Lỗi đặt lại" });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setResetting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiRefreshCw className="h-6 w-6 text-ink-soft animate-spin" />
        <span className="ml-3 text-ink-soft">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Thống kê</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-sky-500/20 text-sky-400">
                <FiShield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-ink-soft">Khóa đang hoạt động</p>
                <p className="text-2xl font-bold text-ink">
                  {stats?.totalKeys ?? 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
                <FiAlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-ink-soft">Đang bị chặn</p>
                <p className="text-2xl font-bold text-ink">
                  {stats?.totalBlocked ?? 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/20 text-yellow-400">
                <FiClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-ink-soft">Chặn trong 24 giờ</p>
                <p className="text-2xl font-bold text-ink">
                  {stats?.blockedLast24h ?? 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <FiShield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-ink-soft">Giới hạn hiện tại</p>
                <p className="text-2xl font-bold text-ink">
                  {stats?.config.max ?? 30} / {formatWindow(stats?.config.windowMs ?? 60000)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Cấu hình giới hạn</h2>
        <form
          onSubmit={handleSaveConfig}
          className="bg-panel rounded-lg p-6 space-y-4 max-w-lg"
        >
          <div>
            <label className="block text-sm text-ink-soft mb-1">
              Kích thước cửa sổ (phút)
            </label>
            <input
              type="number"
              value={windowMs}
              onChange={(e) => setWindowMs(Number(e.target.value))}
              min={1}
              className="w-full rounded-lg bg-fill border border-hairline px-4 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1">
              Số yêu cầu tối đa
            </label>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              min={1}
              className="w-full rounded-lg bg-fill border border-hairline px-4 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">
            IP đang hoạt động ({stats?.active.length ?? 0})
          </h2>
          <button
            onClick={() => handleReset()}
            disabled={resetting === "tất cả"}
            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${resetting === "tất cả" ? "animate-spin" : ""}`}
            />
            Đặt lại tất cả
          </button>
        </div>
        <div className="bg-panel rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-ink-soft">
                <th className="px-6 py-3 text-left font-medium">Khóa</th>
                <th className="px-6 py-3 text-left font-medium">Đã dùng</th>
                <th className="px-6 py-3 text-left font-medium">Giới hạn</th>
                <th className="px-6 py-3 text-left font-medium">Trạng thái</th>
                <th className="px-6 py-3 text-left font-medium">Đặt lại sau</th>
                <th className="px-6 py-3 text-right font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {stats?.active.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-soft">
                    Không có yêu cầu đang hoạt động
                  </td>
                </tr>
              ) : (
                stats?.active.map((entry) => (
                  <tr
                    key={entry.key}
                    className="border-b border-hairline/50 last:border-0"
                  >
                    <td className="px-6 py-3 text-ink font-mono text-xs">
                      {entry.key}
                    </td>
                    <td className="px-6 py-3 text-ink">{entry.used}</td>
                    <td className="px-6 py-3 text-ink">{entry.limit}</td>
                    <td className="px-6 py-3">
                      {entry.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
                          <FiAlertTriangle className="h-3 w-3" />
                          Bị chặn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-ink-soft">
                      {formatMs(entry.resetInMs)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleReset(entry.key)}
                        disabled={resetting === entry.key}
                        className="inline-flex items-center gap-1 rounded-lg bg-fill px-3 py-1.5 text-xs font-medium text-ink hover:bg-hairline transition-colors disabled:opacity-50"
                      >
                        <FiRefreshCw
                          className={`h-3 w-3 ${
                            resetting === entry.key ? "animate-spin" : ""
                          }`}
                        />
                        Đặt lại
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(stats?.mostBlocked.length ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">
            IP bị chặn nhiều nhất
          </h2>
          <div className="bg-panel rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-ink-soft">
                  <th className="px-6 py-3 text-left font-medium">Khóa</th>
                  <th className="px-6 py-3 text-left font-medium">Đã dùng</th>
                  <th className="px-6 py-3 text-left font-medium">Giới hạn</th>
                  <th className="px-6 py-3 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {stats?.mostBlocked.map((entry) => (
                  <tr
                    key={entry.key}
                    className="border-b border-hairline/50 last:border-0"
                  >
                    <td className="px-6 py-3 text-ink font-mono text-xs">
                      {entry.key}
                    </td>
                    <td className="px-6 py-3 text-red-400 font-medium">
                      {entry.used}
                    </td>
                    <td className="px-6 py-3 text-ink">{entry.limit}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleReset(entry.key)}
                        disabled={resetting === entry.key}
                        className="inline-flex items-center gap-1 rounded-lg bg-fill px-3 py-1.5 text-xs font-medium text-ink hover:bg-hairline transition-colors disabled:opacity-50"
                      >
                        <FiRefreshCw
                          className={`h-3 w-3 ${
                            resetting === entry.key ? "animate-spin" : ""
                          }`}
                        />
                        Đặt lại
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default RateLimitsPage;
