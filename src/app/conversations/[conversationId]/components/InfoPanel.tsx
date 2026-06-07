"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  HiBell,
  HiBellSlash,
  HiOutlinePhoto,
  HiMagnifyingGlass,
  HiChevronDown,
  HiOutlineDocument,
  HiArrowDownTray,
} from "react-icons/hi2";

import { Conversation } from "@prisma/client";
import { PublicUser } from "@/app/types";
import { FullMessageType } from "../../../types";
import useOtherUser from "../../../hooks/useOtherUser";
import useActiveList from "../../../hooks/useActiveList";
import Lightbox from "@/app/components/Lightbox";

interface InfoPanelProps {
  conversation: Conversation & { users: PublicUser[] };
  messages: FullMessageType[];
}

// Stable gradient palette for the hero avatar fallback (matches the mockup).
const GRADIENTS = [
  "from-accent to-[#7c5fe0]",
  "from-brand to-brand-dark",
  "from-[#ff7eb3] to-[#ff5a87]",
  "from-online to-[#1aa64b]",
  "from-warn to-[#ff5e3a]",
];

function pickGradient(seed?: string) {
  if (!seed) return GRADIENTS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ conversation, messages }) => {
  const otherUser = useOtherUser(conversation);
  const [muted, setMuted] = useState(false);
  const [openMedia, setOpenMedia] = useState(true);
  const [openInfo, setOpenInfo] = useState(true);
  const [openFiles, setOpenFiles] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const memberSet = useActiveList((s) => s.memberSet);
  const isActive = otherUser?.email ? memberSet.has(otherUser.email) : false;

  const title = conversation.name || otherUser?.name || "Người dùng đã xóa";
  const initial = title.charAt(0).toUpperCase();
  const gradient = pickGradient(conversation.id || otherUser?.email || title);

  const statusText = conversation.isGroup
    ? `${conversation.users.length} thành viên`
    : isActive
    ? "Đang hoạt động"
    : "Ngoại tuyến";

  // Collect images shared in this conversation (newest first).
  const sharedImages = useMemo(() => {
    const imgs: string[] = [];
    for (const m of messages) {
      if (m.image) imgs.push(m.image);
      else if (m.fileUrl && m.fileType?.startsWith("image/")) imgs.push(m.fileUrl);
    }
    return imgs.reverse();
  }, [messages]);

  // Collect non-image files shared in this conversation (newest first).
  const sharedFiles = useMemo(() => {
    const files: { url: string; name: string; size?: number | null; type?: string | null }[] = [];
    for (const m of messages) {
      if (m.fileUrl && !m.fileType?.startsWith("image/")) {
        files.push({
          url: m.fileUrl,
          name: m.fileName || "Tệp đính kèm",
          size: m.fileSize,
          type: m.fileType,
        });
      }
    }
    return files.reverse();
  }, [messages]);

  const joinedDate = useMemo(() => {
    if (!otherUser?.createdAt) return null;
    return format(new Date(otherUser.createdAt), "PP");
  }, [otherUser?.createdAt]);

  const previewImages = sharedImages.slice(0, 6);
  const extraCount = Math.max(0, sharedImages.length - 6);

  const triggerSearch = () =>
    document.dispatchEvent(new CustomEvent("toggle-message-search"));

  return (
    <aside
      className="
        hidden lg:flex lg:flex-col
        w-80 shrink-0
        border-l border-hairline bg-panel
        dark:bg-dusk dark:border-lightgray
        overflow-y-auto
      "
    >
      <div className="p-6 flex flex-col">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-1.5 pb-5 border-b border-hairline dark:border-lightgray">
          {otherUser?.image && !conversation.isGroup ? (
            <div className="relative h-20 w-20 rounded-3xl overflow-hidden shadow-card">
              <Image
                src={otherUser.image}
                alt={title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className={`ms-avatar h-20 w-20 rounded-3xl text-3xl bg-gradient-to-br ${gradient} shadow-card`}
            >
              {initial}
            </div>
          )}
          <h2 className="text-lg font-extrabold tracking-tight text-ink dark:text-gray-100 mt-1.5">
            {title}
          </h2>
          {!conversation.isGroup && otherUser?.email && (
            <div className="text-[12.5px] text-ink-soft dark:text-gray-400">
              {otherUser.email}
            </div>
          )}
          <span
            className={`text-[11.5px] font-bold px-3 py-1 rounded-full mt-1.5 ${
              isActive
                ? "text-online bg-online/10"
                : "text-ink-soft bg-fill dark:bg-lightgray dark:text-gray-300"
            }`}
          >
            ● {statusText}
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex justify-center gap-6 py-4 border-b border-hairline dark:border-lightgray">
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex flex-col items-center gap-1.5 text-ink-soft hover:text-brand transition-colors group"
          >
            <span className="w-10 h-10 rounded-xl bg-fill dark:bg-lightgray grid place-items-center group-hover:bg-brand-soft transition-colors">
              {muted ? <HiBellSlash size={19} /> : <HiBell size={19} />}
            </span>
            <small className="text-[11px] font-semibold">
              {muted ? "Bật tiếng" : "Tắt tiếng"}
            </small>
          </button>
          <button
            onClick={triggerSearch}
            className="flex flex-col items-center gap-1.5 text-ink-soft hover:text-brand transition-colors group"
          >
            <span className="w-10 h-10 rounded-xl bg-fill dark:bg-lightgray grid place-items-center group-hover:bg-brand-soft transition-colors">
              <HiMagnifyingGlass size={19} />
            </span>
            <small className="text-[11px] font-semibold">Tìm</small>
          </button>
          <button
            onClick={() => sharedImages.length > 0 && setLightboxIndex(0)}
            disabled={sharedImages.length === 0}
            className="flex flex-col items-center gap-1.5 text-ink-soft hover:text-brand transition-colors group disabled:opacity-40 disabled:hover:text-ink-soft"
          >
            <span className="w-10 h-10 rounded-xl bg-fill dark:bg-lightgray grid place-items-center group-hover:bg-brand-soft transition-colors">
              <HiOutlinePhoto size={19} />
            </span>
            <small className="text-[11px] font-semibold">Ảnh</small>
          </button>
        </div>

        {/* Media gallery */}
        <div className="py-4 border-b border-hairline dark:border-lightgray">
          <button
            onClick={() => setOpenMedia((o) => !o)}
            className="w-full flex justify-between items-center text-sm font-extrabold text-ink dark:text-gray-100 tracking-tight"
          >
            Ảnh &amp; phương tiện
            <HiChevronDown
              size={16}
              className={`text-ink-soft transition-transform ${openMedia ? "" : "-rotate-90"}`}
            />
          </button>
          {openMedia &&
            (previewImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {previewImages.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="relative aspect-square rounded-xl overflow-hidden shadow-bubble cursor-pointer hover:scale-[1.05] transition-transform"
                  >
                    <Image
                      src={src}
                      alt={`media-${i}`}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    {i === 5 && extraCount > 0 && (
                      <div className="absolute inset-0 grid place-items-center bg-black/45 text-white font-extrabold text-base backdrop-blur-[1px]">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-soft dark:text-gray-400 mt-3">
                Chưa có ảnh nào được chia sẻ.
              </p>
            ))}
        </div>

        {/* Shared files */}
        <div className="py-4 border-b border-hairline dark:border-lightgray">
          <button
            onClick={() => setOpenFiles((o) => !o)}
            className="w-full flex justify-between items-center text-sm font-extrabold text-ink dark:text-gray-100 tracking-tight"
          >
            Tệp đã chia sẻ
            <HiChevronDown
              size={16}
              className={`text-ink-soft transition-transform ${openFiles ? "" : "-rotate-90"}`}
            />
          </button>
          {openFiles &&
            (sharedFiles.length > 0 ? (
              <div className="flex flex-col gap-2 mt-3">
                {sharedFiles.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={f.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-fill dark:bg-lightgray hover:bg-brand-soft transition-colors group"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-brand-soft text-brand grid place-items-center group-hover:bg-white dark:group-hover:bg-dusk transition-colors">
                      <HiOutlineDocument size={18} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-semibold text-ink dark:text-gray-100 truncate">
                        {f.name}
                      </span>
                      {formatBytes(f.size) && (
                        <span className="block text-[11px] text-ink-soft dark:text-gray-400">
                          {formatBytes(f.size)}
                        </span>
                      )}
                    </span>
                    <HiArrowDownTray
                      size={16}
                      className="shrink-0 text-ink-soft group-hover:text-brand transition-colors"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-soft dark:text-gray-400 mt-3">
                Chưa có tệp nào được chia sẻ.
              </p>
            ))}
        </div>

        {/* Info */}
        <div className="py-4">
          <button
            onClick={() => setOpenInfo((o) => !o)}
            className="w-full flex justify-between items-center text-sm font-extrabold text-ink dark:text-gray-100 tracking-tight"
          >
            Thông tin
            <HiChevronDown
              size={16}
              className={`text-ink-soft transition-transform ${openInfo ? "" : "-rotate-90"}`}
            />
          </button>
          {openInfo && (
            <div className="mt-2">
              {conversation.isGroup ? (
                <div className="flex justify-between text-[13px] py-1.5">
                  <span className="text-ink-soft dark:text-gray-400">Thành viên</span>
                  <span className="font-bold text-ink dark:text-gray-100">
                    {conversation.users.length}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-[13px] py-1.5">
                  <span className="text-ink-soft dark:text-gray-400">Email</span>
                  <span className="font-bold text-ink dark:text-gray-100 truncate ml-3 max-w-[170px]">
                    {otherUser?.email ?? "Không có"}
                  </span>
                </div>
              )}
              {joinedDate && !conversation.isGroup && (
                <div className="flex justify-between text-[13px] py-1.5">
                  <span className="text-ink-soft dark:text-gray-400">Đã tham gia</span>
                  <span className="font-bold text-ink dark:text-gray-100">{joinedDate}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] py-1.5">
                <span className="text-ink-soft dark:text-gray-400">Số tin nhắn</span>
                <span className="font-bold text-ink dark:text-gray-100">{messages.length}</span>
              </div>
              <div className="flex justify-between text-[13px] py-1.5">
                <span className="text-ink-soft dark:text-gray-400">Ảnh đã chia sẻ</span>
                <span className="font-bold text-brand">{sharedImages.length}</span>
              </div>
              <div className="flex justify-between text-[13px] py-1.5">
                <span className="text-ink-soft dark:text-gray-400">Tệp đã chia sẻ</span>
                <span className="font-bold text-brand">{sharedFiles.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          images={sharedImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </aside>
  );
};

export default InfoPanel;
