"use client";

import clsx from "clsx";
import { lazy, Suspense, useMemo, useState } from "react";
import { HiChevronLeft } from "react-icons/hi";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import { FiSearch } from "react-icons/fi";

import useOtherUser from "@/app/hooks/useOtherUser";
import { Conversation } from "@prisma/client";
import { PublicUser } from "@/app/types";
import Link from "next/link";

import Avatar from "../../../components/Avatar";
import AvatarGroup from "../../../components/AvatarGroup";
import useActiveList from "../../../hooks/useActiveList";

const ChatDrawer = lazy(() => import("./ChatDrawer"));

interface HeaderProps {
  conversation: Conversation & {
    users: PublicUser[];
  };
}

const Header: React.FC<HeaderProps> = ({ conversation }) => {
  const otherUser = useOtherUser(conversation);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const memberSet = useActiveList((s) => s.memberSet);
  const isActive = otherUser?.email ? memberSet.has(otherUser.email) : false;
  const statusText = useMemo(() => {
    if (conversation.isGroup) {
      return `${conversation.users.length} thành viên`;
    }

    return isActive ? "Đang hoạt động" : "Ngoại tuyến";
  }, [conversation.isGroup, conversation.users.length, isActive]);

  return (
    <>
      <Suspense fallback={null}>
        <ChatDrawer data={conversation} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </Suspense>
      <div
        className="
        bg-panel 
        w-full 
        flex 
        border-b-[1px] 
        border-hairline
        sm:px-4 
        py-3 
        px-4 
        lg:px-6 
        justify-between 
        items-center 
        dark:bg-dusk
        dark:border-lightgray
      "
      >
        <div className="flex gap-3 items-center">
          <Link
            href="/conversations"
            className="
            lg:hidden 
            block 
            text-brand 
            hover:text-brand-dark 
            transition 
            cursor-pointer
          "
          >
            <HiChevronLeft size={32} />
          </Link>
          {conversation.isGroup ? (
            <AvatarGroup users={conversation.users} />
          ) : (
            <Avatar user={otherUser} />
          )}

          <div className="flex flex-col dark:text-gray-200">
            <div className="font-semibold text-ink dark:text-gray-100">
              {conversation.name || otherUser?.name || "Người dùng đã xóa"}
            </div>
            <div
              className={clsx(
                "text-[13px] font-light",
                isActive && !conversation.isGroup
                  ? "text-online"
                  : "text-ink-soft dark:text-gray-400"
              )}
            >
              {statusText}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("toggle-message-search"))}
            className="ms-icon-btn ms-icon-btn-brand"
            title="Tìm kiếm tin nhắn"
          >
            <FiSearch size={18} />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="ms-icon-btn"
            title="Tùy chọn"
          >
            <HiEllipsisHorizontal size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
