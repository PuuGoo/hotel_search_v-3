"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiFileText,
  FiMessageSquare,
  FiShield,
  FiGlobe,
  FiCalendar,
  FiDownload,
  FiLoader,
} from "react-icons/fi";

type ReportType = "search" | "conversation" | "audit" | "finder";
type ExportFormat = "xlsx" | "csv" | "json";

const REPORT_TYPES: { value: ReportType; label: string; icon: any; description: string }[] = [
  {
    value: "search",
    label: "Báo cáo tìm kiếm",
    icon: FiFileText,
    description: "Lịch sử tìm kiếm khách sạn, từ khóa và kết quả",
  },
  {
    value: "conversation",
    label: "Báo cáo tin nhắn",
    icon: FiMessageSquare,
    description: "Lịch sử tin nhắn trong các cuộc trò chuyện",
  },
  {
    value: "audit",
    label: "Báo cáo audit",
    icon: FiShield,
    description: "Nhật ký các thay đổi quan trọng trên hệ thống",
  },
  {
    value: "finder",
    label: "Báo cáo Finder",
    icon: FiGlobe,
    description: "Kết quả tìm URL khách sạn hàng loạt",
  },
];

const REPORT_COLUMNS: Record<ReportType, string[]> = {
  search: ["STT", "Từ khóa", "Công cụ", "Số kết quả", "Thời gian (ms)", "Ngày tạo"],
  conversation: ["STT", "Người gửi", "Nội dung", "Cuộc trò chuyện", "Ngày gửi"],
  audit: ["STT", "Hành động", "Người thực hiện", "Đối tượng", "Thời gian"],
  finder: ["STT", "Tên khách sạn", "Địa chỉ", "Trạng thái", "Phần trăm"],
};

const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>("search");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreview(null);
    try {
      const response = await axios.post("/api/reports/preview", {
        type: reportType,
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      setPreview(response.data.rows);
    } catch (error: any) {
      const message =
        error?.response?.data?.error || "Không thể tải preview";
      toast.error(message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExport = async () => {
    const response = await axios.post(
      "/api/reports/export",
      {
        type: reportType,
        format,
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      },
      { responseType: "blob" }
    );

    const blob = new Blob([response.data], {
      type: (response.headers["content-type"] as string) || "application/octet-stream",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      response.headers["content-disposition"]?.split("filename=")[1] ||
      `baocao_${reportType}_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const columns = REPORT_COLUMNS[reportType];
  const selectedReport = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="h-full bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <FiFileText className="h-8 w-8 text-sky-500" />
          <h1 className="text-2xl font-bold text-white">Xuất báo cáo</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Loại báo cáo
              </h2>
              <div className="space-y-2">
                {REPORT_TYPES.map((rt) => {
                  const Icon = rt.icon;
                  return (
                    <button
                      key={rt.value}
                      onClick={() => {
                        setReportType(rt.value);
                        setPreview(null);
                      }}
                      className={`w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors ${
                        reportType === rt.value
                          ? "bg-sky-500/10 border border-sky-500/50 text-sky-400"
                          : "bg-gray-800/50 border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{rt.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {rt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                <FiCalendar className="inline mr-2 h-4 w-4" />
                Khoảng thời gian
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Định dạng
              </h2>
              <div className="flex gap-2">
                {(["xlsx", "csv", "json"] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      format === f
                        ? "bg-sky-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {selectedReport?.label} - Xem trước
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    disabled={loadingPreview}
                    className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingPreview ? (
                      <FiLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiFileText className="h-4 w-4" />
                    )}
                    Xem trước
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <FiLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiDownload className="h-4 w-4" />
                    )}
                    Tạo báo cáo
                  </button>
                </div>
              </div>

              {preview && preview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {i + 1}
                          </td>
                          {Object.values(row).slice(0, columns.length - 1).map((val, j) => (
                            <td
                              key={j}
                              className="px-4 py-3 text-sm text-gray-300 max-w-[200px] truncate"
                              title={String(val ?? "")}
                            >
                              {val != null ? String(val) : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="text-sm text-gray-400 mt-3 text-center">
                      Hiển thị 10 / {preview.length} bản ghi
                    </p>
                  )}
                </div>
              )}

              {preview && preview.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FiFileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Không có dữ liệu cho khoảng thời gian này</p>
                </div>
              )}

              {!preview && (
                <div className="text-center py-12 text-gray-400">
                  <FiFileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nhấn &quot;Xem trước&quot; để xem dữ liệu sẽ được xuất</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
