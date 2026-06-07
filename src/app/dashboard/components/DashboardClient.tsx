"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import {
  FiClock,
  FiTrendingUp,
  FiChevronDown,
} from "react-icons/fi";

import StatsGrid from "./StatsGrid";
import ActivityFeed from "./ActivityFeed";
import QuickActions from "./QuickActions";

interface Search {
  id: string;
  query: string;
  engine: string;
  resultCount: number;
  duration: number | null;
  createdAt: Date;
}

interface Stats {
  totalSearches: number;
  totalBookmarks: number;
  engineUsage: { engine: string; count: number }[];
  topQueries: { query: string; count: number }[];
}

interface DashboardStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalSearches: number;
  totalHotels: number;
  totalBookmarks: number;
  messagesLast24h: number;
  searchesLast24h: number;
  activeUsers: number;
}

interface ActivityItem {
  id: string;
  type: "message" | "search" | "bookmark" | "user";
  description: string;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
  timestamp: string;
}

interface DashboardClientProps {
  stats: Stats;
  recentSearches: Search[];
  initialActivities: ActivityItem[];
  user: { name?: string | null; email?: string | null; image?: string | null; role?: string | null };
}

const DashboardClient: React.FC<DashboardClientProps> = ({
  stats,
  recentSearches,
  initialActivities,
  user,
}) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [topQueriesOpen, setTopQueriesOpen] = useState(false);
  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    setStatsError(false);
    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setDashboardStats(data);
        setStatsLoading(false);
      })
      .catch(() => {
        setStatsError(true);
        setStatsLoading(false);
      });
  }, []);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="h-full bg-canvas">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">
            Xin chào, {user.name || "User"}!
          </h1>
          <p className="text-ink-soft mt-2">
            Đây là tổng quan về hoạt động hệ thống
          </p>
        </div>

        <div className="mb-8">
          {statsError && !statsLoading ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center justify-between">
              <p className="text-red-400 text-sm">Không tải được thống kê hệ thống</p>
              <button
                onClick={fetchStats}
                className="flex items-center gap-2 rounded-lg bg-fill px-3 py-1.5 text-sm text-gray-200 hover:bg-hairline transition-colors"
              >
                <FiRefreshCw className="h-3.5 w-3.5" />
                Thử lại
              </button>
            </div>
          ) : (
            <StatsGrid stats={dashboardStats} loading={statsLoading} />
          )}
        </div>

        <div className="mb-8">
          <QuickActions />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" id="recent-searches">
          <ActivityFeed initialActivities={initialActivities} />

          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center justify-between mb-6 cursor-pointer lg:cursor-default" onClick={() => setRecentOpen(!recentOpen)}>
              <h2 className="text-xl font-semibold text-ink flex items-center gap-2">
                <FiClock />
                Tìm kiếm gần đây
              </h2>
              <div className="flex items-center gap-2">
              <button className="lg:hidden text-ink-soft hover:text-ink transition-colors">
                <FiChevronDown className={`w-5 h-5 transition-transform ${recentOpen ? "rotate-180" : ""}`} />
              </button>
              <Link
                href="/hotels"
                className="text-sm text-sky-400 hover:text-sky-300"
                onClick={(e) => e.stopPropagation()}
              >
                Tìm kiếm mới
              </Link>
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                recentOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              } lg:!grid-rows-[1fr] lg:!opacity-100`}
            >
              <div className="overflow-hidden">
                {recentSearches.length === 0 ? (
                  <p className="text-ink-soft text-center py-8">
                    Chưa có tìm kiếm nào
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentSearches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center justify-between p-3 bg-fill rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-ink truncate">{search.query}</p>
                          <p className="text-sm text-ink-soft">
                            {search.engine.toUpperCase()} •{" "}
                            {search.resultCount} kết quả
                          </p>
                        </div>
                        <span className="text-xs text-ink-soft">
                          {format(new Date(search.createdAt), "HH:mm dd/MM")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="top-queries">
          <div className="bg-panel rounded-lg p-6">
            <div className="flex items-center justify-between mb-6 cursor-pointer lg:cursor-default" onClick={() => setTopQueriesOpen(!topQueriesOpen)}>
              <h2 className="text-xl font-semibold text-ink flex items-center gap-2">
                <FiTrendingUp />
                Tìm kiếm phổ biến
              </h2>
              <button className="lg:hidden text-ink-soft hover:text-ink transition-colors">
                <FiChevronDown className={`w-5 h-5 transition-transform ${topQueriesOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                topQueriesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              } lg:!grid-rows-[1fr] lg:!opacity-100`}
            >
              <div className="overflow-hidden">
                {stats.topQueries.length === 0 ? (
                  <p className="text-ink-soft text-center py-8">
                    Chưa có dữ liệu
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.topQueries.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-fill rounded-lg"
                      >
                        <span className="text-2xl font-bold text-sky-400 w-8">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-ink truncate">{item.query}</p>
                          <p className="text-sm text-ink-soft">
                            {item.count} lần tìm kiếm
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-panel rounded-lg p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">
              Thống kê theo Engine
            </h2>

            {stats.engineUsage.length === 0 ? (
              <p className="text-ink-soft text-center py-8">
                Chưa có dữ liệu
              </p>
            ) : (
              <div className="space-y-4">
                {stats.engineUsage.map((item) => {
                  const percentage = Math.round(
                    (item.count / stats.totalSearches) * 100
                  );
                  return (
                    <div
                      key={item.engine}
                      className="p-4 bg-fill rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-ink font-medium">
                          {item.engine.toUpperCase()}
                        </span>
                        <span className="text-sm text-ink-soft">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-fill rounded-full h-2">
                        <div
                          className="bg-sky-500 rounded-full h-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-ink-soft mt-2">
                        {item.count} lần sử dụng
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
