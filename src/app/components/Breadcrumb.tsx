'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { FiChevronRight, FiHome } from 'react-icons/fi';

/**
 * Route label map – Vietnamese labels for known segments.
 * Keys are *individual path segments* (not full paths).
 */
const SEGMENT_LABELS: Record<string, string> = {
  hotels: 'Tìm kiếm',
  bulk: 'Tìm kiếm hàng loạt',
  finder: 'Hotel URL Finder',
  compare: 'So sánh',
  bookmarks: 'Bookmarks',
  dashboard: 'Dashboard',
  settings: 'Cài đặt',
  appearance: 'Giao diện',
  'api-keys': 'API Keys',
  users: 'Người dùng',
  reports: 'Báo cáo',
  'price-alerts': 'Cảnh báo giá',
  notifications: 'Thông báo',
  conversations: 'Hội thoại',
  admin: 'Quản trị',
  drive: 'Drive',
};

function getLabel(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
  );
}

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

export default function Breadcrumb() {
  const pathname = usePathname();

  const items = useMemo<BreadcrumbItem[]>(() => {
    if (!pathname) return [];
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      return {
        label: getLabel(segment),
        href,
        isCurrent: index === segments.length - 1,
      };
    });
  }, [pathname]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap
                 px-4 pt-4 lg:px-8
                 text-sm text-neutral-500 dark:text-neutral-400
                 scrollbar-none"
    >
      {/* Home link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 rounded px-1 py-0.5
                   transition-colors hover:bg-neutral-100 hover:text-neutral-800
                   dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <FiHome className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Trang chủ</span>
      </Link>

      {items.map((item) => (
        <span key={item.href} className="inline-flex items-center gap-1.5">
          <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300 dark:text-neutral-600" />

          {item.isCurrent ? (
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="rounded px-1 py-0.5 transition-colors
                         hover:bg-neutral-100 hover:text-neutral-800
                         dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
