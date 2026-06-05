"use client";

import { useCallback, useEffect, useRef } from "react";

export interface FinderRow {
  no: number;
  row: number;
  hotel_name: string;
  hotel_address: string;
  status: "matched" | "no-valid-result" | "error";
  url?: string;
  score?: number;
  img_count?: number;
  explanation?: string;
}

export interface AutoSaveSettings {
  enabled: boolean;
  lineThreshold: number;
  folder: string;
}

export interface FinderSession {
  rows: FinderRow[];
  workers: number;
  template: string;
  autoSaveSettings: AutoSaveSettings;
  jobId: string | null;
  total: number;
  jobStatus: string;
  fileName: string;
  savedAt: number;
}

const FINDER_SESSION_KEY = "finder-session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

interface UseFinderSessionOptions {
  rows: FinderRow[];
  workers: number;
  template: string;
  autoSaveSettings: AutoSaveSettings;
  jobId: string | null;
  total: number;
  jobStatus: string;
  originalFileName: string;
  // Setters for restore
  setRows: (rows: FinderRow[]) => void;
  setWorkers: (n: number) => void;
  setTemplate: (t: string) => void;
  setAutoSaveSettings: (s: AutoSaveSettings) => void;
  setJobId: (id: string | null) => void;
  setTotal: (n: number) => void;
  setJobStatus: (s: string) => void;
  setIsPaused: (b: boolean) => void;
  setRestoredSession: (b: boolean) => void;
  setOriginalFileName: (s: string) => void;
  // Refs
  rowsRef: React.MutableRefObject<FinderRow[]>;
  isPausedRef: React.MutableRefObject<boolean>;
  lastAutoSaveRef: React.MutableRefObject<number>;
}

export function useFinderSession(opts: UseFinderSessionOptions) {
  const {
    rows,
    workers,
    template,
    autoSaveSettings,
    jobId,
    total,
    jobStatus,
    originalFileName,
    setRows,
    setWorkers,
    setTemplate,
    setAutoSaveSettings,
    setJobId,
    setTotal,
    setJobStatus,
    setIsPaused,
    setRestoredSession,
    setOriginalFileName,
    rowsRef,
    isPausedRef,
    lastAutoSaveRef,
  } = opts;

  const saveSession = useCallback(
    (overrides?: Partial<FinderSession>) => {
      try {
        const data: FinderSession = {
          rows: overrides?.rows ?? rowsRef.current,
          workers,
          template,
          autoSaveSettings,
          jobId,
          total,
          jobStatus,
          fileName: originalFileName,
          savedAt: Date.now(),
        };
        localStorage.setItem(FINDER_SESSION_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('[FinderSession] Failed to save session:', err);
      }
    },
    [workers, template, autoSaveSettings, jobId, total, jobStatus, originalFileName, rowsRef]
  );

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(FINDER_SESSION_KEY);
    } catch (err) {
      console.warn('[FinderSession] Failed to clear session:', err);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FINDER_SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as FinderSession;
      if (!session.rows || session.rows.length === 0) return;
      if (Date.now() - session.savedAt > SESSION_MAX_AGE) {
        clearSession();
        return;
      }
      setRows(session.rows);
      rowsRef.current = session.rows;
      setWorkers(session.workers || 3);
      setTemplate(session.template || "full");
      if (session.autoSaveSettings) setAutoSaveSettings(session.autoSaveSettings);
      setJobId(session.jobId);
      setTotal(session.total || 0);
      setOriginalFileName(session.fileName || "");
      lastAutoSaveRef.current = session.rows.length;

      if (session.jobStatus === "running" || session.jobStatus === "queued") {
        setJobStatus("running");
        setIsPaused(true);
        isPausedRef.current = true;
        setRestoredSession(true);
      } else {
        setJobStatus(session.jobStatus || "idle");
        setRestoredSession(true);
      }
    } catch (err) {
      console.warn('[FinderSession] Failed to restore session:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save session when rows change (debounced)
  useEffect(() => {
    if (rows.length === 0 || jobStatus === "idle") return;
    const timer = setTimeout(() => {
      saveSession();
    }, 2000);
    return () => clearTimeout(timer);
  }, [rows, jobStatus, saveSession]);

  return { saveSession, clearSession };
}
