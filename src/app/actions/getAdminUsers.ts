import getCurrentUser from "./getCurrentUser";
import prisma from "../libs/prismadb";
import { isAdmin } from "../libs/authz";

const PAGE_SIZE = 20;

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  permissions: string[];
  image: string | null;
  createdAt: Date;
  conversationCount: number;
  searchCount: number;
  bookmarkCount: number;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
}

// Admin-only paged user directory with per-user activity counts. Unlike
// getUsers (the chat people-picker), this includes the current admin and
// exposes role + counts. Returns null for non-admins.
const getAdminUsers = async (
  options: { page?: number; search?: string } = {}
): Promise<AdminUsersResult | null> => {
  const currentUser = await getCurrentUser();

  if (!isAdmin(currentUser)) {
    return null;
  }

  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;
  const search = (options.search ?? "").trim();

  // Case-insensitive contains match on name OR email when a search term is
  // present; otherwise list everyone.
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [records, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        image: true,
        createdAt: true,
        conversationIds: true,
        _count: { select: { searches: true, bookmarks: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const users: AdminUserRow[] = records.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "user",
    permissions: u.permissions ?? [],
    image: u.image,
    createdAt: u.createdAt,
    conversationCount: u.conversationIds.length,
    searchCount: u._count.searches,
    bookmarkCount: u._count.bookmarks,
  }));

  return {
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    search,
  };
};

export default getAdminUsers;
export { PAGE_SIZE as ADMIN_USERS_PAGE_SIZE };
