"use client";

import { FiDownload, FiFileText, FiFile } from "react-icons/fi";

import { MatchResult } from "../utils/resultMatcher";
import { downloadCSV, downloadJSON, downloadXLSX } from "../utils/exportUtils";

interface ExportButtonsProps {
  results: MatchResult[];
  disabled?: boolean;
}

export default function ExportButtons({ results, disabled }: ExportButtonsProps) {
  if (results.length === 0) return null;

  const timestamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => downloadCSV(results, `hotel_results_${timestamp}.csv`)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        <FiFileText />
        CSV
      </button>
      <button
        onClick={() => downloadJSON(results, `hotel_results_${timestamp}.json`)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        <FiDownload />
        JSON
      </button>
      <button
        onClick={() => {
          // downloadXLSX is async (lazy-loads xlsx). Swallow rejection so a
          // failed dynamic import can't surface as an unhandled rejection.
          void downloadXLSX(results, `hotel_results_${timestamp}.xlsx`).catch(() => {});
        }}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        <FiFile />
        XLSX
      </button>
    </div>
  );
}
