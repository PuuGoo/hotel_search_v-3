import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";

import getCurrentUser from "../../../actions/getCurrentUser";
import { pusherEvents, pusherServer } from "../../../libs/pusher";
import { userChannel } from "../../../libs/pusher";
import { publicUserSelect } from "../../../types";

interface IParams {
  conversationId?: string;
}

export async function DELETE(request: Request, { params }: { params: IParams }) {
  try {
    const { conversationId } = params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // Scope the lookup to conversations the user belongs to. Fetching without
    // the membership filter let a non-member trigger DELETE_CONVERSATION Pusher
    // events to every member even though the deleteMany below removed nothing.
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userIds: {
          hasSome: [currentUser.id],
        },
      },
      include: {
        users: { select: publicUserSelect },
      },
    });

    if (!existingConversation) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    const deletedConversation = await prisma.conversation.deleteMany({
      where: {
        id: conversationId,
        userIds: {
          hasSome: [currentUser.id],
        },
      },
    });

    // Embedded user records are public-field-only (selected above), so the
    // conversation can be broadcast directly.
    const safeConversation = existingConversation;

    existingConversation.users.forEach((user) => {
      if (user.email) {
        pusherServer.trigger(userChannel(user.email), pusherEvents.DELETE_CONVERSATION, safeConversation);
      }
    });

    return NextResponse.json(deletedConversation);
  } catch (error) {
    console.error("[CONVERSATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
