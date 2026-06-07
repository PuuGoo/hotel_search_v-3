"use client";

import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";

import { FEATURES, FEATURE_LABELS, type Feature } from "@/app/libs/features";
import type { AdminUserRow } from "@/app/actions/getAdminUsers";

interface PermissionsModalProps {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: () => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  user,
  onClose,
  onSaved,
}) => {
  // Empty list = unrestricted. "Restrict" mode lets the admin pick an explicit
  // allow-list; turning it off clears the list back to unrestricted.
  const [restricted, setRestricted] = useState(user.permissions.length > 0);
  const [selected, setSelected] = useState<Set<Feature>>(
    new Set(user.permissions as Feature[])
  );
  const [saving, setSaving] = useState(false);

  const toggle = (feature: Feature) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return next;
    });
  };

  const save = async () => {
    // When unrestricted, persist an empty array regardless of any prior picks.
    const permissions = restricted
      ? FEATURES.filter((f) => selected.has(f))
      : [];
    setSaving(true);
    try {
      await axios.put(`/api/admin/users/${user.id}/permissions`, {
        permissions,
      });
      toast.success("Đã cập nhật quyền truy cập");
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={saving ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-ink">Quyền chức năng</h3>
            <p className="truncate text-sm text-ink-soft">
              {user.email ?? user.name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-ink-soft hover:bg-fill hover:text-ink"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 flex items-center gap-3">
          <input
            type="checkbox"
            checked={restricted}
            onChange={(e) => setRestricted(e.target.checked)}
            className="h-4 w-4 rounded border-hairline bg-fill"
          />
          <span className="text-sm text-gray-200">
            Giới hạn chức năng được phép dùng
          </span>
        </label>
        <p className="mt-1 text-xs text-ink-soft">
          Bỏ chọn = cho phép tất cả chức năng.
        </p>

        <div className="mt-4 space-y-2">
          {FEATURES.map((feature) => (
            <label
              key={feature}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                restricted
                  ? "border-hairline bg-canvas"
                  : "border-hairline/50 bg-canvas/40 opacity-50"
              }`}
            >
              <input
                type="checkbox"
                disabled={!restricted}
                checked={!restricted || selected.has(feature)}
                onChange={() => toggle(feature)}
                className="h-4 w-4 rounded border-hairline bg-fill"
              />
              <span className="text-sm text-ink">
                {FEATURE_LABELS[feature]}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg bg-fill px-4 py-2 text-sm text-gray-200 hover:bg-hairline disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
