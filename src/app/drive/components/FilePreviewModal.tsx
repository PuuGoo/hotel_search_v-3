"use client";

import { useEffect, useState } from "react";
import { FiX, FiDownload, FiExternalLink, FiZoomIn, FiZoomOut } from "react-icons/fi";

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

interface FilePreviewModalProps {
  file: DriveFileData | null;
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

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

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

  useEffect(() => {
    setZoom(1);
    setTextContent(null);
    if (!file || !isOpen) return;
    const mime = file.mimeType || "";
    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      file.originalName.endsWith(".json") ||
      file.originalName.endsWith(".csv") ||
      file.originalName.endsWith(".txt") ||
      file.originalName.endsWith(".md")
    ) {
      setLoadingText(true);
      fetch(`/api/drive/file/${file.fileName}`)
        .then((r) => r.text())
        .then((t) => setTextContent(t))
        .catch(() => setTextContent("Không thể tải nội dung"))
        .finally(() => setLoadingText(false));
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const mime = file.mimeType || "";
  const fileUrl = `/api/drive/file/${file.fileName}`;
  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf");
  const isText =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    file.originalName.endsWith(".json") ||
    file.originalName.endsWith(".csv") ||
    file.originalName.endsWith(".txt") ||
    file.originalName.endsWith(".md");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] mx-4 bg-gray-900 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium truncate">{file.originalName}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              <span>{formatFileSize(file.fileSize)}</span>
              {file.mimeType && <span>{file.mimeType}</span>}
              {file.folder && <span className="rounded bg-gray-700 px-1.5 py-0.5">{file.folder}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                  title="Thu nhỏ"
                >
                  <FiZoomOut size={16} />
                </button>
                <span className="text-xs text-gray-400 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                  title="Phóng to"
                >
                  <FiZoomIn size={16} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Đóng"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">
          {isImage && (
            <div
              className="relative transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={file.originalName}
                className="max-h-[70vh] max-w-full object-contain rounded"
                draggable={false}
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[60vh] rounded border border-gray-700"
              title={file.originalName}
            />
          )}

          {isText && (
            <div className="w-full h-full overflow-auto">
              {loadingText ? (
                <p className="text-gray-400 text-center py-8">Đang tải nội dung...</p>
              ) : (
                <pre className="bg-gray-950 rounded-lg p-4 text-sm text-gray-200 font-mono whitespace-pre-wrap break-words overflow-auto max-h-[70vh] leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {isVideo && (
            <video
              src={fileUrl}
              controls
              className="max-h-[70vh] max-w-full rounded"
              preload="metadata"
            >
              Trình duyệt không hỗ trợ phát video.
            </video>
          )}

          {isAudio && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                <FiAudioIcon />
              </div>
              <audio src={fileUrl} controls className="w-full max-w-md" preload="metadata" />
            </div>
          )}

          {!isImage && !isPdf && !isText && !isVideo && !isAudio && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                <FiFileIcon mimeType={mime} />
              </div>
              <p className="text-white font-medium">{file.originalName}</p>
              <p className="text-gray-400 text-sm">{formatFileSize(file.fileSize)}</p>
              <p className="text-gray-500 text-sm">Không có bản xem trước cho loại file này</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-800 shrink-0">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm"
          >
            <FiExternalLink size={14} />
            Mở trong tab mới
          </a>
          <a
            href={fileUrl}
            download={file.originalName}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors text-sm"
          >
            <FiDownload size={14} />
            Tải xuống
          </a>
        </div>
      </div>
    </div>
  );
};

function FiAudioIcon() {
  return (
    <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  );
}

function FiFileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf"))
    return (
      <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    );
  return (
    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export default FilePreviewModal;
