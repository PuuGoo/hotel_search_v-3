import Skeleton from "../../components/Skeleton";

export default function DriveDetailLoading() {
  return (
    <div className="h-full bg-canvas p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton width="w-16" height="h-4" />
          <span className="text-gray-600">/</span>
          <Skeleton width="w-32" height="h-4" />
        </div>

        {/* File header skeleton */}
        <div className="bg-panel rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Skeleton width="w-12" height="h-12" rounded />
            <div className="flex-1 space-y-3">
              <Skeleton width="w-64" height="h-6" />
              <Skeleton width="w-40" height="h-4" />
              <div className="flex gap-3">
                <Skeleton width="w-20" height="h-4" />
                <Skeleton width="w-24" height="h-4" />
                <Skeleton width="w-28" height="h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex gap-3">
          <Skeleton width="w-28" height="h-10" rounded />
          <Skeleton width="w-24" height="h-10" rounded />
          <Skeleton width="w-28" height="h-10" rounded />
        </div>

        {/* Preview area skeleton */}
        <div className="bg-panel rounded-lg p-6">
          <Skeleton width="w-full" height="h-64" rounded />
        </div>

        {/* Version history skeleton */}
        <div className="bg-panel rounded-lg p-6 space-y-4">
          <Skeleton width="w-36" height="h-5" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width="w-8" height="h-8" fullRadius />
              <div className="flex-1 space-y-2">
                <Skeleton width="w-48" height="h-4" />
                <Skeleton width="w-32" height="h-3" />
              </div>
              <Skeleton width="w-16" height="h-8" rounded />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
