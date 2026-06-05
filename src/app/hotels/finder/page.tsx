"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiPlay,
  FiSquare,
  FiDownload,
  FiUpload,
  FiZap,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSave,
  FiSettings,
  FiX,
  FiTrash2,
} from "react-icons/fi";
import dynamic from "next/dynamic";

import { mergeFinderRow } from "./utils/rowMerge";
import FeatureThemeProvider from "../../components/theme/FeatureThemeProvider";

const TemplateManager = dynamic(() => import("./components/TemplateManager"), { ssr: false });
const ScheduleManager = dynamic(() => import("./components/ScheduleManager"), { ssr: false });
const RunHistory = dynamic(() => import("./components/RunHistory"), { ssr: false });

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

interface WorkerStatus {
  worker_id: number;
  status: string;
  hotel_name?: string;
  no?: number;
}

interface AutoSaveSettings {
  enabled: boolean;
  lineThreshold: number;
  folder: string;
}

export default function HotelFinderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [workers, setWorkers] = useState(3);
  const [template, setTemplate] = useState("full");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [rows, setRows] = useState<FinderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [workerStatus, setWorkerStatus] = useState<Record<number, WorkerStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>({
    enabled: false,
    lineThreshold: 10,
    folder: "finder",
  });
  const [showAutoSaveSettings, setShowAutoSaveSettings] = useState(false);
  const [autoSaveCount, setAutoSaveCount] = useState(0);
  const [showSaveTemplatePrompt, setShowSaveTemplatePrompt] = useState(false);
  const lastAutoSaveRef = useRef(0);
  const rowsRef = useRef<FinderRow[]>([]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.name.split(".").pop()?.toLowerCase() !== "xlsx") {
        toast.error("Chỉ chấp nhận file .xlsx");
        return;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error("File quá lớn (tối đa 20MB)");
        return;
      }
      setFile(f);
      setError(null);
    }
  }, []);

  const autoSaveRef = useRef<{ fileId?: string; fileName?: string }>({});

  const autoSaveToDrive = useCallback(
    async (rowsToSave: FinderRow[]) => {
      if (!autoSaveSettings.enabled || rowsToSave.length === 0) return;

      try {
        // Dynamic import xlsx
        const XLSX = await import("xlsx");
        
        // Use fixed filename for overwrite
        const displayName = `finder-auto-results.xlsx`;

        // Convert ALL current rows to XLSX (not just new ones)
        const wsData = rows.map((r, idx) => ({
          "#": idx + 1,
          "No": r.no,
          "Hotel Name": r.hotel_name,
          "Address": r.hotel_address,
          "Status": r.status,
          "URL": r.url || "",
          "Score": r.score || 0,
          "Images": r.img_count || 0,
          "Explanation": r.explanation || "",
        }));
        
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Results");
        
        const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([xlsxBuffer], { 
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });

        const formData = new FormData();
        const fileObj = new File([blob], displayName, { 
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        formData.append("file", fileObj);

        const uploadRes = await axios.post("/api/messages/upload", formData);
        const { fileUrl } = uploadRes.data;

        const serverName = fileUrl.split("/").pop() || displayName;

        // If we have a previous file, delete it first (overwrite)
        if (autoSaveRef.current.fileId) {
          try {
            await axios.delete(`/api/drive/${autoSaveRef.current.fileId}`);
          } catch {}
        }

        const driveRes = await axios.post("/api/drive", {
          fileName: serverName,
          originalName: displayName,
          filePath: fileUrl,
          fileSize: blob.size,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          folder: autoSaveSettings.folder,
        });

        // Save the file ID for next overwrite
        if (driveRes.data?.id) {
          autoSaveRef.current = { fileId: driveRes.data.id, fileName: displayName };
        }

        setAutoSaveCount((prev) => prev + 1);
        toast.success(`Đã tự động lưu ${rows.length} dòng vào Drive (XLSX)`);
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    },
    [autoSaveSettings, rows]
  );

  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error("Vui lòng chọn file Excel");
      return;
    }

    setJobStatus("uploading");
    setError(null);
    setRows([]);
    setWorkerStatus({});
    setAutoSaveCount(0);
    lastAutoSaveRef.current = 0;

    // Close any stale SSE connection from a previous run (cancel, error, etc.)
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    // Reset the file input so re-selecting the same file triggers onChange.
    // Without this the browser sees the value as unchanged and skips the event,
    // leaving the old (possibly consumed) File object in state.
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workers", String(workers));
      formData.append("template", template);

      const res = await axios.post("/api/hotel-finder", formData);
      const { job_id, status } = res.data;

      setJobId(job_id);
      setJobStatus(status || "running");

      const es = new EventSource(`/api/hotel-finder/progress?jobId=${job_id}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "row") {
            setRows((prev) => {
              const updated = mergeFinderRow(prev, data.data as FinderRow);

              if (
                autoSaveSettings.enabled &&
                updated.length - lastAutoSaveRef.current >= autoSaveSettings.lineThreshold
              ) {
                const newRows = updated.slice(lastAutoSaveRef.current);
                lastAutoSaveRef.current = updated.length;
                autoSaveToDrive(newRows);
              }

              return updated;
            });
          } else if (data.type === "worker_status") {
            setWorkerStatus((prev) => ({
              ...prev,
              [data.data.worker_id]: data.data,
            }));
          } else if (data.type === "status") {
            setTotal(data.total);
            setJobStatus(data.jobStatus);
          } else if (data.type === "complete") {
            setJobStatus("done");
            setTotal(data.total);
            setShowSaveTemplatePrompt(true);

            const finalRows = rowsRef.current;
            const matchedCount = finalRows.filter((r) => r.status === "matched").length;
            const errorCount = finalRows.filter((r) => r.status === "error").length;
            const runEntry = {
              id: `run-${Date.now()}`,
              name: file?.name?.replace(/\.[^.]+$/, "") || `Chạy ${new Date().toLocaleTimeString("vi-VN")}`,
              date: new Date().toISOString(),
              rows: finalRows,
              stats: { matched: matchedCount, errors: errorCount, total: finalRows.length },
            };
            const STORAGE_KEY = "finder-run-history";
            const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            existing.unshift(runEntry);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));

            if (autoSaveSettings.enabled) {
              setRows((prev) => {
                if (prev.length > lastAutoSaveRef.current) {
                  const remaining = prev.slice(lastAutoSaveRef.current);
                  autoSaveToDrive(remaining);
                }
                return prev;
              });
            }

            toast.success(`Hoàn thành! ${data.processed}/${data.total} hotels`);
            es.close();
          } else if (data.type === "error") {
            setError(data.error);
            setJobStatus("error");
            toast.error(`Lỗi: ${data.error}`);
            es.close();
          } else if (data.type === "cancelled") {
            setJobStatus("cancelled");
            toast("Đã hủy", { icon: "⏹" });
            es.close();
          }
        } catch {}
      };

      es.onerror = () => {};
    } catch (err: any) {
      setError(err.response?.data?.error || "Tải lên thất bại");
      setJobStatus("error");
      toast.error("Tải lên thất bại");
    }
  }, [file, workers, template, autoSaveSettings, autoSaveToDrive]);

  const handleCancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await axios.post(`/api/hotel-finder/cancel/${jobId}`);
      eventSourceRef.current?.close();
      setJobStatus("cancelled");
    } catch {}
  }, [jobId]);

  const handleClearCache = useCallback(async () => {
    try {
      await axios.delete("/api/hotel-finder/cache");
      toast.success("Đã xóa cache! Lần chạy tiếp sẽ tìm kiếm lại từ đầu.");
    } catch {
      toast.error("Không thể xóa cache");
    }
  }, []);

  const handleDownload = useCallback(
    (format: string) => {
      if (!jobId) return;
      window.open(`/api/hotel-finder/download?jobId=${jobId}&format=${format}`, "_blank");
    },
    [jobId]
  );

  const handleSaveToDrive = useCallback(async () => {
    if (rows.length === 0) return;

    try {
      // Dynamic import xlsx
      const XLSX = await import("xlsx");
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const displayName = `finder-results-${timestamp}.xlsx`;

      // Convert rows to XLSX
      const wsData = rows.map((r, idx) => ({
        "#": idx + 1,
        "No": r.no,
        "Hotel Name": r.hotel_name,
        "Address": r.hotel_address,
        "Status": r.status,
        "URL": r.url || "",
        "Score": r.score || 0,
        "Images": r.img_count || 0,
        "Explanation": r.explanation || "",
      }));
      
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      
      const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([xlsxBuffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });

      const formData = new FormData();
      const fileObj = new File([blob], displayName, { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      formData.append("file", fileObj);

      const uploadRes = await axios.post("/api/messages/upload", formData);
      const { fileUrl } = uploadRes.data;

      const serverName = fileUrl.split("/").pop() || displayName;

      await axios.post("/api/drive", {
        fileName: serverName,
        originalName: displayName,
        filePath: fileUrl,
        fileSize: blob.size,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        folder: "finder",
      });

      toast.success("Đã lưu kết quả XLSX vào Drive");
    } catch {
      toast.error("Không thể lưu vào Drive");
    }
  }, [rows]);

  const handleReset = useCallback(() => {
    eventSourceRef.current?.close();
    setFile(null);
    setJobId(null);
    setJobStatus("idle");
    setRows([]);
    setTotal(0);
    setWorkerStatus({});
    setError(null);
    setAutoSaveCount(0);
    setShowSaveTemplatePrompt(false);
    lastAutoSaveRef.current = 0;
    autoSaveRef.current = {};
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleApplyTemplate = useCallback(
    (tpl: {
      workers: number;
      template: string;
      autoSaveEnabled: boolean;
      autoSaveLines: number;
      autoSaveFolder: string;
    }) => {
      setWorkers(tpl.workers);
      setTemplate(tpl.template);
      setAutoSaveSettings({
        enabled: tpl.autoSaveEnabled,
        lineThreshold: tpl.autoSaveLines,
        folder: tpl.autoSaveFolder,
      });
      if (tpl.autoSaveEnabled) setShowAutoSaveSettings(true);
    },
    []
  );

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const isRunning = jobStatus === "running" || jobStatus === "uploading" || jobStatus === "queued";
  const isDone = jobStatus === "done";
  const isError = jobStatus === "error";

  const matched = rows.filter((r) => r.status === "matched").length;
  const noResult = rows.filter((r) => r.status === "no-valid-result").length;
  const errors = rows.filter((r) => r.status === "error").length;
  const avgScore = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.score || 0), 0) / rows.length)
    : 0;
  const progress = total > 0 ? Math.round((rows.length / total) * 100) : 0;

  return (
    <FeatureThemeProvider feature="finder">
      <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tìm URL khách sạn</h1>
          <p className="text-gray-400">
            Tìm official website URL cho khách sạn bằng Playwright + DuckDuckGo
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiZap className="text-sky-400" />
              Cấu hình
            </h2>
            <button
              onClick={() => setShowAutoSaveSettings(!showAutoSaveSettings)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <FiSettings size={14} />
              Auto-save
              {autoSaveSettings.enabled && (
                <span className="w-2 h-2 bg-green-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Auto-save Settings Panel */}
          {showAutoSaveSettings && (
            <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveSettings.enabled}
                    onChange={(e) =>
                      setAutoSaveSettings((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-300">Bật tự động lưu</span>
                </label>

                {autoSaveSettings.enabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Số dòng:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={autoSaveSettings.lineThreshold}
                        onChange={(e) =>
                          setAutoSaveSettings((prev) => ({
                            ...prev,
                            lineThreshold: parseInt(e.target.value) || 10,
                          }))
                        }
                        className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Thư mục:</label>
                      <input
                        type="text"
                        value={autoSaveSettings.folder}
                        onChange={(e) =>
                          setAutoSaveSettings((prev) => ({
                            ...prev,
                            folder: e.target.value || "finder",
                          }))
                        }
                        className="w-32 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              {autoSaveSettings.enabled && (
                <p className="mt-2 text-xs text-gray-400">
                  Tự động lưu mỗi {autoSaveSettings.lineThreshold} dòng vào thư mục &quot;{autoSaveSettings.folder}&quot;
                  {autoSaveCount > 0 && (
                    <span className="text-green-400 ml-2">
                      Đã lưu {autoSaveCount} lần
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* File Upload */}
            <div className="md:col-span-1">
              <label className="block text-sm text-gray-400 mb-1">File Excel (.xlsx)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={isRunning}
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white hover:file:bg-sky-700 file:cursor-pointer disabled:opacity-50"
              />
              {file && (
                <p className="text-green-400 text-xs mt-1">{file.name}</p>
              )}
            </div>

            {/* Workers */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Số luồng (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={workers}
                onChange={(e) => {
                  const n = parseInt(e.target.value) || 3;
                  setWorkers(Math.min(5, Math.max(1, n)));
                }}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm disabled:opacity-50"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Mẫu xuất file</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm disabled:opacity-50"
              >
                <option value="full">Đầy đủ (Tổng quan + Ghi chú + Biểu đồ)</option>
                <option value="executive">Rút gọn (Chỉ tổng quan)</option>
                <option value="quick">Nhanh (Chỉ kết quả)</option>
                <option value="analysis">Phân tích (Tổng quan + Kiểm tra)</option>
              </select>
            </div>
          </div>

          {/* Template Manager */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Mẫu cấu hình</label>
            <TemplateManager
              workers={workers}
              template={template}
              autoSaveEnabled={autoSaveSettings.enabled}
              autoSaveLines={autoSaveSettings.lineThreshold}
              autoSaveFolder={autoSaveSettings.folder}
              isRunning={isRunning}
              onApply={handleApplyTemplate}
            />
          </div>

          {/* Schedule Manager */}
          <div className="mb-4">
            <ScheduleManager
              onRunNow={(job) => {
                if (job.template) {
                  handleApplyTemplate({
                    workers: job.template.workers,
                    template: job.template.template,
                    autoSaveEnabled: job.template.autoSaveEnabled,
                    autoSaveLines: job.template.autoSaveLines,
                    autoSaveFolder: job.template.autoSaveFolder,
                  });
                }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isRunning && !isDone && (
              <button
                onClick={handleUpload}
                disabled={!file}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlay />
                Bắt đầu
              </button>
            )}

            {isRunning && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <FiSquare />
                Hủy
              </button>
            )}

            {/* Download XLSX - always visible when there are rows */}
            {rows.length > 0 && jobId && (
              <>
                <button
                  onClick={() => handleDownload("xlsx")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <FiDownload />
                  XLSX ({rows.length})
                </button>
                {!isRunning && (
                  <>
                    <button
                      onClick={() => handleDownload("json")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                    >
                      <FiDownload />
                      JSON
                    </button>
                    <button
                      onClick={handleSaveToDrive}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <FiSave />
                      Lưu vào Drive
                    </button>
                  </>
                )}
              </>
            )}

            {/* Reset Job - luôn hiện khi có kết quả (kể cả đang chạy) */}
            {rows.length > 0 && (
              <button
                onClick={async () => {
                  // Nếu đang chạy thì hủy trước
                  if (isRunning && jobId) {
                    try {
                      await axios.post(`/api/hotel-finder/cancel/${jobId}`);
                      eventSourceRef.current?.close();
                    } catch {}
                  }
                  handleReset();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <FiRefreshCw />
                Reset
              </button>
            )}

            {/* New - xóa tất cả và bắt đầu mới */}
            {(isDone || isError || jobStatus === "cancelled") && (
              <button
                onClick={() => {
                  handleReset();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }} 
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <FiRefreshCw />
                Mới
              </button>
            )}

            {/* Clear Cache - xóa cache để chạy lại từ đầu */}
            <button
              onClick={handleClearCache}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiTrash2 />
              Xóa Cache
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-sky-400">
                {jobStatus === "queued" ? "Đang chờ..." : "Đang tìm kiếm..."}
              </span>
              <span className="text-gray-400">
                {rows.length}/{total} ({progress}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-sky-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Auto-save indicator */}
            {autoSaveSettings.enabled && autoSaveCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                <FiSave size={12} />
                Đã tự động lưu {autoSaveCount} lần
              </div>
            )}

            {/* Worker Status */}
            {Object.keys(workerStatus).length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.values(workerStatus).map((w) => (
                  <div
                    key={w.worker_id}
                    className="bg-gray-700/50 rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="text-gray-400">Luồng {w.worker_id}</div>
                    <div className="text-white truncate">
                      {w.status === "searching" ? (
                        <span className="text-yellow-400">{w.hotel_name?.slice(0, 20)}...</span>
                      ) : w.status === "done" ? (
                        <span className="text-green-400">Xong #{w.no}</span>
                      ) : (
                        <span className="text-gray-500">{w.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Dashboard */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{rows.length}</div>
              <div className="text-xs text-gray-400">Đã xử lý</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{matched}</div>
              <div className="text-xs text-gray-400">Khớp</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{noResult}</div>
              <div className="text-xs text-gray-400">Không có kết quả</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{errors}</div>
              <div className="text-xs text-gray-400">Lỗi</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-sky-400">{avgScore}%</div>
              <div className="text-xs text-gray-400">Điểm trung bình</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {rows.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Kết quả</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-3 py-2 text-left text-gray-400">#</th>
                    <th className="px-3 py-2 text-left text-gray-400">No</th>
                    <th className="px-3 py-2 text-left text-gray-400">Điểm</th>
                    <th className="px-3 py-2 text-left text-gray-400">Trạng thái</th>
                    <th className="px-3 py-2 text-left text-gray-400">Tên khách sạn</th>
                    <th className="px-3 py-2 text-left text-gray-400">Địa chỉ</th>
                    <th className="px-3 py-2 text-left text-gray-400">URL</th>
                    <th className="px-3 py-2 text-left text-gray-400">Hình ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                        row.status === "error"
                          ? "bg-red-900/10 border-l-2 border-l-red-500"
                          : row.status === "no-valid-result"
                          ? "bg-yellow-900/10 border-l-2 border-l-yellow-500"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-gray-300">{row.no}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-medium ${
                            (row.score || 0) >= 70
                              ? "text-green-400"
                              : (row.score || 0) >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {row.score || 0}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "matched" ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <FiCheckCircle /> Khớp
                          </span>
                        ) : row.status === "error" ? (
                          <span className="flex items-center gap-1 text-red-400">
                            <FiXCircle /> Lỗi
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <FiClock /> Không có kết quả
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-white truncate max-w-[200px]">
                        {row.hotel_name}
                      </td>
                      <td className="px-3 py-2 text-gray-400 truncate max-w-[200px]">
                        {row.hotel_address}
                      </td>
                      <td className="px-3 py-2">
                        {row.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline truncate max-w-[200px] inline-block"
                          >
                            {row.url.replace(/^https?:\/\//, "").slice(0, 30)}
                          </a>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{row.img_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {rows.length === 0 && !isRunning && (
          <div className="text-center py-16 text-gray-400">
            <FiUpload className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Chọn file Excel để bắt đầu</p>
            <p className="text-sm mt-2">
              File phải có cột <code className="text-sky-400">child_hotel_name</code> và{" "}
              <code className="text-sky-400">child_hotel_address</code>
            </p>
            <div className="mt-4 text-xs text-gray-600">
              <p>Yêu cầu: Python + Playwright + Oxylabs proxy</p>
              <p>Env: OXYLABS_USER, OXYLABS_PASS</p>
            </div>
          </div>
        )}

        {/* Run History */}
        <RunHistory />

        {/* Save as Template Prompt */}
        {showSaveTemplatePrompt && isDone && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Lưu cấu hình này làm mẫu?</span>
              <button
                onClick={() => setShowSaveTemplatePrompt(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {workers} luồng · {template} · Tự động lưu: {autoSaveSettings.enabled ? "Bật" : "Tắt"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveTemplatePrompt(false)}
                className="flex-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Để sau
              </button>
              <button
                onClick={() => setShowSaveTemplatePrompt(false)}
                className="flex-1 px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
              >
                Lưu ngay
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </FeatureThemeProvider>
  );
}
