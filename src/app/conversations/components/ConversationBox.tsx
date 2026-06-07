"use client";

import clsx from "clsx";
import { memo, useCallback, useMemo } from "react";

import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Avatar from "../../components/Avatar";
import AvatarGroup from "../../components/AvatarGroup";
import useOtherUser from "../../hooks/useOtherUser";
import { FullConversationType } from "../../types";

interface ConversationBoxProps {
  data: FullConversationType;
  selected?: boolean;
}

const ConversationBox: React.FC<ConversationBoxProps> = memo(({ data, selected }) => {
  const otherUser = useOtherUser(data);
  const session = useSession();
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(`/conversations/${data.id}`);
  }, [data, router]);

  // Prefetch the conversation page on hover so navigation feels instant.
  const handleMouseEnter = useCallback(() => {
    router.prefetch(`/conversations/${data.id}`);
  }, [data.id, router]);

  const lastMessage = useMemo(() => {
    const messages = data.messages || [];

    return messages[messages.length - 1];
  }, [data.messages]);

  const userEmail = useMemo(() => session.data?.user?.email, [session.data?.user?.email]);

  const hasSeen = useMemo(() => {
    if (!lastMessage) {
      return false;
    }

    const seenArray = lastMessage.seen || [];

    if (!userEmail) {
      return false;
    }

    return seenArray.filter((user) => user.email === userEmail).length !== 0;
  }, [userEmail, lastMessage]);

  const lastMessageText = useMemo(() => {
    if (lastMessage?.image) {
      return "Đã gửi một hình ảnh";
    }

    if (lastMessage?.body) {
      return lastMessage?.body;
    }

    return "Đã bắt đầu cuộc trò chuyện";
  }, [lastMessage]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={clsx(
        `
        w-full 
        relative 
        flex 
        items-center 
        space-x-3 
        px-3
        py-2.5
        rounded-2xl
        transition-all
        duration-150
        cursor-pointer
        hover:bg-fill
        dark:hover:bg-lightgray
        `,
        selected ? "ms-row-active" : ""
      )}
    >
      {data.isGroup ? <AvatarGroup users={data.users} /> : <Avatar user={otherUser} />}

      <div className="min-w-0 flex-1">
        <div className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          <div className="flex justify-between items-center mb-0.5">
            <p
              className={clsx(
                "text-[15px] font-semibold truncate",
                selected ? "text-white" : "text-ink dark:text-gray-200"
              )}
            >
              {data.name || otherUser?.name || "Người dùng đã xóa"}
            </p>
            {lastMessage?.createdAt && (
              <p
                className={clsx(
                  "text-[11px] font-light shrink-0 ml-2",
                  selected ? "text-white/80" : "text-ink-soft"
                )}
              >
                {format(new Date(lastMessage.createdAt), "p")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p
              className={clsx(
                "truncate text-[13px] flex-1",
                selected
                  ? "text-white/90"
                  : hasSeen
                  ? "text-ink-soft dark:text-gray-400"
                  : "text-ink font-semibold dark:text-gray-100"
              )}
            >
              {lastMessageText}
            </p>
            {!hasSeen && !selected && (
              <span className="h-2.5 w-2.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ConversationBox.displayName = "ConversationBox";

export default ConversationBox;
