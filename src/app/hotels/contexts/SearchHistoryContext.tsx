"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import axios from "axios";
import toast from "react-hot-toast";

export interface SearchHistoryEntry {
  id: string;
  query: string;
  engine?: string | null;
  resultCount?: number | null;
  createdAt: string;
}

interface SearchHistoryContextType {
  history: SearchHistoryEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const SearchHistoryContext = createContext<SearchHistoryContextType | null>(
  null
);

export function SearchHistoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchedRef = useRef<number>(0);
  const STALE_MS = 30_000; // 30 seconds

  const refresh = useCallback(async (force = false) => {
    // Skip refresh if data is fresh (< 30s ago) unless forced
    if (!force && Date.now() - lastFetchedRef.current < STALE_MS) return;

    setLoading(true);
    try {
      const res = await axios.get("/api/search/history");
      setHistory(res.data.history || []);
      lastFetchedRef.current = Date.now();
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeEntry = useCallback(async (id: string) => {
    try {
      await axios.delete("/api/search/history", { data: { id } });
      // Optimistic update — no need to re-fetch since the server confirmed deletion
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
    } catch {
      toast.error("Không thể xóa mục lịch sử");
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await axios.delete("/api/search/history");
      // Optimistic update — server confirmed all entries deleted
      setHistory([]);
    } catch {
      toast.error("Không thể xóa lịch sử tìm kiếm");
    }
  }, []);

  return (
    <SearchHistoryContext.Provider
      value={{ history, loading, refresh, removeEntry, clearAll }}
    >
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  const ctx = useContext(SearchHistoryContext);
  if (!ctx) {
    throw new Error(
      "useSearchHistory must be used within a SearchHistoryProvider"
    );
  }
  return ctx;
}
