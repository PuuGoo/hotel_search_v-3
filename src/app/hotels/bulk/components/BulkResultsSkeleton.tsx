"use client";

import Skeleton from "../../../components/Skeleton";

const SKELETON_COLS = [
  { width: "w-8" },   // #
  { width: "w-12" },  // No
  { width: "w-12" },  // %
  { width: "w-16" },  // Status
  { width: "w-40" },  // Hotel Name
  { width: "w-32" },  // Address
  { width: "w-12" },  // Links
  { width: "w-24" },  // Matched Links
];

export default function BulkResultsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton width="w-20" height="h-4" />
        <Skeleton width="w-16" height="h-4" />
        <Skeleton width="w-24" height="h-4" />
        <Skeleton width="w-16" height="h-4" />
      </div>

      {/* Filter + Page size */}
      <div className="flex flex-wrap gap-3">
        <Skeleton height="h-10" className="flex-1 min-w-[200px]" />
        <Skeleton width="w-28" height="h-10" />
      </div>

      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {SKELETON_COLS.map((col, i) => (
                <th key={i} className="px-3 py-2 text-left">
                  <Skeleton width={col.width} height="h-4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-hairline"
              >
                {SKELETON_COLS.map((col, colIdx) => (
                  <td key={colIdx} className="px-3 py-2">
                    <Skeleton
                      width={colIdx === 3 ? "w-16" : col.width}
                      height="h-4"
                      rounded={colIdx === 3}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
