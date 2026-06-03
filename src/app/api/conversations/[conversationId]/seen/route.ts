import { NextResponse } from "next/server";

import getCurrentUser from "../../../../actions/getCurrentUser";
import prisma from "../../../../libs/prismadb";
import { pusherEvents, pusherServer } from "../../../../libs/pusher";
import { conversationChannel, userChannel } from "../../../../libs/pusher";
import { publicUserSelect } from "../../../../types";

interface IParams {
  conversationId?: string;
}

export async function POST(request: Request, { params }: { params: IParams }) {
  try {
    const currentUser = await getCurrentUser();
    const { conversationId } = params;

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // Find existing conversation, scoped to the current user. Without the
    // membership filter any authenticated user could mark messages seen in an
    // arbitrary conversation and trigger Pusher events to its members.
    //
    // Only the newest message is needed (to mark it seen); the previous version
    // loaded the entire message history with every message's seen array on a
    // hot path (called on each conversation open and each incoming message).
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userIds: { has: currentUser.id },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            seen: { select: publicUserSelect },
          },
        },
        users: { select: publicUserSelect },
      },
    });

    if (!conversation) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // Embedded user records are public-field-only (selected above), so the
    // conversation can be broadcast/returned directly.
    const safeConversation = conversation;

    // Find last message
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (!lastMessage) {
      return NextResponse.json(safeConversation);
    }

    // Update seen of last message
    const updatedMessage = await prisma.message.update({
      where: {
        id: lastMessage.id,
      },
      include: {
        sender: { select: publicUserSelect },
        seen: { select: publicUserSelect },
      },
      data: {
        seen: {
          connect: {
            id: currentUser.id,
          },
        },
      },
    });

    // Embedded user records are public-field-only (selected above).
    const safeMessage = updatedMessage;

    // Update all connections with new seen
    await pusherServer.trigger(userChannel(currentUser.email), pusherEvents.UPDATE_CONVERSATION, {
      id: conversationId,
      messages: [safeMessage],
    });

    // If user has already seen the message, no need to go further
    if (lastMessage.seenIds.indexOf(currentUser.id) !== -1) {
      return NextResponse.json(safeConversation);
    }

    // Update last message seen
    await pusherServer.trigger(conversationChannel(conversationId), pusherEvents.UPDATE_MESSAGE, safeMessage);

    return NextResponse.json(safeMessage);
  } catch (error) {
    console.error("[MESSAGES_SEEN]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
