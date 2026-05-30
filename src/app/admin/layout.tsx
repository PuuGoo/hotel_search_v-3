import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Sidebar from "@/app/components/sidebar/Sidebar";
import { isAdmin } from "@/app/libs/authz";

import AdminNav from "./components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authorization. The middleware already redirects non-admins, but
  // this is the authoritative gate (middleware can be bypassed if the matcher
  // ever drifts) and avoids rendering any admin chrome to a non-admin.
  const currentUser = await getCurrentUser();
  if (!isAdmin(currentUser)) {
    redirect("/conversations");
  }

  return (
    // @ts-expect-error Async Server Component: Promise<Element> return type is
    // valid in Next.js 13 but not yet recognized by the React 18 JSX types.
    <Sidebar>
      <div className="h-full overflow-y-auto bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-white">Quản trị hệ thống</h1>
            <p className="text-gray-400 mt-1">
              Tổng quan, người dùng, phân tích và nhật ký hoạt động
            </p>
          </header>
          <AdminNav />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </Sidebar>
  );
}
