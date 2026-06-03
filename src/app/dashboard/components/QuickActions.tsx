"use client";

import Link from "next/link";
import {
  FiSearch,
  FiLayers,
  FiLink,
  FiBookmark,
  FiUsers,
} from "react-icons/fi";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  colorClass: string;
}

const actions: QuickAction[] = [
  {
    label: "Tìm kiếm mới",
    href: "/hotels",
    icon: <FiSearch className="h-5 w-5" />,
    colorClass: "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30",
  },
  {
    label: "Bulk Search",
    href: "/hotels/bulk",
    icon: <FiLayers className="h-5 w-5" />,
    colorClass: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
  },
  {
    label: "URL Finder",
    href: "/hotels/finder",
    icon: <FiLink className="h-5 w-5" />,
    colorClass: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
  },
  {
    label: "Xem bookmarks",
    href: "/bookmarks",
    icon: <FiBookmark className="h-5 w-5" />,
    colorClass: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
  },
  {
    label: "Quản lý người dùng",
    href: "/users",
    icon: <FiUsers className="h-5 w-5" />,
    colorClass: "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30",
  },
];

const QuickActions: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Thao tác nhanh</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${action.colorClass}`}
          >
            {action.icon}
            <span className="text-sm font-medium text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
