"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
  eta: number | null;
  isRunning: boolean;
  isPaused: boolean;
}

function formatEta(ms: number): string {
  if (ms < 1000) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function ProgressBar({
  current,
  total,
  percentage,
  eta,
  isRunning,
  isPaused,
}: ProgressBarProps) {
  if (!isRunning && current === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">
          {isRunning ? (
            isPaused ? (
              <span className="text-yellow-400">Tạm dừng</span>
            ) : (
              <span className="text-sky-400">Đang tìm kiếm...</span>
            )
          ) : (
            <span className="text-green-400">Hoàn thành</span>
          )}
          {" "}{current}/{total}
        </span>
        <span className="text-ink-soft">
          {percentage}%
          {eta !== null && isRunning && !isPaused && (
            <span className="ml-2">ETA: {formatEta(eta)}</span>
          )}
        </span>
      </div>

      <div className="w-full bg-fill rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            isPaused ? "bg-yellow-500" : isRunning ? "bg-sky-500" : "bg-green-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
