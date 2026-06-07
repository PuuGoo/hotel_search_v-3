"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdOutlineGroupAdd } from "react-icons/md";
import { HiMagnifyingGlass } from "react-icons/hi2";

import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import useConversation from "../../hooks/useConversation";
import { pusherClient, pusherEvents, userChannel } from "../../libs/pusherClient";
import { FullConversationType } from "../../types";
import ConversationBox from "./ConversationBox";

interface ConversationListProps {
  initialItems: FullConversationType[];
}

const ConversationList: React.FC<ConversationListProps> = ({ initialItems }) => {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const router = useRouter();
  const session = useSession();

  const { conversationId, isOpen } = useConversation();

  const pusherKey = useMemo(() => {
    return session.data?.user?.email;
  }, [session.data?.user?.email]);

  const conversationIdRef = useRef(conversationId);
  const routerRef = useRef(router);
  useEffect(() => {
    conversationIdRef.current = conversationId;
    routerRef.current = router;
  }, [conversationId, router]);

  useEffect(() => {
    if (!pusherKey) {
      return;
    }

    pusherClient.subscribe(userChannel(pusherKey));

    const updateHandler = (conversation: FullConversationType) => {
      setItems((current) => {
        const idx = current.findIndex((c) => c.id === conversation.id);
        if (idx === -1) return current;
        const next = [...current];
        next[idx] = { ...next[idx], messages: conversation.messages };
        return next;
      });
    };

    const newHandler = (conversation: FullConversationType) => {
      setItems((current) => {
        // O(1) early return for existing conversations (native findIndex vs lodash/find)
        if (current.findIndex((c) => c.id === conversation.id) !== -1) {
          return current;
        }
        return [conversation, ...current];
      });
    };

    const removeHandler = (conversation: FullConversationType) => {
      setItems((current) => {
        // Only create new array if the conversation actually exists
        const idx = current.findIndex((c) => c.id === conversation.id);
        if (idx === -1) return current;
        const next = [...current];
        next.splice(idx, 1);
        return next;
      });

      if (conversationIdRef.current === conversation.id) {
        routerRef.current.push("/conversations");
      }
    };

    pusherClient.bind(pusherEvents.UPDATE_CONVERSATION, updateHandler);
    pusherClient.bind(pusherEvents.NEW_CONVERSATION, newHandler);
    pusherClient.bind(pusherEvents.DELETE_CONVERSATION, removeHandler);

    return () => {
      pusherClient.unsubscribe(userChannel(pusherKey));
      pusherClient.unbind(pusherEvents.UPDATE_CONVERSATION, updateHandler);
      pusherClient.unbind(pusherEvents.NEW_CONVERSATION, newHandler);
      pusherClient.unbind(pusherEvents.DELETE_CONVERSATION, removeHandler);
    };
  }, [pusherKey]);

  const handleOpenModal = useCallback(async () => {
    if (!usersLoaded) {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          setUsersLoaded(true);
        }
      } catch {}
    }
    setIsModalOpen(true);
  }, [usersLoaded]);

  // Lazy-load GroupChatModal to avoid bundling its heavy dependencies upfront
  const [GroupChatModal, setGroupChatModal] = useState<any>(null);
  const loadModal = useCallback(async () => {
    if (!GroupChatModal) {
      const mod = await import("../../components/modals/GroupChatModal");
      setGroupChatModal(() => mod.default);
    }
  }, [GroupChatModal]);

  const handleOpenModalWithLoad = useCallback(async () => {
    await loadModal();
    await handleOpenModal();
  }, [loadModal, handleOpenModal]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const userNames = (item.users || [])
        .map((u) => (u?.name || "").toLowerCase())
        .join(" ");
      const lastBody = (item.messages?.[item.messages.length - 1]?.body || "").toLowerCase();
      return name.includes(q) || userNames.includes(q) || lastBody.includes(q);
    });
  }, [items, search]);

  return (
    <>
      {GroupChatModal && (
        <GroupChatModal users={users} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
      <aside
        className={clsx(
          `
          fixed 
          inset-y-0 
          pb-20
          lg:pb-0
          lg:left-20 
          lg:w-80 
          lg:block
          overflow-y-auto 
          border-r 
          border-hairline 
          bg-panel
          dark:bg-dusk
          dark:border-lightgray
        `,
          isOpen ? "hidden" : "block w-full left-0"
        )}
      >
        <div className="px-4">
          <div className="flex justify-between items-center mb-3 pt-4">
            <div className="text-2xl font-bold text-ink dark:text-gray-200">Tin nhắn</div>
            <div
              onClick={handleOpenModalWithLoad}
              className="ms-icon-btn cursor-pointer"
              title="Tạo nhóm trò chuyện"
            >
              <MdOutlineGroupAdd size={20} />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <HiMagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm cuộc trò chuyện..."
              className="
                w-full rounded-lg bg-fill py-2.5 pl-9 pr-3 text-sm text-ink
                placeholder:text-ink-soft border-none focus:ring-2 focus:ring-brand/40
                dark:bg-lightgray dark:text-gray-100
              "
            />
          </div>

          <div className="space-y-1">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-6 select-none">
                Không có cuộc trò chuyện nào
              </p>
            ) : (
              filteredItems.map((item) => (
                <ConversationBox key={item.id} data={item} selected={conversationId === item.id} />
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default ConversationList;
