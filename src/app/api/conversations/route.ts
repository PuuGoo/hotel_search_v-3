import { NextResponse } from "next/server";

import getCurrentUser from "../../actions/getCurrentUser";
import prisma from "../../libs/prismadb";
import { hasFeature } from "../../libs/features";
import { pusherEvents, pusherServer } from "../../libs/pusher";
import { userChannel } from "../../libs/pusher";
import { sanitizeUsers } from "../../libs/sanitizeUser";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Feature gate: a user restricted away from chat cannot start conversations.
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
    const { userId, isGroup, members, name } = body ?? {};

    if (isGroup && (!members || members.length < 2 || !name)) {
      return new NextResponse("Invalid data", { status: 400 });
    }

    // For a 1:1 conversation a valid target userId is required. Without this a
    // missing/empty userId reaches prisma.connect({ id: undefined }) and fails
    // as an opaque 500.
    if (!isGroup && (!userId || typeof userId !== "string")) {
      return new NextResponse("Invalid data", { status: 400 });
    }

    if (isGroup) {
      const newConversation = await prisma.conversation.create({
        data: {
          name,
          isGroup,
          users: {
            connect: [
              ...members.map((member: { value: string }) => ({
                id: member.value,
              })),
              {
                id: currentUser.id,
              },
            ],
          },
        },
        include: {
          users: true,
        },
      });

      // Strip password hashes from embedded user records before broadcasting /
      // returning.
      const safeConversation = {
        ...newConversation,
        users: sanitizeUsers(newConversation.users),
      };

      // Update all connections with new conversation
      newConversation.users.forEach((user) => {
        if (user.email) {
          pusherServer.trigger(userChannel(user.email), pusherEvents.NEW_CONVERSATION, safeConversation);
        }
      });

      return NextResponse.json(safeConversation);
    }

    const existingConversations = await prisma.conversation.findMany({
      where: {
        OR: [
          {
            userIds: {
              equals: [currentUser.id, userId],
            },
          },
          {
            userIds: {
              equals: [userId, currentUser.id],
            },
          },
        ],
      },
    });

    const singleConversation = existingConversations[0];

    if (singleConversation) {
      return NextResponse.json(singleConversation);
    }

    const newConversation = await prisma.conversation.create({
      data: {
        users: {
          connect: [
            {
              id: currentUser.id,
            },
            {
              id: userId,
            },
          ],
        },
      },
      include: {
        users: true,
      },
    });

    // Strip password hashes from embedded user records before broadcasting /
    // returning.
    const safeNewConversation = {
      ...newConversation,
      users: sanitizeUsers(newConversation.users),
    };

    // Update all connections with new conversation
    newConversation.users.map((user) => {
      if (user.email) {
        pusherServer.trigger(userChannel(user.email), pusherEvents.NEW_CONVERSATION, safeNewConversation);
      }
    });

    return NextResponse.json(safeNewConversation);
  } catch (error) {
    console.error("[CONVERSATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
