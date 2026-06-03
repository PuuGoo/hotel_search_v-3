"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiDatabase,
  FiRefreshCw,
  FiTrash2,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

interface CacheStats {
  generic: {
    size: number;
    hitRate: string;
    keys: string[];
    totalHits: number;
    totalMisses: number;
    memoryEstimate: string;
  };
  search: {
    size: number;
    maxSize: number;
    entryHits: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: string;
  };
}

const CachePage = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [namespaceFilter, setNamespaceFilter] = useState<string>("all");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/cache");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleClearAll = async () => {
    setClearing("all");
    setMessage(null);
    try {
      const res = await fetch("/api/cache?all=true", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
        fetchStats();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Lỗi xóa cache" });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setClearing(null);
    }
  };

  const handleClearNamespace = async (namespace: string) => {
    setClearing(namespace);
    setMessage(null);
    try {
      const res = await fetch(`/api/cache?pattern=${namespace}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: `Đã xóa ${data.count} mục cache "${namespace}"`,
        });
        fetchStats();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Lỗi xóa cache" });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setClearing(null);
    }
  };

  const filteredKeys = stats?.generic.keys.filter((key) => {
    if (namespaceFilter === "all") return true;
    return key.startsWith(namespaceFilter + ":");
  }) ?? [];

  const namespaces = ["search", "finder", "user", "api"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiRefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-400">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <FiCheckCircle className="h-4 w-4" />
          ) : (
            <FiXCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Thống kê</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-sky-500/20 text-sky-400">
                <FiDatabase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Số mục</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.generic.size ?? 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tỷ lệ trúng</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.generic.hitRate ?? "0%"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <FiDatabase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Bộ nhớ đệm</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.generic.memoryEstimate ?? "0 B"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/20 text-yellow-400">
                <FiDatabase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Search cache</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.search.size ?? 0} / {stats?.search.maxSize ?? 200}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Quản lý cache
          </h2>
          <button
            onClick={handleClearAll}
            disabled={clearing === "all"}
            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <FiTrash2 className={`h-4 w-4 ${clearing === "all" ? "animate-pulse" : ""}`} />
            {clearing === "all" ? "Đang xóa..." : "Xóa cache"}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleClearAll()}
              disabled={clearing === "all"}
              className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <FiTrash2 className="h-4 w-4" />
              Xóa tất cả
            </button>
            {namespaces.map((ns) => (
              <button
                key={ns}
                onClick={() => handleClearNamespace(ns)}
                disabled={clearing === ns}
                className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <FiTrash2 className={`h-4 w-4 ${clearing === ns ? "animate-pulse" : ""}`} />
                Xóa {ns}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <FiFilter className="h-4 w-4 text-gray-400" />
            <select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
              className="rounded-lg bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">Tất cả ({stats?.generic.size ?? 0})</option>
              {namespaces.map((ns) => {
                const count = stats?.generic.keys.filter((k) =>
                  k.startsWith(ns + ":")
                ).length ?? 0;
                return (
                  <option key={ns} value={ns}>
                    {ns} ({count})
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => fetchStats()}
              className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <FiRefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="px-4 py-2 text-left font-medium">Khóa</th>
                  <th className="px-4 py-2 text-left font-medium">Namespace</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Không có mục cache nào
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => {
                    const parts = key.split(":");
                    const namespace = parts[0] || "other";
                    return (
                      <tr
                        key={key}
                        className="border-b border-gray-700/50 last:border-0 hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-2 text-white font-mono text-xs truncate max-w-md">
                          {key}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                            {namespace}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Hiển thị {filteredKeys.length} / {stats?.generic.size ?? 0} mục
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Thống kê chi tiết</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Cache chung</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Lượt trúng:</span>
                <span className="text-green-400 font-medium">
                  {stats?.generic.totalHits ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lượt miss:</span>
                <span className="text-red-400 font-medium">
                  {stats?.generic.totalMisses ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tỷ lệ trúng:</span>
                <span className="text-white font-medium">
                  {stats?.generic.hitRate ?? "0%"}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Search cache</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Lượt trúng:</span>
                <span className="text-green-400 font-medium">
                  {stats?.search.cacheHits ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lượt miss:</span>
                <span className="text-red-400 font-medium">
                  {stats?.search.cacheMisses ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tỷ lệ trúng:</span>
                <span className="text-white font-medium">
                  {stats?.search.hitRate ?? "0%"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Entry hits:</span>
                <span className="text-yellow-400 font-medium">
                  {stats?.search.entryHits ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CachePage;
