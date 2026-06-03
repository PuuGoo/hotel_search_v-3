"use client";

import { useMemo, useState } from "react";
import { FiX, FiDownload, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

export interface FinderRun {
  id: string;
  name: string;
  date: string;
  rows: FinderRow[];
  stats: { matched: number; errors: number; total: number };
}

interface FinderRow {
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

interface ResultComparisonProps {
  runs: FinderRun[];
  isOpen: boolean;
  onClose: () => void;
}

type DiffType = "new" | "removed" | "changed" | "same";

interface DiffRow {
  hotel_name: string;
  hotel_address: string;
  type: DiffType;
  runA?: FinderRow;
  runB?: FinderRow;
}

function getRowKey(r: { hotel_name: string; hotel_address: string }) {
  return `${r.hotel_name}||${r.hotel_address}`;
}

function computeDiff(a: FinderRow[], b: FinderRow[]): DiffRow[] {
  const mapA = new Map<string, FinderRow>();
  for (const row of a) {
    mapA.set(getRowKey(row), row);
  }

  const mapB = new Map<string, FinderRow>();
  for (const row of b) {
    mapB.set(getRowKey(row), row);
  }

  const result: DiffRow[] = [];
  const seen = new Set<string>();

  for (const [key, rowB] of mapB) {
    seen.add(key);
    const rowA = mapA.get(key);
    if (!rowA) {
      result.push({ hotel_name: rowB.hotel_name, hotel_address: rowB.hotel_address, type: "new", runB: rowB });
    } else if (rowA.url !== rowB.url) {
      result.push({ hotel_name: rowB.hotel_name, hotel_address: rowB.hotel_address, type: "changed", runA: rowA, runB: rowB });
    } else {
      result.push({ hotel_name: rowB.hotel_name, hotel_address: rowB.hotel_address, type: "same", runA: rowA, runB: rowB });
    }
  }

  for (const [key, rowA] of mapA) {
    if (!seen.has(key)) {
      result.push({ hotel_name: rowA.hotel_name, hotel_address: rowA.hotel_address, type: "removed", runA: rowA });
    }
  }

  result.sort((a, b) => {
    const order: Record<DiffType, number> = { new: 0, removed: 1, changed: 2, same: 3 };
    return order[a.type] - order[b.type];
  });

  return result;
}

export default function ResultComparison({ runs, isOpen, onClose }: ResultComparisonProps) {
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const [showType, setShowType] = useState<DiffType | "all">("all");

  const runA = runs.find((r) => r.id === selectedA);
  const runB = runs.find((r) => r.id === selectedB);

  const diffs = useMemo(() => {
    if (!runA || !runB) return [];
    return computeDiff(runA.rows, runB.rows);
  }, [runA, runB]);

  const stats = useMemo(() => {
    const added = diffs.filter((d) => d.type === "new").length;
    const removed = diffs.filter((d) => d.type === "removed").length;
    const changed = diffs.filter((d) => d.type === "changed").length;
    const same = diffs.filter((d) => d.type === "same").length;
    return { added, removed, changed, same };
  }, [diffs]);

  const filteredDiffs = useMemo(() => {
    if (showType === "all") return diffs;
    return diffs.filter((d) => d.type === showType);
  }, [diffs, showType]);

  const handleExport = () => {
    const data = {
      comparison: {
        runA: runA?.name,
        runB: runB?.name,
        dateA: runA?.date,
        dateB: runB?.date,
      },
      summary: stats,
      diffs: diffs.map((d) => ({
        hotel_name: d.hotel_name,
        hotel_address: d.hotel_address,
        type: d.type,
        urlA: d.runA?.url || null,
        urlB: d.runB?.url || null,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison-${runA?.name}-${runB?.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl w-full max-w-6xl mx-4 shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">So sánh kết quả</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Chạy A (gốc)</label>
              <select
                value={selectedA}
                onChange={(e) => setSelectedA(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="">-- Chọn kết quả A --</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === selectedB}>
                    {r.name} ({r.stats.total} hotels)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Chạy B (so sánh)</label>
              <select
                value={selectedB}
                onChange={(e) => setSelectedB(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="">-- Chọn kết quả B --</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === selectedA}>
                    {r.name} ({r.stats.total} hotels)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {runA && runB && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-300">{stats.added} thêm</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-300">{stats.removed} xóa</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-300">{stats.changed} thay đổi</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-gray-300">{stats.same} giống</span>
              </div>
              <button
                onClick={handleExport}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <FiDownload size={12} />
                Xuất JSON
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!runA || !runB ? (
            <p className="text-gray-500 text-center py-12">Chọn 2 kết quả để so sánh</p>
          ) : filteredDiffs.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Không có khác biệt</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 mb-3">
                {(["all", "new", "removed", "changed", "same"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setShowType(t)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      showType === t
                        ? t === "new"
                          ? "bg-green-600 text-white"
                          : t === "removed"
                          ? "bg-red-600 text-white"
                          : t === "changed"
                          ? "bg-yellow-600 text-white"
                          : t === "same"
                          ? "bg-gray-600 text-white"
                          : "bg-sky-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {t === "all" ? "Tất cả" : t === "new" ? "Thêm" : t === "removed" ? "Xóa" : t === "changed" ? "Thay đổi" : "Giống"}
                  </button>
                ))}
              </div>

              {filteredDiffs.map((d, i) => (
                <div
                  key={`${d.hotel_name}-${d.hotel_address}-${i}`}
                  className={`rounded-lg p-3 border ${
                    d.type === "new"
                      ? "bg-green-900/20 border-green-700/50"
                      : d.type === "removed"
                      ? "bg-red-900/20 border-red-700/50"
                      : d.type === "changed"
                      ? "bg-yellow-900/20 border-yellow-700/50"
                      : "bg-gray-700/30 border-gray-600/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {d.type === "new" && <FiCheckCircle className="text-green-400 shrink-0" size={14} />}
                        {d.type === "removed" && <FiXCircle className="text-red-400 shrink-0" size={14} />}
                        {d.type === "changed" && <FiClock className="text-yellow-400 shrink-0" size={14} />}
                        <span className="text-white font-medium text-sm truncate">{d.hotel_name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            d.type === "new"
                              ? "bg-green-600 text-white"
                              : d.type === "removed"
                              ? "bg-red-600 text-white"
                              : d.type === "changed"
                              ? "bg-yellow-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {d.type === "new" ? "Mới" : d.type === "removed" ? "Đã xóa" : d.type === "changed" ? "Thay đổi" : "Giống"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{d.hotel_address}</p>
                      {d.type === "changed" && (
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="text-xs">
                            <span className="text-gray-500">A: </span>
                            <a
                              href={d.runA?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400 hover:underline"
                            >
                              {d.runA?.url?.replace(/^https?:\/\//, "").slice(0, 50)}
                            </a>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">B: </span>
                            <a
                              href={d.runB?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:underline"
                            >
                              {d.runB?.url?.replace(/^https?:\/\//, "").slice(0, 50)}
                            </a>
                          </div>
                        </div>
                      )}
                      {d.type !== "changed" && (
                        <div className="mt-1 text-xs">
                          <a
                            href={d.runA?.url || d.runB?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            {(d.runA?.url || d.runB?.url)?.replace(/^https?:\/\//, "").slice(0, 50)}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
