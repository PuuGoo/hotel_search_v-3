"use client";

import axios from "axios";
import { useEffect, useState } from "react";

interface QuotaData {
  used: number;
  limit: number;
  percentage: number;
  fileCount: number;
}

interface StorageQuotaBarProps {
  refreshTrigger?: number;
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function StorageQuotaBar({ refreshTrigger }: StorageQuotaBarProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/drive/quota")
      .then((res) => setQuota(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading && !quota) {
    return (
      <div className="mb-4 rounded-lg bg-panel p-3">
        <div className="h-2 w-full animate-pulse rounded bg-fill" />
      </div>
    );
  }

  if (!quota) return null;

  const barColor =
    quota.percentage > 85
      ? "bg-rose-500"
      : quota.percentage > 60
        ? "bg-yellow-500"
        : "bg-emerald-500";

  return (
    <div className="mb-4 rounded-lg bg-panel p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
        <span>
          Đã dùng {formatMB(quota.used)} MB / {formatMB(quota.limit)} MB ({quota.percentage}%)
        </span>
        <span>{quota.fileCount} file</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-fill">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(quota.percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
