import { useCallback, useEffect, useState } from "react";

import { MatchResult } from "../utils/resultMatcher";
import { ExcelRow } from "../utils/excelParser";

const SESSION_KEY = "bulk_search_session";
// Saved sessions older than this are treated as stale and discarded on load so
// a long-abandoned half-finished job doesn't silently auto-restore.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BulkSession {
  results: MatchResult[];
  nextIndex: number;
  allRows: ExcelRow[];
  totalRows: number;
  fileName: string;
  timestamp: number;
}

export function useSessionStorage() {
  const [session, setSession] = useState<BulkSession | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BulkSession;
        // Discard stale sessions instead of auto-restoring them.
        if (parsed.timestamp && Date.now() - parsed.timestamp > SESSION_TTL_MS) {
          localStorage.removeItem(SESSION_KEY);
        } else {
          setSession(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const saveSession = useCallback((data: Partial<BulkSession>): boolean => {
    let persisted = true;
    setSession((prev) => {
      const updated = { ...prev, ...data, timestamp: Date.now() } as BulkSession;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      } catch {
        // localStorage quota exceeded (large datasets) or unavailable. The
        // in-memory session still works for same-tab pause/resume; only
        // resume-after-reload is lost. Signal failure so callers can warn.
        persisted = false;
      }
      return updated;
    });
    return persisted;
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const hasSession = session !== null && session.results.length > 0;

  return { session, saveSession, clearSession, hasSession };
}
