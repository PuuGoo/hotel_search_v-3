import { NextResponse } from "next/server";

import getCurrentUser from "../../../actions/getCurrentUser";
import prisma from "../../../libs/prismadb";
import { hasFeature } from "../../../libs/features";
import { pusherEvents } from "../../../libs/pusherChannels";
import { pusherServer, conversationChannel } from "../../../libs/pusher";
import { publicUserSelect } from "../../../types";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "chat")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const { messageId, emoji } = body ?? {};

    if (!messageId || !emoji) {
      return new NextResponse("Thiếu messageId hoặc emoji", { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return new NextResponse("Tin nhắn không tồn tại", { status: 404 });
    }

    if (!message.conversation.userIds.includes(currentUser.id)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const currentReactions = (message.reactions as Record<string, string[]>) || {};
    const emojiUsers = currentReactions[emoji] || [];
    let updatedUsers: string[];

    if (emojiUsers.includes(currentUser.id)) {
      updatedUsers = emojiUsers.filter((id) => id !== currentUser.id);
    } else {
      updatedUsers = [...emojiUsers, currentUser.id];
    }

    let newReactions: Record<string, string[]>;
    if (updatedUsers.length === 0) {
      const { [emoji]: _, ...rest } = currentReactions;
      newReactions = rest;
    } else {
      newReactions = { ...currentReactions, [emoji]: updatedUsers };
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: newReactions },
      include: {
        seen: { select: publicUserSelect },
        sender: { select: publicUserSelect },
      },
    });

    let replyToData = null;
    if (updatedMessage.replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: updatedMessage.replyToId },
        include: { sender: { select: publicUserSelect } },
      });
      if (replyMsg) {
        replyToData = replyMsg;
      }
    }

    const safeMessage = {
      ...updatedMessage,
      replyTo: replyToData,
    };

    await pusherServer.trigger(
      conversationChannel(message.conversationId),
      pusherEvents.REACTION_UPDATE,
      safeMessage
    );

    return NextResponse.json(safeMessage);
  } catch (error) {
    console.error("[REACTIONS_POST]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
