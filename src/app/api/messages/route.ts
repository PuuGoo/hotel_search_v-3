import { NextResponse } from "next/server";

import getCurrentUser from "../../actions/getCurrentUser";
import prisma from "../../libs/prismadb";
import { hasFeature } from "../../libs/features";
import { pusherEvents, pusherServer } from "../../libs/pusher";
import { conversationChannel, userChannel } from "../../libs/pusher";
import { sanitizeUser, sanitizeUsers } from "../../libs/sanitizeUser";
import { validateMessage } from "./messageValidation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Feature gate: a user restricted away from chat cannot send messages.
    if (!hasFeature(currentUser, "chat")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Guard against malformed/empty JSON bodies so a bad request yields a 400
    // rather than an opaque 500 (consistent with the other API routes).
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }
    const { message, image, conversationId } = body ?? {};

    const validation = validateMessage(body);
    if (!validation.ok) {
      return new NextResponse(validation.error, { status: 400 });
    }

    // Authorization: the sender must be a member of the conversation.
    // Without this check any authenticated user could inject messages into
    // arbitrary conversations (by guessing/knowing a conversationId) and
    // trigger Pusher events to its members.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userIds: { has: currentUser.id },
      },
    });

    if (!conversation) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const newMessage = await prisma.message.create({
      include: {
        seen: true,
        sender: true,
      },
      data: {
        body: message,
        image: image,
        conversation: {
          connect: { id: conversationId },
        },
        sender: {
          connect: { id: currentUser.id },
        },
        seen: {
          connect: {
            id: currentUser.id,
          },
        },
      },
    });

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageAt: new Date(),
        messages: {
          connect: {
            id: newMessage.id,
          },
        },
      },
      include: {
        users: true,
        // Only the newest message is used below (for the UPDATE_CONVERSATION
        // broadcast). Fetch just it rather than re-loading the entire thread
        // (with every message's seen array) on every message send.
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            seen: true,
          },
        },
      },
    });

    // Strip password hashes from embedded user records before broadcasting
    // over Pusher (sender + seen are full User records).
    const safeMessage = {
      ...newMessage,
      sender: sanitizeUser(newMessage.sender),
      seen: sanitizeUsers(newMessage.seen),
    };

    await pusherServer.trigger(conversationChannel(conversationId), pusherEvents.NEW_MESSAGE, safeMessage);

    // messages is ordered newest-first and limited to one, so [0] is the latest.
    const lastMessage = updatedConversation.messages[0];
    const safeLastMessage = lastMessage
      ? { ...lastMessage, seen: sanitizeUsers(lastMessage.seen) }
      : lastMessage;

    updatedConversation.users.map((user) => {
      pusherServer.trigger(userChannel(user.email!), pusherEvents.UPDATE_CONVERSATION, {
        id: conversationId,
        messages: [safeLastMessage],
      });
    });

    return NextResponse.json(safeMessage);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
