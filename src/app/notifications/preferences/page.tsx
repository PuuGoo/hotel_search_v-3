"use client";

import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FiBell, FiSave, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

interface NotificationPrefs {
  newMessages: boolean;
  systemNotifications: boolean;
  priceAlerts: boolean;
  typingIndicator: boolean;
  messageSeen: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
}

const defaultPrefs: NotificationPrefs = {
  newMessages: true,
  systemNotifications: true,
  priceAlerts: true,
  typingIndicator: true,
  messageSeen: true,
  soundEnabled: true,
  desktopNotifications: false,
  quietHoursFrom: "",
  quietHoursTo: "",
};

const ToggleSwitch = ({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed
        ${enabled ? "bg-blue-600" : "bg-gray-700"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
          transition duration-200 ease-in-out
          ${enabled ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
};

const NotificationPreferencesPage = () => {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const res = await axios.get("/api/settings/notifications");
      if (res.data && typeof res.data === "object") {
        setPrefs({ ...defaultPrefs, ...res.data });
      }
    } catch {
      setPrefs(defaultPrefs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put("/api/settings/notifications", prefs);
      toast.success("Đã lưu tùy chọn thông báo");
      router.refresh();
    } catch {
      toast.error("Không thể lưu tùy chọn");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="h-full bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft className="h-4 w-4" />
            Quay lại cài đặt
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <FiBell className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Tùy chọn thông báo</h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Loại thông báo
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Tin nhắn mới</p>
                  <p className="text-xs text-gray-400">
                    Nhận thông báo khi có tin nhắn mới
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.newMessages}
                  onChange={(val) => updatePref("newMessages", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Thông báo hệ thống
                  </p>
                  <p className="text-xs text-gray-400">
                    Thông báo từ hệ thống và cập nhật
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.systemNotifications}
                  onChange={(val) => updatePref("systemNotifications", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Cảnh báo giá</p>
                  <p className="text-xs text-gray-400">
                    Thông báo khi giá khách sạn thay đổi
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.priceAlerts}
                  onChange={(val) => updatePref("priceAlerts", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Có người đang nhập
                  </p>
                  <p className="text-xs text-gray-400">
                    Hiển thị khi người khác đang nhập tin nhắn
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.typingIndicator}
                  onChange={(val) => updatePref("typingIndicator", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Đã xem tin nhắn
                  </p>
                  <p className="text-xs text-gray-400">
                    Thông báo khi tin nhắn của bạn đã được đọc
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.messageSeen}
                  onChange={(val) => updatePref("messageSeen", val)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Phương thức thông báo
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Âm thanh thông báo
                  </p>
                  <p className="text-xs text-gray-400">
                    Phát âm thanh khi nhận thông báo
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.soundEnabled}
                  onChange={(val) => updatePref("soundEnabled", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Thông báo trên máy tính
                  </p>
                  <p className="text-xs text-gray-400">
                    Hiển thị thông báo trên màn hình desktop
                  </p>
                </div>
                <ToggleSwitch
                  enabled={prefs.desktopNotifications}
                  onChange={(val) => updatePref("desktopNotifications", val)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Giờ yên tĩnh
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Tắt thông báo trong khoảng thời gian này
            </p>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Từ
                </label>
                <input
                  type="time"
                  value={prefs.quietHoursFrom}
                  onChange={(e) => updatePref("quietHoursFrom", e.target.value)}
                  className="
                    rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5
                    text-sm text-white focus:border-blue-500 focus:outline-none
                    focus:ring-1 focus:ring-blue-500
                  "
                />
              </div>
              <span className="mt-6 text-gray-500">đến</span>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Đến
                </label>
                <input
                  type="time"
                  value={prefs.quietHoursTo}
                  onChange={(e) => updatePref("quietHoursTo", e.target.value)}
                  className="
                    rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5
                    text-sm text-white focus:border-blue-500 focus:outline-none
                    focus:ring-1 focus:ring-blue-500
                  "
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="
                inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5
                text-sm font-medium text-white hover:bg-blue-500 focus:outline-none
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <FiSave className="h-4 w-4" />
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
