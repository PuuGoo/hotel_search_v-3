"use client";

import axios from "axios";
import { Suspense, lazy, useEffect, useRef, useState, useCallback } from "react";

import useConversation from "@/app/hooks/useConversation";

import { pusherClient, pusherEvents, conversationChannel } from "../../../libs/pusherClient";
import { FullMessageType } from "../../../types";
import MessageBox from "./MessageBox";

const MessageSearch = lazy(() => import("./MessageSearch"));

interface BodyProps {
  initialMessages: FullMessageType[];
  onReply?: (message: FullMessageType) => void;
}

const Body: React.FC<BodyProps> = ({ initialMessages = [], onReply }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  // Track seen message IDs in a Set for O(1) dedup instead of lodash/find O(n).
  const messageIdsRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));
  const containerRef = useRef<HTMLDivElement>(null);
  // Track if user has scrolled up so we don't auto-scroll away from them.
  const userScrolledUpRef = useRef(false);

  const { conversationId } = useConversation();

  useEffect(() => {
    const handler = () => setShowSearch((prev) => !prev);
    document.addEventListener("toggle-message-search", handler);
    return () => document.removeEventListener("toggle-message-search", handler);
  }, []);

  const scrollToMessage = useCallback((id: string) => {
    setHighlightedMessageId(id);
    setTimeout(() => setHighlightedMessageId(null), 2100);
  }, []);

  // Mark messages as seen when the conversation opens (only on mount / id change).
  useEffect(() => {
    axios.post(`/api/conversations/${conversationId}/seen`).catch(() => {});
  }, [conversationId]);

  // Auto-scroll to bottom on new messages, but only if the user is already
  // near the bottom. If they've scrolled up to read history, stay put.
  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom("auto");
    }
    // Reset the dedup set when initialMessages change (new conversation load).
    messageIdsRef.current = new Set(initialMessages.map((m) => m.id));
  }, [initialMessages, scrollToBottom]);

  // Track user scroll position: if they scroll up, don't auto-follow.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Within 80px of the bottom = "at bottom".
      userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // On new messages from Pusher, scroll down only if user is near bottom.
  useEffect(() => {
    if (!userScrolledUpRef.current && messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    pusherClient.subscribe(conversationChannel(conversationId));
    bottomRef?.current?.scrollIntoView();

    const messageHandler = (message: FullMessageType) => {
      axios.post(`/api/conversations/${conversationId}/seen`).catch(() => {});

      setMessages((current) => {
        // O(1) dedup check via Set instead of O(n) lodash/find.
        if (messageIdsRef.current.has(message.id)) {
          return current;
        }
        messageIdsRef.current.add(message.id);
        return [...current, message];
      });
    };

    const updateMessageHandler = (newMessage: FullMessageType) => {
      setMessages((current) => {
        const idx = current.findIndex((m) => m.id === newMessage.id);
        if (idx === -1) return current;
        const next = [...current];
        next[idx] = newMessage;
        return next;
      });
    };

    const reactionHandler = (updatedMessage: FullMessageType) => {
      setMessages((current) => {
        const idx = current.findIndex((m) => m.id === updatedMessage.id);
        if (idx === -1) return current;
        const next = [...current];
        next[idx] = { ...next[idx], reactions: updatedMessage.reactions };
        return next;
      });
    };

    pusherClient.bind(pusherEvents.NEW_MESSAGE, messageHandler);
    pusherClient.bind(pusherEvents.UPDATE_MESSAGE, updateMessageHandler);
    pusherClient.bind(pusherEvents.REACTION_UPDATE, reactionHandler);

    return () => {
      pusherClient.unsubscribe(conversationChannel(conversationId));
      pusherClient.unbind(pusherEvents.NEW_MESSAGE, messageHandler);
      pusherClient.unbind(pusherEvents.UPDATE_MESSAGE, updateMessageHandler);
      pusherClient.unbind(pusherEvents.REACTION_UPDATE, reactionHandler);
    };
  }, [conversationId, scrollToBottom]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {showSearch && (
        <Suspense fallback={null}>
          <MessageSearch
            messages={messages}
            onSelectMessage={scrollToMessage}
          />
        </Suspense>
      )}
      {messages.map((message, i) => (
        <MessageBox
          isLast={i === messages.length - 1}
          key={message.id}
          data={message}
          onReply={onReply}
          isHighlighted={highlightedMessageId === message.id}
        />
      ))}
      <div className="pt-1" ref={bottomRef} />
    </div>
  );
};

export default Body;
