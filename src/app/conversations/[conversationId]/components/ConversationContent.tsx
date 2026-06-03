"use client";

import { useState } from "react";

import { FullMessageType } from "../../../types";
import Body from "./Body";
import Form from "./Form";

interface ConversationContentProps {
  initialMessages: FullMessageType[];
}

const ConversationContent: React.FC<ConversationContentProps> = ({
  initialMessages,
}) => {
  const [replyTo, setReplyTo] = useState<FullMessageType | null>(null);

  const handleReply = (message: FullMessageType) => {
    setReplyTo(message);
  };

  const handleClearReply = () => {
    setReplyTo(null);
  };

  return (
    <>
      <Body initialMessages={initialMessages} onReply={handleReply} />
      <Form replyTo={replyTo} onClearReply={handleClearReply} />
    </>
  );
};

export default ConversationContent;
