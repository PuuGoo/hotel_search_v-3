"use client";

import { useMemo, useState, Fragment } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiCopy,
  FiCheck,
} from "react-icons/fi";

import { MatchResult } from "../utils/resultMatcher";

interface BulkResultsProps {
  results: MatchResult[];
}

type SortField = "order" | "no" | "percentage" | "status" | "name" | "links";
type SortDir = "asc" | "desc";

export default function BulkResults({ results }: BulkResultsProps) {
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Reference -> original index, computed once per results change. Avoids the
  // O(n) `results.indexOf` previously called per row and twice per sort
  // comparison (which made the "order" sort O(n^2 log n) for large pages).
  const indexOfResult = useMemo(() => {
    const m = new Map<MatchResult, number>();
    results.forEach((r, i) => m.set(r, i));
    return m;
  }, [results]);

  const filtered = useMemo(() => {
    if (!filter) return results;
    const f = filter.toLowerCase();
    return results.filter(
      (r) =>
        r.hotelName.toLowerCase().includes(f) ||
        r.address.toLowerCase().includes(f) ||
        r.no.toLowerCase().includes(f)
    );
  }, [results, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "order":
          cmp = (indexOfResult.get(a) ?? 0) - (indexOfResult.get(b) ?? 0);
          break;
        case "no":
          cmp = a.no.localeCompare(b.no);
          break;
        case "percentage":
          cmp = a.bestPercentage - b.bestPercentage;
          break;
        case "status":
          cmp = a.status === b.status ? 0 : a.status === "matched" ? -1 : 1;
          break;
        case "name":
          cmp = a.hotelName.localeCompare(b.hotelName);
          break;
        case "links":
          cmp = a.matchedLinks.length - b.matchedLinks.length;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir, indexOfResult]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <FiChevronUp className="inline ml-1" />
    ) : (
      <FiChevronDown className="inline ml-1" />
    );
  };

  if (results.length === 0) return null;

  const matched = results.filter((r) => r.status === "matched").length;

  return (
    <div className="bg-panel rounded-lg p-4 sm:p-5 space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
        <span>
          Tổng: <span className="text-ink font-medium">{results.length}</span>
        </span>
        <span>
          Khớp:{" "}
          <span className="text-green-600 font-medium">{matched}</span>
        </span>
        <span>
          Không khớp:{" "}
          <span className="text-red-600 font-medium">{results.length - matched}</span>
        </span>
        <span>
          Tỷ lệ:{" "}
          <span className="text-sky-600 font-medium">
            {results.length ? Math.round((matched / results.length) * 100) : 0}%
          </span>
        </span>
      </div>

      {/* Filter + Page size */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Lọc theo tên, địa chỉ, số..."
          className="flex-1 min-w-[200px] px-3 py-2 bg-panel border border-hairline rounded-lg text-ink text-sm focus:outline-none focus:border-sky-500"
        />
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="px-3 py-2 bg-panel border border-hairline rounded-lg text-ink text-sm"
        >
          {[25, 50, 100, 200, 500].map((n) => (
            <option key={n} value={n}>
              {n} / trang
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("order")}
              >
                #<SortIcon field="order" />
              </th>
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("no")}
              >
                No<SortIcon field="no" />
              </th>
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("percentage")}
              >
                %<SortIcon field="percentage" />
              </th>
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("status")}
              >
                Trạng thái<SortIcon field="status" />
              </th>
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("name")}
              >
                Tên khách sạn<SortIcon field="name" />
              </th>
              <th className="px-3 py-2 text-left text-ink-soft">Địa chỉ</th>
              <th
                className="px-3 py-2 text-left text-ink-soft cursor-pointer hover:text-ink"
                onClick={() => handleSort("links")}
              >
                Liên kết<SortIcon field="links" />
              </th>
              <th className="px-3 py-2 text-left text-ink-soft">Liên kết khớp</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((result, idx) => {
              const globalIdx = indexOfResult.get(result) ?? idx;
              const isExpanded = expandedRow === globalIdx;
              return (
                <Fragment key={`row-${globalIdx}`}>
                  <tr
                    className="border-b border-hairline hover:bg-panel/50 transition-colors"
                  >
                    <td className="px-3 py-2 text-ink-soft">{globalIdx + 1}</td>
                    <td className="px-3 py-2 text-ink">{result.no}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`font-medium ${
                          result.bestPercentage >= 70
                            ? "text-green-400"
                            : result.bestPercentage >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {result.bestPercentage}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          result.status === "matched"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {result.status === "matched" ? "Khớp" : "Không khớp"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-ink truncate max-w-[200px]">
                          {result.hotelName}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(result.hotelName, globalIdx * 100)
                          }
                          className="text-ink-soft hover:text-ink"
                        >
                          {copiedIdx === globalIdx * 100 ? (
                            <FiCheck className="text-green-400" />
                          ) : (
                            <FiCopy />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-soft truncate max-w-[200px]">
                      {result.address}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">
                      {result.matchedLinks.length}
                    </td>
                    <td className="px-3 py-2">
                      {result.matchedLinks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {result.matchedLinks.slice(0, 2).map((link, li) => (
                            <a
                              key={li}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-fill hover:bg-hairline rounded text-xs text-sky-400 truncate max-w-[200px]"
                            >
                              <span>{link.percentage}%</span>
                              <FiExternalLink className="flex-shrink-0" />
                            </a>
                          ))}
                          {result.matchedLinks.length > 2 && (
                            <button
                              onClick={() =>
                                setExpandedRow(isExpanded ? null : globalIdx)
                              }
                              className="text-xs text-ink-soft hover:text-ink"
                            >
                              +{result.matchedLinks.length - 2} thêm
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`detail-${globalIdx}`} className="bg-canvas/50">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="space-y-1">
                          {result.matchedLinks.map((link, li) => (
                            <div key={li} className="flex items-center gap-3">
                              <span
                                className={`text-xs font-medium ${
                                  link.percentage >= 70
                                    ? "text-green-400"
                                    : link.percentage >= 40
                                    ? "text-yellow-400"
                                    : "text-red-400"
                                }`}
                              >
                                {link.percentage}%
                              </span>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-sm truncate"
                              >
                                {link.title || link.url}
                              </a>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            Trang {page + 1}/{totalPages} ({sorted.length} kết quả)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-fill hover:bg-hairline rounded disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 bg-fill hover:bg-hairline rounded disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
