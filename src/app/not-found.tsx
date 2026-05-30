import Link from "next/link";

// Root not-found UI for the App Router. Shown for unmatched routes and any
// notFound() call, instead of Next.js's bare default 404.
export default function NotFound() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4 text-center">
      <h2 className="text-2xl font-bold text-white">404</h2>
      <p className="max-w-md text-sm text-gray-400">
        Không tìm thấy trang bạn yêu cầu.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
