"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { HiBell } from "react-icons/hi2";

import { useRouter } from "next/navigation";

import { pusherClient, userChannel } from "@/app/libs/pusherClient";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

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
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
      );
    case "alert":
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    pusherClient.subscribe(userChannel("notifications"));

    const handler = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    };

    pusherClient.bind("notification:new", handler);

    return () => {
      pusherClient.unsubscribe(userChannel("notifications"));
      pusherClient.unbind("notification:new", handler);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notification.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative lg:mb-4" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          relative
          p-2
          rounded-full
          hover:bg-gray-200
          dark:hover:bg-gray-700
          transition
          text-ink-soft
          dark:text-gray-400
        "
      >
        <HiBell size={20} />
        {unreadCount > 0 && (
          <span
            className="
              absolute
              -top-0.5
              -right-0.5
              flex
              items-center
              justify-center
              min-w-[18px]
              h-[18px]
              px-1
              text-xs
              font-medium
              text-white
              bg-red-500
              rounded-full
            "
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="
            absolute
            right-0
            mt-2
            w-80
            max-h-96
            overflow-y-auto
            rounded-lg
            shadow-lg
            bg-white
            dark:bg-gray-800
            border
            border-gray-200
            dark:border-gray-700
            z-50
          "
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Thông báo
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="
                  text-xs
                  text-blue-600
                  dark:text-blue-400
                  hover:underline
                  disabled:opacity-50
                "
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-soft dark:text-gray-400">
              Không có thông báo
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    w-full
                    text-left
                    px-4
                    py-3
                    hover:bg-gray-50
                    dark:hover:bg-gray-700
                    transition
                    flex
                    gap-3
                    items-start
                    ${!notification.isRead ? "bg-blue-50 dark:bg-gray-700/50" : ""}
                  `}
                >
                  {notificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                        text-sm
                        truncate
                        ${!notification.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}
                      `}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-ink-soft dark:text-gray-400 truncate mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-ink-soft dark:text-gray-500 mt-1">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                router.push("/notifications");
                setIsOpen(false);
              }}
              className="
                w-full
                px-4
                py-2.5
                text-sm
                text-center
                text-blue-600
                dark:text-blue-400
                hover:bg-gray-50
                dark:hover:bg-gray-700
                transition
              "
            >
              Xem tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
