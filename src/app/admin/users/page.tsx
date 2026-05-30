import { Metadata } from "next";

import getAdminUsers from "@/app/actions/getAdminUsers";
import getCurrentUser from "@/app/actions/getCurrentUser";

import AdminUsersClient from "./components/AdminUsersClient";

export const metadata: Metadata = {
  title: "Admin - Người dùng",
};

export const dynamic = "force-dynamic";

const AdminUsersPage = async ({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) => {
  const page = Number.parseInt(searchParams?.page ?? "1", 10) || 1;
  const search = searchParams?.q ?? "";

  const [data, currentUser] = await Promise.all([
    getAdminUsers({ page, search }),
    getCurrentUser(),
  ]);

  if (!data || !currentUser) {
    return (
      <p className="text-gray-400">Bạn không có quyền truy cập dữ liệu này.</p>
    );
  }

  return <AdminUsersClient data={data} currentUserId={currentUser.id} />;
};

export default AdminUsersPage;
