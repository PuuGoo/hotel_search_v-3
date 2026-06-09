import { NextResponse } from "next/server";
import { pusherServer } from "@/app/libs/pusher";
import { pusherEvents, conversationChannel } from "@/app/libs/pusherChannels";
import getSession from "@/app/actions/getSession";
import prisma from "@/app/libs/prismadb";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId, event } = await request.json();

    if (!conversationId || !event) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (event !== pusherEvents.TYPING_START && event !== pusherEvents.TYPING_STOP) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    // Verify user is a member of this conversation.
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userIds: true },
    });
    if (!conversation || !conversation.userIds.includes(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pusherServer.trigger(conversationChannel(conversationId), event, {
      userId: session.user.id,
      email: session.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
