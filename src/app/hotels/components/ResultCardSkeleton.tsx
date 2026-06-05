"use client";

import Skeleton from "../../components/Skeleton";

export default function ResultCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton height="h-6" width="w-3/5" />
          {/* URL line */}
          <Skeleton height="h-4" width="w-2/5" className="!bg-green-900/20" />
          {/* Snippet line 1 */}
          <Skeleton height="h-4" width="w-full" />
          {/* Snippet line 2 (shorter) */}
          <Skeleton height="h-4" width="w-4/5" />
        </div>
        {/* Action buttons area */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Skeleton width="w-8" height="h-8" rounded />
          <Skeleton width="w-8" height="h-8" rounded />
          <Skeleton width="w-8" height="h-8" rounded />
        </div>
      </div>
      {/* Score line */}
      <div className="mt-3 flex items-center gap-2">
        <Skeleton width="w-4" height="h-4" fullRadius />
        <Skeleton width="w-24" height="h-4" />
      </div>
    </div>
  );
}
