"use client";

import axios from "axios";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiFile,
  FiFileText,
  FiGrid,
  FiImage,
  FiList,
  FiSearch,
  FiTrash2,
  FiFolder,
  FiFilm,
  FiMusic,
  FiArchive,
  FiCode,
  FiInbox,
  FiEye,
  FiShare2,
  FiClock,
} from "react-icons/fi";
import dynamic from "next/dynamic";
import StorageQuotaBar from "./components/StorageQuotaBar";
import QuotaWarning from "./components/QuotaWarning";
import FeatureThemeProvider from "../components/theme/FeatureThemeProvider";

const FilePreviewModal = dynamic(() => import("./components/FilePreviewModal"), { ssr: false });
const ShareModal = dynamic(() => import("./components/ShareModal"), { ssr: false });
const VersionHistory = dynamic(() => import("./components/VersionHistory"), { ssr: false });

interface DriveFile {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  folder: string | null;
  version: number;
  createdAt: string;
}

type SortKey = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc";

const FOLDERS = [
  { key: "all", label: "Tất cả" },
  { key: "chat", label: "Chat" },
  { key: "finder", label: "Finder" },
  { key: "exports", label: "Exports" },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FiFile;
  if (mimeType.startsWith("image/")) return FiImage;
  if (mimeType.startsWith("video/")) return FiFilm;
  if (mimeType.startsWith("audio/")) return FiMusic;
  if (mimeType.includes("pdf")) return FiFileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FiGrid;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
    return FiArchive;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("xml"))
    return FiCode;
  return FiFile;
}

function getFileIconColor(mimeType: string | null) {
  if (!mimeType) return "text-gray-400";
  if (mimeType.startsWith("image/")) return "text-pink-400";
  if (mimeType.startsWith("video/")) return "text-purple-400";
  if (mimeType.startsWith("audio/")) return "text-yellow-400";
  if (mimeType.includes("pdf")) return "text-red-400";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return "text-green-400";
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("xml"))
    return "text-sky-400";
  return "text-gray-400";
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [shareModalFile, setShareModalFile] = useState<DriveFile | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<DriveFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder !== "all") params.set("folder", folder);
      const res = await axios.get(`/api/drive?${params.toString()}`);
      setFiles(res.data);
    } catch {
      toast.error("Không tải được danh sách file");
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const filtered = files.filter((f) => {
      if (!search.trim()) return true;
      return f.originalName.toLowerCase().includes(search.toLowerCase());
    });
    const arr = [...filtered];
    switch (sort) {
      case "date-desc":
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "date-asc":
        arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name-asc":
        arr.sort((a, b) => a.originalName.localeCompare(b.originalName));
        break;
      case "name-desc":
        arr.sort((a, b) => b.originalName.localeCompare(a.originalName));
        break;
      case "size-desc":
        arr.sort((a, b) => b.fileSize - a.fileSize);
        break;
      case "size-asc":
        arr.sort((a, b) => a.fileSize - b.fileSize);
        break;
    }
    return arr;
  }, [files, search, sort]);

  const handleDownload = useCallback((file: DriveFile) => {
    window.open(`/api/drive/file/${file.fileName}`, "_blank");
  }, []);

  const handleDelete = useCallback(
    async (file: DriveFile) => {
      if (!window.confirm(`Xóa file "${file.originalName}"?`)) return;
      setDeletingId(file.id);
      try {
        await axios.delete(`/api/drive/${file.id}`);
        toast.success("Đã xóa file");
        setRefreshTrigger((p) => p + 1);
        load();
      } catch {
        toast.error("Xóa file thất bại");
      } finally {
        setDeletingId(null);
      }
    },
    [load]
  );

  return (
    <FeatureThemeProvider feature="drive">
      <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Drive</h1>
          <p className="text-gray-400">Quản lý file đã lưu</p>
        </header>

        <QuotaWarning refreshTrigger={refreshTrigger} />
        <StorageQuotaBar refreshTrigger={refreshTrigger} />

        <div className="flex gap-6">
          <aside className="hidden md:block w-48 shrink-0">
            <nav className="space-y-1">
              {FOLDERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFolder(f.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    folder === f.key
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <FiFolder size={16} />
                  {f.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm file..."
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="date-desc">Mới nhất</option>
                <option value="date-asc">Cũ nhất</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
                <option value="size-desc">Lớn nhất</option>
                <option value="size-asc">Nhỏ nhất</option>
              </select>

              <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`p-2 ${view === "grid" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-2 ${view === "list" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {folder === "all" && (
              <div className="md:hidden flex gap-2 mb-4 overflow-x-auto">
                {FOLDERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFolder(f.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      folder === f.key
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white bg-gray-800/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="text-gray-400 py-12 text-center">Đang tải...</p>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiInbox className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">Chưa có file nào</p>
                <p className="text-sm mt-2">File sẽ xuất hiện khi bạn lưu từ các tính năng khác</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sorted.map((file) => {
                  const Icon = getFileIcon(file.mimeType);
                  const iconColor = getFileIconColor(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center group hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <Icon className={`h-10 w-10 mb-2 ${iconColor}`} />
                      <p className="text-white text-sm font-medium truncate w-full" title={file.originalName}>
                        {file.originalName}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">{formatFileSize(file.fileSize)}</p>
                      {file.folder && (
                        <span className="text-xs rounded bg-gray-700 px-1.5 py-0.5 text-gray-300 mt-1.5">
                          {file.folder}
                        </span>
                      )}
                      <p className="text-gray-600 text-xs mt-1">
                        {format(new Date(file.createdAt), "dd/MM/yyyy")}
                      </p>
                      <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-emerald-400 rounded"
                          title="Xem trước"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-sky-400 rounded"
                          title="Tải xuống"
                        >
                          <FiDownload size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-violet-400 rounded"
                          title="Chia sẻ"
                        >
                          <FiShare2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersionHistoryFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-amber-400 rounded"
                          title="Lịch sử"
                        >
                          <FiClock size={14} />
                        </button>
                        <button
                          disabled={deletingId === file.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-400 rounded disabled:opacity-50"
                          title="Xóa"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {sorted.map((file) => {
                  const Icon = getFileIcon(file.mimeType);
                  const iconColor = getFileIconColor(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 group hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{file.originalName}</p>
                      </div>
                      {file.folder && (
                        <span className="hidden sm:inline text-xs rounded bg-gray-700 px-1.5 py-0.5 text-gray-300 shrink-0">
                          {file.folder}
                        </span>
                      )}
                      <span className="text-gray-500 text-xs shrink-0 w-20 text-right">
                        {formatFileSize(file.fileSize)}
                      </span>
                      <span className="text-gray-600 text-xs shrink-0 w-24 text-right">
                        {format(new Date(file.createdAt), "dd/MM/yyyy")}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-emerald-400 rounded"
                          title="Xem trước"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-sky-400 rounded"
                          title="Tải xuống"
                        >
                          <FiDownload size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-violet-400 rounded"
                          title="Chia sẻ"
                        >
                          <FiShare2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersionHistoryFile(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-amber-400 rounded"
                          title="Lịch sử"
                        >
                          <FiClock size={14} />
                        </button>
                        <button
                          disabled={deletingId === file.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-400 rounded disabled:opacity-50"
                          title="Xóa"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <FilePreviewModal file={previewFile} isOpen={!!previewFile} onClose={() => setPreviewFile(null)} />
      <ShareModal file={shareModalFile} isOpen={!!shareModalFile} onClose={() => setShareModalFile(null)} />
      <VersionHistory
        fileId={versionHistoryFile?.id || ""}
        currentVersion={versionHistoryFile?.version || 1}
        isOpen={!!versionHistoryFile}
        onClose={() => setVersionHistoryFile(null)}
      />
      </div>
    </FeatureThemeProvider>
  );
}
