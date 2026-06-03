"use client";

import axios from "axios";
import { Suspense, lazy, useEffect, useRef, useState, useCallback } from "react";

import useConversation from "@/app/hooks/useConversation";
import find from "lodash/find";

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

  useEffect(() => {
    axios.post(`/api/conversations/${conversationId}/seen`).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    pusherClient.subscribe(conversationChannel(conversationId));
    bottomRef?.current?.scrollIntoView();

    const messageHandler = (message: FullMessageType) => {
      axios.post(`/api/conversations/${conversationId}/seen`).catch(() => {});

      setMessages((current) => {
        if (find(current, { id: message.id })) {
          return current;
        }

        return [...current, message];
      });
    };

    const updateMessageHandler = (newMessage: FullMessageType) => {
      setMessages((current) =>
        current.map((currentMessage) => {
          if (currentMessage.id === newMessage.id) {
            return newMessage;
          }

          return currentMessage;
        })
      );
    };

    pusherClient.bind(pusherEvents.NEW_MESSAGE, messageHandler);
    pusherClient.bind(pusherEvents.UPDATE_MESSAGE, updateMessageHandler);

    const reactionHandler = (updatedMessage: FullMessageType) => {
      setMessages((current) =>
        current.map((currentMessage) => {
          if (currentMessage.id === updatedMessage.id) {
            return { ...currentMessage, reactions: updatedMessage.reactions };
          }
          return currentMessage;
        })
      );
    };

    pusherClient.bind(pusherEvents.REACTION_UPDATE, reactionHandler);

    return () => {
      pusherClient.unsubscribe(conversationChannel(conversationId));
      pusherClient.unbind(pusherEvents.NEW_MESSAGE, messageHandler);
      pusherClient.unbind(pusherEvents.UPDATE_MESSAGE, updateMessageHandler);
      pusherClient.unbind(pusherEvents.REACTION_UPDATE, reactionHandler);
    };
  }, [conversationId]);

  return (
    <div className="flex-1 overflow-y-auto">
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
