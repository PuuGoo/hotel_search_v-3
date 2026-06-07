"use client";

import axios from "axios";
import { format } from "date-fns";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

import { FEATURE_LABELS, type Feature } from "@/app/libs/features";
import type { AdminUsersResult, AdminUserRow } from "@/app/actions/getAdminUsers";

import PermissionsModal from "./PermissionsModal";

interface AdminUsersClientProps {
  data: AdminUsersResult;
  currentUserId: string;
}

const AdminUsersClient: React.FC<AdminUsersClientProps> = ({
  data,
  currentUserId,
}) => {
  const { confirm, DialogElement } = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(data.search);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  // Push the search/page into the URL so the server component re-fetches; the
  // list itself is always server-rendered (single source of truth).
  const navigate = useCallback(
    (next: { q?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (next.q !== undefined) {
        if (next.q) params.set("q", next.q);
        else params.delete("q");
      }
      if (next.page !== undefined) params.set("page", String(next.page));
      router.push(`/admin/users?${params.toString()}`);
    },
    [router, searchParams]
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: term.trim(), page: 1 });
  };

  const changeRole = useCallback(
    async (user: AdminUserRow, nextRole: "admin" | "user") => {
      setPendingId(user.id);
      try {
        await axios.patch(`/api/admin/users/${user.id}`, { role: nextRole });
        toast.success(
          nextRole === "admin"
            ? `Đã cấp quyền admin cho ${user.email ?? user.name ?? "người dùng"}`
            : `Đã thu hồi quyền admin của ${user.email ?? user.name ?? "người dùng"}`
        );
        router.refresh();
      } catch (error: any) {
        toast.error(error?.response?.data?.error ?? "Cập nhật thất bại");
      } finally {
        setPendingId(null);
      }
    },
    [router]
  );

  const deleteUser = useCallback(
    async (user: AdminUserRow) => {
      const label = user.email ?? user.name ?? "người dùng này";
      if (!(await confirm({ message: `Xóa ${label}? Hành động này không thể hoàn tác.`, title: "Xóa người dùng", confirmLabel: "Xóa", variant: "danger" }))) {
        return;
      }
      setPendingId(user.id);
      try {
        await axios.delete(`/api/admin/users/${user.id}`);
        toast.success(`Đã xóa ${label}`);
        router.refresh();
      } catch (error: any) {
        toast.error(error?.response?.data?.error ?? "Xóa thất bại");
      } finally {
        setPendingId(null);
      }
    },
    [router, confirm]
  );

  return (
    <div className="space-y-4">
      {DialogElement}
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="w-full rounded-lg bg-panel border border-hairline pl-10 pr-3 py-2 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Tìm
        </button>
      </form>

      <p className="text-sm text-ink-soft">
        {data.total} người dùng
        {data.search ? ` khớp với "${data.search}"` : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full text-sm">
          <thead className="bg-panel text-ink-soft">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Người dùng</th>
              <th className="px-4 py-3 text-left font-medium">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium">Quyền chức năng</th>
              <th className="px-4 py-3 text-right font-medium">Tìm kiếm</th>
              <th className="px-4 py-3 text-right font-medium">Bookmark</th>
              <th className="px-4 py-3 text-left font-medium">Tham gia</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isAdminRole = user.role === "admin";
              const busy = pendingId === user.id;
              return (
                <tr key={user.id} className="bg-canvas hover:bg-panel/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-fill">
                        <Image
                          fill
                          sizes="36px"
                          className="object-cover"
                          src={user.image || "/images/avatar-placeholder.png"}
                          alt=""
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-ink">
                          {user.name || "—"}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-sky-400">(bạn)</span>
                          ) : null}
                        </p>
                        <p className="truncate text-ink-soft">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isAdminRole
                          ? "inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300"
                          : "inline-flex items-center gap-1 rounded-full bg-fill px-2 py-0.5 text-xs font-medium text-ink"
                      }
                    >
                      {isAdminRole ? (
                        <FiShield className="h-3 w-3" />
                      ) : (
                        <FiUser className="h-3 w-3" />
                      )}
                      {isAdminRole ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isAdminRole ? (
                      <span className="text-xs text-ink-soft">Toàn quyền</span>
                    ) : user.permissions.length === 0 ? (
                      <span className="text-xs text-ink-soft">
                        Tất cả chức năng
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-300"
                          >
                            {FEATURE_LABELS[p as Feature] ?? p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ink">
                    {user.searchCount}
                  </td>
                  <td className="px-4 py-3 text-right text-ink">
                    {user.bookmarkCount}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {format(new Date(user.createdAt), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isSelf ? (
                        <span className="text-xs text-ink-soft">
                          Không thể tự sửa
                        </span>
                      ) : (
                        <>
                          {isAdminRole ? (
                            <button
                              disabled={busy}
                              onClick={() => changeRole(user, "user")}
                              className="rounded-md bg-fill px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-hairline disabled:opacity-50"
                            >
                              Thu hồi admin
                            </button>
                          ) : (
                            <button
                              disabled={busy}
                              onClick={() => changeRole(user, "admin")}
                              className="rounded-md bg-purple-500/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                            >
                              Cấp admin
                            </button>
                          )}
                          {!isAdminRole ? (
                            <button
                              disabled={busy}
                              onClick={() => setEditing(user)}
                              className="flex items-center gap-1 rounded-md bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/30 disabled:opacity-50"
                            >
                              <FiSliders className="h-3.5 w-3.5" />
                              Quyền
                            </button>
                          ) : null}
                          <button
                            disabled={busy}
                            onClick={() => deleteUser(user)}
                            aria-label="Xóa người dùng"
                            className="rounded-md bg-rose-500/20 p-1.5 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  Không có người dùng nào
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            disabled={data.page <= 1}
            onClick={() => navigate({ page: data.page - 1 })}
            className="flex items-center gap-1 rounded-lg bg-panel px-3 py-2 text-sm text-ink hover:bg-fill disabled:opacity-40"
          >
            <FiChevronLeft className="h-4 w-4" /> Trước
          </button>
          <span className="text-sm text-ink-soft">
            Trang {data.page} / {data.totalPages}
          </span>
          <button
            disabled={data.page >= data.totalPages}
            onClick={() => navigate({ page: data.page + 1 })}
            className="flex items-center gap-1 rounded-lg bg-panel px-3 py-2 text-sm text-ink hover:bg-fill disabled:opacity-40"
          >
            Sau <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {editing ? (
        <PermissionsModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
};

export default AdminUsersClient;
