import { useMemo } from "react";
import { HiChat } from "react-icons/hi";
import {
  HiArrowLeftOnRectangle,
  HiMagnifyingGlass,
  HiBell,
  HiBellAlert,
  HiUsers,
  HiCog,
  HiDocumentChartBar,
  HiArrowPath,
  HiFolderOpen,
} from "react-icons/hi2";
import { FiGrid, FiZap, FiGlobe, FiShield, FiBookmark } from "react-icons/fi";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";

import { ADMIN_ROLE } from "../libs/authz";
import { hasFeature, type Feature } from "../libs/features";
import useConversation from "./useConversation";

interface RouteItem {
  label: string;
  href: string;
  icon: IconType;
  active?: boolean;
  onClick?: () => void;
  feature?: Feature;
  group: 'search' | 'social' | 'management' | 'system';
}

// Accepts the current user's role + permissions. The Admin link only shows for
// admins, and each feature link is hidden when the user's permission list
// excludes it. This is purely UX (no dead links); access is enforced again in
// middleware and the API guards.
const useRoutes = (
  user?: { role?: string | null; permissions?: string[] | null } | null
) => {
  const pathname = usePathname();
  const { conversationId } = useConversation();

  const role = user?.role;
  const permissionsKey = user?.permissions?.join(",") ?? "";

  const routes = useMemo<RouteItem[]>(() => {
    const allFeatureRoutes: RouteItem[] = [
      {
        label: "Trò chuyện",
        href: "/conversations",
        icon: HiChat,
        active: pathname === "/conversations" || !!conversationId,
        feature: "chat",
        group: "search",
      },
      {
        label: "Tìm kiếm",
        href: "/hotels",
        icon: HiMagnifyingGlass,
        active: pathname === "/hotels",
        feature: "search",
        group: "search",
      },
      {
        label: "Tìm hàng loạt",
        href: "/hotels/bulk",
        icon: FiZap,
        active: pathname === "/hotels/bulk",
        feature: "bulk",
        group: "search",
      },
      {
        label: "Tìm URL",
        href: "/hotels/finder",
        icon: FiGlobe,
        active: pathname === "/hotels/finder",
        feature: "finder",
        group: "search",
      },
      {
        label: "So sánh",
        href: "/hotels/compare",
        icon: HiArrowPath,
        active: pathname?.includes("/hotels/compare") ?? false,
        feature: "search",
        group: "search",
      },
      {
        label: "Đã lưu",
        href: "/bookmarks",
        icon: FiBookmark,
        active: pathname === "/bookmarks" || !!pathname?.startsWith("/bookmarks/"),
        feature: "search",
        group: "search",
      },
      {
        label: "Cảnh báo giá",
        href: "/price-alerts",
        icon: HiBellAlert,
        active: pathname === "/price-alerts",
        feature: "search",
        group: "search",
      },
      {
        label: "Drive",
        href: "/drive",
        icon: HiFolderOpen,
        active: pathname === "/drive",
        feature: "drive",
        group: "management",
      },
      {
        label: "Bảng điều khiển",
        href: "/dashboard",
        icon: FiGrid,
        active: pathname === "/dashboard",
        feature: "dashboard",
        group: "management",
      },
      {
        label: "Người dùng",
        href: "/users",
        icon: HiUsers,
        active: pathname === "/users",
        feature: "users",
        group: "social",
      },
      {
        label: "Thông báo",
        href: "/notifications",
        icon: HiBell,
        active: pathname === "/notifications",
        group: "social",
      },
      {
        label: "Báo cáo",
        href: "/reports",
        icon: HiDocumentChartBar,
        active: pathname === "/reports",
        group: "management",
      },
    ];

    const base: RouteItem[] = allFeatureRoutes.filter(
      (item) => !item.feature || hasFeature(user, item.feature)
    );

    if (role === ADMIN_ROLE) {
      base.push({
        label: "Quản trị",
        href: "/admin",
        icon: FiShield,
        active: pathname === "/admin" || !!pathname?.startsWith("/admin/"),
        group: "system",
      });
    }

    base.push({
      label: "Cài đặt",
      href: "/settings",
      icon: HiCog,
      active: pathname === "/settings",
      group: "system",
    });

    base.push({
      label: "Đăng xuất",
      onClick: async () => {
        await signOut({ redirect: false });
        window.location.href = "/";
      },
      href: "#",
      icon: HiArrowLeftOnRectangle,
      group: "system",
    });

    return base;
  }, [pathname, conversationId, role, permissionsKey]);

  return routes;
};

export default useRoutes;
