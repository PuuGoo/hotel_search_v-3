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
} from "react-icons/fi";

import { mergeFinderRow } from "./utils/rowMerge";

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // Case-insensitive extension check to match the server's
      // hasXlsxExtension, so a valid "HOTELS.XLSX" isn't wrongly rejected here.
      if (f.name.split(".").pop()?.toLowerCase() !== "xlsx") {
        toast.error("Chỉ chấp nhận file .xlsx");
        return;
      }
      // Mirror the server-side 20MB cap so an oversized file is rejected before
      // the upload starts instead of after the whole body is sent.
      if (f.size > 20 * 1024 * 1024) {
        toast.error("File quá lớn (tối đa 20MB)");
        return;
      }
      setFile(f);
      setError(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error("Vui lòng chọn file Excel");
      return;
    }

    setJobStatus("uploading");
    setError(null);
    setRows([]);
    setWorkerStatus({});

    // Close any prior stream before starting a new one, otherwise the old
    // EventSource keeps reconnecting in the background (client leak) and holds
    // a server-side SSE polling interval alive.
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workers", String(workers));
      formData.append("template", template);

      const res = await axios.post("/api/hotel-finder", formData);
      const { job_id, status } = res.data;

      setJobId(job_id);
      setJobStatus(status || "running");

      // Connect to SSE
      const es = new EventSource(`/api/hotel-finder/progress?jobId=${job_id}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "row") {
            // Dedup by the row's unique absolute Excel row number. On an SSE
            // reconnect (network blip during a long job) the server restarts the
            // stream from the beginning and resends every row, so a blind append
            // would duplicate rows and inflate the stats. See mergeFinderRow.
            setRows((prev) => mergeFinderRow(prev, data.data as FinderRow));
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

      es.onerror = () => {
        // SSE will auto-reconnect
      };
    } catch (err: any) {
      setError(err.response?.data?.error || "Tải lên thất bại");
      setJobStatus("error");
      toast.error("Tải lên thất bại");
    }
  }, [file, workers, template]);

  const handleCancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await axios.post(`/api/hotel-finder/cancel/${jobId}`);
      eventSourceRef.current?.close();
      setJobStatus("cancelled");
    } catch {}
  }, [jobId]);

  const handleDownload = useCallback(
    (format: string) => {
      if (!jobId) return;
      window.open(`/api/hotel-finder/download?jobId=${jobId}&format=${format}`, "_blank");
    },
    [jobId]
  );

  const handleReset = useCallback(() => {
    eventSourceRef.current?.close();
    setFile(null);
    setJobId(null);
    setJobStatus("idle");
    setRows([]);
    setTotal(0);
    setWorkerStatus({});
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

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
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FiZap className="text-sky-400" />
            Cấu hình
          </h2>

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
                  // Clamp to 1-5 to match the server bound, so the displayed
                  // value never diverges from what actually runs.
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

            {(isDone || isError) && (
              <>
                {isDone && (
                  <>
                    <button
                      onClick={() => handleDownload("xlsx")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <FiDownload />
                      XLSX
                    </button>
                    <button
                      onClick={() => handleDownload("json")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                    >
                      <FiDownload />
                      JSON
                    </button>
                  </>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <FiRefreshCw />
                  Mới
                </button>
              </>
            )}
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
      </div>
    </div>
  );
}
