"use client";

import { useEffect, useRef, useState } from "react";

import { FullMessageType } from "../../../types";
import { getChatAppearance } from "@/app/libs/chatAppearance";
import Body from "./Body";
import Form from "./Form";

interface ConversationContentProps {
  initialMessages: FullMessageType[];
}

const ConversationContent: React.FC<ConversationContentProps> = ({
  initialMessages,
}) => {
  const [replyTo, setReplyTo] = useState<FullMessageType | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleReply = (message: FullMessageType) => {
    setReplyTo(message);
  };

  const handleClearReply = () => {
    setReplyTo(null);
  };

  // Apply chat appearance (density + accent) as data-attributes so CSS reacts.
  useEffect(() => {
    const apply = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const ap = getChatAppearance();
      el.setAttribute("data-chat-density", ap.density);
      el.setAttribute("data-chat-accent", ap.accent);
    };
    apply();
    window.addEventListener("chat-appearance-change", apply);
    return () => window.removeEventListener("chat-appearance-change", apply);
  }, []);

  return (
    <div ref={wrapperRef} className="flex flex-col flex-1 min-h-0">
      <Body initialMessages={initialMessages} onReply={handleReply} />
      <Form replyTo={replyTo} onClearReply={handleClearReply} />
    </div>
  );
};

export default ConversationContent;
