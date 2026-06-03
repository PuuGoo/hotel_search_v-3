"use client";

import { useCallback, useState } from "react";
import { FiPlay, FiPause, FiSquare, FiRotateCcw, FiTrash2, FiZap } from "react-icons/fi";
import dynamic from "next/dynamic";

import { useBulkSearch } from "./hooks/useBulkSearch";
import { ExcelRow } from "./utils/excelParser";

const FileUpload = dynamic(() => import("./components/FileUpload"), { ssr: false });
const ProgressBar = dynamic(() => import("./components/ProgressBar"), { ssr: false });
const ExportButtons = dynamic(() => import("./components/ExportButtons"), { ssr: false });
const BulkResults = dynamic(() => import("./components/BulkResults"), { ssr: false });

export default function BulkSearchPage() {
  const {
    state,
    startSearch,
    resumeSearch,
    pauseSearch,
    unpauseSearch,
    stopSearch,
    clearResults,
    isResumable,
    session,
    eta,
    progress,
  } = useBulkSearch();

  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFileLoaded = useCallback((loadedRows: ExcelRow[], name: string) => {
    setRows(loadedRows);
    setFileName(name);
  }, []);

  const handleStart = useCallback(() => {
    if (rows.length === 0) return;
    startSearch(rows, fileName);
  }, [rows, fileName, startSearch]);

  const handleResume = useCallback(() => {
    resumeSearch();
  }, [resumeSearch]);

  const handlePauseToggle = useCallback(() => {
    if (state.isPaused) unpauseSearch();
    else pauseSearch();
  }, [state.isPaused, pauseSearch, unpauseSearch]);

  const handleClear = useCallback(() => {
    if (confirm("Xóa tất cả kết quả?")) {
      clearResults();
      setRows([]);
      setFileName("");
    }
  }, [clearResults]);

  // Show restored session info
  const restoredFileName = session?.fileName || fileName;

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tìm kiếm khách sạn hàng loạt</h1>
          <p className="text-gray-400">Upload file Excel và tìm kiếm hàng loạt với Tavily</p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FiZap className="text-sky-400" />
            Tải lên Excel
          </h2>

          <FileUpload onFileLoaded={handleFileLoaded} disabled={state.isRunning} />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {/* Start new search */}
            {!state.isRunning && (
              <button
                onClick={handleStart}
                disabled={rows.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlay />
                {state.results.length > 0 ? "Tìm kiếm mới" : `Bắt đầu (${rows.length} dòng)`}
              </button>
            )}

            {/* Resume from session */}
            {isResumable && (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
              >
                <FiRotateCcw />
                Tiếp tục từ dòng {session!.nextIndex}/{session!.totalRows}
              </button>
            )}

            {/* Pause / Stop */}
            {state.isRunning && (
              <>
                <button
                  onClick={handlePauseToggle}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors text-white ${
                    state.isPaused ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"
                  }`}
                >
                  {state.isPaused ? <FiPlay /> : <FiPause />}
                  {state.isPaused ? "Tiếp tục" : "Tạm dừng"}
                </button>
                <button
                  onClick={stopSearch}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  <FiSquare />
                  Dừng
                </button>
              </>
            )}

            {/* Clear */}
            {state.results.length > 0 && !state.isRunning && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <FiTrash2 />
                Xóa kết quả
              </button>
            )}
          </div>

          {/* Session restored notice */}
          {isResumable && !state.isRunning && (
            <div className="mt-4 bg-yellow-900/20 border border-yellow-800 rounded-lg px-4 py-3 text-yellow-300 text-sm">
              Phiên trước còn dở: {session!.nextIndex}/{session!.totalRows} dòng đã xử lý
              {restoredFileName && ` (${restoredFileName})`}. Nhấn &quot;Tiếp tục&quot; để chạy tiếp.
            </div>
          )}
        </div>

        {/* Progress */}
        {(state.isRunning || state.currentIndex > 0) && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <ProgressBar
              current={state.currentIndex}
              total={state.totalRows}
              percentage={progress}
              eta={eta}
              isRunning={state.isRunning}
              isPaused={state.isPaused}
            />
            {restoredFileName && <p className="text-gray-500 text-sm mt-2">File: {restoredFileName}</p>}
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-400">{state.error}</div>
        )}

        {/* Export */}
        {state.results.length > 0 && (
          <div className="mb-6">
            <ExportButtons results={state.results} disabled={state.isRunning} />
          </div>
        )}

        {/* Results */}
        <BulkResults results={state.results} />

        {/* Empty State */}
        {state.results.length === 0 && !state.isRunning && rows.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FiZap className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Upload file Excel để bắt đầu</p>
            <p className="text-sm mt-2">Hỗ trợ tìm kiếm hàng loạt khách sạn với Tavily</p>
            <div className="mt-6 text-xs text-gray-600 max-w-md mx-auto">
              <p className="font-medium text-gray-500 mb-2">Định dạng Excel:</p>
              <table className="mx-auto text-left">
                <thead>
                  <tr className="text-gray-500">
                    <th className="px-2 py-1">No</th>
                    <th className="px-2 py-1">Hotel Name</th>
                    <th className="px-2 py-1">Address</th>
                    <th className="px-2 py-1">URL Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1">1</td>
                    <td className="px-2 py-1">Hotel ABC</td>
                    <td className="px-2 py-1">123 Street</td>
                    <td className="px-2 py-1">CTrip SuperAgg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
