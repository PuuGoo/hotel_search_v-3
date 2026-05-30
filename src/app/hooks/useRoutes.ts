import { useMemo } from "react";
import { HiChat } from "react-icons/hi";
import {
  HiArrowLeftOnRectangle,
  HiMagnifyingGlass,
  HiUsers,
} from "react-icons/hi2";
import { FiGrid, FiZap, FiGlobe, FiShield } from "react-icons/fi";

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

  const routes = useMemo<RouteItem[]>(() => {
    const allFeatureRoutes: RouteItem[] = [
      {
        label: "Chat",
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
        label: "Bulk Search",
        href: "/hotels/bulk",
        icon: FiZap,
        active: pathname === "/hotels/bulk",
        feature: "bulk",
      },
      {
        label: "URL Finder",
        href: "/hotels/finder",
        icon: FiGlobe,
        active: pathname === "/hotels/finder",
        feature: "finder",
      },
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: FiGrid,
        active: pathname === "/dashboard",
        feature: "dashboard",
      },
      {
        label: "Users",
        href: "/users",
        icon: HiUsers,
        active: pathname === "/users",
        feature: "users",
      },
    ];

    const base: RouteItem[] = allFeatureRoutes.filter(
      (item) => !item.feature || hasFeature(user, item.feature)
    );

    if (role === ADMIN_ROLE) {
      base.push({
        label: "Admin",
        href: "/admin",
        icon: FiShield,
        active: pathname === "/admin" || !!pathname?.startsWith("/admin/"),
      });
    }

    base.push({
      label: "Logout",
      onClick: () => signOut(),
      href: "#",
      icon: HiArrowLeftOnRectangle,
    });

    return base;
  }, [pathname, conversationId, role, user]);

  return routes;
};

export default useRoutes;
