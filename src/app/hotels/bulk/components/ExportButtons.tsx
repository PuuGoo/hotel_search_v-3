"use client";

import { FiDownload, FiFileText, FiFile } from "react-icons/fi";

import { MatchResult } from "../utils/resultMatcher";
import { downloadCSV, downloadJSON, downloadXLSX } from "../utils/exportUtils";

interface ExportButtonsProps {
  results: MatchResult[];
  disabled?: boolean;
  showDuringRun?: boolean;
}

export default function ExportButtons({ results, disabled, showDuringRun }: ExportButtonsProps) {
  if (results.length === 0) return null;

  const timestamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap gap-2">
      {/* XLSX - always visible when showDuringRun */}
      <button
        onClick={() => {
          void downloadXLSX(results, `hotel_results_${timestamp}.xlsx`).catch(() => {});
        }}
        disabled={disabled && !showDuringRun}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        <FiFile />
        XLSX ({results.length})
      </button>
      
      {/* Other formats - only when not running */}
      {!disabled && (
        <>
          <button
            onClick={() => downloadCSV(results, `hotel_results_${timestamp}.csv`)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            <FiFileText />
            CSV
          </button>
          <button
            onClick={() => downloadJSON(results, `hotel_results_${timestamp}.json`)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            <FiDownload />
            JSON
          </button>
        </>
      )}
    </div>
  );
}
