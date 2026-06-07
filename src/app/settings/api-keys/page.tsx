"use client";

import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  FiKey,
  FiPlus,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiClock,
  FiArrowLeft,
} from "react-icons/fi";
import Link from "next/link";

interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreatedKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  search: "Tìm kiếm",
  bulk: "Tìm kiếm hàng loạt",
  finder: "Finder",
  chat: "Chat",
};

const EXPIRY_OPTIONS = [
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
  { label: "1 năm", days: 365 },
  { label: "Không hết hạn", days: 0 },
];

const ApiKeysPage = () => {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formExpiry, setFormExpiry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await axios.get("/api/settings/api-keys");
      setApiKeys(res.data);
    } catch {
      toast.error("Không thể tải danh sách API key");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Vui lòng nhập tên API key");
      return;
    }
    if (formPermissions.length === 0) {
      toast.error("Vui lòng chọn ít nhất một quyền hạn");
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post("/api/settings/api-keys", {
        name: formName.trim(),
        permissions: formPermissions,
        expiresInDays: formExpiry || undefined,
      });
      setCreatedKey(res.data);
      setFormName("");
      setFormPermissions([]);
      setFormExpiry(0);
      setShowForm(false);
      fetchKeys();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) &&
        typeof error?.response?.data === "string"
          ? error.response.data
          : "Đã có lỗi xảy ra!";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success("Đã sao chép API key");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete("/api/settings/api-keys", { data: { id: deleteId } });
      toast.success("Đã xóa API key");
      setDeleteId(null);
      fetchKeys();
    } catch {
      toast.error("Không thể xóa API key");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="h-full bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/settings"
            className="rounded-lg p-2 text-ink-soft hover:bg-panel hover:text-ink"
          >
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <FiKey className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-ink">Quản lý API Keys</h1>
        </div>

        {createdKey && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
            <h3 className="mb-2 text-sm font-semibold text-green-400">
              API Key đã được tạo thành công
            </h3>
            <p className="mb-3 text-xs text-ink-soft">
              Hãy sao chép và lưu trữ key ở nơi an toàn. Key sẽ chỉ hiển thị
              một lần duy nhất.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-canvas px-4 py-3 text-sm text-green-400 break-all">
                {createdKey.key}
              </code>
              <button
                onClick={() => handleCopyKey(createdKey.key)}
                className="rounded-lg bg-fill p-3 text-ink hover:bg-hairline hover:text-ink"
              >
                {copied ? (
                  <FiCheck className="h-4 w-4 text-green-400" />
                ) : (
                  <FiCopy className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-3 text-xs text-ink-soft hover:text-ink"
            >
              Đã lưu, đóng thông báo
            </button>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            {apiKeys.length} API key
          </p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="
              flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5
              text-sm font-medium text-white hover:bg-blue-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:ring-offset-2 focus:ring-offset-white
            "
          >
            <FiPlus className="h-4 w-4" />
            Tạo key mới
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg border border-hairline bg-panel p-6">
            <h3 className="mb-4 text-lg font-semibold text-ink">
              Tạo API Key mới
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-ink-soft">
                  Tên API Key
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: MyApp Backend"
                  className="
                    w-full rounded-lg border border-hairline bg-panel px-4 py-2.5
                    text-sm text-ink placeholder:text-ink-soft
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-ink-soft">
                  Quyền hạn
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className={`
                        flex cursor-pointer items-center gap-2 rounded-lg border p-3
                        transition-colors
                        ${
                          formPermissions.includes(key)
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-hairline bg-panel text-ink hover:border-gray-300"
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={formPermissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        className="sr-only"
                      />
                      <div
                        className={`
                          flex h-4 w-4 items-center justify-center rounded border
                          ${
                            formPermissions.includes(key)
                              ? "border-blue-500 bg-blue-500"
                              : "border-hairline"
                          }
                        `}
                      >
                        {formPermissions.includes(key) && (
                          <FiCheck className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-ink-soft">
                  Thời hạn
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => setFormExpiry(opt.days)}
                      className={`
                        rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                        ${
                          formExpiry === opt.days
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-hairline bg-panel text-ink hover:border-gray-300"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="
                    rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white
                    hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {creating ? "Đang tạo..." : "Tạo API Key"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormName("");
                    setFormPermissions([]);
                    setFormExpiry(0);
                  }}
                  className="
                    rounded-lg bg-fill px-4 py-2.5 text-sm font-medium text-ink
                    hover:bg-hairline hover:text-ink
                  "
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-lg border border-hairline bg-panel p-12 text-center">
            <FiKey className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <p className="text-ink-soft">Chưa có API key nào</p>
            <p className="mt-1 text-sm text-ink-soft">
              Nhấn &quot;Tạo key mới&quot; để bắt đầu
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-hairline bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-canvas/50">
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Tên
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Key
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Quyền hạn
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Lần dùng cuối
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Hết hạn
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-soft">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => {
                    const expired = isExpired(key.expiresAt);
                    return (
                      <tr
                        key={key.id}
                        className="border-b border-hairline last:border-0 hover:bg-canvas/30"
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          {key.name}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-ink-soft">
                            {key.maskedKey}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {key.permissions.map((p) => (
                              <span
                                key={p}
                                className="rounded bg-panel px-2 py-0.5 text-xs text-ink"
                              >
                                {PERMISSION_LABELS[p] || p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 ring-1 ring-inset ring-red-500/20">
                              Hết hạn
                            </span>
                          ) : key.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400 ring-1 ring-inset ring-green-500/20">
                              <FiCheck className="h-3 w-3" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-xs text-ink-soft ring-1 ring-inset ring-gray-500/20">
                              Vô hiệu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          <div className="flex items-center gap-1">
                            <FiClock className="h-3 w-3" />
                            {formatDate(key.lastUsedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {formatDate(key.expiresAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDeleteId(key.id)}
                            className="rounded-lg p-2 text-ink-soft hover:bg-red-500/10 hover:text-red-400"
                            title="Xóa"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="mx-4 w-full max-w-md rounded-lg border border-hairline bg-panel p-6">
              <h3 className="mb-2 text-lg font-semibold text-ink">
                Xác nhận xóa
              </h3>
              <p className="mb-6 text-sm text-ink-soft">
                Bạn có chắc chắn muốn xóa API key này? Hành động này không thể
                hoàn tác.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="
                    rounded-lg bg-fill px-4 py-2.5 text-sm font-medium text-ink
                    hover:bg-hairline hover:text-ink
                  "
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="
                    rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white
                    hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500
                    focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {deleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeysPage;
