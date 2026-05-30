"use client";

import { useEffect } from "react";

// Root error boundary for the App Router. Catches uncaught errors thrown while
// rendering server/client components in any route segment and shows a
// recoverable UI instead of Next.js's bare default error screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for server/client logs. Avoid rendering raw error
    // details to the user (they may contain internals).
    console.error("[APP_ERROR]", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4 text-center">
      <h2 className="text-xl font-semibold text-white">Đã xảy ra lỗi</h2>
      <p className="max-w-md text-sm text-gray-400">
        Có lỗi không mong muốn xảy ra. Vui lòng thử lại.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600"
      >
        Thử lại
      </button>
    </div>
  );
}
