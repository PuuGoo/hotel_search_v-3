"use client";

import {
  FiUsers,
  FiMessageSquare,
  FiSearch,
  FiHome,
  FiMessageCircle,
  FiBookmark,
  FiClock,
  FiTrendingUp,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";

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

interface StatsGridProps {
  stats: DashboardStats | null;
  loading: boolean;
}

interface StatCard {
  label: string;
  value: number;
  trend?: number;
  icon: React.ReactNode;
  colorClass: string;
}

const TrendIndicator: React.FC<{ value?: number }> = ({ value }) => {
  if (value === undefined || value === null) return null;
  const isUp = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp ? "text-green-400" : "text-red-400"
      }`}
    >
      {isUp ? <FiArrowUp className="h-3 w-3" /> : <FiArrowDown className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
};

const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => {
  const cards: StatCard[] = stats
    ? [
        {
          label: "Người dùng",
          value: stats.totalUsers,
          icon: <FiUsers className="h-6 w-6 text-sky-400" />,
          colorClass: "bg-sky-500/20",
        },
        {
          label: "Tin nhắn",
          value: stats.totalMessages,
          trend: stats.messagesLast24h > 0 ? 12 : -5,
          icon: <FiMessageSquare className="h-6 w-6 text-green-400" />,
          colorClass: "bg-green-500/20",
        },
        {
          label: "Tìm kiếm",
          value: stats.totalSearches,
          trend: stats.searchesLast24h > 0 ? 8 : -3,
          icon: <FiSearch className="h-6 w-6 text-yellow-400" />,
          colorClass: "bg-yellow-500/20",
        },
        {
          label: "Khách sạn",
          value: stats.totalHotels,
          icon: <FiHome className="h-6 w-6 text-purple-400" />,
          colorClass: "bg-purple-500/20",
        },
        {
          label: "Cuộc trò chuyện",
          value: stats.totalConversations,
          icon: <FiMessageCircle className="h-6 w-6 text-pink-400" />,
          colorClass: "bg-pink-500/20",
        },
        {
          label: "Bookmark",
          value: stats.totalBookmarks,
          icon: <FiBookmark className="h-6 w-6 text-orange-400" />,
          colorClass: "bg-orange-500/20",
        },
        {
          label: "Tin nhắn 24h",
          value: stats.messagesLast24h,
          icon: <FiClock className="h-6 w-6 text-cyan-400" />,
          colorClass: "bg-cyan-500/20",
        },
        {
          label: "Tìm kiếm 24h",
          value: stats.searchesLast24h,
          icon: <FiTrendingUp className="h-6 w-6 text-emerald-400" />,
          colorClass: "bg-emerald-500/20",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg p-5 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
                  <div className="h-7 w-14 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))
        : cards.map((card) => (
            <div
              key={card.label}
              className="bg-gray-800 rounded-lg p-5 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.colorClass}`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">
                      {card.value.toLocaleString("vi-VN")}
                    </p>
                    <TrendIndicator value={card.trend} />
                  </div>
                </div>
              </div>
            </div>
          ))}
    </div>
  );
};

export default StatsGrid;
