"use client";

import axios from "axios";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiLink, FiCopy, FiTrash2, FiCheck, FiClock, FiDownload } from "react-icons/fi";

interface DriveFileData {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  folder: string | null;
  createdAt: string;
}

interface ShareLinkData {
  id: string;
  token: string;
  driveFileId: string;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
  driveFile: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string | null;
  };
}

interface ShareModalProps {
  file: DriveFileData | null;
  isOpen: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 giờ", value: 1 },
  { label: "24 giờ", value: 24 },
  { label: "7 ngày", value: 168 },
  { label: "30 ngày", value: 720 },
  { label: "Không hết hạn", value: 0 },
];

const DOWNLOAD_OPTIONS = [
  { label: "Không giới hạn", value: 0 },
  { label: "1 lần", value: 1 },
  { label: "5 lần", value: 5 },
  { label: "10 lần", value: 10 },
  { label: "50 lần", value: 50 },
];

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isMaxedOut(maxDownloads: number | null, downloadCount: number): boolean {
  if (!maxDownloads) return false;
  return downloadCount >= maxDownloads;
}

const ShareModal: React.FC<ShareModalProps> = ({ file, isOpen, onClose }) => {
  const [links, setLinks] = useState<ShareLinkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiry, setExpiry] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/drive/share?driveFileId=${file.id}`);
      setLinks(res.data);
    } catch {
      toast.error("Không tải được danh sách liên kết");
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadLinks();
      setExpiry(24);
      setMaxDownloads(0);
    }
  }, [isOpen, file, loadLinks]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleCreate = useCallback(async () => {
    if (!file) return;
    setCreating(true);
    try {
      const res = await axios.post("/api/drive/share", {
        driveFileId: file.id,
        expiresInHours: expiry || undefined,
        maxDownloads: maxDownloads || undefined,
      });
      toast.success("Đã tạo liên kết chia sẻ");
      setLinks((prev) => [
        {
          id: res.data.token,
          token: res.data.token,
          driveFileId: file.id,
          expiresAt: res.data.expiresAt,
          maxDownloads: res.data.maxDownloads,
          downloadCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          driveFile: {
            id: file.id,
            fileName: file.fileName,
            originalName: file.originalName,
            mimeType: file.mimeType,
          },
        },
        ...prev,
      ]);
      setCopiedToken(res.data.token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Tạo liên kết thất bại");
    } finally {
      setCreating(false);
    }
  }, [file, expiry, maxDownloads]);

  const handleCopy = useCallback((token: string) => {
    const url = `${window.location.origin}/api/drive/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      toast.success("Đã sao chép liên kết");
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }, []);

  const handleRevoke = useCallback(
    async (token: string) => {
      if (!window.confirm("Thu hồi liên kết này?")) return;
      try {
        await axios.delete(`/api/drive/share/${token}`);
        toast.success("Đã thu hồi liên kết");
        setLinks((prev) => prev.filter((l) => l.token !== token));
      } catch {
        toast.error("Thu hồi liên kết thất bại");
      }
    },
    []
  );

  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-xl flex flex-col overflow-hidden shadow-2xl max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FiLink className="text-sky-400 shrink-0" size={20} />
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-lg">Chia sẻ file</h2>
              <p className="text-gray-400 text-sm truncate">{file.originalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-800 shrink-0">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Tạo liên kết mới</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Thời hạn</label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Số lần tải</label>
              <select
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {DOWNLOAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {creating ? "Đang tạo..." : "Tạo liên kết"}
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Liên kết hiện có ({links.length})
          </h3>
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-4">Đang tải...</p>
          ) : links.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Chưa có liên kết nào</p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const expired = isExpired(link.expiresAt);
                const maxedOut = isMaxedOut(link.maxDownloads, link.downloadCount);
                const inactive = !link.isActive || expired || maxedOut;

                return (
                  <div
                    key={link.id}
                    className={`rounded-lg border p-3 ${
                      inactive ? "bg-gray-800/50 border-gray-700/50" : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            inactive
                              ? "bg-gray-700 text-gray-400"
                              : "bg-emerald-900/50 text-emerald-400"
                          }`}
                        >
                          {inactive ? "Đã vô hiệu" : "Đang hoạt động"}
                        </span>
                        {link.expiresAt && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FiClock size={12} />
                            {expired ? "Hết hạn" : format(new Date(link.expiresAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRevoke(link.token)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded transition-colors"
                        title="Thu hồi"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 min-w-0 rounded bg-gray-900 px-3 py-1.5">
                        <p className="text-xs text-gray-300 truncate font-mono">{link.token}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(link.token)}
                        className={`p-1.5 rounded transition-colors shrink-0 ${
                          copiedToken === link.token
                            ? "text-emerald-400"
                            : "text-gray-400 hover:text-white"
                        }`}
                        title="Sao chép liên kết"
                      >
                        {copiedToken === link.token ? <FiCheck size={14} /> : <FiCopy size={14} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiDownload size={12} />
                        {link.downloadCount}
                        {link.maxDownloads ? `/${link.maxDownloads}` : ""} lượt tải
                      </span>
                      <span>
                        Tạo {format(new Date(link.createdAt), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
