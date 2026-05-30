import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import { computeEta } from "../utils/etaUtils";
import { ExcelRow } from "../utils/excelParser";
import { MatchResult, matchHotelResults } from "../utils/resultMatcher";
import {
  SearchOutcome,
  classifyResponseStatus,
  classifyThrownError,
} from "../utils/searchOutcome";
import { useSessionStorage } from "./useSessionStorage";

interface BulkSearchState {
  isRunning: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalRows: number;
  results: MatchResult[];
  startTime: number;
  error: string | null;
}

export function useBulkSearch() {
  const { session, saveSession, clearSession, hasSession } = useSessionStorage();
  const [state, setState] = useState<BulkSearchState>({
    isRunning: false,
    isPaused: false,
    currentIndex: 0,
    totalRows: 0,
    results: [],
    startTime: 0,
    error: null,
  });

  const shouldStopRef = useRef(false);
  const isPausedRef = useRef(false);
  const allRowsRef = useRef<ExcelRow[]>([]);
  // Absolute row index the current run started at. ETA must measure throughput
  // relative to this (not 0), otherwise a resumed run divides fresh elapsed time
  // by the full accumulated index and reports a wildly low estimate.
  const runStartIndexRef = useRef(0);
  // Warn at most once per run if session persistence fails (e.g. localStorage
  // quota exceeded on a large dataset) so the user knows resume-after-reload
  // won't be available, instead of failing silently.
  const persistWarnedRef = useRef(false);

  // Auto-restore session on mount
  useEffect(() => {
    if (session && session.results.length > 0) {
      setState((prev) => ({
        ...prev,
        results: session.results,
        currentIndex: session.nextIndex,
        totalRows: session.totalRows,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop the processing loop if the component unmounts mid-run (e.g. the user
  // navigates away). processRows() is driven entirely by refs and otherwise
  // keeps issuing /api/search calls (burning rate-limit quota) and calling
  // setState on an unmounted component. Flipping shouldStopRef breaks the loop
  // at its next iteration / interruptible-sleep check.
  useEffect(() => {
    return () => {
      shouldStopRef.current = true;
      isPausedRef.current = false;
    };
  }, []);

  // Returns a discriminated outcome instead of throwing sentinel strings, so a
  // transient network failure (fetch rejection) is classified as a retryable
  // network_error rather than silently collapsing into a "no result" row.
  const searchTavily = useCallback(
    async (query: string): Promise<{ ok: true; results: any[] } | { ok: false; outcome: SearchOutcome }> => {
      let res: Response;
      try {
        res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, engine: "tavily" }),
        });
      } catch (err) {
        // fetch() rejects only on network-level failures (offline, DNS, aborted
        // connection) — never on HTTP error statuses. Always retryable.
        return { ok: false, outcome: classifyThrownError(err) };
      }

      if (!res.ok) {
        return { ok: false, outcome: classifyResponseStatus(res.status) };
      }

      const data = await res.json().catch(() => ({}));
      return { ok: true, results: data.results || [] };
    },
    []
  );

  const processRows = useCallback(
    async (rows: ExcelRow[], startIndex = 0, existingResults: MatchResult[] = []) => {
      shouldStopRef.current = false;
      isPausedRef.current = false;
      allRowsRef.current = rows;
      runStartIndexRef.current = startIndex;
      persistWarnedRef.current = false;

      const results: MatchResult[] = [...existingResults];

      // Per-row rate-limit retry budget. Without a cap, a persistently
      // rate-limited (or stuck) server traps the loop forever, re-waiting 60s
      // and decrementing i with no escape. After the budget is exhausted we
      // record the row as no_match and move on.
      const MAX_RATE_LIMIT_RETRIES = 5;
      let rateLimitRetries = 0;
      // Per-row transient-network retry budget. A network blip (offline, DNS,
      // dropped connection) must NOT be recorded as a missing hotel. We retry a
      // few times with a short backoff; if it keeps failing the upstream is
      // likely down, so we pause and save a resumable session instead of
      // corrupting the row.
      const MAX_NETWORK_RETRIES = 3;
      let networkRetries = 0;
      // Interruptible sleep: wakes early if the user stops, so a 60s rate-limit
      // wait doesn't ignore the Stop button.
      const interruptibleSleep = async (ms: number) => {
        const step = 500;
        let waited = 0;
        while (waited < ms) {
          if (shouldStopRef.current) return;
          await new Promise((r) => setTimeout(r, Math.min(step, ms - waited)));
          waited += step;
        }
      };

      const pushNoMatch = (row: ExcelRow) => {
        results.push({
          hotelName: row.hotelName,
          address: row.address,
          no: row.no,
          matchedLinks: [],
          bestPercentage: 0,
          status: "no_match",
        });
      };

      setState({
        isRunning: true,
        isPaused: false,
        currentIndex: startIndex,
        totalRows: rows.length,
        results: [...results],
        startTime: Date.now(),
        error: null,
      });

      for (let i = startIndex; i < rows.length; i++) {
        while (isPausedRef.current) {
          await new Promise((r) => setTimeout(r, 200));
          if (shouldStopRef.current) break;
        }
        if (shouldStopRef.current) break;

        const row = rows[i];
        // Use the original name (trimmed). Do NOT strip non-ASCII: this is a
        // Vietnamese dataset, and stripping diacritics ("Mường" -> "Mng")
        // mangles the query. The address below is already sent with non-ASCII
        // intact, so the API handles it fine.
        const hotelName = row.hotelName.trim();

        if (!hotelName) {
          pushNoMatch(row);
          setState((prev) => ({ ...prev, currentIndex: i + 1, results: [...results] }));
          continue;
        }

        const query =
          row.urlType === "CTrip SuperAgg"
            ? `${hotelName} ${row.address} trip`
            : `${hotelName} ${row.address}`;

        if (i > startIndex) await new Promise((r) => setTimeout(r, 1000));

        const outcome = await searchTavily(query);

        if (outcome.ok) {
          const matchResult = matchHotelResults(row.hotelName, row.address, outcome.results);
          matchResult.no = row.no;
          results.push(matchResult);
          rateLimitRetries = 0;
          networkRetries = 0;
        } else if (outcome.outcome.kind === "rate_limit") {
          if (rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
            rateLimitRetries++;
            await interruptibleSleep(60000);
            if (shouldStopRef.current) break;
            i--;
            continue;
          }
          // Retry budget exhausted: give up on this row and continue so the
          // run can finish instead of looping indefinitely.
          rateLimitRetries = 0;
          pushNoMatch(row);
        } else if (outcome.outcome.kind === "network_error") {
          // Transient network/server failure. Retry within budget before giving
          // up; never silently record it as a "no result".
          if (networkRetries < MAX_NETWORK_RETRIES) {
            networkRetries++;
            await interruptibleSleep(5000);
            if (shouldStopRef.current) break;
            i--;
            continue;
          }
          // Still failing after the budget: treat as an outage. Pause and save a
          // resumable session rather than corrupting this and subsequent rows.
          networkRetries = 0;
          setState((prev) => ({
            ...prev,
            error: "Mất kết nối tới máy chủ. Đã lưu phiên, nhấn Tiếp tục để thử lại.",
            isRunning: false,
          }));
          saveSession({ results, nextIndex: i, allRows: rows, totalRows: rows.length });
          return;
        } else if (outcome.outcome.kind === "service_unavailable") {
          setState((prev) => ({
            ...prev,
            error: "Dịch vụ tạm thời không khả dụng. Thử lại sau.",
            isRunning: false,
          }));
          saveSession({ results, nextIndex: i, allRows: rows, totalRows: rows.length });
          return;
        } else {
          // Non-retryable failure (e.g. 4xx): the request itself won't succeed
          // on retry, so record no_match and move on.
          pushNoMatch(row);
        }

        const saved = saveSession({ results, nextIndex: i + 1, allRows: rows, totalRows: rows.length });
        if (!saved && !persistWarnedRef.current) {
          persistWarnedRef.current = true;
          toast.error(
            "Không thể lưu phiên (dữ liệu quá lớn). Kết quả vẫn hiển thị nhưng sẽ mất nếu tải lại trang."
          );
        }
        setState((prev) => ({ ...prev, currentIndex: i + 1, results: [...results] }));
      }

      setState((prev) => ({ ...prev, isRunning: false, isPaused: false }));
    },
    [searchTavily, saveSession]
  );

  const startSearch = useCallback(
    (rows: ExcelRow[], fileName?: string) => {
      clearSession();
      setState({
        isRunning: true,
        isPaused: false,
        currentIndex: 0,
        totalRows: rows.length,
        results: [],
        startTime: Date.now(),
        error: null,
      });
      saveSession({ results: [], nextIndex: 0, allRows: rows, totalRows: rows.length, fileName: fileName || "" });
      processRows(rows, 0);
    },
    [clearSession, processRows, saveSession]
  );

  const resumeSearch = useCallback(() => {
    if (!session) return;
    processRows(session.allRows, session.nextIndex, session.results);
  }, [session, processRows]);

  const pauseSearch = useCallback(() => {
    isPausedRef.current = true;
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const unpauseSearch = useCallback(() => {
    isPausedRef.current = false;
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const stopSearch = useCallback(() => {
    shouldStopRef.current = true;
    isPausedRef.current = false;
    setState((prev) => ({ ...prev, isRunning: false, isPaused: false }));
  }, []);

  const clearResults = useCallback(() => {
    clearSession();
    setState({
      isRunning: false,
      isPaused: false,
      currentIndex: 0,
      totalRows: 0,
      results: [],
      startTime: 0,
      error: null,
    });
  }, [clearSession]);

  const eta = computeEta({
    isRunning: state.isRunning,
    currentIndex: state.currentIndex,
    totalRows: state.totalRows,
    startTime: state.startTime,
    runStartIndex: runStartIndexRef.current,
    now: Date.now(),
  });

  const progress =
    state.totalRows > 0 ? Math.round((state.currentIndex / state.totalRows) * 100) : 0;

  const isResumable =
    hasSession && !state.isRunning && session && session.nextIndex < session.totalRows;

  return {
    state,
    startSearch,
    resumeSearch,
    pauseSearch,
    unpauseSearch,
    stopSearch,
    clearResults,
    hasSession,
    isResumable,
    session,
    eta,
    progress,
  };
}
