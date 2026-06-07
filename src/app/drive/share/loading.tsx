import Skeleton from "../../components/Skeleton";

export default function DriveShareLoading() {
  return (
    <div className="h-full bg-canvas flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-panel rounded-lg p-8 space-y-6">
        {/* Share icon skeleton */}
        <div className="flex justify-center">
          <Skeleton width="w-16" height="h-16" fullRadius />
        </div>

        {/* Title skeleton */}
        <div className="text-center space-y-2">
          <Skeleton width="w-48" height="h-6" className="mx-auto" />
          <Skeleton width="w-64" height="h-4" className="mx-auto" />
        </div>

        {/* File info skeleton */}
        <div className="bg-fill/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton width="w-10" height="h-10" rounded />
            <div className="flex-1 space-y-2">
              <Skeleton width="w-40" height="h-4" />
              <Skeleton width="w-24" height="h-3" />
            </div>
          </div>
        </div>

        {/* Download button skeleton */}
        <Skeleton width="w-full" height="h-12" rounded />
      </div>
    </div>
  );
}
