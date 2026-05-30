import { Metadata } from "next";
import { format } from "date-fns";
import { FiClock, FiSearch, FiTrendingUp, FiZap } from "react-icons/fi";

import getAdminAnalytics from "@/app/actions/getAdminAnalytics";

import StatCard from "../components/StatCard";

export const metadata: Metadata = {
  title: "Admin - Phân tích",
};

export const dynamic = "force-dynamic";

const AdminAnalyticsPage = async () => {
  const data = await getAdminAnalytics();

  if (!data) {
    return (
      <p className="text-gray-400">Bạn không có quyền truy cập dữ liệu này.</p>
    );
  }

  const maxEngine = data.engineUsage.reduce(
    (max, e) => Math.max(max, e.count),
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Tổng tìm kiếm"
          value={data.totalSearches}
          icon={FiSearch}
          accent="sky"
        />
        <StatCard
          label="7 ngày qua"
          value={data.searches7d}
          icon={FiTrendingUp}
          accent="green"
        />
        <StatCard
          label="Thời gian TB"
          value={data.avgDurationMs != null ? `${data.avgDurationMs} ms` : "—"}
          icon={FiZap}
          accent="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tìm kiếm phổ biến
          </h2>
          {data.topQueries.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <ol className="space-y-3">
              {data.topQueries.map((q, i) => (
                <li
                  key={`${q.query}-${i}`}
                  className="flex items-center gap-4 rounded-lg bg-gray-700 p-3"
                >
                  <span className="w-6 text-lg font-bold text-sky-400">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-white">
                    {q.query}
                  </span>
                  <span className="text-sm text-gray-400">{q.count} lần</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Sử dụng theo Engine
          </h2>
          {data.engineUsage.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {data.engineUsage.map((e) => {
                const pct = maxEngine > 0 ? Math.round((e.count / maxEngine) * 100) : 0;
                return (
                  <div key={e.engine}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {e.engine.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">{e.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-600">
                      <div
                        className="h-2 rounded-full bg-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FiClock /> Tìm kiếm gần đây (toàn hệ thống)
        </h2>
        {data.recentSearches.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {data.recentSearches.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-gray-700 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-white">{s.query}</p>
                  <p className="text-sm text-gray-400">
                    {s.engine.toUpperCase()} • {s.resultCount} kết quả •{" "}
                    {s.userEmail ?? "ẩn danh"}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-xs text-gray-500">
                  {format(new Date(s.createdAt), "HH:mm dd/MM")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAnalyticsPage;
