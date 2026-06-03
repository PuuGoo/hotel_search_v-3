"use client";

import { useCallback, useEffect, useState } from "react";
import { FiClock, FiTrash2, FiRepeat } from "react-icons/fi";
import type { FinderRun } from "./ResultComparison";
import ResultComparison from "./ResultComparison";

const STORAGE_KEY = "finder-run-history";

function loadRuns(): FinderRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRuns(runs: FinderRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export default function RunHistory() {
  const [runs, setRuns] = useState<FinderRun[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    setRuns(loadRuns());
  }, []);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < 2) {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = runs.filter((r) => r.id !== id);
      setRuns(next);
      saveRuns(next);
      setSelected((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    },
    [runs]
  );

  const handleCompare = useCallback(() => {
    if (selected.size === 2) {
      setCompareOpen(true);
    }
  }, [selected]);

  const selectedRuns = runs.filter((r) => selected.has(r.id));

  if (runs.length === 0) return null;

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiClock className="text-sky-400" />
            Lịch sử chạy
          </h2>
          {selected.size === 2 && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <FiRepeat size={14} />
              So sánh
            </button>
          )}
        </div>

        {selected.size < 2 && (
          <p className="text-gray-500 text-sm mb-3">Chọn 2 kết quả để so sánh</p>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {runs.map((run) => (
            <div
              key={run.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selected.has(run.id)
                  ? "bg-sky-900/30 border-sky-700/50"
                  : "bg-gray-700/50 border-transparent hover:border-gray-600"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(run.id)}
                onChange={() => toggleSelect(run.id)}
                className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-sky-500 focus:ring-sky-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{run.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(run.date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-600 text-gray-300">
                    {run.stats.total} tổng
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
                    {run.stats.matched} khớp
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
                    {run.stats.errors} lỗi
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(run.id)}
                className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-600 transition-colors shrink-0"
                title="Xóa"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ResultComparison
        runs={selectedRuns}
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </>
  );
}
