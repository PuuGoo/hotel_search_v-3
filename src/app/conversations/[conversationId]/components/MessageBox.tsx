"use client";

import axios from "axios";
import clsx from "clsx";
import { useState, useRef, useCallback, lazy, Suspense } from "react";

import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiDocument,
  HiFaceSmile,
  HiFilm,
  HiMusicalNote,
  HiPaperClip,
} from "react-icons/hi2";

import Avatar from "../../../components/Avatar";
import { FullMessageType } from "../../../types";

const ImageModal = lazy(() => import("./ImageModal"));
const MessageReactions = lazy(() => import("./MessageReactions"));
const ReactionPicker = lazy(() => import("./ReactionPicker"));
const VoiceMessage = lazy(() => import("./VoiceMessage"));

interface MessageBoxProps {
  data: FullMessageType;
  isLast?: boolean;
  onReply?: (message: FullMessageType) => void;
  isHighlighted?: boolean;
}

const getFileIcon = (fileType?: string | null) => {
  if (!fileType) return HiDocument;
  if (fileType.startsWith("image/")) return HiDocument;
  if (fileType.startsWith("video/")) return HiFilm;
  if (fileType.startsWith("audio/")) return HiMusicalNote;
  return HiDocument;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const MessageBox: React.FC<MessageBoxProps> = ({ data, isLast, onReply, isHighlighted }) => {
  const session = useSession();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTouchActions, setShowTouchActions] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>(
    (data.reactions as Record<string, string[]>) || {}
  );

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const isOwn = session.data?.user?.email === data?.sender?.email;
  const seenList = (data.seen || [])
    .filter((user) => user.email !== data?.sender?.email)
    .map((user) => user.name)
    .join(", ");

  const container = clsx("flex gap-3 p-4", isOwn && "justify-end");
  const avatar = clsx(isOwn && "order-2");
  const body = clsx("flex flex-col gap-2 group", isOwn && "items-end");
  const message = clsx(
    "text-sm w-fit overflow-hidden",
    isOwn ? "bg-sky-500 text-white" : "bg-gray-100  dark:bg-lightgray",
    data.image ? "rounded-md p-0" : "rounded-full py-2 px-3"
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setShowTouchActions(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchOutside = useCallback(() => {
    setShowTouchActions(false);
  }, []);

  const handleSaveToDrive = async () => {
    if (!data.fileUrl || !data.fileName) return;
    setSaving(true);
    try {
      await axios.post("/api/drive", {
        fileName: data.fileUrl.split("/").pop(),
        originalName: data.fileName,
        filePath: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.fileType,
        folder: "chat",
      });
      window.open(data.fileUrl, "_blank");
    } catch {
      window.open(data.fileUrl, "_blank");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!data.fileUrl) return;
    const link = document.createElement("a");
    link.href = data.fileUrl + "?download=true";
    link.download = data.fileName || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReactionToggle = async (emoji: string) => {
    try {
      const res = await axios.post("/api/messages/reactions", {
        messageId: data.id,
        emoji,
      });
      if (res.data?.reactions) {
        setReactions(res.data.reactions);
      }
    } catch {
      // ignore
    }
  };

  const FileIcon = data.fileType ? getFileIcon(data.fileType) : HiPaperClip;

  return (
    <div
      data-message-id={data.id}
      className={clsx(container, isHighlighted && "message-highlight")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showTouchActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleTouchOutside}
          onTouchEnd={handleTouchOutside}
        />
      )}
      {!isOwn && (
        <div className={avatar}>
          <Avatar user={data.sender} />
        </div>
      )}
      <div className={body}>
        <div
          className={clsx(
            "flex items-center gap-1",
            showTouchActions && "!opacity-100"
          )}
        >
          {!isOwn && <div className="text-sm text-gray-500">{data.sender.name}</div>}
          <div className="text-xs text-gray-400">{format(new Date(data.createdAt), "p")}</div>
          {onReply && (
            <button
              onClick={() => onReply(data)}
              className={clsx(
                "text-gray-400 hover:text-sky-500 transition-colors touch-target",
                showTouchActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              title="Trả lời"
            >
              <HiArrowUturnLeft size={16} />
            </button>
          )}
            <div className={clsx("relative", showTouchActions ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="text-gray-400 hover:text-sky-500 transition-colors touch-target"
              title="Phản ứng"
            >
              <HiFaceSmile size={16} />
            </button>
            <Suspense fallback={null}>
              <ReactionPicker
                isOpen={showReactionPicker}
                onSelect={(emoji) => {
                  handleReactionToggle(emoji);
                  setShowReactionPicker(false);
                  setShowTouchActions(false);
                }}
                onClose={() => {
                  setShowReactionPicker(false);
                  setShowTouchActions(false);
                }}
              />
            </Suspense>
          </div>
        </div>

        {data.replyTo && (
          <div
            className={clsx(
              "text-xs rounded-lg px-3 py-1.5 mb-1 max-w-xs border-l-2",
              isOwn
                ? "bg-sky-500/15 border-sky-300 text-sky-100"
                : "bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="font-semibold text-[11px] mb-0.5">
              {data.replyTo.sender.name}
            </div>
            <div className="truncate">
              {data.replyTo.body
                ? data.replyTo.body.length > 50
                  ? data.replyTo.body.slice(0, 50) + "..."
                  : data.replyTo.body
                : data.replyTo.image
                ? "Hình ảnh"
                : data.replyTo.fileName || "File đính kèm"}
            </div>
          </div>
        )}

        {data.fileUrl ? (
          data.fileType?.startsWith("audio/") ? (
            <div
              className={clsx(
                "rounded-lg overflow-hidden border p-3",
                isOwn
                  ? "bg-sky-500/20 border-sky-400/30"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              )}
            >
              <Suspense fallback={null}>
                <VoiceMessage
                  audioUrl={data.fileUrl}
                  duration={data.fileSize ? Math.round(data.fileSize / 16000) : undefined}
                  isOwn={isOwn}
                />
              </Suspense>
            </div>
          ) : (
            <div
              className={clsx(
                "rounded-lg overflow-hidden border",
                isOwn
                  ? "bg-sky-500/20 border-sky-400/30"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              )}
            >
              {data.fileType?.startsWith("image/") ? (
                <div className="relative">
                  <Suspense fallback={null}>
                    <ImageModal
                      src={data.fileUrl}
                      isOpen={imageModalOpen}
                      onClose={() => setImageModalOpen(false)}
                    />
                  </Suspense>
                  <Image
                    alt={data.fileName || "Hình ảnh"}
                    height="288"
                    width="288"
                    onClick={() => setImageModalOpen(true)}
                    src={data.fileUrl}
                    className="object-cover cursor-pointer hover:scale-105 transition max-h-64"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={clsx(
                      "p-2 rounded-lg",
                      isOwn ? "bg-sky-500/30" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <FileIcon size={24} className={isOwn ? "text-sky-200" : "text-sky-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={clsx(
                        "text-sm font-medium truncate",
                        isOwn ? "text-white" : "text-black dark:text-white"
                      )}
                    >
                      {data.fileName}
                    </div>
                    <div
                      className={clsx(
                        "text-xs",
                        isOwn ? "text-sky-200" : "text-gray-400"
                      )}
                    >
                      {formatFileSize(data.fileSize)}
                    </div>
                  </div>
                </div>
              )}

              <div
                className={clsx(
                  "flex border-t",
                  isOwn
                    ? "border-sky-400/30 bg-sky-500/10"
                    : "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50"
                )}
              >
                <button
                  onClick={handleDownload}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    isOwn
                      ? "text-sky-200 hover:text-white hover:bg-sky-500/20"
                      : "text-gray-500 hover:text-sky-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <HiArrowDownTray size={14} />
                  Tải về
                </button>
                <div
                  className={clsx(
                    "w-px",
                    isOwn ? "bg-sky-400/30" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
                <button
                  onClick={handleSaveToDrive}
                  disabled={saving}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    isOwn
                      ? "text-sky-200 hover:text-white hover:bg-sky-500/20"
                      : "text-gray-500 hover:text-sky-500 hover:bg-gray-200 dark:hover:bg-gray-700",
                    saving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <HiArrowDownTray size={14} />
                  {saving ? "Đang lưu..." : "Lưu vào Drive"}
                </button>
              </div>
            </div>
          )
        ) : data.image ? (
          <div className={message}>
            <Suspense fallback={null}>
              <ImageModal
                src={data.image}
                isOpen={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
              />
            </Suspense>
            <Image
              alt="Hình ảnh"
              height="288"
              width="288"
              onClick={() => setImageModalOpen(true)}
              src={data.image}
              className="
                object-cover 
                cursor-pointer 
                hover:scale-110 
                transition
              "
            />
          </div>
        ) : (
          <div className={message}>
            <div>{data.body}</div>
          </div>
        )}

        {Object.keys(reactions).length > 0 && (
          <Suspense fallback={null}>
            <MessageReactions
              reactions={reactions}
              currentUserId={session.data?.user?.id || ""}
              onToggle={handleReactionToggle}
              isOwn={isOwn}
            />
          </Suspense>
        )}

        {isLast && isOwn && seenList.length > 0 && (
          <div
            className="
            text-xs 
            font-light 
            text-gray-500
            "
          >
            {`Đã xem bởi ${seenList}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
