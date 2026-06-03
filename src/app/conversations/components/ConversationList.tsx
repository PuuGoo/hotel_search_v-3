"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdOutlineGroupAdd } from "react-icons/md";

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
          border-gray-200 
          dark:border-lightgray
        `,
          isOpen ? "hidden" : "block w-full left-0"
        )}
      >
        <div className="px-5">
          <div className="flex justify-between mb-4 pt-4">
            <div className="text-2xl font-bold text-neutral-800 dark:text-gray-200">Tin nhắn</div>
            <div
              onClick={handleOpenModalWithLoad}
              className="
                rounded-full 
                p-2 
                bg-gray-100 
                text-gray-600 
                cursor-pointer 
                hover:opacity-75 
                transition
                dark:bg-lightgray
                dark:text-gray-200
              "
            >
              <MdOutlineGroupAdd size={20} />
            </div>
          </div>
          {items.map((item) => (
            <ConversationBox key={item.id} data={item} selected={conversationId === item.id} />
          ))}
        </div>
      </aside>
    </>
  );
};

export default ConversationList;
