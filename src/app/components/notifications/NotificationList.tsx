"use client";

import { useCallback, useEffect, useState } from "react";

import { HiBell, HiChatBubbleLeft, HiExclamationTriangle, HiInformationCircle } from "react-icons/hi2";

import clsx from "clsx";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

type FilterType = "all" | "message" | "system" | "alert";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

function notificationIcon(type: string) {
  switch (type) {
    case "message":
      return <HiChatBubbleLeft className="w-5 h-5 text-blue-500" />;
    case "alert":
      return <HiExclamationTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <HiInformationCircle className="w-5 h-5 text-emerald-500" />;
  }
}

function filterLabel(type: FilterType): string {
  switch (type) {
    case "message":
      return "Tin nhắn";
    case "system":
      return "Hệ thống";
    case "alert":
      return "Cảnh báo";
    default:
      return "Tất cả";
  }
}

const FILTER_OPTIONS: FilterType[] = ["all", "message", "system", "alert"];

const NotificationList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter(
    (n) => filter === "all" || n.type === filter
  );

  const handleMarkRead = async (id: string) => {
    setMarkingId(id);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {} finally {
      setMarkingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-ink-soft dark:text-gray-400">
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-full transition",
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            )}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-soft dark:text-gray-400">
            <HiBell className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Không có thông báo</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                className={clsx(
                  "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition",
                  !notification.isRead && "bg-blue-50 dark:bg-gray-700/30"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {notificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={clsx(
                      "text-sm",
                      !notification.isRead
                        ? "font-semibold text-gray-900 dark:text-gray-100"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-ink-soft dark:text-gray-400 mt-0.5">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-ink-soft dark:text-gray-500 mt-1">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      disabled={markingId === notification.id}
                      className="
                        text-xs
                        text-blue-600
                        dark:text-blue-400
                        hover:underline
                        disabled:opacity-50
                        px-2
                        py-1
                      "
                    >
                      Đọc
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="
                      text-xs
                      text-red-500
                      hover:underline
                      px-2
                      py-1
                    "
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
