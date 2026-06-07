"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDatabase, FiRefreshCw } from "react-icons/fi";

interface CollectionStat {
  name: string;
  count: number;
  indexes: number;
}

interface DbStatsResponse {
  stats: CollectionStat[];
  totalCount: number;
}

const INDEX_RECOMMENDATIONS: Record<string, string[]> = {
  User: ["email (unique)", "role", "createdAt"],
  Conversation: ["lastMessageAt", "userIds (multikey)", "createdAt"],
  Message: ["conversationId + createdAt", "senderId"],
  Hotel: ["url (unique)", "city + country"],
  Search: ["userId + createdAt", "query"],
  SearchResult: ["searchId", "hotelId"],
  Bookmark: ["userId + createdAt", "userId + folder"],
  SearchHistory: ["userId + createdAt"],
  PriceAlert: ["userId", "userId + isActive"],
  AuditLog: ["createdAt", "action"],
  PasswordResetToken: ["userId", "tokenHash (unique)"],
  DriveFile: ["uploadedById + folder + createdAt"],
  FileVersion: ["driveFileId + version"],
  ShareLink: ["driveFileId", "token (unique)"],
  Notification: ["userId + isRead + createdAt"],
  FinderTemplate: ["createdById"],
  ScheduledJob: ["createdById", "isActive + nextRunAt"],
};

const DatabasePage = () => {
  const [data, setData] = useState<DbStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/db-stats");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Không thể tải thống kê cơ sở dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxCount = data ? Math.max(...data.stats.map((s) => s.count), 1) : 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiDatabase className="h-6 w-6 text-sky-400" />
          <h2 className="text-xl font-semibold text-ink">
            Thống kê cơ sở dữ liệu
          </h2>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-panel px-4 py-2 text-sm text-ink hover:bg-fill hover:text-ink transition-colors disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-xl bg-panel border border-hairline p-6">
              <p className="text-sm text-ink-soft">Tổng bộ sưu tập</p>
              <p className="text-3xl font-bold text-ink mt-1">
                {data.stats.length}
              </p>
            </div>
            <div className="rounded-xl bg-panel border border-hairline p-6">
              <p className="text-sm text-ink-soft">Tổng số lượng tài liệu</p>
              <p className="text-3xl font-bold text-ink mt-1">
                {data.totalCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-panel border border-hairline p-6">
              <p className="text-sm text-ink-soft">Tổng chỉ mục</p>
              <p className="text-3xl font-bold text-ink mt-1">
                {data.stats.reduce((sum, s) => sum + s.indexes, 0)}
              </p>
            </div>
          </div>

          <section>
            <h3 className="text-lg font-semibold text-ink mb-4">
              Bộ sưu tập
            </h3>
            <div className="rounded-xl border border-hairline overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-panel text-ink-soft">
                    <th className="text-left px-4 py-3 font-medium">
                      Bộ sưu tập
                    </th>
                    <th className="text-right px-4 py-3 font-medium">
                      Số lượng tài liệu
                    </th>
                    <th className="text-right px-4 py-3 font-medium">
                      Chỉ mục
                    </th>
                    <th className="px-4 py-3 font-medium w-1/3">
                      Phân bố
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.map((s) => (
                    <tr
                      key={s.name}
                      className="border-t border-hairline hover:bg-panel/50"
                    >
                      <td className="px-4 py-3 text-ink font-mono">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-right text-ink">
                        {s.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-ink">
                        {s.indexes}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-2 bg-fill rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{
                              width: `${Math.max(
                                (s.count / maxCount) * 100,
                                s.count > 0 ? 2 : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-ink mb-4">
              Chỉ mục theo bộ sưu tập
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.stats
                .filter((s) => s.indexes > 0)
                .map((s) => (
                  <div
                    key={s.name}
                    className="rounded-xl bg-panel border border-hairline p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-ink text-sm">
                        {s.name}
                      </span>
                      <span className="text-xs text-ink-soft bg-fill px-2 py-0.5 rounded-full">
                        {s.indexes} chỉ mục
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {s.count.toLocaleString()} tài liệu
                    </p>
                  </div>
                ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-ink mb-4">
              Tối ưu hóa
            </h3>
            <div className="rounded-xl bg-panel border border-hairline p-6 space-y-4">
              <p className="text-ink text-sm">
                Dưới đây là các chỉ mục đang được sử dụng và khuyến nghị cho
                từng bộ sưu tập. Các chỉ mục đã được tối ưu hóa trong schema
                Prisma.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(INDEX_RECOMMENDATIONS).map(
                  ([collection, indexes]) => (
                    <div
                      key={collection}
                      className="rounded-lg bg-canvas border border-hairline p-4"
                    >
                      <h4 className="font-mono text-sky-400 text-sm mb-2">
                        {collection}
                      </h4>
                      <ul className="space-y-1">
                        {indexes.map((idx) => (
                          <li
                            key={idx}
                            className="text-xs text-ink-soft flex items-center gap-2"
                          >
                            <span className="h-1 w-1 rounded-full bg-green-400 flex-shrink-0" />
                            {idx}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <FiRefreshCw className="h-6 w-6 text-ink-soft animate-spin" />
          <span className="ml-3 text-ink-soft">Đang tải...</span>
        </div>
      )}
    </div>
  );
};

export default DatabasePage;
