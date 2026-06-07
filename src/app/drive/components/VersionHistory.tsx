"use client";

import axios from "axios";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiDownload, FiClock } from "react-icons/fi";

interface VersionInfo {
  id: string;
  version: number;
  filePath: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string | null; image: string | null };
}

interface VersionHistoryProps {
  fileId: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function VersionHistory({ fileId, currentVersion, isOpen, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/drive/versions/${fileId}`);
      setVersions(res.data);
    } catch {
      toast.error("Không tải được lịch sử phiên bản");
    } finally {
      setLoading(false);
    }
  }, [fileId, isOpen]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleDownload = useCallback((filePath: string, fileName: string) => {
    window.open(`/api/drive/file/${fileName}`, "_blank", "noopener,noreferrer");
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-panel rounded-xl w-full max-w-lg mx-4 shadow-2xl border border-hairline max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <FiClock className="text-sky-400" size={18} />
            <h2 className="text-ink font-semibold text-lg">Lịch sử phiên bản</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-soft hover:text-ink rounded-lg hover:bg-fill transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <p className="text-ink-soft text-center py-8">Đang tải...</p>
          ) : versions.length === 0 ? (
            <p className="text-ink-soft text-center py-8">Chưa có phiên bản nào</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => {
                const isCurrent = v.version === currentVersion;
                return (
                  <div
                    key={v.id}
                    className={`rounded-lg p-3 flex items-center gap-3 transition-colors ${
                      isCurrent
                        ? "bg-sky-900/30 border border-sky-700/50"
                        : "bg-fill/50 border border-transparent hover:border-gray-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-ink text-sm font-medium">Phiên bản {v.version}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-sky-600 text-ink px-1.5 py-0.5 rounded font-medium">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <p className="text-ink-soft text-xs mt-1">
                        {format(new Date(v.createdAt), "dd/MM/yyyy HH:mm")} &middot; {formatFileSize(v.fileSize)}
                      </p>
                      <p className="text-ink-soft text-xs mt-0.5">
                        {v.uploadedBy.name || v.uploadedBy.email || "Ẩn danh"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(v.filePath, `${fileId}_v${v.version}`)}
                      className="p-2 text-ink-soft hover:text-sky-400 rounded-lg hover:bg-hairline transition-colors shrink-0"
                      title="Tải phiên bản này"
                    >
                      <FiDownload size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
