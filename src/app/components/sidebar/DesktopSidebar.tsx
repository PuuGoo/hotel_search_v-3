"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";

import { User } from "@prisma/client";
import Link from "next/link";
import { HiCog } from "react-icons/hi2";

import useRoutes from "../../hooks/useRoutes";
import ThemeToggle from "../theme/ThemeToggle";
import DesktopItem from "./DesktopItem";
import ProfileItem from "./ProfileItem";

const NotificationBell = dynamic(() => import("../notifications/NotificationBell"), { ssr: false });

interface DesktopSidebarProps {
  currentUser: User;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = memo(({ currentUser }) => {
  const stableUser = useMemo(
    () => ({ role: currentUser.role, permissions: currentUser.permissions }),
    [currentUser.role, currentUser.permissions]
  );
  const routes = useRoutes(stableUser);

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
        xl:px-6
        lg:overflow-y-auto 
        lg:bg-white 
        lg:border-r-[1px]
        lg:pb-4
        lg:flex
        lg:flex-col
        justify-between
        dark:bg-dusk
        dark:border-lightgray
      "
      >
        <nav className="mt-4 flex flex-col justify-between">
          <ul role="list" className="flex flex-col items-center space-y-1">
            {routes.map((item) => (
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
        </nav>
        <nav className="mt-4 flex flex-col justify-between items-center">
          <ThemeToggle />
          <NotificationBell />
          <Link
            href="/settings"
            prefetch={true}
            className="
              flex flex-col items-center gap-1 rounded-md p-2
              text-gray-500 hover:text-gray-900
              dark:text-gray-400 dark:hover:text-white
              transition-colors
            "
          >
            <HiCog className="h-6 w-6" />
            <span className="text-[10px] font-medium">Cài đặt</span>
          </Link>
          <ProfileItem currentUser={currentUser} />
        </nav>
      </div>
    </>
  );
});

DesktopSidebar.displayName = "DesktopSidebar";

export default DesktopSidebar;
