"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { pusherClient, pusherEvents, conversationChannel } from "../../../libs/pusherClient";

interface TypingIndicatorProps {
  conversationId: string;
  otherUser?: {
    name?: string | null;
    email?: string | null;
  };
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ conversationId, otherUser }) => {
  const [isTyping, setIsTyping] = useState(false);
  const session = useSession();

  useEffect(() => {
    const channel = conversationChannel(conversationId);

    const handleTypingStart = (data: { userId: string; email: string }) => {
      if (data.email !== session.data?.user?.email) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { userId: string; email: string }) => {
      if (data.email !== session.data?.user?.email) {
        setIsTyping(false);
      }
    };

    pusherClient.subscribe(channel);
    pusherClient.bind(pusherEvents.TYPING_START, handleTypingStart);
    pusherClient.bind(pusherEvents.TYPING_STOP, handleTypingStop);

    return () => {
      pusherClient.unsubscribe(channel);
      pusherClient.unbind(pusherEvents.TYPING_START, handleTypingStart);
      pusherClient.unbind(pusherEvents.TYPING_STOP, handleTypingStop);
    };
  }, [conversationId, session.data?.user?.email]);

  if (!isTyping) return null;

  return (
    <div className="px-4 py-1 text-xs text-gray-400 italic">
      {otherUser?.name || "Đang"} đang nhập...
    </div>
  );
};

export default TypingIndicator;
