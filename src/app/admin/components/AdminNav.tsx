"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiActivity, FiBarChart2, FiGrid, FiUsers } from "react-icons/fi";

const tabs = [
  { label: "Tổng quan", href: "/admin", icon: FiGrid, exact: true },
  { label: "Người dùng", href: "/admin/users", icon: FiUsers },
  { label: "Phân tích", href: "/admin/analytics", icon: FiBarChart2 },
  { label: "Nhật ký", href: "/admin/audit", icon: FiActivity },
];

const AdminNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-gray-700 pb-3">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || !!pathname?.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sky-500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default AdminNav;
