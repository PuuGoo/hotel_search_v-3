"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";

import { User } from "@prisma/client";

import useRoutes from "../../hooks/useRoutes";
import ThemeToggle from "../theme/ThemeToggle";
import DesktopItem from "./DesktopItem";
import ProfileItem from "./ProfileItem";

const NotificationBell = dynamic(() => import("../notifications/NotificationBell"), { ssr: false });

interface DesktopSidebarProps {
  currentUser: User;
}

const GROUP_LABELS: Record<string, string> = {
  search: "Tìm kiếm",
  social: "Xã hội",
  management: "Quản lý",
};

/** Ordered list of groups — system (admin/settings/logout) has no label. */
const GROUP_ORDER = ["search", "social", "management", "system"] as const;

const DesktopSidebar: React.FC<DesktopSidebarProps> = memo(({ currentUser }) => {
  const stableUser = useMemo(
    () => ({ role: currentUser.role, permissions: currentUser.permissions }),
    [currentUser.role, currentUser.permissions]
  );
  const routes = useRoutes(stableUser);

  // Group routes by their `group` field in display order
  const grouped = useMemo(() => {
    const map = new Map<string, typeof routes>();
    for (const r of routes) {
      const g = r.group ?? "system";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return GROUP_ORDER
      .filter((g) => map.has(g))
      .map((g) => ({ key: g, label: GROUP_LABELS[g], items: map.get(g)! }));
  }, [routes]);

  return (
    <>
      <div
        className="
        hidden 
        lg:fixed 
        lg:inset-y-0 
        lg:left-0 
        lg:z-40 
        lg:w-20 
        lg:overflow-y-auto 
        lg:bg-panel 
        lg:border-r-[1px]
        lg:border-hairline
        lg:pb-4
        lg:flex
        lg:flex-col
        justify-between
        dark:bg-dusk
        dark:border-lightgray
      "
      >
        {/* Brand mark */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="ms-avatar w-11 h-11 text-lg bg-gradient-to-br from-brand to-accent shadow-card">
            H
          </div>
        </div>
        <nav className="mt-1 flex flex-col justify-between">
          {grouped.map((group, gi) => (
            <div key={group.key}>
              {gi > 0 && (
                <hr className="my-2 border-t border-hairline dark:border-gray-700 mx-3" />
              )}
              {group.label && (
                <span className="block text-[9px] uppercase tracking-wider text-ink-soft dark:text-gray-500 text-center mb-1 select-none">
                  {group.label}
                </span>
              )}
              <ul role="list" className="flex flex-col items-center space-y-1">
                {group.items.map((item) => (
                  <DesktopItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={item.active}
                    onClick={item.onClick}
                    prefetch={!item.onClick}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <nav className="mt-4 flex flex-col justify-between items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <ProfileItem currentUser={currentUser} />
        </nav>
      </div>
    </>
  );
});

DesktopSidebar.displayName = "DesktopSidebar";

export default DesktopSidebar;
