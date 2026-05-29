"use client";

import { format } from "date-fns";
import Link from "next/link";
import {
  FiBookmark,
  FiClock,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";

interface Search {
  id: string;
  query: string;
  engine: string;
  resultCount: number;
  duration: number | null;
  createdAt: Date;
  results: any[];
}

interface Stats {
  totalSearches: number;
  totalBookmarks: number;
  engineUsage: { engine: string; count: number }[];
  topQueries: { query: string; count: number }[];
}

interface DashboardClientProps {
  stats: Stats;
  recentSearches: Search[];
  user: any;
}

const DashboardClient: React.FC<DashboardClientProps> = ({
  stats,
  recentSearches,
  user,
}) => {
  return (
    <div className="h-full bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Xin chào, {user.name || "User"}!
          </h1>
          <p className="text-gray-400 mt-2">
            Đây là tổng quan về hoạt động tìm kiếm của bạn
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500/20 rounded-lg">
                <FiSearch className="h-6 w-6 text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng tìm kiếm</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalSearches}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <FiBookmark className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Đã lưu</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalBookmarks}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <FiTrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Engines sử dụng</p>
                <p className="text-2xl font-bold text-white">
                  {stats.engineUsage.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Searches */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FiClock />
                Tìm kiếm gần đây
              </h2>
              <Link
                href="/hotels"
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                Tìm kiếm mới
              </Link>
            </div>

            {recentSearches.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Chưa có tìm kiếm nào
              </p>
            ) : (
              <div className="space-y-4">
                {recentSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{search.query}</p>
                      <p className="text-sm text-gray-400">
                        {search.engine.toUpperCase()} •{" "}
                        {search.resultCount} kết quả
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(search.createdAt), "HH:mm dd/MM")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Queries */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <FiTrendingUp />
              Tìm kiếm phổ biến
            </h2>

            {stats.topQueries.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Chưa có dữ liệu
              </p>
            ) : (
              <div className="space-y-4">
                {stats.topQueries.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg"
                  >
                    <span className="text-2xl font-bold text-sky-400 w-8">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{item.query}</p>
                      <p className="text-sm text-gray-400">
                        {item.count} lần tìm kiếm
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engine Usage */}
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-6">
              Thống kê theo Engine
            </h2>

            {stats.engineUsage.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Chưa có dữ liệu
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.engineUsage.map((item) => {
                  const percentage = Math.round(
                    (item.count / stats.totalSearches) * 100
                  );
                  return (
                    <div
                      key={item.engine}
                      className="p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">
                          {item.engine.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-400">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-sky-500 rounded-full h-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
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
