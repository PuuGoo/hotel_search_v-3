"use client";

import { useCallback, useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp, FiFilter, FiEye } from "react-icons/fi";

interface AuditActor {
  id: string;
  name: string | null;
  email: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  targetEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditActor | null;
}

interface AuditResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const ACTION_OPTIONS = [
  { value: "", label: "Tất cả hành động" },
  { value: "user.role.update", label: "Cập nhật vai trò" },
  { value: "user.permissions.update", label: "Cập nhật quyền" },
  { value: "user.delete", label: "Xóa người dùng" },
  { value: "user.create", label: "Tạo người dùng" },
  { value: "settings.update", label: "Cập nhật cài đặt" },
];

const ACTION_LABELS: Record<string, string> = {
  "user.role.update": "Cập nhật vai trò",
  "user.permissions.update": "Cập nhật quyền",
  "user.delete": "Xóa người dùng",
  "user.create": "Tạo người dùng",
  "settings.update": "Cập nhật cài đặt",
};

const ITEMS_PER_PAGE = 50;

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const [searchTarget, setSearchTarget] = useState("");

  const fetchLogs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(ITEMS_PER_PAGE));
      if (actionFilter) params.set("action", actionFilter);
      if (searchActor) params.set("actorEmail", searchActor);
      if (searchTarget) params.set("targetEmail", searchTarget);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      try {
        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        if (res.ok) {
          const data: AuditResponse = await res.json();
          setLogs(data.logs);
          setTotal(data.total);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, searchActor, searchTarget, fromDate, toDate]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  const handleSearch = () => {
    setSearchActor(actorEmail);
    setSearchTarget(targetEmail);
    setPage(1);
  };

  const handleReset = () => {
    setActionFilter("");
    setActorEmail("");
    setTargetEmail("");
    setFromDate("");
    setToDate("");
    setSearchActor("");
    setSearchTarget("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiEye className="h-6 w-6 text-sky-400" />
        <h2 className="text-xl font-semibold text-ink">
          Nhật ký hoạt động
        </h2>
      </div>

      <div className="rounded-lg bg-panel p-4 space-y-4">
        <div className="flex items-center gap-2 text-ink">
          <FiFilter className="h-4 w-4" />
          <span className="text-sm font-medium">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-ink-soft mb-1">
              Hành động
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-md bg-fill border border-hairline text-ink px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">
              Email người thực hiện
            </label>
            <input
              type="text"
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              placeholder="Tìm theo email..."
              className="w-full rounded-md bg-fill border border-hairline text-ink px-3 py-2 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">
              Email đối tượng
            </label>
            <input
              type="text"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="Tìm theo email..."
              className="w-full rounded-md bg-fill border border-hairline text-ink px-3 py-2 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md bg-fill border border-hairline text-ink px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md bg-fill border border-hairline text-ink px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
            >
              Tìm kiếm
            </button>
            <button
              onClick={handleReset}
              className="rounded-md bg-fill px-4 py-2 text-sm font-medium text-ink hover:bg-hairline transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Hành động</th>
                <th className="px-4 py-3 font-medium">Người thực hiện</th>
                <th className="px-4 py-3 font-medium">Đối tượng</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                    Đang tải...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                    Không có bản ghi nào
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <AuditRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    formatDate={formatDate}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, total)} / {total} bản ghi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md bg-fill px-3 py-1.5 text-sm text-ink hover:bg-hairline disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <span className="text-sm text-ink-soft">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md bg-fill px-3 py-1.5 text-sm text-ink hover:bg-hairline disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function AuditRow({
  log,
  expanded,
  onToggle,
  formatDate,
}: {
  log: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
  formatDate: (iso: string) => string;
}) {
  const actorName = log.actor?.name || log.actorEmail || "—";
  const target = log.targetEmail || log.targetId || "—";

  return (
    <>
      <tr className="border-b border-hairline/50 hover:bg-fill/30 transition-colors">
        <td className="px-4 py-3 text-ink whitespace-nowrap">
          {formatDate(log.createdAt)}
        </td>
        <td className="px-4 py-3">
          <span className="inline-block rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-gray-200">
            {ACTION_LABELS[log.action] || log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-ink">{actorName}</td>
        <td className="px-4 py-3 text-ink">{target}</td>
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="text-ink-soft hover:text-ink transition-colors"
          >
            {expanded ? (
              <FiChevronUp className="h-4 w-4" />
            ) : (
              <FiChevronDown className="h-4 w-4" />
            )}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-canvas/50">
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-ink-soft">ID: </span>
                  <span className="text-ink font-mono">{log.id}</span>
                </div>
                <div>
                  <span className="text-ink-soft">Loại đối tượng: </span>
                  <span className="text-ink">{log.targetType || "—"}</span>
                </div>
                <div>
                  <span className="text-ink-soft">ID đối tượng: </span>
                  <span className="text-ink font-mono">
                    {log.targetId || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-ink-soft">Actor ID: </span>
                  <span className="text-ink font-mono">
                    {log.actorId || "—"}
                  </span>
                </div>
              </div>
              {log.metadata && (
                <div>
                  <span className="text-xs text-ink-soft">Metadata:</span>
                  <pre className="mt-1 rounded-md bg-panel p-3 text-xs text-ink overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default AuditLogPage;
