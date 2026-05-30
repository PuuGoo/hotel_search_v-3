import { Metadata } from "next";
import { format } from "date-fns";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import getAdminAuditLogs from "@/app/actions/getAdminAuditLogs";

export const metadata: Metadata = {
  title: "Admin - Nhật ký",
};

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "user.role.update": "Đổi vai trò",
  "user.permissions.update": "Đổi quyền chức năng",
  "user.delete": "Xóa người dùng",
};

function describe(action: string, metadata: unknown): string {
  if (action === "user.role.update" && metadata && typeof metadata === "object") {
    const m = metadata as { from?: string; to?: string };
    return `${m.from ?? "?"} → ${m.to ?? "?"}`;
  }
  if (
    action === "user.permissions.update" &&
    metadata &&
    typeof metadata === "object"
  ) {
    const m = metadata as { from?: string[]; to?: string[] };
    const fmt = (arr?: string[]) =>
      !arr || arr.length === 0 ? "tất cả" : arr.join(", ");
    return `${fmt(m.from)} → ${fmt(m.to)}`;
  }
  if (action === "user.delete" && metadata && typeof metadata === "object") {
    const m = metadata as { role?: string };
    return m.role ? `vai trò: ${m.role}` : "";
  }
  return "";
}

const AdminAuditPage = async ({
  searchParams,
}: {
  searchParams?: { page?: string };
}) => {
  const page = Number.parseInt(searchParams?.page ?? "1", 10) || 1;
  const data = await getAdminAuditLogs({ page });

  if (!data) {
    return (
      <p className="text-gray-400">Bạn không có quyền truy cập dữ liệu này.</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{data.total} bản ghi</p>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Thời gian</th>
              <th className="px-4 py-3 text-left font-medium">Hành động</th>
              <th className="px-4 py-3 text-left font-medium">Thực hiện bởi</th>
              <th className="px-4 py-3 text-left font-medium">Đối tượng</th>
              <th className="px-4 py-3 text-left font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.logs.map((log) => (
              <tr key={log.id} className="bg-gray-900">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {format(new Date(log.createdAt), "HH:mm:ss dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3 text-white">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {log.actorEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {log.targetEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {describe(log.action, log.metadata)}
                </td>
              </tr>
            ))}
            {data.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Chưa có hoạt động nào được ghi nhận
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Link
            aria-disabled={data.page <= 1}
            href={`/admin/audit?page=${data.page - 1}`}
            className={`flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 ${
              data.page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <FiChevronLeft className="h-4 w-4" /> Trước
          </Link>
          <span className="text-sm text-gray-400">
            Trang {data.page} / {data.totalPages}
          </span>
          <Link
            aria-disabled={data.page >= data.totalPages}
            href={`/admin/audit?page=${data.page + 1}`}
            className={`flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 ${
              data.page >= data.totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Sau <FiChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAuditPage;
