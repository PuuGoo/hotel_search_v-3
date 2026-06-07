"use client";

import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "../../components/ConfirmDialog";
import {
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiFolder,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

interface Bookmark {
  id: string;
  title: string | null;
  url: string | null;
  notes: string | null;
  folder: string | null;
  tags: string[];
  createdAt: string;
}

interface BookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  folders: string[];
}

const BookmarksClient = () => {
  const { confirm, DialogElement } = useConfirm();
  const [data, setData] = useState<BookmarksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState<string>("");
  const [term, setTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (folder) params.set("folder", folder);
      const res = await axios.get(`/api/bookmarks?${params.toString()}`);
      setData(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Không tải được danh sách đã lưu");
    } finally {
      setLoading(false);
    }
  }, [page, folder]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    async (bookmark: Bookmark) => {
      if (!(await confirm({ message: "Xóa mục đã lưu này?", title: "Xóa mục đã lưu", confirmLabel: "Xóa", variant: "danger" }))) return;
      setBusyId(bookmark.id);
      try {
        await axios.delete(`/api/bookmarks?id=${bookmark.id}`);
        toast.success("Đã xóa");
        // Reload; if we just removed the last item on a page, step back a page.
        if (data && data.bookmarks.length === 1 && page > 1) {
          setPage((p) => p - 1);
        } else {
          load();
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Xóa thất bại");
      } finally {
        setBusyId(null);
      }
    },
    [data, page, load, confirm]
  );

  // Client-side text filter over the current page (title/url/notes). Server
  // already handles folder filtering + pagination.
  const visible = (data?.bookmarks ?? []).filter((b) => {
    if (!term.trim()) return true;
    const t = term.toLowerCase();
    return (
      (b.title ?? "").toLowerCase().includes(t) ||
      (b.url ?? "").toLowerCase().includes(t) ||
      (b.notes ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      {DialogElement}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
            <FiBookmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Đã lưu</h1>
            <p className="text-sm text-ink-soft">
              {data ? `${data.total} mục` : "Đang tải..."}
            </p>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Lọc theo tiêu đề, URL, ghi chú"
              className="w-full rounded-lg bg-panel border border-hairline pl-10 pr-3 py-2 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="relative">
            <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <select
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-panel border border-hairline pl-10 pr-8 py-2 text-sm text-ink focus:outline-none focus:border-sky-500"
            >
              <option value="">Tất cả thư mục</option>
              {(data?.folders ?? []).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-ink-soft py-12 text-center">Đang tải...</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <FiBookmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Chưa có mục nào được lưu</p>
            <p className="text-sm mt-2">
              Lưu kết quả từ trang{" "}
              <Link href="/hotels" className="text-sky-400 underline">
                Tìm kiếm
              </Link>{" "}
              để xem ở đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((b) => (
              <div
                key={b.id}
                className="bg-panel rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-ink font-medium truncate">
                      {b.title || "Không có tiêu đề"}
                    </h3>
                    {b.folder ? (
                      <span className="text-xs rounded bg-fill px-1.5 py-0.5 text-ink">
                        {b.folder}
                      </span>
                    ) : null}
                  </div>
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 truncate block hover:underline"
                    >
                      {b.url}
                    </a>
                  ) : null}
                  {b.notes ? (
                    <p className="text-sm text-ink-soft mt-1 line-clamp-2">{b.notes}</p>
                  ) : null}
                  {b.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-gray-600 mt-2">
                    {format(new Date(b.createdAt), "HH:mm dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Mở liên kết"
                      className="p-2 text-ink-soft hover:text-sky-400"
                    >
                      <FiExternalLink />
                    </a>
                  ) : null}
                  <button
                    disabled={busyId === b.id}
                    onClick={() => remove(b)}
                    aria-label="Xóa"
                    className="p-2 text-ink-soft hover:text-rose-400 disabled:opacity-50"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination (server-driven; only meaningful without a text filter) */}
        {data && data.totalPages > 1 && !term.trim() ? (
          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg bg-panel px-3 py-2 text-sm text-ink hover:bg-fill disabled:opacity-40"
            >
              <FiChevronLeft className="h-4 w-4" /> Trước
            </button>
            <span className="text-sm text-ink-soft">
              Trang {data.page} / {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg bg-panel px-3 py-2 text-sm text-ink hover:bg-fill disabled:opacity-40"
            >
              Sau <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BookmarksClient;
