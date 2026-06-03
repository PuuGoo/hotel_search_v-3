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

import { ADMIN_ROLE } from "../libs/authz";
import { hasFeature, type Feature } from "../libs/features";
import useConversation from "./useConversation";

interface RouteItem {
  label: string;
  href: string;
  icon: any;
  active?: boolean;
  onClick?: () => void;
  feature?: Feature;
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
      },
      {
        label: "Tìm kiếm",
        href: "/hotels",
        icon: HiMagnifyingGlass,
        active: pathname === "/hotels",
        feature: "search",
      },
      {
        label: "Tìm hàng loạt",
        href: "/hotels/bulk",
        icon: FiZap,
        active: pathname === "/hotels/bulk",
        feature: "bulk",
      },
      {
        label: "Tìm URL",
        href: "/hotels/finder",
        icon: FiGlobe,
        active: pathname === "/hotels/finder",
        feature: "finder",
      },
      {
        label: "So sánh",
        href: "/hotels/compare",
        icon: HiArrowPath,
        active: pathname?.includes("/hotels/compare") ?? false,
        feature: "search",
      },
      {
        label: "Đã lưu",
        href: "/bookmarks",
        icon: FiBookmark,
        active: pathname === "/bookmarks" || !!pathname?.startsWith("/bookmarks/"),
        feature: "search",
      },
      {
        label: "Cảnh báo giá",
        href: "/price-alerts",
        icon: HiBellAlert,
        active: pathname === "/price-alerts",
        feature: "search",
      },
      {
        label: "Drive",
        href: "/drive",
        icon: HiFolderOpen,
        active: pathname === "/drive",
        feature: "drive",
      },
      {
        label: "Bảng điều khiển",
        href: "/dashboard",
        icon: FiGrid,
        active: pathname === "/dashboard",
        feature: "dashboard",
      },
      {
        label: "Người dùng",
        href: "/users",
        icon: HiUsers,
        active: pathname === "/users",
        feature: "users",
      },
      {
        label: "Thông báo",
        href: "/notifications",
        icon: HiBell,
        active: pathname === "/notifications",
      },
      {
        label: "Báo cáo",
        href: "/reports",
        icon: HiDocumentChartBar,
        active: pathname === "/reports",
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
      });
    }

    base.push({
      label: "Cài đặt",
      href: "/settings",
      icon: HiCog,
      active: pathname === "/settings",
    });

    base.push({
      label: "Đăng xuất",
      // Await the signout (cookie cleared) BEFORE navigating, then force a full
      // document load to "/" rather than letting NextAuth/Router soft-navigate.
      // A hard reload guarantees the login page fetches a fresh (unauthenticated)
      // session, so its "authenticated -> /conversations" effect can't fire on a
      // stale client cache and bounce the user back in (the "logout twice" bug).
      onClick: async () => {
        await signOut({ redirect: false });
        window.location.href = "/";
      },
      href: "#",
      icon: HiArrowLeftOnRectangle,
    });

    return base;
  }, [pathname, conversationId, role, permissionsKey]);

  return routes;
};

export default useRoutes;
