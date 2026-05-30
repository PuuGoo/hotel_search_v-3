import getCurrentUser from "./getCurrentUser";
import prisma from "../libs/prismadb";
import { isAdmin, ADMIN_ROLE, USER_ROLE } from "../libs/authz";

// Aggregated, platform-wide stats for the admin overview. Returns null when the
// caller is not an admin so the page can render a not-authorized state without
// leaking counts. All counts run in a single parallel batch.
const getAdminOverview = async () => {
  const currentUser = await getCurrentUser();

  if (!isAdmin(currentUser)) {
    return null;
  }

  const [
    totalUsers,
    totalAdmins,
    totalSearches,
    totalBookmarks,
    totalConversations,
    totalMessages,
    newUsers7d,
    searches7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: ADMIN_ROLE } }),
    prisma.search.count(),
    prisma.bookmark.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.user.count({
      where: { createdAt: { gte: daysAgo(7) } },
    }),
    prisma.search.count({
      where: { createdAt: { gte: daysAgo(7) } },
    }),
  ]);

  return {
    totalUsers,
    totalAdmins,
    totalRegularUsers: Math.max(0, totalUsers - totalAdmins),
    totalSearches,
    totalBookmarks,
    totalConversations,
    totalMessages,
    newUsers7d,
    searches7d,
  };
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default getAdminOverview;
export { ADMIN_ROLE, USER_ROLE };
