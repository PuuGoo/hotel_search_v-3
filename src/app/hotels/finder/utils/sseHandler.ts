"use client";

import { toast } from "react-hot-toast";

import type { FinderRow, AutoSaveSettings } from "../hooks/useFinderSession";
import { mergeFinderRow } from "./rowMerge";

export interface SSEHandlerDeps {
  // State setters
  setRows: React.Dispatch<React.SetStateAction<FinderRow[]>>;
  setWorkerStatus: React.Dispatch<React.SetStateAction<Record<number, { worker_id: number; status: string; hotel_name?: string; no?: number }>>>;
  setTotal: (n: number) => void;
  setJobStatus: (s: string) => void;
  setShowSaveTemplatePrompt: (b: boolean) => void;
  setError: (s: string | null) => void;
  // Refs
  rowsRef: React.MutableRefObject<FinderRow[]>;
  lastAutoSaveRef: React.MutableRefObject<number>;
  isPausedRef?: React.MutableRefObject<boolean>;
  // Callbacks
  autoSaveToDrive: (rows: FinderRow[]) => void;
  clearSession: () => void;
  // Settings
  autoSaveSettings: AutoSaveSettings;
  // Name for run history entry
  runName: string;
}

/**
 * Factory that creates a pair of SSE message/error handlers.
 * Both handleUpload and handleResume use this to avoid duplicating ~70 lines.
 */
export function createSSEHandler(
  job_id: string,
  eventSourceRef: React.MutableRefObject<EventSource | null>,
  jobStatusRef: React.MutableRefObject<string>,
  deps: SSEHandlerDeps
) {
  const {
    setRows,
    setWorkerStatus,
    setTotal,
    setJobStatus,
    setShowSaveTemplatePrompt,
    setError,
    rowsRef,
    lastAutoSaveRef,
    isPausedRef,
    autoSaveToDrive,
    clearSession,
    autoSaveSettings,
    runName,
  } = deps;

  let retryCount = 0;
  const maxRetries = 3;

  const onMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "row") {
        setRows((prev) => {
          const updated = mergeFinderRow(prev, data.data as FinderRow);

          if (
            autoSaveSettings.enabled &&
            updated.length - lastAutoSaveRef.current >= autoSaveSettings.lineThreshold
          ) {
            const newRows = updated.slice(lastAutoSaveRef.current);
            lastAutoSaveRef.current = updated.length;
            autoSaveToDrive(newRows);
          }

          return updated;
        });
      } else if (data.type === "worker_status") {
        setWorkerStatus((prev) => ({
          ...prev,
          [data.data.worker_id]: data.data,
        }));
      } else if (data.type === "status") {
        setTotal(data.total);
        setJobStatus(data.jobStatus);
      } else if (data.type === "complete") {
        setJobStatus("done");
        setTotal(data.total);
        setShowSaveTemplatePrompt(true);

        const finalRows = rowsRef.current;
        const matchedCount = finalRows.filter((r) => r.status === "matched").length;
        const errorCount = finalRows.filter((r) => r.status === "error").length;
        const runEntry = {
          id: `run-${Date.now()}`,
          name: runName,
          date: new Date().toISOString(),
          rows: finalRows,
          stats: { matched: matchedCount, errors: errorCount, total: finalRows.length },
        };
        const STORAGE_KEY = "finder-run-history";
        let existing: unknown[] = [];
        try {
          existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch {
          existing = [];
        }
        existing.unshift(runEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));

        if (autoSaveSettings.enabled) {
          setRows((prev) => {
            if (prev.length > lastAutoSaveRef.current) {
              const remaining = prev.slice(lastAutoSaveRef.current);
              autoSaveToDrive(remaining);
            }
            return prev;
          });
        }

        toast.success(`Hoàn thành! ${data.processed}/${data.total} hotels`);
        eventSourceRef.current?.close();
        clearSession();
      } else if (data.type === "error") {
        setError(data.error);
        setJobStatus("error");
        toast.error(`Lỗi: ${data.error}`);
        eventSourceRef.current?.close();
      } else if (data.type === "cancelled") {
        setJobStatus("cancelled");
        toast("Đã hủy", { icon: "⏹" });
        eventSourceRef.current?.close();
        clearSession();
      }
    } catch (err) {
      console.warn("[FinderSSE] Failed to parse message:", err, event.data);
    }
  };

  const onError = () => {
    eventSourceRef.current?.close();
    const paused = isPausedRef?.current ?? false;
    if (retryCount < maxRetries && jobStatusRef.current === "running" && !paused) {
      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
      setTimeout(() => {
        if (jobStatusRef.current === "running" && !(isPausedRef?.current ?? false)) {
          const newEs = new EventSource(`/api/hotel-finder/progress?jobId=${encodeURIComponent(job_id)}`);
          eventSourceRef.current = newEs;
          newEs.onmessage = onMessage;
          newEs.onerror = onError;
        }
      }, delay);
    } else {
      setError("Mất kết nối SSE");
      setJobStatus("error");
    }
  };

  return { onMessage, onError };
}
