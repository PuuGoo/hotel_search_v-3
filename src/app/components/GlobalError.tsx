"use client";

import { useEffect, useState } from "react";
import { trackError } from "../libs/errorTracker";

interface ToastError {
  id: number;
  message: string;
  level: string;
}

let toastId = 0;

export default function GlobalError() {
  const [toasts, setToasts] = useState<ToastError[]>([]);

  useEffect(() => {
    function removeToast(id: number) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }

    function handleError(event: ErrorEvent) {
      event.preventDefault();
      const message = event.message || "Lỗi không xác định";
      trackError("error", message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, level: "error" }]);
      setTimeout(() => removeToast(id), 5000);
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      event.preventDefault();
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : reason?.message || "Promise rejection không xác định";
      trackError("error", message, { type: "unhandledrejection" });

      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, level: "error" }]);
      setTimeout(() => removeToast(id), 5000);
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-lg border border-red-800 bg-canvas p-4 shadow-xl max-w-sm animate-in slide-in-from-right"
        >
          <span className="mt-0.5 text-red-400">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Lỗi hệ thống</p>
            <p className="mt-1 text-xs text-ink-soft line-clamp-2">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            className="text-ink-soft hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
